/*
  Shared plumbing for both MapleScouter calc proxy routes (src/app/api/scouter/route.ts and
  src/app/api/scouter-simulator/route.ts) -- CORS workaround, per-IP-per-minute rate limiting
  (Redis with an in-memory fallback), timeout-guarded upstream fetch, and error-code shaping.
  Everything here is generic; only the upstream URL and rate-limit key/limit are route-specific,
  passed in by each thin route handler. See scouter/route.ts's own file header for why this
  proxy exists at all and why it caches nothing.
*/
import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const UPSTREAM_FETCH_TIMEOUT_MS = 10000;

export function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const redisUrl = process.env.REDIS_URL?.trim() ?? "";
const REDIS_CONNECT_TIMEOUT_MS = parsePositiveIntEnv("REDIS_CONNECT_TIMEOUT_MS", 1500);
const redis = redisUrl ? new Redis(redisUrl, { lazyConnect: true, connectTimeout: REDIS_CONNECT_TIMEOUT_MS, maxRetriesPerRequest: 1 }) : null;
let hasWarnedRedisFallback = false;
redis?.on("error", (err: Error) => {
  if (!hasWarnedRedisFallback) {
    hasWarnedRedisFallback = true;
    console.warn(`[scouter][redis] Redis unavailable — falling back to in-memory rate limiting, won't persist across restarts. (${err.message})`);
  }
});

// In-memory fallback only used when Redis is down. Capped so a flood of unique IPs can't grow
// it unbounded (same pruning approach as the lookup route). One shared map across both routes
// is fine -- each caller's rate-limit key already carries its own prefix, so entries never
// collide between the two proxies.
const MAX_FALLBACK_ENTRIES = 10000;
const fallbackMinuteRate = new Map<string, { count: number; expiresAt: number }>();

function pruneFallbackMap(store: Map<string, { count: number; expiresAt: number }>) {
  if (store.size < MAX_FALLBACK_ENTRIES) return;
  const now = Date.now();
  for (const [key, value] of store) {
    if (now >= value.expiresAt) store.delete(key);
  }
  while (store.size >= MAX_FALLBACK_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

function getFallbackMinuteCount(ipKey: string): number {
  const now = Date.now();
  const existing = fallbackMinuteRate.get(ipKey);
  if (!existing || now >= existing.expiresAt) {
    pruneFallbackMap(fallbackMinuteRate);
    fallbackMinuteRate.set(ipKey, { count: 1, expiresAt: now + 60_000 });
    return 1;
  }
  existing.count += 1;
  fallbackMinuteRate.set(ipKey, existing);
  return existing.count;
}

async function checkAndTrackIpMinuteRate(rateLimitKey: string): Promise<number> {
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      const rows = await redis.multi().incr(rateLimitKey).expire(rateLimitKey, 60).exec();
      hasWarnedRedisFallback = false;
      return Number(rows?.[0]?.[1] ?? 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[scouter][redis] checkAndTrackIpMinuteRate failed: ${message}`);
      // Fall through to memory fallback.
    }
  }
  return getFallbackMinuteCount(rateLimitKey);
}

// Client IP for rate limiting: must be a trusted value, or an attacker rotates it to dodge the
// cap. Same trust order as the lookup route (Vercel overwrites these at the edge): prefer
// x-real-ip, then the rightmost (proxy-appended) x-forwarded-for hop.
function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }
  return "unknown";
}

export interface MapleScouterProxyOptions {
  /** Full upstream URL to forward the request body to. */
  upstreamUrl: string;
  /** Rate-limit key prefix -- must be unique per route so two proxies don't share a bucket. */
  rateLimitKeyPrefix: string;
  /** Max requests per IP per minute for this route. */
  perMinuteLimit: number;
}

/** Stateless proxy POST handler shared by both MapleScouter calc routes. Forwards the browser-
 *  built payload as-is and returns the response, with per-IP-per-minute rate limiting and
 *  timeout-guarded upstream fetch. Caches nothing -- see scouter/route.ts's file header. */
export async function proxyMapleScouterCalc(request: NextRequest, opts: MapleScouterProxyOptions): Promise<NextResponse> {
  const ipKey = getClientIp(request);
  const minuteCount = await checkAndTrackIpMinuteRate(`${opts.rateLimitKeyPrefix}minute:${ipKey}`);
  if (minuteCount > opts.perMinuteLimit) {
    return NextResponse.json(
      { error: `Rate limit reached: max ${opts.perMinuteLimit} requests per minute per IP.`, code: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_FETCH_TIMEOUT_MS);
  try {
    const upstream = await fetch(opts.upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    // Check ok before ever reading the body -- fetch() resolves (doesn't reject) on a 4xx/5xx,
    // so parsing first risks treating an error payload as a real one.
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "MapleScouter's API returned an unexpected response.", code: "BAD_RESPONSE" },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    const data = await upstream.json().catch(() => null);
    if (data === null) {
      return NextResponse.json(
        { error: "MapleScouter's API returned an unexpected response.", code: "BAD_RESPONSE" },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: timedOut ? "MapleScouter's API timed out." : "Failed to reach MapleScouter's API.",
        code: timedOut ? "TIMEOUT" : "NETWORK",
      },
      { status: timedOut ? 504 : 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timer);
  }
}

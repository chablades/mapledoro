/*
  Stateless proxy for MapleScouter's calc API. Exists purely to get around CORS
  (api.maplescouter.com only allows requests from maplescouter.com itself, confirmed
  by testing a cross-origin fetch directly). Forwards the browser-built payload as-is
  and returns the response.

  Deliberately caches NOTHING here, MapleScouter's calc depends on mapledoro's own
  user-entered stat inputs, which have no server-side verification (all user data lives
  in localStorage per root CLAUDE.md). A shared server cache keyed by character name
  would let anyone importing/naming a character the same way poison the cached result
  for every other user looking at "that" character. Caching lives client-side, per
  character, keyed by a hash of the actual payload, see scouterCache.ts.

  Rate limit is per-IP, per-minute ONLY -- no daily cap, unlike the Nexon lookup route
  (src/app/api/characters/lookup/route.ts), since there's no known MapleScouter usage
  limit to respect the way Nexon's ranking API has one. The minute cap alone is enough
  to stop a runaway loop or something hitting this route directly, bypassing the UI's
  own manual-refresh-only/hash-cache protections.
*/
import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const MAPLESCOUTER_CALC_URL = "https://api.maplescouter.com/api/calc/dmg";
const UPSTREAM_FETCH_TIMEOUT_MS = 10000;
const RATE_LIMIT_KEY_PREFIX = "mapledoro:rate:scouter:v1:";

function parsePositiveIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

// Comfortably covers a real session refreshing several characters in a row (e.g.
// Scouter Setup done for 8 characters, clicking refresh on each), while still capping
// a runaway loop or direct hits within seconds.
const IP_REQUESTS_PER_MINUTE_LIMIT = parsePositiveIntEnv("SCOUTER_IP_MINUTE_LIMIT", 10);

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

// In-memory fallback only used when Redis is down. Capped so a flood of unique IPs
// can't grow it unbounded (same pruning approach as the lookup route).
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

function rateMinuteKey(ipKey: string) {
  return `${RATE_LIMIT_KEY_PREFIX}minute:${ipKey}`;
}

async function checkAndTrackIpMinuteRate(ipKey: string): Promise<number> {
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      const key = rateMinuteKey(ipKey);
      const rows = await redis.multi().incr(key).expire(key, 60).exec();
      hasWarnedRedisFallback = false;
      return Number(rows?.[0]?.[1] ?? 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[scouter][redis] checkAndTrackIpMinuteRate failed: ${message}`);
      // Fall through to memory fallback.
    }
  }
  return getFallbackMinuteCount(ipKey);
}

// Client IP for rate limiting: must be a trusted value, or an attacker rotates it to
// dodge the cap. Same trust order as the lookup route (Vercel overwrites these at the
// edge): prefer x-real-ip, then the rightmost (proxy-appended) x-forwarded-for hop.
function getClientIp(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  const ipKey = getClientIp(request);
  const minuteCount = await checkAndTrackIpMinuteRate(ipKey);
  if (minuteCount > IP_REQUESTS_PER_MINUTE_LIMIT) {
    return NextResponse.json(
      { error: `Rate limit reached: max ${IP_REQUESTS_PER_MINUTE_LIMIT} requests per minute per IP.`, code: "RATE_LIMITED" },
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
    const upstream = await fetch(MAPLESCOUTER_CALC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    // Check ok before ever reading the body -- fetch() resolves (doesn't reject) on a
    // 4xx/5xx, so parsing first risks treating an error payload as a real one.
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

/*
  Server lookup API for Maple characters.
  Purpose: shield Nexon API usage with queueing, timeout guards, and cache layers.
  Edit this file for lookup logic, cache TTL behavior, and upstream safety limits.
*/
import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const OVERALL_UPSTREAM_DELAY_MS = 5000;
const MAX_PENDING_UPSTREAM_REQUESTS = 100;
const MAX_ESTIMATED_QUEUE_WAIT_MS = 25000;
const UPSTREAM_FETCH_TIMEOUT_MS = 8000;
const LOOKUP_TOTAL_TIMEOUT_MS = 25000;
const CACHE_KEY_PREFIX = "mapledoro:characters:lookup:v1:";
const RATE_LIMIT_KEY_PREFIX = "mapledoro:rate:lookup:v1:";
const CHARACTER_NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9]{4,12}$/;
// dont know yet if the 'weekly' for exp is actually weekly or a daily lol
const NEXON_RANKING_URL = "https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na?type=overall&id=weekly&reboot_index=0&page_index=1";
// Comma-separated list of proxy base URLs. Each is tried in order before falling back to direct Nexon.
// Format: NEXON_PROXY_URLS=https://worker1.example.com,https://worker2.example.com
const NEXON_PROXY_URLS: string[] = (process.env.NEXON_PROXY_URLS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function parsePositiveIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const IP_REQUESTS_PER_DAY_LIMIT = parsePositiveIntEnv("LOOKUP_IP_DAILY_LIMIT", 59);
const IP_REQUESTS_PER_MINUTE_LIMIT = parsePositiveIntEnv("LOOKUP_IP_MINUTE_LIMIT", 5);
const IP_ACTIVE_QUEUE_LIMIT = parsePositiveIntEnv("LOOKUP_IP_ACTIVE_QUEUE_LIMIT", 5);
const STALE_WHILE_REVALIDATE_SECONDS = Number.parseInt(
  process.env.LOOKUP_CDN_STALE_SECONDS ?? "60",
  10,
);

interface MapleRankRow {
  characterID: number;
  characterName: string;
  exp: number;
  gap: number;
  level: number;
  rank: number;
  startRank: number;
  worldID: number;
  characterImgURL: string;
  jobName: string;
  isSearchTarget: boolean;
  legionLevel: number;
  raidPower: number;
  tierID: number;
  score: number;
}

interface NormalizedCharacterData {
  characterID: number;
  characterName: string;
  worldID: number;
  level: number;
  exp: number;
  jobName: string;
  characterImgURL: string;
  isSearchTarget: boolean;
  startRank: number;
  overallRank: number;
  overallGap: number;
  legionRank: number;
  legionGap: number;
  legionLevel: number;
  raidPower: number;
  tierID: number;
  score: number;
  fetchedAt: number;
  expiresAt: number;
}

interface LookupFound {
  found: true;
  data: NormalizedCharacterData;
  expiresAt: number;
  fromCache: boolean;
  queuedMs: number;
  source: "redis_cache" | "memory_cache" | "nexon_upstream";
}

interface LookupNotFound {
  found: false;
  characterName: string;
  data: null;
  expiresAt: number;
  fromCache: boolean;
  queuedMs: number;
  source: "redis_cache" | "memory_cache" | "nexon_upstream";
}

type LookupResult = LookupFound | LookupNotFound;

type CacheEntry =
  | { kind: "found"; expiresAt: number; data: NormalizedCharacterData }
  | { kind: "not_found"; expiresAt: number; characterName: string };

let queueTail: Promise<void> = Promise.resolve();
let nextAllowedAt = 0;
let pendingUpstreamRequests = 0;

const fallbackInMemoryCache = new Map<string, CacheEntry>();
const inFlightLookup = new Map<string, Promise<LookupResult>>();
const fallbackMinuteRate = new Map<string, { count: number; expiresAt: number }>();
const fallbackDailyRate = new Map<string, { count: number; expiresAt: number }>();
const fallbackActiveQueueByIp = new Map<string, number>();
const redisUrl = process.env.REDIS_URL?.trim() ?? "";
const REDIS_CONNECT_TIMEOUT_MS = parsePositiveIntEnv("REDIS_CONNECT_TIMEOUT_MS", 1500);
const redis = redisUrl ? new Redis(redisUrl, { lazyConnect: true, connectTimeout: REDIS_CONNECT_TIMEOUT_MS, maxRetriesPerRequest: 1 }) : null;
let hasWarnedRedisFallback = false;
redis?.on("error", (err: Error) => {
  if (!hasWarnedRedisFallback) {
    hasWarnedRedisFallback = true;
    console.warn(`[lookup][redis] Redis unavailable — falling back to in-memory cache. Rate limits and cache will not persist across restarts. (${err.message})`);
  }
});

function logRedisError(operation: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[lookup][redis] ${operation} failed: ${message}`);
}

function cacheKey(nameKey: string) {
  return `${CACHE_KEY_PREFIX}${nameKey}`;
}

function rateMinuteKey(ipKey: string) {
  return `${RATE_LIMIT_KEY_PREFIX}minute:${ipKey}`;
}

function rateDayKey(ipKey: string) {
  return `${RATE_LIMIT_KEY_PREFIX}day:${ipKey}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorCode: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorCode)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function normalizeName(input: string) {
  return input.trim().toLowerCase();
}

function getNextUtcMidnightMs(fromMs: number) {
  const next = new Date(fromMs);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime();
}

function formatUtcResetLabel(fromMs: number) {
  const nextReset = new Date(getNextUtcMidnightMs(fromMs));
  return nextReset.toISOString().replace(".000Z", " UTC");
}

function getClientIp(request: NextRequest) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function getFallbackRateCount(
  store: Map<string, { count: number; expiresAt: number }>,
  key: string,
  ttlMs: number,
) {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now >= existing.expiresAt) {
    const fresh = { count: 1, expiresAt: now + ttlMs };
    store.set(key, fresh);
    return fresh.count;
  }
  existing.count += 1;
  store.set(key, existing);
  return existing.count;
}

async function checkAndTrackIpRate(ipKey: string): Promise<{
  minuteCount: number;
  dayCount: number;
}> {
  const nowMs = Date.now();
  const minuteTtlSeconds = 60;
  const dayTtlSeconds = Math.max(1, Math.floor((getNextUtcMidnightMs(nowMs) - nowMs) / 1000));

  if (redis) {
    try {
      if (redis.status === "wait") {
        await redis.connect();
      }
      const [minuteCountRaw, dayCountRaw] = await redis
        .multi()
        .incr(rateMinuteKey(ipKey))
        .expire(rateMinuteKey(ipKey), minuteTtlSeconds)
        .incr(rateDayKey(ipKey))
        .expire(rateDayKey(ipKey), dayTtlSeconds)
        .exec()
        .then((rows) => {
          if (!rows) return [1, 1] as const;
          const minuteRow = rows[0];
          const dayRow = rows[2];
          const minuteVal = Number(minuteRow?.[1] ?? 1);
          const dayVal = Number(dayRow?.[1] ?? 1);
          return [minuteVal, dayVal] as const;
        });
      return { minuteCount: minuteCountRaw, dayCount: dayCountRaw };
    } catch (error) {
      logRedisError("checkAndTrackIpRate", error);
      // Fall through to memory fallback.
    }
  }

  const minuteCount = getFallbackRateCount(
    fallbackMinuteRate,
    ipKey,
    minuteTtlSeconds * 1000,
  );
  const dayCount = getFallbackRateCount(
    fallbackDailyRate,
    ipKey,
    dayTtlSeconds * 1000,
  );
  return { minuteCount, dayCount };
}

function getActiveQueueCountForIp(ipKey: string) {
  return fallbackActiveQueueByIp.get(ipKey) ?? 0;
}

function incrementActiveQueueForIp(ipKey: string) {
  const next = getActiveQueueCountForIp(ipKey) + 1;
  fallbackActiveQueueByIp.set(ipKey, next);
}

function decrementActiveQueueForIp(ipKey: string) {
  const next = Math.max(0, getActiveQueueCountForIp(ipKey) - 1);
  if (next === 0) {
    fallbackActiveQueueByIp.delete(ipKey);
    return;
  }
  fallbackActiveQueueByIp.set(ipKey, next);
}

function buildLookupCacheHeaders(expiresAt: number) {
  const sMaxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  const swr = Number.isFinite(STALE_WHILE_REVALIDATE_SECONDS)
    ? Math.max(0, STALE_WHILE_REVALIDATE_SECONDS)
    : 60;
  const cacheControlValue = `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;
  return {
    "Cache-Control": cacheControlValue,
    "CDN-Cache-Control": cacheControlValue,
    "Vercel-CDN-Cache-Control": cacheControlValue,
  };
}

function jsonLookup(result: LookupResult) {
  const payload = hasWarnedRedisFallback
    ? { ...result, degraded: true, degradedCode: "REDIS_DOWN" }
    : result;
  return NextResponse.json(payload, {
    headers: buildLookupCacheHeaders(result.expiresAt),
  });
}

function getExactRankRow(payload: unknown, expectedName: string): MapleRankRow | null {
  if (!payload || typeof payload !== "object") return null;
  const ranks = (payload as { ranks?: unknown }).ranks;
  if (!Array.isArray(ranks) || ranks.length === 0) return null;
  const normalizedExpected = normalizeName(expectedName);
  for (const rank of ranks) {
    if (!rank || typeof rank !== "object") continue;
    const row = rank as MapleRankRow;
    if (normalizeName(String(row.characterName ?? "")) === normalizedExpected) {
      return row;
    }
  }
  return null;
}

function getFallbackCacheHit(nameKey: string): CacheEntry | null {
  const entry = fallbackInMemoryCache.get(nameKey);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    fallbackInMemoryCache.delete(nameKey);
    return null;
  }
  if (
    entry.kind === "found" &&
    normalizeName(entry.data.characterName) !== normalizeName(nameKey)
  ) {
    fallbackInMemoryCache.delete(nameKey);
    return null;
  }
  return entry;
}

function getMemoryCacheResult(nameKey: string) {
  const entry = getFallbackCacheHit(nameKey);
  return { entry, source: entry ? "memory_cache" as const : null };
}

async function getCacheHit(nameKey: string): Promise<{
  entry: CacheEntry | null;
  source: "redis_cache" | "memory_cache" | null;
}> {
  if (!redis) return getMemoryCacheResult(nameKey);
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    const raw = await redis.get(cacheKey(nameKey));
    if (!raw) return { entry: null, source: null };
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() >= parsed.expiresAt) {
      await redis.del(cacheKey(nameKey));
      return { entry: null, source: null };
    }
    if (
      parsed.kind === "found" &&
      normalizeName(parsed.data.characterName) !== normalizeName(nameKey)
    ) {
      await redis.del(cacheKey(nameKey));
      return { entry: null, source: null };
    }
    hasWarnedRedisFallback = false;
    return { entry: parsed, source: "redis_cache" };
  } catch (error) {
    logRedisError("getCacheHit", error);
    return getMemoryCacheResult(nameKey);
  }
}

async function setCacheHit(nameKey: string, entry: CacheEntry): Promise<void> {
  const ttlSeconds = Math.max(1, Math.floor((entry.expiresAt - Date.now()) / 1000));
  if (redis) {
    try {
      if (redis.status === "wait") {
        await redis.connect();
      }
      await redis.set(cacheKey(nameKey), JSON.stringify(entry), "EX", ttlSeconds);
      hasWarnedRedisFallback = false;
      return;
    } catch (error) {
      logRedisError("setCacheHit", error);
      fallbackInMemoryCache.set(nameKey, entry);
      return;
    }
  }
  fallbackInMemoryCache.set(nameKey, entry);
}

async function runQueuedUpstream<T>(fn: () => Promise<T>): Promise<{ value: T; queuedMs: number }> {
  if (pendingUpstreamRequests >= MAX_PENDING_UPSTREAM_REQUESTS) {
    throw new Error("QUEUE_FULL");
  }
  const queueDelayNow = Math.max(0, nextAllowedAt - Date.now());
  const estimatedWaitMs = queueDelayNow + pendingUpstreamRequests * OVERALL_UPSTREAM_DELAY_MS;
  if (estimatedWaitMs > MAX_ESTIMATED_QUEUE_WAIT_MS) {
    throw new Error("QUEUE_BACKPRESSURE");
  }

  pendingUpstreamRequests += 1;
  const enqueuedAt = Date.now();

  const task = async () => {
    try {
      const now = Date.now();
      const waitMs = Math.max(0, nextAllowedAt - now);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      const startedAt = Date.now();
      const value = await fn();
      // Ultra-safe mode: force cooldown between each upstream call.
      nextAllowedAt = Date.now() + OVERALL_UPSTREAM_DELAY_MS;
      return { value, queuedMs: startedAt - enqueuedAt };
    } finally {
      pendingUpstreamRequests -= 1;
    }
  };

  const execution = queueTail.then(task, task);
  queueTail = execution.then(
    () => undefined,
    () => undefined,
  );

  return execution;
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "MapleDoro/1.0 (+https://mapledoro.local)",
      },
      cache: "no-store",
      signal: controller.signal,
    }).catch((error: unknown) => {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("UPSTREAM_TIMEOUT");
      }
      throw error;
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`UPSTREAM_${response.status}`);
  }
  return response.json();
}

async function fetchOverall(characterName: string) {
  const nexonUrl = `${NEXON_RANKING_URL}&character_name=${encodeURIComponent(characterName)}`;
  for (const proxyBase of NEXON_PROXY_URLS) {
    try {
      return await fetchJson(`${proxyBase}?url=${encodeURIComponent(nexonUrl)}`);
    } catch {
      // try next proxy
    }
  }
  return fetchJson(nexonUrl);
}

async function buildLookup(characterName: string, key: string): Promise<LookupResult> {
  const firstQueued = await runQueuedUpstream(() => fetchOverall(characterName));
  const overallRow = getExactRankRow(firstQueued.value, characterName);

  if (!overallRow) {
    const expiresAt = getNextUtcMidnightMs(Date.now());
    const result: LookupNotFound = {
      found: false,
      characterName,
      data: null,
      expiresAt,
      fromCache: false,
      queuedMs: firstQueued.queuedMs,
      source: "nexon_upstream",
    };
    await setCacheHit(key, {
      kind: "not_found",
      characterName,
      expiresAt,
    });
    return result;
  }

  const fetchedAt = Date.now();
  const expiresAt = getNextUtcMidnightMs(fetchedAt);
  const merged: NormalizedCharacterData = {
    characterID: overallRow.characterID,
    characterName: overallRow.characterName,
    worldID: overallRow.worldID,
    level: overallRow.level,
    exp: overallRow.exp,
    jobName: overallRow.jobName,
    characterImgURL: overallRow.characterImgURL,
    isSearchTarget: overallRow.isSearchTarget,
    startRank: overallRow.startRank,
    overallRank: overallRow.rank,
    overallGap: overallRow.gap,
    legionRank: 0,
    legionGap: 0,
    legionLevel: 0,
    raidPower: 0,
    tierID: overallRow.tierID,
    score: overallRow.score,
    fetchedAt,
    expiresAt,
  };

  await setCacheHit(key, {
    kind: "found",
    expiresAt,
    data: merged,
  });

  return {
    found: true,
    data: merged,
    expiresAt,
    fromCache: false,
    queuedMs: firstQueued.queuedMs,
    source: "nexon_upstream",
  };
}

const LOOKUP_ERROR_MAP: Record<string, { message: string; status: number; degradedCode?: string }> = {
  QUEUE_FULL: { message: "Server lookup queue is full. Please retry shortly.", status: 429 },
  QUEUE_BACKPRESSURE: { message: "Lookup queue is busy right now. Please retry in a few seconds.", status: 503 },
  UPSTREAM_TIMEOUT: { message: "Nexon lookup timed out. Please retry shortly.", status: 504 },
  LOOKUP_TIMEOUT: { message: "Lookup took too long under current traffic. Please retry.", status: 504 },
  UPSTREAM_403: { message: "Nexon blocked this request. Please try again later.", status: 502, degradedCode: "NEXON_BLOCKED" },
  UPSTREAM_429: { message: "Rate limited by Nexon. Please try again later.", status: 502, degradedCode: "NEXON_RATE_LIMITED" },
};

function lookupErrorResponse(error: unknown): NextResponse {
  const key = error instanceof Error ? error.message : "";
  const mapped = LOOKUP_ERROR_MAP[key];
  if (mapped) {
    const body = mapped.degradedCode
      ? { error: mapped.message, degradedCode: mapped.degradedCode }
      : { error: mapped.message };
    return NextResponse.json(
      body,
      { status: mapped.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { error: "Lookup failed." },
    { status: 502, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const characterName = request.nextUrl.searchParams.get("character_name")?.trim() ?? "";
  if (!characterName) {
    return NextResponse.json(
      { error: "character_name is required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!CHARACTER_NAME_REGEX.test(characterName)) {
    return NextResponse.json(
      {
        error:
          "Invalid character_name. Use 4-12 characters: letters (A-Z, accented) and numbers only.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ipKey = getClientIp(request);
  const key = normalizeName(characterName);

  const cacheHit = await getCacheHit(key);
  if (cacheHit.entry) {
    if (cacheHit.entry.kind === "not_found") {
      return jsonLookup({
        found: false,
        characterName: cacheHit.entry.characterName,
        data: null,
        expiresAt: cacheHit.entry.expiresAt,
        fromCache: true,
        queuedMs: 0,
        source: cacheHit.source ?? "memory_cache",
      });
    }
    return jsonLookup({
      found: true,
      data: cacheHit.entry.data,
      expiresAt: cacheHit.entry.expiresAt,
      fromCache: true,
      queuedMs: 0,
      source: cacheHit.source ?? "memory_cache",
    });
  }

  const existing = inFlightLookup.get(key);
  if (existing) {
    const shared = await existing;
    return jsonLookup(shared);
  }

  // Only count against IP rate limit when actually hitting upstream.
  const nowMs = Date.now();
  const { minuteCount, dayCount } = await checkAndTrackIpRate(ipKey);
  if (dayCount > IP_REQUESTS_PER_DAY_LIMIT) {
    return NextResponse.json(
      {
        error: `Daily request limit reached for this IP. Try again after UTC reset (${formatUtcResetLabel(nowMs)}).`,
      },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (minuteCount > IP_REQUESTS_PER_MINUTE_LIMIT) {
    return NextResponse.json(
      {
        error: `Rate limit reached: max ${IP_REQUESTS_PER_MINUTE_LIMIT} requests per minute per IP.`,
      },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (getActiveQueueCountForIp(ipKey) >= IP_ACTIVE_QUEUE_LIMIT) {
    return NextResponse.json(
      { error: "Too many concurrent lookups from this IP. Please wait and retry." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const lookupPromise = withTimeout(
    buildLookup(characterName, key),
    LOOKUP_TOTAL_TIMEOUT_MS,
    "LOOKUP_TIMEOUT",
  );
  incrementActiveQueueForIp(ipKey);
  inFlightLookup.set(key, lookupPromise);

  try {
    const result = await lookupPromise;
    return jsonLookup(result);
  } catch (error) {
    return lookupErrorResponse(error);
  } finally {
    inFlightLookup.delete(key);
    decrementActiveQueueForIp(ipKey);
  }
}

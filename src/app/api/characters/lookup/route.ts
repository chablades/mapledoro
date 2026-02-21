import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

const OVERALL_UPSTREAM_DELAY_MS = 5000;
const MAX_PENDING_UPSTREAM_REQUESTS = 100;
const CACHE_KEY_PREFIX = "mapledoro:characters:lookup:v1:";

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
const redisUrl = process.env.REDIS_URL?.trim() ?? "";
const redis = redisUrl ? new Redis(redisUrl, { lazyConnect: true }) : null;

function cacheKey(nameKey: string) {
  return `${CACHE_KEY_PREFIX}${nameKey}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeName(input: string) {
  return input.trim().toLowerCase();
}

function getNextUtcMidnightMs(fromMs: number) {
  const next = new Date(fromMs);
  next.setUTCHours(24, 0, 0, 0);
  return next.getTime();
}

function getFirstRankRow(payload: unknown): MapleRankRow | null {
  if (!payload || typeof payload !== "object") return null;
  const ranks = (payload as { ranks?: unknown }).ranks;
  if (!Array.isArray(ranks) || ranks.length === 0) return null;
  const first = ranks[0];
  if (!first || typeof first !== "object") return null;
  return first as MapleRankRow;
}

function getFallbackCacheHit(nameKey: string): CacheEntry | null {
  const entry = fallbackInMemoryCache.get(nameKey);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    fallbackInMemoryCache.delete(nameKey);
    return null;
  }
  return entry;
}

async function getCacheHit(nameKey: string): Promise<{
  entry: CacheEntry | null;
  source: "redis_cache" | "memory_cache" | null;
}> {
  if (redis) {
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
      return { entry: parsed, source: "redis_cache" };
    } catch {
      const fallback = getFallbackCacheHit(nameKey);
      return { entry: fallback, source: fallback ? "memory_cache" : null };
    }
  }
  const fallback = getFallbackCacheHit(nameKey);
  return { entry: fallback, source: fallback ? "memory_cache" : null };
}

async function setCacheHit(nameKey: string, entry: CacheEntry): Promise<void> {
  const ttlSeconds = Math.max(1, Math.floor((entry.expiresAt - Date.now()) / 1000));
  if (redis) {
    try {
      if (redis.status === "wait") {
        await redis.connect();
      }
      await redis.set(cacheKey(nameKey), JSON.stringify(entry), "EX", ttlSeconds);
      return;
    } catch {
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
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "MapleDoro/1.0 (+https://mapledoro.local)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`UPSTREAM_${response.status}`);
  }
  return response.json();
}

async function fetchOverall(characterName: string) {
  const url =
    `https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na` +
    `?type=overall&id=weekly&reboot_index=0&page_index=1&character_name=${encodeURIComponent(characterName)}`;
  return fetchJson(url);
}

async function fetchLegion(characterName: string, worldID: number, rebootIndex: 0 | 1) {
  const url =
    `https://www.nexon.com/api/maplestory/no-auth/ranking/v2/na` +
    `?type=legion&id=${encodeURIComponent(String(worldID))}` +
    `&reboot_index=${rebootIndex}&page_index=1&character_name=${encodeURIComponent(characterName)}`;
  return fetchJson(url);
}

async function buildLookup(characterName: string, key: string): Promise<LookupResult> {
  const firstQueued = await runQueuedUpstream(() => fetchOverall(characterName));
  const overallRow = getFirstRankRow(firstQueued.value);

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

  const secondQueued = await runQueuedUpstream(() =>
    fetchLegion(characterName, overallRow.worldID, 1),
  );
  let legionRaw = secondQueued.value;
  let legionRow = getFirstRankRow(legionRaw);
  let fallbackLegionQueuedMs = 0;

  if (!legionRow) {
    const fallbackQueued = await runQueuedUpstream(() =>
      fetchLegion(characterName, overallRow.worldID, 0),
    );
    legionRaw = fallbackQueued.value;
    legionRow = getFirstRankRow(legionRaw);
    fallbackLegionQueuedMs = fallbackQueued.queuedMs;
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
    legionRank: legionRow?.rank ?? 0,
    legionGap: legionRow?.gap ?? 0,
    legionLevel: legionRow?.legionLevel ?? overallRow.legionLevel,
    raidPower: legionRow?.raidPower ?? overallRow.raidPower,
    tierID: legionRow?.tierID ?? overallRow.tierID,
    score: legionRow?.score ?? overallRow.score,
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
    queuedMs: firstQueued.queuedMs + secondQueued.queuedMs + fallbackLegionQueuedMs,
    source: "nexon_upstream",
  };
}

export async function GET(request: NextRequest) {
  const characterName = request.nextUrl.searchParams.get("character_name")?.trim() ?? "";
  if (!characterName) {
    return NextResponse.json({ error: "character_name is required" }, { status: 400 });
  }
  if (characterName.length < 4) {
    return NextResponse.json({ error: "character_name must be at least 4 characters" }, { status: 400 });
  }

  const key = normalizeName(characterName);
  const cacheHit = await getCacheHit(key);
  if (cacheHit.entry) {
    if (cacheHit.entry.kind === "not_found") {
      return NextResponse.json<LookupNotFound>({
        found: false,
        characterName: cacheHit.entry.characterName,
        data: null,
        expiresAt: cacheHit.entry.expiresAt,
        fromCache: true,
        queuedMs: 0,
        source: cacheHit.source ?? "memory_cache",
      });
    }
    return NextResponse.json<LookupFound>({
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
    return NextResponse.json(shared);
  }

  const lookupPromise = buildLookup(characterName, key);
  inFlightLookup.set(key, lookupPromise);

  try {
    const result = await lookupPromise;
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "QUEUE_FULL") {
      return NextResponse.json(
        { error: "Server lookup queue is full. Please retry shortly." },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: "Lookup failed." }, { status: 502 });
  } finally {
    inFlightLookup.delete(key);
  }
}

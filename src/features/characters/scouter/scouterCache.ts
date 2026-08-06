/*
  Per-character, hash-keyed cache for MapleScouter results, lives client-side rather than
  as a shared server cache: mapledoro's own user-entered stat inputs have no server-side
  verification (all user data lives in localStorage per root CLAUDE.md), so a shared
  server cache keyed by character name would let anyone importing/naming a character the
  same way poison the cached result for every other user looking at "that" character.
  Keyed by a hash of the built payload (not "most recent value"), so reverting a stat
  change back to its original value is a cache hit, not a refetch.

  Refresh flow: hash hit -> return instantly, zero network. Hash miss -> POST through
  the stateless proxy route. Success -> cache under that hash. Failure or a malformed
  response (missing fields, a suspicious zero) -> don't cache it, fall back to the last
  good result marked stale. No previous result at all -> neutral empty state, not an error.
*/

import type { StoredCharacterRecord } from "../model/charactersStore";
import { readCharactersStore } from "../model/charactersStore";
import { readCharacterToolData, writeCharacterToolData } from "../../tools/characterToolStorage";
import { buildScouterPayload, hashScouterPayload, type ScouterUserStat } from "./scouterApi";

const SCOUTER_RESULT_TOOL_KEY = "scouterResult";
const MAX_CACHE_ENTRIES = 8;

// Bump this whenever we confirm (via a real live-diff test, never a guess) that MapleScouter
// changed something on their end -- a formula tweak, a renamed/added response field -- or
// whenever mapledoro's own payload builder changes in a way that could shift the result for
// inputs that look unchanged to the user. The per-character input hash alone can't catch
// either case, since it only changes when the character's own stats change. A version bump
// makes every existing entry read as stale-by-version on next load, so it self-heals via one
// real refetch per character, with no per-user localStorage clearing ever needed.
// Bumped to 2 for specEfficiency (below). A newly-parsed response field can never reach an
// already-cached entry on its own: refreshScouterResult returns a hash hit without fetching,
// and the hash only moves when the character's own stats do, so without a bump the Stat
// Efficiency bookmark would read "not available" forever for every existing character.
const SCOUTER_CACHE_VERSION = 2;

interface ScouterSpline {
  x: number[];
  y: number[];
  m: number[];
}

/** Raw inputs to the Boss Clear (Cut) formula (see bossClearFormula.ts). Optional on
 *  ScouterResultEntry (not every cached entry has it yet -- a pre-existing entry just
 *  shows "not available yet, refresh" for Boss Clear instead of needing a cache-version
 *  bump) and itself nullable field-by-field, since a malformed or missing
 *  `simulatorData` shouldn't fail the whole cache entry, only the Boss Clear section. */
export interface BossClearInputs {
  calculatedHexaDamage300: number;
  calculatedHexaDamage380: number;
  calculatedDamage380: number;
  calculatedHexaDamageKaling: number;
  ascentConst: number;
  ignoreDefConst300: number;
  ignoreDefConst380: number;
  spline300: ScouterSpline;
  spline380: ScouterSpline;
  genePassConst: number;
}

/** The subset of MapleScouter's `calculatedData.specEfficiency` table the Stat Efficiency
 *  bookmark reads. Each value is the fraction of extra final damage ONE unit of that stat
 *  buys this character, so `value * amount` is the damage gain and a ratio between two
 *  fields is an equivalence ("1 ATT is worth N main stat"). Computed server-side, so unlike
 *  Boss Clear there's no formula to port -- only the site's presentation math on top of it
 *  (statEfficiency.ts). Wire names kept verbatim so those ported formulas stay readable
 *  next to the decompiled originals.
 *
 *  The real response carries more (`igreffminus{10,15,20,30,35}` and their `_380` twins, for
 *  ignore-DEF amounts the panel doesn't offer); only what's rendered is stored. Optional on
 *  ScouterResultEntry and all-or-nothing field-wise, same as BossClearInputs: a response
 *  missing it degrades that one bookmark rather than failing the whole entry. */
const SPEC_EFFICIENCY_KEYS = [
  "dmgeff1", "atkeff1", "atkPereff1", "cridmgeff1",
  "igreff1", "igreff1_380", "igreffminus40_380",
  "mainStateff1", "mainStatPereff1", "mainStatAbseff1",
  "subStateff1", "subStatPereff1", "subStatAbseff1",
  "ssubStateff1", "ssubStatPereff1", "ssubStatAbseff1",
  "allStatEff",
] as const;

export type ScouterSpecEfficiency = Record<(typeof SPEC_EFFICIENCY_KEYS)[number], number>;

export interface ScouterResultEntry {
  computedAt: number;
  boss300Normal: number;
  boss300Hexa: number;
  boss380Normal: number;
  boss380Hexa: number;
  convertedPowerNormal: number;
  convertedPowerHexa: number;
  dojoPower: number;
  bossClearInputs?: BossClearInputs;
  specEfficiency?: ScouterSpecEfficiency;
}

interface ScouterCacheData {
  version: number;
  entries: Record<string, ScouterResultEntry>;
  lastHash: string;
}

/** Not yet detected server-side beyond these 4 buckets -- route.ts maps every upstream/
 *  proxy failure mode into one of these via a `code` field on its JSON error body. */
export type ScouterErrorReason = "rate_limited" | "timeout" | "bad_response" | "network";

export type ScouterRefreshResult =
  | { status: "ok"; entry: ScouterResultEntry; stale: false }
  // stale is only ever reached via a failed refresh (see staleFallback below), so the
  // reason it's stale is always known -- never a bare "stale: true" with no explanation.
  | { status: "ok"; entry: ScouterResultEntry; stale: true; reason: ScouterErrorReason }
  | { status: "unsupported" }
  | { status: "empty" }
  // repeatedFailure is true once the SAME input has failed with "bad_response" (a parsed-
  // but-invalid result, the same signature a genuine 0/typo'd stat produces) more than once
  // in a row -- a hint to double-check MapleScouter Setup, not just retry. Never true for
  // rate_limited/timeout/network, those are infra blips unrelated to what was typed.
  | { status: "error"; reason: ScouterErrorReason; repeatedFailure: boolean };

// A cache written under an older SCOUTER_CACHE_VERSION is treated as if it doesn't exist at
// all (not just the current hash -- the whole per-character entries map), so a version bump
// wipes every stale hash for that character in one go rather than leaving old-version
// entries sitting alongside new ones under different hashes.
function readCache(characterName: string): ScouterCacheData | null {
  const cache = readCharacterToolData<ScouterCacheData>(characterName, SCOUTER_RESULT_TOOL_KEY);
  return cache && cache.version === SCOUTER_CACHE_VERSION ? cache : null;
}

/** Stores a fresh result under its hash, evicting the oldest entry (by computedAt)
 *  past MAX_CACHE_ENTRIES so an actively-tweaked character doesn't grow unbounded. */
function storeCacheEntry(characterName: string, hash: string, entry: ScouterResultEntry, existing: ScouterCacheData | null): void {
  const entries = { ...(existing?.entries ?? {}), [hash]: entry };
  const hashes = Object.keys(entries);
  if (hashes.length > MAX_CACHE_ENTRIES) {
    const oldest = hashes.toSorted((a, b) => entries[a].computedAt - entries[b].computedAt)[0];
    delete entries[oldest];
  }
  writeCharacterToolData(characterName, SCOUTER_RESULT_TOOL_KEY, { version: SCOUTER_CACHE_VERSION, entries, lastHash: hash } satisfies ScouterCacheData);
}

interface MapleScouterCalcResponse {
  calculatedData?: {
    boss300_stat?: number;
    boss380_stat?: number;
    boss300_hexaStat?: number;
    boss380_hexaStat?: number;
    exchangePower?: number;
    exchangePowerHexa?: number;
    // "mr" = Mu Lung Dojo. Unlike the other pairs above, MapleScouter's own result modal
    // only ever shows this one HEXA figure as "Dojo" -- mr_stat (the would-be Normal
    // counterpart) reads 0 in every real capture so far, seemingly dead on their end.
    mr_hexaStat?: number;
    // Raw inputs the Boss Clear formula needs, live-confirmed on a real Kanna captured
    // response to sit directly on calculatedData -- NOT under a separate `simulatorData`
    // object (that name only exists client-side in MapleScouter's OWN Zustand store as a
    // working copy of calculatedData for their build simulator feature, not a real API
    // field).
    calculatedHexaDamage_300?: number;
    calculatedHexaDamage_380?: number;
    calculatedDamage_380?: number;
    calculatedHexaDamage_kaling?: number;
    ascent_const?: number;
    ignoreDefConst_300?: number;
    ignoreDefConst_380?: number;
    spline_300?: ScouterSpline;
    spline_380?: ScouterSpline;
    genePassConst?: number;
    specEfficiency?: unknown;
  };
}

function isScouterSpline(value: unknown): value is ScouterSpline {
  if (!value || typeof value !== "object") return false;
  const { x, y, m } = value as Record<string, unknown>;
  return Array.isArray(x) && Array.isArray(y) && Array.isArray(m);
}

/** Missing/malformed Boss Clear fields just means that section shows "not available yet,
 *  refresh" instead of failing the whole cache entry -- Phase 1's Boss 300/380 figures don't
 *  depend on any of them. */
function parseBossClearInputs(c: NonNullable<MapleScouterCalcResponse["calculatedData"]>): BossClearInputs | undefined {
  const {
    calculatedHexaDamage_300, calculatedHexaDamage_380, calculatedDamage_380, calculatedHexaDamage_kaling,
    ascent_const, ignoreDefConst_300, ignoreDefConst_380, spline_300, spline_380, genePassConst,
  } = c;
  if (
    typeof calculatedHexaDamage_300 !== "number" || typeof calculatedHexaDamage_380 !== "number" ||
    typeof calculatedDamage_380 !== "number" || typeof calculatedHexaDamage_kaling !== "number" ||
    typeof ascent_const !== "number" || typeof ignoreDefConst_300 !== "number" || typeof ignoreDefConst_380 !== "number" ||
    typeof genePassConst !== "number" || !isScouterSpline(spline_300) || !isScouterSpline(spline_380)
  ) return undefined;
  return {
    calculatedHexaDamage300: calculatedHexaDamage_300,
    calculatedHexaDamage380: calculatedHexaDamage_380,
    calculatedDamage380: calculatedDamage_380,
    calculatedHexaDamageKaling: calculatedHexaDamage_kaling,
    ascentConst: ascent_const,
    ignoreDefConst300: ignoreDefConst_300,
    ignoreDefConst380: ignoreDefConst_380,
    spline300: spline_300,
    spline380: spline_380,
    genePassConst,
  };
}

/** Every field or none: a partially-numeric table would silently render some efficiency rows
 *  against a 0 (reading as "this stat is worth nothing") instead of hiding the section. */
function parseSpecEfficiency(raw: unknown): ScouterSpecEfficiency | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const parsed: Record<string, number> = {};
  for (const key of SPEC_EFFICIENCY_KEYS) {
    const value = source[key];
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    parsed[key] = value;
  }
  return parsed as ScouterSpecEfficiency;
}

/** A 0 for the headline figure is MapleScouter's own known failure signature (e.g. the
 *  Ephenia Soul "C" tier bug), treat it the same as a network failure, not a real result. */
function parseCalcResponse(data: MapleScouterCalcResponse): ScouterResultEntry | null {
  const c = data.calculatedData;
  if (!c) return null;
  const { boss300_stat, boss380_stat, boss300_hexaStat, boss380_hexaStat, exchangePower, exchangePowerHexa, mr_hexaStat } = c;
  if (
    typeof boss300_stat !== "number" || typeof boss380_stat !== "number" ||
    typeof boss300_hexaStat !== "number" || typeof boss380_hexaStat !== "number" ||
    typeof exchangePower !== "number" || typeof exchangePowerHexa !== "number" ||
    typeof mr_hexaStat !== "number"
  ) return null;
  if (boss380_hexaStat <= 0) return null;
  return {
    computedAt: Date.now(),
    boss300Normal: boss300_stat,
    boss300Hexa: boss300_hexaStat,
    boss380Normal: boss380_stat,
    boss380Hexa: boss380_hexaStat,
    convertedPowerNormal: exchangePower,
    convertedPowerHexa: exchangePowerHexa,
    dojoPower: mr_hexaStat,
    bossClearInputs: parseBossClearInputs(c),
    specEfficiency: parseSpecEfficiency(c.specEfficiency),
  };
}

type ScouterFetchResult =
  | { ok: true; entry: ScouterResultEntry }
  | { ok: false; reason: ScouterErrorReason };

const ERROR_CODE_TO_REASON: Record<string, ScouterErrorReason> = {
  RATE_LIMITED: "rate_limited",
  TIMEOUT: "timeout",
  BAD_RESPONSE: "bad_response",
  NETWORK: "network",
};

/** Never throws -- every failure mode (couldn't even reach our own proxy, the proxy
 *  rejected the request, or the response didn't parse into real numbers) resolves to a
 *  tagged reason instead, so refreshScouterResult never needs its own try/catch. */
async function fetchScouterResult(payload: ScouterUserStat): Promise<ScouterFetchResult> {
  let response: Response;
  try {
    response = await fetch("/api/scouter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userStat: payload }),
    });
  } catch {
    return { ok: false, reason: "network" };
  }
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { code?: string } | null;
    const reason = errorBody?.code ? ERROR_CODE_TO_REASON[errorBody.code] : undefined;
    return { ok: false, reason: reason ?? "bad_response" };
  }
  const data = (await response.json().catch(() => null)) as MapleScouterCalcResponse | null;
  if (!data) return { ok: false, reason: "bad_response" };
  const entry = parseCalcResponse(data);
  return entry ? { ok: true, entry } : { ok: false, reason: "bad_response" };
}

/** The last good value to fall back on after a failed refresh, or null if there's never
 *  been one -- refreshScouterResult reports "error" (with a reason) in that null case,
 *  rather than the misleading "empty" (== never even tried) it used to collapse into.
 *  Carries the reason the fresh fetch failed, so the UI can say *why* it's stale. */
function staleFallback(
  cache: ScouterCacheData | null,
  reason: ScouterErrorReason,
): { status: "ok"; entry: ScouterResultEntry; stale: true; reason: ScouterErrorReason } | null {
  const lastEntry = cache ? cache.entries[cache.lastHash] : undefined;
  return lastEntry ? { status: "ok", entry: lastEntry, stale: true, reason } : null;
}

// Session-only key builder shared by the auto-refresh spam guard below and the repeated-
// bad_response tracker -- both key on "this exact character, this exact input hash".
function sessionKey(characterName: string, hash: string): string {
  return `${characterName.trim().toLowerCase()}:${hash}`;
}

// Session-only count of consecutive "bad_response" failures for an UNCHANGED input hash.
// Not persisted, same rationale as autoAttemptedThisSession below: a page reload asking
// for one more fresh attempt before hinting isn't worth tracking across reloads.
const consecutiveBadResponses = new Map<string, number>();
const REPEATED_FAILURE_THRESHOLD = 2;

function recordBadResponse(key: string): boolean {
  const count = (consecutiveBadResponses.get(key) ?? 0) + 1;
  consecutiveBadResponses.set(key, count);
  return count >= REPEATED_FAILURE_THRESHOLD;
}

function buildPayloadAndHash(character: StoredCharacterRecord): { payload: ScouterUserStat; hash: string } | null {
  const store = readCharactersStore();
  const payload = buildScouterPayload(character, {
    scouterLegionByWorld: store.scouterLegionByWorld,
  });
  if (!payload) return null;
  return { payload, hash: hashScouterPayload(payload) };
}

/** Reads the cached result for the character's CURRENT input state, with no network
 *  call, safe to run on mount even though the Scouter figure is otherwise manual-refresh
 *  only, since a cache hit costs nothing. Returns null if nothing matches yet (new
 *  character, or inputs changed since the last real fetch) rather than falling back to
 *  a stale entry, that fallback is only for a failed refresh attempt, not a cold read. */
export function peekScouterCache(character: StoredCharacterRecord): ScouterResultEntry | null {
  const built = buildPayloadAndHash(character);
  if (!built) return null;
  const cache = readCache(character.characterName);
  return cache?.entries[built.hash] ?? null;
}

/** Refreshes a character's Scouter figure. Builds the payload fresh each call (so it
 *  always reflects current stored data), hashes it, and either returns a cache hit
 *  instantly or fetches through the proxy route. */
export async function refreshScouterResult(character: StoredCharacterRecord): Promise<ScouterRefreshResult> {
  const built = buildPayloadAndHash(character);
  if (!built) return { status: "unsupported" };
  const { payload, hash } = built;
  const key = sessionKey(character.characterName, hash);

  const cache = readCache(character.characterName);
  const cached = cache?.entries[hash];
  if (cached) {
    consecutiveBadResponses.delete(key);
    return { status: "ok", entry: cached, stale: false };
  }

  const fetched = await fetchScouterResult(payload);
  if (!fetched.ok) {
    const repeatedFailure = fetched.reason === "bad_response" && recordBadResponse(key);
    const fallback = staleFallback(cache, fetched.reason);
    return fallback ?? { status: "error", reason: fetched.reason, repeatedFailure };
  }

  consecutiveBadResponses.delete(key);
  storeCacheEntry(character.characterName, hash, fetched.entry, cache);
  return { status: "ok", entry: fetched.entry, stale: false };
}

// Session-only guard against an auto-refresh silently retrying on every remount (e.g.
// bouncing between bookmarks) after a failed automatic attempt -- once tried and failed
// for a given hash, only a manual refresh click tries again this session. Not persisted:
// a page reload resetting this is fine (a fresh reload asking for one more automatic try
// isn't "spam"), and it keeps the scouter cache's stored shape untouched for something
// that doesn't need to survive a reload. The real backstop against deliberate abuse is
// the per-IP rate limit on the proxy route itself.
const autoAttemptedThisSession = new Set<string>();

/** Auto-refresh trigger for useScouterResult's "empty -> silently try once" effect.
 *  Covers two cases with one rule: a brand-new character finishing setup and an existing
 *  character after a real edit both land on a hash `peekScouterCache` has never seen,
 *  i.e. status "empty" -- a no-op re-save doesn't, since it reproduces a hash that's
 *  either already cached or already attempted. Returns null with no network call for
 *  every case that isn't a genuine, first-time-this-session "empty": unsupported,
 *  already has a result, or already tried and failed this session. */
export async function autoRefreshScouterResultIfNeeded(character: StoredCharacterRecord): Promise<ScouterRefreshResult | null> {
  const built = buildPayloadAndHash(character);
  if (!built) return null;
  const cache = readCache(character.characterName);
  if (cache?.entries[built.hash]) return null;
  const key = sessionKey(character.characterName, built.hash);
  if (autoAttemptedThisSession.has(key)) return null;
  autoAttemptedThisSession.add(key);
  return refreshScouterResult(character);
}

/*
  Per-character, hash-keyed cache for MapleScouter results. Client-side rather than a
  shared server cache: stat inputs are user-entered with no server-side verification, so a
  cache keyed by character name would let anyone naming a character the same way poison the
  result every other user sees for "that" character. The key is a hash of the built payload
  rather than the most recent value, so reverting a stat change is a hit, not a refetch.

  Refresh flow: hash hit returns instantly with no network. A miss POSTs through the
  stateless proxy route and caches the result under that hash. A failure or a malformed
  response falls back to the last good result marked stale, and is never itself cached.
  With no previous result, the state is empty rather than an error.
*/

import type { StoredCharacterRecord } from "../model/charactersStore";
import { readCharactersStore } from "../model/charactersStore";
import { readCharacterToolData, writeCharacterToolData } from "../../tools/characterToolStorage";
import { buildScouterPayload, hashScouterPayload, type ScouterUserStat } from "./scouterApi";

const SCOUTER_RESULT_TOOL_KEY = "scouterResult";
const MAX_CACHE_ENTRIES = 8;

// Bump when MapleScouter changes something on their end (a formula tweak, a renamed or
// added response field) or when this app's payload builder changes in a way that shifts the
// result for inputs the user never touched. The per-character input hash cannot catch
// either case, since it only changes when the character's own stats do. A bump makes every
// existing entry read as stale-by-version on the next load, so it self-heals with one
// refetch per character and never needs localStorage cleared by hand.
const SCOUTER_CACHE_VERSION = 5;

// refreshScouterResult treats an entry older than this as a miss and refetches even when the
// hash still matches, so unnoticed formula drift on MapleScouter's end ages out without
// needing a version bump. peekScouterCache ignores the TTL and still shows an expired entry
// rather than nothing, since only refreshScouterResult makes a network call.
const SCOUTER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isEntryExpired(entry: ScouterResultEntry): boolean {
  return Date.now() - entry.computedAt > SCOUTER_CACHE_TTL_MS;
}

interface ScouterSpline {
  x: number[];
  y: number[];
  m: number[];
}

/** Raw inputs to the Boss Clear (Cut) formula (see bossClearFormula.ts). Optional on
 *  ScouterResultEntry, and nullable field by field, so an entry predating it or carrying a
 *  malformed `simulatorData` shows "not available yet, refresh" for Boss Clear instead of
 *  invalidating the whole cache entry. */
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
 *  Boss Clear there is no formula to port, only the presentation math in statEfficiency.ts.
 *  Wire names are kept verbatim so the ported formulas stay readable beside the originals.
 *
 *  The response carries more (`igreffminus{10,15,20,30,35}` and their `_380` twins, for
 *  ignore-DEF amounts the panel does not offer); only what renders is stored. Optional and
 *  all-or-nothing field-wise like BossClearInputs, so a response missing it degrades that
 *  one bookmark rather than the whole entry. */
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

/** route.ts maps every upstream and proxy failure mode into one of these four buckets via a
 *  `code` field on its JSON error body. */
export type ScouterErrorReason = "rate_limited" | "timeout" | "bad_response" | "network";

export type ScouterRefreshResult =
  | { status: "ok"; entry: ScouterResultEntry; stale: false }
  // Only reachable via a failed refresh (staleFallback below), so the reason is always
  // known and this is never a bare "stale: true" with no explanation.
  | { status: "ok"; entry: ScouterResultEntry; stale: true; reason: ScouterErrorReason }
  | { status: "unsupported" }
  | { status: "empty" }
  // repeatedFailure means the same input hit "bad_response" more than once in a row, which
  // is also what a genuine 0 or a typo'd stat looks like, so it hints to check MapleScouter
  // Setup rather than just retry. Never set for rate_limited, timeout or network, which are
  // infra blips unrelated to what was typed.
  | { status: "error"; reason: ScouterErrorReason; repeatedFailure: boolean };

// A cache written under an older SCOUTER_CACHE_VERSION reads as absent entirely, meaning the
// whole per-character entries map and not just the current hash, so one bump clears every
// stale hash for that character instead of mixing old and new entries under different hashes.
function readCache(characterName: string): ScouterCacheData | null {
  const cache = readCharacterToolData<ScouterCacheData>(characterName, SCOUTER_RESULT_TOOL_KEY);
  return cache && cache.version === SCOUTER_CACHE_VERSION ? cache : null;
}

/** Stores a fresh result under its hash, evicting the oldest entry by computedAt past
 *  MAX_CACHE_ENTRIES so an actively edited character cannot grow unbounded. */
function storeCacheEntry(characterName: string, hash: string, entry: ScouterResultEntry, existing: ScouterCacheData | null): void {
  const entries = { ...existing?.entries, [hash]: entry };
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
    // "mr" is Mu Lung Dojo. Unlike the pairs above, MapleScouter's result modal shows only
    // this HEXA figure as "Dojo"; mr_stat, the Normal counterpart, reads 0 in every capture
    // and appears to be dead on their end.
    mr_hexaStat?: number;
    // Raw inputs the Boss Clear formula needs. These sit directly on calculatedData, not
    // under a separate `simulatorData` object: that name exists only in MapleScouter's own
    // client-side store, as a working copy of calculatedData for their build simulator, and
    // is not an API field.
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

/** Missing or malformed Boss Clear fields show "not available yet, refresh" for that section
 *  rather than failing the whole entry, since the Boss 300/380 figures do not depend on
 *  them. */
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

/** Every field or none. A partially numeric table would render some efficiency rows against
 *  a 0, reading as "this stat is worth nothing", instead of hiding the section. */
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

/** A 0 headline figure is a known MapleScouter failure signature, such as the Ephenia Soul
 *  "C" tier bug, so it is treated as a network failure rather than a real result. Exported
 *  for scouterSimulatorCache.ts's direct-override path, which POSTs a mutated
 *  ScouterUserStat to the same /api/scouter route and gets the same response shape back. */
export function parseCalcResponse(data: unknown): ScouterResultEntry | null {
  const c = (data as MapleScouterCalcResponse | null)?.calculatedData;
  if (!c) return null;
  return parseCalculatedData(c);
}

function parseCalculatedData(c: NonNullable<MapleScouterCalcResponse["calculatedData"]>): ScouterResultEntry | null {
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

/** Never throws. Every failure mode, whether the proxy was unreachable, rejected the
 *  request, or returned something that would not parse into real numbers, resolves to a
 *  tagged reason, so refreshScouterResult needs no try/catch of its own. */
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

/** The last good value to fall back on after a failed refresh, or null if there has never
 *  been one. refreshScouterResult reports "error" with a reason in the null case rather than
 *  "empty", which means never attempted. Carries the reason the fetch failed so the UI can
 *  say why the figure is stale. */
function staleFallback(
  cache: ScouterCacheData | null,
  reason: ScouterErrorReason,
): { status: "ok"; entry: ScouterResultEntry; stale: true; reason: ScouterErrorReason } | null {
  const lastEntry = cache ? cache.entries[cache.lastHash] : undefined;
  return lastEntry ? { status: "ok", entry: lastEntry, stale: true, reason } : null;
}

// Session-only key builder shared by the auto-refresh spam guard below and the repeated
// bad_response tracker. Both key on this exact character and this exact input hash.
function sessionKey(characterName: string, hash: string): string {
  return `${characterName.trim().toLowerCase()}:${hash}`;
}

// Session-only count of consecutive bad_response failures for an unchanged input hash. Not
// persisted, for the same reason as autoAttemptedThisSession below: letting a page reload buy
// one more attempt before hinting is not worth tracking across reloads.
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

/** Reads the cached result for the character's current input state with no network call, so
 *  it is safe on mount even though the Scouter figure is otherwise manual-refresh only.
 *  Returns null when nothing matches, whether a new character or inputs changed since the
 *  last fetch, rather than falling back to a stale entry; that fallback is only for a failed
 *  refresh. */
export function peekScouterCache(character: StoredCharacterRecord): ScouterResultEntry | null {
  const built = buildPayloadAndHash(character);
  if (!built) return null;
  const cache = readCache(character.characterName);
  return cache?.entries[built.hash] ?? null;
}

/** Cache-only read for the last computed result under any previous input hash, not just the
 *  current one. Used as a cold-mount fallback (initialStatus in useScouterResult.ts) so
 *  returning to a bookmark after editing stats still shows the last known figure instead of
 *  dropping to a placeholder, matching what staleFallback above already does in-session.
 *  Null only when nothing has ever been computed for this character. */
export function peekScouterLastKnown(character: StoredCharacterRecord): ScouterResultEntry | null {
  const cache = readCache(character.characterName);
  return cache ? (cache.entries[cache.lastHash] ?? null) : null;
}

// Tracked per character, not per hash: two refresh buttons for the same character (Overview
// figure, bookmark header) each run their own useScouterResult instance with no shared React
// state, so this is what stops them firing duplicate fetches. Same module-level-Map-plus-
// listeners shape as scouterDevDrill.ts's override store.
const inFlightRefreshes = new Map<string, Promise<ScouterRefreshResult>>();
const inFlightListeners = new Set<() => void>();

function notifyInFlightChanged() {
  for (const listener of inFlightListeners) listener();
}

export function subscribeScouterRefreshInFlight(listener: () => void) {
  inFlightListeners.add(listener);
  return () => inFlightListeners.delete(listener);
}

export function isScouterRefreshInFlight(characterName: string): boolean {
  return inFlightRefreshes.has(characterName.trim().toLowerCase());
}

/** Refreshes a character's Scouter figure. Builds the payload fresh each call, hashes it, and
 *  either returns a cache hit instantly or fetches through the proxy route. Concurrent calls
 *  for the same character share one in-flight request. */
export function refreshScouterResult(character: StoredCharacterRecord): Promise<ScouterRefreshResult> {
  const nameKey = character.characterName.trim().toLowerCase();
  const existing = inFlightRefreshes.get(nameKey);
  if (existing) return existing;

  const promise = runScouterRefresh(character).finally(() => {
    inFlightRefreshes.delete(nameKey);
    notifyInFlightChanged();
  });
  inFlightRefreshes.set(nameKey, promise);
  notifyInFlightChanged();
  return promise;
}

async function runScouterRefresh(character: StoredCharacterRecord): Promise<ScouterRefreshResult> {
  const built = buildPayloadAndHash(character);
  if (!built) return { status: "unsupported" };
  const { payload, hash } = built;
  const key = sessionKey(character.characterName, hash);

  const cache = readCache(character.characterName);
  const cached = cache?.entries[hash];
  if (cached && !isEntryExpired(cached)) {
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
  // Re-read rather than reusing `cache` from above. That snapshot predates the await, so a
  // write to this character's tools blob during the fetch would be clobbered by merging onto
  // stale data here.
  storeCacheEntry(character.characterName, hash, fetched.entry, readCache(character.characterName));
  return { status: "ok", entry: fetched.entry, stale: false };
}

// Session-only guard against an auto-refresh retrying on every remount, such as bouncing
// between bookmarks, after a failed automatic attempt. Once a hash has been tried and failed,
// only a manual refresh tries again this session. Not persisted, since a reload buying one
// more automatic try is reasonable and this does not need to survive one. The real backstop
// against abuse is the per-IP rate limit on the proxy route.
const autoAttemptedThisSession = new Set<string>();

/** Auto-refresh trigger for useScouterResult's "empty -> silently try once" effect.
 *  One rule covers two cases: a new character finishing setup and an existing character
 *  after a real edit both land on a hash `peekScouterCache` has never seen, giving status
 *  "empty". A no-op re-save does not, since it reproduces a hash that is already cached or
 *  already attempted. Returns null with no network call for anything that is not a genuine
 *  first-time-this-session "empty", meaning unsupported, already resolved, or already tried
 *  and failed this session. */
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

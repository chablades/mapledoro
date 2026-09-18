/*
  Domain types for the characters feature.
  Keep API response and normalized character models here.
*/
export interface NormalizedCharacterData {
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

interface LookupFoundResponse {
  found: true;
  data: NormalizedCharacterData;
  expiresAt: number;
  fromCache: boolean;
  queuedMs: number;
  source: "redis_cache" | "memory_cache" | "nexon_upstream";
  degraded?: boolean;
  degradedCode?: string;
}

interface LookupNotFoundResponse {
  found: false;
  characterName: string;
  data: null;
  expiresAt: number;
  fromCache: boolean;
  queuedMs: number;
  source: "redis_cache" | "memory_cache" | "nexon_upstream";
  degraded?: boolean;
  degradedCode?: string;
}

export type LookupResponse = LookupFoundResponse | LookupNotFoundResponse;

/**
 * A lookup payload made safe to store. `response.json()` is a cast, not a check, so a
 * response that is missing fields (Nexon has dropped rank metadata from its rows before, and
 * a stale cache can still serve such a payload) would otherwise be spread straight into a
 * stored record and only fail much later, on the next load, by deleting the character.
 * Defaulting here means a thinner payload costs a zero in a rank field and nothing else.
 *
 * Returns null only when the payload cannot describe a character at all, which callers
 * already handle as "lookup failed" rather than as data loss.
 */
export function normalizeLookupData(value: unknown): NormalizedCharacterData | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const str = (x: unknown): string | null => (typeof x === "string" && x ? x : null);
  const numOr = (x: unknown, d: number): number =>
    typeof x === "number" && Number.isFinite(x) ? x : d;

  const characterName = str(v.characterName);
  const jobName = str(v.jobName);
  const characterImgURL = str(v.characterImgURL);
  if (
    characterName === null ||
    jobName === null ||
    characterImgURL === null ||
    typeof v.worldID !== "number" ||
    typeof v.level !== "number"
  ) {
    return null;
  }

  return {
    characterName,
    jobName,
    characterImgURL,
    worldID: v.worldID,
    level: v.level,
    characterID: numOr(v.characterID, 0),
    exp: numOr(v.exp, 0),
    isSearchTarget: typeof v.isSearchTarget === "boolean" ? v.isSearchTarget : false,
    startRank: numOr(v.startRank, 0),
    overallRank: numOr(v.overallRank, 0),
    overallGap: numOr(v.overallGap, 0),
    legionRank: numOr(v.legionRank, 0),
    legionGap: numOr(v.legionGap, 0),
    legionLevel: numOr(v.legionLevel, 0),
    raidPower: numOr(v.raidPower, 0),
    tierID: numOr(v.tierID, 0),
    score: numOr(v.score, 0),
    fetchedAt: numOr(v.fetchedAt, Date.now()),
    expiresAt: numOr(v.expiresAt, 0),
  };
}

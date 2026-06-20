/*
  Oz ring catalog + per-class derivation for the MapleScouter flow.

  Built for CURRENT GMS (4 rings). KNOWN-UPCOMING GMS change: the ring set
  consolidates to just Ring of Restraint + Continuous Ring — when that lands,
  edit OZ_RINGS here (and migrate stored levels); the UI/storage logic is generic.

  All rings are level 0–6. Only the Totalling Ring carries stat fields, and only
  when its level > 0: the user enters the main stats (STR/DEX/INT/LUK) that are
  NOT their class's primary/secondary/tertiary stat. The Weapon Jump ring has a
  per-stat variant (S/I/L/D) auto-selected from the class's primary stat.
*/

import type { StoredOzRings } from "../../model/charactersStore";

export const OZ_RING_MAX_LEVEL = 6;

export type OzRingId = "restraint" | "weaponJump" | "totalling" | "continuous";

export type MainStatId = "str" | "dex" | "int" | "luk";

const MAIN_STATS: MainStatId[] = ["str", "dex", "int", "luk"];
const MAIN_STAT_SET = new Set<string>(MAIN_STATS);

export const MAIN_STAT_LABELS: Record<MainStatId, string> = {
  str: "STR", dex: "DEX", int: "INT", luk: "LUK",
};

const WEAPON_JUMP_LETTER: Record<MainStatId, string> = { str: "S", int: "I", luk: "L", dex: "D" };

// Item icon ids (manifests/v269/item.json, Character/Ring).
export const OZ_RING_ICON_IDS: Record<"restraint" | "totalling" | "continuous", string> = {
  restraint: "01113098",  // Ring of Restraint
  totalling: "01113108",  // Totalling Ring
  continuous: "01113329", // Continuous Ring
};
const WEAPON_JUMP_ICON_BY_STAT: Record<MainStatId, string> = {
  str: "01113113", // Weapon Jump S Ring
  dex: "01113114", // Weapon Jump D Ring
  int: "01113115", // Weapon Jump I Ring
  luk: "01113116", // Weapon Jump L Ring
};

/** Per-class info derived for the Oz ring step. */
export interface OzClassStatInfo {
  /** Primary main stat (drives the Weapon Jump variant); null for classes without main-stat data. */
  primaryStat: MainStatId | null;
  /** Display label for the Weapon Jump ring, e.g. "Weapon Jump (I)". */
  weaponJumpLabel: string;
  /** Item icon id for the class's Weapon Jump ring variant. */
  weaponJumpIconId: string;
  /** Main stats NOT used by the class — the Totalling Ring stat fields. */
  totallingStats: MainStatId[];
}

/**
 * Derives the class's main-stat shape from its ordered `requiredStats`
 * (primary → secondary → tertiary first). Empty/unknown class → all 4 stats are
 * "off-stats" and the Weapon Jump variant is left generic.
 */
export function getOzClassStatInfo(requiredStats: readonly string[]): OzClassStatInfo {
  const used = requiredStats.filter((s): s is MainStatId => MAIN_STAT_SET.has(s));
  const primaryStat = used[0] ?? null;
  const weaponJumpLabel = primaryStat ? `Weapon Jump (${WEAPON_JUMP_LETTER[primaryStat]})` : "Weapon Jump";
  const weaponJumpIconId = WEAPON_JUMP_ICON_BY_STAT[primaryStat ?? "str"];
  const totallingStats = MAIN_STATS.filter((s) => !used.includes(s));
  return { primaryStat, weaponJumpLabel, weaponJumpIconId, totallingStats };
}

export interface OzRingsDraft {
  /** The swap: true ⇒ the user runs a Continuous Ring (and only that input shows). */
  usesContinuous: boolean;
  /** Raw level strings (0–6) keyed by ring id. */
  levels: Partial<Record<OzRingId, string>>;
  /** Raw Totalling Ring stat values keyed by main stat id (only the off-stats). */
  totallingStatValues: Partial<Record<MainStatId, string>>;
}

export function emptyOzRingsDraft(): OzRingsDraft {
  return { usesContinuous: false, levels: {}, totallingStatValues: {} };
}

export function parseOzRingsDraft(value: string): OzRingsDraft {
  if (!value) return emptyOzRingsDraft();
  try {
    const parsed = JSON.parse(value) as Partial<OzRingsDraft>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        usesContinuous: parsed.usesContinuous === true,
        levels: parsed.levels ?? {},
        totallingStatValues: parsed.totallingStatValues ?? {},
      };
    }
  } catch {
    // fall through
  }
  return emptyOzRingsDraft();
}

export function serializeOzRingsDraft(draft: OzRingsDraft): string {
  return JSON.stringify(draft);
}

/** Strips non-digits and caps the raw input at the max ring level. */
export function sanitizeOzRingLevel(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return String(Math.min(Number.parseInt(digits, 10), OZ_RING_MAX_LEVEL));
}

/** Parses a raw level string into 1–6, or null if empty/zero/invalid. */
export function parseOzRingLevel(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, OZ_RING_MAX_LEVEL);
}

/** Stored ring levels for the rings relevant to the chosen swap. */
function collectStoredRingLevels(draft: OzRingsDraft): Record<string, number> {
  const out: Record<string, number> = {};
  const rings: OzRingId[] = draft.usesContinuous ? ["continuous"] : ["restraint", "weaponJump", "totalling"];
  for (const ring of rings) {
    const lvl = parseOzRingLevel(draft.levels[ring]);
    if (lvl !== null) out[ring] = lvl;
  }
  return out;
}

/** Stored Totalling Ring off-stat values (positive integers only). */
function collectStoredTotallingStats(draft: OzRingsDraft): Record<string, number> {
  const out: Record<string, number> = {};
  for (const stat of MAIN_STATS) {
    const raw = draft.totallingStatValues[stat];
    const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (Number.isFinite(n) && n > 0) out[stat] = n;
  }
  return out;
}

/**
 * Converts a draft to its stored shape, keeping ONLY the rings relevant to the
 * chosen swap (continuous ⇒ just the continuous level; otherwise the 3 rings +
 * Totalling stats when its level > 0). Returns null when nothing was entered.
 */
export function convertOzRingsDraftToStored(draft: OzRingsDraft): StoredOzRings | null {
  const levels = collectStoredRingLevels(draft);
  const totallingStats = !draft.usesContinuous && levels.totalling ? collectStoredTotallingStats(draft) : {};
  if (Object.keys(levels).length === 0 && Object.keys(totallingStats).length === 0) return null;
  return { usesContinuous: draft.usesContinuous, levels, totallingStats };
}

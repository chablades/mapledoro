/*
  Oz ring catalog + per-class Weapon Jump variant derivation for the MapleScouter flow.

  Built for GMS after the ring consolidation: the set is Ring of Restraint + Weapon
  Jump + Continuous Ring, nothing else (see OZ_RING_MAX_LEVEL for the per-ring caps).
  The Totalling Ring and the standard-vs-continuous "ring setup" choice were both
  removed in that patch. Older stored data may still carry a `ringMode` flag, a
  `totalling` level, or a `totallingStats` block -- all ignored on read and dropped
  on the next save.

  The Weapon Jump ring has a per-stat variant (S/I/L/D) auto-selected from the
  class's primary stat, which is the only class-specific thing about this step.
*/

import type { StoredOzRings } from "../../model/charactersStore";

export type OzRingId = "restraint" | "weaponJump" | "continuous";

// Master level per ring. Weapon Jump was capped at 4 in the ring consolidation; the
// other two stay at 6.
export const OZ_RING_MAX_LEVEL: Record<OzRingId, number> = {
  restraint: 6,
  weaponJump: 4,
  continuous: 6,
};

type MainStatId = "str" | "dex" | "int" | "luk";

const MAIN_STAT_SET = new Set<string>(["str", "dex", "int", "luk"]);

const WEAPON_JUMP_LETTER: Record<MainStatId, string> = { str: "S", int: "I", luk: "L", dex: "D" };

// Item icon ids (manifests/v269/item.json, Character/Ring).
export const OZ_RING_ICON_IDS: Record<"restraint" | "continuous", string> = {
  restraint: "01113098",  // Ring of Restraint
  continuous: "01113329", // Continuous Ring
};
const WEAPON_JUMP_ICON_BY_STAT: Record<MainStatId, string> = {
  str: "01113113", // Weapon Jump S Ring
  dex: "01113114", // Weapon Jump D Ring
  int: "01113115", // Weapon Jump I Ring
  luk: "01113116", // Weapon Jump L Ring
};

/** The class's Weapon Jump ring variant — its display label and item icon id. */
export interface OzWeaponJumpVariant {
  /** Display label, e.g. "Weapon Jump I". */
  label: string;
  /** Item icon id for this variant. */
  iconId: string;
}

/**
 * Derives the class's Weapon Jump variant from its ordered `requiredStats` (primary
 * stat first). Empty/unknown class → the generic "Weapon Jump" label and the STR icon.
 */
export function getOzWeaponJumpVariant(requiredStats: readonly string[]): OzWeaponJumpVariant {
  const primaryStat = requiredStats.find((s): s is MainStatId => MAIN_STAT_SET.has(s)) ?? null;
  const label = primaryStat ? `Weapon Jump ${WEAPON_JUMP_LETTER[primaryStat]}` : "Weapon Jump";
  const iconId = WEAPON_JUMP_ICON_BY_STAT[primaryStat ?? "str"];
  return { label, iconId };
}

export interface OzRingsDraft {
  /** Raw level strings (0–6) keyed by ring id. */
  levels: Partial<Record<OzRingId, string>>;
}

function emptyOzRingsDraft(): OzRingsDraft {
  return { levels: {} };
}

export function parseOzRingsDraft(value: string): OzRingsDraft {
  if (!value) return emptyOzRingsDraft();
  try {
    const parsed = JSON.parse(value) as Partial<OzRingsDraft>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { levels: parsed.levels ?? {} };
    }
  } catch {
    // fall through
  }
  return emptyOzRingsDraft();
}

export function serializeOzRingsDraft(draft: OzRingsDraft): string {
  return JSON.stringify(draft);
}

/** Strips non-digits and caps the raw input at that ring's max level. */
export function sanitizeOzRingLevel(ring: OzRingId, raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return String(Math.min(Number.parseInt(digits, 10), OZ_RING_MAX_LEVEL[ring]));
}

/** Parses a raw level string into 1..that ring's max, or null if empty/zero/invalid. */
export function parseOzRingLevel(ring: OzRingId, raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, OZ_RING_MAX_LEVEL[ring]);
}

const ALL_RING_IDS: OzRingId[] = ["restraint", "weaponJump", "continuous"];

/**
 * Converts a draft to its stored shape. Returns null when no ring level was entered.
 */
export function convertOzRingsDraftToStored(draft: OzRingsDraft): StoredOzRings | null {
  const levels: Record<string, number> = {};
  for (const ring of ALL_RING_IDS) {
    const lvl = parseOzRingLevel(ring, draft.levels[ring]);
    if (lvl !== null) levels[ring] = lvl;
  }
  if (Object.keys(levels).length === 0) return null;
  return { levels };
}

/** Reverse of convertOzRingsDraftToStored — seeds the step's draft from what's already
 *  stored, so reopening Oz Rings on a character that already answered it doesn't start
 *  blank. Tolerates legacy stored fields (ringMode, totalling level, totallingStats) by
 *  reading only the surviving ring levels, and clamps to each ring's current max so a
 *  pre-consolidation Weapon Jump level above 4 shows as 4. */
export function storedOzRingsToOzRingsDraft(stored: StoredOzRings | undefined): OzRingsDraft {
  if (!stored) return emptyOzRingsDraft();
  const levels: Partial<Record<OzRingId, string>> = {};
  for (const ring of ALL_RING_IDS) {
    const lvl = parseOzRingLevel(ring, String(stored.levels[ring] ?? ""));
    if (lvl !== null) levels[ring] = String(lvl);
  }
  return { levels };
}

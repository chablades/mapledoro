/*
  Hyper Stat category catalog for the stats setup step (Full setup only).
  The in-game Hyper Stats window lists the same categories for every class; each
  line caps at level 15. We only collect the allocated level per category — the
  point-budget spend curve is not modeled.
*/

export type HyperStatCategoryId =
  | "str"
  | "dex"
  | "int"
  | "luk"
  | "hp"
  | "mp"
  | "dfTfPp"
  | "criticalRate"
  | "criticalDamage"
  | "ignoreDefense"
  | "damage"
  | "bossDamage"
  | "normalDamage"
  | "statusResistance"
  | "attackMagicAtt"
  | "expObtained"
  | "arcanePower";

export interface HyperStatCategoryDef {
  id: HyperStatCategoryId;
  label: string;
}

/** In-game Hyper Stats window order. */
export const HYPER_STAT_CATEGORIES: HyperStatCategoryDef[] = [
  { id: "str", label: "STR" },
  { id: "dex", label: "DEX" },
  { id: "int", label: "INT" },
  { id: "luk", label: "LUK" },
  { id: "hp", label: "HP" },
  { id: "mp", label: "MP" },
  { id: "dfTfPp", label: "DF/TF/PP" },
  { id: "criticalRate", label: "Critical Rate" },
  { id: "criticalDamage", label: "Critical Damage" },
  { id: "ignoreDefense", label: "Ignore Defense" },
  { id: "damage", label: "Damage" },
  { id: "bossDamage", label: "Boss Damage" },
  { id: "normalDamage", label: "Normal Damage" },
  { id: "statusResistance", label: "Status Resistance" },
  { id: "attackMagicAtt", label: "Attack Power & Magic ATT" },
  { id: "expObtained", label: "EXP Obtained" },
  { id: "arcanePower", label: "Arcane Power" },
];

export const HYPER_STAT_MAX_LEVEL = 15;

/** In-game Hyper Stats has 3 swappable presets; each holds a full allocation. */
export const HYPER_STAT_PRESET_COUNT = 3;

/** Strips non-digits and caps the raw input string at the max level. */
export function sanitizeHyperStatInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  const n = Math.min(Number.parseInt(digits, 10), HYPER_STAT_MAX_LEVEL);
  return String(n);
}

/** Parses a raw draft level into a stored level (1–15), or null to omit. */
export function parseStoredHyperStatLevel(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, HYPER_STAT_MAX_LEVEL);
}

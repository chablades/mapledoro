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
  /** Most categories cap at 15; DF/TF/PP/Mana caps at 10 (maplestorywiki.net/w/Hyper_Stats). */
  maxLevel?: number;
}

/** In-game Hyper Stats window order. */
export const HYPER_STAT_CATEGORIES: HyperStatCategoryDef[] = [
  { id: "str", label: "STR" },
  { id: "dex", label: "DEX" },
  { id: "int", label: "INT" },
  { id: "luk", label: "LUK" },
  { id: "hp", label: "HP" },
  { id: "mp", label: "MP" },
  { id: "dfTfPp", label: "DF/TF/PP", maxLevel: 10 },
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

/** Strips non-digits and caps the raw input string at the category's max level. */
export function sanitizeHyperStatInput(raw: string, maxLevel: number = HYPER_STAT_MAX_LEVEL): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  const n = Math.min(Number.parseInt(digits, 10), maxLevel);
  return String(n);
}

// Cumulative point cost to reach each level 1-15, shared by every category
// (maplestorywiki.net/w/Hyper_Stats "point requirement" table).
const HYPER_STAT_LEVEL_COST = [1, 3, 7, 15, 25, 40, 60, 85, 115, 150, 200, 265, 345, 440, 550];

/** Total point cost to reach the given Hyper Stat level (0 for 0 or blank). */
export function hyperStatCost(level: number): number {
  if (level <= 0) return 0;
  return HYPER_STAT_LEVEL_COST[Math.min(level, HYPER_STAT_MAX_LEVEL) - 1] ?? 0;
}

/** Total Hyper Stat points spent across every shown category in a preset. */
export function hyperStatPresetSpent(preset: Record<string, string>, categoryIds: HyperStatCategoryId[]): number {
  return categoryIds.reduce((sum, id) => sum + hyperStatCost(Number.parseInt(preset[id] ?? "", 10) || 0), 0);
}

// Total Hyper Stat points available per character level 140-300, index 0 = level 140
// (maplestorywiki.net/w/Hyper_Stats "point distribution" table).
const HYPER_STAT_BUDGET_BY_LEVEL = [
  3, 6, 9, 12, 15, 18, 21, 24, 27, 30,
  34, 38, 42, 46, 50, 54, 58, 62, 66, 70,
  75, 80, 85, 90, 95, 100, 105, 110, 115, 120,
  126, 132, 138, 144, 150, 156, 162, 168, 174, 180,
  187, 194, 201, 208, 215, 222, 229, 236, 243, 250,
  258, 266, 274, 282, 290, 298, 306, 314, 322, 330,
  339, 348, 357, 366, 375, 384, 393, 402, 411, 420,
  430, 440, 450, 460, 470, 480, 490, 500, 510, 520,
  531, 542, 553, 564, 575, 586, 597, 608, 619, 630,
  642, 654, 666, 678, 690, 702, 714, 726, 738, 750,
  763, 776, 789, 802, 815, 828, 841, 854, 867, 880,
  894, 908, 922, 936, 950, 964, 978, 992, 1006, 1020,
  1035, 1050, 1065, 1080, 1095, 1110, 1125, 1140, 1155, 1170,
  1186, 1202, 1218, 1234, 1250, 1266, 1282, 1298, 1314, 1330,
  1347, 1364, 1381, 1398, 1415, 1432, 1449, 1466, 1483, 1500,
  1518, 1536, 1554, 1572, 1590, 1608, 1626, 1644, 1662, 1680,
  1699,
];

const HYPER_STAT_BUDGET_MIN_LEVEL = 140;
const HYPER_STAT_BUDGET_MAX_LEVEL = 300;

// Undefined level = don't block Continue on an unresolved lookup, same fallback used
// for the eligibility checks (isArcaneEligible etc.) elsewhere in this step.
export function hyperStatBudget(characterLevel: number | undefined): number {
  if (characterLevel === undefined) return Number.POSITIVE_INFINITY;
  const clamped = Math.min(Math.max(characterLevel, HYPER_STAT_BUDGET_MIN_LEVEL), HYPER_STAT_BUDGET_MAX_LEVEL);
  return HYPER_STAT_BUDGET_BY_LEVEL[clamped - HYPER_STAT_BUDGET_MIN_LEVEL];
}

/** Parses a raw draft level into a stored level (1–15), or null to omit. */
export function parseStoredHyperStatLevel(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, HYPER_STAT_MAX_LEVEL);
}

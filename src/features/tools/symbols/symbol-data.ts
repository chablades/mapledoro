/*
  Arcane & Sacred Symbol data for the Symbol Calculator.
  Growth tables, area definitions, and helper functions.
*/

// -- Types --------------------------------------------------------------------

export type SymbolType = "arcane" | "sacred";

export interface SymbolArea {
  name: string;
  itemId: string;
  /** Default daily symbols from quests */
  daily: number;
  /** Default weekly symbols from dungeon content */
  weekly: number;
  /** Name of the weekly activity, if any */
  weeklyActivity: string;
  /** Required character level to access */
  requiredLevel: number;
}

// -- Growth Tables ------------------------------------------------------------

/** Symbols needed to upgrade from level N to N+1 (index 0 = level 1→2). */
export const ARCANE_GROWTH: number[] = [
  12, 15, 20, 27, 36, 47, 60, 75, 92, 111, 132, 155, 180, 207, 236, 267, 300,
  335, 372,
];

/** Symbols needed to upgrade from level N to N+1 (index 0 = level 1→2). */
export const SACRED_GROWTH: number[] = [
  29, 76, 141, 224, 325, 444, 581, 736, 909, 1100,
];

export const ARCANE_MAX_LEVEL = 20;
export const SACRED_MAX_LEVEL = 11;

// -- Area Definitions ---------------------------------------------------------

export const ARCANE_AREAS: SymbolArea[] = [
  {
    name: "Vanishing Journey",
    itemId: "01712001", // Arcane Symbol: Vanishing Journey
    daily: 20,
    weekly: 120,
    weeklyActivity: "Erda Spectrum",
    requiredLevel: 200,
  },
  {
    name: "Chu Chu Island",
    itemId: "01712002", // Arcane Symbol: Chu Chu Island
    daily: 20,
    weekly: 120,
    weeklyActivity: "Hungry Muto",
    requiredLevel: 210,
  },
  {
    name: "Lachelein",
    itemId: "01712003", // Arcane Symbol: Lachelein
    daily: 20,
    weekly: 120,
    weeklyActivity: "Midnight Chaser",
    requiredLevel: 220,
  },
  {
    name: "Arcana",
    itemId: "01712004", // Arcane Symbol: Arcana
    daily: 20,
    weekly: 120,
    weeklyActivity: "Spirit Savior",
    requiredLevel: 225,
  },
  {
    name: "Morass",
    itemId: "01712005", // Arcane Symbol: Morass
    daily: 20,
    weekly: 120,
    weeklyActivity: "Ranheim Defense",
    requiredLevel: 230,
  },
  {
    name: "Esfera",
    itemId: "01712006", // Arcane Symbol: Esfera
    daily: 20,
    weekly: 120,
    weeklyActivity: "Esfera Guardian",
    requiredLevel: 235,
  },
];

export const SACRED_AREAS: SymbolArea[] = [
  {
    name: "Cernium",
    itemId: "01713000", // Sacred Symbol: Cernium
    daily: 20,
    weekly: 0,
    weeklyActivity: "",
    requiredLevel: 260,
  },
  {
    name: "Hotel Arcus",
    itemId: "01713001", // Sacred Symbol: Arcus
    daily: 10,
    weekly: 0,
    weeklyActivity: "",
    requiredLevel: 265,
  },
  {
    name: "Odium",
    itemId: "01713002", // Sacred Symbol: Odium
    daily: 10,
    weekly: 0,
    weeklyActivity: "",
    requiredLevel: 270,
  },
  {
    name: "Shangri-La",
    itemId: "01713003", // Sacred Symbol: Shangri-La
    daily: 10,
    weekly: 0,
    weeklyActivity: "",
    requiredLevel: 275,
  },
  {
    name: "Arteria",
    itemId: "01713004", // Sacred Symbol: Arteria
    daily: 10,
    weekly: 0,
    weeklyActivity: "",
    requiredLevel: 280,
  },
  {
    name: "Carcion",
    itemId: "01713005", // Sacred Symbol: Carcion
    daily: 10,
    weekly: 0,
    weeklyActivity: "",
    requiredLevel: 285,
  },
  {
    name: "Tallahart",
    itemId: "01714000", // Grand Sacred Symbol: Tallahart
    daily: 10,
    weekly: 0,
    weeklyActivity: "",
    requiredLevel: 290,
  },
];

// -- Helpers ------------------------------------------------------------------

/**
 * Symbols remaining from current level + progress to max level.
 * `growth[level - 1]` = symbols needed for level → level+1.
 */
export function symbolsRemaining(
  growth: number[],
  level: number,
  current: number,
): number {
  let total = 0;
  for (let i = level - 1; i < growth.length; i++) {
    total += growth[i];
  }
  return Math.max(0, total - current);
}

/** Symbols consumed (completed levels + current progress). */
export function symbolsConsumed(
  growth: number[],
  level: number,
  current: number,
  maxLevel: number,
): number {
  const total = growth.reduce((a, b) => a + b, 0);
  if (level >= maxLevel) return total;
  return total - symbolsRemaining(growth, level, current);
}

/** Days to max from remaining symbols and daily/weekly income. */
export function daysToMax(
  remaining: number,
  daily: number,
  weekly: number,
): number {
  if (remaining <= 0) return 0;
  const effectiveDaily = daily + weekly / 7;
  if (effectiveDaily <= 0) return Infinity;
  return Math.ceil(remaining / effectiveDaily);
}

/** Symbols needed for the current level upgrade (0 if already maxed). */
export function symbolsForLevel(growth: number[], level: number): number {
  if (level - 1 >= growth.length) return 0;
  return growth[level - 1];
}

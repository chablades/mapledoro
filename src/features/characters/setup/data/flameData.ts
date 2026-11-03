/*
  Flames (Bonus Stats) and Star Force limits for an equipped item.

  Source: maplestorywiki.net/w/Bonus_Stats and its Stat Tables subpage, and
  maplestorywiki.net/w/Star_Force_Enhancement. Every flame table there is the tier times the
  item level band's tier 1 value, so only the tier 1 row per band is kept here. Weapon Attack
  Power / Magic ATT is the one exception: a percentage of the weapon's base attack, from the
  formula the wiki gives.

  "Flame Advantaged" (boss flames) is the game's info/bossReward flag, carried in the equipment
  data as `bossReward`. Those items roll tiers 3 to 7; others roll 1 to 7, and a non-boss
  weapon's attack line stops at tier 5.
*/

export type FlameLineId =
  | "str" | "dex" | "int" | "luk"
  | "strDex" | "strInt" | "strLuk" | "dexInt" | "dexLuk" | "intLuk"
  | "maxHp" | "maxMp" | "defense" | "att" | "matt" | "allStat"
  | "bossDamage" | "damage" | "speed" | "jump" | "reqLevel";

export interface StoredFlameLine {
  line: FlameLineId;
  tier: number;
}

/** What a flame's numbers depend on, read from the item's equipment data. */
export interface FlameItemInfo {
  level: number;
  isWeapon: boolean;
  bossReward: boolean;
  baseAtt: number;
  baseMatt: number;
}

/** Tier 1 value per level band, banded by the lower bound of each band. */
interface BandTable { from: number[]; tier1: number[] }

const SINGLE_STAT: BandTable = {
  from: [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 230],
  tier1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};
const DOUBLE_STAT: BandTable = {
  from: [0, 40, 80, 120, 160, 200, 250],
  tier1: [1, 2, 3, 4, 5, 6, 7],
};
// 3 per level band of 10 below 10, then 30 per band to 200, then 20 per band.
const HP_MP: BandTable = {
  from: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250],
  tier1: [3, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 620, 640, 660, 680, 700],
};
// Weapon attack's level multiplier, the same bands as the double stats.
const WEAPON_ATT_BAND = DOUBLE_STAT;

function band(table: BandTable, level: number): number {
  let i = 0;
  while (i + 1 < table.from.length && level >= table.from[i + 1]!) i++;
  return table.tier1[i]!;
}

interface LineDef { label: string; percent?: boolean; weaponOnly?: boolean; armorOnly?: boolean; tier1: (item: FlameItemInfo) => number }

const flat = (value: number) => () => value;
const banded = (table: BandTable) => (item: FlameItemInfo) => band(table, item.level);

export const FLAME_LINES: Record<FlameLineId, LineDef> = {
  str: { label: "STR", tier1: banded(SINGLE_STAT) },
  dex: { label: "DEX", tier1: banded(SINGLE_STAT) },
  int: { label: "INT", tier1: banded(SINGLE_STAT) },
  luk: { label: "LUK", tier1: banded(SINGLE_STAT) },
  strDex: { label: "STR + DEX", tier1: banded(DOUBLE_STAT) },
  strInt: { label: "STR + INT", tier1: banded(DOUBLE_STAT) },
  strLuk: { label: "STR + LUK", tier1: banded(DOUBLE_STAT) },
  dexInt: { label: "DEX + INT", tier1: banded(DOUBLE_STAT) },
  dexLuk: { label: "DEX + LUK", tier1: banded(DOUBLE_STAT) },
  intLuk: { label: "INT + LUK", tier1: banded(DOUBLE_STAT) },
  maxHp: { label: "Max HP", tier1: banded(HP_MP) },
  maxMp: { label: "Max MP", tier1: banded(HP_MP) },
  defense: { label: "Defense", tier1: banded(SINGLE_STAT) },
  att: { label: "Attack Power", tier1: flat(1) },
  matt: { label: "Magic ATT", tier1: flat(1) },
  allStat: { label: "All Stat", percent: true, tier1: flat(1) },
  bossDamage: { label: "Boss Damage", percent: true, weaponOnly: true, tier1: flat(2) },
  damage: { label: "Damage", percent: true, weaponOnly: true, tier1: flat(1) },
  speed: { label: "Speed", armorOnly: true, tier1: flat(1) },
  jump: { label: "Jump", armorOnly: true, tier1: flat(1) },
  reqLevel: { label: "Required Level", tier1: flat(5) },
};

export const FLAME_LINE_ORDER = Object.keys(FLAME_LINES) as FlameLineId[];
export const MAX_FLAME_LINES = 4;

/** A weapon's attack flame: its base attack times (level band x tier x 1.1^(tier - k)) %, with k
 *  1 normally and 3 on Flame Advantaged weapons. Rounded up. */
function weaponAttack(item: FlameItemInfo, base: number, tier: number): number {
  const exponent = tier - (item.bossReward ? 3 : 1);
  const percent = band(WEAPON_ATT_BAND, item.level) * tier * 1.1 ** exponent;
  return Math.ceil((base * percent) / 100);
}

export function flameValue(line: FlameLineId, tier: number, item: FlameItemInfo): number {
  if (item.isWeapon && (line === "att" || line === "matt")) {
    return weaponAttack(item, line === "att" ? item.baseAtt : item.baseMatt, tier);
  }
  return FLAME_LINES[line].tier1(item) * tier;
}

export function formatFlameValue(line: FlameLineId, value: number): string {
  if (line === "reqLevel") return `-${value}`;
  return FLAME_LINES[line].percent ? `+${value}%` : `+${value}`;
}

/** The tiers this item can roll for a line. */
export function flameTiers(line: FlameLineId, item: FlameItemInfo): number[] {
  const low = item.bossReward ? 3 : 1;
  const high = item.isWeapon && !item.bossReward && (line === "att" || line === "matt") ? 5 : 7;
  return Array.from({ length: high - low + 1 }, (_, i) => low + i);
}

/** The lines this item can roll: weapons get Boss Damage and Damage, everything else Speed and Jump. */
export function flameLinesFor(item: FlameItemInfo): FlameLineId[] {
  return FLAME_LINE_ORDER.filter((id) => (item.isWeapon ? !FLAME_LINES[id].armorOnly : !FLAME_LINES[id].weaponOnly));
}

/** The stats a line adds, for the total row: the double stats count toward both of their stats. */
export function flameContributions(line: FlameLineId, value: number): [string, number][] {
  const pairs: Partial<Record<FlameLineId, [string, string]>> = {
    strDex: ["STR", "DEX"], strInt: ["STR", "INT"], strLuk: ["STR", "LUK"],
    dexInt: ["DEX", "INT"], dexLuk: ["DEX", "LUK"], intLuk: ["INT", "LUK"],
  };
  const pair = pairs[line];
  return pair ? [[pair[0], value], [pair[1], value]] : [[FLAME_LINES[line].label, value]];
}

// ── Which items take flames and Star Force ──────────────────────────────────

// Grid slots that roll flames. Rings, shoulders, medals, badges, emblems, secondaries, androids,
// hearts and totems don't, apart from the items below.
const FLAME_SLOTS = new Set([
  "weapon", "hat", "top", "bottom", "shoe", "glove", "cape",
  "face", "eye", "earring", "pendant1", "pendant2", "belt", "pocket",
]);
const FLAME_EXCEPTIONS = new Set([
  "01143471", // Immortal Legacy (medal)
  "01152155", // Scarlet Shoulder
  "01202287", // Ancient Slate Replica (totem)
]);

export function canFlame(slot: string, id: string): boolean {
  return FLAME_SLOTS.has(slot) || FLAME_EXCEPTIONS.has(id);
}

// Star Force cap by required level, with the Superior sets and a few named items capped lower.
const STAR_FORCE_BY_LEVEL: [number, number][] = [[138, 30], [128, 20], [118, 15], [108, 10], [95, 8], [0, 5]];
const STAR_FORCE_BY_NAME: [RegExp, number][] = [
  [/^Tyrant /, 15], [/^Nova /, 8], [/^Elite Heliseum /, 3],
  [/^Sweetwater (Shoes|Gloves|Cape)\b/, 15],
  [/^Ghost Ship Exorcist\b/, 22], [/^Sengoku Hakase Badge\b/, 22],
];

/** The most stars this item can hold, or 0 when it can't take Star Force (no upgrade slots and
 *  not one of the named badges). */
export function maxStarForce(name: string, level: number, upgradeSlots: number): number {
  const named = STAR_FORCE_BY_NAME.find(([pattern]) => pattern.test(name));
  if (named) return named[1];
  if (upgradeSlots <= 0) return 0;
  return STAR_FORCE_BY_LEVEL.find(([from]) => level >= from)?.[1] ?? 5;
}

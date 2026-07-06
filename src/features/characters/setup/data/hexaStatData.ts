// Stat type options and per-level bonus tables for the HEXA Stat system.
// Source: https://maplestorywiki.net/w/HEXA_Matrix#HEXA_Stats
// Primary = main stat slot bonus. Additional = alt stat slot bonus.
// Main Stat note: Xenon gets all-stat variant (×0.048 per point); DA gets Max HP instead.

export type HexaStatType =
  | "mainStat"
  | "attackPower"
  | "damage"
  | "bossDamage"
  | "ignoreDefense"
  | "criticalDamage";

// ── HEXA Stat node model ──────────────────────────────────────────────────────
// HEXA Stat is its own progression system, stored separately from the 6th-job
// HEXA Skills calculator data (per-character tool key "hexaStat", not "hexaSkills").

export interface HexaStatEntry {
  type: string;
  level: number;
}
export interface HexaStatSlot {
  main: HexaStatEntry;
  alt: [HexaStatEntry, HexaStatEntry];
}
/**
 * A single HEXA Stat node (Hexa Stat I/II/III). In-game each node holds two
 * independent presets — Active and Stored — with its own active selection.
 * {@link activePreset} is 0 (Active) or 1 (Stored).
 */
export interface HexaStatNode {
  presets: [HexaStatSlot, HexaStatSlot];
  activePreset: number;
}

/** True if any preset of any node has a chosen stat type or a non-zero level. */
export function hexaStatHasData(nodes: HexaStatNode[]): boolean {
  const slotHasData = (s: HexaStatSlot): boolean =>
    !!s.main.type || s.main.level > 0 || s.alt.some((a) => !!a.type || a.level > 0);
  return nodes.some((n) => n.presets.some(slotHasData));
}

/** Labels for the two dynamic options — pass the result of getMainStatLabel / getAttackLabel. */
export const HEXA_STAT_OPTIONS: { value: HexaStatType; label: string }[] = [
  { value: "mainStat",       label: "Main Stat" },   // replaced at render time
  { value: "attackPower",    label: "Attack" },       // replaced at render time
  { value: "damage",         label: "Damage" },
  { value: "bossDamage",     label: "Boss Damage" },
  { value: "ignoreDefense",  label: "Ignore Defense" },
  { value: "criticalDamage", label: "Critical Damage" },
];

// Indexed by [level - 1], levels 1–10
const PRIMARY: Record<HexaStatType, number[]> = {
  mainStat:       [100, 200, 300, 400, 600, 800, 1000, 1300, 1600, 2000],
  attackPower:    [5, 10, 15, 20, 30, 40, 50, 65, 80, 100],
  damage:         [0.75, 1.5, 2.25, 3, 4.5, 6, 7.5, 9.75, 12, 15],
  bossDamage:     [1, 2, 3, 4, 6, 8, 10, 13, 16, 20],
  ignoreDefense:  [1, 2, 3, 4, 6, 8, 10, 13, 16, 20],
  criticalDamage: [0.35, 0.7, 1.05, 1.4, 2.1, 2.8, 3.5, 4.55, 5.6, 7],
};

const ADDITIONAL: Record<HexaStatType, number[]> = {
  mainStat:       [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
  attackPower:    [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  damage:         [0.75, 1.5, 2.25, 3, 3.75, 4.5, 5.25, 6, 6.75, 7.5],
  bossDamage:     [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  ignoreDefense:  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  criticalDamage: [0.35, 0.7, 1.05, 1.4, 1.75, 2.1, 2.45, 2.8, 3.15, 3.5],
};

const IS_PERCENT = new Set<HexaStatType>(["damage", "bossDamage", "ignoreDefense", "criticalDamage"]);

const STAT_LABEL_MAP: Record<string, string> = { str: "STR", dex: "DEX", int: "INT", luk: "LUK", hp: "Max HP" };

/**
 * Returns the class-specific label for the "Main Stat" dropdown option.
 * Xenon needs a classId check since their primaryStat is "str" despite using All Stats.
 */
export function getMainStatLabel(classId: string, primaryStat: string): string {
  if (classId === "xenon") return "All Stats";
  return STAT_LABEL_MAP[primaryStat] ?? "Main Stat";
}

/** Returns "Magic ATT" for INT-based classes, "Attack" for all others. */
export function getAttackLabel(primaryStat: string): string {
  return primaryStat === "int" ? "Magic ATT" : "Attack";
}

/**
 * Returns the formatted bonus string for a stat entry (e.g. "+1000", "+7%"), or "" if level is 0 or type is unset.
 * Pass classId for Xenon ("All Stats" ×0.48) and Demon Avenger ("Max HP" ×21) Main Stat variants.
 */
export function getHexaStatBonus(type: string, level: number, isPrimary: boolean, classId?: string): string {
  if (!type || level <= 0) return "";
  const table = isPrimary ? PRIMARY : ADDITIONAL;
  const values = table[type as HexaStatType];
  if (!values) return "";
  const value = values[level - 1];
  if (value === undefined) return "";

  if (type === "mainStat" && classId) {
    if (classId === "xenon") return `+${Math.round(value * 0.48)} All Stats`;
    if (classId === "demon_avenger") return `+${value * 21} Max HP`;
  }

  return IS_PERCENT.has(type as HexaStatType) ? `+${value.toFixed(2)}%` : `+${value}`;
}

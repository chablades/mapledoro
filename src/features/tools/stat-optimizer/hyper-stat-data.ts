/*
  Damage-relevant Hyper Stat data, matching maplescouter's optimizer tables
  (chunk 8393 module 6182: tD/ve value tables, hR step costs) — which in turn
  match maplestorywiki.net. Per-level effect is cumulative value at level L
  (index L-1). Boss Damage and Critical Rate are non-linear; Demon Avenger's
  main line is HP% (2%/level) instead of flat stat. Excluded as irrelevant to
  damage either way: EXP, Status Resistance, HP/MP, class-resource stats,
  Arcane Power.

  Normal Damage is scouter's one omission (they only optimize bossing) rather
  than a table of theirs: +3%/level, the same curve the Damage line runs, which
  is exactly why mobbing wants points in both — the step-cost curve is per line,
  so two lines at 8 buy more percent than one line at 15.
*/

import type { OptimizeTarget } from "./damage-formula";

export type HyperLineId =
  | "mainStat"
  | "subStat"
  | "subStat2"
  | "attack"
  | "bossDamage"
  | "damage"
  | "normalDamage"
  | "critDamage"
  | "critRate"
  | "ignoreDefense";

export const HYPER_MAX_LEVEL = 15;

const linear = (perLevel: number): number[] =>
  Array.from({ length: HYPER_MAX_LEVEL }, (_, i) => perLevel * (i + 1));

interface HyperLineDef {
  id: HyperLineId;
  label: string;
  /** "%" for percent-point stats, "flat" for stat/attack additions. */
  unit: "flat" | "percent";
  /** Cumulative value at level L, indexed [L - 1]. */
  values: number[];
}

/**
 * Every line either target can assign, in maplescouter's exact iteration order
 * (their S1/qX lists) with Normal Damage inserted after the Damage line it
 * mirrors. subStat2 only applies to classes with a second secondary stat (Dual
 * Blade, Shadower, Cadena, Xenon); the engine filters it out for everyone else.
 * Which of these a run actually considers is HYPER_TARGET_LINES below —
 * the bossing set is scouter's list, untouched.
 */
export const HYPER_LINES: HyperLineDef[] = [
  { id: "mainStat", label: "Main Stat", unit: "flat", values: linear(30) },
  { id: "subStat", label: "Secondary Stat", unit: "flat", values: linear(30) },
  { id: "subStat2", label: "Secondary Stat II", unit: "flat", values: linear(30) },
  { id: "attack", label: "ATT / Magic ATT", unit: "flat", values: linear(3) },
  { id: "bossDamage", label: "Boss Damage", unit: "percent", values: [3, 6, 9, 12, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55] },
  { id: "damage", label: "Damage", unit: "percent", values: linear(3) },
  { id: "normalDamage", label: "Normal Damage", unit: "percent", values: linear(3) },
  { id: "critDamage", label: "Critical Damage", unit: "percent", values: linear(1) },
  { id: "critRate", label: "Critical Rate", unit: "percent", values: [1, 2, 3, 4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25] },
  { id: "ignoreDefense", label: "Ignore Defense", unit: "percent", values: linear(3) },
];

/**
 * Lines each target's greedy may spend on, in HYPER_LINES order (which the
 * engine's tie-breaking depends on). Anything left out is also zeroed when the
 * stored preset is read, so it is neither stripped from the baseline nor shown.
 * Mobbing drops Boss Damage and Ignore Defense (neither does anything to a
 * normal mob) and picks up Normal Damage in their place.
 */
export const HYPER_TARGET_LINES: Record<OptimizeTarget, HyperLineId[]> = {
  bossing: ["mainStat", "subStat", "subStat2", "attack", "bossDamage", "damage", "critDamage", "critRate", "ignoreDefense"],
  mobbing: ["mainStat", "subStat", "subStat2", "attack", "damage", "normalDamage", "critDamage", "critRate"],
};

export const HYPER_VALUES: Record<HyperLineId, number[]> = Object.fromEntries(
  HYPER_LINES.map((line) => [line.id, line.values]),
) as Record<HyperLineId, number[]>;

/** Demon Avenger's main line grants HP% instead of flat stat (scouter's ve table). */
export const HYPER_DA_MAIN_VALUES: number[] = linear(2);

/** Incremental point cost to go from level L-1 to L, indexed [L] (index 0 unused). */
export const HYPER_STEP_COSTS = [0, 1, 2, 4, 8, 10, 15, 20, 25, 30, 35, 50, 65, 80, 95, 110];

/** Cumulative hyper-stat points to reach level L, indexed [L - 1]. Shared by every stat. */
export const HYPER_COST_CUMULATIVE = [1, 3, 7, 15, 25, 40, 60, 85, 115, 150, 200, 265, 345, 440, 550];

/**
 * Total hyper-stat points available at a character level — scouter's closed
 * form, which matches the in-game accrual (3/level in the 140s rising by 1
 * each decade; 1699 total at level 300).
 */
export function availableHyperPoints(level: number): number {
  const lv = Math.min(Math.max(Math.floor(level), 0), 300);
  if (lv < 140) return 0;
  const l = (lv - (lv % 10)) / 10 - 14;
  return l * (l + 5) * 5 + (3 + l) + (lv % 10) * (l + 3);
}

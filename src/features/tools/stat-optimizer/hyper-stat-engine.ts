/*
  Hyper Stat optimizer — an exact port of maplescouter's greedy (hyper-only path
  of their optimizer's main loop). Scouter only optimizes bossing; the mobbing
  target runs the same greedy over a different candidate set (HYPER_TARGET_LINES)
  with the kernel's boss-only terms switched off (see OptimizeTarget).

  - Candidate lines and iteration order are scouter's S1/qX lists (main stat,
    secondary stat, secondary II for the 4 dual-secondary classes, ATT, boss,
    damage, crit damage, crit rate, ignore DEF).
  - Each step scores +1 level on each line as
    0.998 * (gain / stepCost) + 0.002 * gain, with heuristic discounts of
    x0.9 on Ignore DEF and x0.5 on the secondary stat line, and takes the
    best affordable line (cap 15). Gains are evaluated with the full kernel.
  - The character's stored stats are displayed totals that already include the
    current allocation, so the current allocation is stripped via negative
    kernel deltas (Demon Avenger keeps scouter's exact quirk of stripping the
    HP% line from both the % and x21 flat buckets).
  - If the greedy result scores below the current allocation, the current one
    is kept and the gain reported as 0 (`alreadyOptimal`), like the live site.
*/

import {
  computeScouterDamage,
  stackIedSources,
  zeroDelta,
  type ClassDamageProfile,
  type KernelCalibration,
  type KernelDelta,
  type OptimizerStatInputs,
  type OptimizeTarget,
} from "./damage-formula";
import type { StoredHyperStat } from "../../characters/model/charactersStore";
import {
  HYPER_COST_CUMULATIVE,
  HYPER_DA_MAIN_VALUES,
  HYPER_LINES,
  HYPER_MAX_LEVEL,
  HYPER_STEP_COSTS,
  HYPER_TARGET_LINES,
  HYPER_VALUES,
  type HyperLineId,
} from "./hyper-stat-data";

export type HyperAllocation = Record<HyperLineId, number>;

export interface HyperResult {
  allocation: HyperAllocation;
  /** What `allocation` costs, which is what the panel's counter reports. */
  pointsUsed: number;
  pointsAvailable: number;
  /** True when the current allocation beat the greedy result (kept as-is). */
  alreadyOptimal: boolean;
  /** Percent damage gain of the recommended allocation over the current one. */
  gainPct: number;
}

export const zeroHyperAllocation = (): HyperAllocation => ({
  mainStat: 0,
  subStat: 0,
  subStat2: 0,
  attack: 0,
  bossDamage: 0,
  damage: 0,
  normalDamage: 0,
  critDamage: 0,
  critRate: 0,
  ignoreDefense: 0,
});

/** Total hyper points an allocation spends. */
export function hyperAllocationCost(alloc: HyperAllocation): number {
  let total = 0;
  for (const line of HYPER_LINES) {
    const level = alloc[line.id];
    if (level > 0) total += HYPER_COST_CUMULATIVE[Math.min(level, HYPER_MAX_LEVEL) - 1];
  }
  return total;
}

/** Highest level at or below `desired` that fits in `budget` points (0 if none does). */
export function capHyperLevelToBudget(desired: number, budget: number): number {
  const wanted = Math.min(Math.max(Math.floor(desired), 0), HYPER_MAX_LEVEL);
  for (let level = wanted; level > 0; level -= 1) {
    if (HYPER_COST_CUMULATIVE[level - 1] <= budget) return level;
  }
  return 0;
}

/** Preset key in the character store's hyper allocation for each line. */
function presetKey(id: HyperLineId, profile: ClassDamageProfile): string | null {
  switch (id) {
    case "mainStat":
      return profile.mainStat;
    case "subStat":
      return profile.subStat;
    case "subStat2":
      return profile.subStat2;
    case "attack":
      return "attackMagicAtt";
    case "bossDamage":
      return "bossDamage";
    case "damage":
      return "damage";
    case "normalDamage":
      return "normalDamage";
    case "critDamage":
      return "criticalDamage";
    case "critRate":
      return "criticalRate";
    case "ignoreDefense":
      return "ignoreDefense";
  }
}

/** Reads one preset of a stored hyper allocation into the optimizer's line levels.
 *  Lines the target doesn't assign stay 0, so they are neither stripped from the
 *  damage baseline nor counted as spend the recommendation has to preserve. */
export function mapStoredHyper(
  stored: StoredHyperStat | undefined,
  profile: ClassDamageProfile,
  target: OptimizeTarget,
  presetIndex: number,
): HyperAllocation {
  const preset = stored?.presets?.[presetIndex] ?? {};
  const alloc = zeroHyperAllocation();
  for (const id of HYPER_TARGET_LINES[target]) {
    const key = presetKey(id, profile);
    const n = key ? Math.floor(Number(preset[key] ?? 0)) : 0;
    alloc[id] = Number.isFinite(n) ? Math.min(Math.max(n, 0), HYPER_MAX_LEVEL) : 0;
  }
  return alloc;
}

/** Cumulative value a line grants at a level (Demon Avenger main line is HP%). */
function lineValue(id: HyperLineId, level: number, isHpBased: boolean): number {
  if (level <= 0) return 0;
  if (id === "mainStat" && isHpBased) return HYPER_DA_MAIN_VALUES[level - 1];
  return HYPER_VALUES[id][level - 1];
}

/** Kernel delta for an allocation's values plus the stripped current allocation. */
function buildDelta(
  alloc: HyperAllocation,
  current: HyperAllocation,
  isHpBased: boolean,
): KernelDelta {
  const d = zeroDelta();
  const v = (id: HyperLineId, a: HyperAllocation): number => lineValue(id, a[id], isHpBased);
  if (isHpBased) {
    // Scouter's DA quirk: the candidate HP% line lands in the % bucket, while the
    // stripped current line is removed from BOTH the % and the x21 flat buckets.
    d.mainPct = v("mainStat", alloc) - v("mainStat", current);
    d.mainFlat = 21 * -v("mainStat", current);
  } else {
    d.mainFlat = v("mainStat", alloc) - v("mainStat", current);
  }
  d.subFlat = v("subStat", alloc) - v("subStat", current);
  d.sub2Flat = v("subStat2", alloc) - v("subStat2", current);
  d.atk = v("attack", alloc) - v("attack", current);
  d.bossDmg = v("bossDamage", alloc) - v("bossDamage", current);
  // Normal Damage rides the damage bucket, which is where the game puts it — and
  // where the panel's Normal Enemy Damage % field already lands.
  d.dmg =
    v("damage", alloc) + v("normalDamage", alloc) - v("damage", current) - v("normalDamage", current);
  d.critDmg = v("critDamage", alloc) - v("critDamage", current);
  d.critRate = v("critRate", alloc) - v("critRate", current);
  d.ied = stackIedSources(v("ignoreDefense", alloc));
  d.iedStrip = -stackIedSources(v("ignoreDefense", current));
  return d;
}

/** Greedy weight on gain-per-point; the remainder weights raw gain (scouter's 0.998/0.002). */
const GAIN_PER_POINT_WEIGHT = 0.998;

/**
 * Scouter's greedy step: score +1 level on every line as
 * 0.998*(gain/stepCost) + 0.002*gain (x0.9 ignore DEF, x0.5 secondary stat)
 * and return the best affordable line, or null when none qualifies.
 */
function bestStep(
  alloc: HyperAllocation,
  lineIds: HyperLineId[],
  remaining: number,
  score: (alloc: HyperAllocation) => number,
): HyperLineId | null {
  const base = score(alloc);
  let best = -Infinity;
  let pick: HyperLineId | null = null;
  for (const id of lineIds) {
    const level = alloc[id];
    if (level >= HYPER_MAX_LEVEL) continue;
    const stepCost = HYPER_STEP_COSTS[level + 1];
    const trial = { ...alloc, [id]: level + 1 };
    const gain = score(trial) / base - 1;
    let h = (gain / stepCost) * GAIN_PER_POINT_WEIGHT + (1 - GAIN_PER_POINT_WEIGHT) * gain;
    if (id === "ignoreDefense") h *= 0.9;
    if (id === "subStat") h *= 0.5;
    if (h > best && remaining >= stepCost && h > 0) {
      best = h;
      pick = id;
    }
  }
  return pick;
}

export interface OptimizeHyperInput {
  profile: ClassDamageProfile;
  inputs: OptimizerStatInputs;
  currentHyper: HyperAllocation;
  availablePoints: number;
  target: OptimizeTarget;
  bossPdrPct: number;
  calibration: KernelCalibration;
}

export function optimizeHyper({
  profile,
  inputs,
  currentHyper,
  availablePoints,
  target,
  bossPdrPct,
  calibration,
}: OptimizeHyperInput): HyperResult {
  const opts = { target, bossPdrPct, forceFullCrit: false, calibration };
  const score = (alloc: HyperAllocation): number =>
    computeScouterDamage(profile, inputs, buildDelta(alloc, currentHyper, profile.isHpBased), opts);

  const lineIds = HYPER_TARGET_LINES[target].filter(
    (id) => id !== "subStat2" || profile.subStat2 !== null,
  );

  const alloc = zeroHyperAllocation();
  let remaining = availablePoints;
  for (;;) {
    const pick = bestStep(alloc, lineIds, remaining, score);
    if (pick === null || remaining - HYPER_STEP_COSTS[alloc[pick] + 1] < 0) break;
    remaining -= HYPER_STEP_COSTS[alloc[pick] + 1];
    alloc[pick] += 1;
  }

  const currentDamage = score(currentHyper);
  const optimizedDamage = score(alloc);
  if (currentDamage > optimizedDamage) {
    return {
      allocation: currentHyper,
      // The greedy's spend would be a figure for an allocation we just discarded.
      pointsUsed: hyperAllocationCost(currentHyper),
      pointsAvailable: availablePoints,
      alreadyOptimal: true,
      gainPct: 0,
    };
  }
  return {
    allocation: alloc,
    pointsUsed: availablePoints - remaining,
    pointsAvailable: availablePoints,
    alreadyOptimal: false,
    gainPct: currentDamage > 0 ? (optimizedDamage / currentDamage - 1) * 100 : 0,
  };
}

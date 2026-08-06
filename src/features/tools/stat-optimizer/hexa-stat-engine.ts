/*
  HEXA Stat bossing optimizer — an exact port of maplescouter's algorithm
  (their async `G` in the optimizer page chunk):

  - Every line keeps its player-rolled level; only the stat TYPE on each line
    is re-assigned. All six types are candidates.
  - The current lines' values are stripped from the displayed totals into a
    running delta, then lines from all cores are re-assigned greedily in
    scouter's order: sorted by the line's Boss Damage value at its level
    (primary table for primary lines), descending, additional lines before
    primary lines on ties.
  - Each line takes the type with the highest full-kernel damage, subject to
    the cross-core rules: a type sits on at most 1 primary line and at most 2
    additional lines overall, and at most once within a core. Crit rate is
    forced to 100% during HEXA evaluations, exactly like the live site.
  - If the greedy result does not beat the current assignment, the current one
    is kept and the gain reported as 0 (`alreadyOptimal`) — this is scouter's
    "already optimized" case (its greedy is not exhaustive, so a globally
    optimal current setup lands here).
  - Xenon: candidate evaluations convert the accumulated main-stat delta to
    0.48x All Stats; the final gain evaluation skips that conversion, faithfully
    reproducing the live site (including that inconsistency).
*/

import { getHexaStatValue, type HexaStatType } from "../../characters/setup/data/hexaStatData";
import {
  computeScouterDamage,
  stackIedSources,
  zeroDelta,
  type ClassDamageProfile,
  type KernelCalibration,
  type KernelDelta,
  type OptimizerStatInputs,
} from "./damage-formula";

export const HEXA_CORE_COUNT = 3;
export const HEXA_MAX_LINE_LEVEL = 10;
/** A fully-enhanced core spreads this many levels across its three lines. */
export const HEXA_CORE_TOTAL = 20;

/**
 * Highest level at or below `desired` that keeps a core's three lines within
 * `HEXA_CORE_TOTAL`. Scouter enforces the same rule by refusing to optimize at
 * all when `main + additional1 + additional2 > 20`; capping the input instead
 * keeps the recommendation live while staying inside what the game can roll.
 */
export function capHexaLineLevel(desired: number, otherLinesTotal: number): number {
  const wanted = Math.min(Math.max(Math.floor(desired), 0), HEXA_MAX_LINE_LEVEL);
  return Math.min(wanted, Math.max(0, HEXA_CORE_TOTAL - otherLinesTotal));
}

/** Scouter's exact candidate iteration order (ties go to the earliest). */
const TYPE_ORDER: HexaStatType[] = [
  "mainStat",
  "attackPower",
  "bossDamage",
  "criticalDamage",
  "damage",
  "ignoreDefense",
];

export interface HexaLine {
  type: HexaStatType | "";
  level: number;
}

export interface HexaCore {
  unlocked: boolean;
  primary: HexaLine;
  additional: [HexaLine, HexaLine];
}

/** A recommended stat type per line for one core (levels stay as the core's). */
export interface HexaCoreRecommendation {
  primary: HexaStatType | "";
  additional: [HexaStatType | "", HexaStatType | ""];
}

export interface HexaResult {
  /** One recommendation per unlocked core, in core order. */
  cores: HexaCoreRecommendation[];
  /** True when the current assignment beat the greedy result (kept as-is). */
  alreadyOptimal: boolean;
  /** Percent damage gain of the recommended assignment over the current one. */
  gainPct: number;
}

type TypeTally = Record<HexaStatType, number>;

const zeroTally = (): TypeTally => ({
  mainStat: 0,
  attackPower: 0,
  damage: 0,
  bossDamage: 0,
  ignoreDefense: 0,
  criticalDamage: 0,
});

/** One assignable line: which core/slot it is, its fixed level, primary or not. */
interface AssignableLine {
  coreIndex: number;
  slot: "primary" | "alt0" | "alt1";
  level: number;
  isPrimary: boolean;
  sortValue: number;
}

/** Converts the accumulated type deltas into a kernel delta for one evaluation. */
function toKernelDelta(acc: TypeTally, profile: ClassDamageProfile, convertXenon: boolean): KernelDelta {
  const d = zeroDelta();
  if (profile.isXenon && convertXenon) {
    const all = 0.48 * acc.mainStat;
    d.mainFlat = all;
    d.subFlat = all;
    d.sub2Flat = all;
  } else if (profile.isHpBased) {
    d.mainFlat = 21 * acc.mainStat;
  } else {
    d.mainFlat = acc.mainStat;
  }
  d.atk = acc.attackPower;
  d.bossDmg = acc.bossDamage;
  d.dmg = acc.damage;
  d.critDmg = acc.criticalDamage;
  d.ied = stackIedSources(acc.ignoreDefense);
  return d;
}

export interface OptimizeHexaInput {
  profile: ClassDamageProfile;
  inputs: OptimizerStatInputs;
  cores: HexaCore[];
  bossPdrPct: number;
  calibration: KernelCalibration;
}

/** Assignable lines from the unlocked cores, in scouter's order: Boss Damage
 *  value at the line's level descending, additional-before-primary on ties. */
function buildAssignableLines(unlocked: HexaCore[]): AssignableLine[] {
  const lines: AssignableLine[] = [];
  unlocked.forEach((core, k) => {
    const anyLevel = core.primary.level > 0 || core.additional[0].level > 0 || core.additional[1].level > 0;
    if (k > 0 && !anyLevel) return;
    lines.push(
      { coreIndex: k, slot: "primary", level: core.primary.level, isPrimary: true, sortValue: getHexaStatValue("bossDamage", core.primary.level, true) },
      { coreIndex: k, slot: "alt0", level: core.additional[0].level, isPrimary: false, sortValue: getHexaStatValue("bossDamage", core.additional[0].level, false) },
      { coreIndex: k, slot: "alt1", level: core.additional[1].level, isPrimary: false, sortValue: getHexaStatValue("bossDamage", core.additional[1].level, false) },
    );
  });
  lines.sort((a, b) => {
    if (a.sortValue !== b.sortValue) return b.sortValue - a.sortValue;
    if (!a.isPrimary && b.isPrimary) return -1;
    if (a.isPrimary && !b.isPrimary) return 1;
    return 0;
  });
  return lines;
}

interface GreedyState {
  acc: TypeTally;
  primaryUse: TypeTally;
  additionalUse: TypeTally;
  coreUse: TypeTally[];
}

/** The type with the highest full-kernel damage this line may legally take. */
function bestTypeForLine(
  line: AssignableLine,
  state: GreedyState,
  evalAcc: (acc: TypeTally) => number,
): HexaStatType | "" {
  let bestDamage = 0;
  let bestType: HexaStatType | "" = "";
  for (const type of TYPE_ORDER) {
    if (line.isPrimary && state.primaryUse[type] > 0) continue;
    if (!line.isPrimary && state.additionalUse[type] > 1) continue;
    if (state.coreUse[line.coreIndex][type] > 0) continue;
    const trial = { ...state.acc };
    trial[type] += getHexaStatValue(type, line.level, line.isPrimary);
    const damage = evalAcc(trial);
    if (damage > bestDamage) {
      bestDamage = damage;
      bestType = type;
    }
  }
  return bestType;
}

export function optimizeHexa({ profile, inputs, cores, bossPdrPct, calibration }: OptimizeHexaInput): HexaResult {
  // HEXA Stat is a bossing decision only, so it has no mobbing target to take.
  const opts = { target: "bossing" as const, bossPdrPct, forceFullCrit: true, calibration };
  const evalAcc = (acc: TypeTally, convertXenon: boolean): number =>
    computeScouterDamage(profile, inputs, toKernelDelta(acc, profile, convertXenon), opts);

  const unlocked = cores.filter((core) => core.unlocked);

  const currentDamage = evalAcc(zeroTally(), true);

  // Strip every current line's value from the displayed totals.
  const acc = zeroTally();
  const stripLine = (line: HexaLine, isPrimary: boolean): void => {
    if (!line.type) return;
    acc[line.type] -= getHexaStatValue(line.type, line.level, isPrimary);
  };
  for (const core of unlocked) {
    stripLine(core.primary, true);
    stripLine(core.additional[0], false);
    stripLine(core.additional[1], false);
  }

  const lines = buildAssignableLines(unlocked);
  const state: GreedyState = {
    acc,
    primaryUse: zeroTally(),
    additionalUse: zeroTally(),
    coreUse: unlocked.map(() => zeroTally()),
  };
  const picks: HexaCoreRecommendation[] = unlocked.map((core) => ({
    primary: core.primary.type,
    additional: [core.additional[0].type, core.additional[1].type],
  }));

  for (const line of lines) {
    const bestType = bestTypeForLine(line, state, (a) => evalAcc(a, true));
    // With six candidates and three cores every line always finds a type, but
    // guard anyway so an impossible pick can't corrupt the tallies.
    if (!bestType) continue;
    if (line.isPrimary) state.primaryUse[bestType] += 1;
    else state.additionalUse[bestType] += 1;
    state.coreUse[line.coreIndex][bestType] += 1;
    acc[bestType] += getHexaStatValue(bestType, line.level, line.isPrimary);
    const target = picks[line.coreIndex];
    if (line.slot === "primary") target.primary = bestType;
    else target.additional[line.slot === "alt0" ? 0 : 1] = bestType;
  }

  // Final evaluation: like the live site, Xenon's All-Stat conversion is NOT
  // applied here (only in the per-line candidate evaluations above).
  const optimizedDamage = evalAcc(acc, false);
  const gainPct = currentDamage > 0 ? (optimizedDamage / currentDamage - 1) * 100 : 0;

  if (gainPct <= 0) {
    return {
      cores: unlocked.map((core) => ({
        primary: core.primary.type,
        additional: [core.additional[0].type, core.additional[1].type],
      })),
      alreadyOptimal: true,
      gainPct: 0,
    };
  }
  return { cores: picks, alreadyOptimal: false, gainPct };
}

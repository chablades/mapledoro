import { MIN_EXP_LEVEL, expForLevel, percentOfLevel } from "../../tools/exp-calculator/exp-calculator-data";
import type { StoredCharacterRecord } from "./charactersStore";

export function isExpTrackingAvailable(level: number): boolean {
  return level >= MIN_EXP_LEVEL;
}

/** Character-facing EXP percent: clamped below 100 (a character is never "at" the next
 *  level, only approaching it) and truncated to 3 decimals, matching the in-game display. */
export function characterExpPercent(level: number, exp: number): number {
  const raw = Math.min(99.999, Math.max(0, percentOfLevel(level, exp)));
  return Math.floor(raw * 1000) / 1000;
}

/** Total EXP percent progress made between two (level, exp) snapshots, summed across any
 *  level-ups crossed in between (each full level crossed counts as 100%). Uncapped, since
 *  crossing multiple levels can total well past 100%. Returns 0 for a de-level (not a real
 *  in-game scenario) so callers never show a nonsense negative gain. */
export function netExpPercentGained(fromLevel: number, fromExp: number, toLevel: number, toExp: number): number {
  if (toLevel < fromLevel) return 0;
  if (toLevel === fromLevel) return Math.max(0, percentOfLevel(toLevel, toExp) - percentOfLevel(fromLevel, fromExp));
  const startLevel = Math.max(fromLevel, MIN_EXP_LEVEL);
  const startExp = startLevel === fromLevel ? fromExp : 0;
  let total = 100 - percentOfLevel(startLevel, startExp);
  for (let lv = startLevel + 1; lv < toLevel; lv++) total += 100;
  total += percentOfLevel(toLevel, toExp);
  return total;
}

/** Same idea as netExpPercentGained, but the raw EXP total instead of a percent -- how much
 *  EXP was actually earned between two snapshots, accounting for any level-ups crossed. */
export function netExpGained(fromLevel: number, fromExp: number, toLevel: number, toExp: number): number {
  if (toLevel < fromLevel) return 0;
  if (toLevel === fromLevel) return Math.max(0, toExp - fromExp);
  const startLevel = Math.max(fromLevel, MIN_EXP_LEVEL);
  const startExp = startLevel === fromLevel ? fromExp : 0;
  let total = expForLevel(startLevel) - startExp;
  for (let lv = startLevel + 1; lv < toLevel; lv++) total += expForLevel(lv);
  total += toExp;
  return total;
}

export interface ExpDelta {
  levelDelta: number;
  percentDelta: number;
}

/** Compares the character's current level/exp against the entry before it in expHistory
 *  (the current entry is always the last one, appended on the same write). Returns null
 *  when there's no prior snapshot to compare against, or nothing changed. A same-level
 *  percentDelta can come back negative -- EXP loss (e.g. dying to a boss in some modes)
 *  is a real, if rare, in-game scenario, unlike a de-level, which isn't and stays guarded
 *  against below. netExpPercentGained isn't used here for the same-level case since it
 *  clamps losses to 0, which is correct for the EXP chart (an intentionally climbing-only
 *  line, see ExpChart) but would hide a real loss here. */
export function resolveExpDelta(character: StoredCharacterRecord): ExpDelta | null {
  const history = character.expHistory;
  if (!history || history.length < 2) return null;
  const prev = history[history.length - 2];
  const levelDelta = character.level - prev.level;
  if (levelDelta < 0) return null;
  const percentDelta = levelDelta === 0
    ? percentOfLevel(character.level, character.exp) - percentOfLevel(prev.level, prev.exp)
    : netExpPercentGained(prev.level, prev.exp, character.level, character.exp);
  if (percentDelta === 0) return null;
  return { levelDelta, percentDelta };
}

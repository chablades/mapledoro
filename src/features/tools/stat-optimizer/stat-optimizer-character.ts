/*
  Reads a stored character into the optimizer's editable form: the displayed
  stat totals (tooltip triples), the hyper-point budget, and the current hyper
  / HEXA allocations. The HEXA cores keep each line's stored type and level
  (0-10) verbatim so the optimizer can strip them and re-assign types over the
  real per-line levels. Pure, no React.
*/

import type { StoredCharacterRecord } from "../../characters/model/charactersStore";
import type { HexaStatNode, HexaStatType } from "../../characters/setup/data/hexaStatData";
import { hasMinimalScouterSetup, isScouterSupportedClass } from "../../characters/scouter/scouterApi";
import type { ScouterSpecEfficiency } from "../../characters/scouter/scouterCache";
import {
  prefillFromStats,
  resolveClassDamageProfile,
  zeroCalibration,
  zeroTriple,
  type ClassDamageProfile,
  type KernelCalibration,
  type OptimizerStatInputs,
  type OptimizeTarget,
} from "./damage-formula";
import { calibrateFromSpecEfficiency } from "./scouter-calibration";
import { availableHyperPoints, HYPER_COST_CUMULATIVE, HYPER_MAX_LEVEL } from "./hyper-stat-data";
import { mapStoredHyper, zeroHyperAllocation, type HyperAllocation } from "./hyper-stat-engine";
import { HEXA_CORE_COUNT, HEXA_MAX_LINE_LEVEL, type HexaCore, type HexaLine } from "./hexa-stat-engine";

/** Character levels at which HEXA Stat cores I / II / III unlock. */
const HEXA_UNLOCK_LEVELS = [260, 265, 270];

const VALID_TYPES: HexaStatType[] = [
  "mainStat",
  "attackPower",
  "damage",
  "bossDamage",
  "ignoreDefense",
  "criticalDamage",
];

/**
 * Why the kernel is running uncalibrated, so the panel can name the fix instead
 * of just disclaiming. `null` = calibrated (or standalone entry, where the typed
 * stats are taken at face value and there's nothing to calibrate against).
 */
export type CalibrationNotice =
  /** Scouter setup isn't finished for this character — the actionable case. */
  | "setup"
  /** Set up, but no cached figure matches the character's current stats yet. */
  | "refresh"
  /** Calibration can't apply here at all (class scouter doesn't cover, or a
   *  Demon Avenger, whose HP-based stat factor the table can't invert). */
  | "unavailable";

/** The half of the editable state that belongs to one optimize target. Bossing
 *  and mobbing keep their own, so switching between them doesn't clobber values
 *  typed for the other (different buffs, and usually a different in-game preset). */
export interface TargetSeed {
  inputs: OptimizerStatInputs;
  availablePoints: number;
  /** Already deducted from `availablePoints`, kept so editing the level can recompute the budget
   *  from the closed form without dropping the deduction. */
  untrackedPoints: number;
  storedHyper: HyperAllocation;
  /** Which of the character's in-game Hyper Stat presets the levels came from. */
  presetIndex: number;
}

export interface CharacterSeed {
  profile: ClassDamageProfile;
  cores: HexaCore[];
  /** Stored in-game Hyper Stat presets; 0 greys out the panel's preset picker. */
  presetCount: number;
  /** Buffed-state corrections solved from the character's cached Scouter data.
   *  Bossing only: mobbing is valued off the typed inputs alone. */
  calibration: KernelCalibration;
  calibrationNotice: CalibrationNotice | null;
  targets: Record<OptimizeTarget, TargetSeed>;
}

/** Which notice a failed calibration earns. Ordered most-actionable first, so a
 *  character that could be calibrated is always told the specific step to take. */
function noticeFor(record: StoredCharacterRecord, profile: ClassDamageProfile): CalibrationNotice {
  if (profile.isHpBased || !isScouterSupportedClass(record.jobName)) return "unavailable";
  return hasMinimalScouterSetup(record) ? "refresh" : "setup";
}

function readHexaNodes(record: StoredCharacterRecord): HexaStatNode[] {
  const data = record.tools?.hexaStat as { nodes?: unknown } | undefined;
  const nodes = data?.nodes;
  return Array.isArray(nodes) ? (nodes as HexaStatNode[]) : [];
}

/** A stored entry into an editable line, keeping its type (any of the 6) and clamped level. */
function readLine(entry: { type?: string; level?: number } | undefined): HexaLine {
  const type = entry?.type && (VALID_TYPES as string[]).includes(entry.type) ? (entry.type as HexaStatType) : "";
  const level = Math.max(0, Math.min(HEXA_MAX_LINE_LEVEL, Math.round(Number(entry?.level)) || 0));
  return { type, level };
}

function readCore(level: number, node: HexaStatNode | undefined, index: number): HexaCore {
  const slot = node?.presets?.[node.activePreset] ?? node?.presets?.[0];
  return {
    unlocked: level >= HEXA_UNLOCK_LEVELS[index] || Boolean(node),
    primary: readLine(slot?.main),
    additional: [readLine(slot?.alt?.[0]), readLine(slot?.alt?.[1])],
  };
}

/**
 * Preset keys the optimizer reallocates, in EITHER target — a mobbing run frees
 * up the Boss Damage and Ignore Defense points, and a bossing run frees up the
 * Normal Damage ones, so the same total is on the table either way. Keeping this
 * target-independent is what makes the panel's points-available figure the same
 * number in both, which is the truth: it's the character's respec budget, not a
 * property of what they're respeccing for.
 */
function trackedPresetKeys(profile: ClassDamageProfile): Set<string> {
  return new Set(
    [
      profile.mainStat,
      profile.subStat,
      profile.subStat2,
      "attackMagicAtt",
      "bossDamage",
      "damage",
      "normalDamage",
      "criticalDamage",
      "criticalRate",
      "ignoreDefense",
    ].filter((k): k is string => k !== null),
  );
}

/**
 * Points spent on hyper lines the optimizer never models (HP, Arcane Power,
 * Status Resistance, ...). Deducted from the level budget so the recommendation
 * reallocates only the damage lines, like scouter's reserved-points input.
 */
function pointsSpentOnUntrackedLines(
  record: StoredCharacterRecord,
  profile: ClassDamageProfile,
  presetIndex: number,
): number {
  const preset = record.stats.hyperStat?.presets?.[presetIndex];
  if (!preset) return 0;
  const trackedKeys = trackedPresetKeys(profile);
  let spent = 0;
  for (const [key, rawLevel] of Object.entries(preset)) {
    if (trackedKeys.has(key)) continue;
    const level = Math.min(Math.max(Math.floor(Number(rawLevel) || 0), 0), HYPER_MAX_LEVEL);
    if (level > 0) spent += HYPER_COST_CUMULATIVE[level - 1];
  }
  return spent;
}

/** The allocation and point budget one of the character's in-game Hyper Stat
 *  presets seeds, for one target. Re-run when the panel's preset picker moves.
 *  `level` is the record's level unless the tool holds a higher one the player
 *  typed in, as in `seedFromCharacter`. */
export function seedHyperPreset(
  record: StoredCharacterRecord,
  profile: ClassDamageProfile,
  target: OptimizeTarget,
  presetIndex: number,
  level: number = record.level,
): { storedHyper: HyperAllocation; availablePoints: number; untrackedPoints: number } {
  const untrackedPoints = pointsSpentOnUntrackedLines(record, profile, presetIndex);
  return {
    storedHyper: mapStoredHyper(record.stats.hyperStat, profile, target, presetIndex),
    availablePoints: Math.max(0, availableHyperPoints(level) - untrackedPoints),
    untrackedPoints,
  };
}

/** `level` is the record's level unless the tool holds a higher one the player typed in (the
 *  record only refreshes on a lookup), and stands in for it everywhere level is read. */
export function seedFromCharacter(
  record: StoredCharacterRecord,
  specEfficiency?: ScouterSpecEfficiency,
  level: number = record.level,
): CharacterSeed {
  const profile = resolveClassDamageProfile(record.jobName, record.stats);
  const nodes = readHexaNodes(record);
  const inputs = prefillFromStats(record.stats, profile, level);
  const calibration = calibrateFromSpecEfficiency(specEfficiency, profile, inputs);
  const presetIndex = record.stats.hyperStat?.activePreset ?? 0;
  // Both targets open on the same stat window; they diverge only as the user
  // edits them (and mobbing never takes the buffed-state calibration).
  const target = (t: OptimizeTarget): TargetSeed => ({
    inputs: { ...inputs },
    presetIndex,
    ...seedHyperPreset(record, profile, t, presetIndex, level),
  });
  return {
    profile,
    cores: Array.from({ length: HEXA_CORE_COUNT }, (_, i) => readCore(level, nodes[i], i)),
    presetCount: record.stats.hyperStat?.presets?.length ?? 0,
    calibration: calibration ?? zeroCalibration(),
    calibrationNotice: calibration ? null : noticeFor(record, profile),
    targets: { bossing: target("bossing"), mobbing: target("mobbing") },
  };
}

const emptyLine = (): HexaLine => ({ type: "", level: 0 });

/**
 * Level standalone entry opens at. It cannot be 0: the hyper-point budget comes
 * from the level, and a 0 budget makes `capHyperLevelToBudget` clamp every typed
 * Hyper Stat level back to 0, so the panel refuses the levels its own warning
 * asks for. 290 is a real endgame level rather than the 300 cap, and it stays
 * editable, so it reads as a starting point instead of a claim about the user.
 */
const STANDALONE_LEVEL = 290;

/**
 * A blank seed so the optimizer works standalone (no character selected): a
 * generic main + secondary + ATT profile, zeroed inputs, and three locked cores
 * the user unlocks and fills in by hand. A picked character overwrites this.
 */
export function emptyCharacterSeed(): CharacterSeed {
  const blankTarget = (): TargetSeed => ({
    inputs: {
      level: STANDALONE_LEVEL,
      main: zeroTriple(),
      sub: zeroTriple(),
      sub2: zeroTriple(),
      attack: zeroTriple(),
      damagePct: 0,
      bossDamagePct: 0,
      critRatePct: 0,
      critDamagePct: 0,
      ignoreDefPct: 0,
    },
    availablePoints: availableHyperPoints(STANDALONE_LEVEL),
    untrackedPoints: 0,
    storedHyper: zeroHyperAllocation(),
    presetIndex: 0,
  });
  return {
    profile: {
      classId: undefined,
      mainStat: "str",
      subStat: "dex",
      subStat2: null,
      usesMagic: false,
      isHpBased: false,
      isXenon: false,
      constants: { dpmMainStat: 0, dpmAtk: 0, dpmAtkPer: 0, dpmBossDmg: 0, dpmIgnoreGuard: 0, dpmCritDmg: 0 },
      // No class behind the numbers, so no archer conversion to claim either.
      critRateToDmg: 0,
    },
    cores: Array.from({ length: HEXA_CORE_COUNT }, () => ({
      unlocked: false,
      primary: emptyLine(),
      additional: [emptyLine(), emptyLine()],
    })),
    // No character, so no in-game presets to pick between either.
    presetCount: 0,
    // Standalone mode has no character to calibrate against; the typed-in stats are
    // taken at face value, so no "uncalibrated" warning is warranted either.
    calibration: zeroCalibration(),
    calibrationNotice: null,
    targets: { bossing: blankTarget(), mobbing: blankTarget() },
  };
}

/*
  Damage kernel for the Stat Optimizer — an exact port of the (bossing) kernel
  maplescouter.com's optimizer evaluates candidate allocations with (their
  minified `A(...)` + helpers n8/Ng/gt/h2/_M/VQ), restricted to the terms our
  inputs can move: doping/link-skill/seed-ring session state is zero, the
  class-passive `dpm*` constants come from scouter-class-data.ts. Only ratios
  between two evaluations are meaningful; constant factors (final damage,
  skill %, mastery) are omitted because they cancel.

  Stat fields are the in-game tooltip triple: Base Value, % Value, and
  % Value Not Applied (a FLAT amount the % does not multiply):
  total = floor(base * (1 + %/100)) + notApplied.

  Deltas from hyper/HEXA lines land where the game puts them, matching
  scouter: main/sub stat lines in the flat (not-applied) bucket, ATT lines
  inside the base that ATT% multiplies, ignore-DEF stacking multiplicatively
  (with scouter's exact stack/unstack arithmetic in stackIedSources/applyIed),
  and the crit bucket rounded to 4 decimals like the live site.

  The mobbing target (`OptimizeTarget`) is ours, not scouter's: same kernel with
  every boss-only term switched off. See that type for exactly which.
*/

import type { StoredCharacterStats, StoredTripleStatField } from "../../characters/model/charactersStore";
import { getClassDataByNexonJobName } from "../../characters/setup/data/classSkillData";
import { resolveClassId } from "../../characters/setup/data/nexonJobMapping";
import {
  critRateToCritDmg,
  SCOUTER_CLASS_CONSTANTS,
  ZERO_CLASS_CONSTANTS,
  type ScouterClassConstants,
} from "./scouter-class-data";

/** Boss physical damage reduction the allocation is valued against. Scouter's
 *  selector spans 50-380; the picker offers the two ends players actually plan
 *  around, 300% (standard endgame bosses) and 380% (the hardest tier), and
 *  opens on 380% since that is the fight an allocation gets tuned for. */
export const DEFAULT_BOSS_PDR = 380;

/**
 * What an allocation is being valued for. `"mobbing"` drops every boss-only term
 * the kernel carries — the class boss-damage passive (`dpmBossDmg`), the whole
 * ignore-DEF bucket (normal mobs aren't the fight IED is bought for), and the
 * archer excess-crit conversion (Vicious Shot and friends run ~25% uptime, and
 * mobbing is valued at full uptime). The bossDamagePct input is NOT dropped: on
 * a mobbing run that field is the character's Normal Enemy Damage %, which lands
 * in the same damage bucket boss damage does.
 */
export type OptimizeTarget = "bossing" | "mobbing";

export type MainStatId = "str" | "dex" | "int" | "luk" | "hp";

export interface ClassDamageProfile {
  classId: string | undefined;
  /** Stats entering the stat factor. sub/sub2 null when the class has none. */
  mainStat: MainStatId;
  subStat: MainStatId | null;
  subStat2: MainStatId | null;
  /** Class uses Magic ATT instead of Attack Power. */
  usesMagic: boolean;
  /** Demon Avenger: HP-based (scouter's `gt` stat kernel + HP% hyper lines). */
  isHpBased: boolean;
  /** Xenon: 3-stat factor, tri-stat hyper lines, 0.48x All-Stat HEXA lines. */
  isXenon: boolean;
  /** Scouter class-passive constants baked into the kernel's buckets. */
  constants: Omit<ScouterClassConstants, "main" | "sub" | "sub2">;
  /** Critical damage one point of critical rate past 100% converts into (archers
   *  only, see CRIT_RATE_TO_CRIT_DMG); 0 for every class without such a passive. */
  critRateToDmg: number;
}

/** One tooltip stat field: base value, % value, and flat "% not applied" value. */
export interface TripleStat {
  base: number;
  pct: number;
  flat: number;
}

export const zeroTriple = (): TripleStat => ({ base: 0, pct: 0, flat: 0 });

/** The character's editable stat-window inputs. */
export interface OptimizerStatInputs {
  level: number;
  main: TripleStat;
  sub: TripleStat;
  sub2: TripleStat;
  attack: TripleStat;
  damagePct: number;
  bossDamagePct: number;
  critRatePct: number;
  critDamagePct: number;
  ignoreDefPct: number;
}

/** Allocation delta fed to the kernel. Stat lines are flat unless noted. */
export interface KernelDelta {
  /** Flat main stat (lands in the "% not applied" bucket, like the game). */
  mainFlat: number;
  /** Main stat % (Demon Avenger hyper HP% lines land here). */
  mainPct: number;
  subFlat: number;
  sub2Flat: number;
  /** ATT added inside the base the ATT% multiplies. */
  atk: number;
  bossDmg: number;
  dmg: number;
  critDmg: number;
  critRate: number;
  /** Ignore-DEF percent added by the candidate allocation (stackIedSources-combined). */
  ied: number;
  /** Ignore-DEF percent of the stripped current allocation (negative), applied after
   *  `ied` — scouter runs these as two separate stack operations, in this order. */
  iedStrip: number;
}

/**
 * Per-character corrections that move the kernel's buckets onto the same footing
 * maplescouter evaluates against. Our stat inputs are the in-game stat window,
 * which is unbuffed; scouter folds that character's link skills, noblesse and
 * potion settings, Champion's Renown and seed-ring uptime into the same buckets
 * before optimizing. Those are additive constants, so the whole gap collapses to
 * one offset per bucket (`scouter-calibration.ts` solves them from the character's
 * cached Scouter efficiency table). All zero = the raw stat window, unchanged.
 */
export interface KernelCalibration {
  /** Added to (4*main + sub) inside the stat factor. */
  statSum: number;
  /** Added to the ATT base that ATT% multiplies. */
  atkBase: number;
  /** Added to ATT %. */
  atkPct: number;
  /** Percentage points added to the damage/boss bucket. */
  dmgPct: number;
  /** Percentage points added to critical damage. */
  critDmgPct: number;
  /** Ignore-DEF percent stacked (multiplicatively) onto the stat window's. */
  iedPct: number;
}

export const zeroCalibration = (): KernelCalibration => ({
  statSum: 0,
  atkBase: 0,
  atkPct: 0,
  dmgPct: 0,
  critDmgPct: 0,
  iedPct: 0,
});

export const zeroDelta = (): KernelDelta => ({
  mainFlat: 0,
  mainPct: 0,
  subFlat: 0,
  sub2Flat: 0,
  atk: 0,
  bossDmg: 0,
  dmg: 0,
  critDmg: 0,
  critRate: 0,
  ied: 0,
  iedStrip: 0,
});

function num(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function readTriple(field: StoredTripleStatField | undefined): TripleStat {
  if (!field) return zeroTriple();
  return { base: num(field.base), pct: num(field.percent), flat: num(field.percentUnapplied) };
}

/** Largest of str/dex/int/luk by base value — fallback primary for classes with no metadata. */
function inferPrimaryStat(stats: StoredCharacterStats): MainStatId {
  const candidates: MainStatId[] = ["str", "dex", "int", "luk"];
  let best: MainStatId = "str";
  let bestVal = -1;
  for (const id of candidates) {
    const v = num(stats[id].base);
    if (v > bestVal) {
      bestVal = v;
      best = id;
    }
  }
  return best;
}

const isMainStatId = (v: string): v is MainStatId => ["str", "dex", "int", "luk", "hp"].includes(v);

/**
 * Resolves how a class's stats feed the damage formula. Stat ids and the
 * dpm* constants come from the vendored scouter table; classes scouter does
 * not list fall back to classSkillData stats and zero constants.
 */
export function resolveClassDamageProfile(
  jobName: string,
  stats?: StoredCharacterStats,
): ClassDamageProfile {
  const classId = resolveClassId(jobName);
  const required = getClassDataByNexonJobName(jobName)?.requiredStats ?? [];
  const usesMagic = required.includes("magicAtt");
  const scouter = classId ? SCOUTER_CLASS_CONSTANTS[classId] : undefined;

  if (scouter) {
    return {
      classId,
      mainStat: scouter.main,
      subStat: scouter.sub,
      subStat2: scouter.sub2,
      usesMagic,
      isHpBased: scouter.main === "hp",
      isXenon: classId === "xenon",
      constants: scouter,
      critRateToDmg: critRateToCritDmg(classId),
    };
  }

  const statIds = required.filter(isMainStatId);
  const primary = statIds[0] ?? (stats ? inferPrimaryStat(stats) : "str");
  const secondary = statIds.find((id) => id !== primary) ?? null;
  return {
    classId,
    mainStat: primary,
    subStat: secondary,
    subStat2: null,
    usesMagic,
    isHpBased: primary === "hp",
    isXenon: false,
    constants: ZERO_CLASS_CONSTANTS,
    critRateToDmg: critRateToCritDmg(classId),
  };
}

/**
 * Whether the stat window carries a damage baseline to value an allocation
 * against. With no main or secondary stat the stat factor is 0, so every
 * candidate evaluates to 0, the greedy can't rank anything, and the 0% gain
 * that falls out means "nothing entered" rather than "already optimal".
 */
export function hasStatBaseline(profile: ClassDamageProfile, inputs: OptimizerStatInputs): boolean {
  const total = (t: TripleStat): number => Math.floor(t.base * (1 + t.pct / 100)) + t.flat;
  return total(inputs.main) > 0 || (profile.subStat !== null && total(inputs.sub) > 0);
}

/** Reads a character's stored stats into the optimizer's editable input shape. */
export function prefillFromStats(
  stats: StoredCharacterStats,
  profile: ClassDamageProfile,
  level: number,
): OptimizerStatInputs {
  const pick = (id: MainStatId | null): TripleStat => (id ? readTriple(stats[id]) : zeroTriple());
  return {
    level,
    main: pick(profile.mainStat),
    sub: pick(profile.subStat),
    sub2: pick(profile.subStat2),
    attack: readTriple(profile.usesMagic ? stats.magicAtt : stats.attackPower),
    damagePct: num(stats.damage),
    bossDamagePct: num(stats.bossDamage),
    critRatePct: num(stats.criticalRate),
    critDamagePct: num(stats.criticalDamage),
    ignoreDefPct: num(stats.ignoreDefense),
  };
}

// ── Ignore-DEF stacking (scouter's S.A combiner + VQ's k) ─────────────────────

/** Scouter's pairwise IED combine: stacks like-signed sources multiplicatively. */
function iedPair(e: number, a: number): number {
  let flip = false;
  if ((e >= 0 && a >= 0) || (e < 0 && a < 0)) {
    return (1 - (1 - Math.abs(a)) * (1 - Math.abs(e) / 100)) * (e < 0 ? -1 : 1);
  }
  if (Math.abs(100 * a) > Math.abs(e)) {
    if (a < 0) flip = true;
  } else if (Math.abs(100 * a) < Math.abs(e) && e < 0) flip = true;
  return (
    ((100 * Math.max(Math.abs(e), Math.abs(100 * a)) - 100 * Math.min(Math.abs(e), Math.abs(100 * a))) /
      (100 - Math.min(Math.abs(e), Math.abs(100 * a))) /
      100) *
    (flip ? -1 : 1)
  );
}

/** Combines IED percent sources into one percent, exactly like scouter's S.A. */
export function stackIedSources(...sources: number[]): number {
  let acc = 0;
  for (const s of sources) acc = iedPair(s, acc);
  return (1e4 * acc) / 100;
}

/** Applies a (possibly negative = un-stack) IED percent onto a total IED fraction. */
function applyIed(pct: number, frac: number): number {
  return pct >= 0 ? 1 - (1 - frac) * (1 - pct / 100) : (1e4 * frac + 100 * pct) / (100 + pct) / 100;
}

// ── Kernel ────────────────────────────────────────────────────────────────────

interface KernelOptions {
  /** Bossing keeps every boss-only term; mobbing drops them (see OptimizeTarget). */
  target: OptimizeTarget;
  /** Boss DEF % (PDR) the ignore-def bucket is valued against (bossing only). */
  bossPdrPct: number;
  /** Scouter's HEXA evaluations force 100% crit; hyper uses the real crit rate. */
  forceFullCrit: boolean;
  /** Buffed-state corrections; `zeroCalibration()` leaves the raw stat window. */
  calibration: KernelCalibration;
}

/** Stat factor for standard classes and Xenon (scouter's n8). */
function statFactor(
  p: ClassDamageProfile,
  s: OptimizerStatInputs,
  d: KernelDelta,
  cal: KernelCalibration,
): number {
  // Level-based AP term: scouter adds dpmMainStat * (5*level + 18) to whichever
  // stat carries the AP (for Xenon, the one with the highest % value; the other
  // two get a flat 330 instead).
  const h = p.isXenon ? 5 * s.level + 26 - 660 : 5 * s.level + 18;
  const dpm = p.constants.dpmMainStat;
  let apSlot = 1;
  if (p.isXenon) {
    if (s.sub2.pct >= Math.max(s.main.pct, s.sub.pct)) apSlot = 3;
    else if (s.sub.pct >= Math.max(s.main.pct, s.sub2.pct)) apSlot = 2;
  }
  const apFor = (slot: number): number => {
    if (!p.isXenon) return slot === 1 ? dpm * h : 0;
    return dpm * (apSlot === slot ? h : 330);
  };
  const main = Math.max(
    0,
    Math.floor((s.main.base + apFor(1)) * (1 + (s.main.pct + d.mainPct) / 100)) + s.main.flat + d.mainFlat,
  );
  const sub = Math.max(
    0,
    Math.floor((s.sub.base + apFor(2)) * (1 + s.sub.pct / 100)) + s.sub.flat + d.subFlat,
  );
  const sub2 = Math.max(
    0,
    Math.floor((s.sub2.base + apFor(3)) * (1 + s.sub2.pct / 100)) + s.sub2.flat + d.sub2Flat,
  );
  const hasSub2 = p.subStat2 !== null;
  return (4 * main + (sub + (hasSub2 ? sub2 : 0)) * (p.isXenon ? 4 : 1) + cal.statSum) / 100;
}

/** Demon Avenger stat factor (scouter's gt, output 0): HP-based, fixed 3.5 divisors.
 *  Takes no calibration: its factor isn't `4*main + sub`, so a stat-sum offset solved
 *  from `mainStatAbseff1` wouldn't mean anything here. `calibrateFromSpecEfficiency`
 *  returns null for HP-based classes for the same reason, so this stays a no-op path. */
function statFactorHpBased(s: OptimizerStatInputs, d: KernelDelta): number {
  const x = 90 * s.level + 545;
  const hp = Math.max(
    0,
    Math.floor(s.main.base * (1 + (s.main.pct + d.mainPct) / 100)) + s.main.flat + d.mainFlat,
  );
  const sub = Math.max(0, Math.floor(s.sub.base * (1 + s.sub.pct / 100)) + s.sub.flat + d.subFlat);
  return (Math.floor(x / 3.5) + 0.8 * Math.floor((hp - x) / 3.5) + sub) / 100;
}

/**
 * Critical damage an archer's critical rate past the 100% cap converts into.
 * Zero for every other class, and for any crit rate at or below the cap.
 *
 * This is the one place the kernel knowingly leaves maplescouter: theirs can't
 * reach the mechanic (crit rate input capped at 100, no crit rate bucket in the
 * efficiency table), so past the cap they value crit rate at nothing. Scouter
 * does carry the per-class rate, though, and applies it in their link-skill
 * ranking, which is where `CRIT_RATE_TO_CRIT_DMG` comes from.
 */
export function excessCritDamage(profile: ClassDamageProfile, critRatePct: number): number {
  return profile.critRateToDmg * Math.max(0, critRatePct - 100);
}

/**
 * Relative bossing damage for a stat allocation delta. Only meaningful as a
 * ratio between two evaluations of the same character.
 */
export function computeScouterDamage(
  profile: ClassDamageProfile,
  inputs: OptimizerStatInputs,
  delta: KernelDelta,
  opts: KernelOptions,
): number {
  const c = profile.constants;
  const cal = opts.calibration;
  const mobbing = opts.target === "mobbing";

  const stat = profile.isHpBased
    ? statFactorHpBased(inputs, delta)
    : statFactor(profile, inputs, delta, cal);

  // Attack (scouter's Ng): a flat +20 is always present on the live site, and
  // added ATT lands inside the base the ATT% multiplies.
  const attack =
    Math.max(0, inputs.attack.base + 20 + c.dpmAtk + cal.atkBase + delta.atk) *
      (1 + Math.max(0, inputs.attack.pct + c.dpmAtkPer + cal.atkPct) / 100) +
    inputs.attack.flat;

  // Crit bucket, rounded to 4 decimals like the live site. The rate itself still
  // caps at 100%, but for archers the part above the cap is not thrown away: it
  // rides into the crit damage term instead, which is what keeps crit rate worth
  // buying past the cap. `forceFullCrit` only pins the rate (scouter's HEXA
  // convention) and so leaves the conversion alone -- the excess is a property of
  // the character's stat line, not of which mode is being optimized. Mobbing is
  // the one place it is dropped, and not because the mechanic changes: the
  // passives granting it run ~25% uptime, and a mobbing allocation is tuned for
  // the other 75%.
  const rawCritRatePct = inputs.critRatePct + delta.critRate;
  const critRate = opts.forceFullCrit ? 1 : Math.min(1, rawCritRatePct / 100);
  const critDmg =
    inputs.critDamagePct +
    c.dpmCritDmg +
    cal.critDmgPct +
    delta.critDmg +
    (mobbing ? 0 : excessCritDamage(profile, rawCritRatePct));
  const critBucket = Math.round(((1 - critRate) * 1 + (critRate * (135 + critDmg)) / 100) * 1e4) / 1e4;

  // `bossDamagePct` is the Normal Enemy Damage % field on a mobbing run, which
  // the game puts in this same bucket; only the class boss-damage passive drops.
  const dmgBucket =
    1 +
    ((mobbing ? 0 : c.dpmBossDmg) +
      inputs.bossDamagePct +
      inputs.damagePct +
      cal.dmgPct +
      delta.bossDmg +
      delta.dmg) /
      100;

  // Mobbing doesn't value ignore DEF at all, so the bucket collapses to 1 rather
  // than being valued against a boss's PDR.
  let iedBucket = 1;
  if (!mobbing) {
    let ied =
      1 - (1 - inputs.ignoreDefPct / 100) * (1 - c.dpmIgnoreGuard / 100) * (1 - cal.iedPct / 100);
    ied = applyIed(delta.ied, ied);
    ied = applyIed(delta.iedStrip, ied);
    iedBucket = 1 - (opts.bossPdrPct * (1 - ied)) / 100;
  }

  return stat * attack * critBucket * dmgBucket * iedBucket;
}

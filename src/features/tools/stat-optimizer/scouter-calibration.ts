/*
  Solves the kernel's per-bucket calibration from a character's cached MapleScouter
  efficiency table (`ScouterSpecEfficiency`, already fetched and stored by
  scouterCache.ts for the Stat Efficiency bookmark).

  Why this exists: our stat inputs are the in-game stat window, which is unbuffed,
  while scouter optimizes against a fully-buffed bossing state (link skills,
  noblesse/potion settings, Champion's Renown, seed-ring uptime). Those all land as
  additive constants inside the same buckets, so the two only ever disagreed on
  bucket SIZE, never on the greedy itself -- and a bucket's size is exactly what
  scouter's own table reports, one field per bucket.

  Each `*eff1` field is the fraction of extra final damage one unit of that stat
  buys, i.e. the bucket's derivative over the bucket, so each one inverts to the
  bucket that produced it. Verified end to end: calibrating a real endgame Kanna
  this way makes optimizeHyper return maplescouter's live recommendation exactly
  (main 5 / sub 3 / ATT 8 / boss 15 / dmg 13 / crit dmg 15 / crit rate 0 / IED 6).
*/

import type { ScouterSpecEfficiency } from "../../characters/scouter/scouterCache";
import {
  excessCritDamage,
  zeroCalibration,
  type ClassDamageProfile,
  type KernelCalibration,
  type OptimizerStatInputs,
} from "./damage-formula";

/** Boss PDR scouter measures its `igreff1` field against (`igreff1_380` is the same
 *  stat at 380). The solved IED total is a property of the character, not the boss,
 *  so either field recovers it -- 300 is the one every cached entry carries. */
const IGREFF_PDR = 300;

const isPositive = (n: number | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/** Total ignore-DEF fraction implied by the per-1% efficiency at `IGREFF_PDR`.
 *  With `g` the un-ignored share of boss DEF and `p = PDR/100`, the bucket is
 *  `1 - p*g` and one more IED point scales `g` by 0.99, so
 *  `eff = 0.01*p*g / (1 - p*g)`, which inverts to the `g` below. */
function iedTotalFraction(eff: number): number {
  const p = IGREFF_PDR / 100;
  return 1 - eff / (p * (0.01 + eff));
}

/**
 * Attack total and multiplier behind a pair of ATT efficiencies. With
 * `A = B*m + flat` (B the multiplied base, m the ATT% multiplier),
 * `atkeff1 = m/A` and `atkPereff1 = 0.01*B/A`, which leaves a quadratic in A.
 * Almost every character has `flat` 0, where this reduces to `A = 1/(r*e)`.
 */
function solveAttack(eff: ScouterSpecEfficiency, flat: number): { total: number; mult: number } | null {
  const r = eff.atkPereff1 / 0.01;
  const e = eff.atkeff1;
  const disc = 1 - 4 * r * e * flat;
  if (disc < 0) return null;
  const total = (1 + Math.sqrt(disc)) / (2 * r * e);
  const mult = e * total;
  return Number.isFinite(total) && total > 0 && mult > 0 ? { total, mult } : null;
}

/**
 * Per-bucket offsets that put `inputs` on scouter's buffed footing, or null when
 * the table can't be inverted for this character. Null cases fall back to the raw
 * stat window (today's behaviour), never to a partly-applied calibration.
 *
 * Demon Avenger is excluded on purpose: its stat factor is HP-based rather than
 * `4*main + sub`, so `mainStatAbseff1` doesn't invert to a stat sum there.
 */
export function calibrateFromSpecEfficiency(
  eff: ScouterSpecEfficiency | undefined,
  profile: ClassDamageProfile,
  inputs: OptimizerStatInputs,
): KernelCalibration | null {
  if (!eff || profile.isHpBased) return null;
  if (
    !isPositive(eff.mainStatAbseff1) ||
    !isPositive(eff.dmgeff1) ||
    !isPositive(eff.cridmgeff1) ||
    !isPositive(eff.atkeff1) ||
    !isPositive(eff.atkPereff1) ||
    !isPositive(eff.igreff1)
  ) {
    return null;
  }

  const c = profile.constants;
  const cal = zeroCalibration();

  // Stat factor: main stat enters at weight 4, so `mainStatAbseff1 = 4 / (4*main + sub)`.
  const statSumTarget = 4 / eff.mainStatAbseff1;
  const statTotal = (t: { base: number; pct: number; flat: number }): number =>
    Math.max(0, Math.floor(t.base * (1 + t.pct / 100)) + t.flat);
  const sideWeight = profile.isXenon ? 4 : 1;
  const statSumNow =
    4 * statTotal(inputs.main) +
    sideWeight * (statTotal(inputs.sub) + (profile.subStat2 !== null ? statTotal(inputs.sub2) : 0));
  cal.statSum = statSumTarget - statSumNow;

  // Damage/boss bucket: `dmgeff1 = 0.01 / bucket`.
  cal.dmgPct =
    (0.01 / eff.dmgeff1 - 1) * 100 - (c.dpmBossDmg + inputs.bossDamagePct + inputs.damagePct);

  // Crit bucket: `cridmgeff1 = crit*0.01 / bucket`, so the bucket needs the crit
  // rate to unfold back into a crit damage total.
  // The seeded excess-crit-rate conversion comes off here for the same reason every
  // other known term does: the offset is only what the table's bucket has that our
  // inputs don't, so anything the kernel will add back must not be solved into it.
  const crit = Math.min(1, inputs.critRatePct / 100);
  if (crit <= 0) return null;
  const critBucket = (crit * 0.01) / eff.cridmgeff1;
  cal.critDmgPct =
    ((critBucket - (1 - crit)) * 100) / crit -
    135 -
    inputs.critDamagePct -
    c.dpmCritDmg -
    excessCritDamage(profile, inputs.critRatePct);

  const attack = solveAttack(eff, inputs.attack.flat);
  if (!attack) return null;
  cal.atkPct = (attack.mult - 1) * 100 - inputs.attack.pct - c.dpmAtkPer;
  cal.atkBase =
    (attack.total - inputs.attack.flat) / attack.mult - inputs.attack.base - 20 - c.dpmAtk;

  // Ignore DEF stacks multiplicatively, so the offset is whatever extra source
  // takes the stat window's combined total to scouter's.
  const iedNow = 1 - (1 - inputs.ignoreDefPct / 100) * (1 - c.dpmIgnoreGuard / 100);
  const iedTarget = iedTotalFraction(eff.igreff1);
  if (iedNow >= 1 || iedTarget >= 1) return null;
  cal.iedPct = 100 * (1 - (1 - iedTarget) / (1 - iedNow));

  return Object.values(cal).every((v) => Number.isFinite(v)) ? cal : null;
}

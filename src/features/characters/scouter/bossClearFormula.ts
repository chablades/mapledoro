/*
  TS port of MapleScouter's Boss Clear (Cut) formula, reverse-engineered from their client
  bundle -- byte-exact against a real character (73.26% exact match on Hard Malefic Star).
  Don't change any constant here without re-validating against a real MapleScouter result
  first; these numbers are empirically fit, not arbitrary.

  Deliberately NOT ported:
  - Their "Additional Spec Simulator" build-preview multiplier -- always 1 for a character's own
    real, current setup, which is all mapledoro shows.
  - Newbie Standard mode -- a separate toggle on their site, out of scope for a first version.
  - The Sayram authentic-symbol bonus multiplier on a few bosses (Maerin among them) -- a small,
    documented accuracy gap, not worth the extra complexity yet.
  - The legacy pre-spline cubic-polynomial fallback -- dead code on MapleScouter's own site for
    any modern character. computeBossClear returns null if spline_300/spline_380 aren't present
    rather than porting that fallback.
*/

import { BOSSCUT_DATA, type BossCutEntry } from "./bosscut-data.generated";
import type { BossClearInputs } from "./scouterCache";

interface Spline {
  x: number[];
  y: number[];
  m: number[];
}

// Forward cubic Hermite spline eval (MapleScouter module 62509's `M8`).
function splineEval(spline: Spline, t: number): number {
  const { x, y, m } = spline;
  const n = x.length;
  if (t < x[0]) return y[0] + (t - x[0]) * m[0];
  if (t <= x[n - 1]) {
    let seg = n - 2;
    for (let i = 0; i < n - 1; i++) {
      if (t >= x[i] && t <= x[i + 1]) {
        seg = i;
        break;
      }
    }
    const h = x[seg + 1] - x[seg];
    const s = (t - x[seg]) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[seg] + (s3 - 2 * s2 + s) * h * m[seg] + (-2 * s3 + 3 * s2) * y[seg + 1] + (s3 - s2) * h * m[seg + 1];
  }
  const last = x[n - 1];
  return y[n - 1] + (t - last) * Math.max(m[n - 1], 1e-9);
}

// Inverse of splineEval via binary search, 40 iterations matching MapleScouter's own `mg`.
function splineInverse(spline: Spline, damage: number): number {
  const { x, y, m } = spline;
  const n = x.length;
  if (damage <= y[0]) return Math.round(x[0] + (damage - y[0]) / Math.max(m[0], 1e-9));
  if (damage >= y[n - 1]) return Math.round(x[n - 1] + (damage - y[n - 1]) / Math.max(m[n - 1], 1e-9));
  let lo = x[0];
  let hi = x[n - 1];
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (splineEval(spline, mid) < damage) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

// Level-gap damage-loss bucket, keyed by clamped (character level - boss level), -40..5.
const LEVEL_GAP_PERCENT: Record<number, number> = {
  5: 120, 4: 118, 3: 116, 2: 114, 1: 112, 0: 110,
  [-1]: 105.3, [-2]: 100.7, [-3]: 96.2, [-4]: 91.8, [-5]: 87.5, [-6]: 85, [-7]: 82.5, [-8]: 80,
  [-9]: 77.5, [-10]: 75, [-11]: 72.5, [-12]: 70, [-13]: 67.5, [-14]: 65, [-15]: 62.5, [-16]: 60,
  [-17]: 57.5, [-18]: 55, [-19]: 52.5, [-20]: 50, [-21]: 47.5, [-22]: 45, [-23]: 42.5, [-24]: 40,
  [-25]: 37.5, [-26]: 35, [-27]: 32.5, [-28]: 30, [-29]: 27.5, [-30]: 25, [-31]: 22.5, [-32]: 20,
  [-33]: 17.5, [-34]: 15, [-35]: 12.5, [-36]: 10, [-37]: 7.5, [-38]: 5, [-39]: 2.5, [-40]: 0,
};
function levelGapDmg(characterLevel: number, bossLevel: number): number {
  const diff = Math.max(-40, Math.min(5, characterLevel - bossLevel));
  return LEVEL_GAP_PERCENT[diff] / 100;
}

/** Ordered highest-threshold-first; the first entry whose min the value clears wins, else fallback. */
function pickTier<T>(value: number, thresholds: [min: number, result: T][], fallback: T): T {
  for (const [min, result] of thresholds) {
    if (value >= min) return result;
  }
  return fallback;
}

const ARCANE_GAP_TIERS: [number, number][] = [
  [150, 150], [130, 130], [110, 110], [100, 100], [70, 80], [50, 70], [30, 60], [10, 30],
];
function arcaneGapDmg(bossArcaneForce: number | null, characterArcaneForce: number): number {
  if (!bossArcaneForce || bossArcaneForce <= 0) return 1;
  const ratio = (characterArcaneForce / bossArcaneForce) * 100;
  return pickTier(ratio, ARCANE_GAP_TIERS, 10) / 100;
}

const AUTHENTIC_GAP_TIERS: [number, number][] = [
  [50, 125], [40, 120], [30, 115], [20, 110], [10, 105], [0, 100], [-10, 90], [-20, 80],
  [-30, 70], [-40, 60], [-50, 50], [-60, 40], [-70, 30], [-80, 20], [-90, 10],
];
function authenticGapDmg(bossAuthenticForce: number | null, characterAuthenticForce: number): number {
  if (!bossAuthenticForce || bossAuthenticForce <= 0) return 1;
  const diff = characterAuthenticForce - bossAuthenticForce;
  return pickTier(diff, AUTHENTIC_GAP_TIERS, 5) / 100;
}

// Real level floor for a handful of current-tier raid bosses, separate from the damage-loss
// gap tables above. Below it the boss can't be entered at all, not merely hard.
const ENTRY_LEVEL_BY_DIFFICULTY: Record<string, Record<string, number>> = {
  메이린: { Normal: 270, Hard: 280 },
};
const ENTRY_LEVEL_DEFAULT: Record<string, number> = {
  유피테르: 295, 발드릭스: 290, 림보: 285, 카링: 275, 대적자: 270, 칼로스: 265, 세렌: 260,
};
function cannotEnter(bossName: string, difficulty: string, characterLevel: number): boolean {
  const required = ENTRY_LEVEL_BY_DIFFICULTY[bossName]?.[difficulty] ?? ENTRY_LEVEL_DEFAULT[bossName] ?? 200;
  return required > characterLevel;
}

// MapleScouter's universal "converted power" calibration splines (guard<380 vs guard>=380),
// same hardcoded control points for every character, calibrated so stat 114000 always maps to
// exactly 1e9. Only feeds the displayed "converted power" number, never clearRate itself.
const CALIBRATION_SPLINE_300: Spline = {
  x: [0, 23669, 31571, 44859, 54997, 66681, 80448, 92420, 104603, 115271, 125592, 135121, 145777],
  y: [0, 0x7c85422, 0xd6a725e, 0x1db110e3, 0x30ecb258, 0x4e46ba39, 0x7a91c572, 0xa92bdb7c, 0xf4a23ef7, 0x161148007, 0x1f6659e79, 0x2acd89600, 0x38d42f36d],
  m: [5516.4666863830325, 8044.1943204984545, 14789.269328580256, 25218.024144283732, 36148.70231997388, 47175.69922998355, 59235.13103370648, 80154.51354834021, 129843.61610868858, 200526.65317574335, 277023.054602908, 336216.9876380784, 353328.37058933935],
};
const CALIBRATION_SPLINE_380: Spline = {
  x: [0, 23669, 31571, 44859, 54997, 66681, 80448, 92420, 104603, 115271, 125592, 135121, 145777],
  y: [0, 0x7ed8fad, 0xda11ba3, 0x1e0e6b06, 0x31744bb1, 0x4f0d6eb2, 0x7b8c552b, 0xaa5d553e, 0xf62821e2, 0x162ddf0f5, 0x1f8c1a334, 0x2b0251045, 0x3918f7ef5],
  m: [5619.558282986184, 8173.607442464422, 14954.342493122054, 25444.829794050493, 36456.11866357817, 47495.027385720256, 59506.8463563112, 80516.26536398455, 130313.03577388721, 201131.21598745478, 278244.2102268488, 337839.3881066491, 354903.2237237237],
};
function convertedBossPower(statValue: number, guard: number): number {
  const spline = guard < 380 ? CALIBRATION_SPLINE_300 : CALIBRATION_SPLINE_380;
  const scale = 1e9 / splineEval(spline, 114000);
  return splineEval(spline, statValue) * scale;
}

// --- Tag bucketing (MapleScouter module 97571's `Rn`) ---------------------------------------

/** The real English strings from MapleScouter's own i18n dictionary, not a gloss. */
// Six distinct hues, one per severity step, best to worst: green, blue, red, orange, purple,
// gray. Replaces an earlier attempt at same-hue lightness shifts, such as two greens for Easy
// and Possible, which read as identical at a glance. Every value here matches its STATUS and
// statusText key directly, since BossClearGrid.tsx's pillStatus maps one to one.
export type ClearColorTier = "green" | "blue" | "red" | "orange" | "purple" | "gray";

// Single source of truth for every tag's color, so one tag string always renders in one color
// everywhere it appears. Both tier tables below reference this instead of assigning colors
// inline. The bug this fixed: "3p Min Cut" rendered purple for a partyLimit-3 boss, its worst
// tier, but red for a partyLimit-6 boss, a middle tier there, because the two tables assigned
// colors by rank within each table rather than by tag identity. Identical tag text must mean
// identical severity.
//
// This is also why the party-only table's top tier is "1p Min Cut", not "Solo Min" like the
// soloable table's borderline-pass tier. They are different concepts. On a party-only boss your
// own damage alone covers the entire party's requirement, the best outcome, so green. On a
// soloable boss you are at the edge of a solo pass, a worse outcome, so red. They briefly shared
// a label and collided under this same-tag-same-color rule, fixed by renaming the party-only one
// to match its "2p/3p/4p/6p Min Cut" siblings instead of reusing "Solo Min".
const TAG_COLOR: Record<string, ClearColorTier> = {
  Easy: "green", Possible: "blue", "Solo Min": "red",
  "Party-able": "orange", "Party Min": "purple",
  "1p Min Cut": "green", "2p Min Cut": "blue", "3p Min Cut": "red", "4p Min Cut": "orange", "6p Min Cut": "purple",
  Impossible: "gray", "Can't Enter": "gray",
};
interface BossTier {
  tag: string;
  color: ClearColorTier;
}
function tier(tag: string): BossTier {
  return { tag, color: TAG_COLOR[tag] };
}

// MapleDoro's own tag and color tiers, replacing MapleScouter's two independently tuned tables
// (SOLO_TAG_TIERS and SOLOABLE_COLOR_TIERS on their site) whose mismatched breakpoints let one
// tag render in two colors. "Easy" could show green or their red, where their red meant cleared
// by so wide a margin the number stopped being meaningful rather than danger, but read as an
// alert regardless. That distinction is dropped here: one tag maps to one color, tuned to the
// tag's own breakpoints, which are the meaningful semantic categories, not a second
// independently eyeballed scale. Overkill clears stay Easy and green, with no visual
// distinction from a more marginal Easy clear.
//
// Bucket breakpoints started as MapleScouter's original tag tiers, which still fit empirically,
// with one deliberate departure. The Possible floor moved from MapleScouter's 1.1 (110%) to 1.3
// (130%), per a Discord poll where several players found 110% didn't feel like a comfortable
// clear in practice, opinions ranging 100% to 150% with one citing Kalos specifically. So
// 90% to 129% is now Solo Min end to end, matching that still-tight feel rather than splitting
// it at a threshold nobody agreed felt safe. This is an intentional divergence from
// MapleScouter's displayed tags for the same character, not a bug. Every other breakpoint,
// meaning Easy, Solo Min's own floor, Party-able and Party Min, is untouched.
const SOLO_MIN_FLOOR = 0.9;
const SOLO_TIERS: Record<number, [number, BossTier][]> = {
  6: [[2, tier("Easy")], [1.3, tier("Possible")], [SOLO_MIN_FLOOR, tier("Solo Min")], [0.25, tier("Party-able")], [0.15, tier("Party Min")]],
  3: [[2, tier("Easy")], [1.3, tier("Possible")], [SOLO_MIN_FLOOR, tier("Solo Min")], [0.36, tier("Party-able")], [0.3, tier("Party Min")]],
  2: [[2, tier("Easy")], [1.3, tier("Possible")], [SOLO_MIN_FLOOR, tier("Solo Min")], [0.55, tier("Party-able")], [0.45, tier("Party Min")]],
  1: [[2, tier("Easy")], [1.3, tier("Possible")], [SOLO_MIN_FLOOR, tier("Solo Min")]],
};
// Party-only bosses (no solo option at all) use a different, party-size-labeled tag set.
const PARTY_ONLY_TIERS_BY_LIMIT: Record<number, [number, BossTier][]> = {
  3: [[2.7, tier("1p Min Cut")], [1.35, tier("2p Min Cut")], [0.9, tier("3p Min Cut")]],
};
const PARTY_ONLY_TIERS_DEFAULT: [number, BossTier][] = [
  [5.1, tier("1p Min Cut")], [2.55, tier("2p Min Cut")], [1.7, tier("3p Min Cut")], [1.275, tier("4p Min Cut")], [0.9, tier("6p Min Cut")],
];
const IMPOSSIBLE_TIER: BossTier = tier("Impossible");
const CANNOT_ENTER_TIER: BossTier = tier("Can't Enter");

/** A party-only boss's clearRate is measured against one cut-level party member's share, so
 *  100% there means you are one member of a full party, not that you can clear it. The "1p Min
 *  Cut" threshold, the top tier above, is the point where your damage alone covers the whole
 *  party's requirement, and it already carries the same 0.9 slack as the solo ladder's Solo Min
 *  floor (5.1 = 0.9 x 5.667, with 2p/3p/4p following as 5.667/N x 0.9). So the divisor that
 *  puts clearRate on the solo scale is threshold / 0.9, landing 1p Min Cut on exactly 90% Solo
 *  Min like every other boss. This is an extrapolation, not a calibration: the constants are
 *  MapleScouter's own eyeballed ones, and nobody is measuring real solo clears of Extreme
 *  Kaling. */
function soloScaleDivisor(partyLimit: number): number {
  const tiers = PARTY_ONLY_TIERS_BY_LIMIT[partyLimit] ?? PARTY_ONLY_TIERS_DEFAULT;
  return tiers[0][0] / SOLO_MIN_FLOOR;
}

/** What the tile shows. A party-only boss stays on the party scale (Np Min Cut tags) until the
 *  character clears the 1p Min Cut threshold, i.e. can solo it, then flips to the solo scale:
 *  % against the whole party's cut, Easy/Possible/Solo Min tags. "510% 1p Min Cut" is
 *  technically right but nobody reads it as "you can solo Extreme Kalos." clearRate itself
 *  stays on the party scale so the relevance filter's per-partyLimit thresholds keep meaning
 *  what they did. */
function presentation(clearRate: number, isPartyBoss: boolean, partyLimit: number): {
  displayRate: number; soloable: boolean; soloScalePercent: number | null; tier: BossTier;
} {
  if (!isPartyBoss) return { displayRate: clearRate, soloable: false, soloScalePercent: null, tier: bossTier(clearRate, false, partyLimit) };
  const soloScale = clearRate / soloScaleDivisor(partyLimit);
  if (soloScale >= SOLO_MIN_FLOOR) return { displayRate: soloScale, soloable: true, soloScalePercent: soloScale * 100, tier: bossTier(soloScale, false, 1) };
  return { displayRate: clearRate, soloable: false, soloScalePercent: soloScale * 100, tier: bossTier(clearRate, true, partyLimit) };
}

function bossTier(clearRate: number, isPartyBoss: boolean, partyLimit: number): BossTier {
  if (isPartyBoss) {
    const tiers = PARTY_ONLY_TIERS_BY_LIMIT[partyLimit] ?? PARTY_ONLY_TIERS_DEFAULT;
    return pickTier(clearRate, tiers, IMPOSSIBLE_TIER);
  }
  const tiers = SOLO_TIERS[partyLimit] ?? SOLO_TIERS[6];
  return pickTier(clearRate, tiers, IMPOSSIBLE_TIER);
}

// --- Main per-boss calc (MapleScouter module 33528) ------------------------------------------

export interface BossClearResult {
  /** Always on the party scale for a party-only boss (feeds the relevance filter). */
  clearRate: number;
  /** The displayed figure: clearRate x100, except a soloable party-only boss shows the solo
   *  scale instead (see presentation). */
  clearRatePercent: number;
  tagEnglish: string;
  colorTier: ClearColorTier;
  isPartyBoss: boolean;
  partyLimit: number;
  bossPower: number;
  /** The character's own raw HEXA damage, inverse-splined back into stat-space AFTER the
   *  level, arcane and authentic gap adjustments, meaning what this boss sees as your stat
   *  rather than your flat HEXA figure. Feeds bossPower, and exposed so the UI can show it
   *  directly, as in MapleScouter's own adjusted-stat and clear-percent per-tile display. */
  bossStat: number;
  /** The three damage-loss multipliers that produced bossStat. A value of 1 does not mean no
   *  loss: each stat has its own bonus ceiling above 1 (see the *GapCeiling fields below), and
   *  per the wiki's "Proportion compared to maximum" framing, anything short of that ceiling is
   *  real FD loss even while the multiplier reads 1 or higher. Never compare these to 1 in the
   *  UI. Compare to the matching ceiling instead. */
  levelGapDmg: number;
  arcaneGapDmg: number;
  authenticGapDmg: number;
  /** The max achievable multiplier for each gap on this boss. Level is always 1.2, the wiki's
   *  "+5 or more" bracket, and authentic is always 1.25, but arcane varies per boss: 1.5
   *  normally, 1.1 for Black Mage specifically (see arcaneCorrection above). True FD loss is
   *  1 - gapDmg/gapCeiling, not 1 - gapDmg. A character sitting at the exact requirement reads
   *  gapDmg near 1.0 while still falling well short of gapCeiling. */
  levelGapCeiling: number;
  arcaneGapCeiling: number;
  authenticGapCeiling: number;
  /** Raw boss-vs-character values behind each gap, for a MapleScouter-style contrast line next
   *  to each loss percentage. Arcane/authentic are null when the boss has no requirement (the
   *  matching *GapDmg is 1 in that case and the UI should omit the line entirely). */
  bossLevel: number;
  characterLevel: number;
  bossArcaneForce: number | null;
  characterArcaneForce: number;
  bossAuthenticForce: number | null;
  characterAuthenticForce: number;
  /** MapleScouter's own uncorrected clear%, only where mapledoro deliberately diverges from it
   *  (Champion Black Mage, see effectiveEasyRate), and null everywhere else. Shown in the chip
   *  tooltip so a player cross-checking against Scouter's site sees the difference is intended. */
  scouterClearRatePercent: number | null;
  /** The party-only boss's clear% on the solo scale (see soloScaleDivisor), null for every
   *  boss that already has a solo cut. */
  soloScalePercent: number | null;
  /** True once a party-only boss has flipped to the solo scale (clearRatePercent and the tag
   *  are then solo-scale, and the party-scale figure is clearRate x100). */
  soloable: boolean;
}

const LEVEL_GAP_CEILING = 1.2;
const AUTHENTIC_GAP_CEILING = 1.25;

// Champion Black Mage: MapleScouter's own easyRate is Hard's x1.25, but that 1.25 is the -25%
// Final Damage debuff Champion gets in the 20-minute-timer patch applied as a bonus instead of a
// penalty, so Champion reads ~25% EASIER than Hard when it's harder. The right factor is 0.75,
// and it's 0.75 in both eras by coincidence: today (GMS) Champion has Hard's HP on a 45-minute
// timer vs Hard's 60 (45/60), and after the patch both drop to 1/3 HP on 20 minutes with the
// -25% debuff as Champion's only difference (1 - 0.25). So the rule is Champion = Hard x0.75
// regardless of which timer GMS is on. Derived from the Hard entry at compute time rather than
// a fixed multiplier on Scouter's Champion value, so a future sign fix on their end can't
// double-dip and a retuned Hard flows through. Re-derive only if Nexon changes Champion's HP
// relative to Hard's or the debuff percentage.
const CHAMPION_BLACK_MAGE_VS_HARD = 0.75;
function effectiveEasyRate(entry: BossCutEntry): number {
  const scouterRate = entry.easyRate ?? 1;
  if (entry.name !== "blackMage" || entry.difficulty !== "Champion") return scouterRate;
  const hard = BOSSCUT_DATA.find((e) => e.name === "blackMage" && e.difficulty === "Hard");
  return hard ? (hard.easyRate ?? 1) * CHAMPION_BLACK_MAGE_VS_HARD : scouterRate;
}

/** MapleScouter's Ascent correction on top of the raw damage/cut ratio: Ascent is 3 uses per
 *  fight (usable any time, not cooldown-gated), and the cut is calibrated for all 3 spread over
 *  a full-length fight, so a boss that dies sooner gets a bonus for the same 3 uses landing in
 *  less of its HP. The 20 is their universal 20-minute timer; 5.667 is their pacing assumption
 *  for how many minutes one use "covers" (20 / 5.667 ~ 3.5, so a full fight is the 3-use
 *  baseline). Only bites near or above 100%, and only when ascentConst isn't 1 (their "no
 *  Ascent" sentinel). */
function timerAdjustedClearRate(entry: BossCutEntry, damageOverCut: number, easyRate: number, ascentConst: number): number {
  const preTimerClearRate = damageOverCut * easyRate;
  const ascentR = ascentConst === 1 ? 0 : ascentConst;
  const timerDivisor = entry.boss === "루시드" && entry.difficulty === "Hard" ? 0.4 : Math.min(3, Math.ceil(20 / preTimerClearRate / 5.667));
  const timerCorrection = (3 * ascentR) / timerDivisor - ascentR || 0;
  return preTimerClearRate * (1 + timerCorrection) || 0;
}

/** Adjusts the character's raw HEXA damage for the handful of bosses whose real fight uses a
 *  different damage figure than the plain 300/380 HEXA number. Guardian Angel Slime divides
 *  by genePassConst, Kaling swaps in its own dedicated damage figure, Maerin blends in a slice
 *  of the non-HEXA number. Every other boss passes the plain figure through unchanged. */
function adjustedHexaDamage(bossName: string, guard: number, inputs: BossClearInputs): number {
  if (guard === 300) {
    return bossName === "가엔슬" ? inputs.calculatedHexaDamage300 / (inputs.genePassConst || 1) : inputs.calculatedHexaDamage300;
  }
  if (bossName === "카링") return inputs.calculatedHexaDamageKaling || inputs.calculatedHexaDamage380;
  if (bossName === "메이린") return 0.95 * inputs.calculatedHexaDamage380 + 0.05 * inputs.calculatedDamage380;
  return inputs.calculatedHexaDamage380;
}

/** The raw boss-vs-character values behind the arcane and authentic gaps, nulled out when the
 *  boss has no such requirement, as opposed to 0 loss. Split out of computeBossClear to keep
 *  its cognitive complexity under the sonarjs cap. */
function gapContrastFields(entry: BossCutEntry, hasArcaneReq: boolean, hasAuthenticReq: boolean) {
  return {
    bossArcaneForce: hasArcaneReq ? entry.arcaneForce : null,
    bossAuthenticForce: hasAuthenticReq ? entry.authenticForce : null,
  };
}

/** The three gap*Dmg fields as reported to the UI. Split out of computeBossClear to keep its
 *  own cognitive complexity under the sonarjs cap. */
function reportedGapFields(levelGap: number, arcaneGap: number, authenticGap: number) {
  return {
    levelGapDmg: levelGap,
    arcaneGapDmg: arcaneGap,
    authenticGapDmg: authenticGap,
  };
}

function gapAdjustedDamage(
  rawDamage: number,
  arcaneGap: number,
  authenticGap: number,
  levelGap: number,
  arcaneCorrection: number,
  hasAuthenticReq: boolean,
): number {
  const correctionFactor = 1.2 * arcaneCorrection * (hasAuthenticReq ? 1.25 : 1);
  return (rawDamage * arcaneGap * authenticGap * levelGap) / correctionFactor;
}

/** Computes one boss+difficulty tile's clear rate, tag, and color for a character, or null if
 *  the character's cached Scouter result doesn't have Boss Clear inputs yet (needs a refresh) or
 *  the entry is missing required fields (bossCut/partyBossCut, or guard isn't 300/380).
 *  characterLevel/characterArcaneForce/characterAuthenticForce can be a Scouter Simulator
 *  override (a player-typed "what if I had X Arcane Force" value) rather than the character's
 *  real saved stat. computeBossClear doesn't know which, and the gap math is the same
 *  calculation either way. There is deliberately no "pin this gap to 0% loss" shortcut, since
 *  typing the boss's own requirement achieves that. */
export function computeBossClear(
  entry: BossCutEntry,
  characterLevel: number,
  characterArcaneForce: number,
  characterAuthenticForce: number,
  inputs: BossClearInputs,
): BossClearResult | null {
  if (entry.guard !== 300 && entry.guard !== 380) return null;
  const cutThreshold = entry.bossCut ?? entry.partyBossCut;
  if (cutThreshold === null || cutThreshold === undefined) return null;

  const hasArcaneReq = !!entry.arcaneForce && entry.arcaneForce > 0;
  const hasAuthenticReq = !!entry.authenticForce && entry.authenticForce > 0;
  let arcaneCorrection = 1;
  if (hasArcaneReq) arcaneCorrection = entry.boss === "검은 마법사" ? 1.1 : 1.5;

  const rawDamage = adjustedHexaDamage(entry.boss, entry.guard, inputs);
  const arcaneGap = arcaneGapDmg(entry.arcaneForce, Math.min(characterArcaneForce, 1750));
  const authenticGap = authenticGapDmg(entry.authenticForce, characterAuthenticForce);
  const levelGap = levelGapDmg(characterLevel, entry.level);
  const damage = gapAdjustedDamage(rawDamage, arcaneGap, authenticGap, levelGap, arcaneCorrection, hasAuthenticReq);

  const spline = entry.guard === 300 ? inputs.spline300 : inputs.spline380;
  const cutInDamageSpace = splineEval(spline, cutThreshold);
  const bossStat = splineInverse(spline, damage);

  const damageOverCut = damage / (cutInDamageSpace < 0 ? 1e4 : cutInDamageSpace);
  const scouterEasyRate = entry.easyRate ?? 1;
  const easyRate = effectiveEasyRate(entry);
  const clearRate = timerAdjustedClearRate(entry, damageOverCut, easyRate, inputs.ascentConst);
  const scouterClearRatePercent = easyRate === scouterEasyRate
    ? null
    : timerAdjustedClearRate(entry, damageOverCut, scouterEasyRate, inputs.ascentConst) * 100;

  const isPartyBoss = !!entry.partyBossCut;
  const partyLimit = entry.partyLimit || 6;
  const shown = presentation(clearRate, isPartyBoss, partyLimit);
  const tier = cannotEnter(entry.boss, entry.difficulty, characterLevel) ? CANNOT_ENTER_TIER : shown.tier;

  return {
    clearRate,
    clearRatePercent: shown.displayRate * 100,
    tagEnglish: tier.tag,
    colorTier: tier.color,
    isPartyBoss,
    partyLimit,
    bossPower: convertedBossPower(bossStat, entry.guard),
    bossStat,
    ...reportedGapFields(levelGap, arcaneGap, authenticGap),
    levelGapCeiling: LEVEL_GAP_CEILING,
    arcaneGapCeiling: arcaneCorrection,
    authenticGapCeiling: AUTHENTIC_GAP_CEILING,
    bossLevel: entry.level,
    characterLevel,
    ...gapContrastFields(entry, hasArcaneReq, hasAuthenticReq),
    characterArcaneForce: Math.min(characterArcaneForce, 1750),
    characterAuthenticForce,
    scouterClearRatePercent,
    soloScalePercent: shown.soloScalePercent,
    soloable: shown.soloable,
  };
}

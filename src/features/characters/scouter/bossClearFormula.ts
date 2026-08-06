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

import type { BossCutEntry } from "./bosscut-data.generated";
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
// gap tables above -- below it the boss can't be entered at all, not just "hard."
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

/** Verified real English strings, found in MapleScouter's own i18n dictionary -- not a gloss. */
// Six genuinely distinct hues, one per severity step, best to worst: green -> blue -> red ->
// orange -> purple -> gray. Replaces an earlier attempt at same-hue lightness shifts (e.g. two
// greens for Easy/Possible), which read as identical at a glance -- scrapped in favor of a real
// 6-color ladder instead. Every value here matches its STATUS/statusText key directly
// (BossClearGrid.tsx's pillStatus maps 1:1, no renaming in between).
export type ClearColorTier = "green" | "blue" | "red" | "orange" | "purple" | "gray";

// Single source of truth for every tag's color, so the SAME tag string always renders the SAME
// color everywhere it appears -- both tier tables below reference this instead of assigning
// colors inline. Bug this fixed: "3p Min Cut" rendered purple for a partyLimit-3 boss (its own
// worst tier) but red for a partyLimit-6 boss (a middle tier there), since the two tables used
// to assign colors independently by rank-within-that-table rather than by tag identity --
// identical tag text must mean identical severity, always.
//
// This is also why the party-only table's top tier is "1p Min Cut", not "Solo Min" like the
// soloable table's borderline-pass tier -- they're different concepts (party-only: your own
// damage alone covers the WHOLE party's requirement, the best outcome, green; soloable: you're
// right at the edge of a solo pass, a worse outcome, red) that briefly shared a label and
// therefore collided under this same-tag-same-color rule. Fixed by renaming the party-only one
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

// mapledoro's own tag+color tiers, replacing MapleScouter's two independently-tuned tables
// (SOLO_TAG_TIERS/SOLOABLE_COLOR_TIERS on their site) whose mismatched breakpoints let the same
// tag render in two different colors -- e.g. "Easy" could show green OR their "red" (their
// red meaning "cleared by such a wide margin the number stopped being meaningful," not danger,
// but reading as an alert regardless). That distinction is dropped entirely here -- one tag
// always maps to exactly one color, tuned to the TAG's own breakpoints (the meaningful semantic
// categories), not a second independently-eyeballed scale. Overkill clears just stay "Easy"/
// green with no visual distinction from a more marginal Easy clear.
//
// Bucket breakpoints started as MapleScouter's own original tag tiers (still empirically fit),
// with one deliberate departure: the Possible floor was moved from MapleScouter's 1.1 (110%) to
// 1.3 (130%), per a Discord poll of several players finding 110% didn't feel like a comfortable
// clear in practice (100-150% range of opinions, one citing Kalos specifically) -- 90-129% is
// now Solo Min end to end, matching that "still tight" feel rather than splitting it at a
// threshold nobody agreed felt safe. This is a real, intentional divergence from MapleScouter's
// own displayed tags for the same character, not a bug. Every other breakpoint (Easy, Solo
// Min's own floor, Party-able, Party Min) is untouched.
const SOLO_TIERS: Record<number, [number, BossTier][]> = {
  6: [[2, tier("Easy")], [1.3, tier("Possible")], [0.9, tier("Solo Min")], [0.25, tier("Party-able")], [0.15, tier("Party Min")]],
  3: [[2, tier("Easy")], [1.3, tier("Possible")], [0.9, tier("Solo Min")], [0.36, tier("Party-able")], [0.3, tier("Party Min")]],
  2: [[2, tier("Easy")], [1.3, tier("Possible")], [0.9, tier("Solo Min")], [0.55, tier("Party-able")], [0.45, tier("Party Min")]],
  1: [[2, tier("Easy")], [1.3, tier("Possible")], [0.9, tier("Solo Min")]],
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
  clearRate: number;
  clearRatePercent: number;
  tagEnglish: string;
  colorTier: ClearColorTier;
  isPartyBoss: boolean;
  partyLimit: number;
  bossPower: number;
  /** The character's own raw HEXA damage, inverse-splined back into stat-space AFTER the
   *  level/arcane/authentic gap adjustments -- i.e. what this specific boss actually "sees"
   *  as your stat, not your flat HEXA figure. Feeds bossPower; exposed so the UI can show it
   *  directly (MapleScouter's own "adjusted stat / clear%" per-tile display). */
  bossStat: number;
  /** The three damage-loss multipliers that produced bossStat. IMPORTANT: 1 is NOT "no loss" --
   *  each stat has its own bonus ceiling above 1 (see the *GapCeiling fields below), and per the
   *  wiki's own "Proportion compared to maximum" framing, anything short of that ceiling is real
   *  FD loss even while the multiplier reads >= 1. Never compare these to 1 in the UI; compare
   *  to the matching ceiling instead. */
  levelGapDmg: number;
  arcaneGapDmg: number;
  authenticGapDmg: number;
  /** The max achievable multiplier for each gap on THIS boss -- level is always 1.2 (wiki's "+5
   *  or more" bracket), authentic is always 1.25, but arcane varies per boss (1.5 normally, 1.1
   *  for Black Mage specifically -- see arcaneCorrection above). True FD loss is
   *  1 - gapDmg/gapCeiling, not 1 - gapDmg; a character sitting at the exact requirement reads
   *  gapDmg near 1.0 but can still be well short of gapCeiling. */
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
}

const LEVEL_GAP_CEILING = 1.2;
const AUTHENTIC_GAP_CEILING = 1.25;

/** Adjusts the character's raw HEXA damage for the handful of bosses whose real fight uses a
 *  different damage figure than the plain 300/380 HEXA number -- Guardian Angel Slime divides
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

/** The raw boss-vs-character values behind the arcane/authentic gaps, null'd out when the boss
 *  doesn't have that requirement at all (as opposed to 0 loss) -- split out of computeBossClear
 *  to keep its own cognitive complexity under the sonarjs cap. */
function gapContrastFields(entry: BossCutEntry, hasArcaneReq: boolean, hasAuthenticReq: boolean) {
  return {
    bossArcaneForce: hasArcaneReq ? entry.arcaneForce : null,
    bossAuthenticForce: hasAuthenticReq ? entry.authenticForce : null,
  };
}

/** Computes one boss+difficulty tile's clear rate, tag, and color for a character, or null if
 *  the character's cached Scouter result doesn't have Boss Clear inputs yet (needs a refresh) or
 *  the entry is missing required fields (bossCut/partyBossCut, or guard isn't 300/380). */
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
  const correctionFactor = 1.2 * arcaneCorrection * (hasAuthenticReq ? 1.25 : 1);

  const rawDamage = adjustedHexaDamage(entry.boss, entry.guard, inputs);
  const arcaneGap = arcaneGapDmg(entry.arcaneForce, Math.min(characterArcaneForce, 1750));
  const authenticGap = authenticGapDmg(entry.authenticForce, characterAuthenticForce);
  const levelGap = levelGapDmg(characterLevel, entry.level);
  const gapAdjusted = rawDamage * arcaneGap * authenticGap * levelGap;
  const damage = gapAdjusted / correctionFactor;

  const spline = entry.guard === 300 ? inputs.spline300 : inputs.spline380;
  const cutInDamageSpace = splineEval(spline, cutThreshold);
  const bossStat = splineInverse(spline, damage);

  const preTimerClearRate = (damage / (cutInDamageSpace < 0 ? 1e4 : cutInDamageSpace)) * (entry.easyRate ?? 1);
  const ascentR = inputs.ascentConst === 1 ? 0 : inputs.ascentConst;
  const timerDivisor = entry.boss === "루시드" && entry.difficulty === "Hard" ? 0.4 : Math.min(3, Math.ceil(20 / preTimerClearRate / 5.667));
  const timerCorrection = (3 * ascentR) / timerDivisor - ascentR || 0;
  const clearRate = preTimerClearRate * (1 + timerCorrection) || 0;

  const isPartyBoss = !!entry.partyBossCut;
  const partyLimit = entry.partyLimit || 6;
  const tier = cannotEnter(entry.boss, entry.difficulty, characterLevel) ? CANNOT_ENTER_TIER : bossTier(clearRate, isPartyBoss, partyLimit);

  return {
    clearRate,
    clearRatePercent: clearRate * 100,
    tagEnglish: tier.tag,
    colorTier: tier.color,
    isPartyBoss,
    partyLimit,
    bossPower: convertedBossPower(bossStat, entry.guard),
    bossStat,
    levelGapDmg: levelGap,
    arcaneGapDmg: arcaneGap,
    authenticGapDmg: authenticGap,
    levelGapCeiling: LEVEL_GAP_CEILING,
    arcaneGapCeiling: arcaneCorrection,
    authenticGapCeiling: AUTHENTIC_GAP_CEILING,
    bossLevel: entry.level,
    characterLevel,
    ...gapContrastFields(entry, hasArcaneReq, hasAuthenticReq),
    characterArcaneForce: Math.min(characterArcaneForce, 1750),
    characterAuthenticForce,
  };
}

/*
  Star Force Enhancement data & calculations.
  Based on the GMS post-revamp system (November 2025 / NEXT update).
  Cost formulas match brendonmay's reference calculator.

  Key changes from the revamp:
  - Stars no longer drop on failure (maintain at current star)
  - Revised success & destruction rates
  - Revised cost formulas for certain star ranges
*/

// -- Options ------------------------------------------------------------------

export type MvpTier = "none" | "silver" | "gold" | "diamond";

export interface StarForceOpts {
  level: number;
  startStar: number;
  targetStar: number;
  replacementCost: number;
  costDiscount: boolean;   // 30% off Sunny Sunday
  boomReduction: boolean;  // 30% boom reduction Sunny Sunday
  starCatch: boolean;      // +5% multiplicative success
  safeguard: boolean;      // boom protection at stars 15-17 (3x cost)
  mvp: MvpTier;
  boomTier?: number;       // experimental enhancement mode 1-4 (stars 15-21); 1 = baseline
}

// -- Rates --------------------------------------------------------------------

/** Success rate for enhancing from star S to S+1 (index = current star). */
const SUCCESS_RATE: readonly number[] = [
  0.95, 0.90, 0.85, 0.85, 0.80,  //  0- 4
  0.75, 0.70, 0.65, 0.60, 0.55,  //  5- 9
  0.50, 0.45, 0.40, 0.35, 0.30,  // 10-14
  0.30, 0.30, 0.15, 0.15, 0.15,  // 15-19
  0.30, 0.15, 0.15, 0.10, 0.10,  // 20-24
  0.10, 0.07, 0.05, 0.03, 0.01,  // 25-29
];

/** Destruction (boom) rate at star S (index = current star). */
const DESTROY_RATE: readonly number[] = [
  0,     0,     0,     0,     0,      //  0- 4
  0,     0,     0,     0,     0,      //  5- 9
  0,     0,     0,     0,     0,      // 10-14
  0.021, 0.021, 0.068, 0.068, 0.085, // 15-19
  0.105, 0.1275,0.17,  0.18,  0.18,  // 20-24
  0.18,  0.186, 0.19,  0.194, 0.198, // 25-29
];

/** Maintain rate at star S (index = current star). */
const MAINTAIN_RATE: readonly number[] = [
  0.05, 0.10, 0.15, 0.15, 0.20,     //  0- 4
  0.25, 0.30, 0.35, 0.40, 0.45,     //  5- 9
  0.50, 0.55, 0.60, 0.65, 0.70,     // 10-14
  0.679,0.679, 0.782,0.782,0.765,   // 15-19
  0.595,0.7225,0.68, 0.72, 0.72,    // 20-24
  0.72, 0.744, 0.76, 0.776,0.792,   // 25-29
];

/** Highest star the UI can enhance to. Index 29 is the last enhanceable star. */
export const MAX_STAR = 30;

/** When destroyed at star S, the trace restores to this star (GMS). */
function restorePoint(star: number): number {
  if (star < 20)  return 12;
  if (star === 20) return 15;
  if (star < 23)  return 17;  // 21-22
  if (star < 26)  return 19;  // 23-25
  return 20;                   // 26-29
}

// -- Boom reduction tier (experimental) ---------------------------------------

/*
  Experimental "Enhancement Mode" boom-reduction system (Tespia). Eligible at
  stars 15-21 (i.e. enhancing up to 22★). Tables are indexed [star][tier - 1];
  tier 1 is the baseline (reproduces the default SUCCESS/DESTROY rates), tiers
  2-4 trade higher cost for lower destruction. Cost values are additive deltas
  on top of the base multiplier of 1, matching the safeguard convention.
*/

const BOOM_TIER_COST_MULT_INCREASE: Record<number, readonly number[]> = {
  15: [0, 0.5, 1.5, 2],
  16: [0, 0.5, 1.5, 2],
  17: [0, 0.5, 1.5, 2],
  18: [0, 1, 2.5, 5.5],
  19: [0, 1, 2.5, 5.5],
  20: [0, 1, 2.5, 5.5],
  21: [0, 1, 2.5, 5.5],
};

const BOOM_TIER_DESTROY_RATES: Record<number, readonly number[]> = {
  15: [0.0210, 0.0140, 0.0070, 0],
  16: [0.0210, 0.0140, 0.0070, 0],
  17: [0.0680, 0.0425, 0.0170, 0],
  18: [0.0680, 0.0440, 0.0180, 0],
  19: [0.0850, 0.0616, 0.0360, 0],
  20: [0.1050, 0.0750, 0.0400, 0],
  21: [0.1275, 0.0880, 0.0450, 0],
};

const BOOM_TIER_SUCCESS_RATES: Record<number, readonly number[]> = {
  15: [0.30, 0.30, 0.30, 0.30],
  16: [0.30, 0.30, 0.30, 0.30],
  17: [0.15, 0.15, 0.15, 0.15],
  18: [0.15, 0.12, 0.10, 0.08],
  19: [0.15, 0.12, 0.10, 0.08],
  20: [0.30, 0.25, 0.20, 0.15],
  21: [0.15, 0.12, 0.10, 0.08],
};

/** Number of selectable enhancement-mode tiers (1-4). */
export const BOOM_TIER_COUNT = 4;

/** A boom tier override applies only at stars 15-21 with a tier above baseline. */
function boomTierActive(star: number, boomTier: number | undefined): boolean {
  return (boomTier ?? 1) > 1 && star >= 15 && star <= 21;
}

// -- Cost formula -------------------------------------------------------------

/*
  Reference: 100 * round( extraMult * floor(level/10)^3 * (star+1)^exp / divisor + 10 )

  Stars 0-9:   exp=1.0, divisor=2500
  Stars 10-14: exp=2.7, divisor varies (40000, 22000, 15000, 11000, 7500)
  Stars 15-16: exp=2.7, divisor=20000
  Star 17:     exp=2.7, divisor=20000, extraMult=4/3
  Star 18:     exp=2.7, divisor=20000, extraMult=20/7
  Star 19:     exp=2.7, divisor=20000, extraMult=40/9
  Star 20:     exp=2.7, divisor=20000
  Star 21:     exp=2.7, divisor=20000, extraMult=8/5
  Stars 22-29: exp=2.7, divisor=20000
*/

function makeCost(divisor: number, exp: number, extraMult: number) {
  return (L3: number, S1: number) =>
    100 * Math.round(extraMult * L3 * Math.pow(S1, exp) / divisor + 10);
}

const COST_FN: ((L3: number, S1: number) => number)[] = [
  makeCost(2500,  1.0, 1),     //  0
  makeCost(2500,  1.0, 1),     //  1
  makeCost(2500,  1.0, 1),     //  2
  makeCost(2500,  1.0, 1),     //  3
  makeCost(2500,  1.0, 1),     //  4
  makeCost(2500,  1.0, 1),     //  5
  makeCost(2500,  1.0, 1),     //  6
  makeCost(2500,  1.0, 1),     //  7
  makeCost(2500,  1.0, 1),     //  8
  makeCost(2500,  1.0, 1),     //  9
  makeCost(40000, 2.7, 1),     // 10
  makeCost(22000, 2.7, 1),     // 11
  makeCost(15000, 2.7, 1),     // 12
  makeCost(11000, 2.7, 1),     // 13
  makeCost(7500,  2.7, 1),     // 14
  makeCost(20000, 2.7, 1),     // 15
  makeCost(20000, 2.7, 1),     // 16
  makeCost(20000, 2.7, 4/3),   // 17
  makeCost(20000, 2.7, 20/7),  // 18
  makeCost(20000, 2.7, 40/9),  // 19
  makeCost(20000, 2.7, 1),     // 20
  makeCost(20000, 2.7, 8/5),   // 21
  makeCost(20000, 2.7, 1),     // 22
  makeCost(20000, 2.7, 1),     // 23
  makeCost(20000, 2.7, 1),     // 24
  makeCost(20000, 2.7, 1),     // 25
  makeCost(20000, 2.7, 1),     // 26
  makeCost(20000, 2.7, 1),     // 27
  makeCost(20000, 2.7, 1),     // 28
  makeCost(20000, 2.7, 1),     // 29
];

/** Base meso cost for one attempt (before multiplier). */
function baseCost(level: number, star: number): number {
  const L = Math.floor(level / 10) * 10;
  const L3 = L * L * L;
  return COST_FN[star](L3, star + 1);
}

const MVP_DISCOUNT: Record<MvpTier, number> = {
  none: 0,
  silver: 0.03,
  gold: 0.05,
  diamond: 0.10,
};

/**
 * Final meso cost for one attempt at star S, including all multipliers.
 *
 * The events (MVP / 30% off) and safeguard adjust the base cost first; the
 * Enhancement Mode surcharge then multiplies that event-adjusted cost (so the
 * 30% off discounts the surcharge too). Multiplier starts at 1, then:
 *  - MVP discount (star ≤ 15): subtract tier %
 *  - 30% off event: subtract 0.30
 *  - Safeguard (stars 15-17): add 2  (triples the cost)
 *  - Enhancement Mode (stars 15-21): multiply by (1 + the tier's cost delta)
 */
export function attemptCost(level: number, star: number, opts: StarForceOpts): number {
  const base = baseCost(level, star);
  let mult = 1;
  if (star <= 15) mult -= MVP_DISCOUNT[opts.mvp];
  if (opts.costDiscount) mult -= 0.3;
  if (opts.safeguard && star >= 15 && star <= 17) mult += 2;
  if (boomTierActive(star, opts.boomTier)) {
    mult *= 1 + BOOM_TIER_COST_MULT_INCREASE[star][opts.boomTier! - 1];
  }
  return Math.round(base * mult);
}

// -- Rate adjustments ---------------------------------------------------------

interface AdjustedRates {
  success: number;
  maintain: number;
  boom: number;
}

/**
 * Compute adjusted rates for a star considering all active options.
 *
 * Order of operations (matching reference):
 *  0. Enhancement Mode (stars 15-21): override base success & boom with the tier's rates
 *  1. Safeguard (stars 15-17): boom → maintain
 *  2. Boom reduction event (stars ≤ 21): boom *= 0.7, excess → maintain
 *     (stacks on top of the Enhancement Mode rate — base × 0.7 × tier factor)
 *  3. Star catching: success *= 1.05, redistribute leftover proportionally
 */
function adjustedRates(star: number, opts: StarForceOpts): AdjustedRates {
  let success = SUCCESS_RATE[star];
  let maintain = MAINTAIN_RATE[star];
  let boom = DESTROY_RATE[star];

  // Boom tier (experimental): stars 15-21, overrides base success & boom rates
  if (boomTierActive(star, opts.boomTier)) {
    const idx = opts.boomTier! - 1;
    success = BOOM_TIER_SUCCESS_RATES[star][idx];
    boom = BOOM_TIER_DESTROY_RATES[star][idx];
    maintain = 1 - success - boom; // no star decrease post-revamp
  }

  // Safeguard: stars 15-17, boom moves to maintain
  if (opts.safeguard && star >= 15 && star <= 17) {
    maintain += boom;
    boom = 0;
  }

  // Boom reduction event: stars ≤ 21
  if (opts.boomReduction && boom > 0 && star <= 21) {
    maintain += boom * 0.3;
    boom *= 0.7;
  }

  // Star catching: +5% multiplicative success, redistribute leftover
  if (opts.starCatch) {
    success *= 1.05;
    const leftover = 1 - success;
    if (boom === 0) {
      maintain = leftover;
    } else {
      const ratio = maintain / (maintain + boom);
      maintain = leftover * ratio;
      boom = leftover - maintain;
    }
  }

  return { success, maintain, boom };
}

// -- Expected cost calculation ------------------------------------------------

export interface StarResult {
  star: number;
  cost: number;
  success: number;
  destroy: number;
  expectedCost: number;
  expectedBooms: number;
}

export function computeExpectedCosts(opts: StarForceOpts): StarResult[] {
  const { level, startStar, targetStar, replacementCost } = opts;
  if (startStar >= targetStar) return [];

  const results: StarResult[] = [];
  const lowestNeeded = Math.min(startStar, 12);
  const E: number[] = new Array(30).fill(0);
  const N: number[] = new Array(30).fill(0);

  for (let s = lowestNeeded; s < targetStar; s++) {
    const cost = attemptCost(level, s, opts);
    const { success, boom } = adjustedRates(s, opts);

    if (boom === 0) {
      E[s] = cost / success;
      N[s] = 0;
    } else {
      const rp = restorePoint(s);
      let reworkCost = 0;
      let reworkBooms = 0;
      for (let i = rp; i < s; i++) {
        reworkCost += E[i];
        reworkBooms += N[i];
      }
      E[s] = (cost + boom * (replacementCost + reworkCost)) / success;
      N[s] = (boom * (1 + reworkBooms)) / success;
    }

    if (s >= startStar) {
      results.push({
        star: s,
        cost,
        success,
        destroy: boom,
        expectedCost: E[s],
        expectedBooms: N[s],
      });
    }
  }

  return results;
}

// -- Cost estimation ----------------------------------------------------------

/**
 * Expected number of enhancement attempts for one simulated run, booms and the
 * rework they force included. Same recurrence as {@link computeExpectedCosts}
 * with a unit cost per attempt.
 *
 * One attempt is one iteration of the simulation's inner loop, so this is a
 * closed-form price tag for a run: multiply by the trial count. It matters
 * because the cost is not linear in the target star. Reaching 30★ needs on the
 * order of a million attempts per trial, since a boom at 29★ (19.8% chance
 * against a 1% success rate) drops the item back to 20★.
 */
export function expectedAttempts(opts: StarForceOpts): number {
  const { startStar, targetStar } = opts;
  if (startStar >= targetStar) return 0;

  const A: number[] = new Array(30).fill(0);
  const lowestNeeded = Math.min(startStar, 12);
  let total = 0;

  for (let s = lowestNeeded; s < targetStar; s++) {
    const { success, boom } = adjustedRates(s, opts);

    if (boom === 0) {
      A[s] = 1 / success;
    } else {
      const rp = restorePoint(s);
      let rework = 0;
      for (let i = rp; i < s; i++) rework += A[i];
      A[s] = (1 + boom * rework) / success;
    }

    if (s >= startStar) total += A[s];
  }

  return total;
}

// -- Monte Carlo simulation ---------------------------------------------------

/** mulberry32. Monte Carlo wants speed and uniformity, not cryptographic
 *  strength; `crypto` is used once, for the seed. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSeed(): number {
  const seed = new Uint32Array(1);
  crypto.getRandomValues(seed);
  return seed[0];
}

export interface SimulationResult {
  meanCost: number;
  medianCost: number;
  meanBooms: number;
  medianBooms: number;
  p75Cost: number;
  p85Cost: number;
  p95Cost: number;
  minCost: number;
  maxCost: number;
  /** Per-trial totals, ascending — for distribution/histogram rendering. */
  costs: Float64Array;
  booms: Float64Array;
}

function percentile(sorted: Float64Array, p: number): number {
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

/** A simulation that can be advanced in slices and abandoned part-way. */
export interface SimulationRun {
  readonly trials: number;
  /** Trials finished so far. */
  readonly completed: number;
  /** Advance for at most `budgetMs`. Returns true once every trial is done. */
  step(budgetMs: number): boolean;
  /** Aggregate the trials. Only meaningful once `step` has returned true. */
  result(): SimulationResult;
}

// The clock is only consulted every N attempts: `performance.now()` costs more
// than the loop body it guards.
const DEADLINE_CHECK_INTERVAL = 4096;

/**
 * Monte Carlo star-force run, resumable mid-trial.
 *
 * A single trial toward 30★ can take over 100 ms on its own, so the budget is
 * checked inside the attempt loop rather than between trials. That keeps the
 * caller free to paint, report progress, and cancel.
 */
export function startSimulation(opts: StarForceOpts, trials: number): SimulationRun {
  const { level, startStar, targetStar, replacementCost } = opts;
  const total = startStar >= targetStar ? 0 : Math.max(0, trials);

  // Per-star lookup tables. `keep` is the roll below which the item survives,
  // i.e. 1 - boom: success and maintain both land under it. Precomputing it
  // keeps the inner loop to one comparison per outcome.
  const cost = new Float64Array(30);
  const success = new Float64Array(30);
  const keep = new Float64Array(30);
  const restore = new Int32Array(30);
  for (let s = 0; s < 30; s++) {
    cost[s] = attemptCost(level, s, opts);
    const r = adjustedRates(s, opts);
    success[s] = r.success;
    keep[s] = 1 - r.boom;
    restore[s] = restorePoint(s);
  }

  const rng = mulberry32(randomSeed());
  const allCosts = new Float64Array(total);
  const allBooms = new Float64Array(total);

  let completed = 0;
  let star = startStar;
  let trialCost = 0;
  let trialBooms = 0;

  return {
    trials: total,
    get completed() {
      return completed;
    },

    step(budgetMs: number): boolean {
      if (completed >= total) return true;
      const deadline = performance.now() + budgetMs;
      let sinceCheck = 0;

      while (completed < total) {
        if (star >= targetStar) {
          allCosts[completed] = trialCost;
          allBooms[completed] = trialBooms;
          completed++;
          star = startStar;
          trialCost = 0;
          trialBooms = 0;
          continue;
        }

        trialCost += cost[star];
        const roll = rng();
        if (roll < success[star]) {
          star++;
        } else if (roll >= keep[star]) {
          trialBooms++;
          trialCost += replacementCost;
          star = restore[star];
        }
        // Otherwise the item maintains: it cost a try and nothing moved.

        if (++sinceCheck >= DEADLINE_CHECK_INTERVAL) {
          sinceCheck = 0;
          if (performance.now() >= deadline) return false;
        }
      }
      return true;
    },

    result(): SimulationResult {
      allCosts.sort();
      allBooms.sort();

      let sumCost = 0;
      let sumBooms = 0;
      for (let i = 0; i < total; i++) {
        sumCost += allCosts[i];
        sumBooms += allBooms[i];
      }

      return {
        meanCost: sumCost / total,
        medianCost: percentile(allCosts, 0.5),
        meanBooms: sumBooms / total,
        medianBooms: percentile(allBooms, 0.5),
        p75Cost: percentile(allCosts, 0.75),
        p85Cost: percentile(allCosts, 0.85),
        p95Cost: percentile(allCosts, 0.95),
        minCost: allCosts[0],
        maxCost: allCosts[total - 1],
        costs: allCosts,
        booms: allBooms,
      };
    },
  };
}

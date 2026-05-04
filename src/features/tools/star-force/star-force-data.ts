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
}

// -- Rates --------------------------------------------------------------------

/** Success rate for enhancing from star S to S+1 (index = current star). */
export const SUCCESS_RATE: readonly number[] = [
  0.95, 0.90, 0.85, 0.85, 0.80,  //  0- 4
  0.75, 0.70, 0.65, 0.60, 0.55,  //  5- 9
  0.50, 0.45, 0.40, 0.35, 0.30,  // 10-14
  0.30, 0.30, 0.15, 0.15, 0.15,  // 15-19
  0.30, 0.15, 0.15, 0.10, 0.10,  // 20-24
  0.10, 0.07, 0.05, 0.03, 0.01,  // 25-29
];

/** Destruction (boom) rate at star S (index = current star). */
export const DESTROY_RATE: readonly number[] = [
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

/** When destroyed at star S, the trace restores to this star (GMS). */
export function restorePoint(star: number): number {
  if (star < 20)  return 12;
  if (star === 20) return 15;
  if (star < 23)  return 17;  // 21-22
  if (star < 26)  return 19;  // 23-25
  return 20;                   // 26-29
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
export function baseCost(level: number, star: number): number {
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
 * Multiplier starts at 1, then:
 *  - MVP discount (star ≤ 15): subtract tier %
 *  - 30% off event: subtract 0.30
 *  - Safeguard (stars 15-17): add 2  (triples the cost)
 */
export function attemptCost(level: number, star: number, opts: StarForceOpts): number {
  const base = baseCost(level, star);
  let mult = 1;
  if (star <= 15) mult -= MVP_DISCOUNT[opts.mvp];
  if (opts.costDiscount) mult -= 0.3;
  if (opts.safeguard && star >= 15 && star <= 17) mult += 2;
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
 *  1. Safeguard (stars 15-17): boom → maintain
 *  2. Boom reduction event (stars ≤ 21): boom *= 0.7, excess → maintain
 *  3. Star catching: success *= 1.05, redistribute leftover proportionally
 */
function adjustedRates(star: number, opts: StarForceOpts): AdjustedRates {
  let success = SUCCESS_RATE[star];
  let maintain = MAINTAIN_RATE[star];
  let boom = DESTROY_RATE[star];

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

// -- Monte Carlo simulation ---------------------------------------------------

/** Batched crypto RNG (avoids per-call overhead of getRandomValues). */
class SecureRng {
  private buf = new Uint32Array(2048);
  private idx = 2048;

  next(): number {
    if (this.idx >= this.buf.length) {
      crypto.getRandomValues(this.buf);
      this.idx = 0;
    }
    return this.buf[this.idx++] / 0x100000000;
  }
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
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function simulate(opts: StarForceOpts, trials: number): SimulationResult {
  const { level, startStar, targetStar, replacementCost } = opts;

  // Pre-compute per-star cost & rates
  const costs: number[] = [];
  const success: number[] = [];
  const boom: number[] = [];
  for (let s = 0; s < 30; s++) {
    costs[s] = attemptCost(level, s, opts);
    const r = adjustedRates(s, opts);
    success[s] = r.success;
    boom[s] = r.boom;
  }

  const rng = new SecureRng();
  const allCosts: number[] = new Array(trials);
  const allBooms: number[] = new Array(trials);

  for (let t = 0; t < trials; t++) {
    let star = startStar;
    let totalCost = 0;
    let totalBooms = 0;

    while (star < targetStar) {
      totalCost += costs[star];
      const roll = rng.next();

      if (roll < success[star]) {
        star++;
      } else if (roll < success[star] + (1 - success[star] - boom[star])) {
        // Maintain
      } else if (boom[star] > 0) {
        totalBooms++;
        totalCost += replacementCost;
        star = restorePoint(star);
      }
    }

    allCosts[t] = totalCost;
    allBooms[t] = totalBooms;
  }

  allCosts.sort((a, b) => a - b);
  allBooms.sort((a, b) => a - b);

  const sumCost = allCosts.reduce((a, b) => a + b, 0);
  const sumBooms = allBooms.reduce((a, b) => a + b, 0);

  return {
    meanCost: sumCost / trials,
    medianCost: percentile(allCosts, 0.5),
    meanBooms: sumBooms / trials,
    medianBooms: percentile(allBooms, 0.5),
    p75Cost: percentile(allCosts, 0.75),
    p85Cost: percentile(allCosts, 0.85),
    p95Cost: percentile(allCosts, 0.95),
    minCost: allCosts[0],
    maxCost: allCosts[allCosts.length - 1],
  };
}

// -- Formatting ---------------------------------------------------------------

export function formatMeso(n: number): string {
  if (n >= 1_000_000_000_000) {
    return (n / 1_000_000_000_000).toFixed(1).replace(/\.0$/, "") + "T";
  }
  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  return new Intl.NumberFormat("en-US").format(Math.floor(n));
}

export function formatMesoFull(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.floor(n));
}

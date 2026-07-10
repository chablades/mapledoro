/*
  Flaming Calculator data & probability engine.
  Reference: brendonmay's flame calculator.
  Data: https://strategywiki.org/wiki/MapleStory/Bonus_Stats#Flame_Advantage
*/

export type FlameClass = "other" | "db" | "cadena" | "shadower" | "xenon" | "da";
export type FlameType = "powerful" | "eternal" | "reincarnation" | "drop" | "fusion" | "masterFusion" | "meisterFusion";
export type ItemType = "armor" | "weapon";

export const FLAME_CLASS_OPTIONS: { value: FlameClass; label: string }[] = [
  { value: "other", label: "Default" },
  { value: "db", label: "Dual Blade" },
  { value: "cadena", label: "Cadena" },
  { value: "shadower", label: "Shadower" },
  { value: "xenon", label: "Xenon" },
  { value: "da", label: "Demon Avenger" },
];

export const FLAME_TYPE_OPTIONS: { value: FlameType; label: string }[] = [
  { value: "powerful", label: "Powerful (Red)" },
  { value: "eternal", label: "Eternal (Rainbow)" },
  { value: "reincarnation", label: "Abyssal (Rebirth)" },
];

export const ARMOR_LEVELS = ["120-139", "140-159", "160-179", "180-199", "200-229", "230-249", "250+"] as const;
export const WEAPON_LEVELS = ["160-199", "200+"] as const;
export const GRANULAR_LEVELS = [
  "120-129", "130-139", "140-149", "150-159", "160-169", "170-179",
  "180-189", "190-199", "200-209", "210-219", "220-229", "230-239", "240-249", "250+",
] as const;

// -- Tier probabilities -------------------------------------------------------

const TIER_PROBABILITIES: Record<FlameType, Record<number, number>> = {
  drop:          { 3: 0.25, 4: 0.3,  5: 0.3,  6: 0.14, 7: 0.01 },
  powerful:      { 3: 0.2,  4: 0.3,  5: 0.36, 6: 0.14, 7: 0    },
  eternal:       { 3: 0,    4: 0.29, 5: 0.45, 6: 0.25, 7: 0.01 },
  reincarnation: { 3: 0,    4: 0,    5: 0.63, 6: 0.34, 7: 0.03 },
  fusion:        { 3: 0.5,  4: 0.4,  5: 0.1,  6: 0,    7: 0    },
  masterFusion:  { 3: 0.25, 4: 0.35, 5: 0.3,  6: 0.1,  7: 0    },
  meisterFusion: { 3: 0,    4: 0.4,  5: 0.45, 6: 0.14, 7: 0.01 },
};

const NON_ADVANTAGED_LINE_PROBS: Record<number, number> = { 1: 0.40, 2: 0.40, 3: 0.15, 4: 0.05 };

// -- Stat-per-tier tables -----------------------------------------------------

const STAT_PER_TIER: Record<string, number> = {
  "120-139": 7, "140-159": 8, "160-179": 9, "180-199": 10,
  "200-229": 11, "230-249": 12, "250+": 12,
};

const COMBO_PER_TIER: Record<string, number> = {
  "120-139": 4, "140-159": 4, "160-179": 5, "180-199": 5,
  "200-229": 6, "230-249": 6, "250+": 7,
};

const HP_PER_TIER: Record<string, number> = {
  "120-129": 360, "130-139": 390, "140-149": 420, "150-159": 450,
  "160-169": 480, "170-179": 510, "180-189": 540, "190-199": 570,
  "200-209": 600, "210-219": 620, "220-229": 640, "230-239": 660,
  "240-249": 680, "250+": 700,
};

const WATT_PER_TIER_ADV: Record<string, Record<number, number>> = {
  "160-199": { 3: 0.15, 4: 0.22, 5: 0.3025, 6: 0.3993, 7: 0.512435 },
  "200+":    { 3: 0.18, 4: 0.264, 5: 0.363, 6: 0.47916, 7: 0.614922 },
};

const WATT_PER_TIER_NON_ADV: Record<string, Record<number, number>> = {
  "160-199": { 1: 0.05, 2: 0.11, 3: 0.185, 4: 0.2662, 5: 0.366025, 6: 0.43923, 7: 0.512435 },
  "200+":    { 1: 0.06, 2: 0.132, 3: 0.2178, 4: 0.31944, 5: 0.43923, 6: 0.527076, 7: 0.614922 },
};

// -- Helpers ------------------------------------------------------------------

// Multiplicative form. The factorial form overflows Number.MAX_SAFE_INTEGER
// from n = 18 up, and the pool sizes here reach 21.
function combination(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  const k = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

function makeNonAdvantaged(probs: Record<number, number>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [tier, p] of Object.entries(probs)) out[Number(tier) - 2] = p;
  return out;
}

function getTierProbabilities(flameType: FlameType, nonAdvantaged: boolean): Record<number, number> {
  const base = TIER_PROBABILITIES[flameType];
  return nonAdvantaged ? makeNonAdvantaged(base) : base;
}

function getLowerTierLimit(flameType: FlameType, nonAdvantaged: boolean): number {
  const adj = nonAdvantaged ? 2 : 0;
  for (let i = 3; i <= 7; i++) {
    if (TIER_PROBABILITIES[flameType][i] > 0) return i - adj;
  }
  return 3;
}

function getUpperTierLimit(flameType: FlameType, nonAdvantaged: boolean): number {
  const adj = nonAdvantaged ? 2 : 0;
  for (let i = 7; i >= 3; i--) {
    if (TIER_PROBABILITIES[flameType][i] > 0) return i - adj + 1;
  }
  return 8;
}

function toCoarseLevel(granular: string): string {
  const map: Record<string, string> = {
    "120-129": "120-139", "130-139": "120-139",
    "140-149": "140-159", "150-159": "140-159",
    "160-169": "160-179", "170-179": "160-179",
    "180-189": "180-199", "190-199": "180-199",
    "200-209": "200-229", "210-219": "200-229", "220-229": "200-229",
    "230-239": "230-249", "240-249": "230-249",
    "250+": "250+",
  };
  return map[granular] ?? granular;
}

function getChooseFrom(cls: FlameClass): number {
  if (cls === "xenon" || cls === "db" || cls === "shadower" || cls === "cadena") return 8;
  return 10;
}

function getLineProbability(
  neutralCount: number,
  activeLines: number,
  nonAdvantaged: boolean,
  totalPool: number,
): number {
  if (activeLines === 0) return 0;

  if (!nonAdvantaged) {
    return combination(neutralCount, 4 - activeLines) / combination(totalPool, 4);
  }

  let p = 0;
  for (let n = activeLines; n <= 4; n++) {
    p += NON_ADVANTAGED_LINE_PROBS[n] * combination(neutralCount, n - activeLines) / combination(totalPool, n);
  }
  return p;
}

// -- Stat equivalences --------------------------------------------------------

export interface StatEquivalences {
  allStat: number;
  attack: number;
  secondaryStat: number;
  dmg: number;
  lukStat: number;
  hpStat: number;
  dexStat: number;
  strStat: number;
}

export function defaultEquivalences(cls: FlameClass): StatEquivalences {
  const base: StatEquivalences = {
    allStat: 10, attack: 3, secondaryStat: 12, dmg: 15,
    lukStat: 11, hpStat: 350, dexStat: 12, strStat: 12,
  };
  if (cls === "xenon") return { ...base, allStat: 25, attack: 6, dmg: 30 };
  if (cls === "db" || cls === "shadower" || cls === "cadena") return { ...base, dmg: 13, dexStat: 12, strStat: 12 };
  if (cls === "da") return { ...base, attack: 78, dmg: 390 };
  return base;
}

export function defaultDesiredStat(cls: FlameClass, itemType: ItemType): number {
  if (cls === "da") return itemType === "weapon" ? 15000 : 3000;
  if (cls === "xenon") return itemType === "weapon" ? 700 : 230;
  return itemType === "weapon" ? 500 : 100;
}

// -- Flame line builder -------------------------------------------------------

interface FlameLine {
  contribution: (tier: number) => number;
}

interface LineCtx {
  spt: number;
  cpt: number;
  eq: StatEquivalences;
  attackFn: (tier: number) => number;
}

function daLines(itemLevel: string, ctx: LineCtx): FlameLine[] {
  const hpt = HP_PER_TIER[itemLevel] ?? 600;
  return [
    { contribution: (t) => t * hpt },
    { contribution: ctx.attackFn },
  ];
}

function dualStatLines(ctx: LineCtx): FlameLine[] {
  const { spt, cpt, eq, attackFn } = ctx;
  const dexEquiv = eq.dexStat > 0 ? 1 / eq.dexStat : 0;
  const strEquiv = eq.strStat > 0 ? 1 / eq.strStat : 0;
  return [
    { contribution: (t) => t * spt },
    { contribution: (t) => t * spt * dexEquiv },
    { contribution: (t) => t * spt * strEquiv },
    { contribution: (t) => t * cpt },
    { contribution: (t) => t * cpt * (1 + strEquiv) },
    { contribution: (t) => t * cpt * (1 + dexEquiv) },
    { contribution: (t) => t * cpt * strEquiv },
    { contribution: (t) => t * cpt * (strEquiv + dexEquiv) },
    { contribution: (t) => t * cpt * dexEquiv },
    { contribution: (t) => t * eq.allStat },
    { contribution: attackFn },
  ];
}

function xenonLines(ctx: LineCtx): FlameLine[] {
  const { spt, cpt, eq, attackFn } = ctx;
  return [
    { contribution: (t) => t * spt },
    { contribution: (t) => t * spt },
    { contribution: (t) => t * spt },
    { contribution: (t) => t * cpt },
    { contribution: (t) => t * cpt },
    { contribution: (t) => t * cpt },
    { contribution: (t) => t * 2 * cpt },
    { contribution: (t) => t * 2 * cpt },
    { contribution: (t) => t * 2 * cpt },
    { contribution: (t) => t * eq.allStat },
    { contribution: attackFn },
  ];
}

function otherLines(ctx: LineCtx, secEquiv: number): FlameLine[] {
  const { spt, cpt, eq, attackFn } = ctx;
  return [
    { contribution: (t) => t * spt },
    { contribution: (t) => t * spt * secEquiv },
    { contribution: (t) => t * cpt * (1 + secEquiv) },
    { contribution: (t) => t * cpt },
    { contribution: (t) => t * cpt },
    { contribution: (t) => t * cpt * secEquiv },
    { contribution: (t) => t * cpt * secEquiv },
    { contribution: (t) => t * eq.allStat },
    { contribution: attackFn },
  ];
}

function buildFlameLines(
  cls: FlameClass,
  itemType: ItemType,
  itemLevel: string,
  weaponLevel: string,
  baseAttack: number,
  eq: StatEquivalences,
  nonAdvantaged: boolean,
): FlameLine[] {
  const coarse = toCoarseLevel(itemLevel);
  const spt = STAT_PER_TIER[coarse] ?? 11;
  const cpt = COMBO_PER_TIER[coarse] ?? 6;

  const attackFn = (tier: number): number => {
    if (tier === 0) return 0;
    if (itemType === "armor") return tier * eq.attack;
    const table = nonAdvantaged ? WATT_PER_TIER_NON_ADV : WATT_PER_TIER_ADV;
    const perc = table[weaponLevel]?.[tier] ?? 0;
    return baseAttack * perc * eq.attack;
  };

  const ctx: LineCtx = { spt, cpt, eq, attackFn };
  const secEquiv = eq.secondaryStat > 0 ? 1 / eq.secondaryStat : 0;

  const CLASS_LINE_BUILDERS: Record<FlameClass, () => FlameLine[]> = {
    da: () => daLines(itemLevel, ctx),
    db: () => dualStatLines(ctx),
    shadower: () => dualStatLines(ctx),
    cadena: () => dualStatLines(ctx),
    xenon: () => xenonLines(ctx),
    other: () => otherLines(ctx, secEquiv),
  };

  const lines = CLASS_LINE_BUILDERS[cls]();

  if (itemType === "weapon") {
    lines.push({ contribution: (t) => t * 2 * eq.dmg });
    lines.push({ contribution: (t) => t * eq.dmg });
  }

  return lines;
}

// -- Core probability engine --------------------------------------------------

export interface FlameResults {
  probability: number;
  mean: number;
  p75: number;
  p85: number;
  p95: number;
  flameTypeText: string;
}

function geoQuantile(p: number, q: number): number {
  if (p <= 0 || p >= 1) return p >= 1 ? 1 : Infinity;
  return Math.log(1 - q) / Math.log(1 - p);
}

function getFlameTypeText(flameType: FlameType): string {
  if (flameType === "drop") return "drops";
  if (flameType === "fusion" || flameType === "masterFusion" || flameType === "meisterFusion") return "fuses";
  if (flameType === "reincarnation") return "abyssal flames";
  return `${flameType} flames`;
}

export function computeFlameResults(params: {
  flameClass: FlameClass;
  itemType: ItemType;
  flameType: FlameType;
  itemLevel: string;
  weaponLevel: string;
  baseAttack: number;
  flameAdvantaged: boolean;
  desiredStat: number;
  equivalences: StatEquivalences;
}): FlameResults | null {
  const { flameClass, itemType, flameType, itemLevel, weaponLevel, baseAttack, flameAdvantaged, desiredStat, equivalences } = params;

  if (desiredStat <= 0) return null;

  const nonAdvantaged = !flameAdvantaged;
  const lines = buildFlameLines(flameClass, itemType, itemLevel, weaponLevel, baseAttack, equivalences, nonAdvantaged);
  const chooseFrom = getChooseFrom(flameClass);
  const totalPool = itemType === "weapon" ? 21 : 19;
  const neutralCount = itemType === "weapon" ? chooseFrom + 2 : chooseFrom;
  const tierProbs = getTierProbabilities(flameType, nonAdvantaged);
  const lo = getLowerTierLimit(flameType, nonAdvantaged);
  const hi = getUpperTierLimit(flameType, nonAdvantaged);

  // The search below visits hundreds of thousands of leaves, so everything that
  // depends only on the constants above is precomputed here rather than
  // recomputed per leaf. The running tier probability is carried down the
  // recursion instead of being rebuilt from a tier array at each leaf.
  const lineProbByActive = new Float64Array(5);
  for (let a = 1; a <= 4; a++) {
    lineProbByActive[a] = getLineProbability(neutralCount, a, nonAdvantaged, totalPool);
  }

  const tierProbByTier = new Float64Array(hi);
  for (let t = lo; t < hi; t++) tierProbByTier[t] = tierProbs[t];

  const contribByLine = lines.map((line) => {
    const arr = new Float64Array(hi);
    for (let t = lo; t < hi; t++) arr[t] = line.contribution(t);
    return arr;
  });

  const lineCount = lines.length;
  let totalProb = 0;

  function recurse(idx: number, active: number, score: number, tierProb: number): void {
    if (idx === lineCount) {
      if (active > 0 && score >= desiredStat) totalProb += lineProbByActive[active] * tierProb;
      return;
    }

    // Skip this line (tier = 0)
    recurse(idx + 1, active, score, tierProb);

    // Activate at each possible tier
    if (active < 4) {
      const contrib = contribByLine[idx];
      for (let t = lo; t < hi; t++) {
        recurse(idx + 1, active + 1, score + contrib[t], tierProb * tierProbByTier[t]);
      }
    }
  }

  recurse(0, 0, 0, 1);

  if (totalProb <= 0) {
    return {
      probability: 0,
      mean: Infinity,
      p75: Infinity,
      p85: Infinity,
      p95: Infinity,
      flameTypeText: getFlameTypeText(flameType),
    };
  }

  const p = Math.min(totalProb, 1);
  return {
    probability: p,
    mean: 1 / p,
    p75: geoQuantile(p, 0.75),
    p85: geoQuantile(p, 0.85),
    p95: geoQuantile(p, 0.95),
    flameTypeText: getFlameTypeText(flameType),
  };
}

// -- Meso cost ----------------------------------------------------------------

const POWERFUL_COST = 9_500_000;
const POWERFUL_COST_GUILD = 9_120_000;

export function flameMesoCost(flames: number, guildDiscount: boolean): number | null {
  if (!isFinite(flames)) return null;
  return Math.round(flames * (guildDiscount ? POWERFUL_COST_GUILD : POWERFUL_COST));
}

// -- Flame score --------------------------------------------------------------

export interface FlameScoreInputs {
  mainStat: number;
  secondaryStat: number;
  allStatPct: number;
  attack: number;
  bossPct: number;
  dmgPct: number;
  hp: number;
  dex: number;
  str: number;
  luk: number;
}

function safeReciprocal(v: number): number {
  return v > 0 ? 1 / v : 0;
}

function classSecondaryScore(cls: FlameClass, inputs: FlameScoreInputs, eq: StatEquivalences): number {
  if (cls === "other") return inputs.secondaryStat * safeReciprocal(eq.secondaryStat);
  if (cls === "db" || cls === "shadower" || cls === "cadena") {
    return inputs.dex * safeReciprocal(eq.dexStat) + inputs.str * safeReciprocal(eq.strStat);
  }
  return 0;
}

export function computeFlameScore(
  cls: FlameClass,
  itemType: ItemType,
  inputs: FlameScoreInputs,
  eq: StatEquivalences,
): number {
  let score = inputs.attack * eq.attack;

  if (cls === "da") {
    score += inputs.hp;
  } else {
    score += inputs.mainStat + inputs.allStatPct * eq.allStat;
    score += classSecondaryScore(cls, inputs, eq);
  }

  if (itemType === "weapon") {
    score += (inputs.bossPct + inputs.dmgPct) * eq.dmg;
  }

  return Math.round(score);
}

// -- Formatting ---------------------------------------------------------------

const mesoFmt = new Intl.NumberFormat("en-US");

export function formatFlames(n: number): string {
  if (!isFinite(n)) return "∞";
  return mesoFmt.format(Math.round(n));
}

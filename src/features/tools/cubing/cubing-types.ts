import { cubeRates } from "./cubing-data";

// ---------- Category enum ----------

export const enum Cat {
  STR, DEX, INT, LUK, HP, AllStat,
  ATT, MATT, Boss, IED, Meso, Drop,
  AutoSteal, CritDmg, CDR,
  DecentSkill, InvincPerc, InvincTime, IgnoreDmg,
  Junk,
}

// ---------- Data shape for cubeRates ----------

export type RateEntry = [cat: Cat, value: number, rate: number];

export interface LineRates {
  l1: RateEntry[];
  l2: RateEntry[];
  l3: RateEntry[];
}

export type TierKey = "rare" | "epic" | "unique" | "legendary";
export type CubeKey = "occult" | "master" | "meister" | "red" | "black";
export type ItemDataKey =
  | "ring" | "belt" | "bottom" | "cape" | "emblem"
  | "gloves" | "hat" | "heart" | "overall" | "secondary"
  | "shoes" | "shoulder" | "top" | "weapon";

export type CubeRatesData = {
  tables: LineRates[];
  lookup: Record<string, number>;
};

// ---------- UI option types ----------

export type ItemCategory =
  | "accessory" | "badge" | "belt" | "bottom" | "cape" | "emblem"
  | "gloves" | "hat" | "heart" | "overall" | "top"
  | "secondary" | "shoes" | "shoulder" | "weapon";

export const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: "accessory", label: "Accessory" },
  { value: "badge", label: "Badge" },
  { value: "belt", label: "Belt" },
  { value: "bottom", label: "Bottom" },
  { value: "cape", label: "Cape" },
  { value: "emblem", label: "Emblem" },
  { value: "gloves", label: "Gloves" },
  { value: "hat", label: "Hat" },
  { value: "heart", label: "Heart" },
  { value: "overall", label: "Overall" },
  { value: "top", label: "Top" },
  { value: "secondary", label: "Secondary" },
  { value: "shoes", label: "Shoes" },
  { value: "shoulder", label: "Shoulder" },
  { value: "weapon", label: "Weapon" },
];

export const CUBE_TYPES: { value: CubeKey; label: string }[] = [
  { value: "occult", label: "Mystical / Occult" },
  { value: "master", label: "Hard / Master" },
  { value: "meister", label: "Solid / Meister" },
  { value: "red", label: "Glowing / Red" },
  { value: "black", label: "Bright / Black" },
];

export const TIERS: { value: number; label: string }[] = [
  { value: 0, label: "Rare" },
  { value: 1, label: "Epic" },
  { value: 2, label: "Unique" },
  { value: 3, label: "Legendary" },
];

export const STAT_TYPES: { value: string; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "hp", label: "Max HP (Demon Avenger)" },
  { value: "allStat", label: "All Stat (Xenon)" },
];

// ---------- Cube constants ----------

export const MIN_ITEM_LEVEL = 71;
export const MAX_ITEM_LEVEL = 250;

/** Double Miracle Time doubles tier-up rates for these cubes only. The other
 *  three are unaffected by the in-game event, so `TIER_RATES_DMT` reuses their
 *  base rates and the toggle stays disabled while they're selected. */
export const DMT_CUBES: ReadonlySet<CubeKey> = new Set<CubeKey>(["red", "black"]);

export const TIER_RATES: Record<CubeKey, Record<number, number>> = {
  occult: { 0: 0.009901 },
  master: { 0: 0.1184, 1: 0.0381 },
  meister: { 0: 0.1163, 1: 0.0879, 2: 0.0459 },
  red: { 0: 0.14, 1: 0.06, 2: 0.025 },
  black: { 0: 0.17, 1: 0.11, 2: 0.05 },
};

export const TIER_RATES_DMT: Record<CubeKey, Record<number, number>> = {
  occult: TIER_RATES.occult,
  master: TIER_RATES.master,
  meister: TIER_RATES.meister,
  red: { 0: 0.14 * 2, 1: 0.06 * 2, 2: 0.025 * 2 },
  black: { 0: 0.17 * 2, 1: 0.11 * 2, 2: 0.05 * 2 },
};

function getCubeCost(cubeType: CubeKey): number {
  switch (cubeType) {
    case "red": return 12_000_000;
    case "black": return 22_000_000;
    case "master": return 7_500_000;
    default: return 0;
  }
}

function getRevealCostConstant(itemLevel: number): number {
  if (itemLevel < 30) return 0;
  if (itemLevel <= 70) return 0.5;
  if (itemLevel <= 120) return 2.5;
  return 20;
}

export function cubingCost(cubeType: CubeKey, itemLevel: number, totalCubeCount: number): number {
  const cubeCost = getCubeCost(cubeType);
  const revealCostConst = getRevealCostConstant(itemLevel);
  const revealPotentialCost = revealCostConst * itemLevel ** 2;
  return cubeCost * totalCubeCount + totalCubeCount * revealPotentialCost;
}

// ---------- Tier number ↔ text ----------

export const TIER_NUMBER_TO_TEXT: Record<number, TierKey> = {
  0: "rare",
  1: "epic",
  2: "unique",
  3: "legendary",
};

export function convertItemType(itemType: ItemCategory): ItemDataKey {
  if (itemType === "accessory") return "ring";
  if (itemType === "badge") return "heart";
  return itemType as ItemDataKey;
}

/** Tiers this cube has rate tables for, on this item. The Desired Tier options
 *  are driven straight off this, which is what keeps `getProbability` from ever
 *  missing its lookup and dividing by a zero probability. Always contiguous, so
 *  first and last bound the range. */
export function availableDesiredTiers(itemType: ItemCategory, cubeType: CubeKey): number[] {
  const item = convertItemType(itemType);
  return TIERS.map((t) => t.value).filter(
    (tier) => `${item}/${cubeType}/${TIER_NUMBER_TO_TEXT[tier]}` in cubeRates.lookup,
  );
}

// ---------- Category max-occurrence limits (special lines) ----------

export const MAX_CATEGORY_COUNT: ReadonlyMap<Cat, number> = new Map([
  [Cat.DecentSkill, 1],
  [Cat.InvincTime, 1],
  [Cat.IED, 3],
  [Cat.Boss, 3],
  [Cat.Drop, 3],
  [Cat.IgnoreDmg, 2],
  [Cat.InvincPerc, 2],
]);

// ---------- Probability input model ----------

export interface ProbabilityInput {
  percStat: number;
  lineStat: number;
  percAllStat: number;
  lineAllStat: number;
  percHp: number;
  lineHp: number;
  percAtt: number;
  lineAtt: number;
  percBoss: number;
  lineBoss: number;
  lineIed: number;
  lineCritDamage: number;
  lineMeso: number;
  lineDrop: number;
  lineMesoOrDrop: number;
  secCooldown: number;
  lineAutoSteal: number;
  lineAttOrBoss: number;
  lineAttOrBossOrIed: number;
  lineBossOrIed: number;
}

function emptyInput(): ProbabilityInput {
  return {
    percStat: 0, lineStat: 0, percAllStat: 0, lineAllStat: 0,
    percHp: 0, lineHp: 0, percAtt: 0, lineAtt: 0,
    percBoss: 0, lineBoss: 0, lineIed: 0, lineCritDamage: 0,
    lineMeso: 0, lineDrop: 0, lineMesoOrDrop: 0, secCooldown: 0,
    lineAutoSteal: 0, lineAttOrBoss: 0, lineAttOrBossOrIed: 0,
    lineBossOrIed: 0,
  };
}

export function translateDesiredStat(encoded: string): ProbabilityInput {
  const output = emptyInput();
  for (const part of encoded.split("&")) {
    const [stat, amount] = part.split("+");
    (output as unknown as Record<string, number>)[stat] += parseInt(amount, 10);
  }
  return output;
}

// ---------- Geometric distribution ----------

export interface QuantileResult {
  mean: number;
  median: number;
  seventy_fifth: number;
  eighty_fifth: number;
  ninety_fifth: number;
}

/** Cubes needed to hit a per-cube chance of `p`, at each quantile.
 *
 *  A certain outcome takes exactly one cube, and the log form degenerates there:
 *  `Math.log(1 - 1)` is -Infinity, and a probability summed out of the rate
 *  tables can land a hair above 1, making `Math.log` of a negative return NaN.
 *  Callers must reject `p <= 0` before calling; there is no finite answer for an
 *  outcome that never happens. */
export function geoDistrQuantile(p: number): QuantileResult {
  if (p >= 1) return { mean: 1, median: 1, seventy_fifth: 1, eighty_fifth: 1, ninety_fifth: 1 };
  return {
    mean: 1 / p,
    median: Math.log(1 - 0.5) / Math.log(1 - p),
    seventy_fifth: Math.log(1 - 0.75) / Math.log(1 - p),
    eighty_fifth: Math.log(1 - 0.85) / Math.log(1 - p),
    ninety_fifth: Math.log(1 - 0.95) / Math.log(1 - p),
  };
}

// ---------- Tier-up cost ----------

export interface TierStep {
  from: string;
  to: string;
  probability: number;
}

/** The per-cube tier-up chance at each step between the two tiers. Both the
 *  displayed rates and the summed cost below read from this, so they can't drift. */
export function tierUpSteps(
  currentTier: number,
  desiredTier: number,
  cubeType: CubeKey,
  dmt: boolean,
): TierStep[] {
  const rates = dmt ? TIER_RATES_DMT : TIER_RATES;
  const steps: TierStep[] = [];
  for (let i = currentTier; i < desiredTier; i++) {
    const probability = rates[cubeType][i];
    if (probability != null) {
      steps.push({ from: TIERS[i].label, to: TIERS[i + 1].label, probability });
    }
  }
  return steps;
}

export function getTierUpCosts(
  currentTier: number,
  desiredTier: number,
  cubeType: CubeKey,
  dmt: boolean,
): QuantileResult {
  let mean = 0, median = 0, s75 = 0, s85 = 0, s95 = 0;
  for (const step of tierUpSteps(currentTier, desiredTier, cubeType, dmt)) {
    const stats = geoDistrQuantile(step.probability);
    mean += Math.round(stats.mean);
    median += Math.round(stats.median);
    s75 += Math.round(stats.seventy_fifth);
    s85 += Math.round(stats.eighty_fifth);
    s95 += Math.round(stats.ninety_fifth);
  }
  return { mean, median, seventy_fifth: s75, eighty_fifth: s85, ninety_fifth: s95 };
}

// ---------- Desired stat option builders ----------

export interface StatOption {
  value: string;
  label: string;
  group: string;
}

/** Option labels sit in a native <select>, which can't wrap or truncate
 *  gracefully. They stay terse: "Lines" not "Line(s) of", "+" not "and",
 *  "Meso%" not "Mesos Obtained%". */
function lines(n: number): string {
  return n === 1 ? "1 Line" : `${n} Lines`;
}

const STAT_DISPLAY: Record<string, { valueName: string; display: string }> = {
  normal: { valueName: "Stat", display: "Stat" },
  hp: { valueName: "Hp", display: "Max HP" },
  allStat: { valueName: "AllStat", display: "All Stat" },
};

function getPrimeLineValue(itemLevel: number, desiredTier: number, statType: string): number {
  const levelBonus = itemLevel >= 160 ? 1 : 0;
  const base = statType === "allStat" ? 0 : 3;
  return base + 3 * desiredTier + levelBonus;
}

function get3LAtkAmounts(prime: number): number[] {
  return [prime * 3 - 6, prime * 3 - 3, prime * 3].filter((x) => x > 0);
}

function get3LStatAmounts(prime: number): number[] {
  const ppp = prime * 3;
  return [ppp - 18, ppp - 15, ppp - 12, ppp - 9, ...get3LAtkAmounts(prime)].filter((x) => x > 0);
}

/** Filtered like the 3-line amounts: at Rare tier the prime line is only 3%, so
 *  the low end lands on 0. A "0%+ Attack" target matches every roll, which drives
 *  the probability to 1 and the quantile logs to -Infinity. */
function get2LAtkAmounts(prime: number): number[] {
  return [prime * 2 - 6, prime * 2 - 3, prime * 2].filter((x) => x > 0);
}

function buildWSEOptions(itemType: ItemCategory, desiredTier: number, itemLevel: number): StatOption[] {
  const opts: StatOption[] = [];
  const prime = getPrimeLineValue(itemLevel, desiredTier, "normal");
  const threeL = get3LAtkAmounts(prime);
  const twoL = get2LAtkAmounts(prime);

  for (const v of [...twoL, ...threeL]) {
    opts.push({ value: `percAtt+${v}`, label: `${v}%+ Attack`, group: "Attack" });
  }
  for (const v of twoL) {
    opts.push({ value: `lineIed+1&percAtt+${v}`, label: `${v}%+ Attack + 1 Line IED`, group: "Attack With 1 Line of IED" });
  }

  const showBoss = itemType !== "emblem" && desiredTier >= 2;
  const anyLabel = showBoss ? "Attack%/Boss%/IED" : "Attack%/IED";
  for (let i = 1; i <= 3; i++) {
    opts.push({ value: `lineAttOrBossOrIed+${i}`, label: `${lines(i)} ${anyLabel}`, group: "Any Useful Lines" });
  }
  opts.push({ value: "lineAtt+1&lineAttOrBossOrIed+2", label: `1 Line Attack + 1 Line ${anyLabel}`, group: "Attack + Any Useful Lines" });
  opts.push({ value: "lineAtt+1&lineAttOrBossOrIed+3", label: `1 Line Attack + 2 Lines ${anyLabel}`, group: "Attack + Any Useful Lines" });
  opts.push({ value: "lineAtt+2&lineAttOrBossOrIed+3", label: `2 Lines Attack + 1 Line ${anyLabel}`, group: "Attack + Any Useful Lines" });

  if (itemType !== "emblem" && desiredTier >= 2) {
    opts.push(...buildBossOptions(prime, desiredTier));
  }
  return opts;
}

function buildBossOptions(prime: number, desiredTier: number): StatOption[] {
  const opts: StatOption[] = [];
  // The two upper 2-line amounts. Computed rather than read out of
  // get2LAtkAmounts by index, which now filters and can change length.
  const pn = prime * 2 - 3;
  const pp = prime * 2;
  opts.push({ value: "lineAtt+1&lineBoss+1", label: "1 Line Attack% + 1 Line Boss%", group: "Attack and Boss Damage" });
  opts.push({ value: "lineAtt+1&lineBoss+2", label: "1 Line Attack% + 2 Lines Boss%", group: "Attack and Boss Damage" });
  opts.push({ value: "lineAtt+2&lineBoss+1", label: "2 Lines Attack% + 1 Line Boss%", group: "Attack and Boss Damage" });
  opts.push({ value: `percAtt+${pn}&percBoss+30`, label: `${pn}%+ Attack + 30%+ Boss`, group: "Attack and Boss Damage" });
  if (desiredTier === 3) {
    opts.push({ value: `percAtt+${pn}&percBoss+35`, label: `${pn}%+ Attack + 35%+ Boss`, group: "Attack and Boss Damage" });
    opts.push({ value: `percAtt+${pn}&percBoss+40`, label: `${pn}%+ Attack + 40%+ Boss`, group: "Attack and Boss Damage" });
  }
  opts.push({ value: `percAtt+${pp}&percBoss+30`, label: `${pp}%+ Attack + 30%+ Boss`, group: "Attack and Boss Damage" });
  for (let i = 1; i <= 3; i++) {
    opts.push({ value: `lineAttOrBoss+${i}`, label: `${lines(i)} Attack% or Boss%`, group: "Attack or Boss Damage" });
  }
  return opts;
}

function buildNonWSEStatOptions(desiredTier: number, itemLevel: number, statType: string, valueName: string, display: string): StatOption[] {
  const prime = getPrimeLineValue(itemLevel, desiredTier, statType);
  const needSpecial = statType === "allStat" && desiredTier === 1;
  const amounts = needSpecial ? [1, 3, 4, 5, 6, 9] : get3LStatAmounts(prime);
  return amounts.map((v) => ({ value: `perc${valueName}+${v}`, label: `${v}%+ ${display}`, group: "Stat" }));
}

function buildCritDamageOptions(valueName: string, display: string): StatOption[] {
  const opts: StatOption[] = [];
  for (let i = 1; i <= 3; i++) {
    opts.push({ value: `lineCritDamage+${i}`, label: `${lines(i)} Crit Dmg%`, group: "Crit Damage" });
  }
  opts.push({ value: `lineCritDamage+1&line${valueName}+1`, label: `1 Line Crit Dmg% + 1 Line ${display}`, group: "Crit Damage" });
  opts.push({ value: `lineCritDamage+1&line${valueName}+2`, label: `1 Line Crit Dmg% + 2 Lines ${display}`, group: "Crit Damage" });
  opts.push({ value: `lineCritDamage+2&line${valueName}+1`, label: `2 Lines Crit Dmg% + 1 Line ${display}`, group: "Crit Damage" });
  return opts;
}

function buildAutoStealOptions(valueName: string, display: string): StatOption[] {
  const opts: StatOption[] = [];
  for (let i = 1; i <= 3; i++) {
    opts.push({ value: `lineAutoSteal+${i}`, label: `${lines(i)} Auto Steal%`, group: "Auto Steal" });
  }
  opts.push({ value: `lineAutoSteal+1&line${valueName}+1`, label: `1 Line Auto Steal% + 1 Line ${display}`, group: "Auto Steal" });
  opts.push({ value: `lineAutoSteal+1&line${valueName}+2`, label: `1 Line Auto Steal% + 2 Lines ${display}`, group: "Auto Steal" });
  opts.push({ value: `lineAutoSteal+2&line${valueName}+1`, label: `2 Lines Auto Steal% + 1 Line ${display}`, group: "Auto Steal" });
  return opts;
}

function buildGlovesOptions(cubeType: CubeKey, desiredTier: number, valueName: string, display: string): StatOption[] {
  const opts: StatOption[] = [];
  if (desiredTier === 3) opts.push(...buildCritDamageOptions(valueName, display));
  if (desiredTier >= 2 && (cubeType === "master" || cubeType === "meister")) {
    opts.push(...buildAutoStealOptions(valueName, display));
  }
  if (desiredTier === 3 && cubeType === "meister") {
    for (let i = 1; i <= 2; i++) {
      for (let j = 1; j <= 2; j++) {
        if (i + j <= 3) {
          opts.push({ value: `lineAutoSteal+${i}&lineCritDamage+${j}`, label: `${lines(i)} Auto Steal% + ${lines(j)} Crit Dmg%`, group: "Wombo Combo" });
        }
      }
    }
  }
  return opts;
}

function buildAccessoryOptions(valueName: string, display: string): StatOption[] {
  return [
    { value: "lineMeso+1", label: "1 Line Meso%", group: "Drop/Meso" },
    { value: "lineDrop+1", label: "1 Line Drop%", group: "Drop/Meso" },
    { value: "lineMesoOrDrop+1", label: "1 Line Drop% or Meso%", group: "Drop/Meso" },
    { value: "lineMeso+2", label: "2 Lines Meso%", group: "Drop/Meso" },
    { value: "lineDrop+2", label: "2 Lines Drop%", group: "Drop/Meso" },
    { value: "lineMesoOrDrop+2", label: "2 Lines Drop% or Meso%", group: "Drop/Meso" },
    { value: "lineMeso+3", label: "3 Lines Meso%", group: "Drop/Meso" },
    { value: "lineDrop+3", label: "3 Lines Drop%", group: "Drop/Meso" },
    { value: `lineMeso+1&line${valueName}+1`, label: `1 Line Meso% + 1 Line ${display}`, group: "Drop/Meso" },
    { value: `lineDrop+1&line${valueName}+1`, label: `1 Line Drop% + 1 Line ${display}`, group: "Drop/Meso" },
    { value: `lineMesoOrDrop+1&line${valueName}+1`, label: `1 Line Drop% or Meso% + 1 Line ${display}`, group: "Drop/Meso" },
  ];
}

function buildHatOptions(valueName: string, display: string): StatOption[] {
  const opts: StatOption[] = [];
  for (let sec = 2; sec <= 6; sec++) {
    opts.push({ value: `secCooldown+${sec}`, label: `-${sec}sec+ CD Reduction`, group: "Cooldown" });
  }
  opts.push({ value: `secCooldown+2&line${valueName}+1`, label: `-2sec+ CD Reduction + 1 Line ${display}`, group: "Cooldown" });
  opts.push({ value: `secCooldown+2&line${valueName}+2`, label: `-2sec+ CD Reduction + 2 Lines ${display}`, group: "Cooldown" });
  opts.push({ value: `secCooldown+3&line${valueName}+1`, label: `-3sec+ CD Reduction + 1 Line ${display}`, group: "Cooldown" });
  opts.push({ value: `secCooldown+4&line${valueName}+1`, label: `-4sec+ CD Reduction + 1 Line ${display}`, group: "Cooldown" });
  return opts;
}

export function buildStatOptions(
  itemType: ItemCategory,
  cubeType: CubeKey,
  desiredTier: number,
  itemLevel: number,
  statType: string,
): StatOption[] {
  const { valueName, display } = STAT_DISPLAY[statType] ?? STAT_DISPLAY.normal;
  const isWSE = itemType === "weapon" || itemType === "secondary" || itemType === "emblem";

  const opts = isWSE
    ? buildWSEOptions(itemType, desiredTier, itemLevel)
    : buildNonWSEStatOptions(desiredTier, itemLevel, statType, valueName, display);

  if (itemType === "gloves") opts.push(...buildGlovesOptions(cubeType, desiredTier, valueName, display));
  if (itemType === "accessory" && desiredTier === 3) opts.push(...buildAccessoryOptions(valueName, display));
  if (itemType === "hat" && desiredTier === 3) opts.push(...buildHatOptions(valueName, display));

  return opts;
}

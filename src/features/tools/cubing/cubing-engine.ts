import { cubeRates } from "./cubing-data";
import {
  Cat,
  type CubeKey,
  type ItemCategory,
  type ProbabilityInput,
  type RateEntry,
  type LineRates,
  MAX_CATEGORY_COUNT,
  TIER_NUMBER_TO_TEXT,
  convertItemType,
} from "./cubing-types";

// ---------- Category → input field mapping ----------

const INPUT_CATEGORY_MAP: Record<string, Cat[]> = {
  percStat: [Cat.STR, Cat.AllStat],
  lineStat: [Cat.STR, Cat.AllStat],
  percAllStat: [Cat.AllStat, Cat.STR, Cat.DEX, Cat.LUK],
  lineAllStat: [Cat.AllStat],
  percHp: [Cat.HP],
  lineHp: [Cat.HP],
  percAtt: [Cat.ATT],
  lineAtt: [Cat.ATT],
  percBoss: [Cat.Boss],
  lineBoss: [Cat.Boss],
  lineIed: [Cat.IED],
  lineCritDamage: [Cat.CritDmg],
  lineMeso: [Cat.Meso],
  lineDrop: [Cat.Drop],
  lineMesoOrDrop: [Cat.Drop, Cat.Meso],
  secCooldown: [Cat.CDR],
  lineAutoSteal: [Cat.AutoSteal],
  lineAttOrBoss: [Cat.ATT, Cat.Boss],
  lineAttOrBossOrIed: [Cat.ATT, Cat.Boss, Cat.IED],
  lineBossOrIed: [Cat.Boss, Cat.IED],
};

// ---------- Helpers ----------

type CalcType = "line" | "val";

function total(outcome: RateEntry[], target: Cat, calcType: CalcType = "line"): number {
  let sum = 0;
  for (const [cat, val] of outcome) {
    if (cat === target) sum += calcType === "val" ? val : 1;
  }
  return sum;
}

function checkPercAllStat(outcome: RateEntry[], required: number): boolean {
  let actual = 0;
  for (const [cat, val] of outcome) {
    if (cat === Cat.AllStat) actual += val;
    else if (cat === Cat.STR || cat === Cat.DEX || cat === Cat.LUK) actual += val / 3;
  }
  return actual >= required;
}

type MatchFn = (o: RateEntry[], r: number) => boolean;

const OUTCOME_MATCH: Record<string, MatchFn> = {
  percStat: (o, r) => total(o, Cat.STR, "val") + total(o, Cat.AllStat, "val") >= r,
  lineStat: (o, r) => total(o, Cat.STR) + total(o, Cat.AllStat) >= r,
  percAllStat: checkPercAllStat,
  lineAllStat: (o, r) => total(o, Cat.AllStat) >= r,
  percHp: (o, r) => total(o, Cat.HP, "val") >= r,
  lineHp: (o, r) => total(o, Cat.HP) >= r,
  percAtt: (o, r) => total(o, Cat.ATT, "val") >= r,
  lineAtt: (o, r) => total(o, Cat.ATT) >= r,
  percBoss: (o, r) => total(o, Cat.Boss, "val") >= r,
  lineBoss: (o, r) => total(o, Cat.Boss) >= r,
  lineIed: (o, r) => total(o, Cat.IED) >= r,
  lineCritDamage: (o, r) => total(o, Cat.CritDmg) >= r,
  lineMeso: (o, r) => total(o, Cat.Meso) >= r,
  lineDrop: (o, r) => total(o, Cat.Drop) >= r,
  lineMesoOrDrop: (o, r) => total(o, Cat.Meso) + total(o, Cat.Drop) >= r,
  secCooldown: (o, r) => total(o, Cat.CDR, "val") >= r,
  lineAutoSteal: (o, r) => total(o, Cat.AutoSteal) >= r,
  lineAttOrBoss: (o, r) => total(o, Cat.ATT) + total(o, Cat.Boss) >= r,
  lineAttOrBossOrIed: (o, r) => total(o, Cat.ATT) + total(o, Cat.Boss) + total(o, Cat.IED) >= r,
  lineBossOrIed: (o, r) => total(o, Cat.Boss) + total(o, Cat.IED) >= r,
};

// ---------- Core algorithm ----------

const AFFECTED_CATS = new Set<Cat>([
  Cat.STR, Cat.DEX, Cat.INT, Cat.LUK,
  Cat.AllStat, Cat.ATT, Cat.MATT, Cat.HP,
]);

function getUsefulCats(input: ProbabilityInput): Set<Cat> {
  const cats = new Set<Cat>();
  for (const field in INPUT_CATEGORY_MAP) {
    if ((input as unknown as Record<string, number>)[field] > 0) {
      for (const c of INPUT_CATEGORY_MAP[field]) cats.add(c);
    }
  }
  return cats;
}

function consolidateRates(ratesList: RateEntry[], useful: Set<Cat>): RateEntry[] {
  const result: RateEntry[] = [];
  let junkRate = 0;
  for (const entry of ratesList) {
    if (useful.has(entry[0]) || MAX_CATEGORY_COUNT.has(entry[0])) {
      result.push(entry);
    } else {
      junkRate += entry[2];
    }
  }
  result.push([Cat.Junk, 0, junkRate]);
  return result;
}

function satisfiesInput(outcome: RateEntry[], input: ProbabilityInput): boolean {
  for (const field in input) {
    const val = (input as unknown as Record<string, number>)[field];
    if (val > 0 && !OUTCOME_MATCH[field](outcome, val)) return false;
  }
  return true;
}

function getAdjustedRate(current: RateEntry, prev: RateEntry[], pool: RateEntry[]): number {
  const currentCat = current[0];
  const currentRate = current[2];

  if (prev.length === 0) return currentRate;

  const prevCounts = new Map<Cat, number>();
  for (const [cat] of prev) {
    if (MAX_CATEGORY_COUNT.has(cat)) prevCounts.set(cat, (prevCounts.get(cat) ?? 0) + 1);
  }

  const toRemove: Cat[] = [];
  for (const [spCat, count] of prevCounts) {
    const max = MAX_CATEGORY_COUNT.get(spCat)!;
    if (count > max || (spCat === currentCat && count + 1 > max)) return 0;
    if (count === max) toRemove.push(spCat);
  }

  if (toRemove.length === 0) return currentRate;

  let adjustedTotal = 100;
  for (const [cat, , rate] of pool) {
    if (toRemove.includes(cat)) adjustedTotal -= rate;
  }
  return (currentRate / adjustedTotal) * 100;
}

function calculateOutcomeRate(outcome: RateEntry[], rates: LineRates): number {
  const adjusted = [
    getAdjustedRate(outcome[0], [], rates.l1),
    getAdjustedRate(outcome[1], [outcome[0]], rates.l2),
    getAdjustedRate(outcome[2], [outcome[0], outcome[1]], rates.l3),
  ];

  let chance = 100;
  for (const r of adjusted) chance = chance * (r / 100);
  return chance;
}

function adjustForLevel(lineData: RateEntry[], itemLevel: number): RateEntry[] {
  if (itemLevel < 160) return lineData;
  return lineData.map(([cat, val, rate]) =>
    AFFECTED_CATS.has(cat) ? [cat, val + 1, rate] as RateEntry : [cat, val, rate] as RateEntry,
  );
}

function lookupRates(itemLabel: string, cubeType: string, tier: string): LineRates | undefined {
  const key = `${itemLabel}/${cubeType}/${tier}`;
  const idx = cubeRates.lookup[key];
  if (idx == null) return undefined;
  return cubeRates.tables[idx];
}

export function getProbability(
  desiredTier: number,
  input: ProbabilityInput,
  itemType: ItemCategory,
  cubeType: CubeKey,
  itemLevel: number,
): number {
  const tier = TIER_NUMBER_TO_TEXT[desiredTier];
  const itemLabel = convertItemType(itemType);

  const raw = lookupRates(itemLabel, cubeType, tier);
  if (!raw) return 0;

  const cubeData: LineRates = {
    l1: adjustForLevel(raw.l1, itemLevel),
    l2: adjustForLevel(raw.l2, itemLevel),
    l3: adjustForLevel(raw.l3, itemLevel),
  };

  const useful = getUsefulCats(input);
  const consolidated: LineRates = {
    l1: consolidateRates(cubeData.l1, useful),
    l2: consolidateRates(cubeData.l2, useful),
    l3: consolidateRates(cubeData.l3, useful),
  };

  let totalChance = 0;
  for (const line1 of consolidated.l1) {
    for (const line2 of consolidated.l2) {
      for (const line3 of consolidated.l3) {
        const outcome = [line1, line2, line3];
        if (satisfiesInput(outcome, input)) {
          totalChance += calculateOutcomeRate(outcome, consolidated);
        }
      }
    }
  }

  return totalChance / 100;
}

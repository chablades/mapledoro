// Interprets the raw Mystic Frontier potential templates (potentialsData.ts) into
// resolved potentials: a human-readable label, the flat/multiplier contribution, an
// optional dice cap, and a predicate over a rolled lineup.
//
// The effect is fully determined by the `params`: add/sub map to flat dice total,
// mul maps to an additive Final Multiplier component. The condition is the leading
// clause of the template (everything before the first comma).

import { MF_POTENTIALS, type MfPotentialDef } from "./potentialsData";
import type { MfElement, MfRarity, MfType } from "./types";

export interface RollContext {
  // Rolled die value per slot (0 when the slot has no familiar).
  dice: number[];
  // Whether each slot holds a familiar.
  present: boolean[];
  // Traits of the filled slots, in slot order.
  lineup: { type: MfType; element: MfElement }[];
}

type Predicate = (ctx: RollContext) => boolean;

export interface ResolvedPotential {
  id: number;
  rarity: MfRarity;
  label: string;
  flat: number;
  mult: number;
  // "Prevents dice from rolling over N" caps each die at this value.
  diceCap: number | null;
  // True for the "+x% chance to roll …" lines, which alter roll odds rather than
  // the score of a fixed roll — they never contribute flat/mult.
  informational: boolean;
  matches: Predicate;
}

const EVENT_PREFIX = /^\[EVENT\]\s*\[[^\]]*\]\s*/;
const ALWAYS_FALSE: Predicate = () => false;
const ALWAYS_TRUE: Predicate = () => true;

const PAIR_INDICES: Record<string, readonly [number, number]> = {
  "first and second": [0, 1],
  "first and third": [0, 2],
  "second and third": [1, 2],
};
const NTH_INDEX: Record<string, number> = { first: 0, second: 1, third: 2 };

function full3(ctx: RollContext): boolean {
  return ctx.present[0] && ctx.present[1] && ctx.present[2];
}

function allEqual<T>(values: readonly T[]): boolean {
  return values.every((v) => v === values[0]);
}

function allDistinct<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

// Each matcher inspects the condition clause and returns a predicate, or null to
// fall through to the next. A flat table keeps cognitive complexity low.
const MATCHERS: ReadonlyArray<(cond: string, w: number) => Predicate | null> = [
  (c) => {
    const m = /^If an? (Fire|Ice|Lightning|Poison|Dark|Holy) elemental Familiar is on your active lineup$/.exec(c);
    return m ? (ctx) => ctx.lineup.some((f) => f.element === m[1]) : null;
  },
  (c) => (/^If a non-elemental Familiar is on your active lineup$/.test(c)
    ? (ctx) => ctx.lineup.some((f) => f.element === "None")
    : null),
  (c) => {
    const m = /^If an? (Human|Beast|Plant|Aquatic|Fairy|Reptile|Devil|Undead|Mechanical) type Familiar is on your active lineup$/.exec(c);
    return m ? (ctx) => ctx.lineup.some((f) => f.type === m[1]) : null;
  },
  (c) => (/^If all Familiars on your active lineup have the same element$/.test(c)
    ? (ctx) => full3(ctx) && allEqual(ctx.lineup.map((f) => f.element)) && ctx.lineup[0].element !== "None"
    : null),
  (c) => (/^If all Familiars on your active lineup have a different element$/.test(c)
    ? (ctx) => full3(ctx) && allDistinct(ctx.lineup.map((f) => f.element))
    : null),
  (c) => (/^If all Familiars on your active lineup have the same type$/.test(c)
    ? (ctx) => full3(ctx) && allEqual(ctx.lineup.map((f) => f.type))
    : null),
  (c) => (/^If all Familiars on your active lineup have a different type$/.test(c)
    ? (ctx) => full3(ctx) && allDistinct(ctx.lineup.map((f) => f.type))
    : null),
  (c) => {
    const m = /^If a die rolls a ([1-6])$/.exec(c);
    if (!m) return null;
    const n = Number(m[1]);
    return (ctx) => ctx.dice.some((d, i) => ctx.present[i] && d === n);
  },
  (c) => {
    const m = /^If all three dice roll a ([1-6])$/.exec(c);
    if (!m) return null;
    const n = Number(m[1]);
    return (ctx) => full3(ctx) && ctx.dice.every((d) => d === n);
  },
  (c) => {
    const m = /^If the (first|second|third) die rolls an (even|odd) number$/.exec(c);
    if (!m) return null;
    const idx = NTH_INDEX[m[1]];
    const wantEven = m[2] === "even";
    return (ctx) => ctx.present[idx] && (ctx.dice[idx] % 2 === 0) === wantEven;
  },
  (c) => {
    const m = /^If the (first and second|first and third|second and third) dice match$/.exec(c);
    if (!m) return null;
    const [a, b] = PAIR_INDICES[m[1]];
    return (ctx) => ctx.present[a] && ctx.present[b] && ctx.dice[a] === ctx.dice[b];
  },
  (c, w) => {
    const m = /^If the (first and second|first and third|second and third) dice are each #w or more$/.exec(c);
    if (!m) return null;
    const [a, b] = PAIR_INDICES[m[1]];
    return (ctx) => ctx.present[a] && ctx.present[b] && ctx.dice[a] >= w && ctx.dice[b] >= w;
  },
  (c, w) => (/^If all three dice are each #w or more$/.test(c)
    ? (ctx) => full3(ctx) && ctx.dice.every((d) => d >= w)
    : null),
  (c) => (/^If the three dice roll consecutive numbers$/.test(c)
    ? (ctx) => {
      if (!full3(ctx)) return false;
      const s = [...ctx.dice].sort((a, b) => a - b);
      return s[1] === s[0] + 1 && s[2] === s[1] + 1;
    }
    : null),
  (c) => (/^Prevents dice from rolling over #w$/.test(c) ? ALWAYS_TRUE : null),
];

function buildPredicate(condition: string, w: number): Predicate {
  for (const matcher of MATCHERS) {
    const pred = matcher(condition, w);
    if (pred) return pred;
  }
  return ALWAYS_FALSE;
}

function substitute(template: string, p: MfPotentialDef["params"]): string {
  return template
    .replace(/#mulx/g, `${p.mul ?? 0}x`)
    .replace(/#mul/g, `${p.mul ?? 0}`)
    .replace(/#add/g, `${p.add ?? 0}`)
    .replace(/#sub/g, `${p.sub ?? 0}`)
    .replace(/#w/g, `${p.w ?? 0}`)
    .replace(/#x/g, `${p.x ?? 0}`);
}

function resolvePotential(def: MfPotentialDef): ResolvedPotential {
  const body = def.template.replace(EVENT_PREFIX, "");
  const informational = /chance to roll/.test(body);
  const condition = body.split(",")[0].trim();
  const w = def.params.w ?? 0;
  const isCap = /^Prevents dice from rolling over/.test(condition);

  return {
    id: def.id,
    rarity: def.rarity as MfRarity,
    label: substitute(def.template, def.params),
    flat: informational ? 0 : (def.params.add ?? 0) - (def.params.sub ?? 0),
    mult: informational ? 0 : def.params.mul ?? 0,
    diceCap: isCap ? w : null,
    informational,
    matches: informational ? ALWAYS_FALSE : buildPredicate(condition, w),
  };
}

let resolvedCache: ResolvedPotential[] | null = null;

export function allResolvedPotentials(): ResolvedPotential[] {
  resolvedCache ??= MF_POTENTIALS.map(resolvePotential);
  return resolvedCache;
}

const byId = new Map<number, ResolvedPotential>();

export function getPotential(id: number): ResolvedPotential | undefined {
  if (byId.size === 0) {
    for (const p of allResolvedPotentials()) byId.set(p.id, p);
  }
  return byId.get(id);
}

// Potentials selectable for a familiar of the given rarity, sorted for display.
export function potentialsForRarity(rarity: MfRarity): ResolvedPotential[] {
  return allResolvedPotentials()
    .filter((p) => p.rarity === rarity && !EVENT_PREFIX.test(p.label))
    .sort((a, b) => a.label.localeCompare(b.label));
}

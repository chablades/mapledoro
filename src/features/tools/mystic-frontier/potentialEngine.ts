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
// How many times a line applies to a rolled lineup: 0 or 1 for the conditional "If ..."
// lines, 0 to 3 for the "+N for each Fire or Ice element" style lines, which apply once
// per matching familiar. flat and mult are per application.
type Activation = (ctx: RollContext) => number;

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
  activations: Activation;
}

const EVENT_PREFIX = /^\[EVENT\]\s*\[[^\]]*\]\s*/;
const ALWAYS_TRUE: Predicate = () => true;
const NEVER: Activation = () => 0;

// The manifest names one element differently from the app.
const ELEMENT_ALIASES: Record<string, MfElement> = { Electric: "Lightning" };
const ELEMENTS = new Set<string>(["None", "Fire", "Ice", "Lightning", "Poison", "Dark", "Holy"]);
const TYPES = new Set<string>(["Human", "Beast", "Plant", "Aquatic", "Fairy", "Reptile", "Devil", "Undead", "Mechanical"]);

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
  (c) => {
    const m = /^If all dice roll an (odd|even) number$/.exec(c);
    if (!m) return null;
    const wantEven = m[1] === "even";
    return (ctx) => full3(ctx) && ctx.dice.every((d) => (d % 2 === 0) === wantEven);
  },
  (c) => {
    const m = /^If all dice roll ([1-6]) or (less|higher)$/.exec(c);
    if (!m) return null;
    const n = Number(m[1]);
    const atMost = m[2] === "less";
    return (ctx) => full3(ctx) && ctx.dice.every((d) => (atMost ? d <= n : d >= n));
  },
];

// One side of a "for each X or Y element" / "for every X or Y type" pair: an element
// name, a type name, or "non-elemental". null when the manifest wording is unknown.
function familiarTermPredicate(term: string): ((f: RollContext["lineup"][number]) => boolean) | null {
  if (term === "non-elemental") return (f) => f.element === "None";
  const element = ELEMENT_ALIASES[term] ?? term;
  if (ELEMENTS.has(element)) return (f) => f.element === element;
  if (TYPES.has(term)) return (f) => f.type === term;
  return null;
}

// "+#add for each Fire or Ice element", "x#mul for every Human or Beast type",
// "+#add for every non-elemental or Undead type": the line applies once per lineup
// familiar matching either side.
function buildCountActivation(condition: string): Activation | null {
  const m = /^[+x]#(?:add|mul) for (?:each|every) (\S+) or (\S+) (?:element|type)$/.exec(condition);
  if (!m) return null;
  const a = familiarTermPredicate(m[1]);
  const b = familiarTermPredicate(m[2]);
  if (!a || !b) return null;
  return (ctx) => ctx.lineup.filter((f) => a(f) || b(f)).length;
}

function buildActivation(condition: string, w: number): Activation {
  const counted = buildCountActivation(condition);
  if (counted) return counted;
  for (const matcher of MATCHERS) {
    const pred = matcher(condition, w);
    if (pred) return (ctx) => (pred(ctx) ? 1 : 0);
  }
  return NEVER;
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
  const isCap = condition.startsWith("Prevents dice from rolling over");

  return {
    id: def.id,
    rarity: def.rarity as MfRarity,
    label: substitute(def.template, def.params),
    flat: informational ? 0 : (def.params.add ?? 0) - (def.params.sub ?? 0),
    mult: informational ? 0 : def.params.mul ?? 0,
    diceCap: isCap ? w : null,
    informational,
    activations: informational ? NEVER : buildActivation(condition, w),
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

// Familiars obtained before the Mystic Frontier patch could roll Epic potential lines
// at Unique grade, and such a line survives an upgrade to Legendary, so both of those
// pools include the Epic lines on top of their own.
function poolRarities(rarity: MfRarity): readonly MfRarity[] {
  return rarity === "unique" || rarity === "legendary" ? [rarity, "epic"] : [rarity];
}

// Potentials selectable for a familiar of the given rarity, sorted for display, one
// entry per label: the manifest repeats some lines verbatim under adjacent ids, and the
// Epic fallback overlaps the Unique/Legendary lines. Same label means same params, so
// the survivor is interchangeable; prefer the familiar's own rarity so picking a line
// that also exists at Epic doesn't flag it as prepatch.
export function potentialsForRarity(rarity: MfRarity): ResolvedPotential[] {
  const pool = poolRarities(rarity);
  const byLabel = new Map<string, ResolvedPotential>();
  for (const p of allResolvedPotentials()) {
    // react-doctor-disable-next-line js-set-map-lookups -- pool holds one or two rarities (see poolRarities); a Set is more work than the comparison.
    if (!pool.includes(p.rarity) || EVENT_PREFIX.test(p.label)) continue;
    const seen = byLabel.get(p.label);
    if (!seen || (seen.rarity !== rarity && p.rarity === rarity)) byLabel.set(p.label, p);
  }
  return [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function isLineSelectableFor(id: number, rarity: MfRarity): boolean {
  const p = getPotential(id);
  return p !== undefined && poolRarities(rarity).includes(p.rarity);
}

// An Epic line on a Unique/Legendary familiar is the prepatch case the in-game client
// flags with a purple status icon.
export function isPrepatchEpicLine(id: number | null, rarity: MfRarity): boolean {
  if (id === null || (rarity !== "unique" && rarity !== "legendary")) return false;
  return getPotential(id)?.rarity === "epic";
}

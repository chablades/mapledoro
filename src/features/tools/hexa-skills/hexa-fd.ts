/**
 * HEXA final-damage (FD) guide computation.
 *
 * Pure functions over the generated FD dataset (hexa-fd-data.generated.ts) and
 * the cost tables. Two outputs:
 *   - the FD breakdown: how much FD each node currently contributes and its max.
 *   - the leveling guide: the remaining steps in MapleScouter's recommended order,
 *     each with its FD gain and frag cost.
 *
 * Node curves are aligned to hexa-classes.ts node order, so a class's `classDef`
 * supplies the names/icons and this module supplies the FD/cost math.
 */

import {
  ORIGIN_COSTS,
  MASTERY_COSTS,
  ENHANCEMENT_COSTS,
  COMMON_COSTS,
  COMMON_COST_TABLES,
  type LevelCost,
} from "./hexa-costs";
import {
  HEXA_STAT_SKILLS,
  commonSkillsFor,
  type HexaClassDef,
  type HexaSkillLevels,
} from "./hexa-classes";
import { HEXA_FD } from "./hexa-fd-data.generated";

export type FdNodeKind = "origin" | "ascent" | "mastery" | "enhancement" | "common" | "hexaStat";

export interface FdNode {
  code: string;
  kind: FdNodeKind;
  name: string;
  /** Extra skill names for a multi-skill mastery node (beyond `name`). */
  extraSkills: string[];
  iconId: string;
  iconUrl?: string;
  curve: number[];
  costs: readonly LevelCost[];
  level: number;
  desired: number;
}

export function hasFdData(className: string | null): boolean {
  return className != null && className in HEXA_FD;
}

/** Sum of `curve[from … to)` (levels are 1-indexed; curve index 0 = level 1). */
function sumRange(curve: number[], from: number, to: number): number {
  let total = 0;
  for (let i = from; i < to; i++) total += curve[i] ?? 0;
  return total;
}

/** Build the aligned node list for a class, or null if it has no FD data. */
function buildNodes(
  className: string,
  classDef: HexaClassDef,
  levels: HexaSkillLevels,
  desired: HexaSkillLevels,
): FdNode[] | null {
  const fd = HEXA_FD[className];
  if (!fd) return null;

  const nodes: FdNode[] = [];

  nodes.push({
    code: "o",
    kind: "origin",
    name: classDef.origin.name,
    extraSkills: [],
    iconId: classDef.origin.iconId,
    iconUrl: classDef.origin.iconUrl,
    curve: fd.origin,
    costs: ORIGIN_COSTS,
    level: levels.origin,
    desired: desired.origin,
  });

  if (classDef.ascent && fd.ascent.length > 0) {
    nodes.push({
      code: "a",
      kind: "ascent",
      name: classDef.ascent.name,
      extraSkills: [],
      iconId: classDef.ascent.iconId,
      iconUrl: classDef.ascent.iconUrl,
      curve: fd.ascent,
      costs: ORIGIN_COSTS,
      level: levels.ascent,
      desired: desired.ascent,
    });
  }

  classDef.mastery.forEach((node, i) => {
    nodes.push({
      code: `m${i}`,
      kind: "mastery",
      name: node.skills[0],
      extraSkills: node.skills.slice(1),
      iconId: node.iconId,
      iconUrl: node.iconUrl,
      curve: fd.mastery[i] ?? [],
      costs: MASTERY_COSTS,
      level: levels.mastery[i] ?? 0,
      desired: desired.mastery[i] ?? 0,
    });
  });

  classDef.enhancement.forEach((skill, i) => {
    nodes.push({
      code: `e${i}`,
      kind: "enhancement",
      name: skill.name,
      extraSkills: [],
      iconId: skill.iconId,
      iconUrl: skill.iconUrl,
      curve: fd.enhancement[i] ?? [],
      costs: ENHANCEMENT_COSTS,
      level: levels.enhancement[i] ?? 0,
      desired: desired.enhancement[i] ?? 0,
    });
  });

  commonSkillsFor(className).forEach((skill, i) => {
    nodes.push({
      code: `c${i}`,
      kind: "common",
      name: skill.name,
      extraSkills: [],
      iconId: skill.iconId,
      iconUrl: skill.iconUrl,
      curve: fd.common[i] ?? [],
      costs: COMMON_COST_TABLES[i] ?? COMMON_COSTS,
      level: levels.common[i] ?? 0,
      desired: desired.common[i] ?? 0,
    });
  });

  return nodes;
}

// ── FD Breakdown ─────────────────────────────────────────────────────────────

export interface FdNodeContribution {
  node: FdNode;
  currentFd: number;
  maxFd: number;
}

export interface FdBreakdown {
  totalCurrent: number;
  totalMax: number;
  nodes: FdNodeContribution[];
}

export function computeFdBreakdown(
  className: string | null,
  classDef: HexaClassDef | null,
  levels: HexaSkillLevels,
  desired: HexaSkillLevels,
): FdBreakdown | null {
  if (!className || !classDef) return null;
  const nodes = buildNodes(className, classDef, levels, desired);
  if (!nodes) return null;

  let totalCurrent = 0;
  let totalMax = 0;
  // Sol Janus is an EXP skill with no FD curve, so it only ever renders a 0% row.
  const contributions = nodes.filter((node) => node.name !== "Sol Janus").map((node) => {
    const currentFd = sumRange(node.curve, 0, node.level);
    const maxFd = sumRange(node.curve, 0, node.curve.length);
    totalCurrent += currentFd;
    totalMax += maxFd;
    return { node, currentFd, maxFd };
  });

  return { totalCurrent, totalMax, nodes: contributions };
}

// ── Leveling Guide ───────────────────────────────────────────────────────────

export interface GuideStep {
  code: string;
  kind: FdNodeKind;
  name: string;
  extraSkills: string[];
  iconId: string;
  iconUrl?: string;
  fromLevel: number;
  toLevel: number;
  fdGain: number;
  fragCost: number;
  solErdaCost: number;
  fdPerFrag: number;
  /** Cumulative fragments across the remaining steps up to and including this one. */
  cumFrag: number;
}

export interface GuideResult {
  steps: GuideStep[];
  totalFrag: number;
  totalSolErda: number;
  /** FD still to gain by following every remaining step (to desired levels). */
  remainingFd: number;
  /** Common nodes with no FD curve for this class, so they're absent from the order. */
  missingFdNodes: string[];
}

/**
 * Common nodes the dataset has no FD for. MapleScouter is KMS-first, so a class that doesn't
 * exist there can be missing a node's numbers entirely: it then never appears in the
 * recommended order and shows a flat 0% in the breakdown. The guide names those rather than
 * letting a node look worthless. Sol Janus is excluded because it's an EXP skill that
 * legitimately grants no final damage.
 */
function findMissingFdNodes(className: string, commonCurves: number[][]): string[] {
  return commonSkillsFor(className)
    .filter((skill, i) => skill.name !== "Sol Janus" && (commonCurves[i] ?? []).every((v) => v === 0))
    .map((skill) => skill.name);
}

/** `h1`/`h2`/`h3` order tokens -> HEXA_STAT_SKILLS index, or null for a real node code. */
function hexaStatIndex(code: string): number | null {
  const match = /^h([1-9])$/.exec(code);
  return match ? Number(match[1]) - 1 : null;
}

/** A run of consecutive same-skill levels not yet emitted (all 0% FD so far). */
interface PendingRun {
  fromLevel: number;
  frags: number;
  solErda: number;
}

interface MergedStep {
  fromLevel: number;
  toLevel: number;
  fdGain: number;
  frags: number;
  solErda: number;
}

/**
 * Fold one level of `node` into the guide. A 0% level is banked in `pending` and
 * returns null; an FD-granting level returns the merged step (banked frags + this
 * one) and clears the bank. Levels of a node are sequential, so a bank always
 * chains straight into the next FD level.
 */
function foldLevel(node: FdNode, toLevel: number, pending: Map<string, PendingRun>): MergedStep | null {
  const cost = node.costs[toLevel - 1];
  const fdGain = node.curve[toLevel - 1] ?? 0;
  const run = pending.get(node.code);

  if (fdGain === 0) {
    if (run) {
      run.frags += cost.fragments;
      run.solErda += cost.solErda;
    } else {
      pending.set(node.code, { fromLevel: toLevel - 1, frags: cost.fragments, solErda: cost.solErda });
    }
    return null;
  }

  pending.delete(node.code);
  return {
    fromLevel: run ? run.fromLevel : toLevel - 1,
    toLevel,
    fdGain,
    frags: (run?.frags ?? 0) + cost.fragments,
    solErda: (run?.solErda ?? 0) + cost.solErda,
  };
}

/**
 * Replay the recommended order, emitting the steps still ahead of the character's
 * current levels (and within their desired levels). Each node code in the order
 * means "raise that node one level", so its target level is the running count.
 *
 * Levels that grant 0% FD are folded forward into that skill's next FD-granting
 * level: a skill's levels are sequential, so 1→2→3 at 0% then 3→4 at 0.5% becomes
 * a single 1→4 step whose frag cost includes the intermediate levels. Adjacent
 * steps for the same skill (nothing else leveled between them) are then merged, so a
 * run like 8→9 then 9→10 collapses to one 8→10 step instead of one row per level.
 */
export function computeGuide(
  className: string | null,
  classDef: HexaClassDef | null,
  levels: HexaSkillLevels,
  desired: HexaSkillLevels,
  /** Per HEXA Stat node; a finished one drops out of the guide like a maxed skill does. */
  hexaStatDone: boolean[] = [],
): GuideResult | null {
  if (!className || !classDef) return null;
  const fd = HEXA_FD[className];
  const nodes = buildNodes(className, classDef, levels, desired);
  if (!fd || !nodes) return null;

  const byCode = new Map(nodes.map((n) => [n.code, n]));
  const running: Record<string, number> = {};
  const pending = new Map<string, PendingRun>();
  const steps: GuideStep[] = [];
  let cumFrag = 0;
  let totalSolErda = 0;
  let remainingFd = 0;

  const emit = (node: FdNode, fromLevel: number, toLevel: number, fdGain: number, frags: number, solErda: number) => {
    cumFrag += frags;
    totalSolErda += solErda;
    remainingFd += fdGain;
    // Adjacent steps for the same node (nothing else emitted between them) are one
    // run of leveling, so fold them into a single step (e.g. 8 → 9 then 9 → 10 → 8 → 10).
    const last = steps[steps.length - 1];
    if (last && last.code === node.code) {
      last.toLevel = toLevel;
      last.fdGain += fdGain;
      last.fragCost += frags;
      last.solErdaCost += solErda;
      last.fdPerFrag = last.fragCost > 0 ? last.fdGain / last.fragCost : 0;
      last.cumFrag = cumFrag;
      return;
    }
    steps.push({
      code: node.code,
      kind: node.kind,
      name: node.name,
      extraSkills: node.extraSkills,
      iconId: node.iconId,
      iconUrl: node.iconUrl,
      fromLevel,
      toLevel,
      fdGain,
      fragCost: frags,
      solErdaCost: solErda,
      fdPerFrag: frags > 0 ? fdGain / frags : 0,
      cumFrag,
    });
  };

  // A HEXA Stat core is rolled, not leveled: its fragment cost and FD depend on the lines
  // you hit, so the marker carries zeros and leaves every running total untouched. It's a
  // position in the order, nothing more.
  const emitHexaStat = (index: number) => {
    const skill = HEXA_STAT_SKILLS[index];
    if (!skill || hexaStatDone[index]) return;
    steps.push({
      code: `h${index + 1}`,
      kind: "hexaStat",
      name: skill.name,
      extraSkills: [],
      iconId: skill.iconId,
      iconUrl: skill.iconUrl,
      fromLevel: 0,
      toLevel: 0,
      fdGain: 0,
      fragCost: 0,
      solErdaCost: 0,
      fdPerFrag: 0,
      cumFrag,
    });
  };

  for (const code of fd.order) {
    const statIndex = hexaStatIndex(code);
    if (statIndex !== null) {
      emitHexaStat(statIndex);
      continue;
    }
    const node = byCode.get(code);
    if (!node) continue;
    const toLevel = (running[code] = (running[code] ?? 0) + 1);
    if (toLevel <= node.level || toLevel > node.desired) continue;

    const step = foldLevel(node, toLevel, pending);
    if (step) emit(node, step.fromLevel, step.toLevel, step.fdGain, step.frags, step.solErda);
  }

  // Any run still pending never reached an FD-granting level within the desired
  // range (a skill, or its upper levels, that gives 0% FD). It has no milestone,
  // so the guide drops it rather than showing a step worth 0% final damage.

  // Markers alone aren't a guide: a character with everything at its desired level should
  // see an empty guide, not three HEXA Stat tiles with no leveling around them.
  const guideSteps = steps.some((step) => step.kind !== "hexaStat") ? steps : [];

  return {
    steps: guideSteps,
    totalFrag: cumFrag,
    totalSolErda,
    remainingFd,
    missingFdNodes: findMissingFdNodes(className, fd.common),
  };
}

/**
 * Levels after following `steps` (a prefix of a guide's steps): each node is raised to the
 * highest `toLevel` any of them gives it. Codes are the ones minted in `buildNodes`
 * (`o`, `a`, `m{i}`, `e{i}`, `c{i}`).
 */
export function applyGuideSteps(levels: HexaSkillLevels, steps: GuideStep[]): HexaSkillLevels {
  const next: HexaSkillLevels = {
    ...levels,
    mastery: [...levels.mastery],
    enhancement: [...levels.enhancement],
    common: [...levels.common],
  };
  const raise = (arr: number[], idx: number, to: number) => {
    arr[idx] = Math.max(arr[idx] ?? 0, to);
  };
  for (const step of steps) {
    const idx = Number(step.code.slice(1));
    switch (step.kind) {
      case "origin": next.origin = Math.max(next.origin, step.toLevel); break;
      case "ascent": next.ascent = Math.max(next.ascent, step.toLevel); break;
      case "mastery": raise(next.mastery, idx, step.toLevel); break;
      case "enhancement": raise(next.enhancement, idx, step.toLevel); break;
      case "common": raise(next.common, idx, step.toLevel); break;
      default: break;
    }
  }
  return next;
}

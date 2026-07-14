/**
 * HEXA final-damage (FD) guide computation.
 *
 * Pure functions over the generated FD dataset (hexa-fd-data.generated.ts) and
 * the cost tables. Two outputs:
 *   - the FD breakdown: how much FD each node currently contributes and its max.
 *   - the leveling guide: the remaining steps in maplebot's recommended order
 *     (already gated by HEXA tier unlocks), each with its FD gain and frag cost.
 *
 * Node curves are aligned to hexa-classes.ts node order, so a class's `classDef`
 * supplies the names/icons and this module supplies the FD/cost math.
 */

import {
  ORIGIN_COSTS,
  MASTERY_COSTS,
  ENHANCEMENT_COSTS,
  COMMON_COSTS,
  type LevelCost,
} from "./hexa-costs";
import { COMMON_SKILLS, type HexaClassDef, type HexaSkillLevels } from "./hexa-classes";
import { HEXA_FD } from "./hexa-fd-data.generated";

export type FdNodeKind = "origin" | "ascent" | "mastery" | "enhancement" | "common";

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

  COMMON_SKILLS.forEach((skill, i) => {
    nodes.push({
      code: `c${i}`,
      kind: "common",
      name: skill.name,
      extraSkills: [],
      iconId: skill.iconId,
      iconUrl: skill.iconUrl,
      curve: fd.common[i] ?? [],
      costs: COMMON_COSTS,
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
  const contributions = nodes.map((node) => {
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
}

/**
 * Replay the recommended order, emitting the steps still ahead of the character's
 * current levels (and within their desired levels). Each node code in the order
 * means "raise that node one level", so its target level is the running count.
 */
export function computeGuide(
  className: string | null,
  classDef: HexaClassDef | null,
  levels: HexaSkillLevels,
  desired: HexaSkillLevels,
): GuideResult | null {
  if (!className || !classDef) return null;
  const fd = HEXA_FD[className];
  const nodes = buildNodes(className, classDef, levels, desired);
  if (!fd || !nodes) return null;

  const byCode = new Map(nodes.map((n) => [n.code, n]));
  const running: Record<string, number> = {};
  const steps: GuideStep[] = [];
  let cumFrag = 0;
  let totalSolErda = 0;
  let remainingFd = 0;

  for (const code of fd.order) {
    if (code.startsWith("#")) continue;
    const node = byCode.get(code);
    if (!node) continue;
    const toLevel = (running[code] = (running[code] ?? 0) + 1);
    if (toLevel <= node.level || toLevel > node.desired) continue;

    const cost = node.costs[toLevel - 1];
    const fdGain = node.curve[toLevel - 1] ?? 0;
    cumFrag += cost.fragments;
    totalSolErda += cost.solErda;
    remainingFd += fdGain;
    steps.push({
      code: node.code,
      kind: node.kind,
      name: node.name,
      extraSkills: node.extraSkills,
      iconId: node.iconId,
      iconUrl: node.iconUrl,
      fromLevel: toLevel - 1,
      toLevel,
      fdGain,
      fragCost: cost.fragments,
      solErdaCost: cost.solErda,
      fdPerFrag: cost.fragments > 0 ? fdGain / cost.fragments : 0,
      cumFrag,
    });
  }

  return { steps, totalFrag: cumFrag, totalSolErda, remainingFd };
}

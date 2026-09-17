// Pure Erda Link progression logic: the tree for a class, its recommended order, and where a
// character is along it. No React, no storage.

import {
  ERDA_LINK_EDGES,
  ERDA_LINK_MAX_LEVEL,
  ERDA_LINK_SLOTS,
  type ErdaLinkNodeKind,
} from "./erda-link-data";
import { ERDA_LINK_ORDER, type ErdaLinkClassKey } from "./erda-link-order";

/** Current level per node key. A missing key is level 0 (or the node's minimum). */
export type ErdaLinkLevels = Record<string, number>;

export interface ErdaLinkNode {
  key: string;
  label: string;
  kind: ErdaLinkNodeKind;
  /** `erda-skill` id, or null when the host has no art; see `erdaLinkIconUrl`. */
  icon: string | null;
  col: number;
  row: number;
  minLevel: number;
  maxLevel: number;
}

export interface ErdaLinkStep {
  /** Position in the recommended order. */
  index: number;
  key: string;
  /** Level this step raises the node to. */
  level: number;
  erda: number;
  frags: number;
  /** FD gain of this one step, in percent. */
  fd: number;
}

export interface ErdaLinkTotals {
  erda: number;
  frags: number;
  /** Percent, a plain sum of the steps' gains. */
  fd: number;
}

export interface ErdaLinkProgress {
  steps: readonly ErdaLinkStep[];
  /** Per step: the node is already at or past that level. Steps can be done out of order. */
  done: readonly boolean[];
  /** First step not yet done, or -1 once every step is. */
  nextIndex: number;
  spent: ErdaLinkTotals;
  total: ErdaLinkTotals;
}

const nodeCache = new Map<ErdaLinkClassKey, readonly ErdaLinkNode[]>();
const edgeCache = new Map<ErdaLinkClassKey, readonly (readonly [string, string])[]>();
const stepCache = new Map<ErdaLinkClassKey, readonly ErdaLinkStep[]>();

export function erdaLinkNodes(cls: ErdaLinkClassKey): readonly ErdaLinkNode[] {
  let nodes = nodeCache.get(cls);
  if (!nodes) {
    nodes = ERDA_LINK_SLOTS.map((s) => ({
      key: s.key[cls],
      label: s.label[cls],
      kind: s.kind,
      icon: s.icon[cls],
      col: s.col,
      row: s.row,
      // Origin is level 1 from the moment the class exists, like the HEXA tracker's origin.
      minLevel: s.key[cls] === "ORIGIN" ? 1 : 0,
      maxLevel: ERDA_LINK_MAX_LEVEL[s.kind],
    }));
    nodeCache.set(cls, nodes);
  }
  return nodes;
}

/** Edges in this class's keys (the data lists them in Erel's). */
export function erdaLinkEdges(cls: ErdaLinkClassKey): readonly (readonly [string, string])[] {
  let edges = edgeCache.get(cls);
  if (!edges) {
    const toClass = new Map(ERDA_LINK_SLOTS.map((s) => [s.key.erel, s.key[cls]]));
    edges = ERDA_LINK_EDGES.map(([a, b]) => [toClass.get(a) ?? a, toClass.get(b) ?? b] as const);
    edgeCache.set(cls, edges);
  }
  return edges;
}

export function erdaLinkSteps(cls: ErdaLinkClassKey): readonly ErdaLinkStep[] {
  let steps = stepCache.get(cls);
  if (!steps) {
    steps = ERDA_LINK_ORDER[cls].map(([key, level, erda, frags, fd], index) => ({
      index,
      key,
      level,
      erda,
      frags,
      fd: fd * 100,
    }));
    stepCache.set(cls, steps);
  }
  return steps;
}

export function erdaLinkLevel(levels: ErdaLinkLevels, node: ErdaLinkNode): number {
  const raw = levels[node.key];
  const level = Number.isFinite(raw) ? Math.round(raw) : node.minLevel;
  return Math.max(node.minLevel, Math.min(node.maxLevel, level));
}

function addTotals(acc: ErdaLinkTotals, step: ErdaLinkStep): ErdaLinkTotals {
  return { erda: acc.erda + step.erda, frags: acc.frags + step.frags, fd: acc.fd + step.fd };
}

export function computeErdaLinkProgress(cls: ErdaLinkClassKey, levels: ErdaLinkLevels): ErdaLinkProgress {
  const steps = erdaLinkSteps(cls);
  const zero: ErdaLinkTotals = { erda: 0, frags: 0, fd: 0 };
  let spent = zero;
  let total = zero;
  let nextIndex = -1;
  const done = steps.map((step) => {
    const isDone = (levels[step.key] ?? 0) >= step.level;
    total = addTotals(total, step);
    if (isDone) spent = addTotals(spent, step);
    else if (nextIndex === -1) nextIndex = step.index;
    return isDone;
  });
  return { steps, done, nextIndex, spent, total };
}

/** The next `count` undone steps from the current position, for the "looking ahead" list. */
export function upcomingErdaLinkSteps(progress: ErdaLinkProgress, count: number): ErdaLinkStep[] {
  const out: ErdaLinkStep[] = [];
  if (progress.nextIndex === -1) return out;
  for (let i = progress.nextIndex; i < progress.steps.length && out.length < count; i++) {
    if (!progress.done[i]) out.push(progress.steps[i]);
  }
  return out;
}

/** The first undone step for one node, or null when the guide has nothing left for it. */
export function nextErdaLinkStepFor(progress: ErdaLinkProgress, key: string): ErdaLinkStep | null {
  const i = progress.steps.findIndex((s, idx) => s.key === key && !progress.done[idx]);
  return i === -1 ? null : progress.steps[i];
}

/** Mark a step done in game: raise its node to the step's level (never lower it). */
export function applyErdaLinkStep(levels: ErdaLinkLevels, step: ErdaLinkStep): ErdaLinkLevels {
  const current = levels[step.key] ?? 0;
  if (current >= step.level) return levels;
  return { ...levels, [step.key]: step.level };
}

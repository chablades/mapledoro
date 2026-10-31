/*
  Character Info's "Changed from your saved stats": which boxes differ from the character's saved
  stats while editing, so a player can double-check an update before saving it. Each change's key
  matches the data-stat-key on its input, which the substep outlines.
*/

import { STAT_LABELS, type StatFieldId, type TripleStatFieldId } from "./statFields";
import type { StatsStepDraft, TripleStatDraft } from "./statsStepDraft";

export interface StatChange {
  key: string;
  label: string;
  before: string;
  after: string;
}

const TRIPLE_PARTS: { part: keyof TripleStatDraft; label: string }[] = [
  { part: "base", label: "Base" },
  { part: "percent", label: "%" },
  { part: "percentUnapplied", label: "% Not Applied" },
];

// "80" and "80.0" are the same value; only a real difference counts.
function sameValue(a: string, b: string): boolean {
  const x = a.trim(), y = b.trim();
  return x === y || (x !== "" && y !== "" && Number(x) === Number(y));
}

function single(draft: StatsStepDraft, id: StatFieldId): string {
  const raw = (draft as Record<string, unknown>)[id];
  return typeof raw === "string" ? raw : "";
}

/** The boxes shown (tripleIds' three parts, singleIds, Cooldown Reduction's two) whose draft
 *  value differs from `saved`, in the order they appear. */
export function statChanges(
  draft: StatsStepDraft,
  saved: StatsStepDraft,
  tripleIds: readonly TripleStatFieldId[],
  tripleLabel: (id: TripleStatFieldId) => string,
  singleIds: readonly StatFieldId[],
): StatChange[] {
  const changes: StatChange[] = [];
  const add = (key: string, label: string, before: string, after: string) => {
    if (!sameValue(before, after)) changes.push({ key, label, before: before.trim(), after: after.trim() });
  };
  for (const id of tripleIds) {
    for (const { part, label } of TRIPLE_PARTS) {
      add(`${id}.${part}`, `${tripleLabel(id)} (${label})`, saved[id]?.[part] ?? "", draft[id]?.[part] ?? "");
    }
  }
  for (const id of singleIds) {
    if (id === "cooldownReduction") {
      add("cooldownReduction.seconds", "Cooldown Reduction (s)", saved.cooldownReduction?.seconds ?? "", draft.cooldownReduction?.seconds ?? "");
      add("cooldownReduction.percent", "Cooldown Reduction (%)", saved.cooldownReduction?.percent ?? "", draft.cooldownReduction?.percent ?? "");
    } else {
      add(id, STAT_LABELS[id] ?? id, single(saved, id), single(draft, id));
    }
  }
  return changes;
}

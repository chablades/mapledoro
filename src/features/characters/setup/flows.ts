/*
  Setup flow registry and navigation helpers.
  Defines required quick setup and optional follow-up modules.
*/
import type { SetupStepId } from "./steps";
import { getSetupStepById, type SetupStepDefinition } from "./steps";
import { isLegacyClass } from "./data/classSkillData";
import { isHyperStatEligible, isStatsWindowSubstepValid } from "./data/statsStepDraft";

/** Substep index of the Stats step's "Character Info" screen (main stat/combat/symbol/
 *  weapon-ATT fields) — stable across every flow that includes Stats (see
 *  getStepSubsteps below). The only substep whose validity genuinely differs by flow. */
const STATS_WINDOW_SUBSTEP_INDEX = 1;

type GenderOverride = "male" | "female" | "none" | null;

const SETUP_FLOWS = [
  {
    id: "quick_setup",
    label: "Quick Setup",
    description: "Fast onboarding for one character.",
    required: true,
    steps: ["gender", "marriage"] as const,
  },
  {
    id: "full_setup",
    label: "Full Setup",
    description: "Complete profile setup including stats, equipment, and more.",
    required: false,
    // Superset of maplescouter_setup: `stats` is flow-aware (shows the WH Legion rank
    // question + Weapon ATT field here too); `buffs`/`oz_rings`/`legion_artifacts` are
    // the scouter-only data full_setup didn't used to collect.
    // Ordered to minimize in-game window switching (2026-07-07): stats' Character-Info
    // fields first, then the equipment cluster (equipment/oz_rings/familiars), then an
    // uninterrupted Skill-window run (link_skills before v_matrix before hexa_matrix,
    // matching the Beginner→V→VI tab order so you never jump backward a tab), then
    // legion_artifacts + buffs last (weakest/most flexible window affinity).
    steps: ["gender", "marriage", "stats", "equipment", "oz_rings", "familiars", "link_skills", "v_matrix", "hexa_matrix", "legion_artifacts", "buffs"] as const,
  },
  {
    id: "maplescouter_setup",
    label: "MapleScouter Setup",
    description: "Collect the inputs MapleScouter needs to rank this character.",
    required: false,
    // The `stats` step is flow-aware (it adds the scouter questionnaire + weapon ATT);
    // `hexa_matrix` reuses the full-setup step as-is (auto-skipped below Lv 260).
    // Ordered to minimize in-game window switching (2026-07-07): oz_rings right after
    // stats (both touch Equipment/Inventory), then an uninterrupted Skill-window run
    // (link_skills before hexa_matrix), with buffs last since it draws from Guild/Skills/
    // Inventory and has no single fixed window affinity.
    steps: ["stats", "oz_rings", "link_skills", "hexa_matrix", "buffs"] as const,
  },
  {
    id: "stats_flow",
    label: "Stats",
    description: "Set up attack power, defense, and other stat details.",
    required: false,
    steps: ["stats"] as const,
  },
  {
    id: "equipment_flow",
    label: "Equipment",
    description: "Add equipped item details for this character.",
    required: false,
    steps: ["equipment"] as const,
  },
  {
    id: "v_matrix_flow",
    label: "V Matrix",
    description: "Add node slots and matrix details.",
    required: false,
    steps: ["v_matrix"] as const,
  },
  {
    id: "hexa_matrix_flow",
    label: "HEXA Matrix",
    description: "Add HEXA skills and HEXA stat details.",
    required: false,
    steps: ["hexa_matrix"] as const,
  },
  {
    id: "familiars_flow",
    label: "Familiars",
    description: "Add familiar presets and badge effects.",
    required: false,
    steps: ["familiars"] as const,
  },
  {
    id: "link_skills_flow",
    label: "Link Skills",
    description: "Add active link preset details.",
    required: false,
    steps: ["link_skills"] as const,
  },
  {
    id: "gender_flow",
    label: "Gender",
    description: "Set this character's gender.",
    required: false,
    steps: ["gender"] as const,
  },
  {
    id: "marriage_flow",
    label: "Marriage",
    description: "Set marriage status and partner IGN.",
    required: false,
    steps: ["marriage"] as const,
  },
  {
    id: "oz_rings_flow",
    label: "Oz Rings",
    description: "Add Oz ring levels.",
    required: false,
    steps: ["oz_rings"] as const,
  },
  {
    id: "legion_artifacts_flow",
    label: "Legion Artifacts",
    description: "Add Legion Artifact level and crystal details.",
    required: false,
    steps: ["legion_artifacts"] as const,
  },
  {
    id: "buffs_flow",
    label: "Buffs",
    description: "Add active buffs for MapleScouter.",
    required: false,
    steps: ["buffs"] as const,
  },
] as const;

type SetupFlowDefinition = (typeof SETUP_FLOWS)[number];
export type SetupFlowId = SetupFlowDefinition["id"];

const FLOW_BY_ID = new Map<SetupFlowId, SetupFlowDefinition>(
  SETUP_FLOWS.map((flow) => [flow.id, flow]),
);

const SETUP_FLOW_IDS: readonly SetupFlowId[] = SETUP_FLOWS.map((flow) => flow.id);

const QUICK_FLOW_ID: SetupFlowId = "quick_setup";

function getSetupFlowById(flowId: SetupFlowId) {
  return FLOW_BY_ID.get(flowId) ?? FLOW_BY_ID.get(QUICK_FLOW_ID)!;
}

export function getFlowStepCount(flowId: SetupFlowId) {
  return getSetupFlowById(flowId).steps.length;
}

/** Whether finishing this flow is supposed to touch the given step's data at all —
 *  used to stop leftover draft values from an abandoned different flow (e.g. Full
 *  Setup steps typed in before backing out to Quick Setup) from leaking into storage. */
export function flowIncludesStep(flowId: SetupFlowId, stepId: SetupStepId): boolean {
  return (getSetupFlowById(flowId).steps as readonly string[]).includes(stepId);
}

export function getSetupFlowLabel(flowId: SetupFlowId) {
  return getSetupFlowById(flowId).label;
}

export function clampFlowStepIndex(flowId: SetupFlowId, stepIndex: number) {
  return Math.max(0, Math.min(getFlowStepCount(flowId), stepIndex));
}

export function getFlowStepByIndex(flowId: SetupFlowId, stepIndex: number): SetupStepDefinition | null {
  const flow = getSetupFlowById(flowId);
  if (stepIndex < 1 || stepIndex > flow.steps.length) return null;
  const stepId = flow.steps[stepIndex - 1] as SetupStepId;
  return getSetupStepById(stepId);
}

export function getRequiredSetupFlowId(): SetupFlowId {
  return QUICK_FLOW_ID;
}

/**
 * Computes the first non-skipped step index and any gender auto-fill for a class.
 * Returns startStep > stepCount if all steps are skipped.
 */
export function computeEffectiveFlowStart(
  flowId: SetupFlowId,
  gender: GenderOverride,
  skipMarriage: boolean,
  characterLevel?: number,
  jobName?: string,
): { startStep: number; autoFillGender: "male" | "female" | null } {
  const stepCount = getFlowStepCount(flowId);
  let autoFillGender: "male" | "female" | null = null;

  for (let i = 1; i <= stepCount; i++) {
    const step = getFlowStepByIndex(flowId, i);
    if (!step) break;
    if (step.id === "gender" && gender !== null) {
      if (gender !== "none") autoFillGender = gender;
      continue;
    }
    if (step.id === "marriage" && skipMarriage) continue;
    if (isStepSkippedForLevel(step.id, characterLevel, jobName)) continue;
    return { startStep: i, autoFillGender };
  }

  return { startStep: stepCount + 1, autoFillGender };
}

export interface VisibleSetupStep {
  /** Real (possibly-skipped-inclusive) index into the flow's step list — pass to setSetupStepWithDirection to jump here. */
  index: number;
  /** 1-based position among only the currently-visible steps. */
  visibleNumber: number;
  label: string;
  stepId: SetupStepId;
}

/** Every non-skipped step in the flow, in order, for rendering a jump-to-step control. */
export function getVisibleSteps(
  flowId: SetupFlowId,
  gender: GenderOverride,
  skipMarriage: boolean,
  characterLevel?: number,
  jobName?: string,
): VisibleSetupStep[] {
  const stepCount = getFlowStepCount(flowId);
  const steps: VisibleSetupStep[] = [];
  for (let i = 1; i <= stepCount; i++) {
    if (isStepSkippedForClass(flowId, i, gender, skipMarriage, characterLevel, jobName)) continue;
    const step = getFlowStepByIndex(flowId, i);
    if (!step) continue;
    steps.push({ index: i, visibleNumber: steps.length + 1, label: step.label, stepId: step.id });
  }
  return steps;
}

// Stats' own Next-button validity genuinely differs by flow — MapleScouter requires
// the full scouter questionnaire answered (questionnaireComplete) and strict per-stat
// completeness (isStatsSubstepComplete), while Full Setup only checks values aren't
// insane (isStatsSubstepSane), not that every field is filled. So a "false" reported
// while MapleScouter was active doesn't necessarily still apply once Full Setup is —
// its validity has to be tracked per flow. Every other gated step (Marriage, Oz Rings,
// HEXA Matrix) uses the exact same rule regardless of which flow got there, so those
// stay flow-agnostic and keep persisting across a flow switch without needing a revisit.
function isFlowScopedValidityStep(stepId: SetupStepId): boolean {
  return stepId === "stats";
}

/** The key SetupStepFrame's onValidityChange reports validity under for a given
 *  step/substep — must be used identically when writing (SetupFlowScreen's callback)
 *  and reading (the functions below), or the two will silently disagree. */
export function getStepValidityKey(stepId: SetupStepId, substepIndex: number, flowId: SetupFlowId): string {
  return isFlowScopedValidityStep(stepId) ? `${flowId}:${stepId}:${substepIndex}` : `${stepId}:${substepIndex}`;
}

// MapleScouter's Stats report is the only one with an extra "every field filled"
// requirement layered on top of the shared sanity check (isStatsSubstepComplete
// always calls isStatsSubstepSane too — see statsStepDraft/StatsSetupStep). So a
// false reported by any OTHER stats-carrying flow is a pure sanity failure, which
// also fails MapleScouter's check — it's safe (and necessary) to inherit. A
// MapleScouter-only false might just mean blank fields, which is fine everywhere
// else, so it must NOT inherit outward.
function isSanityOnlyValidityFlow(stepId: SetupStepId, flowId: SetupFlowId): boolean {
  return stepId === "stats" && flowId !== "maplescouter_setup";
}

/** Whether a step/substep's last-known validity report is false.
 *
 *  The Stats step's "Character Info" substep (STATS_WINDOW_SUBSTEP_INDEX) is a special
 *  case: rather than trusting a self-reported cache (which only refreshes when that
 *  substep's own component happens to mount under the CURRENT flow, and otherwise goes
 *  silently stale the moment the shared draft changes under a DIFFERENT flow), its
 *  validity is computed fresh from the persisted draft every time — see
 *  isStatsWindowSubstepValid. There's no cache to go stale.
 *
 *  Every other flow-scoped substep (see isFlowScopedValidityStep) still uses the cache,
 *  with one adjustment: a substep never revisited under the CURRENT flow doesn't default
 *  to "valid" just because nothing's been reported here yet — it falls back to any other
 *  sanity-only flow's report for that same substep (see isSanityOnlyValidityFlow). */
function isSubstepKnownInvalid(
  stepId: SetupStepId,
  flowId: SetupFlowId,
  substepIndex: number,
  stepValidityById: Record<string, boolean>,
  jobName: string | undefined,
  statsRawValue: string,
  characterLevel: number | undefined,
): boolean {
  if (stepId === "stats" && substepIndex === STATS_WINDOW_SUBSTEP_INDEX) {
    const requireComplete = flowId === "maplescouter_setup";
    return !isStatsWindowSubstepValid(statsRawValue, jobName, characterLevel, requireComplete);
  }
  const ownValue = stepValidityById[getStepValidityKey(stepId, substepIndex, flowId)];
  if (ownValue !== undefined) return ownValue === false;
  if (!isFlowScopedValidityStep(stepId)) return false;
  return SETUP_FLOW_IDS.some((otherFlowId) => (
    otherFlowId !== flowId
    && isSanityOnlyValidityFlow(stepId, otherFlowId)
    && stepValidityById[getStepValidityKey(stepId, substepIndex, otherFlowId)] === false
  ));
}

// A step counts as invalid if ANY of its substeps' last report was false, since each
// substep gates independently (e.g. Stats' Hyper Stat substep being over budget
// shouldn't be forgotten just because Quick Questions, a different substep of the
// same step, is fine).
function stepHasInvalidSubstep(
  stepId: SetupStepId,
  flowId: SetupFlowId,
  stepValidityById: Record<string, boolean>,
  jobName: string | undefined,
  statsRawValue: string,
  characterLevel?: number,
): boolean {
  return getFirstInvalidSubstepIndex(stepId, flowId, stepValidityById, jobName, statsRawValue, characterLevel) !== null;
}

/** The earliest substep index (within one step) whose last-known validity is false,
 *  or null if none are. Used both to decide a whole step's validity and to gate that
 *  step's OWN substep entries in the jump dropdown (substeps before the broken one
 *  stay reachable; only it and everything after are blocked).
 *
 *  jobName/statsRawValue are only needed for the Stats step's live-computed substep
 *  (see isSubstepKnownInvalid) — pass "" for statsRawValue when gating a non-Stats step. */
export function getFirstInvalidSubstepIndex(
  stepId: SetupStepId,
  flowId: SetupFlowId,
  stepValidityById: Record<string, boolean>,
  jobName: string | undefined,
  statsRawValue: string,
  characterLevel?: number,
): number | null {
  const substepCount = getStepSubsteps(stepId, flowId, characterLevel)?.length ?? 1;
  for (let i = 0; i < substepCount; i++) {
    if (isSubstepKnownInvalid(stepId, flowId, i, stepValidityById, jobName, statsRawValue, characterLevel)) return i;
  }
  return null;
}

/**
 * The flow-index of the earliest visible step with an invalid substep (see
 * stepHasInvalidSubstep above) — steps never reported on, or not part of this flow,
 * don't count. Used to gate forward jumps in the step-jump dropdown: a step's own
 * draft data (and thus its validity) is shared across flows and across navigating
 * away from it, so this has to walk the CURRENT flow's steps fresh each time rather
 * than trusting whichever step happened to be mounted most recently.
 *
 * statsRawValue is the Stats step's own persisted draft string, needed for its live-
 * computed Character-Info substep (see isSubstepKnownInvalid) — pass "" if unavailable
 * or the flow doesn't include the Stats step.
 */
export function getFirstInvalidStepIndex(
  flowId: SetupFlowId,
  stepValidityById: Record<string, boolean>,
  gender: GenderOverride,
  skipMarriage: boolean,
  statsRawValue: string,
  characterLevel?: number,
  jobName?: string,
): number | null {
  const visible = getVisibleSteps(flowId, gender, skipMarriage, characterLevel, jobName);
  const firstInvalid = visible.find((s) => stepHasInvalidSubstep(s.stepId, flowId, stepValidityById, jobName, statsRawValue, characterLevel));
  return firstInvalid?.index ?? null;
}

/**
 * Substeps for the few step types that split one in-game window's worth of questions
 * across multiple screens (Stats: Character Info window; Equipment: Equipment/Inventory
 * window's main grid + Titles/Totems/Symbols + Pets; HEXA Matrix: Skills window's skill
 * levels + HEXA Stat). Mirrors each component's own substep show/hide conditions — keep
 * in sync with StatsSetupStep/EquipmentSetupStep/HexaMatrixSetupStep if those change.
 * Returns null for step types that don't split into substeps.
 */
export function getStepSubsteps(
  stepId: SetupStepId,
  flowId: SetupFlowId,
  characterLevel?: number,
): string[] | null {
  const isScouter = flowId === "maplescouter_setup";
  if (stepId === "stats") {
    const showHyperStat = !isScouter && isHyperStatEligible(characterLevel);
    const showInnerAbility = !isScouter;
    return [
      "Quick Questions",
      "Character Info",
      ...(showHyperStat ? ["Hyper Stats"] : []),
      ...(showInnerAbility ? ["Inner Ability"] : []),
    ];
  }
  if (stepId === "equipment") {
    return ["Equipment", "Titles, Totems & Symbols", "Pets"];
  }
  if (stepId === "hexa_matrix") {
    return isScouter ? null : ["HEXA Skills", "HEXA Stat"];
  }
  return null;
}

export function getVisibleStepInfo(
  flowId: SetupFlowId,
  stepIndex: number,
  gender: GenderOverride,
  skipMarriage: boolean,
  characterLevel?: number,
  jobName?: string,
): { visibleNumber: number; visibleTotal: number } {
  const steps = getVisibleSteps(flowId, gender, skipMarriage, characterLevel, jobName);
  return {
    visibleNumber: steps.filter((s) => s.index <= stepIndex).length,
    visibleTotal: steps.length,
  };
}

function isStepSkippedForLevel(stepId: SetupStepId, characterLevel?: number, jobName?: string): boolean {
  if (jobName && isLegacyClass(jobName)) {
    if (stepId === "v_matrix" || stepId === "hexa_matrix") return true;
  }
  const level = characterLevel ?? 0;
  if (stepId === "hexa_matrix" && level < 260) return true;
  if (stepId === "v_matrix" && level < 200) return true;
  return false;
}

export function isStepSkippedForClass(
  flowId: SetupFlowId,
  stepIndex: number,
  gender: GenderOverride,
  skipMarriage: boolean,
  characterLevel?: number,
  jobName?: string,
): boolean {
  const step = getFlowStepByIndex(flowId, stepIndex);
  if (!step) return false;
  if (step.id === "gender" && gender !== null) return true;
  if (step.id === "marriage" && skipMarriage) return true;
  if (isStepSkippedForLevel(step.id, characterLevel, jobName)) return true;
  return false;
}

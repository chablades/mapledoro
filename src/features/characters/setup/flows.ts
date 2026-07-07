/*
  Setup flow registry and navigation helpers.
  Defines required quick setup and optional follow-up modules.
*/
import type { SetupStepId } from "./steps";
import { getSetupStepById, type SetupStepDefinition } from "./steps";
import { isLegacyClass } from "./data/classSkillData";

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
] as const;

type SetupFlowDefinition = (typeof SETUP_FLOWS)[number];
export type SetupFlowId = SetupFlowDefinition["id"];

const FLOW_BY_ID = new Map<SetupFlowId, SetupFlowDefinition>(
  SETUP_FLOWS.map((flow) => [flow.id, flow]),
);

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

export function getVisibleStepInfo(
  flowId: SetupFlowId,
  stepIndex: number,
  gender: GenderOverride,
  skipMarriage: boolean,
  characterLevel?: number,
  jobName?: string,
): { visibleNumber: number; visibleTotal: number } {
  const stepCount = getFlowStepCount(flowId);
  let visibleTotal = 0;
  let visibleNumber = 0;
  for (let i = 1; i <= stepCount; i++) {
    if (!isStepSkippedForClass(flowId, i, gender, skipMarriage, characterLevel, jobName)) {
      visibleTotal++;
      if (i <= stepIndex) visibleNumber++;
    }
  }
  return { visibleNumber, visibleTotal };
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

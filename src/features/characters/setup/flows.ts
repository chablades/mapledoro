/*
  Setup flow registry and navigation helpers.
  Defines required quick setup and optional follow-up modules.
*/
import type { SetupStepId } from "./steps";
import { getSetupStepById, type SetupStepDefinition } from "./steps";

export const SETUP_FLOWS = [
  {
    id: "quick_setup",
    label: "Quick Setup",
    description: "Fast onboarding for one character.",
    required: true,
    steps: ["gender", "stats", "equipment_core"] as const,
  },
  {
    id: "character_profile_flow",
    label: "Character Profile",
    description: "Set profile basics like gender.",
    required: false,
    steps: ["gender"] as const,
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
    label: "Hexa Matrix",
    description: "Add hexa skills and hexa stat details.",
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
    id: "inventory_flow",
    label: "Inventory",
    description: "Add inventory tab captures.",
    required: false,
    steps: ["inventory"] as const,
  },
  {
    id: "legion_account_flow",
    label: "Legion",
    description: "Account-level legion and roster details.",
    required: false,
    steps: ["legion"] as const,
  },
] as const;

export type SetupFlowDefinition = (typeof SETUP_FLOWS)[number];
export type SetupFlowId = SetupFlowDefinition["id"];

const FLOW_BY_ID = new Map<SetupFlowId, SetupFlowDefinition>(
  SETUP_FLOWS.map((flow) => [flow.id, flow]),
);

const QUICK_FLOW_ID: SetupFlowId = "quick_setup";

export function getSetupFlowById(flowId: SetupFlowId) {
  return FLOW_BY_ID.get(flowId) ?? FLOW_BY_ID.get(QUICK_FLOW_ID)!;
}

export function getFlowStepCount(flowId: SetupFlowId) {
  return getSetupFlowById(flowId).steps.length;
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

export function getOptionalSetupFlows() {
  return SETUP_FLOWS.filter((flow) => !flow.required);
}

export function getRequiredSetupFlowId(): SetupFlowId {
  return QUICK_FLOW_ID;
}

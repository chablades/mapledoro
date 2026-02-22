/*
  Setup step ordering and index helpers.
  Keep this file as the single source of truth for step sequence.
*/
export const SETUP_STEPS = [
  { id: "equipment", label: "Equipment" },
  { id: "inventory", label: "Inventory" },
  { id: "v_matrix", label: "V Matrix" },
  { id: "hexa_matrix", label: "Hexa Matrix" },
  { id: "familiars", label: "Familiars" },
  { id: "link_skills", label: "Link Skills" },
  { id: "legion", label: "Legion" },
  { id: "stats", label: "Stats" },
] as const;

export type SetupStepDefinition = (typeof SETUP_STEPS)[number];
export type SetupStepId = SetupStepDefinition["id"];

export function clampSetupStepIndex(step: number) {
  return Math.max(0, Math.min(SETUP_STEPS.length, step));
}

export function getSetupStepByIndex(stepIndex: number) {
  if (stepIndex < 1 || stepIndex > SETUP_STEPS.length) return null;
  return SETUP_STEPS[stepIndex - 1];
}

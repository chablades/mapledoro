/*
  Setup step catalog and helpers.
  Keep this file as the single source of truth for step metadata.
*/
export const SETUP_STEPS = [
  { id: "gender", label: "Gender" },
  { id: "stats", label: "Stats" },
  { id: "equipment_core", label: "Equipment Core" },
  { id: "inventory", label: "Inventory" },
  { id: "v_matrix", label: "V Matrix" },
  { id: "hexa_matrix", label: "Hexa Matrix" },
  { id: "familiars", label: "Familiars" },
  { id: "link_skills", label: "Link Skills" },
  { id: "legion", label: "Legion" },
] as const;

export type SetupStepDefinition = (typeof SETUP_STEPS)[number];
export type SetupStepId = SetupStepDefinition["id"];

const SETUP_STEP_BY_ID = new Map<SetupStepId, SetupStepDefinition>(
  SETUP_STEPS.map((step) => [step.id, step]),
);

export function getSetupStepById(stepId: SetupStepId) {
  return SETUP_STEP_BY_ID.get(stepId) ?? null;
}

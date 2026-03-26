/*
  Equipment step schema + (de)serialization helpers.
  Stored as a single string in setup draft so existing flow persistence remains compatible.
*/

export type EquipmentSubstepId =
  | "equipment_window"
  | "pets"
  | "decorations"
  | "damage_skin"
  | "review";

export interface EquipmentStepDraft {
  substep: EquipmentSubstepId;
  equipmentWindowScreenshot: string;
  equipmentWindowNotes: string;
  petsScreenshot: string;
  petsNotes: string;
  decorationsScreenshot: string;
  decorationsNotes: string;
  damageSkinScreenshot: string;
  damageSkinNotes: string;
}

export const EQUIPMENT_SUBSTEPS: Array<{ id: EquipmentSubstepId; label: string }> = [
  { id: "equipment_window", label: "Equipment Window" },
  { id: "pets", label: "Pets" },
  { id: "decorations", label: "Decorations" },
  { id: "damage_skin", label: "Damage Skin" },
  { id: "review", label: "Review" },
];

export function createEmptyEquipmentStepDraft(): EquipmentStepDraft {
  return {
    substep: "equipment_window",
    equipmentWindowScreenshot: "",
    equipmentWindowNotes: "",
    petsScreenshot: "",
    petsNotes: "",
    decorationsScreenshot: "",
    decorationsNotes: "",
    damageSkinScreenshot: "",
    damageSkinNotes: "",
  };
}

export function parseEquipmentStepDraft(raw: string): EquipmentStepDraft {
  if (!raw.trim()) {
    return createEmptyEquipmentStepDraft();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<EquipmentStepDraft>;
    const base = createEmptyEquipmentStepDraft();

    const nextSubstep = EQUIPMENT_SUBSTEPS.some((entry) => entry.id === parsed.substep)
      ? parsed.substep
      : base.substep;

    return {
      substep: nextSubstep as EquipmentSubstepId,
      equipmentWindowScreenshot: typeof parsed.equipmentWindowScreenshot === "string" ? parsed.equipmentWindowScreenshot : "",
      equipmentWindowNotes: typeof parsed.equipmentWindowNotes === "string" ? parsed.equipmentWindowNotes : "",
      petsScreenshot: typeof parsed.petsScreenshot === "string" ? parsed.petsScreenshot : "",
      petsNotes: typeof parsed.petsNotes === "string" ? parsed.petsNotes : "",
      decorationsScreenshot: typeof parsed.decorationsScreenshot === "string" ? parsed.decorationsScreenshot : "",
      decorationsNotes: typeof parsed.decorationsNotes === "string" ? parsed.decorationsNotes : "",
      damageSkinScreenshot: typeof parsed.damageSkinScreenshot === "string" ? parsed.damageSkinScreenshot : "",
      damageSkinNotes: typeof parsed.damageSkinNotes === "string" ? parsed.damageSkinNotes : "",
    };
  } catch {
    return createEmptyEquipmentStepDraft();
  }
}

export function serializeEquipmentStepDraft(draft: EquipmentStepDraft): string {
  return JSON.stringify(draft);
}

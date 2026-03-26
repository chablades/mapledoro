import type { AppTheme } from "../../../../../../components/themes";
import type { EquipmentStepDraft } from "../../../schemas/equipment";

export interface EquipmentSubstepProps {
  theme: AppTheme;
  draft: EquipmentStepDraft;
  onPatch: (patch: Partial<EquipmentStepDraft>) => void;
}

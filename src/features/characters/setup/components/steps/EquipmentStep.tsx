/*
  Equipment setup step with internal substeps.
  This keeps one top-level setup step while allowing complex per-section workflows.
*/
import { useMemo } from "react";
import type { AppTheme } from "../../../../../components/themes";
import type { SetupStepDefinition } from "../../steps";
import {
  EQUIPMENT_SUBSTEPS,
  parseEquipmentStepDraft,
  serializeEquipmentStepDraft,
  type EquipmentStepDraft,
} from "../../schemas/equipment";
import EquipmentWindowSubstep from "./equipment-substeps/EquipmentWindowSubstep";
import PetsSubstep from "./equipment-substeps/PetsSubstep";
import DecorationsSubstep from "./equipment-substeps/DecorationsSubstep";
import DamageSkinSubstep from "./equipment-substeps/DamageSkinSubstep";
import ReviewSubstep from "./equipment-substeps/ReviewSubstep";
import SetupStepFrame from "../SetupStepFrame";

interface EquipmentStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export default function EquipmentStep({
  theme,
  step,
  stepNumber,
  totalSteps,
  value,
  onChange,
  onBack,
  onNext,
  onFinish,
}: EquipmentStepProps) {
  const draft = parseEquipmentStepDraft(value);

  const substepIndex = useMemo(() => {
    const index = EQUIPMENT_SUBSTEPS.findIndex((entry) => entry.id === draft.substep);
    return index >= 0 ? index : 0;
  }, [draft.substep]);

  const activeSubstep = EQUIPMENT_SUBSTEPS[substepIndex];
  const isLastSubstep = substepIndex >= EQUIPMENT_SUBSTEPS.length - 1;

  const patchDraft = (patch: Partial<EquipmentStepDraft>) => {
    onChange(serializeEquipmentStepDraft({ ...draft, ...patch }));
  };

  const goPrev = () => {
    if (substepIndex === 0) {
      onBack();
      return;
    }
    patchDraft({ substep: EQUIPMENT_SUBSTEPS[substepIndex - 1].id });
  };

  const handleAdvance = (stepAction: () => void) => {
    if (!isLastSubstep) {
      patchDraft({ substep: EQUIPMENT_SUBSTEPS[substepIndex + 1].id });
    } else {
      stepAction();
    }
  };

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description={`Section ${substepIndex + 1} of ${EQUIPMENT_SUBSTEPS.length}: ${activeSubstep.label}`}
      onBack={goPrev}
      onNext={() => handleAdvance(onNext)}
      onFinish={() => handleAdvance(onFinish)}
    >
      <div
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: "12px",
          background: theme.bg,
          padding: "0.8rem",
          marginBottom: "0.85rem",
        }}
      >
        {activeSubstep.id === "equipment_window" && (
          <EquipmentWindowSubstep theme={theme} draft={draft} onPatch={patchDraft} />
        )}
        {activeSubstep.id === "pets" && (
          <PetsSubstep theme={theme} draft={draft} onPatch={patchDraft} />
        )}
        {activeSubstep.id === "decorations" && (
          <DecorationsSubstep theme={theme} draft={draft} onPatch={patchDraft} />
        )}
        {activeSubstep.id === "damage_skin" && (
          <DamageSkinSubstep theme={theme} draft={draft} onPatch={patchDraft} />
        )}
        {activeSubstep.id === "review" && (
          <ReviewSubstep theme={theme} draft={draft} onPatch={patchDraft} />
        )}
      </div>
    </SetupStepFrame>
  );
}

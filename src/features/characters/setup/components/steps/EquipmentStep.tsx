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
  const isLastSetupStep = stepNumber >= totalSteps;

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
    const prevSubstep = EQUIPMENT_SUBSTEPS[substepIndex - 1];
    patchDraft({ substep: prevSubstep.id });
  };

  const goNext = () => {
    if (!isLastSubstep) {
      const nextSubstep = EQUIPMENT_SUBSTEPS[substepIndex + 1];
      patchDraft({ substep: nextSubstep.id });
      return;
    }
    if (isLastSetupStep) {
      onFinish();
      return;
    }
    onNext();
  };

  return (
    <>
      <p
        style={{
          margin: 0,
          marginBottom: "0.35rem",
          fontSize: "0.8rem",
          color: theme.muted,
          fontWeight: 800,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
        }}
      >
        Step {stepNumber} of {totalSteps}
      </p>
      <h2
        style={{
          margin: 0,
          marginBottom: "0.45rem",
          fontFamily: "'Fredoka One', cursive",
          fontSize: "1.3rem",
          lineHeight: 1.2,
          color: theme.text,
        }}
      >
        {step.label}
      </h2>
      <p
        style={{
          margin: 0,
          marginBottom: "0.65rem",
          fontSize: "0.88rem",
          color: theme.muted,
          fontWeight: 700,
        }}
      >
        Section {substepIndex + 1} of {EQUIPMENT_SUBSTEPS.length}: {activeSubstep.label}
      </p>

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

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={goPrev}
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: "10px",
            background: theme.bg,
            color: theme.text,
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "0.86rem",
            padding: "0.55rem 0.85rem",
            cursor: "pointer",
          }}
        >
          {substepIndex === 0 ? "Back Step" : "Back Section"}
        </button>
        <button
          type="button"
          onClick={goNext}
          style={{
            border: "none",
            borderRadius: "10px",
            background: theme.accent,
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: "0.88rem",
            padding: "0.55rem 0.9rem",
            cursor: "pointer",
          }}
        >
          {!isLastSubstep ? "Next Section" : isLastSetupStep ? "Finish" : "Next Step"}
        </button>
      </div>
    </>
  );
}

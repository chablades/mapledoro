import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import SetupStepFrame from "./SetupStepFrame";

interface GenderSetupStepProps {
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

function genderButtonStyle(
  theme: AppTheme,
  active: boolean,
  accent: string,
) {
  return {
    border: `1px solid ${active ? accent : theme.border}`,
    borderRadius: "10px",
    background: active ? `${accent}22` : theme.bg,
    color: active ? accent : theme.text,
    fontFamily: "inherit",
    fontWeight: 800,
    fontSize: "0.86rem",
    padding: "0.5rem 0.75rem",
    cursor: "pointer",
  } as const;
}

export default function GenderSetupStep({
  theme,
  step,
  stepNumber,
  totalSteps,
  value,
  onChange,
  onBack,
  onNext,
  onFinish,
}: GenderSetupStepProps) {
  const normalized = value.toLowerCase();
  const isMale = normalized === "male";
  const isFemale = normalized === "female";

  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Optional. You can skip now and set this from the character profile later."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
        <button
          type="button"
          onClick={() => onChange(isMale ? "" : "male")}
          style={genderButtonStyle(theme, isMale, "#2563eb")}
        >
          Male
        </button>
        <button
          type="button"
          onClick={() => onChange(isFemale ? "" : "female")}
          style={genderButtonStyle(theme, isFemale, "#db2777")}
        >
          Female
        </button>
      </div>
    </SetupStepFrame>
  );
}

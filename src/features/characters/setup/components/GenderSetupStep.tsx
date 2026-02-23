import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";

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
  const isLastStep = stepNumber >= totalSteps;
  const normalized = value.toLowerCase();
  const isMale = normalized === "male";
  const isFemale = normalized === "female";

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
          fontSize: "0.9rem",
          color: theme.muted,
          fontWeight: 700,
          marginBottom: "0.7rem",
        }}
      >
        Optional. You can skip now and set this from the character profile later.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
        <button
          type="button"
          onClick={() => onChange(isMale ? "" : "male")}
          style={genderButtonStyle(theme, isMale, "#2563eb")}
        >
          ♂ Male
        </button>
        <button
          type="button"
          onClick={() => onChange(isFemale ? "" : "female")}
          style={genderButtonStyle(theme, isFemale, "#db2777")}
        >
          ♀ Female
        </button>
      </div>
      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: "10px",
            background: theme.bg,
            color: theme.text,
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: "0.88rem",
            padding: "0.55rem 0.9rem",
            cursor: "pointer",
          }}
        >
          Prev Step
        </button>
        <button
          type="button"
          onClick={isLastStep ? onFinish : onNext}
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
          {isLastStep ? "Finish" : "Next Step"}
        </button>
      </div>
    </>
  );
}

/*
  Generic text-input step used by current scaffolded setup steps.
  Individual complex steps can replace this component later.
*/
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";

interface GenericSetupStepProps {
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

export default function GenericSetupStep({
  theme,
  step,
  stepNumber,
  totalSteps,
  value,
  onChange,
  onBack,
  onNext,
  onFinish,
}: GenericSetupStepProps) {
  const isLastStep = stepNumber >= totalSteps;

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
          marginBottom: "0.6rem",
        }}
      >
        Placeholder for {step.label} setup inputs.
      </p>
      <label
        style={{
          display: "block",
          fontSize: "0.8rem",
          color: theme.muted,
          fontWeight: 800,
          marginBottom: "0.35rem",
        }}
      >
        Draft Test Input
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type anything to test autosave"
        style={{
          width: "100%",
          border: `1px solid ${theme.border}`,
          borderRadius: "10px",
          background: theme.bg,
          color: theme.text,
          fontFamily: "inherit",
          fontSize: "0.9rem",
          fontWeight: 600,
          padding: "0.55rem 0.7rem",
          outline: "none",
          marginBottom: "0.8rem",
        }}
      />
      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={onBack}
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
          Back Step
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

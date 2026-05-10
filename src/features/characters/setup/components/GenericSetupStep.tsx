/*
  Generic text-input step used by current scaffolded setup steps.
  Individual complex steps can replace this component later.
*/
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import SetupStepFrame from "./SetupStepFrame";

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
  return (
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description={`Placeholder for ${step.label} setup inputs.`}
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
    >
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
          outline: "2px solid transparent",
          outlineOffset: "2px",
          transition: "outline-color 0.2s ease",
          marginBottom: "0.8rem",
        }}
        onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
        onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
      />
    </SetupStepFrame>
  );
}

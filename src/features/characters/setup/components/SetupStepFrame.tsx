import type { ReactNode } from "react";
import type { AppTheme } from "../../../../components/themes";

interface SetupStepFrameProps {
  theme: AppTheme;
  stepLabel: string;
  stepNumber: number;
  totalSteps: number;
  description: ReactNode;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  children: ReactNode;
}

export default function SetupStepFrame({
  theme,
  stepLabel,
  stepNumber,
  totalSteps,
  description,
  onBack,
  onNext,
  onFinish,
  children,
}: SetupStepFrameProps) {
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
          fontFamily: "var(--font-heading)",
          fontSize: "1.3rem",
          lineHeight: 1.2,
          color: theme.text,
        }}
      >
        {stepLabel}
      </h2>
      <div
        style={{
          margin: 0,
          fontSize: "0.9rem",
          color: theme.muted,
          fontWeight: 700,
          marginBottom: "0.7rem",
        }}
      >
        {description}
      </div>
      {children}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
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
            color: theme.accentOn,
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

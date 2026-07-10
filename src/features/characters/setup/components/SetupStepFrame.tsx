import { useEffect } from "react";
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
  /** When provided, always shows this label and always calls onNext (never Finish). */
  nextLabel?: string;
  /** Disables the Next/Finish button, e.g. while required questions are unanswered. */
  nextDisabled?: boolean;
  /** Reports this step/substep's own Next-button validity up to the setup controller
   *  (along with which substep this is, since a step's substeps are gated per-substep,
   *  not as one lump), so the step-jump dropdown can gate jumping past invalid/
   *  incomplete data the same way the Next button already does. */
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  /** Zero-based index of the active substep within this step (for the substep pip row). */
  substepIndex?: number;
  /** Total substeps in this step; the pip row only renders when this is > 1. */
  substepCount?: number;
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
  nextLabel,
  nextDisabled,
  onValidityChange,
  substepIndex = 0,
  substepCount = 0,
  children,
}: SetupStepFrameProps) {
  const isLastStep = !nextLabel && stepNumber >= totalSteps;

  useEffect(() => {
    onValidityChange?.(!nextDisabled, substepIndex);
  }, [nextDisabled, onValidityChange, substepIndex]);

  return (
    <>
      {substepCount > 1 && (
        <div
          aria-label={`Part ${substepIndex + 1} of ${substepCount}`}
          style={{ display: "flex", gap: "0.3rem", alignItems: "center", marginBottom: "0.5rem" }}
        >
          {Array.from({ length: substepCount }, (_, i) => (
            <span
              key={i}
              style={{
                height: 7,
                width: 28,
                borderRadius: 4,
                background: i <= substepIndex ? theme.accent : theme.border,
                transition: "background 0.2s ease",
              }}
            />
          ))}
        </div>
      )}
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
          marginTop: "0.9rem",
        }}
      >
        <button
          type="button"
          className="tap-target-44"
          onClick={onBack}
          style={{
            border: "none",
            background: "none",
            color: theme.muted,
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "0.85rem",
            padding: "0.55rem 0.4rem",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = theme.muted; }}
        >
          ← Prev Step
        </button>
        <button
          type="button"
          disabled={nextDisabled}
          onClick={isLastStep ? onFinish : onNext}
          style={{
            border: "none",
            borderRadius: "10px",
            background: nextDisabled ? theme.border : theme.accent,
            color: nextDisabled ? theme.muted : "#fff",
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: "0.88rem",
            padding: "0.55rem 0.9rem",
            cursor: nextDisabled ? "not-allowed" : "pointer",
          }}
        >
          {nextLabel ?? (isLastStep ? "Finish" : "Next Step")}
        </button>
      </div>
    </>
  );
}

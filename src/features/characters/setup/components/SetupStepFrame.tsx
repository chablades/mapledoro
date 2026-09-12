import { useEffect, type CSSProperties } from "react";
import type { ReactNode } from "react";
import type { AppTheme } from "../../../../components/themes";

/** The muted text-link style shared by the Back button and a "quiet" Next button. */
function quietLinkStyle(theme: AppTheme): CSSProperties {
  return {
    border: "none",
    background: "none",
    color: theme.muted,
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: "0.85rem",
    padding: "0.55rem 0.4rem",
    cursor: "pointer",
  };
}

/** A muted text-link button (Back, or a quiet Skip) that brightens to `theme.text` on hover. */
function QuietButton({ theme, label, onClick, className }: {
  theme: AppTheme; label: string; onClick: () => void; className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      style={quietLinkStyle(theme)}
      onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = theme.muted; }}
    >
      {label}
    </button>
  );
}

/** The row of progress pips for a step split across multiple substeps. */
function SubstepPips({ theme, substepIndex, substepCount }: {
  theme: AppTheme; substepIndex: number; substepCount: number;
}) {
  return (
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
  );
}

/** The step's forward button: accent-filled by default, or a quiet text link when the
 *  variant is "quiet" and it isn't disabled (a Skip that shouldn't out-shout the step body). */
function NextButton({ theme, label, quiet, disabled, onClick }: {
  theme: AppTheme; label: string; quiet: boolean; disabled: boolean | undefined; onClick: () => void;
}) {
  if (quiet && !disabled) {
    return <QuietButton theme={theme} label={label} onClick={onClick} />;
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: "10px",
        background: disabled ? theme.border : theme.accent,
        color: disabled ? theme.muted : theme.accentOn,
        fontFamily: "inherit",
        fontWeight: 800,
        fontSize: "0.88rem",
        padding: "0.55rem 0.9rem",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

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
  /** "primary" (default) is the accent-filled forward button. "quiet" renders it like the
   *  Back link, as muted text with no fill, for a forward action that shouldn't compete with a
   *  more important accent button in the step body, such as a Skip on an optional step. */
  nextVariant?: "primary" | "quiet";
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
  nextVariant = "primary",
  nextDisabled,
  onValidityChange,
  substepIndex = 0,
  substepCount = 0,
  children,
}: SetupStepFrameProps) {
  const isLastStep = !nextLabel && stepNumber >= totalSteps;
  const nextButtonLabel = nextLabel ?? (isLastStep ? "Finish" : "Next Step");
  // "Prev Step" implies an earlier step to go back to, true from step 2 onward. On step 1 of
  // any flow, single-step or not, there is no previous step within the flow itself. The button
  // still works, exiting back to the profile or intro, but what it returns to isn't a step.
  const backLabel = stepNumber > 1 ? "← Prev Step" : "← Back";

  useEffect(() => {
    onValidityChange?.(!nextDisabled, substepIndex);
  }, [nextDisabled, onValidityChange, substepIndex]);

  return (
    <>
      {substepCount > 1 && (
        <SubstepPips theme={theme} substepIndex={substepIndex} substepCount={substepCount} />
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
        <QuietButton theme={theme} label={backLabel} onClick={onBack} className="tap-target-44" />
        <NextButton
          theme={theme}
          label={nextButtonLabel}
          quiet={nextVariant === "quiet"}
          disabled={nextDisabled}
          onClick={isLastStep ? onFinish : onNext}
        />
      </div>
    </>
  );
}

import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import SetupStepFrame from "./SetupStepFrame";

interface MarriageSetupStepProps {
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

function parseMarriageValue(raw: string): { married: boolean | null; partnerName: string } {
  if (raw === "no") return { married: false, partnerName: "" };
  if (raw.startsWith("yes")) {
    const sep = raw.indexOf("|");
    return { married: true, partnerName: sep >= 0 ? raw.slice(sep + 1) : "" };
  }
  return { married: null, partnerName: "" };
}

function toggleButtonStyle(theme: AppTheme, active: boolean, accent: string) {
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

export default function MarriageSetupStep({
  theme, step, stepNumber, totalSteps, value, onChange, onBack, onNext, onFinish,
}: MarriageSetupStepProps) {
  const { married, partnerName } = parseMarriageValue(value);

  const handleMarriedToggle = (choice: boolean) => {
    if (married === choice) {
      onChange("");
      return;
    }
    if (!choice) { onChange("no"); return; }
    onChange(partnerName ? `yes|${partnerName}` : "yes");
  };

  const handlePartnerName = (name: string) => {
    onChange(name ? `yes|${name}` : "yes");
  };

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
          onClick={() => handleMarriedToggle(true)}
          style={toggleButtonStyle(theme, married === true, "#db2777")}
        >
          Married
        </button>
        <button
          type="button"
          onClick={() => handleMarriedToggle(false)}
          style={toggleButtonStyle(theme, married === false, "#2563eb")}
        >
          Not married
        </button>
      </div>
      {married === true && (
        <input
          type="text"
          placeholder="Partner's IGN (optional)"
          value={partnerName}
          onChange={(e) => handlePartnerName(e.target.value)}
          maxLength={12}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: `1px solid ${theme.border}`,
            borderRadius: "10px",
            background: theme.bg,
            color: theme.text,
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: "0.88rem",
            padding: "0.5rem 0.75rem",
            marginBottom: "0.8rem",
            outline: "none",
          }}
        />
      )}
    </SetupStepFrame>
  );
}

import type { AppTheme } from "../../../../components/themes";
import { CHARACTER_NAME_INPUT_FILTER_REGEX, MIN_QUERY_LENGTH } from "../../model/constants";
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

function partnerInputStyle(theme: AppTheme) {
  return {
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
    outlineColor: "transparent",
  } as const;
}

export default function MarriageSetupStep({
  theme, step, stepNumber, totalSteps, value, onChange, onBack, onNext, onFinish,
}: MarriageSetupStepProps) {
  const { married, partnerName } = parseMarriageValue(value);
  const partnerNameTooShort = married === true && partnerName.length > 0 && partnerName.length < MIN_QUERY_LENGTH;

  const handleMarriedToggle = (choice: boolean) => {
    if (married === choice) {
      onChange("");
      return;
    }
    if (!choice) { onChange("no"); return; }
    onChange(partnerName ? `yes|${partnerName}` : "yes");
  };

  const handlePartnerName = (name: string) => {
    const sanitized = name.replace(CHARACTER_NAME_INPUT_FILTER_REGEX, "").slice(0, 12);
    onChange(sanitized ? `yes|${sanitized}` : "yes");
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
      nextDisabled={partnerNameTooShort}
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
        <>
          <input
            type="text"
            aria-label="Partner's IGN"
            placeholder="Partner's IGN (optional)"
            value={partnerName}
            onChange={(e) => handlePartnerName(e.target.value)}
            onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
            onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
            minLength={MIN_QUERY_LENGTH}
            maxLength={12}
            style={partnerInputStyle(theme)}
          />
          {partnerNameTooShort && (
            <p style={{ margin: "-0.55rem 0 0.8rem", fontSize: "0.78rem", fontWeight: 700, color: "#dc2626" }}>
              IGNs are at least {MIN_QUERY_LENGTH} characters.
            </p>
          )}
        </>
      )}
    </SetupStepFrame>
  );
}

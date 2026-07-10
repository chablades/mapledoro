import type { CSSProperties } from "react";
import { CHARACTERS_COPY } from "../content";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { primaryButtonStyle, secondaryButtonStyle } from "../components/uiStyles";
import { dialogPrimaryBtnColors, type AppTheme } from "../../../../components/themes";
import { getClassSetupOverrides } from "../../setup/data/nexonJobMapping";
import { computeEffectiveFlowStart, getFlowStepCount } from "../../setup/flows";

interface SetupIntroScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

function skipButtonStyle(theme: AppTheme, disabled: boolean): CSSProperties {
  return {
    position: "absolute",
    top: 0,
    right: 0,
    border: "none",
    background: "none",
    color: theme.muted,
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: "0.8rem",
    padding: "0.3rem 0.4rem",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export default function QuickSetupIntroScreen({ model, actions }: SetupIntroScreenProps) {
  const { theme, setup } = model;
  if (setup.showFlowOverview || setup.setupStepIndex !== 0) return null;
  const isAdditionalCharacterSetup = setup.hasCompletedRequiredSetupEver;
  const title = isAdditionalCharacterSetup
    ? CHARACTERS_COPY.quickSetupIntro.additionalTitle
    : CHARACTERS_COPY.quickSetupIntro.firstTitle;
  const subtitle = isAdditionalCharacterSetup
    ? CHARACTERS_COPY.quickSetupIntro.additionalSubtitle
    : CHARACTERS_COPY.quickSetupIntro.firstSubtitle;

  const jobName = model.profile.confirmedCharacter?.jobName ?? "";
  const overrides = getClassSetupOverrides(jobName);
  const quickStepCount = getFlowStepCount("quick_setup");
  const characterLevel = model.profile.confirmedCharacter?.level;
  const { startStep: quickStartStep } = computeEffectiveFlowStart(
    "quick_setup", overrides.gender, overrides.skipMarriage, characterLevel, jobName,
  );
  const quickSetupAllSkipped = quickStartStep > quickStepCount;
  const genderSkipped = overrides.gender !== null;
  let quickSetupSubtitle = "Gender & marriage only";
  if (genderSkipped) quickSetupSubtitle = "Marriage only";
  else if (overrides.skipMarriage) quickSetupSubtitle = "Gender only";

  return (
    <>
      {/* Zero-like classes (no gender/marriage to ask) already get an equivalent
          "Continue" button below in the quickSetupAllSkipped branch — a second skip
          button here would just be a redundant way to do the same thing. */}
      {!quickSetupAllSkipped && (
        <button
          type="button"
          disabled={setup.isUiLocked}
          onClick={() => actions.skipSetupEntirely()}
          style={skipButtonStyle(theme, setup.isUiLocked)}
          onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = theme.muted; }}
        >
          Skip for now
        </button>
      )}
      <h2
        style={{
          margin: 0,
          marginBottom: "0.45rem",
          fontFamily: "var(--font-heading)",
          fontSize: "1.3rem",
          lineHeight: 1.2,
          color: theme.text,
          // Skip button floats top-right via position:absolute — reserve room so long
          // titles wrap before reaching its corner instead of rendering underneath it.
          paddingRight: quickSetupAllSkipped ? 0 : "6.5rem",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: "0.9rem",
          color: theme.muted,
          fontWeight: 700,
          marginBottom: "1rem",
        }}
      >
        {subtitle}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {quickSetupAllSkipped ? (
          <>
            <p style={{ margin: 0, fontSize: "0.85rem", color: theme.muted, fontWeight: 700 }}>
              This character has no gender or marriage to configure.
            </p>
            <button
              type="button"
              disabled={setup.isUiLocked}
              onClick={() => actions.startOptionalFlow("quick_setup")}
              style={{
                ...secondaryButtonStyle(theme, "0.65rem 0.9rem"),
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
              }}
            >
              <span style={{ fontWeight: 900, fontSize: "0.9rem" }}>Skip setup</span>
              <span style={{ fontWeight: 700, fontSize: "0.8rem", color: theme.muted }}>
                Add character and go to profile
              </span>
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={setup.isUiLocked}
            onClick={() => actions.startOptionalFlow("quick_setup")}
            style={{
              ...secondaryButtonStyle(theme, "0.65rem 0.9rem"),
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
            }}
          >
            <span style={{ fontWeight: 900, fontSize: "0.9rem" }}>Quick setup</span>
            <span style={{ fontWeight: 700, fontSize: "0.8rem", color: theme.muted }}>
              {quickSetupSubtitle}
            </span>
          </button>
        )}
        <button
          type="button"
          disabled={setup.isUiLocked}
          onClick={() => actions.startOptionalFlow("maplescouter_setup")}
          style={{
            ...secondaryButtonStyle(theme, "0.65rem 0.9rem"),
            ...dialogPrimaryBtnColors(theme),
            color: theme.text,
            borderColor: theme.border,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
          }}
        >
          <span style={{ fontWeight: 900, fontSize: "0.9rem" }}>MapleScouter setup</span>
          <span style={{ fontWeight: 700, fontSize: "0.8rem", color: theme.muted }}>
            Stats, buffs, and skill levels, for MapleScouter calculations
          </span>
        </button>
        <button
          type="button"
          disabled={setup.isUiLocked}
          onClick={() => actions.startOptionalFlow("full_setup")}
          style={{
            ...primaryButtonStyle(theme, "0.65rem 0.9rem"),
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
          }}
        >
          <span style={{ fontWeight: 900, fontSize: "0.9rem" }}>Full setup</span>
          <span style={{ fontWeight: 700, fontSize: "0.8rem", opacity: 0.8 }}>
            Stats, equipment, skills, and more. All steps are optional.
          </span>
        </button>
      </div>
    </>
  );
}

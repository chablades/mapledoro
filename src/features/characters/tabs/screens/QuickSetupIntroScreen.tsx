import { CHARACTERS_COPY } from "../content";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { primaryButtonStyle, secondaryButtonStyle } from "../components/uiStyles";
import { getClassSetupOverrides } from "../../setup/data/nexonJobMapping";
import { computeEffectiveFlowStart, getFlowStepCount } from "../../setup/flows";

interface SetupIntroScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
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
  const { startStep: quickStartStep } = computeEffectiveFlowStart(
    "quick_setup", overrides.gender, overrides.skipMarriage,
  );
  const quickSetupAllSkipped = quickStartStep > quickStepCount;
  const genderSkipped = overrides.gender !== null;
  let quickSetupSubtitle = "Gender & marriage only";
  if (genderSkipped) quickSetupSubtitle = "Marriage only";
  else if (overrides.skipMarriage) quickSetupSubtitle = "Gender only";

  return (
    <>
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
              <span style={{ fontWeight: 900, fontSize: "0.9rem" }}>Continue</span>
              <span style={{ fontWeight: 700, fontSize: "0.8rem", color: theme.muted }}>
                Save and go to profile
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
            Stats, equipment, skills, and more
          </span>
        </button>
      </div>
    </>
  );
}

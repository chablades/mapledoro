import { CHARACTERS_COPY } from "../content";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import { primaryButtonStyle } from "../components/uiStyles";

interface SetupIntroScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

export default function QuickSetupIntroScreen({ model, actions }: SetupIntroScreenProps) {
  const { theme, setup } = model;
  if (setup.showFlowOverview || setup.setupStepIndex !== 0) return null;

  return (
    <>
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
        {CHARACTERS_COPY.quickSetupIntro.title}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: "0.9rem",
          color: theme.muted,
          fontWeight: 700,
          marginBottom: "0.9rem",
        }}
      >
        {CHARACTERS_COPY.quickSetupIntro.subtitle}
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={setup.isUiLocked}
          onClick={() => actions.setSetupStepWithDirection(1)}
          style={primaryButtonStyle(theme, "0.55rem 0.9rem")}
        >
          {CHARACTERS_COPY.quickSetupIntro.nextStepButton}
        </button>
      </div>
    </>
  );
}

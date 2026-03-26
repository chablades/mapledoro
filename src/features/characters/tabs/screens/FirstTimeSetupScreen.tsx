import { CHARACTERS_COPY } from "../content";
import type { SearchPaneActions, SearchPaneModel } from "../paneModels";
import {
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../components/uiStyles";

interface IntroModeScreenProps {
  model: SearchPaneModel;
  actions: SearchPaneActions;
}

export default function FirstTimeSetupScreen({ model, actions }: IntroModeScreenProps) {
  const { theme, shell } = model;

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={titleStyle()}>{CHARACTERS_COPY.firstTimeSetup.title}</h1>
        <p style={subtitleStyle(theme)}>{CHARACTERS_COPY.firstTimeSetup.subtitle}</p>
      </div>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <button
          type="button"
          disabled={shell.isUiLocked}
          onClick={() => {
            if (shell.isUiLocked) return;
            actions.runTransitionToMode("import");
          }}
          style={{
            ...primaryButtonStyle(theme, "0.9rem 1rem"),
            borderRadius: "12px",
            fontSize: "0.95rem",
            textAlign: "left",
          }}
        >
          {CHARACTERS_COPY.firstTimeSetup.importButton}
        </button>
        <button
          type="button"
          disabled={shell.isUiLocked}
          onClick={() => actions.runTransitionToMode("search")}
          style={{
            ...secondaryButtonStyle(theme, "0.9rem 1rem"),
            borderRadius: "12px",
            fontWeight: 800,
            fontSize: "0.95rem",
            textAlign: "left",
          }}
        >
          {CHARACTERS_COPY.firstTimeSetup.searchButton}
        </button>
      </div>
    </>
  );
}

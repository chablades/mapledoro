import { CHARACTERS_COPY } from "../content";
import type { SearchPaneActions, SearchPaneModel } from "../paneModels";
import {
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../components/uiStyles";

interface ImportModeScreenProps {
  model: SearchPaneModel;
  actions: SearchPaneActions;
}

export default function ImportModeScreen({ model, actions }: ImportModeScreenProps) {
  const { theme, shell } = model;

  return (
    <>
      <div style={{ marginBottom: "1rem" }}>
        <h1 style={titleStyle()}>{CHARACTERS_COPY.importCharacter.title}</h1>
        <p style={subtitleStyle(theme)}>{CHARACTERS_COPY.importCharacter.subtitle}</p>
      </div>
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button
          type="button"
          disabled={shell.isUiLocked}
          onClick={actions.runBackToIntroTransition}
          style={secondaryButtonStyle(theme)}
        >
          {CHARACTERS_COPY.importCharacter.backButton}
        </button>
        <button
          type="button"
          disabled={shell.isUiLocked}
          onClick={() => actions.runTransitionToMode("search")}
          style={primaryButtonStyle(theme)}
        >
          {CHARACTERS_COPY.importCharacter.goToSearchButton}
        </button>
      </div>
    </>
  );
}

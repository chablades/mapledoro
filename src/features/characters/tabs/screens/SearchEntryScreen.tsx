import { MAX_QUERY_LENGTH } from "../../model/constants";
import { CHARACTERS_COPY } from "../content";
import type { SearchPaneActions, SearchPaneModel } from "../paneModels";
import {
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../components/uiStyles";

interface SearchEntryScreenProps {
  model: SearchPaneModel;
  actions: SearchPaneActions;
}

export default function SearchEntryScreen({ model, actions }: SearchEntryScreenProps) {
  const { theme, shell, search, profile } = model;

  return (
    <>
      <div
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}
      >
        <div>
          <h1 style={titleStyle()}>{CHARACTERS_COPY.searchEntry.title}</h1>
          <p style={subtitleStyle(theme)}>{CHARACTERS_COPY.searchEntry.subtitle}</p>
          {search.canResumeSetup && (
            <button
              type="button"
              disabled={shell.isUiLocked}
              onClick={actions.resumeSavedSetup}
              style={{
                ...secondaryButtonStyle(theme, "0.4rem 0.65rem"),
                marginTop: "0.45rem",
                fontSize: "0.82rem",
              }}
            >
              {search.resumeSetupCharacterName
                ? `Resume setup for ${search.resumeSetupCharacterName}`
                : CHARACTERS_COPY.searchEntry.resumeSetupButton}
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={shell.isUiLocked}
          onClick={() => {
            if (shell.isUiLocked) return;
            if (profile.isAddingCharacter) {
              if (search.hasCompletedRequiredFlow) {
                actions.backFromAddCharacter();
                return;
              }
              actions.runBackToIntroTransition();
              return;
            }
            if (search.hasCompletedRequiredFlow) {
              actions.backToCharactersDirectory();
              return;
            }
            actions.runBackToIntroTransition();
          }}
          style={{
            ...secondaryButtonStyle(theme, "0.5rem 0.75rem"),
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}
        >
          {profile.isAddingCharacter && search.hasCompletedRequiredFlow
            ? CHARACTERS_COPY.searchEntry.backToCharactersButton
            : search.hasCompletedRequiredFlow
              ? CHARACTERS_COPY.searchEntry.backToCharactersButton
              : CHARACTERS_COPY.searchEntry.backButton}
        </button>
      </div>

      <form onSubmit={actions.searchSubmit} className="characters-search-row">
        <input
          type="text"
          disabled={shell.isUiLocked}
          value={search.query}
          onChange={(event) => actions.queryChange(event.target.value)}
          placeholder="In-Game Name"
          maxLength={MAX_QUERY_LENGTH}
          style={{
            width: "100%",
            border: `1px solid ${theme.border}`,
            borderRadius: "12px",
            background: theme.bg,
            color: theme.text,
            fontFamily: "inherit",
            fontSize: "0.95rem",
            fontWeight: 600,
            padding: "0.8rem 0.9rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={search.isSearching || search.queryInvalid || shell.isUiLocked}
          style={{
            ...primaryButtonStyle(theme, "0.75rem 1rem"),
            borderRadius: "12px",
            background: search.isSearching || search.queryInvalid ? theme.muted : theme.accent,
            cursor:
              search.isSearching || search.queryInvalid || shell.isUiLocked
                ? "not-allowed"
                : "pointer",
          }}
        >
          {search.isSearching
            ? CHARACTERS_COPY.searchEntry.searchingButton
            : CHARACTERS_COPY.searchEntry.searchButton}
        </button>
      </form>

      <div
        style={{
          marginTop: "0.75rem",
          border: `1px solid ${theme.border}`,
          background: theme.bg,
          borderRadius: "14px",
          padding: "0.8rem 0.95rem",
        }}
      >
        <p
          style={{
            fontSize: "0.9rem",
            color: search.statusTone === "error" ? "#dc2626" : theme.muted,
            fontWeight: 700,
            margin: 0,
          }}
        >
          {search.statusMessage}
        </p>
      </div>
    </>
  );
}

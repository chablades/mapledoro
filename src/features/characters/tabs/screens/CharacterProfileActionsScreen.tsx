import type { SearchPaneActions, SearchPaneModel } from "../paneModels";
import { CHARACTERS_COPY } from "../content";
import { secondaryButtonStyle } from "../components/uiStyles";

interface CharacterProfileActionsScreenProps {
  model: SearchPaneModel;
  actions: SearchPaneActions;
  onRequestRemove: () => void;
}

export default function CharacterProfileActionsScreen({
  model,
  actions,
  onRequestRemove,
}: CharacterProfileActionsScreenProps) {
  const { theme, shell, profile } = model;
  const canShow =
    profile.confirmedCharacter &&
    profile.canViewCharacterDirectory &&
    !profile.showCharacterDirectory;
  if (!canShow) return null;

  return (
    <div
      style={{
        marginTop: "0.5rem",
        width: "100%",
        maxWidth: "300px",
        marginInline: "auto",
        minHeight: "106px",
      }}
    >
      <div
        className={[
          "profile-actions-card",
          !shell.isSwitchingToDirectory ? "profile-actions-fade-in" : "",
          shell.isSwitchingToDirectory ? "profile-to-directory-fade" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ display: "grid", gap: "0.4rem" }}
      >
        <div
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: "12px",
            background: theme.bg,
            padding: "0.45rem 0.55rem",
            display: "flex",
            justifyContent: "center",
            gap: "0.45rem",
            flexWrap: "wrap",
            boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
          }}
        >
          {!profile.isCurrentMainCharacter && (
            <button
              type="button"
              disabled={shell.isUiLocked}
              onClick={actions.setCurrentAsMain}
              style={{
                ...secondaryButtonStyle(theme, "0.28rem 0.62rem"),
                borderRadius: "999px",
                width: "fit-content",
                fontSize: "0.78rem",
              }}
            >
              {CHARACTERS_COPY.characterProfileActions.setMainButton}
            </button>
          )}
          {(profile.isCurrentChampionCharacter || profile.canSetCurrentChampion) && (
            <button
              type="button"
              disabled={shell.isUiLocked}
              onClick={actions.toggleCurrentChampion}
              style={{
                ...secondaryButtonStyle(theme, "0.28rem 0.62rem"),
                borderRadius: "999px",
                width: "fit-content",
                fontSize: "0.78rem",
              }}
              >
              {profile.isCurrentChampionCharacter
                ? CHARACTERS_COPY.characterProfileActions.removeChampionButton
                : CHARACTERS_COPY.characterProfileActions.setChampionButton}
            </button>
          )}
          <button
            type="button"
            disabled={shell.isUiLocked}
            onClick={onRequestRemove}
            aria-label="Remove character"
            style={{
              border: "1px solid #ef4444",
              borderRadius: "999px",
              background: "#fef2f2",
              color: "#991b1b",
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: "0.78rem",
              padding: "0.28rem 0.62rem",
              width: "fit-content",
              cursor: "pointer",
            }}
            >
            {`🗑 ${CHARACTERS_COPY.characterProfileActions.removeCharacterButton}`}
          </button>
        </div>
      </div>
    </div>
  );
}

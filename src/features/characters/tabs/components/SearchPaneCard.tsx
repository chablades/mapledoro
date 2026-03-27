import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SearchPaneActions, SearchPaneModel } from "../paneModels";
import FirstTimeSetupScreen from "../screens/FirstTimeSetupScreen";
import ImportModeScreen from "../screens/ImportModeScreen";
import CharacterProfileActionsScreen from "../screens/CharacterProfileActionsScreen";
import CharacterProfileScreen from "../screens/CharacterProfileScreen";
import SearchEntryScreen from "../screens/SearchEntryScreen";
import { panelCardStyle, secondaryButtonStyle } from "./uiStyles";

interface SearchPaneCardProps {
  model: SearchPaneModel;
  actions: SearchPaneActions;
}

export default function SearchPaneCard({ model, actions }: SearchPaneCardProps) {
  const { theme, shell, profile } = model;
  const searchCardRef = useRef<HTMLElement | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  useEffect(() => {
    if (profile.confirmedCharacter) return;
    const closeModalTimer = window.setTimeout(() => {
      setShowRemoveConfirm(false);
    }, 0);
    return () => clearTimeout(closeModalTimer);
  }, [profile.confirmedCharacter]);

  useEffect(() => {
    const element = searchCardRef.current;
    if (!element) return;
    if (shell.isSwitchingToDirectory) {
      const height = element.getBoundingClientRect().height;
      element.style.height = `${height}px`;
      element.style.minHeight = `${height}px`;
      return;
    }
    element.style.height = "";
    element.style.minHeight = "";
  }, [shell.isSwitchingToDirectory]);

  useEffect(() => {
    if (showRemoveConfirm) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [showRemoveConfirm]);

  return (
    <>
      <section
        ref={searchCardRef}
        className={[
          "character-search-panel",
          "search-card",
          shell.isConfirmFadeOut || shell.isModeTransitioning || shell.isBackTransitioning
            ? "confirm-fade"
            : "",
          shell.isSwitchingToDirectory ? "profile-to-directory-fade" : "",
          !shell.isConfirmFadeOut && !shell.isModeTransitioning && shell.isSearchFadeIn
            ? "search-fade-in"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...panelCardStyle(theme, "1.5rem"),
          visibility: shell.isDraftHydrated ? "visible" : "hidden",
        }}
      >
        {model.search.setupMode === "intro" && (
          <FirstTimeSetupScreen model={model} actions={actions} />
        )}
        {model.search.setupMode === "import" && (
          <ImportModeScreen model={model} actions={actions} />
        )}
        {model.search.setupMode === "search" && !model.search.setupFlowStarted && (
          <SearchEntryScreen model={model} actions={actions} />
        )}
        {model.search.setupMode === "search" && model.search.setupFlowStarted && (
          <CharacterProfileScreen model={model} actions={actions} />
        )}
      </section>

      <CharacterProfileActionsScreen
        model={model}
        actions={actions}
        onRequestRemove={() => setShowRemoveConfirm(true)}
      />

      {showRemoveConfirm && profile.confirmedCharacter && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.42)",
            display: "grid",
            placeItems: "center",
            zIndex: 60,
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              borderRadius: "14px",
              border: `1px solid ${theme.border}`,
              background: theme.panel,
              color: theme.text,
              padding: "1rem",
              boxShadow: "0 16px 48px rgba(0,0,0,0.24)",
              display: "grid",
              gap: "0.75rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
              Remove {profile.confirmedCharacter.characterName}?
            </p>
            <p style={{ margin: 0, color: theme.muted, fontSize: "0.86rem", fontWeight: 700 }}>
              This removes the character and local setup data for this profile.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.55rem" }}>
              <button
                type="button"
                onClick={() => setShowRemoveConfirm(false)}
                style={secondaryButtonStyle(theme, "0.5rem 0.75rem")}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRemoveConfirm(false);
                  actions.removeCurrentCharacter();
                }}
                style={{
                  border: "1px solid #fca5a5",
                  borderRadius: "10px",
                  background: "#ef4444",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontWeight: 800,
                  fontSize: "0.86rem",
                  padding: "0.5rem 0.8rem",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

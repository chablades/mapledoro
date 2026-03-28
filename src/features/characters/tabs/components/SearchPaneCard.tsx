import { useEffect, useRef, useState } from "react";
import type { SearchPaneActions, SearchPaneModel } from "../paneModels";
import ConfirmModal from "../../../../components/ConfirmModal";
import FirstTimeSetupScreen from "../screens/FirstTimeSetupScreen";
import ImportModeScreen from "../screens/ImportModeScreen";
import CharacterProfileActionsScreen from "../screens/CharacterProfileActionsScreen";
import CharacterProfileScreen from "../screens/CharacterProfileScreen";
import SearchEntryScreen from "../screens/SearchEntryScreen";
import { panelCardStyle } from "./uiStyles";

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

      {showRemoveConfirm && profile.confirmedCharacter && (
        <ConfirmModal
          theme={theme}
          title={`Remove ${profile.confirmedCharacter.characterName}?`}
          description="This removes the character and local setup data for this profile."
          confirmLabel="Remove"
          confirmDanger
          onConfirm={() => {
            setShowRemoveConfirm(false);
            actions.removeCurrentCharacter();
          }}
          onCancel={() => setShowRemoveConfirm(false)}
        />
      )}
    </>
  );
}

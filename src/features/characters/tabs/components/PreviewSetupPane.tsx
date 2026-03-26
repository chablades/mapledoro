import { useEffect, useState } from "react";
import { getDirectoryRevealDelays } from "../charactersDirectory";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import CharacterDirectoryScreen from "../screens/CharacterDirectoryScreen";
import SetupFlowScreen from "../screens/SetupFlowScreen";
import QuickSetupIntroScreen from "../screens/QuickSetupIntroScreen";
import SearchResultPreviewScreen from "../screens/SearchResultPreviewScreen";
import { panelCardStyle } from "./uiStyles";

interface PreviewSetupPaneProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

export default function PreviewSetupPane({ model, actions }: PreviewSetupPaneProps) {
  const { theme, setup } = model;
  const [directorySortBy, setDirectorySortBy] = useState<"name" | "level" | "class">("name");
  const [directoryRevealPhase, setDirectoryRevealPhase] = useState(0);
  const inCharacterDirectoryView = setup.showFlowOverview && setup.showCharacterDirectory;
  const shouldShowDirectoryPanel =
    inCharacterDirectoryView &&
    !setup.isSwitchingToDirectory &&
    directoryRevealPhase > 0;
  const hasCompletedRequiredFlow = setup.completedFlowIds.includes("quick_setup");
  const activeScreenId = inCharacterDirectoryView
    ? "directory"
    : !hasCompletedRequiredFlow && setup.setupStepIndex === 0
        ? "quick-setup-intro"
        : !hasCompletedRequiredFlow && setup.setupStepIndex > 0
          ? "setup-flow"
          : "none";
  const activeScreenClassName =
    activeScreenId === "directory" || activeScreenId === "none"
      ? "setup-step-content directory-step-content"
      : `setup-step-content ${
          setup.setupStepDirection === "forward" ? "step-forward" : "step-backward"
        }`;

  useEffect(() => {
    if (!inCharacterDirectoryView || setup.isSwitchingToDirectory) {
      const resetPhaseTimer = window.setTimeout(() => {
        setDirectoryRevealPhase(0);
      }, 0);
      return () => clearTimeout(resetPhaseTimer);
    }
  }, [inCharacterDirectoryView, setup.isSwitchingToDirectory]);

  useEffect(() => {
    if (!inCharacterDirectoryView || setup.isSwitchingToDirectory) return;
    const startPhaseTimer = window.setTimeout(() => {
      setDirectoryRevealPhase(0);
    }, 0);
    const { mainDelay, championDelay, mulesDelay } = getDirectoryRevealDelays(
      setup.fastDirectoryRevealOnce,
      true,
    );
    const mainTimer = window.setTimeout(() => setDirectoryRevealPhase(1), mainDelay);
    const championsTimer = window.setTimeout(() => setDirectoryRevealPhase(2), championDelay);
    const mulesTimer = window.setTimeout(() => setDirectoryRevealPhase(3), mulesDelay);
    return () => {
      clearTimeout(startPhaseTimer);
      clearTimeout(mainTimer);
      clearTimeout(championsTimer);
      clearTimeout(mulesTimer);
    };
  }, [
    inCharacterDirectoryView,
    setup.fastDirectoryRevealOnce,
    setup.isSwitchingToDirectory,
  ]);

  return (
    <div className="preview-pane">
      <SearchResultPreviewScreen model={model} actions={actions} />

      {setup.setupFlowStarted && activeScreenId !== "none" && (
        <aside
          className={`character-search-panel setup-panel ${setup.setupPanelVisible ? "setup-panel-visible" : ""} ${setup.isBackTransitioning ? "setup-panel-fade" : ""} ${setup.isFinishingSetup ? "setup-finish-fade" : ""} ${setup.isSwitchingToDirectory || setup.isSwitchingToProfile ? "profile-to-directory-fade" : ""}`}
          style={{
            ...panelCardStyle(theme, "1rem"),
            position: "relative",
            opacity: inCharacterDirectoryView && !shouldShowDirectoryPanel ? 0 : 1,
            transform:
              inCharacterDirectoryView && !shouldShowDirectoryPanel
                ? "translateY(8px)"
                : "translateY(0)",
            visibility:
              inCharacterDirectoryView && !shouldShowDirectoryPanel ? "hidden" : "visible",
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}
        >
          <div
            key={`preview-screen-${activeScreenId}-${setup.activeFlowId}-${setup.setupStepIndex}-${setup.showCharacterDirectory ? "directory" : "profile"}`}
            className={activeScreenClassName}
          >
            {activeScreenId === "directory" && (
              <CharacterDirectoryScreen
                model={model}
                actions={actions}
                directorySortBy={directorySortBy}
                onDirectorySortByChange={setDirectorySortBy}
                directoryRevealPhase={directoryRevealPhase}
              />
            )}

            {activeScreenId === "quick-setup-intro" && (
              <QuickSetupIntroScreen model={model} actions={actions} />
            )}

            {activeScreenId === "setup-flow" && <SetupFlowScreen model={model} actions={actions} />}
          </div>
        </aside>
      )}
    </div>
  );
}

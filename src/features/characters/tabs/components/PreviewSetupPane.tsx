import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { getDirectoryRevealDelays } from "../charactersDirectory";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import CharacterDirectoryScreen from "../screens/CharacterDirectoryScreen";
import SetupFlowScreen from "../screens/SetupFlowScreen";
import QuickSetupIntroScreen from "../screens/QuickSetupIntroScreen";
import SearchResultPreviewScreen from "../screens/SearchResultPreviewScreen";
import { panelCardStyle } from "./uiStyles";

// Persists the user's last selected world filter across page refreshes.
// TODO: When a "Default world" setting is added to the Settings page, read from
// user preferences here instead of (or as fallback for) this localStorage key.
// Hook: read `mapledoro_pref_default_world` (number | null) from settings store,
// and use it as the initial value if present, overriding the localStorage fallback.
const DIRECTORY_WORLD_FILTER_STORAGE_KEY = "mapledoro_directory_world_filter";

function readPersistedWorldFilter(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DIRECTORY_WORLD_FILTER_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function writePersistedWorldFilter(worldId: number | null) {
  if (typeof window === "undefined") return;
  try {
    if (worldId === null) {
      window.localStorage.removeItem(DIRECTORY_WORLD_FILTER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(DIRECTORY_WORLD_FILTER_STORAGE_KEY, JSON.stringify(worldId));
    }
  } catch {
    // Ignore localStorage write failures.
  }
}

interface PreviewSetupPaneProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

type PreviewScreenId = "directory" | "quick-setup-intro" | "setup-flow" | "none";

function getActiveScreenId(setup: PreviewPaneModel["setup"]): PreviewScreenId {
  const inCharacterDirectoryView = setup.showFlowOverview && setup.showCharacterDirectory;
  const hasCompletedRequiredFlow = setup.completedFlowIds.includes("quick_setup");
  if (inCharacterDirectoryView) return "directory";
  if (!hasCompletedRequiredFlow && setup.setupStepIndex === 0) return "quick-setup-intro";
  if (!hasCompletedRequiredFlow && setup.setupStepIndex > 0) return "setup-flow";
  return "none";
}

function getActiveScreenClassName(
  activeScreenId: PreviewScreenId,
  setupStepDirection: PreviewPaneModel["setup"]["setupStepDirection"],
) {
  return activeScreenId === "directory" || activeScreenId === "none"
    ? "setup-step-content directory-step-content"
    : `setup-step-content ${setupStepDirection === "forward" ? "step-forward" : "step-backward"}`;
}

function getSetupPanelClassName(setup: PreviewPaneModel["setup"]) {
  return [
    "character-search-panel",
    "setup-panel",
    setup.setupPanelVisible ? "setup-panel-visible" : "",
    setup.isBackTransitioning ? "setup-panel-fade" : "",
    setup.isFinishingSetup ? "setup-finish-fade" : "",
    setup.isSwitchingToDirectory || setup.isSwitchingToProfile ? "profile-to-directory-fade" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getSetupPanelInlineStyle(
  theme: PreviewPaneModel["theme"],
  inCharacterDirectoryView: boolean,
  shouldShowDirectoryPanel: boolean,
): CSSProperties {
  const visibility: CSSProperties["visibility"] =
    inCharacterDirectoryView && !shouldShowDirectoryPanel ? "hidden" : "visible";

  return {
    ...panelCardStyle(theme, "1rem"),
    position: "relative" as const,
    opacity: inCharacterDirectoryView && !shouldShowDirectoryPanel ? 0 : 1,
    transform:
      inCharacterDirectoryView && !shouldShowDirectoryPanel ? "translateY(8px)" : "translateY(0)",
    visibility,
    transition: "opacity 0.2s ease, transform 0.2s ease",
  };
}

export default function PreviewSetupPane({ model, actions }: PreviewSetupPaneProps) {
  const { theme, setup, directory } = model;
  const [directorySortBy, setDirectorySortBy] = useState<"name" | "level" | "class">("name");

  // "unset" means no explicit user choice yet — resolve to first world during render.
  // null means user explicitly chose "All worlds".
  // number means user chose a specific world.
  const [directoryWorldFilterRaw, setDirectoryWorldFilterRaw] = useState<number | null | "unset">(() => {
    const persisted = readPersistedWorldFilter();
    // readPersistedWorldFilter returns null both when key is missing AND when value is null.
    // Distinguish by checking if the key exists at all.
    if (typeof window !== "undefined") {
      const hasKey = window.localStorage.getItem(DIRECTORY_WORLD_FILTER_STORAGE_KEY) !== null;
      if (hasKey) return persisted; // null = all worlds, number = specific world
    }
    return "unset"; // No persisted preference — will resolve to first world at render time
  });

  // Resolve effective filter: if unset or selected world no longer exists, use first world
  const directoryWorldFilter: number | null =
    directoryWorldFilterRaw === "unset" || 
    (directoryWorldFilterRaw !== null && !directory.worldIds.includes(directoryWorldFilterRaw))
      ? (directory.worldIds[0] ?? null)
      : directoryWorldFilterRaw;

  const [directoryRevealPhase, setDirectoryRevealPhase] = useState(0);
  const inCharacterDirectoryView = setup.showFlowOverview && setup.showCharacterDirectory;
  const shouldShowDirectoryPanel =
    inCharacterDirectoryView &&
    !setup.isSwitchingToDirectory &&
    directoryRevealPhase > 0;
  const activeScreenId = getActiveScreenId(setup);
  const activeScreenClassName = getActiveScreenClassName(
    activeScreenId,
    setup.setupStepDirection,
  );
  const setupPanelClassName = getSetupPanelClassName(setup);
  const setupPanelStyle = getSetupPanelInlineStyle(
    theme,
    inCharacterDirectoryView,
    shouldShowDirectoryPanel,
  );

  // Persist world filter changes — stores the explicit user choice
  const handleWorldFilterChange = (worldId: number | null) => {
    setDirectoryWorldFilterRaw(worldId);
    writePersistedWorldFilter(worldId);
  };

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
          className={setupPanelClassName}
          style={setupPanelStyle}
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
                directoryWorldFilter={directoryWorldFilter}
                onDirectoryWorldFilterChange={handleWorldFilterChange}
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

import { useEffect, useEffectEvent, useState } from "react";
import type { CSSProperties } from "react";
import { buildDirectoryGroups, getDirectoryRevealDelays, type DirectorySortBy } from "../charactersDirectory";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import {
  readStoredWorldFilter,
  resolveWorldFilter,
  writeStoredWorldFilter,
  type StoredWorldFilter,
} from "../../model/directoryWorldFilter";
import CharacterDirectoryScreen from "../screens/CharacterDirectoryScreen";
import CharacterProfileOverviewScreen from "../screens/CharacterProfileOverviewScreen";
import SetupFlowScreen from "../screens/SetupFlowScreen";
import QuickSetupIntroScreen from "../screens/QuickSetupIntroScreen";
import SearchResultPreviewScreen from "../screens/SearchResultPreviewScreen";
import { panelCardStyle } from "./uiStyles";

// Persists the user's last selected world filter across page refreshes.
// TODO: When a "Default world" setting is added to the Settings page, read from
// user preferences here instead of (or as fallback for) this localStorage key.
// Hook: read `mapledoro_pref_default_world` (number | null) from settings store,
// and use it as the initial value if present, overriding the localStorage fallback.

interface PreviewSetupPaneProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

type PreviewScreenId = "directory" | "quick-setup-intro" | "setup-flow" | "profile-overview" | "none";

function getActiveScreenId(setup: PreviewPaneModel["setup"]): PreviewScreenId {
  const inCharacterDirectoryView = setup.showFlowOverview && setup.showCharacterDirectory;
  const hasCompletedRequiredFlow = setup.completedFlowIds.includes("quick_setup");
  if (inCharacterDirectoryView) return "directory";
  if (!hasCompletedRequiredFlow && setup.setupStepIndex === 0) return "quick-setup-intro";
  if (setup.setupStepIndex > 0) return "setup-flow";
  if (hasCompletedRequiredFlow && !inCharacterDirectoryView) return "profile-overview";
  return "none";
}

function getActiveScreenClassName(
  activeScreenId: PreviewScreenId,
  setupStepDirection: PreviewPaneModel["setup"]["setupStepDirection"],
  suppressLayoutTransition: boolean,
) {
  if (activeScreenId === "directory" || activeScreenId === "none") {
    return "setup-step-content directory-step-content";
  }
  // Landing straight on the profile-overview panel (refresh, deep link): use the same
  // simple fade as the profile card beside it instead of the step-forward slide, which
  // combined with the pane's own width transition (briefly suppressed here too) caused
  // flex-wrapped rows like the HEXA skill grid to visibly reflow mid-animation.
  if (activeScreenId === "profile-overview" && suppressLayoutTransition) {
    return "setup-step-content initial-reveal-fade";
  }
  const directionClass = setupStepDirection === "forward" ? "step-forward" : "step-backward";
  return `setup-step-content ${directionClass}`;
}

function getSetupPanelClassName(setup: PreviewPaneModel["setup"], isModeTransitioning: boolean) {
  return [
    "character-search-panel",
    "setup-panel",
    setup.setupPanelVisible ? "setup-panel-visible" : "",
    setup.isBackTransitioning || isModeTransitioning ? "setup-panel-fade" : "",
    setup.isFinishingSetup ? "setup-finish-fade" : "",
    setup.isSwitchingToDirectory || setup.isSwitchingToProfile ? "profile-to-directory-fade" : "",
    setup.isDeleteTransitioning ? "deleting" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getSetupPanelInlineStyle(
  theme: PreviewPaneModel["theme"],
  inCharacterDirectoryView: boolean,
  shouldShowDirectoryPanel: boolean,
  isProfileOverview: boolean,
): CSSProperties {
  const visibility: CSSProperties["visibility"] =
    inCharacterDirectoryView && !shouldShowDirectoryPanel ? "hidden" : "visible";

  return {
    // The binder's spine fills flush to the card edges (see CharacterSetupFlow.styles.ts),
    // so it supplies its own inset via profile-binder-page's padding instead of relying on
    // the card's outer padding, which would leave a gap around the spine's background.
    ...panelCardStyle(theme, isProfileOverview ? "0" : "1rem"),
    position: "relative" as const,
    opacity: inCharacterDirectoryView && !shouldShowDirectoryPanel ? 0 : 1,
    transform:
      inCharacterDirectoryView && !shouldShowDirectoryPanel ? "translateY(8px)" : "translateY(0)",
    visibility,
    transition: "opacity 0.2s ease, transform 0.2s ease",
  };
}

export default function PreviewSetupPane({ model, actions }: PreviewSetupPaneProps) {
  const { theme, setup, directory, preview } = model;
  const [directorySortBy, setDirectorySortBy] = useState<DirectorySortBy>("name");

  // See StoredWorldFilter for what each variant means. Resolved (not raw) below, since
  // "unset" and a world that has since left the roster both fall back to the first world.
  const [directoryWorldFilterRaw, setDirectoryWorldFilterRaw] =
    useState<StoredWorldFilter>(readStoredWorldFilter);
  const directoryWorldFilter = resolveWorldFilter(directoryWorldFilterRaw, directory.worldIds);

  // Mirrors CharacterDirectoryScreen's own world-scoping so the reveal-phase delay below
  // matches whether the directory view it's about to animate actually has a champions
  // section (an "all worlds" view has no such section, but hasChampionSection is false
  // there too since mainCharacterKey/championCharacterKeys resolve to null/[]).
  const showAllDirectoryWorlds = directoryWorldFilter === null && directory.worldIds.length > 1;
  const activeDirectoryWorldId = directoryWorldFilter ?? directory.worldIds[0] ?? null;
  const activeDirectoryMainKey =
    !showAllDirectoryWorlds && activeDirectoryWorldId !== null
      ? (directory.mainCharacterKeyByWorld[String(activeDirectoryWorldId)] ?? null)
      : null;
  const activeDirectoryChampionKeys =
    !showAllDirectoryWorlds && activeDirectoryWorldId !== null
      ? (directory.championCharacterKeysByWorld[String(activeDirectoryWorldId)] ?? [])
      : [];
  const hasChampionSection = buildDirectoryGroups({
    allCharacters: directory.allCharacters,
    sortBy: "name",
    mainCharacterKey: activeDirectoryMainKey,
    championCharacterKeys: activeDirectoryChampionKeys,
    maxCharacters: directory.maxCharacters,
  }).hasChampionSection;

  const getRevealDelays = useEffectEvent(() =>
    getDirectoryRevealDelays(setup.fastDirectoryRevealOnce, hasChampionSection),
  );

  const [directoryRevealPhase, setDirectoryRevealPhase] = useState(0);
  const inCharacterDirectoryView = setup.showFlowOverview && setup.showCharacterDirectory;
  const shouldShowDirectoryPanel =
    inCharacterDirectoryView &&
    !setup.isSwitchingToDirectory &&
    directoryRevealPhase > 0;
  const activeScreenId = getActiveScreenId(setup);
  const contentKey = `preview-screen-${activeScreenId}-${setup.activeFlowId}-${setup.setupStepIndex}-${setup.substepJumpNonce}-${setup.showCharacterDirectory ? "directory" : "profile"}`;
  // Locks the initial-reveal-fade decision to whichever content key was showing the moment
  // suppressLayoutTransition was first observed true, instead of re-reading that flag live.
  // suppressLayoutTransition clears itself ~220ms after hydration regardless of whether this
  // same profile-overview content is still on screen; reading it live would flip the content
  // class back to step-forward mid-animation (or after), restarting a second, different
  // animation on top of one that had already played. Setting state during render (rather
  // than a ref) is the React-sanctioned way to derive a value once and hold it across
  // renders — see "adjusting state when a prop changes" in the React docs.
  const [lockedInitialRevealKey, setLockedInitialRevealKey] = useState<string | null>(null);
  if (lockedInitialRevealKey === null && setup.suppressLayoutTransition) {
    setLockedInitialRevealKey(contentKey);
  }
  const isInitialReveal = activeScreenId === "profile-overview" && lockedInitialRevealKey === contentKey;
  const activeScreenClassName = getActiveScreenClassName(
    activeScreenId,
    setup.setupStepDirection,
    isInitialReveal,
  );
  const setupPanelClassName = getSetupPanelClassName(setup, preview.isModeTransitioning);
  const setupPanelStyle = getSetupPanelInlineStyle(
    theme,
    inCharacterDirectoryView,
    shouldShowDirectoryPanel,
    activeScreenId === "profile-overview",
  );

  // Persist world filter changes — stores the explicit user choice. The background
  // refresh only ever sweeps the world on screen, so switching is also what queues the
  // newly-shown world's stale characters (a no-op when none of them are out of date).
  const handleWorldFilterChange = (worldId: number | null) => {
    setDirectoryWorldFilterRaw(worldId);
    writeStoredWorldFilter(worldId);
    actions.queueWorldRefresh(worldId);
  };

  useEffect(() => {
    if (!inCharacterDirectoryView || setup.isSwitchingToDirectory) {
      const resetPhaseTimer = window.setTimeout(() => {
        setDirectoryRevealPhase(0);
      }, 0);
      return () => clearTimeout(resetPhaseTimer);
    }
  // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on the narrowed `setup.isSwitchingToDirectory` primitive, not the whole `setup` object, to avoid re-running when unrelated fields change
  }, [inCharacterDirectoryView, setup.isSwitchingToDirectory]);

  useEffect(() => {
    if (!inCharacterDirectoryView || setup.isSwitchingToDirectory) return;
    const startPhaseTimer = window.setTimeout(() => {
      setDirectoryRevealPhase(0);
    }, 0);
    const { mainDelay, championDelay, mulesDelay } = getRevealDelays();
    const mainTimer = window.setTimeout(() => setDirectoryRevealPhase(1), mainDelay);
    const championsTimer = window.setTimeout(() => setDirectoryRevealPhase(2), championDelay);
    const mulesTimer = window.setTimeout(() => setDirectoryRevealPhase(3), mulesDelay);
    return () => {
      clearTimeout(startPhaseTimer);
      clearTimeout(mainTimer);
      clearTimeout(championsTimer);
      clearTimeout(mulesTimer);
    };
  // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on narrowed `setup.*` primitives, not the whole `setup` object, to avoid re-running when unrelated fields change
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
            key={contentKey}
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

            {activeScreenId === "profile-overview" && (
              <CharacterProfileOverviewScreen model={model} actions={actions} />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

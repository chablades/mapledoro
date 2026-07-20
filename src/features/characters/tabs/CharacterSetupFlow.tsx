"use client";

/*
  Character setup flow shell.
  Keeps rendering focused while the controller hook owns state and navigation.
*/
import { useEffect } from "react";
import type { AppTheme } from "../../../components/themes";
import { deriveCharactersLayout } from "./charactersLayout";
import { getCharacterSetupFlowStyles } from "./CharacterSetupFlow.styles";
import PreviewSetupPane from "./components/PreviewSetupPane";
import SearchPaneCard from "./components/SearchPaneCard";
import type { PreviewPaneActions, PreviewPaneModel, SearchPaneActions, SearchPaneModel } from "./paneModels";
import { useCharacterSetupController, MAX_CHAMPIONS } from "./useCharacterSetupController";
import { toCharacterKey } from "../model/characterKeys";
import type { StoredCharacterRecord } from "../model/charactersStore";

interface CharacterSetupFlowProps {
  theme: AppTheme;
  initialCharacterName?: string;
  initialAction?: string;
}

const MAX_ACCOUNT_CHARACTERS = 60;

export default function CharacterSetupFlow({ theme, initialCharacterName, initialAction }: CharacterSetupFlowProps) {
  // initialCharacterName/initialAction (URL search params read once in page.tsx) are resolved
  // directly during the controller's hydration, landing on the right screen on first paint
  // instead of restoring the last session's state and redirecting afterward, which used to
  // flash the wrong screen for a moment on a deep-linked reload.
  const controller = useCharacterSetupController({ characterName: initialCharacterName, action: initialAction });
  const { state, transitions, actions } = controller;

  // Keep the address bar in sync with in-tool navigation (selecting a character, opening
  // the add-character flow, returning to the directory) the same way a fresh homepage deep
  // link already does on load, so mid-session state stays bookmarkable/shareable and reflects
  // in browser back/forward. Skipped while a transition is animating (isUiLocked) so the URL
  // updates once the new screen has settled, not mid-fade.
  //
  // Deliberately uses the raw History API instead of next/navigation's router.replace():
  // router.replace() re-triggers the App Router's navigation machinery (re-reading
  // useSearchParams() up in page.tsx, which flows back down as this component's
  // initialCharacterName/initialAction props), which reset the controller's hydration and
  // stomped whatever the user had just navigated to. history.replaceState only rewrites the
  // visible URL, no navigation, no re-render of anything upstream.
  useEffect(() => {
    if (!state.isDraftHydrated || state.isUiLocked) return;

    const showingCharacterContext =
      Boolean(state.confirmedCharacter) &&
      state.setupFlowStarted &&
      !state.showCharacterDirectory &&
      !state.isAddingCharacter;

    let target = "/characters";
    if (state.isAddingCharacter) {
      target = "/characters?action=add";
    } else if (showingCharacterContext && state.confirmedCharacter) {
      target = `/characters?character=${encodeURIComponent(state.confirmedCharacter.characterName)}`;
    }

    if (`${window.location.pathname}${window.location.search}` !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [
    state.isDraftHydrated,
    state.isUiLocked,
    state.isAddingCharacter,
    state.setupFlowStarted,
    state.showCharacterDirectory,
    state.confirmedCharacter,
  ]);

  const confirmedCharacterKey = state.confirmedCharacter
      ? toCharacterKey(state.confirmedCharacter)
      : null;
    const confirmedStoredCharacter = confirmedCharacterKey !== null
      ? (state.characterRoster.find((r) => toCharacterKey(r) === confirmedCharacterKey) ??
        (state.confirmedCharacter as unknown as StoredCharacterRecord))
      : null;
  const currentCharacterHasCompletedRequiredFlow = state.completedFlowIds.includes(
    state.requiredFlowId,
  );

  const layout = deriveCharactersLayout({
    foundCharacter: state.foundCharacter,
    setupFlowStarted: state.setupFlowStarted,
    showCharacterDirectory: state.showCharacterDirectory,
    showSetupPane: state.setupFlowStarted || state.showCharacterDirectory || !currentCharacterHasCompletedRequiredFlow,
    showCompletedProfilePane:
      state.setupFlowStarted &&
      currentCharacterHasCompletedRequiredFlow &&
      !state.showCharacterDirectory,
    isDirectoryTransitioning: state.isSwitchingToDirectory,
    suppressLayoutTransition: transitions.suppressLayoutTransition,
  });

  const searchPaneModel: SearchPaneModel = {
    theme,
    shell: {
      isDraftHydrated: state.isDraftHydrated,
      isConfirmFadeOut: transitions.isConfirmFadeOut,
      confirmTransitionSource: transitions.confirmTransitionSource,
      isModeTransitioning: transitions.isModeTransitioning,
      isSearchFadeIn: transitions.isSearchFadeIn,
      isBackTransitioning: transitions.isBackTransitioning,
      isSwitchingToDirectory: state.isSwitchingToDirectory,
      isUiLocked: state.isUiLocked,
    },
    search: {
      setupMode: state.setupMode,
      setupFlowStarted: state.setupFlowStarted,
      hasCompletedRequiredFlow:
        currentCharacterHasCompletedRequiredFlow || state.hasCompletedRequiredSetupEver,
      drafts: state.draftSummaries,
      query: state.query,
      queryInvalid: state.queryInvalid,
      isSearching: state.isSearching,
      statusMessage: state.statusMessage,
      statusTone: state.statusTone,
      degradedCode: state.degradedCode,
    },
    profile: {
      confirmedCharacter: confirmedStoredCharacter,
      confirmedImageLoaded: state.confirmedImageLoaded,
      showCharacterDirectory: state.showCharacterDirectory,
      canViewCharacterDirectory:
        state.setupFlowStarted &&
        state.completedFlowIds.includes(state.requiredFlowId) &&
        !state.isAddingCharacter,
      isAddingCharacter: state.isAddingCharacter,
      setupStepActive:
        !(state.showFlowOverview && state.showCharacterDirectory) &&
        (state.setupStepIndex > 0 || !currentCharacterHasCompletedRequiredFlow),
      isSetupContext: layout.setupActive,
      isCurrentMainCharacter: state.isCurrentMainCharacter,
      isCurrentChampionCharacter: state.isCurrentChampionCharacter,
      canSetCurrentChampion: state.canSetCurrentChampion,
      currentCharacterGender: state.currentCharacterGender,
      currentCharacterMarried: state.currentCharacterMarried,
      currentCharacterPartnerName: state.currentCharacterPartnerName,
      isRefreshing: confirmedStoredCharacter
        ? state.refreshingKeys.has(toCharacterKey(confirmedStoredCharacter))
        : false,
      onRefresh: confirmedStoredCharacter
        ? () => { actions.refreshSingle(confirmedStoredCharacter); }
        : null,
    },
  };

  const searchPaneActions: SearchPaneActions = {
    runTransitionToMode: actions.runTransitionToMode,
    runBackToIntroTransition: actions.runBackToIntroTransition,
    backFromSetupFlow: actions.backFromSetupFlowToAddCharacter,
    backToCharactersDirectory: actions.backToCharactersDirectory,
    backFromAddCharacter: actions.backFromAddCharacter,
    resumeDraft: actions.resumeDraft,
    clearDraft: actions.clearDraft,
    setCurrentAsMain: () => {
      if (!confirmedStoredCharacter) return;
      actions.setMainCharacter(confirmedStoredCharacter);
    },
    removeCurrentAsMain: () => {
      if (!confirmedStoredCharacter) return;
      actions.removeMainCharacter(confirmedStoredCharacter);
    },
    toggleCurrentChampion: () => {
      if (!confirmedStoredCharacter) return;
      actions.toggleChampionCharacter(confirmedStoredCharacter);
    },
    removeCurrentCharacter: actions.removeCurrentCharacter,
    searchSubmit: actions.handleSearchSubmit,
    queryChange: actions.handleQueryInput,
    confirmedImageLoaded: () => actions.setConfirmedImageLoaded(true),
    toggleCharacterDirectory: actions.toggleCharacterDirectory,
  };

  const previewPaneModel: PreviewPaneModel = {
    theme,
    profile: {
      confirmedCharacter: confirmedStoredCharacter,
    },
    preview: {
      foundCharacter: state.foundCharacter,
      previewCardReady: state.previewCardReady,
      previewContentReady: state.previewContentReady,
      previewImageLoaded: state.previewImageLoaded,
      isConfirmFadeOut: transitions.isConfirmFadeOut,
      isModeTransitioning: transitions.isModeTransitioning,
      foundCharacterHasResumableDraft: state.foundCharacterHasResumableDraft,
      isStaleFallbackPreview: state.isStaleFallbackPreview,
    },
    setup: {
      setupFlowStarted: state.setupFlowStarted,
      setupPanelVisible: transitions.setupPanelVisible,
      suppressLayoutTransition: transitions.suppressLayoutTransition,
      isBackTransitioning: transitions.isBackTransitioning,
      isFinishingSetup: state.isFinishingSetup,
      isSwitchingToDirectory: state.isSwitchingToDirectory,
      isSwitchingToProfile: state.isSwitchingToProfile,
      isUiLocked: state.isUiLocked,
      activeFlowId: state.activeFlowId,
      completedFlowIds: state.completedFlowIds,
      showFlowOverview: state.showFlowOverview,
      showCharacterDirectory: state.showCharacterDirectory,
      hasCompletedRequiredSetupEver: state.hasCompletedRequiredSetupEver,
      fastDirectoryRevealOnce: state.fastDirectoryRevealOnce,
      lastActiveBookmarkId: state.lastActiveBookmarkId,
      lastActiveBookmarkSubView: state.lastActiveBookmarkSubView,
      setupStepIndex: state.setupStepIndex,
      setupStepDirection: state.setupStepDirection,
      setupTargetSubstep: state.setupTargetSubstep,
      setupConfineToSubstep: state.setupConfineToSubstep,
      substepJumpNonce: state.substepJumpNonce,
      stepValidityById: state.stepValidityById,
      activeSetupStepValue: state.activeSetupStepValue,
      statsRawValue: state.statsRawValue,
    },
    directory: {
      allCharacters: state.characterRoster,
      mainCharacterKeyByWorld: state.mainCharacterKeyByWorld,
      championCharacterKeysByWorld: state.championCharacterKeysByWorld,
      worldIds: state.worldIds,
      maxCharacters: MAX_ACCOUNT_CHARACTERS,
      maxChampions: MAX_CHAMPIONS,
      refreshingKeys: state.refreshingKeys,
    },
  };

  const previewPaneActions: PreviewPaneActions = {
    setPreviewImageLoaded: actions.setPreviewImageLoaded,
    confirmFoundCharacter: actions.confirmFoundCharacter,
    resumeFoundCharacterDraft: actions.resumeFoundCharacterDraft,
    startFreshSetup: actions.startFreshSetup,
    setSetupStepWithDirection: actions.setSetupStepWithDirection,
    jumpToSubstep: actions.jumpToSubstep,
    onValidityChange: actions.onValidityChange,
    reportCurrentSubstep: actions.reportCurrentSubstep,
    stepValueChange: actions.updateActiveStepValue,
    finishSetupFlow: actions.finishSetupFlow,
    openCharacterSearch: actions.openAddCharacterSearch,
    openCharacterProfile: actions.switchToCharacterProfile,
    startOptionalFlow: actions.startOptionalSetupFlow,
    skipSetupEntirely: actions.skipSetupEntirely,
    rememberActiveBookmark: actions.rememberActiveBookmark,
    clearRestoredBookmark: actions.clearRestoredBookmark,
    setStatsActivePreset: actions.setStatsActivePreset,
    setEquipmentActivePreset: actions.setEquipmentActivePreset,
    setHexaStatActivePreset: actions.setHexaStatActivePreset,
    setFamiliarsActivePreset: actions.setFamiliarsActivePreset,
  };

  return (
    <>
      <style>{getCharacterSetupFlowStyles(theme)}</style>

      <main className="characters-main" style={{ flex: 1, position: "relative" }}>
        <div className={`fade-in ${layout.contentClassName}`}>
          {layout.showSearchPane && (
            <div className="search-pane">
              <SearchPaneCard model={searchPaneModel} actions={searchPaneActions} />
            </div>
          )}

          <PreviewSetupPane model={previewPaneModel} actions={previewPaneActions} />
        </div>

        {state.deleteNoticeCharacterName && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              zIndex: 65,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                background: theme.panel,
                color: theme.text,
                padding: "0.65rem 0.9rem",
                boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
                fontSize: "0.86rem",
                fontWeight: 800,
                whiteSpace: "nowrap",
                opacity: state.showDeleteNotice ? 1 : 0,
                transform: `translateY(${state.showDeleteNotice ? "0px" : "8px"})`,
                transition: "opacity 0.22s ease, transform 0.22s ease",
              }}
            >
              {state.deleteNoticeCharacterName} was deleted.
            </div>
          </div>
        )}
      </main>
    </>
  );
}

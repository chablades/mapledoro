"use client";

/*
  Character setup flow shell.
  Keeps rendering focused while the controller hook owns state and navigation.
*/
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
}

const MAX_ACCOUNT_CHARACTERS = 59;

export default function CharacterSetupFlow({ theme }: CharacterSetupFlowProps) {
  const controller = useCharacterSetupController();
  const { state, transitions, actions } = controller;
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
    showSetupPane: state.showCharacterDirectory || !currentCharacterHasCompletedRequiredFlow,
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
      canResumeSetup: state.canResumeSetup,
      resumeSetupCharacterName: state.resumeSetupCharacterName,
      query: state.query,
      queryInvalid: state.queryInvalid,
      isSearching: state.isSearching,
      statusMessage: state.statusMessage,
      statusTone: state.statusTone,
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
      isCurrentMainCharacter: state.isCurrentMainCharacter,
      isCurrentChampionCharacter: state.isCurrentChampionCharacter,
      canSetCurrentChampion: state.canSetCurrentChampion,
      currentCharacterGender: state.currentCharacterGender,
    },
  };

  const searchPaneActions: SearchPaneActions = {
    runTransitionToMode: actions.runTransitionToMode,
    runBackToIntroTransition: actions.runBackToIntroTransition,
    backFromSetupFlow: actions.backFromSetupFlowToAddCharacter,
    backToCharactersDirectory: actions.backToCharactersDirectory,
    backFromAddCharacter: actions.backFromAddCharacter,
    resumeSavedSetup: actions.resumeSavedSetup,
    setCurrentAsMain: () => {
      if (!confirmedStoredCharacter) return;
      actions.setMainCharacter(confirmedStoredCharacter);
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
    preview: {
      foundCharacter: state.foundCharacter,
      previewCardReady: state.previewCardReady,
      previewContentReady: state.previewContentReady,
      previewImageLoaded: state.previewImageLoaded,
      isConfirmFadeOut: transitions.isConfirmFadeOut,
      isModeTransitioning: transitions.isModeTransitioning,
    },
    setup: {
      setupFlowStarted: state.setupFlowStarted,
      setupPanelVisible: transitions.setupPanelVisible,
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
      setupStepIndex: state.setupStepIndex,
      setupStepDirection: state.setupStepDirection,
      activeSetupStepValue: state.activeSetupStepValue,
    },
    directory: {
      allCharacters: state.characterRoster,
      mainCharacterKeyByWorld: state.mainCharacterKeyByWorld,
      championCharacterKeysByWorld: state.championCharacterKeysByWorld,
      worldIds: state.worldIds,
      maxCharacters: MAX_ACCOUNT_CHARACTERS,
      maxChampions: MAX_CHAMPIONS,
    },
  };

  const previewPaneActions: PreviewPaneActions = {
    setPreviewImageLoaded: actions.setPreviewImageLoaded,
    confirmFoundCharacter: actions.confirmFoundCharacter,
    setSetupStepWithDirection: actions.setSetupStepWithDirection,
    stepValueChange: actions.updateActiveStepValue,
    finishSetupFlow: actions.finishSetupFlow,
    openCharacterSearch: actions.openAddCharacterSearch,
    openCharacterProfile: actions.switchToCharacterProfile,
  };

  return (
    <>
      <style>{getCharacterSetupFlowStyles(theme)}</style>

      <main className="characters-main" style={{ flex: 1 }}>
        <div className={`fade-in ${layout.contentClassName}`}>
          {layout.showSearchPane && (
            <div className="search-pane">
              <SearchPaneCard model={searchPaneModel} actions={searchPaneActions} />
            </div>
          )}

          <PreviewSetupPane model={previewPaneModel} actions={previewPaneActions} />
        </div>
      </main>
      {state.deleteNoticeCharacterName && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, calc(-50% + ${state.showDeleteNotice ? "0px" : "8px"}))`,
            opacity: state.showDeleteNotice ? 1 : 0,
            transition: "opacity 0.22s ease, transform 0.22s ease",
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
            }}
          >
            {state.deleteNoticeCharacterName} was deleted.
          </div>
        </div>
      )}
    </>
  );
}

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
import { useCharacterSetupController } from "./useCharacterSetupController";

interface CharacterSetupFlowProps {
  theme: AppTheme;
}

const MAX_ACCOUNT_CHARACTERS = 59;
const MAX_CHAMPIONS = 4;

export default function CharacterSetupFlow({ theme }: CharacterSetupFlowProps) {
  const controller = useCharacterSetupController();

  const { state, transitions, actions } = controller;
  const {
    foundCharacter,
    previewCardReady,
    previewContentReady,
    setupMode,
    confirmedCharacter,
    previewImageLoaded,
    confirmedImageLoaded,
    setupFlowStarted,
    activeFlowId,
    completedFlowIds,
    showFlowOverview,
    showCharacterDirectory,
    isSwitchingToDirectory,
    isSwitchingToProfile,
    isFinishingSetup,
    deleteNoticeCharacterName,
    showDeleteNotice,
    isAddingCharacter,
    fastDirectoryRevealOnce,
    characterRoster,
    mainCharacterKey,
    championCharacterKeys,
    setupStepIndex,
    setupStepDirection,
    canResumeSetup,
    resumeSetupCharacterName,
    hasCompletedRequiredSetupEver,
    isDraftHydrated,
    isUiLocked,
    activeSetupStepValue,
    isCurrentMainCharacter,
    isCurrentChampionCharacter,
    canSetCurrentChampion,
    currentCharacterGender,
    requiredFlowId,
    queryInvalid,
    isSearching,
    statusMessage,
    statusTone,
    query,
  } = state;
  const currentCharacterHasCompletedRequiredFlow = completedFlowIds.includes(requiredFlowId);

  const layout = deriveCharactersLayout({
    foundCharacter,
    setupFlowStarted,
    showCharacterDirectory,
    showSetupPane: showCharacterDirectory || !currentCharacterHasCompletedRequiredFlow,
    showCompletedProfilePane:
      setupFlowStarted && currentCharacterHasCompletedRequiredFlow && !showCharacterDirectory,
    isDirectoryTransitioning: isSwitchingToDirectory,
    suppressLayoutTransition: transitions.suppressLayoutTransition,
  });

  const searchPaneModel: SearchPaneModel = {
    theme,
    shell: {
      isDraftHydrated,
      isConfirmFadeOut: transitions.isConfirmFadeOut,
      confirmTransitionSource: transitions.confirmTransitionSource,
      isModeTransitioning: transitions.isModeTransitioning,
      isSearchFadeIn: transitions.isSearchFadeIn,
      isBackTransitioning: transitions.isBackTransitioning,
      isSwitchingToDirectory,
      isUiLocked,
    },
    search: {
      setupMode,
      setupFlowStarted,
      hasCompletedRequiredFlow: currentCharacterHasCompletedRequiredFlow || hasCompletedRequiredSetupEver,
      canResumeSetup,
      resumeSetupCharacterName,
      query,
      queryInvalid,
      isSearching,
      statusMessage,
      statusTone,
    },
    profile: {
      confirmedCharacter,
      confirmedImageLoaded,
      showCharacterDirectory,
      canViewCharacterDirectory:
        setupFlowStarted && completedFlowIds.includes(requiredFlowId) && !isAddingCharacter,
      isAddingCharacter,
      isCurrentMainCharacter,
      isCurrentChampionCharacter,
      canSetCurrentChampion,
      currentCharacterGender,
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
      if (!confirmedCharacter) return;
      actions.setMainCharacter(confirmedCharacter);
    },
    toggleCurrentChampion: () => {
      if (!confirmedCharacter) return;
      actions.toggleChampionCharacter(confirmedCharacter);
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
      foundCharacter,
      previewCardReady,
      previewContentReady,
      previewImageLoaded,
      isConfirmFadeOut: transitions.isConfirmFadeOut,
      isModeTransitioning: transitions.isModeTransitioning,
    },
    setup: {
      setupFlowStarted,
      setupPanelVisible: transitions.setupPanelVisible,
      isBackTransitioning: transitions.isBackTransitioning,
      isFinishingSetup,
      isSwitchingToDirectory,
      isSwitchingToProfile,
      isUiLocked,
      activeFlowId,
      completedFlowIds,
      showFlowOverview,
      showCharacterDirectory,
      hasCompletedRequiredSetupEver,
      fastDirectoryRevealOnce,
      setupStepIndex,
      setupStepDirection,
      activeSetupStepValue,
    },
    directory: {
      allCharacters: characterRoster,
      mainCharacterKey,
      championCharacterKeys,
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
      {deleteNoticeCharacterName && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, calc(-50% + ${showDeleteNotice ? "0px" : "8px"}))`,
            opacity: showDeleteNotice ? 1 : 0,
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
            {deleteNoticeCharacterName} was deleted.
          </div>
        </div>
      )}
    </>
  );
}

import type { AppTheme } from "../../../components/themes";
import type { NormalizedCharacterData } from "../model/types";
import type { StoredCharacterRecord } from "../model/charactersStore";
import type { SetupFlowId } from "../setup/flows";
import type { SetupMode } from "../model/constants";

export interface SearchPaneModel {
  theme: AppTheme;
  shell: {
    isDraftHydrated: boolean;
    isConfirmFadeOut: boolean;
    confirmTransitionSource: "found-character" | "resume" | null;
    isModeTransitioning: boolean;
    isSearchFadeIn: boolean;
    isBackTransitioning: boolean;
    isSwitchingToDirectory: boolean;
    isUiLocked: boolean;
  };
  search: {
    setupMode: SetupMode;
    setupFlowStarted: boolean;
    hasCompletedRequiredFlow: boolean;
    canResumeSetup: boolean;
    resumeSetupCharacterName: string | null;
    query: string;
    queryInvalid: boolean;
    isSearching: boolean;
    statusMessage: string;
    statusTone: "neutral" | "error";
    degradedCode: string | null;
  };
  profile: {
    // confirmedCharacter is StoredCharacterRecord once the character is in the roster.
    // It remains NormalizedCharacterData during the initial setup flow before it's saved.
    confirmedCharacter: StoredCharacterRecord | null;
    confirmedImageLoaded: boolean;
    showCharacterDirectory: boolean;
    canViewCharacterDirectory: boolean;
    isAddingCharacter: boolean;
    isCurrentMainCharacter: boolean;
    isCurrentChampionCharacter: boolean;
    canSetCurrentChampion: boolean;
    currentCharacterGender: "male" | "female" | null;
    currentCharacterMarried: boolean | null;
    currentCharacterPartnerName: string | null;
    isRefreshing: boolean;
    onRefresh: (() => void) | null;
  };
}

export interface SearchPaneActions {
  runTransitionToMode: (nextMode: SetupMode) => void;
  runBackToIntroTransition: () => void;
  backFromSetupFlow: () => void;
  backToCharactersDirectory: () => void;
  backFromAddCharacter: () => void;
  resumeSavedSetup: () => void;
  setCurrentAsMain: () => void;
  toggleCurrentChampion: () => void;
  removeCurrentCharacter: () => void;
  searchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  queryChange: (value: string) => void;
  confirmedImageLoaded: () => void;
  toggleCharacterDirectory: () => void;
}

export interface PreviewPaneModel {
  theme: AppTheme;
  preview: {
    // foundCharacter is the raw API response before the user confirms/saves it
    foundCharacter: NormalizedCharacterData | null;
    previewCardReady: boolean;
    previewContentReady: boolean;
    previewImageLoaded: boolean;
    isConfirmFadeOut: boolean;
    isModeTransitioning: boolean;
  };
  setup: {
    setupFlowStarted: boolean;
    setupPanelVisible: boolean;
    isBackTransitioning: boolean;
    isFinishingSetup: boolean;
    isSwitchingToDirectory: boolean;
    isSwitchingToProfile: boolean;
    isUiLocked: boolean;
    activeFlowId: SetupFlowId;
    completedFlowIds: SetupFlowId[];
    showFlowOverview: boolean;
    showCharacterDirectory: boolean;
    hasCompletedRequiredSetupEver: boolean;
    fastDirectoryRevealOnce: boolean;
    setupStepIndex: number;
    setupStepDirection: "forward" | "backward";
    activeSetupStepValue: string;
  };
  profile: {
    confirmedCharacter: StoredCharacterRecord | null;
  };
  directory: {
    // The full roster of saved characters
    allCharacters: StoredCharacterRecord[];
    // Per-world: worldID (as string key) -> character key
    mainCharacterKeyByWorld: Record<string, string>;
    // Per-world: worldID (as string key) -> character keys
    championCharacterKeysByWorld: Record<string, string[]>;
    // Sorted unique world IDs present in the roster
    worldIds: number[];
    maxCharacters: number;
    maxChampions: number;
    refreshingKeys: ReadonlySet<string>;
  };
}

export interface PreviewPaneActions {
  setPreviewImageLoaded: (loaded: boolean) => void;
  confirmFoundCharacter: () => void;
  setSetupStepWithDirection: (step: number) => void;
  stepValueChange: (value: string) => void;
  finishSetupFlow: () => void;
  openCharacterSearch: () => void;
  openCharacterProfile: (character: StoredCharacterRecord) => void;
  startOptionalFlow: (flowId: SetupFlowId) => void;
}

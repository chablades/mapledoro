import type { AppTheme } from "../../../components/themes";
import type { NormalizedCharacterData } from "../model/types";
import type { StoredCharacterRecord } from "../model/charactersStore";
import type { SetupFlowId } from "../setup/flows";
import type { SetupMode } from "../model/constants";

// Lightweight, render-ready view of a resumable setup draft for the search-entry list.
export interface SetupDraftSummary {
  characterKey: string;
  characterName: string;
  jobName: string;
  imgUrl: string;
  flowId: SetupFlowId;
  flowLabel: string;
  // stepIndex 0 means the user is still on the flow picker and has not chosen a
  // setup yet, so flowLabel should not be shown as a definitive choice.
  started: boolean;
  stepIndex: number;
  stepCount: number;
  savedAt: number;
  expired: boolean;
}

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
    drafts: SetupDraftSummary[];
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
    setupStepActive: boolean;
    // True while the summary card renders inside the active setup flow's narrow
    // sidebar, vs. the standalone profile view — drives the card's own mobile
    // layout (compact horizontal row) instead of an ancestor-scoped CSS override.
    isSetupContext: boolean;
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
  resumeDraft: (characterKey: string) => void;
  clearDraft: (characterKey: string) => void;
  setCurrentAsMain: () => void;
  removeCurrentAsMain: () => void;
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
    // True when the searched character already has a started, resumable draft —
    // the preview then offers Resume / Start fresh instead of a plain confirm.
    foundCharacterHasResumableDraft: boolean;
    // True when foundCharacter is a stale draft snapshot shown because a resume's
    // refresh attempt failed, not a live lookup result.
    isStaleFallbackPreview: boolean;
  };
  setup: {
    setupFlowStarted: boolean;
    setupPanelVisible: boolean;
    suppressLayoutTransition: boolean;
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
    // Which profile bookmark to return to once the profile-overview screen remounts
    // after an optional flow finishes (that screen's own "active bookmark" state is
    // local and doesn't survive the unmount) — null means no bookmark to restore.
    lastActiveBookmarkId: string | null;
    setupStepIndex: number;
    setupStepDirection: "forward" | "backward";
    setupTargetSubstep: number | null;
    // When true, the step currently mounted at setupTargetSubstep should present itself
    // as if it were the step's only substep (no pips, Back/Finish instead of Prev/Continue
    // to a sibling substep) — set when a profile bookmark's edit pencil opens straight into
    // one specific substep, so navigating to its siblings isn't offered.
    setupConfineToSubstep: boolean;
    substepJumpNonce: number;
    stepValidityById: Record<string, boolean>;
    activeSetupStepValue: string;
    statsRawValue: string;
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
  resumeFoundCharacterDraft: () => void;
  startFreshSetup: () => void;
  setSetupStepWithDirection: (step: number, forceDirection?: "forward" | "backward") => void;
  jumpToSubstep: (step: number, substepIndex: number) => void;
  onValidityChange: (stepId: string, valid: boolean) => void;
  reportCurrentSubstep: (substepIndex: number) => void;
  stepValueChange: (value: string) => void;
  finishSetupFlow: () => void;
  openCharacterSearch: () => void;
  openCharacterProfile: (character: StoredCharacterRecord) => void;
  startOptionalFlow: (flowId: SetupFlowId, targetSubstep?: number, confineToSubstep?: boolean) => void;
  skipSetupEntirely: () => void;
  rememberActiveBookmark: (id: string) => void;
}

"use client";

/*
  Character setup flow (search + confirmation + onboarding steps).
  Keeps setup progress recoverable across refreshes with a local draft.
*/
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppTheme } from "../../../components/themes";
import type { NormalizedCharacterData } from "../model/types";
import {
  CHARACTER_NAME_INPUT_FILTER_REGEX,
  MAX_QUERY_LENGTH,
  type SetupMode,
} from "../model/constants";
import {
  hasAnyCompletedRequiredSetupFlow,
  makeDraftCharacterKey,
  readMergedCharacterRoster,
  readLastSetupDraft,
  removeSetupDraftForCharacter,
  readSetupDraftByCharacter,
  setLastSetupDraftAutoResume,
  type SetupDraft,
  writeSetupDraft,
} from "../model/setupDraftStorage";
import {
  clampFlowStepIndex,
  getFlowStepByIndex,
  getOptionalSetupFlows,
  getRequiredSetupFlowId,
  type SetupFlowId,
} from "../setup/flows";
import type { SetupStepInputById } from "../setup/types";
import { useSetupFlowTransitions } from "./useSetupFlowTransitions";
import PreviewSetupPane from "./components/PreviewSetupPane";
import SearchPaneCard from "./components/SearchPaneCard";
import { useCharacterLookup } from "./useCharacterLookup";
import { getCharacterSetupFlowStyles } from "./CharacterSetupFlow.styles";
import { LOOKUP_MESSAGES } from "./messages";

interface CharacterSetupFlowProps {
  theme: AppTheme;
}

const MAX_ACCOUNT_CHARACTERS = 59;
const MAX_CHAMPIONS = 4;
const OPTIONAL_FLOW_FADE_OUT_MS = 160;
const OPTIONAL_FLOW_TRANSITION_TOTAL_MS = 320;

function toCharacterKey(character: NormalizedCharacterData) {
  return `${character.worldID}:${character.characterName.trim().toLowerCase()}`;
}

export default function CharacterSetupFlow({ theme }: CharacterSetupFlowProps) {
  const immediateUiLockRef = useRef(false);
  const [query, setQuery] = useState("");
  const [foundCharacter, setFoundCharacter] = useState<NormalizedCharacterData | null>(
    null,
  );
  const [previewCardReady, setPreviewCardReady] = useState(false);
  const [previewContentReady, setPreviewContentReady] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>("intro");
  const [confirmedCharacter, setConfirmedCharacter] =
    useState<NormalizedCharacterData | null>(null);
  const [previewImageLoaded, setPreviewImageLoaded] = useState(false);
  const [confirmedImageLoaded, setConfirmedImageLoaded] = useState(false);
  const [setupFlowStarted, setSetupFlowStarted] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<SetupFlowId>(getRequiredSetupFlowId());
  const [completedFlowIds, setCompletedFlowIds] = useState<SetupFlowId[]>([]);
  const [showFlowOverview, setShowFlowOverview] = useState(false);
  const [showCharacterDirectory, setShowCharacterDirectory] = useState(false);
  const [isSwitchingToDirectory, setIsSwitchingToDirectory] = useState(false);
  const [isSwitchingToProfile, setIsSwitchingToProfile] = useState(false);
  const [isFinishingSetup, setIsFinishingSetup] = useState(false);
  const [isDeleteTransitioning, setIsDeleteTransitioning] = useState(false);
  const [deleteNoticeCharacterName, setDeleteNoticeCharacterName] = useState<string | null>(null);
  const [showDeleteNotice, setShowDeleteNotice] = useState(false);
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [fastDirectoryRevealOnce, setFastDirectoryRevealOnce] = useState(false);
  const [isStartingOptionalFlow, setIsStartingOptionalFlow] = useState(false);
  const [isOptionalFlowFadeIn, setIsOptionalFlowFadeIn] = useState(false);
  const [characterRoster, setCharacterRoster] = useState<NormalizedCharacterData[]>([]);
  const [mainCharacterKey, setMainCharacterKey] = useState<string | null>(null);
  const [championCharacterKeys, setChampionCharacterKeys] = useState<string[]>([]);
  const [setupStepIndex, setSetupStepIndex] = useState(0);
  const [setupStepDirection, setSetupStepDirection] = useState<"forward" | "backward">("forward");
  const [setupStepTestByStep, setSetupStepTestByStep] = useState<SetupStepInputById>({});
  const [canResumeSetup, setCanResumeSetup] = useState(false);
  const [resumeSetupCharacterName, setResumeSetupCharacterName] = useState<string | null>(
    null,
  );
  const [hasCompletedRequiredSetupEver, setHasCompletedRequiredSetupEver] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const hasHydratedSetupDraftRef = useRef(false);
  const {
    isConfirmFadeOut,
    isModeTransitioning,
    isBackTransitioning,
    isSearchFadeIn,
    setupPanelVisible,
    suppressLayoutTransition,
    setSetupPanelVisible,
    setSuppressLayoutTransition,
    queueTransitionTimer,
    runBackToIntroTransition: runBackToIntroTransitionAction,
    runTransitionToMode: runTransitionToModeAction,
    beginSetupFlowTransition: beginSetupFlowTransitionAction,
    runBackTransition,
  } = useSetupFlowTransitions();

  const {
    isSearching,
    statusMessage,
    statusTone,
    trimmedQuery,
    queryInvalid,
    resetSearchStateMessage,
    runLookup,
    setStatusMessage,
    setStatusTone,
  } = useCharacterLookup({
    query,
    onFoundCharacterChange: setFoundCharacter,
  });
  const requiredFlowId = getRequiredSetupFlowId();
  const isUiLocked =
    isConfirmFadeOut ||
    isModeTransitioning ||
    isBackTransitioning ||
    isSwitchingToDirectory ||
    isSwitchingToProfile ||
    isFinishingSetup ||
    isDeleteTransitioning;
  const normalizeCompletedFlowIds = (flowIds: SetupFlowId[]) =>
    Array.from(new Set(flowIds));
  const isResumableDraft = useCallback(
    (draft: SetupDraft | null) =>
      Boolean(draft?.confirmedCharacter) &&
      !Boolean(draft?.completedFlowIds?.includes(requiredFlowId)),
    [requiredFlowId],
  );
  const findRosterCharacterByName = (name: string) =>
    characterRoster.find(
      (entry) => entry.characterName.trim().toLowerCase() === name.trim().toLowerCase(),
    );

  const upsertRosterCharacter = (character: NormalizedCharacterData) => {
    setCharacterRoster((prev) => {
      const key = toCharacterKey(character);
      const existingIndex = prev.findIndex((entry) => toCharacterKey(entry) === key);
      if (existingIndex === -1) {
        return [...prev, character];
      }
      const next = [...prev];
      next[existingIndex] = character;
      return next;
    });
    setMainCharacterKey((prev) => prev ?? toCharacterKey(character));
  };

  useEffect(() => {
    if (!foundCharacter) {
      const resetTimer = window.setTimeout(() => {
        setPreviewCardReady(false);
        setPreviewContentReady(false);
        setPreviewImageLoaded(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }
    const prepTimer = window.setTimeout(() => {
      setPreviewImageLoaded(false);
    }, 0);
    const cardTimer = setTimeout(() => setPreviewCardReady(true), 320);
    const contentTimer = setTimeout(() => setPreviewContentReady(true), 440);
    return () => {
      clearTimeout(prepTimer);
      clearTimeout(cardTimer);
      clearTimeout(contentTimer);
    };
  }, [foundCharacter]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setConfirmedImageLoaded(false);
    }, 0);
    return () => clearTimeout(resetTimer);
  }, [confirmedCharacter]);

  useEffect(() => {
    const draft = readLastSetupDraft();
    const mergedRoster = readMergedCharacterRoster();
    const accountHasCompletedRequiredFlow = hasAnyCompletedRequiredSetupFlow();
    const hydrateTimer = window.setTimeout(() => {
      if (draft) {
        const completedFlowIds = normalizeCompletedFlowIds(draft.completedFlowIds ?? []);
        const hasCompletedRequiredFlow = completedFlowIds.includes(requiredFlowId);
        const hasActiveFlowInProgress =
          Boolean(draft.setupFlowStarted) && !Boolean(draft.showFlowOverview);
        setHasCompletedRequiredSetupEver(
          accountHasCompletedRequiredFlow || hasCompletedRequiredFlow,
        );

        const canResumeFromDraft = isResumableDraft(draft);
        setCanResumeSetup(canResumeFromDraft);
        setResumeSetupCharacterName(
          canResumeFromDraft ? (draft.confirmedCharacter?.characterName ?? draft.query) : null,
        );
        setQuery(draft.query);
        setCharacterRoster(mergedRoster);
        setMainCharacterKey(draft.mainCharacterKey ?? null);
        setChampionCharacterKeys(draft.championCharacterKeys ?? []);

        if (draft.autoResumeOnLoad && hasActiveFlowInProgress) {
          setCompletedFlowIds(completedFlowIds);
          setActiveFlowId(draft.activeFlowId);
          setSetupStepIndex(draft.setupStepIndex);
          setSetupStepDirection(draft.setupStepDirection);
          setSetupStepTestByStep(draft.setupStepTestByStep ?? {});
          setConfirmedCharacter(draft.confirmedCharacter);
          setSetupMode(draft.setupMode);
          setSuppressLayoutTransition(draft.setupFlowStarted);
          setSetupFlowStarted(draft.setupFlowStarted);
          setShowFlowOverview(Boolean(draft.showFlowOverview));
          setShowCharacterDirectory(Boolean(draft.showCharacterDirectory));
          setSetupPanelVisible(false);
          if (draft.setupFlowStarted) {
            queueTransitionTimer(() => {
              setSetupPanelVisible(true);
            }, 80);
            queueTransitionTimer(() => {
              setSuppressLayoutTransition(false);
            }, 280);
          }
        } else if (hasCompletedRequiredFlow || accountHasCompletedRequiredFlow) {
          // Entering /characters always lands on the directory once quick setup is completed.
          // Do not bind an incomplete draft character into this fallback state.
          setIsAddingCharacter(false);
          setConfirmedCharacter(hasCompletedRequiredFlow ? draft.confirmedCharacter : null);
          setActiveFlowId(hasCompletedRequiredFlow ? draft.activeFlowId : requiredFlowId);
          setCompletedFlowIds(hasCompletedRequiredFlow ? completedFlowIds : []);
          setSetupStepIndex(hasCompletedRequiredFlow ? draft.setupStepIndex : 0);
          setSetupStepDirection(hasCompletedRequiredFlow ? draft.setupStepDirection : "forward");
          setSetupStepTestByStep(hasCompletedRequiredFlow ? (draft.setupStepTestByStep ?? {}) : {});
          setSetupMode("search");
          setSetupFlowStarted(true);
          setShowFlowOverview(true);
          setShowCharacterDirectory(true);
          setSetupPanelVisible(true);
          setSuppressLayoutTransition(false);
          setHasCompletedRequiredSetupEver(true);
        } else if (draft.autoResumeOnLoad) {
          setCompletedFlowIds(completedFlowIds);
          setActiveFlowId(draft.activeFlowId);
          setSetupStepIndex(draft.setupStepIndex);
          setSetupStepDirection(draft.setupStepDirection);
          setSetupStepTestByStep(draft.setupStepTestByStep ?? {});
          setConfirmedCharacter(draft.confirmedCharacter);
          setSetupMode(draft.setupMode);
          setSetupFlowStarted(draft.setupFlowStarted);
          setShowFlowOverview(Boolean(draft.showFlowOverview));
          setShowCharacterDirectory(Boolean(draft.showCharacterDirectory));
        } else {
          setCompletedFlowIds(completedFlowIds);
          setActiveFlowId(draft.activeFlowId);
          setSetupStepIndex(draft.setupStepIndex);
          setSetupStepDirection(draft.setupStepDirection);
          setSetupStepTestByStep(draft.setupStepTestByStep ?? {});
          setConfirmedCharacter(draft.confirmedCharacter);
        }
      } else {
        if (accountHasCompletedRequiredFlow) {
          setCharacterRoster(mergedRoster);
          setIsAddingCharacter(false);
          setSetupMode("search");
          setSetupFlowStarted(true);
          setShowFlowOverview(true);
          setShowCharacterDirectory(true);
          setSetupPanelVisible(true);
          setSuppressLayoutTransition(false);
          setCanResumeSetup(false);
          setResumeSetupCharacterName(null);
          setHasCompletedRequiredSetupEver(true);
        } else {
          setCanResumeSetup(false);
          setResumeSetupCharacterName(null);
          setHasCompletedRequiredSetupEver(false);
        }
      }
      hasHydratedSetupDraftRef.current = true;
      setIsDraftHydrated(true);
    }, 0);
    return () => clearTimeout(hydrateTimer);
  }, [
    isResumableDraft,
    queueTransitionTimer,
    requiredFlowId,
    setSetupPanelVisible,
    setSuppressLayoutTransition,
  ]);

  useEffect(() => {
    if (!hasHydratedSetupDraftRef.current) return;
    if (typeof window === "undefined") return;
    if (!confirmedCharacter) return;

    const characterKey = makeDraftCharacterKey(confirmedCharacter);
    const draft: SetupDraft = {
      version: 1,
      characterKey,
      query,
      setupMode,
      setupFlowStarted,
      autoResumeOnLoad: setupFlowStarted,
      activeFlowId,
      completedFlowIds,
      showFlowOverview,
      showCharacterDirectory,
      characterRoster,
      mainCharacterKey,
      championCharacterKeys,
      setupStepIndex: clampFlowStepIndex(activeFlowId, setupStepIndex),
      setupStepDirection,
      setupStepTestByStep,
      confirmedCharacter,
      savedAt: Date.now(),
    };

    writeSetupDraft(draft);
    const resumeStateTimer = window.setTimeout(() => {
      const canResumeFromDraft = isResumableDraft(draft);
      setCanResumeSetup(canResumeFromDraft);
      setResumeSetupCharacterName(
        canResumeFromDraft ? confirmedCharacter.characterName : null,
      );
    }, 0);
    return () => clearTimeout(resumeStateTimer);
  }, [
    query,
    setupMode,
    setupFlowStarted,
    activeFlowId,
    completedFlowIds,
    showFlowOverview,
    showCharacterDirectory,
    characterRoster,
    mainCharacterKey,
    championCharacterKeys,
    setupStepIndex,
    setupStepDirection,
    setupStepTestByStep,
    confirmedCharacter,
    isResumableDraft,
  ]);

  useEffect(() => {
    immediateUiLockRef.current = isUiLocked;
  }, [isUiLocked]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [setupMode, setupFlowStarted, showFlowOverview, setupStepIndex]);

  const runBackToIntroTransition = () => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsAddingCharacter(false);
    runBackToIntroTransitionAction({
      setLastSetupDraftAutoResume,
      resetSearchStateMessage,
      setSetupMode,
      setFoundCharacter,
      setConfirmedCharacter,
      setSetupFlowStarted,
      setActiveFlowId,
      setCompletedFlowIds,
      setShowFlowOverview,
      setShowCharacterDirectory,
      setSetupStepIndex,
      setSetupStepDirection,
      setSetupStepTestByStep,
    });
  };

  const runTransitionToMode = (nextMode: SetupMode) => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsAddingCharacter(false);
    runTransitionToModeAction(nextMode, {
      resetSearchStateMessage,
      setSetupMode,
      setFoundCharacter,
      setConfirmedCharacter,
      setSetupFlowStarted,
      setActiveFlowId,
      setCompletedFlowIds,
      setShowFlowOverview,
      setShowCharacterDirectory,
      setSetupStepIndex,
      setSetupStepDirection,
      setSetupStepTestByStep,
    });
  };

  const backFromSetupFlowToAddCharacter = () => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    runBackTransition(() => {
      setIsAddingCharacter(true);
      setSetupFlowStarted(false);
      setShowFlowOverview(false);
      setShowCharacterDirectory(false);
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setSetupStepIndex(0);
      setSetupStepDirection("forward");
      setSetupStepTestByStep({});
      resetSearchStateMessage();
      setLastSetupDraftAutoResume(false);
    });
  };

  const backToCharactersDirectory = () => {
    setIsAddingCharacter(false);
    setSetupMode("search");
    setSetupFlowStarted(true);
    setSetupPanelVisible(true);
    setShowFlowOverview(true);
    setShowCharacterDirectory(true);
    setSetupStepIndex(0);
    setSetupStepDirection("backward");
  };

  const setSetupStepWithDirection = (nextStep: number) => {
    const boundedStep = clampFlowStepIndex(activeFlowId, nextStep);
    if (boundedStep === setupStepIndex) return;
    setSetupStepDirection(boundedStep > setupStepIndex ? "forward" : "backward");
    setSetupStepIndex(boundedStep);
  };

  const beginSetupFlowTransition = (args: {
    character: NormalizedCharacterData;
    flowId: SetupFlowId;
    completedFlowIds: SetupFlowId[];
    showFlowOverview: boolean;
    showCharacterDirectory: boolean;
    stepIndex: number;
    stepDirection: "forward" | "backward";
    stepData: SetupStepInputById;
    source?: "confirm" | "resume";
  }) => {
    beginSetupFlowTransitionAction(args, {
      setSetupMode,
      setFoundCharacter,
      setConfirmedCharacter,
      setSetupFlowStarted,
      setActiveFlowId,
      setCompletedFlowIds,
      setShowFlowOverview,
      setShowCharacterDirectory,
      setSetupStepIndex,
      setSetupStepDirection,
      setSetupStepTestByStep,
    });
  };

  const resumeSavedSetup = () => {
    if (immediateUiLockRef.current) return;
    const draft = readLastSetupDraft();
    if (!draft || !isResumableDraft(draft)) {
      setCanResumeSetup(false);
      setResumeSetupCharacterName(null);
      return;
    }
    setCanResumeSetup(true);
    setResumeSetupCharacterName(draft.confirmedCharacter?.characterName ?? draft.query);
    setIsAddingCharacter(false);
    setQuery("");
    setSetupMode("search");
    if (draft.confirmedCharacter) {
      immediateUiLockRef.current = true;
      beginSetupFlowTransition({
        character: draft.confirmedCharacter,
        flowId: requiredFlowId,
        completedFlowIds: normalizeCompletedFlowIds(draft.completedFlowIds ?? []),
        showFlowOverview: Boolean(
          draft.completedFlowIds?.includes(requiredFlowId) || draft.showFlowOverview,
        ),
        showCharacterDirectory: Boolean(draft.showCharacterDirectory),
        stepIndex: clampFlowStepIndex(
          draft.activeFlowId,
          draft.completedFlowIds?.includes(requiredFlowId) ? 0 : draft.setupStepIndex,
        ),
        stepDirection: draft.setupStepDirection,
        stepData: draft.setupStepTestByStep ?? {},
        source: "resume",
      });
    }
    writeSetupDraft({
      ...draft,
      setupFlowStarted: true,
      autoResumeOnLoad: true,
      savedAt: draft.savedAt,
    });
  };

  const activeSetupStep = getFlowStepByIndex(activeFlowId, setupStepIndex);
  const activeSetupStepValue = activeSetupStep
    ? setupStepTestByStep[activeSetupStep.id] ?? ""
    : "";

  const updateActiveStepValue = (value: string) => {
    if (!activeSetupStep) return;
    setSetupStepTestByStep((prev) => ({
      ...prev,
      [activeSetupStep.id]: value,
    }));
  };

  const confirmFoundCharacter = () => {
    if (immediateUiLockRef.current) return;
    if (!foundCharacter) return;
    const foundKey = toCharacterKey(foundCharacter);
    const alreadyAdded = characterRoster.some(
      (entry) => toCharacterKey(entry) === foundKey,
    );
    if (alreadyAdded) {
      setStatusTone("error");
      setStatusMessage(`${foundCharacter.characterName} is already added.`);
      return;
    }

    const existingCharacterDraft = readSetupDraftByCharacter(foundCharacter);
    immediateUiLockRef.current = true;
    beginSetupFlowTransition({
        character: foundCharacter,
        flowId: requiredFlowId,
        completedFlowIds: normalizeCompletedFlowIds(
          existingCharacterDraft?.completedFlowIds ?? [],
        ),
        showFlowOverview: Boolean(
          existingCharacterDraft?.completedFlowIds?.includes(requiredFlowId) ||
            existingCharacterDraft?.showFlowOverview,
        ),
        showCharacterDirectory: Boolean(existingCharacterDraft?.showCharacterDirectory),
        stepIndex: existingCharacterDraft
          ? clampFlowStepIndex(
              existingCharacterDraft.activeFlowId,
              existingCharacterDraft.completedFlowIds?.includes(requiredFlowId)
                ? 0
                : existingCharacterDraft.setupStepIndex,
            )
          : 0,
      stepDirection: "forward",
      stepData: existingCharacterDraft?.setupStepTestByStep ?? {},
      source: "confirm",
    });
  };

  const finishSetupFlow = () => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsFinishingSetup(true);

    queueTransitionTimer(() => {
      const isQuickSetupFlow = activeFlowId === requiredFlowId;
      if (isQuickSetupFlow && confirmedCharacter) {
        upsertRosterCharacter(confirmedCharacter);
        setHasCompletedRequiredSetupEver(true);
      }
      setIsAddingCharacter(false);

      const updatedCompleted = Array.from(new Set([...completedFlowIds, activeFlowId]));
      const hasCompletedRequired = updatedCompleted.includes(requiredFlowId);
      setCompletedFlowIds(updatedCompleted);
      setShowFlowOverview(hasCompletedRequired);
      // Finishing setup lands on this character's profile; directory is forced on next page entry.
      setShowCharacterDirectory(false);
      setActiveFlowId(requiredFlowId);
      setSetupStepIndex(0);
      setSetupStepDirection("forward");

      if (activeFlowId === requiredFlowId) {
        setStatusTone("neutral");
        setStatusMessage(LOOKUP_MESSAGES.setupSaved);
      }

      setIsFinishingSetup(false);
      immediateUiLockRef.current = false;
    }, 210);
  };

  const startOptionalFlow = (flowId: SetupFlowId) => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsStartingOptionalFlow(true);
    setIsOptionalFlowFadeIn(false);
    queueTransitionTimer(() => {
      setIsAddingCharacter(false);
      setActiveFlowId(flowId);
      setShowFlowOverview(false);
      setShowCharacterDirectory(false);
      setSetupStepDirection("forward");
      setSetupStepIndex(1);
      setIsStartingOptionalFlow(false);
      setIsOptionalFlowFadeIn(true);
    }, OPTIONAL_FLOW_FADE_OUT_MS);
    queueTransitionTimer(() => {
      setIsOptionalFlowFadeIn(false);
      immediateUiLockRef.current = false;
    }, OPTIONAL_FLOW_TRANSITION_TOTAL_MS);
  };

  const setMainCharacter = (character: NormalizedCharacterData) => {
    const key = toCharacterKey(character);
    setMainCharacterKey(key);
    switchToCharacterProfile(character);
  };

  const toggleChampionCharacter = (character: NormalizedCharacterData) => {
    const key = toCharacterKey(character);
    setChampionCharacterKeys((prev) => {
      if (prev.includes(key)) return prev.filter((entry) => entry !== key);
      if (prev.length >= MAX_CHAMPIONS) return prev;
      return [...prev, key];
    });
  };
  const currentCharacterKey = confirmedCharacter ? toCharacterKey(confirmedCharacter) : null;
  const isCurrentMainCharacter = Boolean(
    currentCharacterKey && mainCharacterKey && currentCharacterKey === mainCharacterKey,
  );
  const isCurrentChampionCharacter = Boolean(
    currentCharacterKey && championCharacterKeys.includes(currentCharacterKey),
  );
  const canSetCurrentChampion =
    isCurrentChampionCharacter || championCharacterKeys.length < MAX_CHAMPIONS;
  const currentCharacterGenderRaw = (setupStepTestByStep.gender ?? "").toLowerCase();
  const currentCharacterGender: "male" | "female" | null =
    currentCharacterGenderRaw === "male"
      ? "male"
      : currentCharacterGenderRaw === "female"
        ? "female"
        : null;

  const switchToCharacterProfile = (character: NormalizedCharacterData) => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsSwitchingToProfile(true);
    queueTransitionTimer(() => {
      setIsAddingCharacter(false);
      const draft = readSetupDraftByCharacter(character);
      setConfirmedCharacter(character);
      setSetupMode("search");
      setSetupFlowStarted(true);
      setShowCharacterDirectory(false);
      setSetupStepDirection("backward");
      setActiveFlowId(draft?.activeFlowId ?? requiredFlowId);
      setCompletedFlowIds(normalizeCompletedFlowIds(draft?.completedFlowIds ?? []));
      setShowFlowOverview(
        Boolean(
          draft?.completedFlowIds?.includes(requiredFlowId) ||
            draft?.showFlowOverview,
        ),
      );
      setSetupStepIndex(
        draft ? clampFlowStepIndex(draft.activeFlowId, draft.setupStepIndex) : 0,
      );
      setSetupStepDirection(draft?.setupStepDirection ?? "forward");
      setSetupStepTestByStep(draft?.setupStepTestByStep ?? {});
      setSetupPanelVisible(true);
      setIsSwitchingToProfile(false);
      immediateUiLockRef.current = false;
    }, 160);
  };

  const toggleCharacterDirectory = () => {
    if (immediateUiLockRef.current) return;
    if (!showCharacterDirectory) {
      immediateUiLockRef.current = true;
      setFastDirectoryRevealOnce(false);
      setIsSwitchingToDirectory(true);
      setSetupStepDirection("forward");
      queueTransitionTimer(() => {
        setShowCharacterDirectory(true);
      }, 160);
      queueTransitionTimer(() => {
        setIsSwitchingToDirectory(false);
        immediateUiLockRef.current = false;
      }, 260);
      return;
    }
    setSetupStepDirection("backward");
    setIsSwitchingToDirectory(false);
    setFastDirectoryRevealOnce(false);
    setShowCharacterDirectory(false);
  };

  const removeCurrentCharacter = () => {
    if (!confirmedCharacter) return;
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;

    const removedCharacter = confirmedCharacter;
    const removedKey = toCharacterKey(removedCharacter);
    const remainingRoster = characterRoster.filter(
      (entry) => toCharacterKey(entry) !== removedKey,
    );
    const remainingChampionKeys = championCharacterKeys.filter((key) => key !== removedKey);
    const nextMainKey =
      mainCharacterKey && mainCharacterKey !== removedKey ? mainCharacterKey : null;

    removeSetupDraftForCharacter(removedCharacter);
    setIsDeleteTransitioning(true);
    setIsSwitchingToDirectory(true);
    setSetupStepDirection("forward");

    queueTransitionTimer(() => {
      setCharacterRoster(remainingRoster);
      setChampionCharacterKeys(remainingChampionKeys);
      setMainCharacterKey(nextMainKey);
      setConfirmedCharacter(null);
      setFoundCharacter(null);
      setQuery("");
      setCanResumeSetup(false);
      setResumeSetupCharacterName(null);
      setIsAddingCharacter(false);
      resetSearchStateMessage();
      setHasCompletedRequiredSetupEver(hasAnyCompletedRequiredSetupFlow());
      setSetupMode("search");
      setSetupFlowStarted(true);
      setShowFlowOverview(true);
      setShowCharacterDirectory(true);
      setSetupPanelVisible(true);
      setSetupStepIndex(0);
      setSetupStepDirection("forward");
      setDeleteNoticeCharacterName(removedCharacter.characterName);
    }, 220);

    queueTransitionTimer(() => {
      setShowDeleteNotice(true);
    }, 250);

    queueTransitionTimer(() => {
      setShowDeleteNotice(false);
    }, 1250);

    queueTransitionTimer(() => {
      setDeleteNoticeCharacterName(null);
      setIsDeleteTransitioning(false);
      setIsSwitchingToDirectory(false);
      immediateUiLockRef.current = false;
    }, 1720);
  };

  const openAddCharacterSearch = () => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    const draft = readLastSetupDraft();
    const canResumeFromDraft = isResumableDraft(draft);
    runBackTransition(() => {
      setIsAddingCharacter(true);
      setShowCharacterDirectory(false);
      setShowFlowOverview(false);
      setSetupMode("search");
      setSetupFlowStarted(false);
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setQuery("");
      setCanResumeSetup(canResumeFromDraft);
      setResumeSetupCharacterName(
        canResumeFromDraft ? (draft?.confirmedCharacter?.characterName ?? draft?.query ?? null) : null,
      );
      resetSearchStateMessage();
    });
  };

  const backFromAddCharacter = () => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsSwitchingToDirectory(true);
    const targetShowFlowOverview = true;
    const targetShowCharacterDirectory = true;
    const targetStepIndex = 0;
    const targetStepDirection: "forward" | "backward" = "backward";

    runBackTransition(() => {
      setFastDirectoryRevealOnce(true);
      setIsAddingCharacter(false);
      setFoundCharacter(null);
      setSetupFlowStarted(true);
      setSetupPanelVisible(true);
      setShowFlowOverview(targetShowFlowOverview);
      setShowCharacterDirectory(targetShowCharacterDirectory);
      setSetupStepDirection(targetStepDirection);
      setSetupStepIndex(targetStepIndex);
    }, { enableSearchFadeIn: false });

    queueTransitionTimer(() => {
      setIsSwitchingToDirectory(false);
    }, 300);

    if (confirmedCharacter) {
      const characterKey = makeDraftCharacterKey(confirmedCharacter);
      const existingDraft = readSetupDraftByCharacter(confirmedCharacter);
      writeSetupDraft({
        version: 1,
        characterKey,
        query,
        setupMode: "search",
        setupFlowStarted: true,
        autoResumeOnLoad: true,
        activeFlowId,
        completedFlowIds,
        showFlowOverview: targetShowFlowOverview,
        showCharacterDirectory: targetShowCharacterDirectory,
        characterRoster,
        mainCharacterKey,
        championCharacterKeys,
        setupStepIndex: targetStepIndex,
        setupStepDirection: targetStepDirection,
        setupStepTestByStep,
        confirmedCharacter,
        savedAt: existingDraft?.savedAt ?? 0,
      });
    }
  };

  const returnToSummaryProfile = () => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsStartingOptionalFlow(true);
    setIsOptionalFlowFadeIn(false);
    queueTransitionTimer(() => {
      setShowFlowOverview(true);
      setShowCharacterDirectory(false);
      setSetupStepDirection("backward");
      setSetupStepIndex(0);
      setIsStartingOptionalFlow(false);
    }, OPTIONAL_FLOW_FADE_OUT_MS);
    queueTransitionTimer(() => {
      immediateUiLockRef.current = false;
    }, OPTIONAL_FLOW_TRANSITION_TOTAL_MS);
  };

  const handleQueryInput = (rawValue: string) => {
    const sanitized = rawValue
      .replace(CHARACTER_NAME_INPUT_FILTER_REGEX, "")
      .slice(0, MAX_QUERY_LENGTH);
    setQuery(sanitized);
  };

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const duplicateByName = findRosterCharacterByName(trimmedQuery);
    if (duplicateByName) {
      setStatusTone("error");
      setStatusMessage(`${duplicateByName.characterName} is already added.`);
      setFoundCharacter(null);
      return;
    }
    setSetupFlowStarted(false);
    setSetupPanelVisible(false);
    setConfirmedCharacter(null);
    await runLookup(trimmedQuery);
  };

  return (
    <>
      <style>{getCharacterSetupFlowStyles(theme)}</style>

      <main className="characters-main" style={{ flex: 1 }}>
        <div
          className={[
            "characters-content",
            suppressLayoutTransition ? "suppress-layout" : "",
            foundCharacter && !setupFlowStarted ? "has-preview" : "",
            setupFlowStarted ? "setup-active" : "",
            showCharacterDirectory && !isSwitchingToDirectory ? "directory-view" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {(!showCharacterDirectory || isSwitchingToDirectory) && (
            <div className="search-pane">
              <SearchPaneCard
                theme={theme}
                isDraftHydrated={isDraftHydrated}
                isConfirmFadeOut={isConfirmFadeOut}
                isModeTransitioning={isModeTransitioning}
                isSearchFadeIn={isSearchFadeIn}
                setupMode={setupMode}
                setupFlowStarted={setupFlowStarted}
                hasCompletedRequiredFlow={
                  completedFlowIds.includes(requiredFlowId) || hasCompletedRequiredSetupEver
                }
                canResumeSetup={canResumeSetup}
                resumeSetupCharacterName={resumeSetupCharacterName}
                query={query}
                queryInvalid={queryInvalid}
                isSearching={isSearching}
                statusMessage={statusMessage}
                statusTone={statusTone}
                confirmedCharacter={confirmedCharacter}
                confirmedImageLoaded={confirmedImageLoaded}
                isBackTransitioning={isBackTransitioning}
                isSwitchingToDirectory={isSwitchingToDirectory}
                showCharacterDirectory={showCharacterDirectory}
                showSummaryNavigation={
                  setupFlowStarted &&
                  completedFlowIds.includes(requiredFlowId) &&
                  !isAddingCharacter
                }
                isSummaryView={showFlowOverview}
                isAddingCharacter={isAddingCharacter}
                isUiLocked={isUiLocked}
                isCurrentMainCharacter={isCurrentMainCharacter}
                isCurrentChampionCharacter={isCurrentChampionCharacter}
                canSetCurrentChampion={canSetCurrentChampion}
                currentCharacterGender={currentCharacterGender}
                isStartingOptionalFlow={isStartingOptionalFlow}
                isOptionalFlowFadeIn={isOptionalFlowFadeIn}
                onRunTransitionToMode={runTransitionToMode}
                onRunBackToIntroTransition={runBackToIntroTransition}
                onBackFromSetupFlow={backFromSetupFlowToAddCharacter}
                onBackToCharactersDirectory={backToCharactersDirectory}
                onReturnToSummaryProfile={returnToSummaryProfile}
                onBackFromAddCharacter={backFromAddCharacter}
                onResumeSavedSetup={resumeSavedSetup}
                onSetCurrentAsMain={() => {
                  if (!confirmedCharacter) return;
                  setMainCharacter(confirmedCharacter);
                }}
                onToggleCurrentChampion={() => {
                  if (!confirmedCharacter) return;
                  toggleChampionCharacter(confirmedCharacter);
                }}
                onRemoveCurrentCharacter={removeCurrentCharacter}
                onSearchSubmit={handleSearchSubmit}
                onQueryChange={handleQueryInput}
                onConfirmedImageLoaded={() => setConfirmedImageLoaded(true)}
                onToggleCharacterDirectory={toggleCharacterDirectory}
              />
            </div>
          )}

          <PreviewSetupPane
            theme={theme}
            foundCharacter={foundCharacter}
            previewCardReady={previewCardReady}
            previewContentReady={previewContentReady}
            previewImageLoaded={previewImageLoaded}
            isConfirmFadeOut={isConfirmFadeOut}
            isModeTransitioning={isModeTransitioning}
            setupFlowStarted={setupFlowStarted}
            setupPanelVisible={setupPanelVisible}
            isBackTransitioning={isBackTransitioning}
            isFinishingSetup={isFinishingSetup}
            isSwitchingToDirectory={isSwitchingToDirectory}
            isSwitchingToProfile={isSwitchingToProfile}
            isUiLocked={isUiLocked}
            isStartingOptionalFlow={isStartingOptionalFlow}
            isOptionalFlowFadeIn={isOptionalFlowFadeIn}
            activeFlowId={activeFlowId}
            completedFlowIds={completedFlowIds}
            optionalFlows={getOptionalSetupFlows()}
            showFlowOverview={showFlowOverview}
            showCharacterDirectory={showCharacterDirectory}
            fastDirectoryRevealOnce={fastDirectoryRevealOnce}
            allCharacters={characterRoster}
            mainCharacterKey={mainCharacterKey}
            championCharacterKeys={championCharacterKeys}
            maxCharacters={MAX_ACCOUNT_CHARACTERS}
            maxChampions={MAX_CHAMPIONS}
            setupStepIndex={setupStepIndex}
            setupStepDirection={setupStepDirection}
            activeSetupStepValue={activeSetupStepValue}
            onSetPreviewImageLoaded={setPreviewImageLoaded}
            onConfirmFoundCharacter={confirmFoundCharacter}
            onSetSetupStepWithDirection={setSetupStepWithDirection}
            onStepValueChange={updateActiveStepValue}
            onFinishSetupFlow={finishSetupFlow}
            onStartOptionalFlow={startOptionalFlow}
            onOpenCharacterSearch={openAddCharacterSearch}
            onOpenCharacterProfile={switchToCharacterProfile}
          />
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

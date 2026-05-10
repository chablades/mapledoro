import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoRefresh } from "./useAutoRefresh";
import {
  CHARACTER_NAME_INPUT_FILTER_REGEX,
  MAX_QUERY_LENGTH,
  type SetupMode,
} from "../model/constants";
import { findRosterCharacterByName, toCharacterKey } from "../model/characterKeys";
import {
  createStoredCharacterRecord,
  hasStoredCompletedRequiredSetup,
  readCharactersStore,
  selectCharacterById,
  selectCharactersList,
  writeCharactersStore,
} from "../model/charactersStore";
import {
  readAllSetupDrafts,
  makeDraftCharacterKey,
  readLastSetupDraft,
  readSetupDraftByCharacter,
  removeSetupDraftForCharacter,
  type SetupDraft,
  writeSetupDraft,
} from "../model/setupDraftStorage";
import type { StoredCharacterRecord } from "../model/charactersStore";
import type { NormalizedCharacterData } from "../model/types";
import {
  clampFlowStepIndex,
  getFlowStepByIndex,
  getRequiredSetupFlowId,
  type SetupFlowId,
} from "../setup/flows";
import type { SetupStepInputById } from "../setup/types";
import { LOOKUP_MESSAGES } from "./messages";
import { useCharacterLookup } from "./useCharacterLookup";
import {
  CHARACTERS_TRANSITION_MS,
  useSetupFlowTransitions,
} from "./useSetupFlowTransitions";

export const MAX_CHAMPIONS = 4;

function normalizeCompletedFlowIds(flowIds: SetupFlowId[]) {
  return Array.from(new Set(flowIds));
}

function normalizeGenderValue(value: string | undefined | null): "male" | "female" | null {
  const raw = (value ?? "").toLowerCase();
  if (raw === "male") return "male";
  if (raw === "female") return "female";
  return null;
}

function getCurrentCharacterGender(
  setupStepTestByStep: SetupStepInputById,
): "male" | "female" | null {
  const currentCharacterGenderRaw = (setupStepTestByStep.gender ?? "").toLowerCase();
  if (currentCharacterGenderRaw === "male" || currentCharacterGenderRaw === "female") {
    return currentCharacterGenderRaw;
  }
  return null;
}

// Helpers for world-scoped main/champion key maps
function getMainKeyForWorld(
  mainCharacterKeyByWorld: Record<string, string>,
  worldId: number,
): string | null {
  return mainCharacterKeyByWorld[String(worldId)] ?? null;
}

function getChampionKeysForWorld(
  championCharacterKeysByWorld: Record<string, string[]>,
  worldId: number,
): string[] {
  return championCharacterKeysByWorld[String(worldId)] ?? [];
}

function setMainKeyForWorld(
  prev: Record<string, string>,
  worldId: number,
  key: string | null,
): Record<string, string> {
  const next = { ...prev };
  if (key === null) {
    delete next[String(worldId)];
  } else {
    next[String(worldId)] = key;
  }
  return next;
}

function setChampionKeysForWorld(
  prev: Record<string, string[]>,
  worldId: number,
  keys: string[],
): Record<string, string[]> {
  return { ...prev, [String(worldId)]: keys };
}

export function useCharacterSetupController() {
  const immediateUiLockRef = useRef(false);
  const [query, setQuery] = useState("");
  const [foundCharacter, setFoundCharacter] = useState<NormalizedCharacterData | null>(null);
  const [previewCardReady, setPreviewCardReady] = useState(false);
  const [previewContentReady, setPreviewContentReady] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>("intro");
  const [confirmedCharacter, setConfirmedCharacter] = useState<NormalizedCharacterData | null>(
    null,
  );
  const [previewImageLoaded, setPreviewImageLoaded] = useState(false);
  const [confirmedImageLoaded, setConfirmedImageLoaded] = useState(false);
  const [setupFlowStarted, setSetupFlowStarted] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<SetupFlowId>(() => getRequiredSetupFlowId());
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
  const [characterRoster, setCharacterRoster] = useState<StoredCharacterRecord[]>([]);
  const [autoRefreshQueue, setAutoRefreshQueue] = useState<StoredCharacterRecord[]>([]);

  // World-scoped main and champion keys
  const [mainCharacterKeyByWorld, setMainCharacterKeyByWorld] = useState<Record<string, string>>({});
  const [championCharacterKeysByWorld, setChampionCharacterKeysByWorld] = useState<Record<string, string[]>>({});

  const [setupStepIndex, setSetupStepIndex] = useState(0);
  const [setupStepDirection, setSetupStepDirection] = useState<"forward" | "backward">("forward");
  const [setupStepTestByStep, setSetupStepTestByStep] = useState<SetupStepInputById>({});
  const [canResumeSetup, setCanResumeSetup] = useState(false);
  const [resumeSetupCharacterName, setResumeSetupCharacterName] = useState<string | null>(null);
  const [hasCompletedRequiredSetupEver, setHasCompletedRequiredSetupEver] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const hasHydratedSetupDraftRef = useRef(false);
  const lookup = useCharacterLookup({
    query,
    onFoundCharacterChange: setFoundCharacter,
  });

  const handleRefreshed = useCallback((fresh: NormalizedCharacterData) => {
    const key = toCharacterKey(fresh);
    setCharacterRoster((prev) => {
      const existingIndex = prev.findIndex((c) => toCharacterKey(c) === key);
      if (existingIndex === -1) return prev;
      const existing = prev[existingIndex];
      const updated = createStoredCharacterRecord({
        character: fresh,
        gender: existing.gender,
        stats: existing.stats,
        equipment: existing.equipment,
        addedAt: existing.meta.addedAt,
      });
      const next = [...prev];
      next[existingIndex] = updated;
      return next;
    });
  }, []);

  const { refreshingKeys, refreshSingle } = useAutoRefresh({
    queue: autoRefreshQueue,
    onRefreshed: handleRefreshed,
  });

  const transitions = useSetupFlowTransitions();
  const {
    queueTransitionTimer,
    setSetupPanelVisible,
    setSuppressLayoutTransition,
  } = transitions;
  const requiredFlowId = getRequiredSetupFlowId();
  const isUiLocked =
    transitions.isConfirmFadeOut ||
    transitions.isModeTransitioning ||
    transitions.isBackTransitioning ||
    isSwitchingToDirectory ||
    isSwitchingToProfile ||
    isFinishingSetup ||
    isDeleteTransitioning;

  // Convenience: get main/champion keys for the confirmed character's world
  const confirmedWorldId = confirmedCharacter?.worldID ?? null;
  const mainCharacterKey = confirmedWorldId !== null
    ? getMainKeyForWorld(mainCharacterKeyByWorld, confirmedWorldId)
    : null;
  const championCharacterKeys = confirmedWorldId !== null
    ? getChampionKeysForWorld(championCharacterKeysByWorld, confirmedWorldId)
    : [];

  const isResumableDraft = useCallback(
    (draft: SetupDraft | null) =>
      Boolean(draft?.confirmedCharacter) &&
      !draft?.completedFlowIds?.includes(requiredFlowId),
    [requiredFlowId],
  );

  const upsertRosterCharacter = useCallback((character: StoredCharacterRecord) => {
    setCharacterRoster((prev) => {
      const key = toCharacterKey(character);
      const existingIndex = prev.findIndex((entry) => toCharacterKey(entry) === key);
      if (existingIndex === -1) return [...prev, character];
      const next = [...prev];
      next[existingIndex] = character;
      return next;
    });
    // Set as main for their world only if no main exists yet for that world
    setMainCharacterKeyByWorld((prev) => {
      const worldKey = String(character.worldID);
      if (prev[worldKey]) return prev;
      return { ...prev, [worldKey]: toCharacterKey(character) };
    });
  }, []);

  const applyDraftFlowState = useCallback(
    (
      draft: SetupDraft,
      completedFlowIds: SetupFlowId[],
      options?: {
        includeSetupMode?: boolean;
        includeStartedFlags?: boolean;
        includeVisibility?: boolean;
      },
    ) => {
      setCompletedFlowIds(completedFlowIds);
      setActiveFlowId(draft.activeFlowId);
      setSetupStepIndex(draft.setupStepIndex);
      setSetupStepDirection(draft.setupStepDirection);
      setSetupStepTestByStep(draft.setupStepTestByStep ?? {});
      setConfirmedCharacter(draft.confirmedCharacter);

      if (options?.includeSetupMode) setSetupMode(draft.setupMode);
      if (options?.includeStartedFlags) setSetupFlowStarted(draft.setupFlowStarted);
      if (options?.includeVisibility) {
        setShowFlowOverview(Boolean(draft.showFlowOverview));
        setShowCharacterDirectory(Boolean(draft.showCharacterDirectory));
      }
    },
    [],
  );

  const showCompletedDirectoryState = useCallback(
    (
      store: ReturnType<typeof readCharactersStore>,
      roster: StoredCharacterRecord[],
    ) => {
      setCharacterRoster(roster);
      setMainCharacterKeyByWorld(store.mainCharacterIdByWorld);
      setChampionCharacterKeysByWorld(store.championCharacterIdsByWorld);
      setSetupMode("search");
      setSetupFlowStarted(true);
      setShowFlowOverview(true);
      setShowCharacterDirectory(true);
      setSetupPanelVisible(true);
      setSuppressLayoutTransition(false);
      setHasCompletedRequiredSetupEver(true);
    },
    [setSetupPanelVisible, setSuppressLayoutTransition],
  );

  const resumeActiveFlow = useCallback(
    (draft: SetupDraft, nextCompletedFlowIds: SetupFlowId[]) => {
      applyDraftFlowState(draft, nextCompletedFlowIds, {
        includeSetupMode: true,
        includeStartedFlags: true,
        includeVisibility: true,
      });
      setSuppressLayoutTransition(draft.setupFlowStarted);
      setSetupPanelVisible(false);
      if (draft.setupFlowStarted) {
        queueTransitionTimer(() => {
          setSetupPanelVisible(true);
        }, CHARACTERS_TRANSITION_MS.setupPanelRevealDelay);
        queueTransitionTimer(() => {
          setSuppressLayoutTransition(false);
        }, CHARACTERS_TRANSITION_MS.slow + CHARACTERS_TRANSITION_MS.setupPanelRevealDelay);
      }
    },
    [applyDraftFlowState, queueTransitionTimer, setSetupPanelVisible, setSuppressLayoutTransition],
  );

  const restoreCompletedFlowState = useCallback(
    (draft: SetupDraft, nextCompletedFlowIds: SetupFlowId[], hasCompletedRequiredFlow: boolean) => {
      applyDraftFlowState(draft, nextCompletedFlowIds);
      setSetupMode("search");
      setSetupFlowStarted(true);
      setShowFlowOverview(true);
      setShowCharacterDirectory(true);
      if (!hasCompletedRequiredFlow) {
        setActiveFlowId(requiredFlowId);
        setSetupStepIndex(0);
        setSetupStepDirection("forward");
        setSetupStepTestByStep({});
      }
      setIsAddingCharacter(false);
      setSetupPanelVisible(true);
      setSuppressLayoutTransition(false);
      setHasCompletedRequiredSetupEver(true);
    },
    [applyDraftFlowState, requiredFlowId, setSetupPanelVisible, setSuppressLayoutTransition],
  );

  const hydrateDraftCommonState = useCallback(
    (
      draft: SetupDraft,
      store: ReturnType<typeof readCharactersStore>,
      storedRoster: StoredCharacterRecord[],
      accountHasCompletedRequiredFlow: boolean,
    ) => {
      const nextCompletedFlowIds = normalizeCompletedFlowIds(draft.completedFlowIds ?? []);
      const hasCompletedRequiredFlow = nextCompletedFlowIds.includes(requiredFlowId);

      if (hasCompletedRequiredFlow && draft.confirmedCharacter) {
        removeSetupDraftForCharacter(draft.confirmedCharacter);
      }

      setHasCompletedRequiredSetupEver(
        accountHasCompletedRequiredFlow || hasCompletedRequiredFlow,
      );

      const canResumeFromDraft = isResumableDraft(draft);
      setCanResumeSetup(canResumeFromDraft);
      setResumeSetupCharacterName(
        canResumeFromDraft ? (draft.confirmedCharacter?.characterName ?? draft.query) : null,
      );
      setQuery(draft.query);
      setCharacterRoster(storedRoster);
      setMainCharacterKeyByWorld(store.mainCharacterIdByWorld);
      setChampionCharacterKeysByWorld(store.championCharacterIdsByWorld);

      return { nextCompletedFlowIds, hasCompletedRequiredFlow };
    },
    [isResumableDraft, requiredFlowId],
  );

  const handleDraftHydration = useCallback(
    (
      draft: SetupDraft | null,
      store: ReturnType<typeof readCharactersStore>,
      storedRoster: StoredCharacterRecord[],
      accountHasCompletedRequiredFlow: boolean,
    ) => {
      if (!draft) {
        if (accountHasCompletedRequiredFlow) {
          showCompletedDirectoryState(store, storedRoster);
        } else {
          setCanResumeSetup(false);
          setResumeSetupCharacterName(null);
          setHasCompletedRequiredSetupEver(false);
        }
        return;
      }

      const { nextCompletedFlowIds, hasCompletedRequiredFlow } =
        hydrateDraftCommonState(draft, store, storedRoster, accountHasCompletedRequiredFlow);

      const hasActiveFlowInProgress =
        draft.setupFlowStarted && !draft.showFlowOverview;

      if (draft.autoResumeOnLoad && hasActiveFlowInProgress) {
        resumeActiveFlow(draft, nextCompletedFlowIds);
      } else if (hasCompletedRequiredFlow || accountHasCompletedRequiredFlow) {
        restoreCompletedFlowState(draft, nextCompletedFlowIds, hasCompletedRequiredFlow);
      } else {
        applyDraftFlowState(draft, nextCompletedFlowIds, draft.autoResumeOnLoad
          ? { includeSetupMode: true, includeStartedFlags: true, includeVisibility: true }
          : undefined);
      }
    },
    [
      applyDraftFlowState,
      hydrateDraftCommonState,
      resumeActiveFlow,
      restoreCompletedFlowState,
      showCompletedDirectoryState,
    ],
  );

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
    const cardTimer = setTimeout(() => setPreviewCardReady(true), CHARACTERS_TRANSITION_MS.slow);
    const contentTimer = setTimeout(
      () => setPreviewContentReady(true),
      CHARACTERS_TRANSITION_MS.slow + CHARACTERS_TRANSITION_MS.fast,
    );
    return () => {
      clearTimeout(prepTimer);
      clearTimeout(cardTimer);
      clearTimeout(contentTimer);
    };
  }, [foundCharacter]);

  useEffect(() => {
    const draft = readLastSetupDraft();
    const store = readCharactersStore();
    const storedRoster = selectCharactersList(store);
    const accountHasCompletedRequiredFlow = hasStoredCompletedRequiredSetup(store);

    const hydrateTimer = window.setTimeout(() => {
      handleDraftHydration(draft, store, storedRoster, accountHasCompletedRequiredFlow);
      hasHydratedSetupDraftRef.current = true;
      setIsDraftHydrated(true);

      // Compute stale main+champions for background auto-refresh
      const now = Date.now();
      const seen = new Set<string>();
      const stale: StoredCharacterRecord[] = [];
      for (const mainKey of Object.values(store.mainCharacterIdByWorld)) {
        const char = store.charactersById[mainKey];
        if (char && now > char.expiresAt) { seen.add(mainKey); stale.push(char); }
      }
      for (const champKeys of Object.values(store.championCharacterIdsByWorld)) {
        for (const key of champKeys) {
          if (seen.has(key)) continue;
          const char = store.charactersById[key];
          if (char && now > char.expiresAt) { seen.add(key); stale.push(char); }
        }
      }
      if (stale.length > 0) setAutoRefreshQueue(stale);
    }, 0);
    return () => clearTimeout(hydrateTimer);
  }, [handleDraftHydration]);

  // Persist store whenever roster or world-scoped keys change
  useEffect(() => {
    if (!hasHydratedSetupDraftRef.current) return;
    if (typeof window === "undefined") return;

    const existingStore = readCharactersStore();
    const now = Date.now();
    const currentCharacterKey = confirmedCharacter ? toCharacterKey(confirmedCharacter) : null;
    // characterRoster is already StoredCharacterRecord[], just sync gender from setup steps
    // and update meta.updatedAt if the character data changed since last save.
    const nextCharactersById = characterRoster.reduce<Record<string, StoredCharacterRecord>>(
      (acc, character) => {
        const id = toCharacterKey(character);
        const existingRecord = existingStore.charactersById[id];
        const isCurrentCharacter = currentCharacterKey === id;
        const gender = isCurrentCharacter
          ? normalizeGenderValue(setupStepTestByStep.gender)
          : (character.gender ?? existingRecord?.gender ?? null);
        acc[id] = {
          ...character,
          gender,
          meta: {
            addedAt: character.meta.addedAt,
            updatedAt:
              existingRecord && existingRecord.fetchedAt === character.fetchedAt
                ? character.meta.updatedAt
                : now,
          },
        };
        return acc;
      },
      {},
    );

    // Filter world-scoped keys to only valid characters
    const nextMainCharacterIdByWorld: Record<string, string> = {};
    for (const [worldId, key] of Object.entries(mainCharacterKeyByWorld)) {
      if (nextCharactersById[key]) nextMainCharacterIdByWorld[worldId] = key;
    }
    const nextChampionCharacterIdsByWorld: Record<string, string[]> = {};
    for (const [worldId, keys] of Object.entries(championCharacterKeysByWorld)) {
      const validKeys = keys.filter((id) => Boolean(nextCharactersById[id]));
      if (validKeys.length > 0) nextChampionCharacterIdsByWorld[worldId] = validKeys;
    }

    const nextStore = {
      version: existingStore.version,
      order: characterRoster.map((character) => toCharacterKey(character)),
      mainCharacterIdByWorld: nextMainCharacterIdByWorld,
      championCharacterIdsByWorld: nextChampionCharacterIdsByWorld,
      charactersById: nextCharactersById,
      updatedAt: now,
    };

    writeCharactersStore(nextStore);
  }, [
    championCharacterKeysByWorld,
    characterRoster,
    confirmedCharacter,
    mainCharacterKeyByWorld,
    setupStepTestByStep,
  ]);

  // Persist draft
  useEffect(() => {
    if (!hasHydratedSetupDraftRef.current) return;
    if (typeof window === "undefined") return;
    if (!confirmedCharacter) return;

    const hasCompletedRequiredFlow = completedFlowIds.includes(requiredFlowId);
    if (hasCompletedRequiredFlow) {
      removeSetupDraftForCharacter(confirmedCharacter);
      const clearResumeStateTimer = window.setTimeout(() => {
        setCanResumeSetup(false);
        setResumeSetupCharacterName(null);
      }, 0);
      return () => clearTimeout(clearResumeStateTimer);
    }

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
    activeFlowId,
    championCharacterKeysByWorld,
    characterRoster,
    completedFlowIds,
    confirmedCharacter,
    isResumableDraft,
    mainCharacterKeyByWorld,
    query,
    requiredFlowId,
    setupFlowStarted,
    setupMode,
    setupStepDirection,
    setupStepIndex,
    setupStepTestByStep,
    showCharacterDirectory,
    showFlowOverview,
  ]);

  useEffect(() => {
    immediateUiLockRef.current = isUiLocked;
  }, [isUiLocked]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [setupFlowStarted, setupMode, setupStepIndex, showFlowOverview]);

  const beginSetupFlowTransition = useCallback(
    (args: {
      character: NormalizedCharacterData;
      source: "found-character" | "resume";
      flowId: SetupFlowId;
      completedFlowIds: SetupFlowId[];
      showFlowOverview: boolean;
      showCharacterDirectory: boolean;
      stepIndex: number;
      stepDirection: "forward" | "backward";
      stepData: SetupStepInputById;
    }) => {
      transitions.beginSetupFlowTransition(args, {
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
    },
    [transitions],
  );

  const runBackToIntroTransition = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsAddingCharacter(false);
    if (confirmedCharacter) {
      const draft = readSetupDraftByCharacter(confirmedCharacter);
      if (draft) writeSetupDraft({ ...draft, autoResumeOnLoad: false, setupFlowStarted: false, savedAt: Date.now() });
    }
    transitions.runBackToIntroTransition({
          resetSearchStateMessage: lookup.resetSearchStateMessage,
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
  }, [confirmedCharacter, lookup, transitions]);

  const runTransitionToMode = useCallback(
    (nextMode: SetupMode) => {
      if (immediateUiLockRef.current) return;
      immediateUiLockRef.current = true;
      setIsAddingCharacter(false);
      transitions.runTransitionToMode(nextMode, {
        resetSearchStateMessage: lookup.resetSearchStateMessage,
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
    },
    [lookup, transitions],
  );

  const backFromSetupFlowToAddCharacter = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    if (confirmedCharacter) {
      const draft = readSetupDraftByCharacter(confirmedCharacter);
      if (draft) writeSetupDraft({ ...draft, autoResumeOnLoad: false, setupFlowStarted: false, savedAt: Date.now() });
    }
    transitions.runBackTransition(() => {
      setIsAddingCharacter(true);
      setSetupFlowStarted(false);
      setShowFlowOverview(false);
      setShowCharacterDirectory(false);
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setSetupStepIndex(0);
      setSetupStepDirection("forward");
      setSetupStepTestByStep({});
      lookup.resetSearchStateMessage();
    });
  }, [confirmedCharacter, lookup, transitions]);

  const backToCharactersDirectory = useCallback(() => {
    setIsAddingCharacter(false);
    setSetupMode("search");
    setSetupFlowStarted(true);
    transitions.setSetupPanelVisible(true);
    setShowFlowOverview(true);
    setShowCharacterDirectory(true);
    setSetupStepIndex(0);
    setSetupStepDirection("backward");
  }, [transitions]);

  const setSetupStepWithDirection = useCallback(
    (nextStep: number) => {
      const boundedStep = clampFlowStepIndex(activeFlowId, nextStep);
      if (boundedStep === setupStepIndex) return;
      setSetupStepDirection(boundedStep > setupStepIndex ? "forward" : "backward");
      setSetupStepIndex(boundedStep);
    },
    [activeFlowId, setupStepIndex],
  );

  const resumeSavedSetup = useCallback(() => {
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
        source: "resume",
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
      });
    }

    writeSetupDraft({
      ...draft,
      setupFlowStarted: true,
      autoResumeOnLoad: true,
      savedAt: draft.savedAt,
    });
  }, [beginSetupFlowTransition, isResumableDraft, requiredFlowId]);

  const confirmFoundCharacter = useCallback(() => {
    if (immediateUiLockRef.current) return;
    if (!foundCharacter) return;

    const foundKey = toCharacterKey(foundCharacter);
    const alreadyAdded = characterRoster.some((entry) => toCharacterKey(entry) === foundKey);
    if (alreadyAdded) {
      lookup.setStatusTone("error");
      lookup.setStatusMessage(`${foundCharacter.characterName} is already added.`);
      return;
    }

    const existingCharacterDraft = readSetupDraftByCharacter(foundCharacter);
    immediateUiLockRef.current = true;

    const charKey = toCharacterKey(foundCharacter);
    for (const d of readAllSetupDrafts()) {
      if (d.characterKey !== charKey && !d.completedFlowIds.includes(requiredFlowId) && d.confirmedCharacter) {
        removeSetupDraftForCharacter(d.confirmedCharacter);
      }
    }

    beginSetupFlowTransition({
      character: foundCharacter,
      source: "found-character",
      flowId: requiredFlowId,
      completedFlowIds: normalizeCompletedFlowIds(
        existingCharacterDraft?.completedFlowIds ?? [],
      ),
      showFlowOverview: Boolean(
        existingCharacterDraft?.completedFlowIds?.includes(requiredFlowId) ||
          existingCharacterDraft?.showFlowOverview,
      ),
      showCharacterDirectory: Boolean(existingCharacterDraft?.showCharacterDirectory),
      stepIndex: (() => {
        if (!existingCharacterDraft) return 0;
        const draftStepIdx = existingCharacterDraft.completedFlowIds?.includes(requiredFlowId)
          ? 0
          : existingCharacterDraft.setupStepIndex;
        return clampFlowStepIndex(existingCharacterDraft.activeFlowId, draftStepIdx);
      })(),
      stepDirection: "forward",
      stepData: existingCharacterDraft?.setupStepTestByStep ?? {},
    });
  }, [
    beginSetupFlowTransition,
    characterRoster,
    foundCharacter,
    requiredFlowId,
    lookup,
  ]);

  const finishSetupFlow = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsFinishingSetup(true);

    transitions.queueTransitionTimer(() => {
      const isQuickSetupFlow = activeFlowId === requiredFlowId;
      if (isQuickSetupFlow && confirmedCharacter) {
        // Convert from NormalizedCharacterData (API response) to StoredCharacterRecord before adding to roster
        const storedRecord = createStoredCharacterRecord({
          character: confirmedCharacter,
          gender: normalizeGenderValue(setupStepTestByStep.gender),
        });
        upsertRosterCharacter(storedRecord);
        setHasCompletedRequiredSetupEver(true);
        removeSetupDraftForCharacter(confirmedCharacter);
      }
      setIsAddingCharacter(false);

      const updatedCompleted = Array.from(new Set([...completedFlowIds, activeFlowId]));
      setCompletedFlowIds(updatedCompleted);
      setShowFlowOverview(false);
      setShowCharacterDirectory(false);
      setActiveFlowId(requiredFlowId);
      setSetupStepIndex(0);
      setSetupStepDirection("forward");

      if (activeFlowId === requiredFlowId) {
        lookup.setStatusTone("neutral");
        lookup.setStatusMessage(LOOKUP_MESSAGES.setupSaved);
      }

      setIsFinishingSetup(false);
      immediateUiLockRef.current = false;
    }, CHARACTERS_TRANSITION_MS.standard);
  }, [
    activeFlowId,
    completedFlowIds,
    confirmedCharacter,
    requiredFlowId,
    setupStepTestByStep,
    lookup,
    transitions,
    upsertRosterCharacter,
  ]);

  const switchToCharacterProfile = useCallback(
    (character: StoredCharacterRecord) => {
      if (immediateUiLockRef.current) return;
      immediateUiLockRef.current = true;
      setIsSwitchingToProfile(true);
      transitions.queueTransitionTimer(() => {
        setIsAddingCharacter(false);
        const store = readCharactersStore();
        const storedCharacter = selectCharacterById(store, toCharacterKey(character));
        setConfirmedCharacter(character);
        setSetupMode("search");
        setSetupFlowStarted(true);
        setShowCharacterDirectory(false);
        setSetupStepDirection("backward");
        setActiveFlowId(requiredFlowId);
        setCompletedFlowIds([requiredFlowId]);
        setShowFlowOverview(false);
        setSetupStepIndex(0);
        setSetupStepDirection("forward");
        setSetupStepTestByStep({
          gender: storedCharacter?.gender ?? "",
          stats: "",
          equipment_core: "",
        });
        transitions.setSetupPanelVisible(true);
        setIsSwitchingToProfile(false);
        immediateUiLockRef.current = false;
      }, CHARACTERS_TRANSITION_MS.fast);
    },
    [requiredFlowId, transitions],
  );

  const setMainCharacter = useCallback(
    (character: StoredCharacterRecord) => {
      setMainCharacterKeyByWorld((prev) =>
        setMainKeyForWorld(prev, character.worldID, toCharacterKey(character)),
      );
      switchToCharacterProfile(character);
    },
    [switchToCharacterProfile],
  );

  const toggleChampionCharacter = useCallback((character: StoredCharacterRecord) => {
    const key = toCharacterKey(character);
    const worldId = character.worldID;
    setChampionCharacterKeysByWorld((prev) => {
      const cur = getChampionKeysForWorld(prev, worldId);
      if (cur.includes(key)) return setChampionKeysForWorld(prev, worldId, cur.filter((k) => k !== key));
      if (cur.length >= MAX_CHAMPIONS) return prev;
      return setChampionKeysForWorld(prev, worldId, [...cur, key]);
    });
  }, []);

  const toggleCharacterDirectory = useCallback(() => {
    if (immediateUiLockRef.current) return;
    if (!showCharacterDirectory) {
      immediateUiLockRef.current = true;
      setFastDirectoryRevealOnce(false);
      setIsSwitchingToDirectory(true);
      setSetupStepDirection("forward");
      transitions.queueTransitionTimer(() => {
        setShowFlowOverview(true);
        setShowCharacterDirectory(true);
      }, CHARACTERS_TRANSITION_MS.fast);
      transitions.queueTransitionTimer(() => {
        setIsSwitchingToDirectory(false);
        immediateUiLockRef.current = false;
      }, CHARACTERS_TRANSITION_MS.searchFadeIn);
      return;
    }
    setSetupStepDirection("backward");
    setIsSwitchingToDirectory(false);
    setFastDirectoryRevealOnce(false);
    setShowFlowOverview(false);
    setShowCharacterDirectory(false);
  }, [showCharacterDirectory, transitions]);

  const removeCurrentCharacter = useCallback(() => {
    if (!confirmedCharacter) return;
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;

    const removedCharacter = confirmedCharacter;
    const removedKey = toCharacterKey(removedCharacter);
    const removedWorldId = removedCharacter.worldID;
    const remainingRoster = characterRoster.filter(
      (entry) => toCharacterKey(entry) !== removedKey,
    );

    // Clean up world-scoped champion keys
    const nextChampionKeysByWorld = { ...championCharacterKeysByWorld };
    const worldChampKeys = getChampionKeysForWorld(championCharacterKeysByWorld, removedWorldId);
    const remainingWorldChampKeys = worldChampKeys.filter((k) => k !== removedKey);
    if (remainingWorldChampKeys.length > 0) {
      nextChampionKeysByWorld[String(removedWorldId)] = remainingWorldChampKeys;
    } else {
      delete nextChampionKeysByWorld[String(removedWorldId)];
    }

    // Clean up world-scoped main key if it was the removed character
    const nextMainKeysByWorld = { ...mainCharacterKeyByWorld };
    if (nextMainKeysByWorld[String(removedWorldId)] === removedKey) {
      delete nextMainKeysByWorld[String(removedWorldId)];
    }

    removeSetupDraftForCharacter(removedCharacter);
    setIsDeleteTransitioning(true);
    setIsSwitchingToDirectory(true);
    setSetupStepDirection("forward");

    transitions.queueTransitionTimer(() => {
      setCharacterRoster(remainingRoster);
      setChampionCharacterKeysByWorld(nextChampionKeysByWorld);
      setMainCharacterKeyByWorld(nextMainKeysByWorld);
      setConfirmedCharacter(null);
      setFoundCharacter(null);
      setQuery("");
      setCanResumeSetup(false);
      setResumeSetupCharacterName(null);
      setIsAddingCharacter(false);
      lookup.resetSearchStateMessage();
      setHasCompletedRequiredSetupEver(remainingRoster.length > 0);
      setSetupMode("search");
      setSetupFlowStarted(true);
      setShowFlowOverview(true);
      setShowCharacterDirectory(true);
      transitions.setSetupPanelVisible(true);
      setSetupStepIndex(0);
      setSetupStepDirection("forward");
      setDeleteNoticeCharacterName(removedCharacter.characterName);
    }, CHARACTERS_TRANSITION_MS.standard);

    transitions.queueTransitionTimer(() => {
      setShowDeleteNotice(true);
    }, CHARACTERS_TRANSITION_MS.standard + 30);

    transitions.queueTransitionTimer(() => {
      setShowDeleteNotice(false);
    }, CHARACTERS_TRANSITION_MS.standard + 30 + CHARACTERS_TRANSITION_MS.deleteNoticeVisible);

    transitions.queueTransitionTimer(() => {
      setDeleteNoticeCharacterName(null);
      setIsDeleteTransitioning(false);
      setIsSwitchingToDirectory(false);
      immediateUiLockRef.current = false;
    }, CHARACTERS_TRANSITION_MS.standard + CHARACTERS_TRANSITION_MS.deleteNoticeTotal);
  }, [
    championCharacterKeysByWorld,
    characterRoster,
    confirmedCharacter,
    mainCharacterKeyByWorld,
    lookup,
    transitions,
  ]);

  const openAddCharacterSearch = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    const draft = readLastSetupDraft();
    const canResumeFromDraft = isResumableDraft(draft);
    transitions.runBackTransition(() => {
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
        canResumeFromDraft
          ? (draft?.confirmedCharacter?.characterName ?? draft?.query ?? null)
          : null,
      );
      lookup.resetSearchStateMessage();
    });
  }, [isResumableDraft, lookup, transitions]);

  const backFromAddCharacter = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsSwitchingToDirectory(true);
    const targetShowFlowOverview = true;
    const targetShowCharacterDirectory = true;
    const targetStepIndex = 0;
    const targetStepDirection: "forward" | "backward" = "backward";

    transitions.runBackTransition(
      () => {
        setFastDirectoryRevealOnce(true);
        setIsAddingCharacter(false);
        setFoundCharacter(null);
        setSetupFlowStarted(true);
        transitions.setSetupPanelVisible(true);
        setShowFlowOverview(targetShowFlowOverview);
        setShowCharacterDirectory(targetShowCharacterDirectory);
        setSetupStepDirection(targetStepDirection);
        setSetupStepIndex(targetStepIndex);
      },
      { enableSearchFadeIn: false },
    );

    transitions.queueTransitionTimer(() => {
      setIsSwitchingToDirectory(false);
    }, CHARACTERS_TRANSITION_MS.slow);

    if (confirmedCharacter && !completedFlowIds.includes(requiredFlowId)) {
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
        setupStepIndex: targetStepIndex,
        setupStepDirection: targetStepDirection,
        setupStepTestByStep,
        confirmedCharacter,
        savedAt: existingDraft?.savedAt ?? 0,
      });
    }
  }, [
    activeFlowId,
    completedFlowIds,
    confirmedCharacter,
    query,
    requiredFlowId,
    setupStepTestByStep,
    transitions,
  ]);

  const handleQueryInput = useCallback((rawValue: string) => {
    const sanitized = rawValue
      .replace(CHARACTER_NAME_INPUT_FILTER_REGEX, "")
      .slice(0, MAX_QUERY_LENGTH);
    setQuery(sanitized);
  }, []);

  const handleSearchSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const duplicateByName = findRosterCharacterByName(characterRoster, lookup.trimmedQuery);
      if (duplicateByName) {
        lookup.setStatusTone("error");
        lookup.setStatusMessage(`${duplicateByName.characterName} is already added.`);
        setFoundCharacter(null);
        return;
      }
      setSetupFlowStarted(false);
      transitions.setSetupPanelVisible(false);
      setConfirmedCharacter(null);
      await lookup.runLookup(lookup.trimmedQuery);
    },
    [characterRoster, lookup, transitions],
  );

  const activeSetupStep = getFlowStepByIndex(activeFlowId, setupStepIndex);
  const activeSetupStepValue = activeSetupStep
    ? setupStepTestByStep[activeSetupStep.id] ?? ""
    : "";
  const currentCharacterKey = confirmedCharacter ? toCharacterKey(confirmedCharacter) : null;
  const isCurrentMainCharacter = Boolean(
    currentCharacterKey && mainCharacterKey && currentCharacterKey === mainCharacterKey,
  );
  const isCurrentChampionCharacter = Boolean(
    currentCharacterKey && championCharacterKeys.includes(currentCharacterKey),
  );
  const canSetCurrentChampion =
    isCurrentChampionCharacter || championCharacterKeys.length < MAX_CHAMPIONS;
  const currentCharacterGender = getCurrentCharacterGender(setupStepTestByStep);

  // Derive sorted world IDs from roster
  const worldIds = Array.from(
    new Set(characterRoster.map((c) => c.worldID)),
  ).sort((a, b) => a - b);

  const state = {
    refreshingKeys,
    query,
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
    mainCharacterKeyByWorld,
    championCharacterKeysByWorld,
    worldIds,
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
    queryInvalid: lookup.queryInvalid,
    isSearching: lookup.isSearching,
    statusMessage: lookup.statusMessage,
    statusTone: lookup.statusTone,
    degradedCode: lookup.degradedCode,
  };

  return {
    state,
    transitions,
    actions: {
      setPreviewImageLoaded,
      setConfirmedImageLoaded,
      updateActiveStepValue: (value: string) => {
        if (!activeSetupStep) return;
        setSetupStepTestByStep((prev) => ({
          ...prev,
          [activeSetupStep.id]: value,
        }));
      },
      setSetupStepWithDirection,
      runBackToIntroTransition,
      runTransitionToMode,
      backFromSetupFlowToAddCharacter,
      backToCharactersDirectory,
      resumeSavedSetup,
      confirmFoundCharacter,
      finishSetupFlow,
      setMainCharacter,
      toggleChampionCharacter,
      switchToCharacterProfile,
      toggleCharacterDirectory,
      removeCurrentCharacter,
      openAddCharacterSearch,
      backFromAddCharacter,
      refreshSingle,
      handleQueryInput,
      handleSearchSubmit,
      startOptionalSetupFlow: (flowId: SetupFlowId) => {
        if (immediateUiLockRef.current) return;
        setActiveFlowId(flowId);
        setSetupStepIndex(1);
        setSetupStepDirection("forward");
        setShowFlowOverview(false);
        setShowCharacterDirectory(false);
      },
    },
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { SetupMode } from "../model/constants";
import type { NormalizedCharacterData } from "../model/types";
import { getRequiredSetupFlowId, type SetupFlowId } from "../setup/flows";
import type { SetupStepInputById } from "../setup/types";

export const CHARACTERS_TRANSITION_MS = {
  fast: 160,
  standard: 220,
  slow: 320,
  searchFadeIn: 260,
  setupPanelRevealDelay: 80,
  deleteNoticeVisible: 1000,
  deleteNoticeTotal: 1500,
} as const;

interface SetupTransitionSetters {
  setSetupMode: (mode: SetupMode) => void;
  setFoundCharacter: (character: NormalizedCharacterData | null) => void;
  setConfirmedCharacter: (character: NormalizedCharacterData | null) => void;
  setSetupFlowStarted: (value: boolean) => void;
  setActiveFlowId: (flowId: SetupFlowId) => void;
  setCompletedFlowIds: (flowIds: SetupFlowId[]) => void;
  setShowFlowOverview: (value: boolean) => void;
  setShowCharacterDirectory: (value: boolean) => void;
  setSetupStepIndex: (value: number) => void;
  setSetupStepDirection: (value: "forward" | "backward") => void;
  setSetupStepTestByStep: (value: SetupStepInputById) => void;
}

interface CommonTransitionCallbacks extends SetupTransitionSetters {
  resetSearchStateMessage: () => void;
}

interface SetupFlowTransitionArgs {
  character: NormalizedCharacterData;
  source: "found-character" | "resume";
  flowId: SetupFlowId;
  completedFlowIds: SetupFlowId[];
  showFlowOverview: boolean;
  showCharacterDirectory: boolean;
  stepIndex: number;
  stepDirection: "forward" | "backward";
  stepData: SetupStepInputById;
}

interface TransitionSequenceOptions {
  type: "mode" | "back" | "confirm";
  beforeCommit?: () => void;
  onCommit: () => void;
  afterCommit?: () => void;
  durationMs?: number;
  enableSearchFadeIn?: boolean;
  suppressLayoutDuring?: boolean;
  restoreLayoutAfterCommit?: boolean;
}

export function useSetupFlowTransitions() {
  const [isConfirmFadeOut, setIsConfirmFadeOut] = useState(false);
  const [confirmTransitionSource, setConfirmTransitionSource] = useState<
    "found-character" | "resume" | null
  >(null);
  const [isModeTransitioning, setIsModeTransitioning] = useState(false);
  const [isBackTransitioning, setIsBackTransitioning] = useState(false);
  const [isSearchFadeIn, setIsSearchFadeIn] = useState(false);
  const [setupPanelVisible, setSetupPanelVisible] = useState(false);
  const [suppressLayoutTransition, setSuppressLayoutTransition] = useState(false);
  const transitionTimersRef = useRef<number[]>([]);

  const queueTransitionTimer = useCallback((callback: () => void, ms: number) => {
    const timer = window.setTimeout(callback, ms);
    transitionTimersRef.current.push(timer);
    return timer;
  }, []);

  const clearTransitionTimers = useCallback(() => {
    for (const timer of transitionTimersRef.current) {
      window.clearTimeout(timer);
    }
    transitionTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearTransitionTimers();
    };
  }, [clearTransitionTimers]);

  const runTransitionSequence = useCallback(
    ({
      type,
      beforeCommit,
      onCommit,
      afterCommit,
      durationMs = CHARACTERS_TRANSITION_MS.standard,
      enableSearchFadeIn = false,
      suppressLayoutDuring = false,
      restoreLayoutAfterCommit = false,
    }: TransitionSequenceOptions) => {
      clearTransitionTimers();
      setIsConfirmFadeOut(type === "confirm");
      if (type !== "confirm") {
        setConfirmTransitionSource(null);
      }
      setIsModeTransitioning(type === "mode");
      setIsBackTransitioning(type === "back");
      setIsSearchFadeIn(false);
      if (type !== "confirm") {
        setSetupPanelVisible(false);
      }
      setSuppressLayoutTransition(suppressLayoutDuring);
      beforeCommit?.();

      queueTransitionTimer(() => {
        onCommit();
        setIsConfirmFadeOut(false);
        setConfirmTransitionSource(null);
        setIsModeTransitioning(false);
        setIsBackTransitioning(false);

        if (enableSearchFadeIn) {
          setIsSearchFadeIn(true);
          queueTransitionTimer(() => {
            setIsSearchFadeIn(false);
          }, CHARACTERS_TRANSITION_MS.searchFadeIn);
        }

        afterCommit?.();

        if (restoreLayoutAfterCommit) {
          queueTransitionTimer(() => {
            setSuppressLayoutTransition(false);
          }, durationMs);
        }
      }, durationMs);
    },
    [clearTransitionTimers, queueTransitionTimer],
  );

  const runBackToIntroTransition = useCallback(
    (
      callbacks: CommonTransitionCallbacks & {
        setLastSetupDraftAutoResume: (value: boolean) => void;
      },
    ) => {
      callbacks.setLastSetupDraftAutoResume(false);
      runTransitionSequence({
        type: "mode",
        enableSearchFadeIn: true,
        onCommit: () => {
          callbacks.setSetupMode("intro");
          callbacks.setFoundCharacter(null);
          callbacks.setConfirmedCharacter(null);
          callbacks.setSetupFlowStarted(false);
          callbacks.setActiveFlowId(getRequiredSetupFlowId());
          callbacks.setCompletedFlowIds([]);
          callbacks.setShowFlowOverview(false);
          callbacks.setShowCharacterDirectory(false);
          setSetupPanelVisible(false);
          callbacks.setSetupStepIndex(0);
          callbacks.setSetupStepTestByStep({});
          callbacks.resetSearchStateMessage();
        },
      });
    },
    [runTransitionSequence],
  );

  const runTransitionToMode = useCallback(
    (nextMode: SetupMode, callbacks: CommonTransitionCallbacks) => {
      runTransitionSequence({
        type: "mode",
        enableSearchFadeIn: true,
        onCommit: () => {
          callbacks.setSetupMode(nextMode);
          callbacks.setFoundCharacter(null);
          callbacks.setConfirmedCharacter(null);
          callbacks.setSetupFlowStarted(false);
          callbacks.setActiveFlowId(getRequiredSetupFlowId());
          callbacks.setCompletedFlowIds([]);
          callbacks.setShowFlowOverview(false);
          callbacks.setShowCharacterDirectory(false);
          setSetupPanelVisible(false);
          callbacks.setSetupStepIndex(0);
          callbacks.setSetupStepTestByStep({});
          if (nextMode === "search") {
            callbacks.resetSearchStateMessage();
          }
        },
      });
    },
    [runTransitionSequence],
  );

  const beginSetupFlowTransition = useCallback(
    (args: SetupFlowTransitionArgs, setters: SetupTransitionSetters) => {
      runTransitionSequence({
        type: "confirm",
        suppressLayoutDuring: true,
        restoreLayoutAfterCommit: true,
        beforeCommit: () => {
          setConfirmTransitionSource(args.source);
          setters.setConfirmedCharacter(args.character);
          setters.setActiveFlowId(args.flowId);
          setters.setCompletedFlowIds(args.completedFlowIds);
          setters.setShowFlowOverview(args.showFlowOverview);
          setters.setShowCharacterDirectory(args.showCharacterDirectory);
          setters.setSetupStepDirection(args.stepDirection);
          setters.setSetupStepIndex(args.stepIndex);
          setters.setSetupStepTestByStep(args.stepData);
          setSetupPanelVisible(false);
        },
        onCommit: () => {
          setters.setFoundCharacter(null);
          setters.setSetupFlowStarted(true);
        },
        afterCommit: () => {
          queueTransitionTimer(() => {
            setSetupPanelVisible(true);
          }, CHARACTERS_TRANSITION_MS.setupPanelRevealDelay);
        },
      });
    },
    [queueTransitionTimer, runTransitionSequence],
  );

  const runBackTransition = useCallback(
    (
      onMidTransition: () => void,
      options?: {
        enableSearchFadeIn?: boolean;
      },
    ) => {
      runTransitionSequence({
        type: "back",
        enableSearchFadeIn: options?.enableSearchFadeIn ?? true,
        onCommit: onMidTransition,
      });
    },
    [runTransitionSequence],
  );

  return {
    isConfirmFadeOut,
    confirmTransitionSource,
    isModeTransitioning,
    isBackTransitioning,
    isSearchFadeIn,
    setupPanelVisible,
    suppressLayoutTransition,
    setSetupPanelVisible,
    setSuppressLayoutTransition,
    clearTransitionTimers,
    queueTransitionTimer,
    runBackToIntroTransition,
    runTransitionToMode,
    beginSetupFlowTransition,
    runBackTransition,
  };
}

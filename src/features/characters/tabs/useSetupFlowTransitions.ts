import { useCallback, useEffect, useRef, useState } from "react";
import type { NormalizedCharacterData } from "../model/types";
import type { SetupStepInputById } from "../setup/types";
import { clampSetupStepIndex } from "../setup/steps";
import type { SetupMode } from "../model/constants";

interface SetupTransitionSetters {
  setSetupMode: (mode: SetupMode) => void;
  setFoundCharacter: (character: NormalizedCharacterData | null) => void;
  setConfirmedCharacter: (character: NormalizedCharacterData | null) => void;
  setSetupFlowStarted: (value: boolean) => void;
  setSetupStepIndex: (value: number) => void;
  setSetupStepDirection: (value: "forward" | "backward") => void;
  setSetupStepTestByStep: (value: SetupStepInputById) => void;
}

interface CommonTransitionCallbacks extends SetupTransitionSetters {
  resetSearchStateMessage: () => void;
}

interface SetupFlowTransitionArgs {
  character: NormalizedCharacterData;
  stepIndex: number;
  stepDirection: "forward" | "backward";
  stepData: SetupStepInputById;
}

export function useSetupFlowTransitions() {
  const [isConfirmFadeOut, setIsConfirmFadeOut] = useState(false);
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

  const runBackToSearchTransition = useCallback(
    (
      callbacks: CommonTransitionCallbacks & {
        setLastSetupDraftAutoResume: (value: boolean) => void;
      },
    ) => {
      setIsBackTransitioning(true);
      setSuppressLayoutTransition(false);
      setSetupPanelVisible(false);
      callbacks.setLastSetupDraftAutoResume(false);
      queueTransitionTimer(() => {
        callbacks.setSetupFlowStarted(false);
        callbacks.setFoundCharacter(null);
        callbacks.setConfirmedCharacter(null);
        callbacks.setSetupStepIndex(0);
        callbacks.setSetupStepTestByStep({});
        callbacks.resetSearchStateMessage();
        setIsBackTransitioning(false);
        setIsSearchFadeIn(true);
        queueTransitionTimer(() => {
          setIsSearchFadeIn(false);
        }, 260);
      }, 230);
    },
    [queueTransitionTimer],
  );

  const runBackToIntroTransition = useCallback(
    (
      callbacks: CommonTransitionCallbacks & {
        setLastSetupDraftAutoResume: (value: boolean) => void;
      },
    ) => {
      setIsModeTransitioning(true);
      setSuppressLayoutTransition(false);
      callbacks.setLastSetupDraftAutoResume(false);
      queueTransitionTimer(() => {
        callbacks.setSetupMode("intro");
        callbacks.setFoundCharacter(null);
        callbacks.setConfirmedCharacter(null);
        callbacks.setSetupFlowStarted(false);
        setSetupPanelVisible(false);
        callbacks.setSetupStepIndex(0);
        callbacks.setSetupStepTestByStep({});
        callbacks.resetSearchStateMessage();
        setIsModeTransitioning(false);
        setIsSearchFadeIn(true);
        queueTransitionTimer(() => {
          setIsSearchFadeIn(false);
        }, 260);
      }, 220);
    },
    [queueTransitionTimer],
  );

  const runTransitionToMode = useCallback(
    (nextMode: SetupMode, callbacks: CommonTransitionCallbacks) => {
      setIsModeTransitioning(true);
      setSuppressLayoutTransition(false);
      queueTransitionTimer(() => {
        callbacks.setSetupMode(nextMode);
        callbacks.setFoundCharacter(null);
        callbacks.setConfirmedCharacter(null);
        callbacks.setSetupFlowStarted(false);
        setSetupPanelVisible(false);
        callbacks.setSetupStepIndex(0);
        callbacks.setSetupStepTestByStep({});
        if (nextMode === "search") {
          callbacks.resetSearchStateMessage();
        }
        setIsModeTransitioning(false);
        setIsSearchFadeIn(true);
        queueTransitionTimer(() => {
          setIsSearchFadeIn(false);
        }, 260);
      }, 220);
    },
    [queueTransitionTimer],
  );

  const beginSetupFlowTransition = useCallback(
    (args: SetupFlowTransitionArgs, setters: SetupTransitionSetters) => {
      clearTransitionTimers();
      setIsSearchFadeIn(false);
      setIsModeTransitioning(false);
      setIsBackTransitioning(false);
      setSuppressLayoutTransition(true);
      setSetupPanelVisible(false);
      setters.setConfirmedCharacter(args.character);
      setters.setSetupStepDirection(args.stepDirection);
      setters.setSetupStepIndex(clampSetupStepIndex(args.stepIndex));
      setters.setSetupStepTestByStep(args.stepData);
      setIsConfirmFadeOut(true);

      queueTransitionTimer(() => {
        setters.setFoundCharacter(null);
        setters.setSetupFlowStarted(true);
        setIsConfirmFadeOut(false);
      }, 240);

      queueTransitionTimer(() => {
        setSetupPanelVisible(true);
      }, 620);

      queueTransitionTimer(() => {
        setSuppressLayoutTransition(false);
      }, 820);
    },
    [clearTransitionTimers, queueTransitionTimer],
  );

  return {
    isConfirmFadeOut,
    isModeTransitioning,
    isBackTransitioning,
    isSearchFadeIn,
    setupPanelVisible,
    suppressLayoutTransition,
    setSetupPanelVisible,
    setSuppressLayoutTransition,
    clearTransitionTimers,
    queueTransitionTimer,
    runBackToSearchTransition,
    runBackToIntroTransition,
    runTransitionToMode,
    beginSetupFlowTransition,
  };
}

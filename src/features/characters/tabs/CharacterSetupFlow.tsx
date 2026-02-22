"use client";

/*
  Character setup flow (search + confirmation + onboarding steps).
  Keeps setup progress recoverable across refreshes with a local draft.
*/
import { useEffect, useRef, useState } from "react";
import type { AppTheme } from "../../../components/themes";
import type { NormalizedCharacterData } from "../model/types";
import {
  CHARACTER_NAME_INPUT_FILTER_REGEX,
  MAX_QUERY_LENGTH,
  type SetupMode,
} from "../model/constants";
import {
  clearLastSetupDraft,
  makeDraftCharacterKey,
  readLastSetupDraft,
  readSetupDraftByCharacter,
  removeSetupDraftForCharacter,
  setLastSetupDraftAutoResume,
  type SetupDraft,
  writeSetupDraft,
} from "../model/setupDraftStorage";
import { clampSetupStepIndex, getSetupStepByIndex } from "../setup/steps";
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

export default function CharacterSetupFlow({ theme }: CharacterSetupFlowProps) {
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
  const [setupStepIndex, setSetupStepIndex] = useState(0);
  const [setupStepDirection, setSetupStepDirection] = useState<"forward" | "backward">("forward");
  const [setupStepTestByStep, setSetupStepTestByStep] = useState<SetupStepInputById>({});
  const [canResumeSetup, setCanResumeSetup] = useState(false);
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
    runBackToSearchTransition: runBackToSearchTransitionAction,
    runBackToIntroTransition: runBackToIntroTransitionAction,
    runTransitionToMode: runTransitionToModeAction,
    beginSetupFlowTransition: beginSetupFlowTransitionAction,
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
    const hydrateTimer = window.setTimeout(() => {
      if (draft) {
        setCanResumeSetup(true);
        setQuery(draft.query);
        if (draft.autoResumeOnLoad) {
          setSetupMode(draft.setupMode);
          setConfirmedCharacter(draft.confirmedCharacter);
          setSuppressLayoutTransition(draft.setupFlowStarted);
          setSetupFlowStarted(draft.setupFlowStarted);
          setSetupPanelVisible(false);
          setSetupStepIndex(draft.setupStepIndex);
          setSetupStepDirection(draft.setupStepDirection);
          setSetupStepTestByStep(draft.setupStepTestByStep ?? {});
          if (draft.setupFlowStarted) {
            queueTransitionTimer(() => {
              setSetupPanelVisible(true);
            }, 80);
            queueTransitionTimer(() => {
              setSuppressLayoutTransition(false);
            }, 280);
          }
        }
      } else {
        setCanResumeSetup(false);
      }
      hasHydratedSetupDraftRef.current = true;
      setIsDraftHydrated(true);
    }, 0);
    return () => clearTimeout(hydrateTimer);
  }, [queueTransitionTimer, setSetupPanelVisible, setSuppressLayoutTransition]);

  useEffect(() => {
    if (!hasHydratedSetupDraftRef.current) return;
    if (typeof window === "undefined") return;
    if (!confirmedCharacter) return;
    if (!setupFlowStarted && setupStepIndex === 0) return;

    const characterKey = makeDraftCharacterKey(confirmedCharacter);
    const draft: SetupDraft = {
      version: 1,
      characterKey,
      query,
      setupMode,
      setupFlowStarted,
      autoResumeOnLoad: setupFlowStarted,
      setupStepIndex: clampSetupStepIndex(setupStepIndex),
      setupStepDirection,
      setupStepTestByStep,
      confirmedCharacter,
      savedAt: Date.now(),
    };

    writeSetupDraft(draft);
    const resumeStateTimer = window.setTimeout(() => {
      setCanResumeSetup(true);
    }, 0);
    return () => clearTimeout(resumeStateTimer);
  }, [
    query,
    setupMode,
    setupFlowStarted,
    setupStepIndex,
    setupStepDirection,
    setupStepTestByStep,
    confirmedCharacter,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [setupMode, setupFlowStarted, setupStepIndex]);

  const runBackToSearchTransition = () => {
    runBackToSearchTransitionAction({
      setLastSetupDraftAutoResume,
      resetSearchStateMessage,
      setSetupMode,
      setFoundCharacter,
      setConfirmedCharacter,
      setSetupFlowStarted,
      setSetupStepIndex,
      setSetupStepDirection,
      setSetupStepTestByStep,
    });
  };

  const runBackToIntroTransition = () => {
    runBackToIntroTransitionAction({
      setLastSetupDraftAutoResume,
      resetSearchStateMessage,
      setSetupMode,
      setFoundCharacter,
      setConfirmedCharacter,
      setSetupFlowStarted,
      setSetupStepIndex,
      setSetupStepDirection,
      setSetupStepTestByStep,
    });
  };

  const runTransitionToMode = (nextMode: SetupMode) => {
    runTransitionToModeAction(nextMode, {
      resetSearchStateMessage,
      setSetupMode,
      setFoundCharacter,
      setConfirmedCharacter,
      setSetupFlowStarted,
      setSetupStepIndex,
      setSetupStepDirection,
      setSetupStepTestByStep,
    });
  };

  const setSetupStepWithDirection = (nextStep: number) => {
    const boundedStep = clampSetupStepIndex(nextStep);
    if (boundedStep === setupStepIndex) return;
    setSetupStepDirection(boundedStep > setupStepIndex ? "forward" : "backward");
    setSetupStepIndex(boundedStep);
  };

  const beginSetupFlowTransition = (args: {
    character: NormalizedCharacterData;
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
      setSetupStepIndex,
      setSetupStepDirection,
      setSetupStepTestByStep,
    });
  };

  const clearSetupDraft = () => {
    if (confirmedCharacter) {
      removeSetupDraftForCharacter(confirmedCharacter);
    } else {
      clearLastSetupDraft();
    }
    setCanResumeSetup(false);
    setSetupStepTestByStep({});
  };

  const resumeSavedSetup = () => {
    const draft = readLastSetupDraft();
    if (!draft) {
      setCanResumeSetup(false);
      return;
    }
    setCanResumeSetup(true);
    setQuery(draft.query);
    setSetupMode("search");
    if (draft.confirmedCharacter) {
      beginSetupFlowTransition({
        character: draft.confirmedCharacter,
        stepIndex: clampSetupStepIndex(draft.setupStepIndex),
        stepDirection: draft.setupStepDirection,
        stepData: draft.setupStepTestByStep ?? {},
        source: "resume",
      });
    }
    writeSetupDraft({
      ...draft,
      setupFlowStarted: true,
      autoResumeOnLoad: true,
      savedAt: Date.now(),
    });
  };

  const activeSetupStep = getSetupStepByIndex(setupStepIndex);
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
    if (!foundCharacter) return;
    const existingCharacterDraft = readSetupDraftByCharacter(foundCharacter);
    beginSetupFlowTransition({
      character: foundCharacter,
      stepIndex: existingCharacterDraft
        ? clampSetupStepIndex(existingCharacterDraft.setupStepIndex)
        : 0,
      stepDirection: existingCharacterDraft
        ? existingCharacterDraft.setupStepDirection
        : "forward",
      stepData: existingCharacterDraft?.setupStepTestByStep ?? {},
      source: "confirm",
    });
  };

  const finishSetupFlow = () => {
    clearSetupDraft();
    setStatusTone("neutral");
    setStatusMessage(LOOKUP_MESSAGES.setupSaved);
    setSetupFlowStarted(false);
    setSetupPanelVisible(false);
    setSetupStepIndex(0);
  };

  const handleQueryInput = (rawValue: string) => {
    const sanitized = rawValue
      .replace(CHARACTER_NAME_INPUT_FILTER_REGEX, "")
      .slice(0, MAX_QUERY_LENGTH);
    setQuery(sanitized);
  };

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="search-pane">
            <SearchPaneCard
              theme={theme}
              isDraftHydrated={isDraftHydrated}
              isConfirmFadeOut={isConfirmFadeOut}
              isModeTransitioning={isModeTransitioning}
              isSearchFadeIn={isSearchFadeIn}
              setupMode={setupMode}
              setupFlowStarted={setupFlowStarted}
              canResumeSetup={canResumeSetup}
              query={query}
              queryInvalid={queryInvalid}
              isSearching={isSearching}
              statusMessage={statusMessage}
              statusTone={statusTone}
              confirmedCharacter={confirmedCharacter}
              confirmedImageLoaded={confirmedImageLoaded}
              isBackTransitioning={isBackTransitioning}
              onRunTransitionToMode={runTransitionToMode}
              onRunBackToIntroTransition={runBackToIntroTransition}
              onRunBackToSearchTransition={runBackToSearchTransition}
              onResumeSavedSetup={resumeSavedSetup}
              onSearchSubmit={handleSearchSubmit}
              onQueryChange={handleQueryInput}
              onConfirmedImageLoaded={() => setConfirmedImageLoaded(true)}
            />
          </div>

          <PreviewSetupPane
            theme={theme}
            foundCharacter={foundCharacter}
            previewCardReady={previewCardReady}
            previewContentReady={previewContentReady}
            previewImageLoaded={previewImageLoaded}
            isConfirmFadeOut={isConfirmFadeOut}
            setupFlowStarted={setupFlowStarted}
            setupPanelVisible={setupPanelVisible}
            isBackTransitioning={isBackTransitioning}
            setupStepIndex={setupStepIndex}
            setupStepDirection={setupStepDirection}
            activeSetupStepValue={activeSetupStepValue}
            onSetPreviewImageLoaded={setPreviewImageLoaded}
            onConfirmFoundCharacter={confirmFoundCharacter}
            onSetSetupStepWithDirection={setSetupStepWithDirection}
            onStepValueChange={updateActiveStepValue}
            onFinishSetupFlow={finishSetupFlow}
          />
        </div>
      </main>
    </>
  );
}

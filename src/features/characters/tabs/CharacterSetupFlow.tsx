"use client";

/*
  Character setup flow (search + confirmation + onboarding steps).
  Keeps setup progress recoverable across refreshes with a local draft.
*/
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import type { LookupResponse, NormalizedCharacterData } from "../model/types";
import StepRenderer from "../setup/StepRenderer";
import { clampSetupStepIndex, getSetupStepByIndex } from "../setup/steps";
import type { SetupStepInputById } from "../setup/types";

const MIN_QUERY_LENGTH = 4;
const MAX_QUERY_LENGTH = 12;
const CHARACTER_NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9]{4,12}$/;
const CHARACTER_NAME_INPUT_FILTER_REGEX = /[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]/g;
const LOOKUP_RESPONSE_SCHEMA_VERSION = "v1";
const COOLDOWN_MS = 5000;
const LOOKUP_REQUEST_TIMEOUT_MS = 25000;
const LOOKUP_SLOW_NOTICE_MS = 12000;
const CHARACTER_CACHE_STORAGE_KEY = `mapledoro_character_cache_${LOOKUP_RESPONSE_SCHEMA_VERSION}`;
const SETUP_DRAFT_STORAGE_PREFIX = `mapledoro_character_setup_draft_${LOOKUP_RESPONSE_SCHEMA_VERSION}:`;
const SETUP_DRAFT_LAST_KEY = `mapledoro_character_setup_draft_last_${LOOKUP_RESPONSE_SCHEMA_VERSION}`;
const MAX_BROWSER_CACHE_ENTRIES = 100;
const WORLD_NAMES: Record<number, string> = {
  1: "Bera",
  19: "Scania",
  30: "Luna",
  45: "Kronos",
  46: "Solis",
  70: "Hyperion",
};
type SetupMode = "intro" | "search" | "import";

interface CacheEntry {
  characterName: string;
  found: boolean;
  expiresAt: number;
  savedAt: number;
  data: NormalizedCharacterData | null;
}

interface SetupDraft {
  version: 1;
  characterKey: string;
  query: string;
  setupMode: SetupMode;
  setupFlowStarted: boolean;
  autoResumeOnLoad: boolean;
  setupStepIndex: number;
  setupStepDirection: "forward" | "backward";
  setupStepTestByStep: SetupStepInputById;
  confirmedCharacter: NormalizedCharacterData | null;
  savedAt: number;
}

interface CharacterSetupFlowProps {
  theme: AppTheme;
}

function normalizeCharacterName(value: string) {
  return value.trim().toLowerCase();
}

function makeDraftCharacterKey(character: NormalizedCharacterData) {
  return `${character.worldID}:${normalizeCharacterName(character.characterName)}`;
}

function parseSetupDraft(raw: string): SetupDraft | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SetupDraft>;
    if (parsed.version !== 1) return null;
    if (!parsed.confirmedCharacter) return null;
    if (typeof parsed.query !== "string") return null;
    if (typeof parsed.characterKey !== "string" || !parsed.characterKey.trim()) return null;
    return {
      version: 1,
      characterKey: parsed.characterKey,
      query: parsed.query,
      setupMode: parsed.setupMode === "search" || parsed.setupMode === "import" ? parsed.setupMode : "search",
      setupFlowStarted: Boolean(parsed.setupFlowStarted),
      autoResumeOnLoad: parsed.autoResumeOnLoad !== false,
      setupStepIndex: clampSetupStepIndex(Number(parsed.setupStepIndex ?? 0)),
      setupStepDirection: parsed.setupStepDirection === "backward" ? "backward" : "forward",
      setupStepTestByStep:
        parsed.setupStepTestByStep && typeof parsed.setupStepTestByStep === "object"
          ? (parsed.setupStepTestByStep as SetupStepInputById)
          : {},
      confirmedCharacter: parsed.confirmedCharacter,
      savedAt: Number(parsed.savedAt ?? Date.now()),
    };
  } catch {
    return null;
  }
}

function getSetupDraftStorageKey(characterKey: string) {
  return `${SETUP_DRAFT_STORAGE_PREFIX}${characterKey}`;
}

function readSetupDraftByCharacter(character: NormalizedCharacterData): SetupDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getSetupDraftStorageKey(makeDraftCharacterKey(character)));
  if (!raw) return null;
  return parseSetupDraft(raw);
}

function readLastSetupDraft(): SetupDraft | null {
  if (typeof window === "undefined") return null;
  const draftKey = window.localStorage.getItem(SETUP_DRAFT_LAST_KEY);
  if (!draftKey) return null;
  const raw = window.localStorage.getItem(getSetupDraftStorageKey(draftKey));
  if (!raw) return null;
  return parseSetupDraft(raw);
}

function writeSetupDraft(draft: SetupDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getSetupDraftStorageKey(draft.characterKey), JSON.stringify(draft));
    window.localStorage.setItem(SETUP_DRAFT_LAST_KEY, draft.characterKey);
  } catch {
    // Ignore localStorage write failures.
  }
}

function setLastSetupDraftAutoResume(value: boolean) {
  const draft = readLastSetupDraft();
  if (!draft) return;
  writeSetupDraft({
    ...draft,
    setupFlowStarted: value ? draft.setupFlowStarted : false,
    autoResumeOnLoad: value,
    savedAt: Date.now(),
  });
}

function removeSetupDraftForCharacter(character: NormalizedCharacterData) {
  if (typeof window === "undefined") return;
  try {
    const characterKey = makeDraftCharacterKey(character);
    window.localStorage.removeItem(getSetupDraftStorageKey(characterKey));
    const lastKey = window.localStorage.getItem(SETUP_DRAFT_LAST_KEY);
    if (lastKey === characterKey) {
      window.localStorage.removeItem(SETUP_DRAFT_LAST_KEY);
    }
  } catch {
    return null;
  }
}

export default function CharacterSetupFlow({ theme }: CharacterSetupFlowProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [foundCharacter, setFoundCharacter] = useState<NormalizedCharacterData | null>(
    null,
  );
  const [previewCardReady, setPreviewCardReady] = useState(false);
  const [previewContentReady, setPreviewContentReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    `Use 4-12 characters (letters/numbers only).`,
  );
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");
  const [setupMode, setSetupMode] = useState<SetupMode>("intro");
  const [confirmedCharacter, setConfirmedCharacter] =
    useState<NormalizedCharacterData | null>(null);
  const [previewImageLoaded, setPreviewImageLoaded] = useState(false);
  const [confirmedImageLoaded, setConfirmedImageLoaded] = useState(false);
  const [isConfirmFadeOut, setIsConfirmFadeOut] = useState(false);
  const [isModeTransitioning, setIsModeTransitioning] = useState(false);
  const [isBackTransitioning, setIsBackTransitioning] = useState(false);
  const [isSearchFadeIn, setIsSearchFadeIn] = useState(false);
  const [setupFlowStarted, setSetupFlowStarted] = useState(false);
  const [setupPanelVisible, setSetupPanelVisible] = useState(false);
  const [setupStepIndex, setSetupStepIndex] = useState(0);
  const [setupStepDirection, setSetupStepDirection] = useState<"forward" | "backward">("forward");
  const [setupStepTestByStep, setSetupStepTestByStep] = useState<SetupStepInputById>({});
  const [suppressLayoutTransition, setSuppressLayoutTransition] = useState(false);
  const [canResumeSetup, setCanResumeSetup] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const lastRequestAtRef = useRef(0);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [nowMs, setNowMs] = useState(Date.now());
  const transitionTimersRef = useRef<number[]>([]);
  const hasHydratedSetupDraftRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of transitionTimersRef.current) {
        window.clearTimeout(timer);
      }
      transitionTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!foundCharacter) {
      setPreviewCardReady(false);
      setPreviewContentReady(false);
      setPreviewImageLoaded(false);
      return;
    }
    setPreviewImageLoaded(false);
    const cardTimer = setTimeout(() => setPreviewCardReady(true), 320);
    const contentTimer = setTimeout(() => setPreviewContentReady(true), 440);
    return () => {
      clearTimeout(cardTimer);
      clearTimeout(contentTimer);
    };
  }, [foundCharacter]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHARACTER_CACHE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
      cacheRef.current = new Map(Object.entries(parsed));
    } catch {
      // Ignore malformed local cache and continue.
    }
  }, []);

  useEffect(() => {
    setConfirmedImageLoaded(false);
  }, [confirmedCharacter]);

  useEffect(() => {
    const draft = readLastSetupDraft();
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
          const panelTimer = window.setTimeout(() => {
            setSetupPanelVisible(true);
          }, 80);
          const releaseTimer = window.setTimeout(() => {
            setSuppressLayoutTransition(false);
          }, 280);
          transitionTimersRef.current.push(panelTimer, releaseTimer);
        }
      }
    } else {
      setCanResumeSetup(false);
    }
    hasHydratedSetupDraftRef.current = true;
    setIsDraftHydrated(true);
  }, []);

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
    setCanResumeSetup(true);
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

  const cooldownRemainingMs = Math.max(0, COOLDOWN_MS - (nowMs - lastRequestAtRef.current));
  const trimmedQuery = query.trim();
  const queryInvalid = !CHARACTER_NAME_REGEX.test(trimmedQuery);

  const persistCache = () => {
    const validEntries = [...cacheRef.current.entries()].filter(([, value]) => {
      return value.expiresAt > Date.now();
    });
    validEntries.sort((a, b) => b[1].savedAt - a[1].savedAt);
    const limitedEntries = validEntries.slice(0, MAX_BROWSER_CACHE_ENTRIES);
    cacheRef.current = new Map(limitedEntries);
    window.localStorage.setItem(
      CHARACTER_CACHE_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(cacheRef.current)),
    );
  };

  const resetSearchStateMessage = () => {
    setStatusTone("neutral");
    setStatusMessage(`Use ${MIN_QUERY_LENGTH}-${MAX_QUERY_LENGTH} characters (letters/numbers only).`);
  };

  const runBackToSearchTransition = () => {
    setIsBackTransitioning(true);
    setSuppressLayoutTransition(false);
    setSetupPanelVisible(false);
    setLastSetupDraftAutoResume(false);
    const backTimer = window.setTimeout(() => {
      setSetupFlowStarted(false);
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setSetupStepIndex(0);
      setSetupStepTestByStep({});
      resetSearchStateMessage();
      setIsBackTransitioning(false);
      setIsSearchFadeIn(true);
      const fadeInTimer = window.setTimeout(() => {
        setIsSearchFadeIn(false);
      }, 260);
      transitionTimersRef.current.push(fadeInTimer);
    }, 230);
    transitionTimersRef.current.push(backTimer);
  };

  const runBackToIntroTransition = () => {
    setIsModeTransitioning(true);
    setSuppressLayoutTransition(false);
    setLastSetupDraftAutoResume(false);
    const backTimer = window.setTimeout(() => {
      setSetupMode("intro");
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setSetupFlowStarted(false);
      setSetupPanelVisible(false);
      setSetupStepIndex(0);
      setSetupStepTestByStep({});
      resetSearchStateMessage();
      setIsModeTransitioning(false);
      setIsSearchFadeIn(true);
      const fadeInTimer = window.setTimeout(() => {
        setIsSearchFadeIn(false);
      }, 260);
      transitionTimersRef.current.push(fadeInTimer);
    }, 220);
    transitionTimersRef.current.push(backTimer);
  };

  const runTransitionToMode = (nextMode: SetupMode) => {
    setIsModeTransitioning(true);
    setSuppressLayoutTransition(false);
    const modeTimer = window.setTimeout(() => {
      setSetupMode(nextMode);
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setSetupFlowStarted(false);
      setSetupPanelVisible(false);
      setSetupStepIndex(0);
      setSetupStepTestByStep({});
      if (nextMode === "search") {
        resetSearchStateMessage();
      }
      setIsModeTransitioning(false);
      setIsSearchFadeIn(true);
      const fadeInTimer = window.setTimeout(() => {
        setIsSearchFadeIn(false);
      }, 260);
      transitionTimersRef.current.push(fadeInTimer);
    }, 220);
    transitionTimersRef.current.push(modeTimer);
  };

  const setSetupStepWithDirection = (nextStep: number) => {
    const boundedStep = clampSetupStepIndex(nextStep);
    if (boundedStep === setupStepIndex) return;
    setSetupStepDirection(boundedStep > setupStepIndex ? "forward" : "backward");
    setSetupStepIndex(boundedStep);
  };

  const clearTransitionTimers = () => {
    for (const timer of transitionTimersRef.current) {
      window.clearTimeout(timer);
    }
    transitionTimersRef.current = [];
  };

  const beginSetupFlowTransition = (args: {
    character: NormalizedCharacterData;
    stepIndex: number;
    stepDirection: "forward" | "backward";
    stepData: SetupStepInputById;
    source?: "confirm" | "resume";
  }) => {
    clearTransitionTimers();
    setIsSearchFadeIn(false);
    setIsModeTransitioning(false);
    setIsBackTransitioning(false);
    setSuppressLayoutTransition(true);
    setSetupPanelVisible(false);
    setConfirmedCharacter(args.character);
    setSetupStepDirection(args.stepDirection);
    setSetupStepIndex(clampSetupStepIndex(args.stepIndex));
    setSetupStepTestByStep(args.stepData);
    setIsConfirmFadeOut(true);

    const fadeTimer = window.setTimeout(() => {
      setFoundCharacter(null);
      setSetupFlowStarted(true);
      setIsConfirmFadeOut(false);
    }, 240);

    const panelTimer = window.setTimeout(() => {
      setSetupPanelVisible(true);
    }, 620);

    const releaseTimer = window.setTimeout(() => {
      setSuppressLayoutTransition(false);
    }, 820);

    transitionTimersRef.current.push(fadeTimer, panelTimer, releaseTimer);
  };

  const clearSetupDraft = () => {
    if (confirmedCharacter) {
      removeSetupDraftForCharacter(confirmedCharacter);
    } else if (typeof window !== "undefined") {
      const lastKey = window.localStorage.getItem(SETUP_DRAFT_LAST_KEY);
      if (lastKey) {
        window.localStorage.removeItem(getSetupDraftStorageKey(lastKey));
      }
      window.localStorage.removeItem(SETUP_DRAFT_LAST_KEY);
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

  return (
    <>
      <style>{`
        .character-search-panel { transition: background 0.35s ease, border-color 0.35s ease; }

        .characters-main {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
          width: 100%;
          padding: 1rem 1.5rem 2rem 2.75rem;
        }

        .characters-search-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.65rem;
        }

        .characters-content {
          width: 100%;
          max-width: 1100px;
          display: flex;
          gap: 1rem;
          align-items: start;
        }

        .characters-content.suppress-layout .search-pane,
        .characters-content.suppress-layout .preview-pane {
          transition: none !important;
        }

        .search-pane {
          flex: 1 1 auto;
          min-width: 0;
          transition: flex-basis 0.35s ease;
        }

        .search-card {
          width: 100%;
          transition: opacity 0.22s ease, transform 0.22s ease;
        }

        .search-card.confirm-fade {
          opacity: 0;
          transform: translateY(8px);
        }

        .search-card.search-fade-in {
          animation: searchCardFadeIn 0.26s ease;
        }

        .preview-card {
          transition: opacity 0.22s ease, transform 0.22s ease;
        }

        .preview-card.confirm-fade {
          opacity: 0;
          transform: translateY(8px);
        }

        .image-skeleton-wrap {
          position: relative;
          overflow: hidden;
          background: ${theme.border};
        }

        .confirmed-avatar-wrap {
          overflow: hidden;
          flex: 0 0 auto;
        }

        .confirmed-avatar-wrap {
          overflow: hidden;
          flex: 0 0 auto;
        }

        .image-skeleton-wrap::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 20%,
            rgba(255, 255, 255, 0.38) 42%,
            transparent 64%
          );
          transform: translateX(-120%);
          animation: imageShimmer 1.2s ease-in-out infinite;
        }

        .image-fade-in {
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .image-fade-in.image-loaded {
          opacity: 1;
        }

        .preview-pane {
          flex: 0 0 0;
          max-width: 0;
          overflow: hidden;
          align-self: stretch;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(8px);
          transition:
            flex-basis 0.35s ease,
            max-width 0.35s ease,
            opacity 0.2s ease 0.12s,
            transform 0.2s ease 0.12s;
        }

        .characters-content.has-preview .search-pane {
          flex-basis: calc(100% - 360px);
        }

        .characters-content.setup-active .search-pane {
          flex: 0 0 340px;
          max-width: 340px;
        }

        .characters-content.has-preview .preview-pane {
          flex-basis: 360px;
          max-width: 360px;
          overflow: visible;
          opacity: 1;
          transform: translateY(0);
        }

        .characters-content.setup-active .preview-pane {
          flex: 1 1 auto;
          max-width: calc(100% - 356px);
          overflow: visible;
          opacity: 1;
          transform: translateY(0);
        }

        .preview-pane > .character-search-panel {
          width: 100%;
        }

        .preview-content {
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .preview-char-swap {
          animation: previewSwap 0.24s ease;
        }

        .preview-confirm-fade {
          opacity: 0 !important;
          transform: translateY(8px) !important;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .setup-panel {
          opacity: 0;
          transform: translateY(8px);
          transition: opacity 0.25s ease, transform 0.25s ease;
        }

        .setup-panel.setup-panel-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .setup-panel.setup-panel-fade {
          opacity: 0 !important;
          transform: translateY(8px) !important;
        }

        .setup-step-content {
          animation-duration: 0.24s;
          animation-timing-function: ease;
          animation-fill-mode: both;
        }

        .setup-step-content.step-forward {
          animation-name: setupStepSlideForward;
        }

        .setup-step-content.step-backward {
          animation-name: setupStepSlideBackward;
        }

        @keyframes previewSwap {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes imageShimmer {
          100% { transform: translateX(120%); }
        }

        @keyframes searchCardFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes setupStepSlideForward {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes setupStepSlideBackward {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @media (max-width: 860px) {
          .characters-main {
            padding: 1rem;
            align-items: flex-start;
            justify-content: flex-start;
          }

          .characters-search-row {
            grid-template-columns: 1fr;
          }

          .characters-content {
            flex-direction: column;
            width: 100%;
            max-width: 640px;
            margin: 0 auto;
            gap: 0.85rem;
            align-items: center;
          }

          .search-pane,
          .preview-pane {
            width: 100%;
            display: flex;
            justify-content: center;
          }

          .search-card,
          .preview-pane > .character-search-panel {
            width: min(100%, 560px);
            margin: 0 auto;
          }

          .characters-content.setup-active .search-pane,
          .characters-content.setup-active .preview-pane {
            flex: 0 0 auto;
            max-width: 100%;
            width: 100%;
          }

          .characters-content.setup-active .preview-pane {
            order: 2;
          }

          .characters-content.setup-active .search-pane {
            order: 1;
          }

          .characters-content.setup-active .preview-pane > .character-search-panel {
            width: min(100%, 640px);
            margin: 0 auto;
            padding: 1.15rem !important;
          }

          .characters-content.setup-active .search-card {
            width: min(100%, 170px);
            margin: 0 auto;
            padding: 0.55rem !important;
          }

          .confirmed-summary-card {
            min-height: 0 !important;
            max-width: 152px !important;
            gap: 0.1rem !important;
          }

          .confirmed-summary-card .confirmed-avatar-wrap {
            width: 64px !important;
            height: 64px !important;
            border-radius: 8px !important;
          }

          .confirmed-summary-card .confirmed-avatar-wrap img {
            width: 100% !important;
            height: 100% !important;
            border-radius: 8px !important;
            object-fit: cover !important;
          }

          .confirmed-summary-card button {
            font-size: 0.74rem !important;
            padding: 0.32rem 0.52rem !important;
          }

          .confirmed-summary-card p:first-of-type {
            font-size: 0.9rem !important;
          }

          .confirmed-summary-card p:nth-of-type(2),
          .confirmed-summary-card p:nth-of-type(3) {
            font-size: 0.72rem !important;
            line-height: 1.2 !important;
          }

          .preview-pane,
          .characters-content.has-preview .preview-pane {
            flex-basis: auto;
            max-width: 100%;
            width: 100%;
            align-self: auto;
          }

          .characters-content.has-preview .search-pane {
            flex-basis: auto;
          }

          .search-card {
            padding: 1.1rem !important;
          }
        }
      `}</style>

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
            <section
              className={[
                "character-search-panel",
                "search-card",
                isConfirmFadeOut || isModeTransitioning ? "confirm-fade" : "",
                !isConfirmFadeOut && !isModeTransitioning && isSearchFadeIn
                  ? "search-fade-in"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
                visibility: isDraftHydrated ? "visible" : "hidden",
              }}
            >
              {setupMode === "intro" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <h1
                      style={{
                        fontFamily: "'Fredoka One', cursive",
                        fontSize: "1.8rem",
                        lineHeight: 1.15,
                        margin: 0,
                        marginBottom: "0.45rem",
                      }}
                    >
                      First-Time Setup
                    </h1>
                    <p style={{ color: theme.muted, fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
                      Choose how you want to get started.
                    </p>
                  </div>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        runTransitionToMode("import");
                      }}
                      style={{
                        border: "none",
                        borderRadius: "12px",
                        background: theme.accent,
                        color: "#fff",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        padding: "0.9rem 1rem",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      Import Character
                    </button>
                    <button
                      type="button"
                      onClick={() => runTransitionToMode("search")}
                      style={{
                        border: `1px solid ${theme.border}`,
                        borderRadius: "12px",
                        background: theme.bg,
                        color: theme.text,
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        padding: "0.9rem 1rem",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      Search Character
                    </button>
                  </div>
                </>
              )}

              {setupMode === "import" && (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <h1
                      style={{
                        fontFamily: "'Fredoka One', cursive",
                        fontSize: "1.8rem",
                        lineHeight: 1.15,
                        margin: 0,
                        marginBottom: "0.45rem",
                      }}
                    >
                      Import Character
                    </h1>
                    <p style={{ color: theme.muted, fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
                      Import flow is coming next. You can use search for now.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button
                      type="button"
                      onClick={() => runBackToIntroTransition()}
                      style={{
                        border: `1px solid ${theme.border}`,
                        borderRadius: "10px",
                        background: theme.bg,
                        color: theme.text,
                        fontFamily: "inherit",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        padding: "0.65rem 0.9rem",
                        cursor: "pointer",
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => runTransitionToMode("search")}
                      style={{
                        border: "none",
                        borderRadius: "10px",
                        background: theme.accent,
                        color: "#fff",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        padding: "0.65rem 0.9rem",
                        cursor: "pointer",
                      }}
                    >
                      Go To Search
                    </button>
                  </div>
                </>
              )}

              {setupMode === "search" && !setupFlowStarted && (
                <>
                  <div
                    style={{
                      marginBottom: "0.75rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <h1
                        style={{
                          fontFamily: "'Fredoka One', cursive",
                          fontSize: "1.8rem",
                          lineHeight: 1.15,
                          margin: 0,
                          marginBottom: "0.45rem",
                        }}
                      >
                        Add Your Maple Character
                      </h1>
                      <p style={{ color: theme.muted, fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
                        Type your IGN to setup your profile.
                      </p>
                      {canResumeSetup && (
                        <button
                          type="button"
                          onClick={resumeSavedSetup}
                          style={{
                            marginTop: "0.45rem",
                            border: `1px solid ${theme.border}`,
                            borderRadius: "10px",
                            background: theme.bg,
                            color: theme.text,
                            fontFamily: "inherit",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            padding: "0.4rem 0.65rem",
                            cursor: "pointer",
                          }}
                        >
                          Resume Setup
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (setupFlowStarted) {
                          runBackToSearchTransition();
                          return;
                        }
                        runBackToIntroTransition();
                      }}
                      style={{
                        border: `1px solid ${theme.border}`,
                        borderRadius: "10px",
                        background: theme.bg,
                        color: theme.text,
                        fontFamily: "inherit",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        padding: "0.5rem 0.75rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Back
                    </button>
                  </div>

                  <form
                    onSubmit={async (e) => {
                  e.preventDefault();
                  setSetupFlowStarted(false);
                  setSetupPanelVisible(false);
                  setIsConfirmFadeOut(false);
                  setConfirmedCharacter(null);
                  const name = trimmedQuery;
                  const normalized = name.toLowerCase();
                  if (!CHARACTER_NAME_REGEX.test(name)) {
                    setStatusTone("error");
                    setStatusMessage(
                      `Invalid IGN. Use ${MIN_QUERY_LENGTH}-${MAX_QUERY_LENGTH} characters (letters/numbers only).`,
                    );
                    return;
                  }

                  const cached = cacheRef.current.get(normalized);
                  if (cached && Date.now() < cached.expiresAt) {
                    setFoundCharacter(cached.found && cached.data ? cached.data : null);
                    setStatusTone(cached.found ? "neutral" : "error");
                    setStatusMessage(cached.found ? "Character found." : "Character not found.");
                    return;
                  }
                  if (cached && Date.now() >= cached.expiresAt) {
                    cacheRef.current.delete(normalized);
                    persistCache();
                  }

                  if (cooldownRemainingMs > 0) {
                    setStatusTone("error");
                    setStatusMessage(
                      `Please wait ${Math.ceil(cooldownRemainingMs / 1000)}s before searching again.`,
                    );
                    return;
                  }
                  if (isSearching) return;

                  setIsSearching(true);
                  setStatusTone("neutral");
                  setStatusMessage("Searching...");
                  lastRequestAtRef.current = Date.now();
                  const controller = new AbortController();
                  const slowTimer = setTimeout(() => {
                    setStatusTone("neutral");
                    setStatusMessage("Still searching... high traffic may cause delays.");
                  }, LOOKUP_SLOW_NOTICE_MS);
                  const timeoutTimer = setTimeout(() => controller.abort(), LOOKUP_REQUEST_TIMEOUT_MS);

                  try {
                    const response = await fetch(
                      `/api/characters/lookup?character_name=${encodeURIComponent(name)}&schema_version=${LOOKUP_RESPONSE_SCHEMA_VERSION}`,
                      { cache: "no-store", signal: controller.signal },
                    );
                    clearTimeout(slowTimer);
                    clearTimeout(timeoutTimer);
                    if (!response.ok) {
                      const errorPayload = (await response.json().catch(() => null)) as
                        | { error?: string }
                        | null;
                      throw new Error(errorPayload?.error ?? `Lookup failed with status ${response.status}`);
                    }
                    const result = (await response.json()) as LookupResponse;
                    const found = result.found;
                    const resolvedName = found ? result.data.characterName : result.characterName || name;
                    cacheRef.current.set(normalized, {
                      characterName: resolvedName,
                      found: result.found,
                      expiresAt: result.expiresAt,
                      savedAt: Date.now(),
                      data: result.found ? result.data : null,
                    });
                    persistCache();
                    const queueSuffix =
                      result.queuedMs > 0 ? ` Queue waited ~${Math.ceil(result.queuedMs / 1000)}s.` : "";
                    if (found) {
                      setStatusTone("neutral");
                      setFoundCharacter(result.data);
                      setStatusMessage(`Character found.${queueSuffix}`);
                    } else {
                      setStatusTone("error");
                      setFoundCharacter(null);
                      setStatusMessage(`Character not found.${queueSuffix}`);
                    }
                  } catch (error) {
                    clearTimeout(slowTimer);
                    clearTimeout(timeoutTimer);
                    setStatusTone("error");
                    setFoundCharacter(null);
                    if (error instanceof Error && error.name === "AbortError") {
                      setStatusMessage("Search timed out. Please retry in a few seconds.");
                      return;
                    }
                    setStatusMessage(
                      error instanceof Error ? error.message : "Search failed. Please try again.",
                    );
                  } finally {
                    setIsSearching(false);
                  }
                }}
                className="characters-search-row"
                  >
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        const sanitized = e.target.value
                          .replace(CHARACTER_NAME_INPUT_FILTER_REGEX, "")
                          .slice(0, MAX_QUERY_LENGTH);
                        setQuery(sanitized);
                      }}
                      placeholder="In-Game Name"
                      maxLength={MAX_QUERY_LENGTH}
                      style={{
                        width: "100%",
                        border: `1px solid ${theme.border}`,
                        borderRadius: "12px",
                        background: theme.bg,
                        color: theme.text,
                        fontFamily: "inherit",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        padding: "0.8rem 0.9rem",
                        outline: "none",
                      }}
                    />
                    <button
                      type="submit"
                      disabled={isSearching || queryInvalid}
                      style={{
                        border: "none",
                        borderRadius: "12px",
                        background: isSearching || queryInvalid ? theme.muted : theme.accent,
                        color: "#fff",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        padding: "0.75rem 1rem",
                        cursor: isSearching || queryInvalid ? "not-allowed" : "pointer",
                      }}
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </form>

                  <div
                    style={{
                      marginTop: "0.75rem",
                      border: `1px solid ${theme.border}`,
                      background: theme.bg,
                      borderRadius: "14px",
                      padding: "0.8rem 0.95rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: statusTone === "error" ? "#dc2626" : theme.muted,
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      {statusMessage}
                    </p>
                  </div>
                </>
              )}
              {setupMode === "search" && setupFlowStarted && confirmedCharacter && (
                <div
                  className={[
                    "confirmed-summary-card",
                    isBackTransitioning ? "preview-confirm-fade" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    minHeight: "320px",
                    maxWidth: "300px",
                    margin: "0 auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    gap: "0.35rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      runBackToSearchTransition();
                    }}
                    style={{
                      alignSelf: "flex-end",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "10px",
                      background: theme.bg,
                      color: theme.text,
                      fontFamily: "inherit",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      padding: "0.5rem 0.75rem",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Back
                  </button>
                  <div
                    className={`confirmed-avatar-wrap ${!confirmedImageLoaded ? "image-skeleton-wrap" : ""}`}
                    style={{
                      width: "210px",
                      height: "210px",
                      borderRadius: "22px",
                    }}
                  >
                      <Image
                        src={confirmedCharacter.characterImgURL}
                        alt={`${confirmedCharacter.characterName} avatar`}
                        width={210}
                        height={210}
                        onLoad={() => setConfirmedImageLoaded(true)}
                        className={`image-fade-in ${confirmedImageLoaded ? "image-loaded" : ""}`}
                        style={{
                          borderRadius: "22px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "1.32rem",
                      fontWeight: 800,
                      lineHeight: 1.15,
                      color: theme.text,
                    }}
                  >
                    {confirmedCharacter.characterName}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.95rem",
                      color: theme.muted,
                      fontWeight: 700,
                      lineHeight: 1.3,
                    }}
                  >
                    {WORLD_NAMES[confirmedCharacter.worldID] ?? `ID ${confirmedCharacter.worldID}`}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "1rem",
                      color: theme.muted,
                      fontWeight: 700,
                      lineHeight: 1.3,
                    }}
                  >
                    Level {confirmedCharacter.level}
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="preview-pane">
            {foundCharacter && previewCardReady && !setupFlowStarted && (
              <aside
                className={`character-search-panel preview-card ${isConfirmFadeOut ? "confirm-fade" : ""}`}
                style={{
                  background: theme.panel,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "20px",
                  padding: "1rem",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  className={`preview-content ${isConfirmFadeOut ? "preview-confirm-fade" : ""}`}
                  style={{
                    opacity: previewContentReady ? 1 : 0,
                    transform: previewContentReady ? "translateY(0)" : "translateY(6px)",
                  }}
                >
                  <div
                    key={`${foundCharacter.characterName}:${foundCharacter.fetchedAt}`}
                    className="preview-char-swap"
                    style={{
                      display: "flex",
                      gap: "0.65rem",
                      alignItems: "center",
                      marginBottom: "0.6rem",
                    }}
                  >
                    <div
                      className={!previewImageLoaded ? "image-skeleton-wrap" : undefined}
                      style={{
                        width: "72px",
                        height: "72px",
                        borderRadius: "12px",
                      }}
                    >
                      <Image
                        src={foundCharacter.characterImgURL}
                        alt={`${foundCharacter.characterName} avatar`}
                        width={72}
                        height={72}
                        onLoad={() => setPreviewImageLoaded(true)}
                        className={`image-fade-in ${previewImageLoaded ? "image-loaded" : ""}`}
                        style={{
                          borderRadius: "12px",
                          display: "block",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "1rem",
                          fontWeight: 800,
                          lineHeight: 1.1,
                          margin: 0,
                          marginBottom: "0.16rem",
                        }}
                      >
                        {foundCharacter.characterName}
                      </p>
                      <p
                        style={{
                          fontSize: "0.82rem",
                          color: theme.muted,
                          fontWeight: 700,
                          lineHeight: 1.2,
                          margin: 0,
                        }}
                      >
                        {WORLD_NAMES[foundCharacter.worldID] ?? `ID ${foundCharacter.worldID}`}
                      </p>
                      <p
                        style={{
                          fontSize: "0.82rem",
                          color: theme.muted,
                          fontWeight: 700,
                          lineHeight: 1.2,
                          margin: 0,
                          marginTop: "0.08rem",
                        }}
                      >
                        Level {foundCharacter.level} · {foundCharacter.jobName}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      borderTop: `1px solid ${theme.border}`,
                      paddingTop: "0.65rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.86rem",
                        color: theme.text,
                        fontWeight: 700,
                        margin: 0,
                        marginBottom: "0.72rem",
                      }}
                    >
                      Is this the character you want to add?
                    </p>
                    <button
                      type="button"
                      onClick={() => {
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
                      }}
                      style={{
                        border: "none",
                        borderRadius: "10px",
                        background: theme.accent,
                        color: "#fff",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        padding: "0.7rem 0.9rem",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </aside>
            )}
            {setupFlowStarted && (
              <aside
                className={`character-search-panel setup-panel ${setupPanelVisible ? "setup-panel-visible" : ""} ${isBackTransitioning ? "setup-panel-fade" : ""}`}
                style={{
                  position: "relative",
                  background: theme.panel,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "20px",
                  padding: "1rem",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
                }}
              >
                {setupStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setSetupStepWithDirection(setupStepIndex + 1)}
                    style={{
                      position: "absolute",
                      top: "0.8rem",
                      right: "0.8rem",
                      border: `1px solid ${theme.border}`,
                      borderRadius: "10px",
                      background: theme.bg,
                      color: theme.muted,
                      fontFamily: "inherit",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      padding: "0.4rem 0.65rem",
                      cursor: "pointer",
                    }}
                  >
                    Skip
                  </button>
                )}
                <div
                  key={`setup-step-${setupStepIndex}`}
                  className={`setup-step-content ${setupStepDirection === "forward" ? "step-forward" : "step-backward"}`}
                >
                  {setupStepIndex === 0 ? (
                    <>
                      <h2
                        style={{
                          margin: 0,
                          marginBottom: "0.45rem",
                          fontFamily: "'Fredoka One', cursive",
                          fontSize: "1.3rem",
                          lineHeight: 1.2,
                          color: theme.text,
                        }}
                      >
                        Let&apos;s go through the first setup
                      </h2>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.9rem",
                          color: theme.muted,
                          fontWeight: 700,
                          marginBottom: "0.9rem",
                        }}
                      >
                        Next, we&apos;ll walk through your initial profile setup step by step.
                      </p>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setSetupStepWithDirection(1)}
                          style={{
                            border: "none",
                            borderRadius: "10px",
                            background: theme.accent,
                            color: "#fff",
                            fontFamily: "inherit",
                            fontWeight: 800,
                            fontSize: "0.88rem",
                            padding: "0.55rem 0.9rem",
                            cursor: "pointer",
                          }}
                        >
                          Next Step
                        </button>
                      </div>
                    </>
                  ) : (
                    <StepRenderer
                      theme={theme}
                      stepIndex={setupStepIndex}
                      stepValue={activeSetupStepValue}
                      onStepValueChange={updateActiveStepValue}
                      onBackStep={() => setSetupStepWithDirection(setupStepIndex - 1)}
                      onNextStep={() => setSetupStepWithDirection(setupStepIndex + 1)}
                      onFinish={() => {
                        clearSetupDraft();
                        setStatusTone("neutral");
                        setStatusMessage("Setup progress saved. You can continue editing anytime.");
                        setSetupFlowStarted(false);
                        setSetupPanelVisible(false);
                        setSetupStepIndex(0);
                      }}
                    />
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

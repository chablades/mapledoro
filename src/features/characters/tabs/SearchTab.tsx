"use client";

/*
  Search tab for character lookup + preview confirmation.
  Move lookup UX/UI changes here instead of app/characters/page.tsx.
*/
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import type { LookupResponse, NormalizedCharacterData } from "../model/types";

const MIN_QUERY_LENGTH = 4;
const MAX_QUERY_LENGTH = 12;
const CHARACTER_NAME_REGEX = /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9]{4,12}$/;
const CHARACTER_NAME_INPUT_FILTER_REGEX = /[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]/g;
const LOOKUP_RESPONSE_SCHEMA_VERSION = "v1";
const COOLDOWN_MS = 5000;
const LOOKUP_REQUEST_TIMEOUT_MS = 25000;
const LOOKUP_SLOW_NOTICE_MS = 12000;
const CHARACTER_CACHE_STORAGE_KEY = `mapledoro_character_cache_${LOOKUP_RESPONSE_SCHEMA_VERSION}`;
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

interface SearchTabProps {
  theme: AppTheme;
}

export default function SearchTab({ theme }: SearchTabProps) {
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
  const lastRequestAtRef = useRef(0);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [nowMs, setNowMs] = useState(Date.now());
  const transitionTimersRef = useRef<number[]>([]);

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
    setSetupPanelVisible(false);
    const backTimer = window.setTimeout(() => {
      setSetupFlowStarted(false);
      setFoundCharacter(null);
      setConfirmedCharacter(null);
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
    const backTimer = window.setTimeout(() => {
      setSetupMode("intro");
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setSetupFlowStarted(false);
      setSetupPanelVisible(false);
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
    const modeTimer = window.setTimeout(() => {
      setSetupMode(nextMode);
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setSetupFlowStarted(false);
      setSetupPanelVisible(false);
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

        @media (max-width: 860px) {
          .characters-main {
            padding: 1rem;
            align-items: center;
            justify-content: center;
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
            foundCharacter && !setupFlowStarted ? "has-preview" : "",
            setupFlowStarted ? "setup-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="search-pane">
            <section
              className={`character-search-panel search-card ${isConfirmFadeOut || isModeTransitioning ? "confirm-fade" : ""} ${isSearchFadeIn ? "search-fade-in" : ""}`}
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
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
                      Import Character
                    </button>
                    <button
                      type="button"
                      onClick={() => runTransitionToMode("search")}
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
                  className={isBackTransitioning ? "preview-confirm-fade" : undefined}
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
                    className={!confirmedImageLoaded ? "image-skeleton-wrap" : undefined}
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
                        setConfirmedCharacter(foundCharacter);
                        setIsConfirmFadeOut(true);
                        const fadeTimer = window.setTimeout(() => {
                          setFoundCharacter(null);
                          setSetupFlowStarted(true);
                          setIsConfirmFadeOut(false);
                        }, 240);
                        const panelTimer = window.setTimeout(() => {
                          setSetupPanelVisible(true);
                        }, 620);
                        transitionTimersRef.current.push(fadeTimer, panelTimer);
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
                  background: theme.panel,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "20px",
                  padding: "1rem",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
                }}
              >
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
                  }}
                >
                  Next, we&apos;ll walk through your initial profile setup step by step.
                </p>
              </aside>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

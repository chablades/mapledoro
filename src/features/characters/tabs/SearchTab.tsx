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
const COOLDOWN_MS = 5000;
const LOOKUP_REQUEST_TIMEOUT_MS = 25000;
const LOOKUP_SLOW_NOTICE_MS = 12000;
const CHARACTER_CACHE_STORAGE_KEY = "mapledoro_character_cache_v1";
const MAX_BROWSER_CACHE_ENTRIES = 100;
const WORLD_NAMES: Record<number, string> = {
  1: "Bera",
  19: "Scania",
  30: "Luna",
  45: "Kronos",
  46: "Solis",
  70: "Hyperion",
};

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
    `Enter at least ${MIN_QUERY_LENGTH} characters to search.`,
  );
  const [statusTone, setStatusTone] = useState<"neutral" | "error">("neutral");
  const lastRequestAtRef = useRef(0);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!foundCharacter) {
      setPreviewCardReady(false);
      setPreviewContentReady(false);
      return;
    }
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

  const cooldownRemainingMs = Math.max(0, COOLDOWN_MS - (nowMs - lastRequestAtRef.current));
  const trimmedQuery = query.trim();
  const queryTooShort = trimmedQuery.length < MIN_QUERY_LENGTH;

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

  return (
    <>
      <style>{`
        .character-search-panel { transition: background 0.35s ease, border-color 0.35s ease; }

        .characters-main {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          width: 100%;
          padding: 2rem 1.5rem;
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
          gap: 1.5rem;
          align-items: center;
          justify-content: center;
        }

        .search-pane {
          flex: 1 1 auto;
          min-width: 0;
          transition: flex-basis 0.35s ease;
        }

        .search-card {
          width: 100%;
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

        .characters-content.has-preview .preview-pane {
          flex-basis: 360px;
          max-width: 360px;
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

        @keyframes previewSwap {
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
        <div className={`characters-content ${foundCharacter ? "has-preview" : ""}`}>
          <div className="search-pane">
            <section
              className="character-search-panel search-card"
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
              }}
            >
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
                  Add Your Maple Character
                </h1>
                <p style={{ color: theme.muted, fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>
                  Type your IGN to setup your profile.
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const name = trimmedQuery;
                  const normalized = name.toLowerCase();
                  if (name.length < MIN_QUERY_LENGTH) {
                    setStatusTone("error");
                    setStatusMessage(
                      `Character name must be at least ${MIN_QUERY_LENGTH} characters.`,
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
                      `/api/characters/lookup?character_name=${encodeURIComponent(name)}`,
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="In-Game Name"
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
                  disabled={isSearching || queryTooShort}
                  style={{
                    border: "none",
                    borderRadius: "12px",
                    background: isSearching || queryTooShort ? theme.muted : theme.accent,
                    color: "#fff",
                    fontFamily: "inherit",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    padding: "0.75rem 1rem",
                    cursor: isSearching || queryTooShort ? "not-allowed" : "pointer",
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
            </section>
          </div>

          <div className="preview-pane">
            {foundCharacter && previewCardReady && (
              <aside
                className="character-search-panel"
                style={{
                  background: theme.panel,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "20px",
                  padding: "1rem",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  className="preview-content"
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
                    <Image
                      src={foundCharacter.characterImgURL}
                      alt={`${foundCharacter.characterName} avatar`}
                      width={72}
                      height={72}
                      style={{
                        borderRadius: "12px",
                        display: "block",
                        objectFit: "cover",
                      }}
                    />
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
                        setStatusTone("neutral");
                        setStatusMessage("Character confirmed. Ready for next step.");
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
          </div>
        </div>
      </main>
    </>
  );
}

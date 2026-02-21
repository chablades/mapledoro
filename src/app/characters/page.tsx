"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Theme {
  name: string;
  emoji: string;
  bg: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  sidebar: string;
  sidebarAccent: string;
}

const themes: Record<string, Theme> = {
  default: {
    name: "Default",
    emoji: "🍁",
    bg: "#faf8f5",
    panel: "#ffffff",
    border: "#ede8e0",
    text: "#1c1814",
    muted: "#8a7f75",
    accent: "#d4622a",
    accentSoft: "#fdf0ea",
    accentText: "#c45520",
    sidebar: "#fff9f5",
    sidebarAccent: "#d4622a",
  },
  henesys: {
    name: "Henesys",
    emoji: "🌿",
    bg: "#f2faf2",
    panel: "#ffffff",
    border: "#cce8cc",
    text: "#162816",
    muted: "#507050",
    accent: "#2d8a2d",
    accentSoft: "#e8f5e8",
    accentText: "#1e6e1e",
    sidebar: "#f0faf0",
    sidebarAccent: "#2d8a2d",
  },
  kerning: {
    name: "Kerning City",
    emoji: "🌆",
    bg: "#0e0e18",
    panel: "#16162a",
    border: "#252540",
    text: "#e8e6f8",
    muted: "#7875a0",
    accent: "#7c6aff",
    accentSoft: "#1c1a38",
    accentText: "#a090ff",
    sidebar: "#121228",
    sidebarAccent: "#7c6aff",
  },
  sleepywood: {
    name: "Sleepywood",
    emoji: "🌑",
    bg: "#100e0c",
    panel: "#1a1612",
    border: "#2a2218",
    text: "#e8ddd0",
    muted: "#806a54",
    accent: "#c47c2a",
    accentSoft: "#281c0c",
    accentText: "#e89a40",
    sidebar: "#161210",
    sidebarAccent: "#c47c2a",
  },
  ellinia: {
    name: "Ellinia",
    emoji: "✨",
    bg: "#0a1020",
    panel: "#101828",
    border: "#182840",
    text: "#d0e8ff",
    muted: "#5880aa",
    accent: "#4ab8ff",
    accentSoft: "#0c1e38",
    accentText: "#7accff",
    sidebar: "#0c1422",
    sidebarAccent: "#4ab8ff",
  },
  mushroomshrine: {
    name: "Mushroom Shrine",
    emoji: "🍄",
    bg: "#fdf5f0",
    panel: "#ffffff",
    border: "#f0ddd0",
    text: "#2a1810",
    muted: "#a07060",
    accent: "#e05a5a",
    accentSoft: "#fff0f0",
    accentText: "#c04040",
    sidebar: "#fff8f5",
    sidebarAccent: "#e05a5a",
  },
  yuki: {
    name: "Yuki",
    emoji: "🐰",
    bg: "#faf8f9",
    panel: "#ffffff",
    border: "#eedde6",
    text: "#2a1e24",
    muted: "#a88898",
    accent: "#d4607a",
    accentSoft: "#fceef2",
    accentText: "#b84060",
    sidebar: "#fdf5f8",
    sidebarAccent: "#d4607a",
  },
};

const navLinks = [
  { label: "Dashboard", href: "/" },
  { label: "Characters", href: "/characters" },
  { label: "Tools", href: "#" },
  { label: "Community", href: "#" },
];

const MIN_QUERY_LENGTH = 4;
const COOLDOWN_MS = 5000;
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

interface NormalizedCharacterData {
  characterID: number;
  characterName: string;
  worldID: number;
  level: number;
  exp: number;
  jobName: string;
  characterImgURL: string;
  isSearchTarget: boolean;
  startRank: number;
  overallRank: number;
  overallGap: number;
  legionRank: number;
  legionGap: number;
  legionLevel: number;
  raidPower: number;
  tierID: number;
  score: number;
  fetchedAt: number;
  expiresAt: number;
}

interface CacheEntry {
  characterName: string;
  found: boolean;
  expiresAt: number;
  savedAt: number;
  data: NormalizedCharacterData | null;
}

interface LookupFoundResponse {
  found: true;
  data: NormalizedCharacterData;
  expiresAt: number;
  fromCache: boolean;
  queuedMs: number;
  source: "redis_cache" | "memory_cache" | "nexon_upstream";
}

interface LookupNotFoundResponse {
  found: false;
  characterName: string;
  data: null;
  expiresAt: number;
  fromCache: boolean;
  queuedMs: number;
  source: "redis_cache" | "memory_cache" | "nexon_upstream";
}

type LookupResponse = LookupFoundResponse | LookupNotFoundResponse;

export default function CharacterSearchPage() {
  const currentPath = "/characters";
  const [themeKey, setThemeKey] = useState("default");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
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
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestAtRef = useRef(0);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const t = themes[themeKey];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = () => setMobileMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [mobileMenuOpen]);

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

  const cooldownRemainingMs = Math.max(
    0,
    COOLDOWN_MS - (now.getTime() - lastRequestAtRef.current),
  );
  const trimmedQuery = query.trim();
  const queryTooShort = trimmedQuery.length < MIN_QUERY_LENGTH;

  const persistCache = () => {
    const validEntries = [...cacheRef.current.entries()].filter(([, value]) => {
      return value.expiresAt > Date.now();
    });

    validEntries.sort((a, b) => b[1].savedAt - a[1].savedAt);
    const limitedEntries = validEntries.slice(0, MAX_BROWSER_CACHE_ENTRIES);
    cacheRef.current = new Map(limitedEntries);

    const asObject = Object.fromEntries(cacheRef.current);
    window.localStorage.setItem(
      CHARACTER_CACHE_STORAGE_KEY,
      JSON.stringify(asObject),
    );
  };

  if (!mounted) return null;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: t.bg,
        color: t.text,
        fontFamily: "'Nunito', sans-serif",
        transition: "all 0.35s ease",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Fredoka+One&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { max-width: 100%; overflow-x: hidden; }

        .fade-in { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .nav-link {
          color: ${t.muted};
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 700;
          transition: color 0.2s;
          display: inline-flex;
          align-items: center;
          min-height: 24px;
        }
        .nav-link:hover { color: ${t.text}; }
        .theme-btn:hover { background: ${t.accentSoft} !important; }

        .panel { transition: background 0.35s ease, border-color 0.35s ease; }

        .characters-main {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 0;
          width: 100%;
          padding: 1.5rem 1.5rem 2rem 2.75rem;
        }

        .characters-search-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0.65rem;
        }

        .mobile-menu-btn {
          display: none;
        }

        .mobile-menu-panel {
          display: none;
        }

        .mobile-utc {
          display: none;
        }

        .page-shell {
          display: flex;
          min-height: calc(100dvh - (56px + env(safe-area-inset-top)));
          padding-top: calc(56px + env(safe-area-inset-top));
          width: 100%;
          overflow-x: clip;
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

        .preview-pane > .panel {
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

        .pop-in {
          animation: popIn 0.3s cubic-bezier(0.22, 0.61, 0.36, 1);
        }

        @keyframes popIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 860px) {
          .desktop-nav-links {
            display: none !important;
          }

          .desktop-utc {
            display: none !important;
          }

          .mobile-utc {
            display: inline-block;
            font-size: 0.72rem;
            font-weight: 800;
            color: ${t.muted};
            font-family: 'Fredoka One', cursive;
            letter-spacing: 0.04em;
            margin-left: auto;
            margin-right: 0.45rem;
            white-space: nowrap;
          }

          .mobile-menu-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .mobile-menu-panel {
            display: block;
            position: fixed !important;
            top: calc(56px + env(safe-area-inset-top)) !important;
            left: 0;
            right: 0;
          }

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
          .preview-pane > .panel {
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

          .theme-sidebar {
            display: none !important;
          }
        }
      `}</style>

      <nav
        className="top-nav"
        style={{
          height: "calc(56px + env(safe-area-inset-top))",
          background: t.panel,
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          padding: "env(safe-area-inset-top) 1.5rem 0 1.5rem",
          gap: "1.5rem",
          position: "fixed",
          left: 0,
          right: 0,
          top: 0,
          zIndex: 50,
          transition: "background 0.35s, border-color 0.35s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: t.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.9rem",
            }}
          >
            <Image
              src="/icons/doro.png"
              alt="MapleDoro logo"
              width={18}
              height={18}
              style={{ display: "block", borderRadius: "4px" }}
            />
          </div>
          <span
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.2rem",
              color: t.accent,
            }}
          >
            MapleDoro
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", gap: "1.25rem" }}>
          <div className="desktop-nav-links" style={{ flex: 1, display: "flex", gap: "1.25rem" }}>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="nav-link"
                aria-current={link.href === currentPath ? "page" : undefined}
                style={
                  link.href === currentPath
                    ? {
                        color: t.accentText,
                        boxShadow: `inset 0 -2px 0 ${t.accent}`,
                      }
                    : undefined
                }
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <span
          className="desktop-utc"
          style={{
            fontSize: "0.78rem",
            fontWeight: 800,
            color: t.muted,
            fontFamily: "'Fredoka One', cursive",
            letterSpacing: "0.05em",
          }}
        >
          {now.toUTCString().slice(17, 25)} UTC
        </span>
        <span className="mobile-utc">{now.toUTCString().slice(17, 25)} UTC</span>
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label="Open menu"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          style={{
            width: "34px",
            height: "34px",
            border: `1px solid ${t.border}`,
            borderRadius: "10px",
            background: t.panel,
            color: t.text,
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 800,
          }}
        >
          ☰
        </button>
      </nav>
      {mobileMenuOpen && (
        <div
          className="mobile-menu-panel"
          style={{
            position: "sticky",
            top: "calc(56px + env(safe-area-inset-top))",
            zIndex: 45,
            background: t.panel,
            borderBottom: `1px solid ${t.border}`,
            padding: "0.75rem 1rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.45rem", marginBottom: "0.75rem" }}>
            {navLinks.map((link) => (
              <a
                key={`m-${link.label}`}
                href={link.href}
                className="nav-link"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: "0.55rem 0.65rem",
                  borderRadius: "8px",
                  border: `1px solid ${link.href === currentPath ? t.accent : t.border}`,
                  background: link.href === currentPath ? t.accentSoft : t.bg,
                  color: link.href === currentPath ? t.accentText : t.muted,
                }}
                aria-current={link.href === currentPath ? "page" : undefined}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div style={{ fontSize: "0.72rem", color: t.muted, fontWeight: 800, marginBottom: "0.45rem" }}>
            Theme
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            {Object.entries(themes).map(([key, th]) => (
              <button
                key={`mobile-theme-${key}`}
                type="button"
                onClick={() => {
                  setThemeKey(key);
                  setMobileMenuOpen(false);
                }}
                style={{
                  border: `1px solid ${themeKey === key ? t.accent : t.border}`,
                  borderRadius: "999px",
                  background: themeKey === key ? t.accentSoft : t.bg,
                  color: themeKey === key ? t.accentText : t.text,
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.3rem 0.55rem",
                }}
              >
                {th.emoji} {th.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="page-shell">
        <div
          className="theme-sidebar"
          onMouseEnter={() => {
            if (leaveTimer.current) clearTimeout(leaveTimer.current);
            setSidebarOpen(true);
          }}
          onMouseLeave={() => {
            leaveTimer.current = setTimeout(() => setSidebarOpen(false), 250);
          }}
          style={{
            position: "fixed",
            left: 0,
            top: "calc(56px + env(safe-area-inset-top))",
            bottom: 0,
            zIndex: 40,
            display: "flex",
          }}
        >
          <div
            style={{
              width: "26px",
              background: t.sidebarAccent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontSize: "0.6rem",
              fontWeight: 800,
              letterSpacing: "0.15em",
              color: "#fff",
              textTransform: "uppercase",
              borderRadius: "0 8px 8px 0",
              cursor: "pointer",
              userSelect: "none",
              transition: "background 0.35s",
            }}
          >
            Themes
          </div>

          <div
            style={{
              width: sidebarOpen ? "195px" : "0",
              overflow: "hidden",
              transition: "width 0.28s ease",
              background: t.sidebar,
              borderRight: sidebarOpen ? `1px solid ${t.border}` : "none",
              boxShadow: sidebarOpen ? "4px 0 20px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <div style={{ width: "195px", padding: "1rem 0.75rem" }}>
              <p
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  color: t.muted,
                  textTransform: "uppercase",
                  marginBottom: "0.75rem",
                  paddingLeft: "4px",
                }}
              >
                Map Theme
              </p>
              {Object.entries(themes).map(([key, th]) => (
                <button
                  key={key}
                  className="theme-btn"
                  onClick={() => setThemeKey(key)}
                  style={{
                    width: "100%",
                    border: "none",
                    cursor: "pointer",
                    background: themeKey === key ? t.accentSoft : "transparent",
                    borderRadius: "10px",
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "2px",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ fontSize: "0.95rem" }}>{th.emoji}</span>
                  <span
                    style={{
                      fontSize: "0.84rem",
                      fontWeight: themeKey === key ? 800 : 500,
                      color: themeKey === key ? t.accentText : t.text,
                    }}
                  >
                    {th.name}
                  </span>
                  {themeKey === key && (
                    <span
                      style={{
                        marginLeft: "auto",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: t.accent,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="characters-main" style={{ flex: 1 }}>
          <div className={`characters-content ${foundCharacter ? "has-preview" : ""}`}>
          <div className="search-pane">
            <section
              className="panel search-card"
              style={{
                background: t.panel,
                border: `1px solid ${t.border}`,
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
                  marginBottom: "0.5rem",
                }}
              >
                Add Your Maple Character
              </h1>
              <p style={{ color: t.muted, fontSize: "0.95rem", fontWeight: 600 }}>
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
                  if (cached.found && cached.data) {
                    setFoundCharacter(cached.data);
                  } else {
                    setFoundCharacter(null);
                  }
                  setStatusTone(cached.found ? "neutral" : "error");
                  setStatusMessage(
                    cached.found
                      ? "Character found."
                      : "Character not found.",
                  );
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

                try {
                  const response = await fetch(
                    `/api/characters/lookup?character_name=${encodeURIComponent(name)}`,
                    { cache: "no-store" },
                  );
                  if (!response.ok) {
                    const errorPayload = (await response.json().catch(() => null)) as
                      | { error?: string }
                      | null;
                    throw new Error(
                      errorPayload?.error ??
                        `Lookup failed with status ${response.status}`,
                    );
                  }
                  const result = (await response.json()) as LookupResponse;
                  const found = result.found;
                  const resolvedName = found
                    ? result.data.characterName
                    : result.characterName || name;

                  cacheRef.current.set(normalized, {
                    characterName: resolvedName,
                    found: result.found,
                    expiresAt: result.expiresAt,
                    savedAt: Date.now(),
                    data: result.found ? result.data : null,
                  });
                  persistCache();
                  const queueSuffix =
                    result.queuedMs > 0
                      ? ` Queue waited ~${Math.ceil(result.queuedMs / 1000)}s.`
                      : "";
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
                  setStatusTone("error");
                  setFoundCharacter(null);
                  setStatusMessage(
                    error instanceof Error
                      ? error.message
                      : "Search failed. Please try again.",
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
                  border: `1px solid ${t.border}`,
                  borderRadius: "12px",
                  background: t.bg,
                  color: t.text,
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
                  background: isSearching || queryTooShort ? t.muted : t.accent,
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
                marginTop: "1rem",
                border: `1px solid ${t.border}`,
                background: t.bg,
                borderRadius: "14px",
                padding: "0.95rem 1rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.9rem",
                  color: statusTone === "error" ? "#dc2626" : t.muted,
                  fontWeight: 700,
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
              className="panel"
              style={{
                background: t.panel,
                border: `1px solid ${t.border}`,
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
                  gap: "0.9rem",
                  alignItems: "center",
                  marginBottom: "0.9rem",
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
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      lineHeight: 1.15,
                      marginBottom: "0.3rem",
                    }}
                  >
                    {foundCharacter.characterName}
                  </p>
                  <p style={{ fontSize: "0.82rem", color: t.muted, fontWeight: 700 }}>
                    {WORLD_NAMES[foundCharacter.worldID] ?? `ID ${foundCharacter.worldID}`}
                  </p>
                  <p style={{ fontSize: "0.82rem", color: t.muted, fontWeight: 700 }}>
                    Level {foundCharacter.level} · {foundCharacter.jobName}
                  </p>
                </div>
              </div>
              <div
                style={{
                  borderTop: `1px solid ${t.border}`,
                  paddingTop: "0.85rem",
                }}
              >
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: t.text,
                    fontWeight: 700,
                    marginBottom: "0.7rem",
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
                    background: t.accent,
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
      </div>
    </div>
  );
}

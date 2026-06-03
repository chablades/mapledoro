"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "../components/AppShell";
import { ItemIcon } from "../components/ResourceImage";
import SunnySundayPanel from "../components/SunnySundayPanel";
import type { AppTheme } from "../components/themes";
import { useClock } from "../lib/useClock";
import {
  readCharactersStore,
  selectCharactersList,
} from "../features/characters/model/charactersStore";
import type { StoredCharacterRecord } from "../features/characters/model/charactersStore";
import { WORLD_NAMES } from "../features/characters/model/constants";
import CharacterChip from "../components/CharacterChip";
import { getUrsusStatus } from "../lib/ursus";

// -- Patch Notes constants ----------------------------------------------------
const PATCH_CACHE_KEY = "mapledoro_patch_notes_v1";
const PATCH_CACHE_TTL_MS = 60 * 60 * 1000;
const PATCH_DISPLAY_LIMIT = 3;
const PATCH_FILTERS = ["All", "MAINTENANCE", "SALE", "UPDATE", "EVENTS", "COMMUNITY"] as const;
type PatchFilter = (typeof PATCH_FILTERS)[number];

type PatchNote = { version: string; date: string; title: string; tags: string[]; url: string };

function readCachedPatchNotes(): PatchNote[] | null {
  try {
    const raw = localStorage.getItem(PATCH_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { expiresAt: number; data: PatchNote[] };
    if (Date.now() < cached.expiresAt && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data;
    }
  } catch { /* ignore */ }
  return null;
}

const initialPatchNotes: PatchNote[] = [
  {
    version: "v266",
    date: "Feb 18",
    title: "V.266 KNOWN ISSUES",
    tags: ["MAINTENANCE"],
    url: "https://www.nexon.com/maplestory/news/maintenance/36146/v-266-known-issues",
  },
  {
    version: "",
    date: "Feb 17",
    title: "[UPDATE FEB 21] CASH SHOP UPDATE FOR FEBRUARY 18",
    tags: ["SALE"],
    url: "https://www.nexon.com/maplestory/news/sale/35891/update-feb-21-cash-shop-update-for-february-18",
  },
  {
    version: "",
    date: "Feb 17",
    title: "ETHEREAL ATELIER: KEYS TO LOVE",
    tags: ["SALE"],
    url: "https://www.nexon.com/maplestory/news/sale/36387/ethereal-atelier-keys-to-love",
  },
];

// -- Time helpers --------------------------------------------------------------
function getNextReset(base: Date, hour: number, dayOfWeek?: number) {
  const next = new Date(base);
  next.setUTCHours(hour, 0, 0, 0);
  if (dayOfWeek !== undefined) {
    const day = base.getUTCDay();
    let diff = dayOfWeek - day;
    if (diff < 0 || (diff === 0 && base >= next)) diff += 7;
    next.setUTCDate(base.getUTCDate() + diff);
  } else {
    if (base >= next) next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

function fmt(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return [h, m, sc].map((n) => String(n).padStart(2, "0")).join(":");
}

const PLACEHOLDER_COUNTDOWN = "--:--:--";
const subscribeFn = () => () => undefined;


// -- Quick Guides data ---------------------------------------------------------
interface QuickGuide {
  title: string;
  desc: string;
  emoji: string;
  href: string;
}

const QUICK_GUIDES: QuickGuide[] = [
  { title: "New Players", desc: "Getting started", emoji: "🌱", href: "/guides/new-players" },
  { title: "Character Guides", desc: "Classes & link skills", emoji: "⚔️", href: "/guides/character-guides" },
];

// -- Quick Tools data ----------------------------------------------------------
type QuickTool = {
  title: string;
  desc: string;
  href: string;
} & ({ iconType: "emoji"; icon: string } | { iconType: "item"; itemId: string });

const QUICK_TOOLS: QuickTool[] = [
  {
    title: "Star Force",
    desc: "Cost calculator",
    icon: "⭐",
    iconType: "emoji",
    href: "/tools/star-force",
  },
  {
    title: "Cubing",
    desc: "Potential rolling odds",
    itemId: "05062028", // Glowing Cube
    iconType: "item",
    href: "/tools/cubing",
  },
  {
    title: "Flaming",
    desc: "Bonus stat calculator",
    itemId: "02048752", // Powerful Rebirth Flame
    iconType: "item",
    href: "/tools/flaming",
  },
  {
    title: "HEXA Skills",
    desc: "Sol Erda planning",
    itemId: "04009613", // Sol Erda Fragment
    iconType: "item",
    href: "/tools/hexa-skills",
  },
  {
    title: "Liberation",
    desc: "Liberation planning",
    itemId: "01332289", // Genesis Dagger
    iconType: "item",
    href: "/tools/liberation",
  },
];

// -- Character tracker quick-launch icons --------------------------------------
interface TrackerLink {
  itemId: string;
  label: string;
  href: (characterName: string) => string;
}

const TRACKER_LINKS: TrackerLink[] = [
  {
    label: "Liberation Tracker",
    itemId: "01332289", // Genesis Dagger
    href: (c) => `/tools/liberation?character=${encodeURIComponent(c)}`,
  },
  {
    label: "Symbol Tracker",
    itemId: "01713000", // Sacred Symbol: Cernium
    href: (c) => `/tools/symbols?character=${encodeURIComponent(c)}`,
  },
  {
    label: "HEXA Skills",
    itemId: "04009613", // Sol Erda Fragment
    href: (c) => `/tools/hexa-skills?character=${encodeURIComponent(c)}`,
  },
];

// -- Components ----------------------------------------------------------------

function HeroBanner({ theme }: { theme: AppTheme }) {
  const bannerStyle: CSSProperties = {
    position: "relative",
    textAlign: "center",
    padding: "2rem 2rem 1.5rem",
    borderRadius: 22,
    overflow: "hidden",
    border: `1px solid ${theme.border}`,
    marginBottom: "1.25rem",
  };
  const glowStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${theme.accentSoft} 0%, transparent 70%)`,
    pointerEvents: "none",
  };
  const headingStyle: CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontSize: "1.75rem",
    color: theme.accent,
    margin: "0 0 0.15rem",
    lineHeight: 1.2,
  };
  const descStyle: CSSProperties = {
    fontSize: "0.82rem",
    color: theme.muted,
    fontWeight: 600,
    maxWidth: 460,
    margin: "0 auto 0.5rem",
    lineHeight: 1.5,
  };

  return (
    <div className="fade-in hero-banner" style={bannerStyle}>
      <div className="hero-glow" style={glowStyle} />
      <div style={{ position: "relative" }}>
        <Image
          src="/icons/doro.png"
          alt=""
          width={52}
          height={52}
          unoptimized
          style={{ marginBottom: "0.5rem" }}
        />
        <h1 style={headingStyle}>MapleDoro</h1>
        <p style={{ fontSize: "0.88rem", fontWeight: 700, color: theme.text, margin: "0 0 0.5rem" }}>
          Your MapleStory Companion
        </p>
        <p style={descStyle}>
          Free, open-source tools for tracking characters, planning progression,
          calculating upgrades, and staying on top of game events.
        </p>
      </div>
    </div>
  );
}

function TrackerIcons({ theme, char }: { theme: AppTheme; char: StoredCharacterRecord }) {
  const iconBtnStyle: CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    lineHeight: 1,
  };

  return (
    <div className="char-row-icons" style={{ display: "flex", gap: 5, flexShrink: 0 }}>
      {TRACKER_LINKS.map((t) => (
        <Link
          key={t.label}
          href={t.href(char.characterName)}
          title={t.label}
          aria-label={`${t.label} for ${char.characterName}`}
          className="char-row-icon-btn"
          style={iconBtnStyle}
        >
          <ItemIcon id={t.itemId} size={25} />
        </Link>
      ))}
    </div>
  );
}

const charRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  padding: "0.6rem 0.75rem",
  borderRadius: "12px",
  transition: "background 0.15s",
};

const charRowLinkStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  flex: 1,
  minWidth: 0,
  textDecoration: "none",
  color: "inherit",
};

function CharacterRow({
  theme,
  char,
}: {
  theme: AppTheme;
  char: StoredCharacterRecord;
}) {
  return (
    <div className="row-hover char-row" style={charRowStyle}>
      <Link href="/characters" style={charRowLinkStyle}>
        <CharacterChip
          theme={theme}
          characterImgURL={char.characterImgURL}
          characterName={char.characterName}
          subtitle={`Lv. ${char.level} ${char.jobName}`}
        />
      </Link>
      <TrackerIcons theme={theme} char={char} />
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 700,
          color: theme.accentText,
          background: theme.accentSoft,
          padding: "2px 8px",
          borderRadius: "6px",
          flexShrink: 0,
        }}
      >
        {WORLD_NAMES[char.worldID] ?? `World ${char.worldID}`}
      </div>
    </div>
  );
}

// -- Ursus Panel (left sidebar) ------------------------------------------------

const tzFormatter = new Intl.DateTimeFormat([], { timeZoneName: "short" });

function UrsusPanel({ theme, now }: { theme: AppTheme; now: Date | null }) {
  const ursus = now ? getUrsusStatus(now) : null;
  let ursusCountdown = PLACEHOLDER_COUNTDOWN;
  if (ursus) {
    ursusCountdown = fmt(ursus.active ? ursus.remaining : ursus.until);
  }

  const fmtLocal = (utcHour: number) => {
    if (!now) return "";
    const d = new Date(now);
    d.setUTCHours(utcHour, 0, 0, 0);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  const tzLabel = now
    ? (tzFormatter.formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "")
    : "";

  const activeBadgeStyle: CSSProperties = {
    marginLeft: "auto",
    fontSize: "0.65rem",
    fontWeight: 800,
    color: "#fff",
    background: "#10b981",
    padding: "2px 8px",
    borderRadius: "6px",
    letterSpacing: "0.05em",
  };

  const timerRowStyle: CSSProperties = {
    background: theme.timerBg,
    borderRadius: "14px",
    padding: "1rem 1.25rem",
    border: `1px solid ${theme.border}`,
    transition: "background 0.35s, border-color 0.35s",
  };

  return (
    <div
      className="fade-in panel panel-card"
      style={{ animationDelay: "0.25s", background: theme.panel, border: `1px solid ${theme.border}` }}
    >
      <div className="panel-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: "1.1rem" }}>&#128059;</span>
        <span className="panel-header-title" style={{ color: theme.text }}>Ursus 2&#215; Meso</span>
        {ursus?.active && <span style={activeBadgeStyle}>ACTIVE</span>}
      </div>
      <div style={{ padding: "0.75rem" }}>
        <div style={timerRowStyle}>
          <div className="section-label" style={{ color: theme.muted, marginBottom: "6px" }}>
            {ursus?.active ? "Ends In" : "Starts In"}
          </div>
          <div className="timer-countdown" style={{ color: theme.accent }}>
            {ursusCountdown}
          </div>
        </div>
        {now && (
          <div style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>
            {fmtLocal(1)} – {fmtLocal(5)} &amp; {fmtLocal(18)} – {fmtLocal(22)} {tzLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// -- Reset Timer Panels (right sidebar) ----------------------------------------

function ResetTimerPanels({ theme, now }: { theme: AppTheme; now: Date | null }) {
  const resets = now
    ? [
        { label: "Daily Reset", countdown: fmt(getNextReset(now, 0).getTime() - now.getTime()) },
        { label: "Weekly Reset", countdown: fmt(getNextReset(now, 0, 4).getTime() - now.getTime()) },
      ]
    : [
        { label: "Daily Reset", countdown: PLACEHOLDER_COUNTDOWN },
        { label: "Weekly Reset", countdown: PLACEHOLDER_COUNTDOWN },
      ];

  const timerRowStyle: CSSProperties = {
    background: theme.timerBg,
    borderRadius: "14px",
    padding: "1rem 1.25rem",
    border: `1px solid ${theme.border}`,
    transition: "background 0.35s, border-color 0.35s",
  };

  return (
    <div
      className="fade-in panel panel-card"
      style={{ animationDelay: "0.2s", background: theme.panel, border: `1px solid ${theme.border}` }}
    >
      <div className="panel-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: "1.1rem" }}>&#9201;</span>
        <span className="panel-header-title" style={{ color: theme.text }}>Reset Timers</span>
      </div>
      <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {resets.map((r) => (
          <div key={r.label} style={timerRowStyle}>
            <div className="section-label" style={{ color: theme.muted, marginBottom: "6px" }}>
              {r.label}
            </div>
            <div className="timer-countdown" style={{ color: theme.accent }}>
              {r.countdown}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Quick Tools Grid ----------------------------------------------------------

function QuickToolsGrid({ theme }: { theme: AppTheme }) {
  const toolCardStyle: CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "1rem 0.65rem 0.85rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.3rem",
  };
  const toolIconWrapStyle: CSSProperties = {
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  };

  return (
    <div className="fade-in" style={{ marginBottom: "1.25rem", animationDelay: "0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span className="panel-header-title" style={{ color: theme.text, fontSize: "1rem" }}>
          Tools
        </span>
        <Link
          href="/tools"
          style={{ fontSize: "0.78rem", color: theme.accent, fontWeight: 800, textDecoration: "none" }}
        >
          All tools →
        </Link>
      </div>
      <div className="quick-tools-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
        {QUICK_TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} style={{ textDecoration: "none" }}>
            <div className="quick-tool-card" style={toolCardStyle}>
              <div style={toolIconWrapStyle}>
                {tool.iconType === "item" ? (
                  <ItemIcon id={tool.itemId} size={32} />
                ) : (
                  <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{tool.icon}</span>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: theme.text, lineHeight: 1.2 }}>
                {tool.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600, lineHeight: 1.3 }}>
                {tool.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// -- Quick Guides Grid ---------------------------------------------------------

function QuickGuidesGrid({ theme }: { theme: AppTheme }) {
  const guideCardStyle: CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "1rem 0.65rem 0.85rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.3rem",
  };

  return (
    <div className="fade-in" style={{ marginBottom: "1.25rem", animationDelay: "0.25s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span className="panel-header-title" style={{ color: theme.text, fontSize: "1rem" }}>
          Guides
        </span>
        <Link
          href="/guides"
          style={{ fontSize: "0.78rem", color: theme.accent, fontWeight: 800, textDecoration: "none" }}
        >
          All guides →
        </Link>
      </div>
      <div className="quick-guides-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${QUICK_GUIDES.length}, 1fr)`, gap: "0.75rem" }}>
        {QUICK_GUIDES.map((guide) => (
          <Link key={guide.href} href={guide.href} style={{ textDecoration: "none" }}>
            <div className="quick-tool-card" style={guideCardStyle}>
              <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>
                <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{guide.emoji}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.8rem", color: theme.text, lineHeight: 1.2 }}>
                {guide.title}
              </div>
              <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600, lineHeight: 1.3 }}>
                {guide.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// -- Characters Panel ----------------------------------------------------------

function CharactersPanel({ theme, characters }: { theme: AppTheme; characters: StoredCharacterRecord[] }) {
  const emptyStateStyle: CSSProperties = {
    padding: "3rem 2rem",
    textAlign: "center",
    color: theme.muted,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  };
  const addBtnStyle: CSSProperties = {
    marginTop: "0.5rem",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "0.55rem 1.25rem",
    borderRadius: "10px",
    background: theme.accent,
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.85rem",
    textDecoration: "none",
    transition: "opacity 0.15s",
  };
  const addDashedStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    margin: "0.25rem 0.75rem 0.5rem",
    padding: "0.55rem 0",
    borderRadius: "10px",
    border: `2px dashed ${theme.border}`,
    background: "transparent",
    color: theme.muted,
    fontWeight: 800,
    fontSize: "0.8rem",
    textDecoration: "none",
    cursor: "pointer",
    transition: "border-color 0.15s, color 0.15s",
  };
  const manageLinkStyle: CSSProperties = {
    marginLeft: "auto",
    fontSize: "0.78rem",
    color: theme.accent,
    textDecoration: "none",
    fontWeight: 800,
  };

  return (
    <div
      className="fade-in panel panel-card"
      style={{ animationDelay: "0.25s", background: theme.panel, border: `1px solid ${theme.border}` }}
    >
      <div className="panel-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: "1.1rem" }}>&#11088;</span>
        <span className="panel-header-title" style={{ color: theme.text }}>
          My Characters
        </span>
        {characters.length > 0 && (
          <Link href="/characters" style={manageLinkStyle}>Manage →</Link>
        )}
      </div>

      {characters.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: "2rem" }}>&#10024;</div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>No characters yet</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Add your first character to get started!
          </div>
          <Link href="/characters" style={addBtnStyle}>+ Add Character</Link>
        </div>
      ) : (
        <div className="characters-scroll-area" style={{ padding: "0.5rem", maxHeight: 420, overflowY: "auto" }}>
          <div className={characters.length > 6 ? "characters-grid characters-grid-two-col" : "characters-grid"}>
            {characters.map((char) => (
              <CharacterRow key={char.characterName.toLowerCase()} theme={theme} char={char} />
            ))}
          </div>
          <Link
            href="/characters"
            style={addDashedStyle}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, { borderColor: theme.accent, color: theme.accent });
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, { borderColor: theme.border, color: theme.muted });
            }}
          >
            + Add Character
          </Link>
        </div>
      )}
    </div>
  );
}

// -- Patch Notes Panel ---------------------------------------------------------

// Patch notes external store — fetch once, notify subscribers
let patchNotesData: PatchNote[] = initialPatchNotes;
const patchListeners = new Set<() => void>();
let patchFetched = false;

function subscribePatchNotes(listener: () => void) {
  patchListeners.add(listener);
  if (!patchFetched) {
    patchFetched = true;
    const cached = readCachedPatchNotes();
    fetch("/api/patch-notes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          patchNotesData = data as PatchNote[];
          try {
            localStorage.setItem(
              PATCH_CACHE_KEY,
              JSON.stringify({ expiresAt: Date.now() + PATCH_CACHE_TTL_MS, data }),
            );
          } catch { /* localStorage full or unavailable */ }
        } else if (cached) {
          patchNotesData = cached;
        }
        patchListeners.forEach((l) => l());
      })
      .catch(() => {
        if (cached) {
          patchNotesData = cached;
          patchListeners.forEach((l) => l());
        }
      });
  }
  return () => { patchListeners.delete(listener); };
}

function getPatchNotesSnapshot() { return patchNotesData; }

function PatchNotesPanel({ theme }: { theme: AppTheme }) {
  const patchNotes = useSyncExternalStore(subscribePatchNotes, getPatchNotesSnapshot, () => initialPatchNotes);
  const [patchFilter, setPatchFilter] = useState<PatchFilter>("All");
  const [patchExpanded, setPatchExpanded] = useState(false);

  const allFilteredPatchNotes =
    patchFilter === "All"
      ? patchNotes
      : patchNotes.filter((p) => p.tags.includes(patchFilter));
  const filteredPatchNotes = patchExpanded
    ? allFilteredPatchNotes
    : allFilteredPatchNotes.slice(0, PATCH_DISPLAY_LIMIT);
  const hasMoreNotes = allFilteredPatchNotes.length > PATCH_DISPLAY_LIMIT;

  const versionBadgeStyle: CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: theme.accentText,
    background: theme.accentSoft,
    padding: "2px 7px",
    borderRadius: "6px",
  };
  const tagBadgeStyle: CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: theme.badgeText,
    background: theme.badge,
    padding: "2px 7px",
    borderRadius: "6px",
  };
  const patchRowStyle: CSSProperties = {
    padding: "0.85rem 1.25rem",
    cursor: "pointer",
    borderBottom: `1px solid ${theme.border}`,
    transition: "background 0.15s",
  };
  const showMoreBtnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    width: "100%",
    padding: "0.6rem 1.25rem",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 700,
    fontFamily: "inherit",
    color: theme.accent,
    transition: "background 0.15s",
  };
  const allLinkStyle: CSSProperties = {
    marginLeft: "auto",
    fontSize: "0.78rem",
    color: theme.accent,
    textDecoration: "none",
    fontWeight: 800,
  };
  const filterBtnBase: CSSProperties = {
    border: "none",
    borderRadius: "8px",
    padding: "3px 8px",
    fontSize: "0.75rem",
    fontWeight: 700,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  };

  return (
    <div
      className="fade-in panel panel-card"
      style={{
        animationDelay: "0.3s",
        background: theme.panel,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div
        style={{
          padding: "0.9rem 1.25rem 0.5rem",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
          <span>&#128203;</span>
          <span className="panel-header-title" style={{ color: theme.text, fontSize: "1.1rem" }}>
            Patch Notes
          </span>
          <a
            href="https://maplestory.nexon.net/news/patch-notes"
            target="_blank"
            rel="noopener noreferrer"
            style={allLinkStyle}
          >
            All →
          </a>
        </div>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", paddingBottom: "0.4rem" }}>
          {PATCH_FILTERS.map((filter) => {
            const active = patchFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => { setPatchFilter(filter); setPatchExpanded(false); }}
                style={{
                  ...filterBtnBase,
                  background: active ? theme.accent : theme.bg,
                  color: active ? "#fff" : theme.muted,
                }}
              >
                {filter === "All" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>
      {filteredPatchNotes.length === 0 ? (
        <div className="empty-state" style={{ padding: "1.5rem 1.25rem", color: theme.muted, fontWeight: 600 }}>
          No notes for this filter.
        </div>
      ) : (
        <>
          {filteredPatchNotes.map((p) => (
            <a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}
            >
              <div className="row-hover" style={patchRowStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                  <span style={versionBadgeStyle}>{p.version}</span>
                  {p.tags.map((tag) => (
                    <span key={tag} style={tagBadgeStyle}>{tag}</span>
                  ))}
                  <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: theme.muted }}>
                    {p.date}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: theme.accent, marginLeft: "4px" }}>
                    ↗
                  </span>
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: theme.text }}>
                  {p.title}
                </div>
              </div>
            </a>
          ))}
          {hasMoreNotes && (
            <button
              type="button"
              onClick={() => setPatchExpanded((prev) => !prev)}
              style={showMoreBtnStyle}
              onMouseEnter={(e) => { e.currentTarget.style.background = theme.accentSoft; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {patchExpanded
                ? "Show less ▲"
                : `Show ${allFilteredPatchNotes.length - PATCH_DISPLAY_LIMIT} more ▼`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// -- Main dashboard -----------------------------------------------------------

function DashboardContent({ theme }: { theme: AppTheme }) {
  const mounted = useSyncExternalStore(subscribeFn, () => true, () => false);
  const characters: StoredCharacterRecord[] = mounted
    ? selectCharactersList(readCharactersStore())
    : [];

  const now = useClock();

  return (
    <>
      <style>{`
        .panel { transition: background 0.35s ease, border-color 0.35s ease; }
        .panel:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

        .row-hover:hover { background: ${theme.accentSoft} !important; }

        .char-row-icons { opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
        .char-row:hover .char-row-icons { opacity: 1; pointer-events: auto; }
        .char-row-icon-btn { transition: transform 0.1s ease, background 0.15s ease; }
        .char-row-icon-btn:hover { transform: translateY(-1px); background: ${theme.accentSoft} !important; }

        .hero-banner {
          background: ${theme.panel};
          transition: background 0.35s ease, border-color 0.35s ease;
        }
        .timer-countdown {
          font-family: var(--font-heading);
          font-size: 2rem;
          line-height: 1;
          letter-spacing: 0.03em;
        }
        .timer-bar-card {
          transition: background 0.35s ease, border-color 0.35s ease;
        }

        .dashboard-layout {
          max-width: 1560px;
          margin: 0 auto;
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
        }
        .dashboard-sidebar-left {
          width: 320px;
          flex-shrink: 0;
          position: sticky;
          top: 72px;
        }
        .dashboard-main {
          flex: 1;
          min-width: 0;
          max-width: 900px;
        }
        .dashboard-sidebar-right {
          width: 300px;
          flex-shrink: 0;
          position: sticky;
          top: 72px;
        }

        .quick-tool-card {
          transition: transform 0.15s ease, background 0.35s ease, border-color 0.35s ease, box-shadow 0.15s ease;
        }
        .quick-tool-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
          border-color: ${theme.accent} !important;
        }

        .characters-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0;
        }
        .characters-scroll-area {
          scrollbar-width: thin;
        }

        @media (min-width: 861px) {
          .characters-grid-two-col { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 1200px) {
          .dashboard-layout { flex-direction: column; align-items: center; gap: 0.35rem; }
          .dashboard-sidebar-left { width: 100%; max-width: 900px; position: static; order: 1; }
          .dashboard-sidebar-right { width: 100%; max-width: 900px; position: static; order: 2; }
          .dashboard-main { width: 100%; max-width: 900px; order: 0; }
          .hide-mobile { display: none; }
        }

        @media (max-width: 860px) {
          .quick-tools-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .char-row-icons { opacity: 1 !important; pointer-events: auto !important; }
          .characters-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 500px) {
          .quick-tools-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .quick-guides-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .timer-countdown { font-size: 1.5rem !important; }
        }
      `}</style>

      <div className="page-content">
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar-left">
            <div className="hide-mobile">
              <ResetTimerPanels theme={theme} now={now} />
              <div style={{ marginTop: "0.75rem" }}>
                <UrsusPanel theme={theme} now={now} />
              </div>
            </div>
          </aside>
          <div className="dashboard-main">
            <HeroBanner theme={theme} />
            <QuickToolsGrid theme={theme} />
            <QuickGuidesGrid theme={theme} />
            <CharactersPanel theme={theme} characters={characters} />
          </div>
          <aside className="dashboard-sidebar-right">
            <div style={{ marginBottom: "0.75rem" }}>
              <SunnySundayPanel theme={theme} />
            </div>
            <PatchNotesPanel theme={theme} />
          </aside>
        </div>
      </div>
    </>
  );
}

export default function MapleDoro() {
  return (
    <AppShell currentPath="/">
      {({ theme }) => <DashboardContent theme={theme} />}
    </AppShell>
  );
}

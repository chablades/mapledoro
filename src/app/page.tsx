"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import AppShell from "../components/AppShell";
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


// -- Quick Tools data ----------------------------------------------------------
interface QuickTool {
  title: string;
  desc: string;
  icon: string;
  iconType: "emoji" | "image";
  href: string;
}

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
    icon: "https://media.maplestorywiki.net/yetidb/Cash_Glowing_Cube.png",
    iconType: "image",
    href: "/tools/cubing",
  },
  {
    title: "Flaming",
    desc: "Bonus stat calculator",
    icon: "https://media.maplestorywiki.net/yetidb/Use_Powerful_Rebirth_Flame.png",
    iconType: "image",
    href: "/tools/flaming",
  },
  {
    title: "HEXA Skills",
    desc: "Sol Erda planning",
    icon: "https://media.maplestorywiki.net/yetidb/Etc_Sol_Erda_Fragment_%28Full_Size%29.png",
    iconType: "image",
    href: "/tools/hexa-skills",
  },
  {
    title: "Liberation",
    desc: "Genesis, Astra & Destiny",
    icon: "https://media.maplestorywiki.net/yetidb/Eqp_Genesis_Dagger.png",
    iconType: "image",
    href: "/tools/liberation",
  },
];

// -- Character tracker quick-launch icons --------------------------------------
interface TrackerLink {
  icon: string;
  label: string;
  href: (characterName: string) => string;
}

const TRACKER_LINKS: TrackerLink[] = [
  {
    label: "Liberation Tracker",
    icon: "https://media.maplestorywiki.net/yetidb/Eqp_Genesis_Dagger.png",
    href: (c) => `/tools/liberation?character=${encodeURIComponent(c)}`,
  },
  {
    label: "Symbol Tracker",
    icon: "https://media.maplestorywiki.net/yetidb/Eqp_Sacred_Symbol_Cernium.png",
    href: (c) => `/tools/symbols?character=${encodeURIComponent(c)}`,
  },
  {
    label: "HEXA Skills",
    icon: "https://media.maplestorywiki.net/yetidb/Etc_Sol_Erda_Fragment_%28Full_Size%29.png",
    href: (c) => `/tools/hexa-skills?character=${encodeURIComponent(c)}`,
  },
];

// -- Components ----------------------------------------------------------------

function HeroBanner({ theme }: { theme: AppTheme }) {
  const bannerStyle: CSSProperties = {
    position: "relative",
    textAlign: "center",
    padding: "2.5rem 2rem 2rem",
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
    margin: "0 auto 1.25rem",
    lineHeight: 1.5,
  };
  const primaryBtnStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.55rem 1.25rem",
    borderRadius: 10,
    background: theme.accent,
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.82rem",
    textDecoration: "none",
    transition: "opacity 0.15s, transform 0.15s",
  };
  const secondaryBtnStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.55rem 1.25rem",
    borderRadius: 10,
    border: `2px solid ${theme.border}`,
    background: "transparent",
    color: theme.text,
    fontWeight: 800,
    fontSize: "0.82rem",
    textDecoration: "none",
    transition: "border-color 0.15s, transform 0.15s",
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
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/characters" className="hero-btn-primary" style={primaryBtnStyle}>
            Get Started
          </Link>
          <Link href="/guides" className="hero-btn-secondary" style={secondaryBtnStyle}>
            Browse Guides
          </Link>
        </div>
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
          <Image src={t.icon} alt="" width={25} height={25} style={{ objectFit: "contain" }} />
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

  const cardStyle: CSSProperties = {
    background: theme.panel,
    border: `1px solid ${ursus?.active ? "#10b981" : theme.border}`,
    borderRadius: 14,
    padding: "0.85rem 1rem",
    marginBottom: "0.75rem",
  };
  const activeBadgeStyle: CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: "#fff",
    background: "#10b981",
    padding: "1px 6px",
    borderRadius: 4,
    letterSpacing: "0.05em",
  };

  return (
    <div className="fade-in timer-bar-card" style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span className="section-label" style={{ color: theme.muted, marginBottom: 0 }}>
          {ursus?.active ? "Ursus 2× — Ends In" : "Ursus 2× — Starts In"}
        </span>
        {ursus?.active && <span style={activeBadgeStyle}>ACTIVE</span>}
      </div>
      <div className="timer-countdown" style={{ color: ursus?.active ? "#10b981" : theme.accent }}>
        {ursusCountdown}
      </div>
      {now && (
        <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, marginTop: 4 }}>
          {fmtLocal(1)}–{fmtLocal(5)} &amp; {fmtLocal(18)}–{fmtLocal(22)} {tzLabel}
        </div>
      )}
    </div>
  );
}

// -- Reset Timer Panels (right sidebar) ----------------------------------------

function ResetTimerPanels({ theme, now }: { theme: AppTheme; now: Date | null }) {
  const dailyCountdown = now
    ? fmt(getNextReset(now, 0).getTime() - now.getTime())
    : PLACEHOLDER_COUNTDOWN;
  const weeklyCountdown = now
    ? fmt(getNextReset(now, 0, 4).getTime() - now.getTime())
    : PLACEHOLDER_COUNTDOWN;

  const cardStyle: CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "0.85rem 1rem",
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
      <div className="timer-bar-card" style={cardStyle}>
        <div className="section-label" style={{ color: theme.muted, marginBottom: 4 }}>
          Daily Reset
        </div>
        <div className="timer-countdown" style={{ color: theme.accent }}>
          {dailyCountdown}
        </div>
      </div>
      <div className="timer-bar-card" style={cardStyle}>
        <div className="section-label" style={{ color: theme.muted, marginBottom: 4 }}>
          Weekly Reset
        </div>
        <div className="timer-countdown" style={{ color: theme.accent }}>
          {weeklyCountdown}
        </div>
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
                {tool.iconType === "image" ? (
                  <Image src={tool.icon} alt="" width={32} height={32} style={{ objectFit: "contain" }} />
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
        .hero-btn-primary:hover { opacity: 0.85; transform: translateY(-1px); }
        .hero-btn-secondary:hover { border-color: ${theme.accent} !important; transform: translateY(-1px); }

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
          .dashboard-layout { flex-direction: column; }
          .dashboard-sidebar-left { width: 100%; position: static; order: 1; }
          .dashboard-sidebar-right { width: 100%; position: static; order: 2; }
          .dashboard-main { max-width: none; order: 0; }
          .hide-mobile { display: none; }
        }

        @media (max-width: 860px) {
          .quick-tools-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .char-row-icons { opacity: 1 !important; pointer-events: auto !important; }
          .characters-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 500px) {
          .quick-tools-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .timer-countdown { font-size: 1.5rem !important; }
        }
      `}</style>

      <div className="page-content">
        <div className="dashboard-layout">
          <aside className="dashboard-sidebar-left">
            <div className="hide-mobile">
              <UrsusPanel theme={theme} now={now} />
            </div>
            <SunnySundayPanel theme={theme} />
          </aside>
          <div className="dashboard-main">
            <HeroBanner theme={theme} />
            <QuickToolsGrid theme={theme} />
            <CharactersPanel theme={theme} characters={characters} />
          </div>
          <aside className="dashboard-sidebar-right">
            <div className="hide-mobile">
              <ResetTimerPanels theme={theme} now={now} />
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

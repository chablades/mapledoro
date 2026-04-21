"use client";

/*
  Dashboard page.
  Edit this file for dashboard-only content/widgets.
  Shared chrome (top nav/sidebar/themes) lives in src/components/AppShell.tsx.
*/
import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import AppShell from "../components/AppShell";
import SunnySundayPanel from "../components/SunnySundayPanel";
import RemindersPanel from "../components/RemindersPanel";
import type { AppTheme } from "../components/themes";
import {
  readCharactersStore,
  selectCharactersList,
} from "../features/characters/model/charactersStore";
import type { StoredCharacterRecord } from "../features/characters/model/charactersStore";
import { WORLD_NAMES } from "../features/characters/model/constants";
import CharacterAvatar from "../features/characters/tabs/components/CharacterAvatar";
import { getUrsusStatus } from "../lib/ursus";

// -- Patch Notes constants ----------------------------------------------------
const PATCH_CACHE_KEY = "mapledoro_patch_notes_v1";
const PATCH_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
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

// -- Data ---------------------------------------------------------------------
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

// -- Character-row quick-launch tracker icons --------------------------------

interface TrackerLink {
  emoji: string;
  label: string;
  href: (characterName: string) => string;
}

const TRACKER_LINKS: TrackerLink[] = [
  {
    emoji: "📋",
    label: "Daily Tracker",
    href: (c) => `/tools/dailies?character=${encodeURIComponent(c)}`,
  },
  {
    emoji: "🗡️",
    label: "Liberation Tracker",
    href: (c) => `/tools/liberation?character=${encodeURIComponent(c)}`,
  },
  {
    emoji: "🔮",
    label: "Symbol Tracker",
    href: (c) => `/tools/symbols?character=${encodeURIComponent(c)}`,
  },
  {
    emoji: "🔷",
    label: "HEXA Skills",
    href: (c) => `/tools/hexa-skills?character=${encodeURIComponent(c)}`,
  },
];

function TrackerIcons({ theme, char }: { theme: AppTheme; char: StoredCharacterRecord }) {
  return (
    <div
      className="char-row-icons"
      style={{
        display: "flex",
        gap: 3,
        flexShrink: 0,
      }}
    >
      {TRACKER_LINKS.map((t) => (
        <Link
          key={t.label}
          href={t.href(char.characterName)}
          title={t.label}
          aria-label={`${t.label} for ${char.characterName}`}
          className="char-row-icon-btn"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: theme.timerBg,
            border: `1px solid ${theme.border}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.78rem",
            textDecoration: "none",
            lineHeight: 1,
          }}
        >
          {t.emoji}
        </Link>
      ))}
    </div>
  );
}

function CharacterRow({
  theme,
  char,
}: {
  theme: AppTheme;
  char: StoredCharacterRecord;
}) {
  return (
    <div
      className="row-hover char-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.6rem 0.75rem",
        borderRadius: "12px",
        transition: "background 0.15s",
      }}
    >
      <Link
        href="/characters"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flex: 1,
          minWidth: 0,
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "12px",
            overflow: "hidden",
            background: theme.timerBg,
            border: `1px solid ${theme.border}`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CharacterAvatar
            src={char.characterImgURL}
            alt={char.characterName}
            width={48}
            height={48}
            style={{ objectFit: "contain" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: "0.9rem",
              color: theme.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {char.characterName}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: theme.muted,
              fontWeight: 600,
              marginTop: "1px",
            }}
          >
            Lv. {char.level} {char.jobName}
          </div>
        </div>
      </Link>
      <TrackerIcons theme={theme} char={char} />
      <div
        style={{
          fontSize: "0.7rem",
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

// -- Panel components ---------------------------------------------------------

function CharactersPanel({ theme, characters }: { theme: AppTheme; characters: StoredCharacterRecord[] }) {
  return (
    <div
      className="fade-in panel panel-card"
      style={{
        animationDelay: "0.1s",
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        minHeight: "400px",
      }}
    >
      <div className="panel-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: "1.1rem" }}>⭐</span>
        <span className="panel-header-title" style={{ color: theme.text }}>
          My Characters
        </span>
        {characters.length > 0 && (
          <Link
            href="/characters"
            style={{
              marginLeft: "auto",
              fontSize: "0.78rem",
              color: theme.accent,
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Manage →
          </Link>
        )}
      </div>

      {characters.length === 0 ? (
        <div
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
            color: theme.muted,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div style={{ fontSize: "2rem" }}>✨</div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>No characters yet</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Add your first character to get started!
          </div>
          <Link
            href="/characters"
            style={{
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
            }}
          >
            + Add Character
          </Link>
        </div>
      ) : (
        <div style={{ padding: "0.5rem" }}>
          {characters.map((char) => (
            <CharacterRow key={char.characterName.toLowerCase()} theme={theme} char={char} />
          ))}
          <Link
            href="/characters"
            style={{
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
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = theme.accent;
              e.currentTarget.style.color = theme.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.border;
              e.currentTarget.style.color = theme.muted;
            }}
          >
            + Add Character
          </Link>
        </div>
      )}
    </div>
  );
}

function ResetTimersPanel({ theme, now }: { theme: AppTheme; now: Date | null }) {
  const resets = now
    ? [
        {
          label: "Daily Reset",
          color: theme.accent,
          countdown: fmt(getNextReset(now, 0).getTime() - now.getTime()),
        },
        {
          label: "Weekly Reset",
          color: theme.accent,
          countdown: fmt(getNextReset(now, 0, 4).getTime() - now.getTime()),
        },
      ]
    : [
        { label: "Daily Reset", color: theme.accent, countdown: PLACEHOLDER_COUNTDOWN },
        { label: "Weekly Reset", color: theme.accent, countdown: PLACEHOLDER_COUNTDOWN },
      ];

  return (
    <div
      className="fade-in panel panel-card"
      style={{
        animationDelay: "0.2s",
        background: theme.panel,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div className="panel-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: "1.1rem" }}>⏱</span>
        <span className="panel-header-title" style={{ color: theme.text }}>
          Reset Timers
        </span>
      </div>

      <div style={{ padding: "0.75rem" }}>
        {resets.map((r, i) => (
          <div
            key={i}
            style={{
              background: theme.timerBg,
              borderRadius: "14px",
              padding: "1rem 1.25rem",
              marginBottom: i < resets.length - 1 ? "0.6rem" : 0,
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              border: `1px solid ${theme.border}`,
              transition: "background 0.35s, border-color 0.35s",
            }}
          >
            <div style={{ flex: 1 }}>
              <div className="section-label" style={{ color: theme.muted, marginBottom: "6px" }}>
                {r.label}
              </div>
              <div className="countdown" style={{ color: r.color }}>
                {r.countdown}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UrsusPanel({ theme, now }: { theme: AppTheme; now: Date | null }) {
  const ursus = now ? getUrsusStatus(now) : null;
  let ursusCountdown: string;
  if (!ursus) ursusCountdown = PLACEHOLDER_COUNTDOWN;
  else ursusCountdown = fmt(ursus.active ? ursus.remaining : ursus.until);

  const fmtLocal = (utcHour: number) => {
    const d = new Date(now ?? 0);
    d.setUTCHours(utcHour, 0, 0, 0);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  const tzLabel = now
    ? (new Intl.DateTimeFormat([], { timeZoneName: "short" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value ?? "Local")
    : "";

  return (
    <div
      className="fade-in panel panel-card"
      style={{
        animationDelay: "0.25s",
        background: theme.panel,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div className="panel-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <span style={{ fontSize: "1.1rem" }}>🐻</span>
        <span className="panel-header-title" style={{ color: theme.text }}>
          Ursus 2× Meso
        </span>
        {ursus?.active && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.65rem",
              fontWeight: 800,
              color: "#fff",
              background: "#10b981",
              padding: "2px 8px",
              borderRadius: "6px",
              letterSpacing: "0.05em",
            }}
          >
            ACTIVE
          </span>
        )}
      </div>
      <div style={{ padding: "0.75rem" }}>
        <div
          style={{
            background: theme.timerBg,
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            border: `1px solid ${theme.border}`,
            transition: "background 0.35s, border-color 0.35s",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <div className="section-label" style={{ color: theme.muted, marginBottom: "6px" }}>
              {ursus?.active ? "Ends In" : "Starts In"}
            </div>
            <div
              className="countdown"
              style={{ color: theme.accent }}
            >
              {ursusCountdown}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: "0.6rem",
            fontSize: "0.65rem",
            color: theme.muted,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {fmtLocal(1)} – {fmtLocal(5)} &amp; {fmtLocal(18)} – {fmtLocal(22)} {tzLabel}
        </div>
      </div>
    </div>
  );
}

function PatchNotesPanel({ theme }: { theme: AppTheme }) {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>(initialPatchNotes);
  const [patchFilter, setPatchFilter] = useState<PatchFilter>("All");
  const [patchExpanded, setPatchExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        const cached = readCachedPatchNotes();
        if (cached) setPatchNotes(cached);
        return fetch("/api/patch-notes")
          .then((res) => res.json())
          .then((data) => {
            if (cancelled) return;
            if (Array.isArray(data) && data.length > 0) {
              setPatchNotes(data);
              try {
                localStorage.setItem(
                  PATCH_CACHE_KEY,
                  JSON.stringify({ expiresAt: Date.now() + PATCH_CACHE_TTL_MS, data }),
                );
              } catch { /* localStorage full or unavailable */ }
            }
          });
      })
      .catch((err) => console.error("Failed to load patch notes:", err));

    return () => { cancelled = true; };
  }, []);

  const allFilteredPatchNotes =
    patchFilter === "All"
      ? patchNotes
      : patchNotes.filter((p) => p.tags.includes(patchFilter));
  const filteredPatchNotes = patchExpanded
    ? allFilteredPatchNotes
    : allFilteredPatchNotes.slice(0, PATCH_DISPLAY_LIMIT);
  const hasMoreNotes = allFilteredPatchNotes.length > PATCH_DISPLAY_LIMIT;

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
          <span>📋</span>
          <span className="panel-header-title" style={{ color: theme.text, fontSize: "1.1rem" }}>
            Patch Notes
          </span>
          <a
            href="https://maplestory.nexon.net/news/patch-notes"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: "auto",
              fontSize: "0.78rem",
              color: theme.accent,
              textDecoration: "none",
              fontWeight: 800,
            }}
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
                  border: "none",
                  borderRadius: "8px",
                  padding: "3px 8px",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  background: active ? theme.accent : theme.bg,
                  color: active ? "#fff" : theme.muted,
                  transition: "all 0.15s",
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
          {filteredPatchNotes.map((p, i) => (
            <a
              key={i}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", display: "block" }}
            >
              <div
                className="row-hover"
                style={{
                  padding: "0.85rem 1.25rem",
                  cursor: "pointer",
                  borderBottom: `1px solid ${theme.border}`,
                  transition: "background 0.15s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      color: theme.accentText,
                      background: theme.accentSoft,
                      padding: "2px 7px",
                      borderRadius: "6px",
                    }}
                  >
                    {p.version}
                  </span>
                  {p.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: theme.badgeText,
                        background: theme.badge,
                        padding: "2px 7px",
                        borderRadius: "6px",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.7rem",
                      color: theme.muted,
                    }}
                  >
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
              style={{
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
              }}
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

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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

        .countdown { font-family: var(--font-heading); font-size: 2rem; line-height: 1; letter-spacing: 0.03em; }

        @media (max-width: 860px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
          .char-row-icons { opacity: 1 !important; pointer-events: auto !important; }
        }
      `}</style>

      <div className="page-content">
        <div className="page-container">
          <RemindersPanel theme={theme} now={now} />

          <div
            className="dashboard-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 330px",
              gap: "1.25rem",
              alignItems: "start",
            }}
          >
            <CharactersPanel theme={theme} characters={characters} />

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <ResetTimersPanel theme={theme} now={now} />
              <UrsusPanel theme={theme} now={now} />
              <PatchNotesPanel theme={theme} />
              <SunnySundayPanel theme={theme} />
            </div>
          </div>
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

"use client";

/*
  Dashboard page.
  Edit this file for dashboard-only content/widgets.
  Shared chrome (top nav/sidebar/themes) lives in src/components/AppShell.tsx.
*/
import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import SunnySundayPanel from "../components/SunnySundayPanel";
import type { AppTheme } from "../components/themes";

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


// -- Ursus 2× meso helpers ----------------------------------------------------
function getUrsusStatus(now: Date):
  | { active: true; remaining: number }
  | { active: false; until: number } {
  const h = now.getUTCHours();
  const nowMs = now.getTime();

  const inWindow1 = h >= 1 && h < 5;
  const inWindow2 = h >= 18 && h < 22;

  if (inWindow1 || inWindow2) {
    const endHour = inWindow1 ? 5 : 22;
    const end = new Date(now);
    end.setUTCHours(endHour, 0, 0, 0);
    return {
      active: true as const,
      remaining: end.getTime() - nowMs,
    };
  }

  // Next window start
  let nextStart: Date;
  if (h < 1) {
    nextStart = new Date(now);
    nextStart.setUTCHours(1, 0, 0, 0);
  } else if (h >= 5 && h < 18) {
    nextStart = new Date(now);
    nextStart.setUTCHours(18, 0, 0, 0);
  } else {
    // h >= 22
    nextStart = new Date(now);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    nextStart.setUTCHours(1, 0, 0, 0);
  }
  return { active: false as const, until: nextStart.getTime() - nowMs };
}

const PLACEHOLDER_COUNTDOWN = "--:--:--";

function DashboardContent({ theme }: { theme: AppTheme }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>(initialPatchNotes);
  const [patchFilter, setPatchFilter] = useState<PatchFilter>("All");
  const [patchExpanded, setPatchExpanded] = useState(false);

  useEffect(() => {
    const cached = readCachedPatchNotes();
    if (cached) {
      Promise.resolve(cached).then(setPatchNotes);
      return;
    }

    fetch("/api/patch-notes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPatchNotes(data);
          try {
            localStorage.setItem(
              PATCH_CACHE_KEY,
              JSON.stringify({ expiresAt: Date.now() + PATCH_CACHE_TTL_MS, data }),
            );
          } catch { /* localStorage full or unavailable */ }
        }
      })
      .catch((err) => console.error("Failed to fetch patch notes:", err));
  }, []);

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

  const allFilteredPatchNotes =
    patchFilter === "All"
      ? patchNotes
      : patchNotes.filter((p) => p.tags.includes(patchFilter));
  const filteredPatchNotes = patchExpanded
    ? allFilteredPatchNotes
    : allFilteredPatchNotes.slice(0, PATCH_DISPLAY_LIMIT);
  const hasMoreNotes = allFilteredPatchNotes.length > PATCH_DISPLAY_LIMIT;

  return (
    <>
      <style>{`
        .panel { transition: background 0.35s ease, border-color 0.35s ease; }
        .panel:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

        .row-hover:hover { background: ${theme.accentSoft} !important; }

        .countdown { font-family: var(--font-heading); font-size: 2rem; line-height: 1; letter-spacing: 0.03em; }

        @media (max-width: 860px) {
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="page-content">
        <div
          className="page-container dashboard-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 330px",
            gap: "1.25rem",
            alignItems: "start",
          }}
        >
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
                Favorite Characters
              </span>
            </div>
            <div
              style={{
                padding: "3rem 2rem",
                textAlign: "center",
                color: theme.muted,
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✨</div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>No favorites yet</div>
              <div style={{ fontSize: "0.8rem", marginTop: "0.5rem", opacity: 0.8 }}>
                Search for characters to add them here!
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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

            <SunnySundayPanel theme={theme} />
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

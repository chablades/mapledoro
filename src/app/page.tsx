"use client";

/*
  Dashboard page.
  Edit this file for dashboard-only content/widgets.
  Shared chrome (top nav/sidebar/themes) lives in src/components/AppShell.tsx.
*/
import { useState, useEffect } from "react";
import AppShell from "../components/AppShell";
import type { AppTheme } from "../components/themes";

// -- Data ---------------------------------------------------------------------
const initialPatchNotes = [
  {
    version: "v253",
    date: "Feb 19",
    title: "6th Job Skills Rebalance",
    tags: ["Balance"],
    url: "https://maplestory.nexon.net/news/patch-notes",
  },
  {
    version: "v252",
    date: "Feb 5",
    title: "Maple World Revamp",
    tags: ["Content"],
    url: "https://maplestory.nexon.net/news/patch-notes",
  },
  {
    version: "v251",
    date: "Jan 22",
    title: "Boss Crystal Limit ↑",
    tags: ["QoL"],
    url: "https://maplestory.nexon.net/news/patch-notes",
  },
];

const defaultSunnyEvents = [
  { id: 1, label: "2× EXP Coupon", done: false },
  { id: 2, label: "Sunny Sunday Chair", done: false },
  { id: 3, label: "Gold Maple Leaf Emblem", done: false },
  { id: 4, label: "Arcane Catalyst", done: false },
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

function pct(elapsed: number, total: number) {
  return `${Math.min(100, Math.max(0, (elapsed / total) * 100)).toFixed(1)}%`;
}

function DashboardContent({ theme, now }: { theme: AppTheme; now: Date }) {
  const [sunnyEvents, setSunnyEvents] = useState(defaultSunnyEvents);
  const [patchNotes, setPatchNotes] = useState(initialPatchNotes);

  useEffect(() => {
    fetch("/api/patch-notes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPatchNotes(data.slice(0, 3));
        }
      })
      .catch((err) => console.error("Failed to fetch patch notes:", err));
  }, []);

  const daily = getNextReset(now, 0);
  const weekly = getNextReset(now, 0, 4);

  const resets = [
    {
      label: "Daily Reset",
      color: theme.accent,
      countdown: fmt(daily.getTime() - now.getTime()),
      progress: pct(86400 - (daily.getTime() - now.getTime()) / 1000, 86400),
    },
    {
      label: "Weekly Reset",
      color: "#f59e0b",
      countdown: fmt(weekly.getTime() - now.getTime()),
      progress: pct(604800 - (weekly.getTime() - now.getTime()) / 1000, 604800),
    },
  ];

  const sunnyDone = sunnyEvents.filter((e) => e.done).length;

  return (
    <>
      <style>{`
        .panel { transition: background 0.35s ease, border-color 0.35s ease; }
        .panel:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

        .row-hover:hover { background: ${theme.accentSoft} !important; }
        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }

        .countdown { font-family: 'Fredoka One', cursive; font-size: 2rem; line-height: 1; letter-spacing: 0.03em; }

        @media (max-width: 860px) {
          .dashboard-main { padding: 1rem !important; }
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="dashboard-main"
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div
          className="dashboard-grid"
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 330px",
            gap: "1.25rem",
            alignItems: "start",
          }}
        >
          <div
            className="fade-in panel"
            style={{
              animationDelay: "0.1s",
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "18px",
              overflow: "hidden",
              minHeight: "400px",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem 0.8rem",
                borderBottom: `1px solid ${theme.border}`,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>⭐</span>
              <span
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "1.15rem",
                  color: theme.text,
                }}
              >
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
              className="fade-in panel"
              style={{
                animationDelay: "0.2s",
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "18px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem 0.8rem",
                  borderBottom: `1px solid ${theme.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>⏱</span>
                <span
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "1.15rem",
                    color: theme.text,
                  }}
                >
                  Reset Timers
                </span>
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div className="live-dot" />
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: theme.muted,
                    }}
                  >
                    LIVE
                  </span>
                </div>
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
                      <div
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          color: theme.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: "6px",
                        }}
                      >
                        {r.label}
                      </div>
                      <div className="countdown" style={{ color: r.color }}>
                        {r.countdown}
                      </div>
                    </div>
                    <div style={{ width: "90px" }}>
                      <div
                        style={{
                          height: "6px",
                          background: theme.border,
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background: r.color,
                            width: r.progress,
                            borderRadius: "3px",
                            transition: "width 1s linear",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: theme.muted,
                          marginTop: "4px",
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        {r.progress} elapsed
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="fade-in panel"
              style={{
                animationDelay: "0.3s",
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "18px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.9rem 1.25rem",
                  borderBottom: `1px solid ${theme.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>📋</span>
                <span
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "1.1rem",
                    color: theme.text,
                  }}
                >
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
              {patchNotes.map((p, i) => (
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
                      borderBottom:
                        i < patchNotes.length - 1 ? `1px solid ${theme.border}` : "none",
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
            </div>

            <div
              className="fade-in panel"
              style={{
                animationDelay: "0.4s",
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "18px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.9rem 1.25rem",
                  borderBottom: `1px solid ${theme.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>☀️</span>
                <div>
                  <div
                    style={{
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: "1.1rem",
                      color: theme.text,
                      lineHeight: 1,
                    }}
                  >
                    Sunny Sunday
                  </div>
                  <div
                    style={{
                      fontSize: "0.66rem",
                      color: theme.muted,
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    Event Tracker
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    color: "#92400e",
                    background: "#fef3c7",
                    padding: "3px 9px",
                    borderRadius: "20px",
                  }}
                >
                  {sunnyDone}/{sunnyEvents.length}
                </div>
              </div>

              <div style={{ padding: "0.5rem 0.5rem 0" }}>
                {sunnyEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="row-hover"
                    onClick={() =>
                      setSunnyEvents((prev) =>
                        prev.map((e) => (e.id === ev.id ? { ...e, done: !e.done } : e)),
                      )
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "0.65rem 0.75rem",
                      cursor: "pointer",
                      borderRadius: "10px",
                      transition: "background 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "6px",
                        flexShrink: 0,
                        border: `2px solid ${ev.done ? theme.accent : theme.border}`,
                        background: ev.done ? theme.accent : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                      }}
                    >
                      {ev.done && <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 900 }}>✓</span>}
                    </div>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: ev.done ? theme.muted : theme.text,
                        textDecoration: ev.done ? "line-through" : "none",
                        transition: "all 0.2s",
                      }}
                    >
                      {ev.label}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: "0.75rem 1.25rem",
                  marginTop: "0.25rem",
                  borderTop: `1px solid ${theme.border}`,
                }}
              >
                <div
                  style={{
                    height: "5px",
                    background: theme.border,
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: "3px",
                      background: `linear-gradient(90deg, ${theme.accent}, #f59e0b)`,
                      width: `${(sunnyDone / sunnyEvents.length) * 100}%`,
                      transition: "width 0.35s ease",
                    }}
                  />
                </div>
              </div>
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
      {({ theme, now }) => <DashboardContent theme={theme} now={now} />}
    </AppShell>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

// ── Themes ───────────────────────────────────────────────────────────────────
const themes: Record<string, Theme> = {
  default: {
    name: "Default", emoji: "🍁",
    bg: "#faf8f5", panel: "#ffffff", border: "#ede8e0",
    text: "#1c1814", muted: "#8a7f75", accent: "#d4622a",
    accentSoft: "#fdf0ea", accentText: "#c45520",
    sidebar: "#fff9f5", sidebarAccent: "#d4622a",
    timerBg: "#fdf8f4", badge: "#f0e8e0", badgeText: "#7a5a40",
  },
  henesys: {
    name: "Henesys", emoji: "🌿",
    bg: "#f2faf2", panel: "#ffffff", border: "#cce8cc",
    text: "#162816", muted: "#507050", accent: "#2d8a2d",
    accentSoft: "#e8f5e8", accentText: "#1e6e1e",
    sidebar: "#f0faf0", sidebarAccent: "#2d8a2d",
    timerBg: "#f0faf0", badge: "#d4edda", badgeText: "#1e5c1e",
  },
  kerning: {
    name: "Kerning City", emoji: "🌆",
    bg: "#0e0e18", panel: "#16162a", border: "#252540",
    text: "#e8e6f8", muted: "#7875a0", accent: "#7c6aff",
    accentSoft: "#1c1a38", accentText: "#a090ff",
    sidebar: "#121228", sidebarAccent: "#7c6aff",
    timerBg: "#131328", badge: "#1e1c3a", badgeText: "#9088cc",
  },
  sleepywood: {
    name: "Sleepywood", emoji: "🌑",
    bg: "#100e0c", panel: "#1a1612", border: "#2a2218",
    text: "#e8ddd0", muted: "#806a54", accent: "#c47c2a",
    accentSoft: "#281c0c", accentText: "#e89a40",
    sidebar: "#161210", sidebarAccent: "#c47c2a",
    timerBg: "#181410", badge: "#241c10", badgeText: "#a07848",
  },
  ellinia: {
    name: "Ellinia", emoji: "✨",
    bg: "#0a1020", panel: "#101828", border: "#182840",
    text: "#d0e8ff", muted: "#5880aa", accent: "#4ab8ff",
    accentSoft: "#0c1e38", accentText: "#7accff",
    sidebar: "#0c1422", sidebarAccent: "#4ab8ff",
    timerBg: "#0c1830", badge: "#102030", badgeText: "#6aaadd",
  },
  mushroomshrine: {
    name: "Mushroom Shrine", emoji: "🍄",
    bg: "#fdf5f0", panel: "#ffffff", border: "#f0ddd0",
    text: "#2a1810", muted: "#a07060", accent: "#e05a5a",
    accentSoft: "#fff0f0", accentText: "#c04040",
    sidebar: "#fff8f5", sidebarAccent: "#e05a5a",
    timerBg: "#fff5f2", badge: "#fde8e8", badgeText: "#a03030",
  },
  yuki: {
    name: "Yuki", emoji: "🐰",
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
    timerBg: "#fdf8fa",
    badge: "#e8d5e0",
    badgeText: "#7a4060",
  },
};

interface Theme {
  name: string; emoji: string; bg: string; panel: string; border: string;
  text: string; muted: string; accent: string; accentSoft: string;
  accentText: string; sidebar: string; sidebarAccent: string;
  timerBg: string; badge: string; badgeText: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────
const patchNotes = [
  { version: "v253", date: "Feb 19", title: "6th Job Skills Rebalance", tags: ["Balance"], url: "https://maplestory.nexon.net/news/patch-notes" },
  { version: "v252", date: "Feb 5",  title: "Maple World Revamp",       tags: ["Content"], url: "https://maplestory.nexon.net/news/patch-notes" },
  { version: "v251", date: "Jan 22", title: "Boss Crystal Limit ↑",     tags: ["QoL"],     url: "https://maplestory.nexon.net/news/patch-notes" },
];

const defaultSunnyEvents = [
  { id: 1, label: "2× EXP Coupon",        done: false },
  { id: 2, label: "Sunny Sunday Chair",   done: false },
  { id: 3, label: "Gold Maple Leaf Emblem", done: false },
  { id: 4, label: "Arcane Catalyst",      done: false },
];

const navLinks = [
  { label: "Dashboard", href: "/" },
  { label: "Characters", href: "/characters" },
  { label: "Tools", href: "#" },
  { label: "Community", href: "#" },
];

// ── Time helpers ──────────────────────────────────────────────────────────────
function getNextReset(hour: number, dayOfWeek?: number) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hour, 0, 0, 0);
  if (dayOfWeek !== undefined) {
    const day = now.getUTCDay();
    let diff = dayOfWeek - day;
    if (diff < 0 || (diff === 0 && now >= next)) diff += 7;
    next.setUTCDate(now.getUTCDate() + diff);
  } else {
    if (now >= next) next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

function fmt(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return [h, m, sc].map(n => String(n).padStart(2, "0")).join(":");
}

function pct(elapsed: number, total: number) {
  return Math.min(100, Math.max(0, (elapsed / total) * 100)).toFixed(1) + "%";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MapleDoro() {
  const currentPath = "/";
  const topNavOffset = "calc(56px + env(safe-area-inset-top))";
  const [themeKey, setThemeKey] = useState("default");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [sunnyEvents, setSunnyEvents] = useState(defaultSunnyEvents);
  const [mounted, setMounted] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = themes[themeKey];

  useEffect(() => { setMounted(true); }, []);
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

  if (!mounted) return null;

  const daily  = getNextReset(0);
  const weekly = getNextReset(0, 4);
  const event  = getNextReset(0, 1);

  const resets = [
    {
      label: "Daily Reset",
      color: t.accent,
      countdown: fmt(daily.getTime() - now.getTime()),
      progress: pct(86400 - (daily.getTime() - now.getTime()) / 1000, 86400),
    },
    {
      label: "Weekly Reset",
      color: "#f59e0b",
      countdown: fmt(weekly.getTime() - now.getTime()),
      progress: pct(604800 - (weekly.getTime() - now.getTime()) / 1000, 604800),
    },
    {
      label: "Event Reset",
      color: "#10b981",
      countdown: fmt(event.getTime() - now.getTime()),
      progress: pct(604800 - (event.getTime() - now.getTime()) / 1000, 604800),
    },
  ];

  const sunnyDone = sunnyEvents.filter(e => e.done).length;

  return (
    <div style={{ minHeight: "100dvh", background: t.bg, color: t.text, fontFamily: "'Nunito', sans-serif", transition: "all 0.35s ease", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Fredoka+One&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { max-width: 100%; overflow-x: hidden; }

        .fade-in { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .panel { transition: background 0.35s ease, border-color 0.35s ease; }
        .panel:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

        .nav-link { color: ${t.muted}; text-decoration: none; font-size: 0.85rem; font-weight: 700; transition: color 0.2s; }
        .nav-link:hover { color: ${t.text}; }

        .row-hover:hover { background: ${t.accentSoft} !important; }
        .theme-btn:hover { background: ${t.accentSoft} !important; }

        .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }

        .countdown { font-family: 'Fredoka One', cursive; font-size: 2rem; line-height: 1; letter-spacing: 0.03em; }

        .mobile-menu-btn { display: none; }
        .mobile-menu-panel { display: none; }
        .mobile-utc { display: none; }
        .page-shell {
          display: flex;
          min-height: calc(100dvh - (56px + env(safe-area-inset-top)));
          padding-top: calc(56px + env(safe-area-inset-top));
          width: 100%;
          overflow-x: clip;
        }

        @media (max-width: 860px) {
          .desktop-nav-links { display: none !important; }
          .desktop-utc { display: none !important; }
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
          .theme-sidebar { display: none !important; }
          .dashboard-main { padding: 1rem !important; }
          .dashboard-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav className="top-nav" style={{
        height: topNavOffset, background: t.panel, borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", padding: "env(safe-area-inset-top) 1.5rem 0 1.5rem", gap: "1.5rem",
        position: "fixed", left: 0, right: 0, top: 0, zIndex: 50,
        transition: "background 0.35s, border-color 0.35s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
            <Image
              src="/icons/doro.png"
              alt="MapleDoro logo"
              width={18}
              height={18}
              style={{ display: "block", borderRadius: "4px" }}
            />
          </div>
          <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.2rem", color: t.accent }}>MapleDoro</span>
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
                        borderBottom: `2px solid ${t.accent}`,
                        paddingBottom: "2px",
                      }
                    : undefined
                }
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <span className="mobile-utc">{now.toUTCString().slice(17, 25)} UTC</span>
        <span className="desktop-utc" style={{ fontSize: "0.78rem", fontWeight: 800, color: t.muted, fontFamily: "'Fredoka One', cursive", letterSpacing: "0.05em" }}>
          {now.toUTCString().slice(17, 25)} UTC
        </span>
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
            top: topNavOffset,
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

      {/* ── LAYOUT ── */}
      <div className="page-shell">

        {/* ── SIDEBAR (hover) ── */}
        <div
          className="theme-sidebar"
          onMouseEnter={() => { if (leaveTimer.current) clearTimeout(leaveTimer.current); setSidebarOpen(true); }}
          onMouseLeave={() => { leaveTimer.current = setTimeout(() => setSidebarOpen(false), 250); }}
          style={{ position: "fixed", left: 0, top: topNavOffset, bottom: 0, zIndex: 40, display: "flex" }}
        >
          {/* Vertical tab */}
          <div style={{
            width: "26px", background: t.sidebarAccent,
            display: "flex", alignItems: "center", justifyContent: "center",
            writingMode: "vertical-rl", textOrientation: "mixed",
            fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.15em",
            color: "#fff", textTransform: "uppercase",
            borderRadius: "0 8px 8px 0", cursor: "pointer", userSelect: "none",
            transition: "background 0.35s",
          }}>Themes</div>

          {/* Slide-out panel */}
          <div style={{
            width: sidebarOpen ? "195px" : "0",
            overflow: "hidden",
            transition: "width 0.28s ease",
            background: t.sidebar,
            borderRight: sidebarOpen ? `1px solid ${t.border}` : "none",
            boxShadow: sidebarOpen ? "4px 0 20px rgba(0,0,0,0.08)" : "none",
          }}>
            <div style={{ width: "195px", padding: "1rem 0.75rem" }}>
              <p style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.12em", color: t.muted, textTransform: "uppercase", marginBottom: "0.75rem", paddingLeft: "4px" }}>
                Map Theme
              </p>
              {Object.entries(themes).map(([key, th]) => (
                <button
                  key={key}
                  className="theme-btn"
                  onClick={() => setThemeKey(key)}
                  style={{
                    width: "100%", border: "none", cursor: "pointer",
                    background: themeKey === key ? t.accentSoft : "transparent",
                    borderRadius: "10px", padding: "8px 10px",
                    display: "flex", alignItems: "center", gap: "8px",
                    marginBottom: "2px", transition: "background 0.15s",
                  }}
                >
                  <span style={{ fontSize: "0.95rem" }}>{th.emoji}</span>
                  <span style={{ fontSize: "0.84rem", fontWeight: themeKey === key ? 800 : 500, color: themeKey === key ? t.accentText : t.text }}>
                    {th.name}
                  </span>
                  {themeKey === key && <span style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: t.accent }} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="dashboard-main" style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}>
          <div className="dashboard-grid" style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 330px", gap: "1.25rem", alignItems: "start" }}>

            {/* ── TIMERS ── */}
            <div className="fade-in panel" style={{
              animationDelay: "0.1s",
              background: t.panel, border: `1px solid ${t.border}`,
              borderRadius: "18px", overflow: "hidden",
            }}>
              <div style={{ padding: "1rem 1.25rem 0.8rem", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.1rem" }}>⏱</span>
                <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.15rem", color: t.text }}>Reset Timers</span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                  <div className="live-dot" />
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, color: t.muted }}>LIVE</span>
                </div>
              </div>

              <div style={{ padding: "0.75rem" }}>
                {resets.map((r, i) => (
                  <div key={i} style={{
                    background: t.timerBg, borderRadius: "14px",
                    padding: "1rem 1.25rem", marginBottom: i < 2 ? "0.6rem" : 0,
                    display: "flex", alignItems: "center", gap: "1rem",
                    border: `1px solid ${t.border}`,
                    transition: "background 0.35s, border-color 0.35s",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: t.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                        {r.label}
                      </div>
                      <div className="countdown" style={{ color: r.color }}>{r.countdown}</div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: "90px" }}>
                      <div style={{ height: "6px", background: t.border, borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ height: "100%", background: r.color, width: r.progress, borderRadius: "3px", transition: "width 1s linear" }} />
                      </div>
                      <div style={{ fontSize: "0.65rem", color: t.muted, marginTop: "4px", textAlign: "right", fontWeight: 700 }}>{r.progress} elapsed</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Patch Notes */}
              <div className="fade-in panel" style={{
                animationDelay: "0.2s",
                background: t.panel, border: `1px solid ${t.border}`,
                borderRadius: "18px", overflow: "hidden",
              }}>
                <div style={{ padding: "0.9rem 1.25rem", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📋</span>
                  <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.1rem", color: t.text }}>Patch Notes</span>
                  <a href="#" style={{ marginLeft: "auto", fontSize: "0.78rem", color: t.accent, textDecoration: "none", fontWeight: 800 }}>All →</a>
                </div>
                {patchNotes.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
                    <div className="row-hover" style={{
                      padding: "0.85rem 1.25rem", cursor: "pointer",
                      borderBottom: i < patchNotes.length - 1 ? `1px solid ${t.border}` : "none",
                      transition: "background 0.15s",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: t.accentText, background: t.accentSoft, padding: "2px 7px", borderRadius: "6px" }}>{p.version}</span>
                        {p.tags.map(tag => (
                          <span key={tag} style={{ fontSize: "0.65rem", fontWeight: 700, color: t.badgeText, background: t.badge, padding: "2px 7px", borderRadius: "6px" }}>{tag}</span>
                        ))}
                        <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: t.muted }}>{p.date}</span>
                        <span style={{ fontSize: "0.75rem", color: t.accent, marginLeft: "4px" }}>↗</span>
                      </div>
                      <div style={{ fontSize: "0.875rem", fontWeight: 700, color: t.text }}>{p.title}</div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Sunny Sunday */}
              <div className="fade-in panel" style={{
                animationDelay: "0.3s",
                background: t.panel, border: `1px solid ${t.border}`,
                borderRadius: "18px", overflow: "hidden",
              }}>
                <div style={{ padding: "0.9rem 1.25rem", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>☀️</span>
                  <div>
                    <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.1rem", color: t.text, lineHeight: 1 }}>Sunny Sunday</div>
                    <div style={{ fontSize: "0.66rem", color: t.muted, fontWeight: 700, marginTop: "2px" }}>Event Tracker</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: "0.7rem", fontWeight: 800, color: "#92400e", background: "#fef3c7", padding: "3px 9px", borderRadius: "20px" }}>
                    {sunnyDone}/{sunnyEvents.length}
                  </div>
                </div>

                <div style={{ padding: "0.5rem 0.5rem 0" }}>
                  {sunnyEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="row-hover"
                      onClick={() => setSunnyEvents(prev => prev.map(e => e.id === ev.id ? { ...e, done: !e.done } : e))}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "0.65rem 0.75rem", cursor: "pointer",
                        borderRadius: "10px", transition: "background 0.15s",
                      }}
                    >
                      <div style={{
                        width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0,
                        border: `2px solid ${ev.done ? t.accent : t.border}`,
                        background: ev.done ? t.accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s",
                      }}>
                        {ev.done && <span style={{ color: "#fff", fontSize: "0.65rem", fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color: ev.done ? t.muted : t.text, textDecoration: ev.done ? "line-through" : "none", transition: "all 0.2s" }}>
                        {ev.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{ padding: "0.75rem 1.25rem", marginTop: "0.25rem", borderTop: `1px solid ${t.border}` }}>
                  <div style={{ height: "5px", background: t.border, borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: "3px",
                      background: `linear-gradient(90deg, ${t.accent}, #f59e0b)`,
                      width: `${(sunnyDone / sunnyEvents.length) * 100}%`,
                      transition: "width 0.35s ease",
                    }} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

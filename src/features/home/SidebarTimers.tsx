"use client";

import type { CSSProperties } from "react";
import Panel from "../../components/Panel";
import type { AppTheme } from "../../components/themes";
import { STATUS, statusText } from "../../components/statusColors";
import { formatCountdown, formatCountdownDays, getNextReset } from "../../lib/time";
import { getUrsusStatus } from "../../lib/ursus";

const PLACEHOLDER_COUNTDOWN = "--:--:--";

const activeBadgeStyle: CSSProperties = {
  marginLeft: "auto",
  color: STATUS.success.on,
  background: STATUS.success.fill,
  letterSpacing: "0.05em",
};

const activeBadge = <span className="tool-badge" style={activeBadgeStyle}>ACTIVE</span>;

function timerRowStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.timerBg,
    borderRadius: "14px",
    padding: "1rem 1.25rem",
    border: `1px solid ${theme.border}`,
    transition: "background 0.35s, border-color 0.35s",
  };
}

const tzFormatter = new Intl.DateTimeFormat([], { timeZoneName: "short" });

export function UrsusPanel({ theme, now }: { theme: AppTheme; now: Date | null }) {
  const ursus = now ? getUrsusStatus(now) : null;
  let ursusCountdown = PLACEHOLDER_COUNTDOWN;
  if (ursus) {
    ursusCountdown = formatCountdown(ursus.active ? ursus.remaining : ursus.until);
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

  return (
    <Panel
      theme={theme}
      delay="0.25s"
      icon="🐻"
      title="Ursus 2× Meso"
      headerRight={ursus?.active && activeBadge}
    >
      <div style={{ padding: "0.75rem" }}>
        <div style={timerRowStyle(theme)}>
          <div className="section-label" style={{ color: theme.muted, marginBottom: "6px" }}>
            {ursus?.active ? "Ends In" : "Starts In"}
          </div>
          <div className="timer-countdown" style={{ color: theme.accentText }}>
            {ursusCountdown}
          </div>
        </div>
        {now && (
          <div style={{ marginTop: "0.6rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700, textAlign: "center" }}>
            {fmtLocal(1)} – {fmtLocal(5)} &amp; {fmtLocal(18)} – {fmtLocal(22)} {tzLabel}
          </div>
        )}
      </div>
    </Panel>
  );
}

const stripCellStyle: CSSProperties = {
  textAlign: "center",
  padding: "0 0.4rem",
  minWidth: 0,
};

const stripCountdownStyle: CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "clamp(0.8rem, 4.2vw, 1.1rem)",
  lineHeight: 1,
  letterSpacing: "0.03em",
  whiteSpace: "nowrap",
};

/** Compact Daily / Weekly / Ursus countdown row shown only when the sidebar
 *  timer panels are hidden (≤1200px); visibility lives in HomeDashboard CSS. */
export function MobileTimerStrip({ theme, now }: { theme: AppTheme; now: Date | null }) {
  const ursus = now ? getUrsusStatus(now) : null;
  let ursusCountdown = PLACEHOLDER_COUNTDOWN;
  if (ursus) {
    ursusCountdown = formatCountdown(ursus.active ? ursus.remaining : ursus.until);
  }
  const cells = [
    {
      key: "daily",
      label: "Daily",
      value: now ? formatCountdown(getNextReset(now, 0).getTime() - now.getTime()) : PLACEHOLDER_COUNTDOWN,
      active: false,
    },
    {
      key: "weekly",
      label: "Weekly",
      value: now ? formatCountdownDays(getNextReset(now, 0, 4).getTime() - now.getTime()) : PLACEHOLDER_COUNTDOWN,
      active: false,
    },
    {
      key: "ursus",
      label: ursus?.active ? "Ursus Ends" : "Ursus Starts",
      value: ursusCountdown,
      active: ursus?.active ?? false,
    },
  ];

  const stripStyle: CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "0.75rem 0.25rem",
    animationDelay: "0.15s",
    transition: "background 0.35s, border-color 0.35s",
  };

  return (
    <div className="dash-sec sec-timers mobile-timer-strip fade-in" style={stripStyle}>
      {cells.map((c, i) => (
        <div key={c.key} style={{ ...stripCellStyle, borderLeft: i > 0 ? `1px solid ${theme.border}` : undefined }}>
          <div className="section-label" style={{ color: theme.muted, marginBottom: "6px" }}>
            {c.label}
          </div>
          <div style={{ ...stripCountdownStyle, color: c.active ? statusText(theme, "success") : theme.accentText }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResetTimerPanels({ theme, now }: { theme: AppTheme; now: Date | null }) {
  const resets = now
    ? [
        { label: "Daily Reset", countdown: formatCountdown(getNextReset(now, 0).getTime() - now.getTime()) },
        { label: "Weekly Reset", countdown: formatCountdownDays(getNextReset(now, 0, 4).getTime() - now.getTime()) },
      ]
    : [
        { label: "Daily Reset", countdown: PLACEHOLDER_COUNTDOWN },
        { label: "Weekly Reset", countdown: PLACEHOLDER_COUNTDOWN },
      ];

  return (
    <Panel theme={theme} delay="0.2s" icon="⏱" title="Reset Timers">
      <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {resets.map((r) => (
          <div key={r.label} style={timerRowStyle(theme)}>
            <div className="section-label" style={{ color: theme.muted, marginBottom: "6px" }}>
              {r.label}
            </div>
            <div className="timer-countdown" style={{ color: theme.accentText }}>
              {r.countdown}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

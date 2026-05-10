"use client";

import Image from "next/image";
import type { AppTheme } from "./themes";
import { getUrsusStatus, utcDateStr } from "../lib/ursus";
import {
  REMINDER_DEFS,
  useRemindersState,
  type ReminderDef,
  type ReminderId,
} from "../lib/reminders";

function ReminderCard({
  theme,
  def,
  highlight,
  badge,
  subtitle,
  onDone,
}: {
  theme: AppTheme;
  def: ReminderDef;
  highlight: boolean;
  badge?: string;
  subtitle?: string;
  onDone: () => void;
}) {
  const borderColor = highlight ? "#10b981" : theme.border;
  const bg = highlight ? "rgba(16, 185, 129, 0.12)" : theme.timerBg;
  return (
    <div
      className="reminder-card"
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div style={{ fontSize: "1.4rem", flexShrink: 0, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {def.icon.startsWith("http") ? (
          <Image src={def.icon} alt="" width={24} height={24} className="block-img" />
        ) : (
          def.icon
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 800,
            fontSize: "0.88rem",
            color: theme.text,
          }}
        >
          {def.title}
          {badge && (
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                color: "#fff",
                background: "#10b981",
                padding: "2px 6px",
                borderRadius: 5,
                letterSpacing: "0.05em",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: theme.muted,
            fontWeight: 600,
            marginTop: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle ?? def.description}
        </div>
      </div>
      <button
        type="button"
        onClick={onDone}
        title="Mark as done for today"
        aria-label={`Mark ${def.title} as done for today`}
        className="reminder-done-btn"
        style={{
          border: `1px solid ${theme.accent}`,
          background: theme.accentSoft,
          color: theme.accent,
        }}
      >
        ✓
      </button>
    </div>
  );
}

export default function RemindersPanel({
  theme,
  now,
}: {
  theme: AppTheme;
  now: Date | null;
}) {
  const { mounted, state, markDone } = useRemindersState();

  const today = now ? utcDateStr(now) : null;
  const ursus = now ? getUrsusStatus(now) : null;

  const enabledIds: ReminderId[] = mounted
    ? REMINDER_DEFS.reduce<ReminderId[]>((acc, d) => {
        if (state.enabled[d.id]) {
          acc.push(d.id);
        }
        return acc;
      }, [])
    : [];
  const visibleIds: ReminderId[] = enabledIds.filter(
    (id) => state.dismissed[id] !== today,
  );

  if (enabledIds.length === 0) return null;

  const allComplete = visibleIds.length === 0;
  const ursusActive = !!ursus?.active;

  const subtitleFor = (id: ReminderId): string | undefined => {
    if (id !== "ursus" || !ursus) return undefined;
    if (ursus.active) return "2× meso window is active right now.";
    const hours = Math.floor(ursus.until / 3600000);
    const mins = Math.floor((ursus.until % 3600000) / 60000);
    return `Next 2× window in ${hours}h ${mins}m.`;
  };

  return (
    <div
      className="fade-in panel panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        marginBottom: "1.25rem",
      }}
    >
      <style>{`
        .reminder-done-btn { transition: transform 0.1s ease, background 0.15s ease; }
        .reminder-done-btn:hover { transform: translateY(-1px); background: ${theme.accent} !important; color: #fff !important; }
        .reminder-done-btn:active { transform: translateY(0); }
      `}</style>
      <div
        className="panel-header"
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        <span style={{ fontSize: "1.1rem" }}>🔔</span>
        <span className="panel-header-title" style={{ color: theme.text }}>
          Reminders
        </span>
      </div>

      <div style={{ padding: "0.85rem 1rem" }}>
        {allComplete ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.5rem 0.2rem",
              color: "#10b981",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>✓</span>
            <span>All reminders completed for today. Nice work!</span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.6rem",
              alignItems: "stretch",
            }}
          >
            {visibleIds.map((id) => {
              const def = REMINDER_DEFS.find((d) => d.id === id)!;
              const highlight = id === "ursus" && ursusActive;
              return (
                <ReminderCard
                  key={id}
                  theme={theme}
                  def={def}
                  highlight={highlight}
                  badge={highlight ? "2× ACTIVE" : undefined}
                  subtitle={subtitleFor(id)}
                  onDone={() => today && markDone(id, today)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

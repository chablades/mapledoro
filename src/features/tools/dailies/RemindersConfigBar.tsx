"use client";

import type { AppTheme } from "../../../components/themes";
import {
  REMINDER_DEFS,
  useRemindersState,
  type ReminderDef,
  type ReminderId,
} from "../../../lib/reminders";

function ToggleSwitch({
  theme,
  on,
  onChange,
  label,
}: {
  theme: AppTheme;
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: `1px solid ${on ? theme.accent : theme.border}`,
        background: on ? theme.accent : theme.timerBg,
        position: "relative",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          transition: "left 0.15s",
        }}
      />
    </button>
  );
}

function ReminderToggleRow({
  theme,
  def,
  enabled,
  onToggle,
}: {
  theme: AppTheme;
  def: ReminderDef;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.6rem 0.8rem",
        borderRadius: 10,
        background: enabled ? theme.accentSoft : theme.timerBg,
        border: `1px solid ${enabled ? theme.accent : theme.border}`,
        flex: "1 1 240px",
        minWidth: 240,
      }}
    >
      <span style={{ fontSize: "1.2rem", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24 }}>
        {def.icon.startsWith("http") ? (
          <img src={def.icon} alt="" width={20} height={20} style={{ display: "block" }} />
        ) : (
          def.icon
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.82rem",
            fontWeight: 800,
            color: theme.text,
          }}
        >
          {def.title}
        </div>
        <div
          style={{
            fontSize: "0.7rem",
            color: theme.muted,
            fontWeight: 600,
            marginTop: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {def.description}
        </div>
      </div>
      <ToggleSwitch theme={theme} on={enabled} onChange={onToggle} label={def.title} />
    </div>
  );
}

export default function RemindersConfigBar({ theme }: { theme: AppTheme }) {
  const { mounted, state, toggleEnabled } = useRemindersState();

  const enabledFor = (id: ReminderId) => (mounted ? state.enabled[id] : false);

  return (
    <div
      className="panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        padding: "0.9rem 1rem",
        marginBottom: "1.25rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.6rem",
        }}
      >
        <span style={{ fontSize: "1rem" }}>🔔</span>
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 800,
            color: theme.text,
          }}
        >
          Home Reminders
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            color: theme.muted,
            fontWeight: 600,
          }}
        >
          — Toggle what appears on the home page each day.
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.6rem",
        }}
      >
        {REMINDER_DEFS.map((def) => (
          <ReminderToggleRow
            key={def.id}
            theme={theme}
            def={def}
            enabled={enabledFor(def.id)}
            onToggle={() => toggleEnabled(def.id)}
          />
        ))}
      </div>
    </div>
  );
}

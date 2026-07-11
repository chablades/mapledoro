"use client";

import type { AppTheme } from "../../../components/themes";
import { ItemIcon } from "../../../components/ResourceImage";
import {
  REMINDER_DEFS,
  useRemindersState,
  type ReminderDef,
} from "../../../lib/reminders";

function reminderItemStyle(
  theme: AppTheme,
  done: boolean,
): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "5px 8px",
    borderRadius: "8px",
    cursor: "pointer",
    background: done ? theme.accentSoft : theme.timerBg,
    border: `1px solid ${done ? theme.accent : theme.border}`,
    fontSize: "0.75rem",
    fontWeight: 700,
    color: done ? theme.accentText : theme.text,
    userSelect: "none",
    transition: "background 0.15s, border-color 0.15s",
  };
}

function ReminderCheckItem({
  theme,
  def,
  done,
  onToggle,
}: {
  theme: AppTheme;
  def: ReminderDef;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <label style={reminderItemStyle(theme, done)}>
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        style={{ accentColor: theme.accent, cursor: "pointer" }}
      />
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {"itemId" in def ? (
          <ItemIcon id={def.itemId} size={16} />
        ) : (
          <span style={{ fontSize: "0.82rem" }}>{def.icon}</span>
        )}
        <span style={{ textDecoration: done ? "line-through" : "none" }}>
          {def.title}
        </span>
      </span>
    </label>
  );
}

export default function RemindersConfigBar({ theme }: { theme: AppTheme }) {
  const { mounted, isCompleted, toggleCompleted } = useRemindersState();

  if (!mounted) return null;

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
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: theme.muted,
            marginRight: "0.25rem",
          }}
        >
          Account-wide Dailies
        </span>
        {REMINDER_DEFS.map((def) => (
          <ReminderCheckItem
            key={def.id}
            theme={theme}
            def={def}
            done={isCompleted(def.id)}
            onToggle={() => toggleCompleted(def.id)}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import type { CSSProperties } from "react";
import type { AppTheme } from "../../components/themes";
import { statusText } from "../../components/statusColors";

// Shared "character card" chrome for the manually-populated trackers (Boss
// Crystals, Dailies): one drag handle plus a delete / edit / mark-all cluster,
// with a single icon set so the two tools read identically. The card body above
// this stays tool-specific.

function actionBtnStyle(theme: AppTheme, active = false): CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: `1px solid ${active ? theme.accent : theme.border}`,
    background: active ? theme.accentSoft : theme.timerBg,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    flexShrink: 0,
  };
}

function GripIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill={color} aria-hidden="true">
      <path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm9-14a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
    </svg>
  );
}

function RemoveIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill={color} aria-hidden="true">
      <path d="M18.3 5.71a1 1 0 0 0-1.42 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z" />
    </svg>
  );
}

function EditIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill={color} aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function CheckAllIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill={color} aria-hidden="true">
      <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
    </svg>
  );
}

/** Grab handle. Mouse drag still works from the card body (the whole card is
 *  `draggable`); this gives the affordance a home and, crucially, a keyboard
 *  path: arrow keys move the card, Home/End send it to the ends. Works in
 *  display-position space (`pos` / `total`); the parent maps a target position
 *  onto whatever index its reorder expects. */
function DragHandle({
  theme,
  pos,
  total,
  onMove,
  label,
}: {
  theme: AppTheme;
  pos: number;
  total: number;
  onMove: (toPos: number) => void;
  label: string;
}) {
  const move = (to: number) => {
    if (to < 0 || to >= total || to === pos) return;
    onMove(to);
  };
  return (
    <button
      type="button"
      className="btn-reset"
      aria-label={`Reorder ${label}. Use arrow keys to move.`}
      title="Drag to reorder"
      onKeyDown={(e) => {
        switch (e.key) {
          case "ArrowUp":
          case "ArrowLeft":
            e.preventDefault();
            move(pos - 1);
            break;
          case "ArrowDown":
          case "ArrowRight":
            e.preventDefault();
            move(pos + 1);
            break;
          case "Home":
            e.preventDefault();
            move(0);
            break;
          case "End":
            e.preventDefault();
            move(total - 1);
            break;
          default:
            break;
        }
      }}
      style={{ ...actionBtnStyle(theme), cursor: "grab" }}
    >
      <GripIcon color={theme.muted} />
    </button>
  );
}

/** Delete / edit / mark-all cluster, shared so both trackers use one icon set.
 *  `pos` / `total` / `onMove` drive the drag handle's keyboard reordering in
 *  display order. */
export function CardActions({
  theme,
  pos,
  total,
  onMove,
  label,
  onDelete,
  onEdit,
  editTitle,
  allDone,
  onToggleAll,
  toggleOnTitle,
  toggleOffTitle,
}: {
  theme: AppTheme;
  pos: number;
  total: number;
  onMove: (toPos: number) => void;
  label: string;
  onDelete: () => void;
  onEdit: () => void;
  editTitle: string;
  allDone: boolean;
  onToggleAll: (next: boolean) => void;
  toggleOnTitle: string;
  toggleOffTitle: string;
}) {
  return (
    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
      <DragHandle theme={theme} pos={pos} total={total} onMove={onMove} label={label} />
      <button
        type="button"
        className="btn-reset"
        onClick={onDelete}
        title="Remove character"
        aria-label="Remove character"
        style={actionBtnStyle(theme)}
      >
        <RemoveIcon color={statusText(theme, "danger")} />
      </button>
      <button
        type="button"
        className="btn-reset"
        onClick={onEdit}
        title={editTitle}
        aria-label={editTitle}
        style={actionBtnStyle(theme)}
      >
        <EditIcon color={theme.muted} />
      </button>
      <button
        type="button"
        className="btn-reset"
        aria-pressed={allDone}
        onClick={() => onToggleAll(!allDone)}
        title={allDone ? toggleOffTitle : toggleOnTitle}
        aria-label={allDone ? toggleOffTitle : toggleOnTitle}
        style={actionBtnStyle(theme, allDone)}
      >
        <CheckAllIcon color={allDone ? theme.accentText : theme.muted} />
      </button>
    </div>
  );
}

"use client";

import type { CSSProperties } from "react";
import type { AppTheme } from "../../components/themes";

function addCardStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.timerBg,
    border: `2px dashed ${theme.border}`,
    borderRadius: "14px",
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  };
}

/** Dashed "+ Add character" card that sits in the card grid of the trackers
 *  whose characters are added manually (Boss Crystals, Dailies). */
export function AddCharacterCard({
  theme,
  onClick,
  label = "Add character",
}: {
  theme: AppTheme;
  onClick: () => void;
  label?: string;
}) {
  return (
    <>
      <style>{`
        .tool-add-card { transition: border-color 0.15s, background 0.15s; cursor: pointer; }
        .tool-add-card:hover { border-color: ${theme.accent} !important; background: ${theme.accentSoft} !important; }
      `}</style>
      <button
        type="button"
        className="btn-reset fade-in tool-add-card panel-card"
        onClick={onClick}
        title={label}
        style={addCardStyle(theme)}
      >
        <svg viewBox="0 0 24 24" width="36" height="36" fill={theme.muted}>
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
        <span
          style={{
            fontSize: "0.82rem",
            fontWeight: 700,
            color: theme.muted,
            marginTop: "0.5rem",
          }}
        >
          {label}
        </span>
      </button>
    </>
  );
}

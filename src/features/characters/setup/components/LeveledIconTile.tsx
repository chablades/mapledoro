"use client";

import type { CSSProperties, ReactNode } from "react";
import { numericKeyDown } from "../../../../lib/inputUtils";
import type { AppTheme } from "../../../../components/themes";
import HoverTooltip from "../../../../components/HoverTooltip";

const leveledIconTileStyle = (theme: AppTheme, active: boolean): CSSProperties => ({
  width: 68, flexShrink: 0,
  border: `1px solid ${active ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: active ? `${theme.accent}15` : theme.bg,
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "7px 6px", boxSizing: "border-box",
});

const leveledIconTileInputStyle = (theme: AppTheme): CSSProperties => ({
  width: 44, textAlign: "center",
  border: `1px solid ${theme.border}`, borderRadius: 6,
  background: theme.bg, color: theme.text,
  fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem",
  padding: "0.2rem", boxSizing: "border-box",
});

/**
 * Shared icon + level-input tile used across the HEXA Matrix, V Matrix, Oz Rings, and
 * Buffs setup steps. Dims/greyscales the icon and shows the full name via tooltip when
 * level is 0. Callers own clamping the value before it reaches storage.
 */
export function LeveledIconTile({ icon, name, level, onLevel, max, min = 0, theme }: {
  icon: ReactNode;
  name: string;
  level: string;
  onLevel: (val: string) => void;
  max: number;
  min?: number;
  theme: AppTheme;
}) {
  const active = (Number.parseInt(level || "0", 10) || 0) > 0;
  return (
    <div style={leveledIconTileStyle(theme, active)}>
      <HoverTooltip label={name} theme={theme}>
        <div style={{ opacity: active ? 1 : 0.35, filter: active ? "none" : "grayscale(1)", lineHeight: 0 }}>
          {icon}
        </div>
      </HoverTooltip>
      <input
        type="number"
        className="no-spinner"
        min={min}
        max={max}
        aria-label={`${name} level`}
        value={level}
        placeholder={String(min)}
        onChange={(e) => onLevel(e.target.value)}
        onKeyDown={numericKeyDown}
        style={leveledIconTileInputStyle(theme)}
      />
    </div>
  );
}

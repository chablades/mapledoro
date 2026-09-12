"use client";

import type { CSSProperties, ReactNode } from "react";
import type { AppTheme } from "../../../../components/themes";
import { CopyFromPreset } from "./CopyFromPreset";

/** Numbered preset tab. `accentOn` (not a hardcoded white) is the ink that stays
 *  readable on whichever accent fills the active tab, per the accent/accentText/
 *  accentOn split documented in themes.ts. .tap-target-44 (globals.css) grows the
 *  clickable area to the WCAG 2.5.5 minimum without changing the visible box. */
const presetButtonStyle = (theme: AppTheme, on: boolean): CSSProperties => ({
  border: `1px solid ${on ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: on ? theme.accent : theme.bg,
  color: on ? theme.accentOn : theme.text,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
  width: 32, height: 32, cursor: "pointer",
});

const labelStyle = (theme: AppTheme): CSSProperties => ({
  fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase",
  letterSpacing: "0.05em", color: theme.muted,
});

const footerRowStyle: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  flexWrap: "wrap", gap: 6,
};

/** "Preset 1 2 3" tab bar shared by the equipment, Inner Ability and Hyper Stat
 *  steps, each of which owns its own preset count and storage.
 *
 *  Pass onCopy to get the copy/clear footer below the tabs; the equipment step
 *  omits it and renders tabs alone. `trailing` puts a node opposite that footer
 *  (Hyper Stat's points-used counter) and needs onCopy to have a row to sit in. */
export function PresetBar({ theme, count, active, onSwitch, onCopy, onClear, trailing }: {
  theme: AppTheme;
  count: number;
  active: number;
  onSwitch: (n: number) => void;
  onCopy?: (from: number) => void;
  onClear?: () => void;
  trailing?: ReactNode;
}) {
  const indices = Array.from({ length: count }, (_, i) => i);
  const footer = onCopy ? (
    <CopyFromPreset theme={theme} count={count} active={active} onCopy={onCopy} onClear={onClear} />
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={labelStyle(theme)}>Preset</span>
        <div style={{ display: "flex", gap: 4 }}>
          {indices.map((i) => (
            <button
              key={i}
              type="button"
              className="tap-target-44"
              onClick={() => onSwitch(i)}
              style={presetButtonStyle(theme, i === active)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      {trailing ? <div style={footerRowStyle}>{footer}{trailing}</div> : footer}
    </div>
  );
}

"use client";

// A flame shown the way the game's Bonus Stats panel lists it with Details on: tier badge, stat,
// value. Shared by the Enhancements window and the gear tooltips.

import type { CSSProperties } from "react";
import type { AppTheme } from "../../../../components/themes";
import { STATUS, statusText } from "../../../../components/statusColors";
import { FLAME_LINES, flameTotalLabels, flameValue, formatFlameValue, totalsOf, type FlameItemInfo, type StoredFlameLine } from "../data/flameData";

// The tier number in a small square, like the game's teal flame tier marks.
const tierBadgeStyle: CSSProperties = {
  width: 18, height: 18, borderRadius: 4, display: "grid", placeItems: "center", flexShrink: 0,
  fontSize: "0.75rem", fontWeight: 800, background: STATUS.success.fill, color: STATUS.success.on,
};

const switchButtonStyle = (theme: AppTheme): CSSProperties => ({
  all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, padding: "2px 4px",
  borderRadius: 6, fontSize: "0.8rem", fontWeight: 800, color: theme.text,
});

const switchTrackStyle = (theme: AppTheme, on: boolean): CSSProperties => ({
  position: "relative", width: 32, height: 18, borderRadius: 9, transition: "background 0.15s ease",
  background: on ? theme.accent : theme.border,
});

const switchKnobStyle = (theme: AppTheme, on: boolean): CSSProperties => ({
  position: "absolute", top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: "50%",
  transition: "left 0.15s ease", background: on ? theme.accentOn : theme.panel,
});

/** The game's Details switch: on lists each line and tier, off the summed stats. */
export function DetailsSwitch({ theme, on, onToggle, label = "Details" }: {
  theme: AppTheme; on: boolean; onToggle: () => void;
  /** "Details" beside the Flame heading; somewhere without one, say what it's for. */
  label?: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} style={switchButtonStyle(theme)}>
      {label}
      <span aria-hidden="true" style={switchTrackStyle(theme, on)}>
        <span style={switchKnobStyle(theme, on)} />
      </span>
    </button>
  );
}

/** A flame's summed stats, as the game's hover tooltip and Details-off panel show it. */
export function FlameTotals({ theme, info, lines }: { theme: AppTheme; info: FlameItemInfo; lines: StoredFlameLine[] }) {
  const totals = totalsOf(lines, info);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {flameTotalLabels(info).filter((label) => totals[label]).map((label) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", fontWeight: 700 }}>
          <span>{label}</span>
          <span style={{ color: statusText(theme, "success"), fontWeight: 800 }}>
            +{totals[label]}{PERCENT_STATS.has(label) ? "%" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

const PERCENT_STATS = new Set(["All Stats", "Boss Damage", "Damage"]);

export function TierBadge({ tier }: { tier: number }) {
  return <span aria-hidden="true" style={tierBadgeStyle}>{tier}</span>;
}

export default function FlameLines({ theme, info, lines }: { theme: AppTheme; info: FlameItemInfo; lines: StoredFlameLine[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lines.filter(({ line }) => FLAME_LINES[line]).map(({ line, tier }) => (
        <div key={line} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", fontWeight: 700 }}>
          <TierBadge tier={tier} />
          <span>{FLAME_LINES[line].label}</span>
          <span style={{ color: statusText(theme, "success"), fontWeight: 800 }}>{formatFlameValue(line, flameValue(line, tier, info))}</span>
        </div>
      ))}
    </div>
  );
}

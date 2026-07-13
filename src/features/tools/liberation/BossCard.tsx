"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { alpha, type AppTheme } from "../../../components/themes";
import { ToolNumberInput } from "../shared-ui";

/** The shape both Liberation and Astra bosses share. Astra difficulties add a
 *  voucher marker; Liberation bosses add a monthly reset. */
export interface BossCardDifficulty {
  label: string;
  traces: number;
  hasVoucher?: boolean;
}

const cardBase: CSSProperties = {
  borderRadius: "14px",
  padding: "1rem",
  transition: "border-color 0.15s",
};

const iconStyle: CSSProperties = {
  borderRadius: "8px",
  objectFit: "cover",
  flexShrink: 0,
};

const controlRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  flexWrap: "wrap",
  transition: "opacity 0.15s",
};

const affixStyle: CSSProperties = { fontSize: "0.75rem", fontWeight: 700 };

/** Difficulty pill. `accent` is a fill, never ink: the label takes `accentText`
 *  on the soft tint so it stays readable in both color modes. */
function pillStyle(theme: AppTheme, active: boolean): CSSProperties {
  return {
    color: active ? theme.accentText : theme.muted,
    background: active ? theme.accentSoft : "transparent",
    border: active ? "none" : `1px solid ${theme.border}`,
  };
}

export function BossCard({
  name,
  icon,
  difficulties,
  maxParty,
  difficultyIdx,
  partySize,
  clearedThisWeek,
  traces,
  resetLabel,
  theme,
  inputStyle,
  onDifficultyChange,
  onPartySizeChange,
  onClearedChange,
  children,
}: {
  name: string;
  icon: string;
  difficulties: BossCardDifficulty[];
  maxParty: number;
  difficultyIdx: number | null;
  partySize: number;
  clearedThisWeek: boolean;
  traces: number;
  resetLabel: "week" | "month";
  theme: AppTheme;
  inputStyle: CSSProperties;
  onDifficultyChange: (diffIdx: number | null) => void;
  onPartySizeChange: (size: number) => void;
  onClearedChange: (cleared: boolean) => void;
  /** Extra controls in the bottom row (Astra's voucher input). */
  children?: ReactNode;
}) {
  const uid = useId();
  const partyId = `${uid}-party`;
  const isActive = difficultyIdx !== null;
  const cleared = clearedThisWeek && isActive;

  return (
    <div
      style={{
        ...cardBase,
        background: theme.timerBg,
        border: `1px solid ${isActive ? alpha(theme.accent, 0.33) : theme.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.6rem" }}>
        <Image
          src={icon}
          alt=""
          width={38}
          height={38}
          unoptimized
          style={{ ...iconStyle, background: theme.panel, border: `1px solid ${theme.border}` }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", margin: 0, color: theme.text }}>
            {name}
          </h3>
        </div>
        {isActive && (
          <div className="tool-badge" style={{ color: theme.accentText, background: theme.accentSoft }}>
            +{traces} / {resetLabel}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "0.6rem" }}>
        {difficulties.map((diff, di) => (
          <button
            key={diff.label}
            type="button"
            className="btn-reset pill-btn"
            aria-pressed={difficultyIdx === di}
            onClick={() => onDifficultyChange(difficultyIdx === di ? null : di)}
            style={pillStyle(theme, difficultyIdx === di)}
          >
            {diff.label} ({diff.traces}){diff.hasVoucher && " ★"}
          </button>
        ))}
      </div>

      <div style={{ ...controlRowStyle, opacity: isActive ? 1 : 0.4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <label htmlFor={partyId} style={{ ...affixStyle, color: theme.muted }}>Party</label>
          <ToolNumberInput
            id={partyId}
            min={1}
            max={maxParty}
            integer
            value={partySize}
            disabled={!isActive}
            onCommit={onPartySizeChange}
            style={{ ...inputStyle, width: "48px", textAlign: "center", padding: "4px 6px", fontSize: "0.75rem", cursor: isActive ? "text" : "not-allowed" }}
          />
        </div>

        <button
          type="button"
          className="btn-reset tool-btn tool-chip-btn"
          disabled={!isActive}
          aria-pressed={cleared}
          onClick={() => onClearedChange(!clearedThisWeek)}
          style={{
            cursor: isActive ? "pointer" : "not-allowed",
            color: cleared ? theme.accentText : theme.muted,
            background: cleared ? theme.accentSoft : "transparent",
            border: `1px solid ${cleared ? alpha(theme.accent, 0.27) : theme.border}`,
          }}
        >
          {cleared ? "Cleared" : "Not cleared"}
        </button>

        {children}
      </div>
    </div>
  );
}

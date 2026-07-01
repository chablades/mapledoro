/*
  Shared question-input primitives used by the Stats step's questionnaire and the
  Legion Artifacts step (both flow-aware Stats' scouter block and full_setup's
  standalone step need the same toggle/field controls).
*/
"use client";

import { Fragment, type CSSProperties } from "react";
import { numericKeyDown } from "../../../../lib/inputUtils";
import type { AppTheme } from "../../../../components/themes";
import InfoTooltip, { type TooltipContent } from "./InfoTooltip";
import { LEGION_ARTIFACT_FINAL_ATK_LIMIT } from "../data/scouterQuestionsData";

export function statInputStyle(theme: AppTheme, width?: string): CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    borderRadius: "7px",
    background: theme.bg,
    color: theme.text,
    fontFamily: "inherit",
    fontSize: "0.82rem",
    fontWeight: 600,
    padding: "0.3rem 0.4rem",
    outline: "2px solid transparent",
    outlineOffset: "2px",
    transition: "outline-color 0.15s ease",
    width: width ?? "100%",
    minWidth: 0,
    boxSizing: "border-box" as const,
  };
}

// Unit suffix ("%", "s", …) rendered inside a stat input box, anchored to its right
// edge. Keeps the input as the full visual box; pointer-events off so clicks reach it.
export function inputSuffixStyle(theme: AppTheme): CSSProperties {
  return {
    position: "absolute",
    right: "0.45rem",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "0.75rem",
    color: theme.muted,
    fontWeight: 700,
    pointerEvents: "none",
  };
}

export function questionOptionButtonStyle(theme: AppTheme, active: boolean, hasSublabel: boolean): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: hasSublabel ? "0.1rem" : 0,
    border: `1px solid ${active ? theme.accent : theme.border}`,
    borderRadius: "9px",
    background: active ? `${theme.accent}22` : theme.bg,
    color: active ? theme.accent : theme.text,
    fontFamily: "inherit",
    fontWeight: 800,
    fontSize: "0.85rem",
    lineHeight: 1.15,
    padding: "0.4rem 0.85rem",
    cursor: "pointer",
  };
}

export function QuestionToggle({
  question, options, value, onToggle, theme, tooltip,
}: {
  question: string;
  options: { value: string; label: string; sublabel?: string; optOut?: boolean }[];
  value: string | null;
  /** Clicking the active option deselects it (returns null). */
  onToggle: (value: string | null) => void;
  theme: AppTheme;
  tooltip?: TooltipContent;
}) {
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem" }}>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 800, color: theme.text }}>
          {question}
        </p>
        {tooltip && <InfoTooltip content={tooltip} theme={theme} />}
      </div>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {options.map((opt) => {
          const active = value === opt.value;
          // The opt-out reads as a distinct choice through its descriptive wording
          // ("No soul weapon", etc.) and its own row, not special chrome.
          return (
            <Fragment key={opt.value}>
              {opt.optOut && <div aria-hidden style={{ flexBasis: "100%", height: 0 }} />}
              <button
                type="button"
                onClick={() => onToggle(active ? null : opt.value)}
                style={questionOptionButtonStyle(theme, active, Boolean(opt.sublabel))}
              >
                <span>{opt.label}</span>
                {opt.sublabel && (
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, opacity: 0.7 }}>{opt.sublabel}</span>
                )}
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

const BOOL_TOGGLE_OPTIONS = [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }];
export function BoolToggle({ question, value, onToggle, theme, tooltip }: {
  question: string;
  value: boolean | undefined;
  onToggle: (value: boolean | undefined) => void;
  theme: AppTheme;
  tooltip?: TooltipContent;
}) {
  const strValue = value === true ? "yes" : null;
  const finalValue = value === false ? "no" : strValue;
  return (
    <QuestionToggle
      question={question}
      options={BOOL_TOGGLE_OPTIONS}
      value={finalValue}
      onToggle={(v) => {
        if (v === "yes") onToggle(true);
        else if (v === "no") onToggle(false);
        else onToggle(undefined);
      }}
      theme={theme}
      tooltip={tooltip}
    />
  );
}

// Keeps the Final Attack Skill % field digits-only and hard-capped at the artifact max,
// so a user can never see an out-of-range value stick.
function clampFinalAttackInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return String(Math.min(Number(digits), LEGION_ARTIFACT_FINAL_ATK_LIMIT));
}

// A labeled numeric row (mirrors WeaponAttField) for the Final Attack Skill artifact.
export function LegionFinalAttackField({ value, onUpdate, theme }: {
  value: string;
  onUpdate: (val: string) => void;
  theme: AppTheme;
}) {
  const label = "Final Attack Skill Damage";
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem" }}>
        <span style={{ fontSize: "0.88rem", fontWeight: 800, color: theme.text }}>{label}</span>
        <InfoTooltip
          content={{
            title: label,
            description: `Found in your Legion window, in the Artifacts tab. Enter the total for the stat "Damage of Final Attack Skills" (up to ${LEGION_ARTIFACT_FINAL_ATK_LIMIT}%).`,
          }}
          theme={theme}
        />
      </div>
      <div style={{ position: "relative", width: "5rem" }}>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={value}
          placeholder="0"
          style={{ ...statInputStyle(theme, "100%"), paddingRight: "1.15rem" }}
          onChange={(e) => onUpdate(clampFinalAttackInput(e.target.value))}
          onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
          onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
          onKeyDown={numericKeyDown}
        />
        <span style={inputSuffixStyle(theme)}>%</span>
      </div>
    </div>
  );
}

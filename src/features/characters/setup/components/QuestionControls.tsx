/*
  Shared question-input primitives used by the Stats step's questionnaire and the
  Legion Artifacts step (both flow-aware Stats' scouter block and full_setup's
  standalone step need the same toggle/field controls).
*/
"use client";

import { Fragment, type CSSProperties } from "react";
import { numericKeyDown, sanitizeDigitsInput, clampNumber } from "../../../../lib/inputUtils";
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

// A floating callout anchored above a stat input, warning that a typed value looks
// like the wrong kind of number for this field (e.g. a Total stat instead of Base).
// The input's wrapper needs `position: relative` for this to anchor correctly.
function inputWarningBubbleStyle(theme: AppTheme): CSSProperties {
  return {
    position: "absolute",
    bottom: "calc(100% + 0.4rem)",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    background: theme.bg,
    border: "1px solid rgba(217, 119, 6, 0.6)",
    color: "#d97706",
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.35rem 0.55rem",
    borderRadius: "7px",
    width: "max-content",
    maxWidth: "170px",
    textAlign: "center",
    lineHeight: 1.3,
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
    pointerEvents: "none",
  };
}

export function InputWarningBubble({ message, theme }: { message: string; theme: AppTheme }) {
  return (
    <div role="alert" style={inputWarningBubbleStyle(theme)}>
      {message}
    </div>
  );
}

// Jumps to whatever a "fix the flagged value" message is actually pointing at, since on
// a long step that field can easily be scrolled out of view by the time the message
// appears. Finds the first field marked `data-flagged-field="true"` — either an actual
// bad value (next to its InputWarningBubble) or, in flows like MapleScouter where every
// field must be filled, the first still-blank required field. No-op if none is present.
export function scrollToFlaggedField(container: HTMLElement | null) {
  if (!container) return;
  const target = container.querySelector<HTMLElement>('[data-flagged-field="true"]');
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("jump-highlight");
  window.setTimeout(() => target.classList.remove("jump-highlight"), 1100);
}

// "Fix the flagged value above" link button that triggers scrollToFlaggedField, shared
// between Stats and Oz Rings (both can end a step with an unresolved flagged field).
export function flaggedValueLinkStyle(theme: AppTheme): CSSProperties {
  return {
    display: "block", margin: "0.75rem 0 0", padding: 0,
    background: "none", border: "none", font: "inherit", textAlign: "left",
    fontSize: "0.78rem", fontWeight: 700, color: theme.muted, cursor: "pointer",
    textDecoration: "underline", textUnderlineOffset: "2px",
  };
}

// ── Checklist-style question controls ──────────────────────────────────────────
// Traits render as checkbox rows in a flat list rather than competing pill buttons,
// so a "none of these" answer reads as one more line item, not a peer choice.

// `trailingPadding` spaces a row out from whatever follows it inline. ChecklistGroup's
// option buttons need it (so wrapped options don't crowd each other); ChecklistCheckbox
// doesn't, since its tooltip sits right after with its own gap — keeping both would
// double up and push the tooltip noticeably further from the label than on a
// ChecklistGroup question.
function checklistRowStyle(theme: AppTheme, trailingPadding = "0.6rem"): CSSProperties {
  return {
    display: "inline-grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "start",
    textAlign: "left",
    minWidth: 0,
    gap: "0.45rem",
    border: "none",
    background: "none",
    padding: `0.3rem ${trailingPadding} 0.3rem 0`,
    font: "inherit",
    cursor: "pointer",
    color: theme.text,
  };
}

// Square box for a true multi-select trait (ChecklistItem) — any number of these can
// be checked at once.
function checklistBoxStyle(theme: AppTheme, checked: boolean): CSSProperties {
  return {
    flexShrink: 0,
    width: "1.05rem",
    height: "1.05rem",
    borderRadius: "4px",
    border: `1.5px solid ${checked ? theme.accent : theme.border}`,
    background: checked ? `${theme.accent}22` : theme.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

// Round radio dot for a pick-one group (ChecklistGroup) — picking one option in the
// group clears any other, so it reads as a radio rather than a checkbox at a glance.
function checklistRadioStyle(theme: AppTheme, active: boolean): CSSProperties {
  return {
    flexShrink: 0,
    width: "1.05rem",
    height: "1.05rem",
    borderRadius: "50%",
    border: `1.5px solid ${active ? theme.accent : theme.border}`,
    background: theme.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function checklistMarkStyle(color: string): CSSProperties {
  return { fontSize: "0.72rem", fontWeight: 900, lineHeight: 1, color };
}

function checklistRadioDotStyle(theme: AppTheme): CSSProperties {
  return { width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: theme.accent };
}

function RequiredMark({ theme }: { theme: AppTheme }) {
  return <span style={{ color: theme.accent, fontWeight: 900, marginLeft: "0.15rem" }}>*</span>;
}

// A plain yes/no checkbox — click just toggles checked/unchecked, like any normal
// checkbox. Before the first click `checked` is undefined (never answered), which
// renders identically to unchecked but is preserved as a distinct "unknown" value in
// storage if the question is never touched (e.g. full_setup, which stays optional).
// Once clicked, it only ever alternates true/false — there's no way back to
// "unanswered" from the UI, since nothing downstream needs to re-create that state.
export function ChecklistCheckbox({ label, checked, onToggle, theme, tooltip, required }: {
  label: string;
  checked: boolean | undefined;
  onToggle: (checked: boolean) => void;
  theme: AppTheme;
  tooltip?: TooltipContent;
  required?: boolean;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked === true}
      tabIndex={0}
      onClick={() => onToggle(!checked)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(!checked);
        }
      }}
      style={{ ...checklistRowStyle(theme, "0"), display: "grid", marginBottom: "0.15rem" }}
    >
      <span style={checklistBoxStyle(theme, checked === true)}>
        {checked === true && <span style={checklistMarkStyle(theme.accent)}>✓</span>}
      </span>
      <span style={{ fontSize: "0.88rem", fontWeight: 800 }}>
        {label}
        {required && <RequiredMark theme={theme} />}
        {tooltip && (
          <>
            {" "}
            <span
              style={{ display: "inline-flex", verticalAlign: "middle" }}
              onClick={(e) => e.stopPropagation()}
            >
              <InfoTooltip content={tooltip} theme={theme} />
            </span>
          </>
        )}
      </span>
    </div>
  );
}

// A mutually-exclusive pick list (soul type, Wild Hunter rank bracket, Inner Ability
// line, weapon hand, ...). "None"/"Neither" is a real option here (not a specially
// chromed opt-out), just flagged `standalone` to break onto its own line so it reads
// as "none of the above" rather than blending into the real choices.
export function ChecklistGroup({ question, options, value, onToggle, theme, tooltip, required, disabled }: {
  question: string;
  options: { value: string; label: string; sublabel?: string; standalone?: boolean }[];
  value: string | null;
  /** Clicking the active option deselects it (returns null). */
  onToggle: (value: string | null) => void;
  theme: AppTheme;
  tooltip?: TooltipContent;
  required?: boolean;
  /** Locks the group to its current value (e.g. a derived Wild Hunter rank) — options
   *  still render for context, but none of them are clickable. */
  disabled?: boolean;
}) {
  return (
    <div style={{ marginTop: "0.6rem", marginBottom: "0.9rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.3rem" }}>
        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 800, color: theme.muted }}>
          {question}
          {required && <RequiredMark theme={theme} />}
        </p>
        {tooltip && <InfoTooltip content={tooltip} theme={theme} />}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <Fragment key={opt.value}>
              {opt.standalone && <div aria-hidden style={{ flexBasis: "100%", height: 0 }} />}
              <button
                type="button"
                disabled={disabled}
                onClick={() => onToggle(active ? null : opt.value)}
                style={{ ...checklistRowStyle(theme), ...(disabled ? { cursor: "default" } : {}) }}
              >
                <span style={checklistRadioStyle(theme, active)}>
                  {active && <span style={checklistRadioDotStyle(theme)} />}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: theme.text }}>
                  {opt.label}
                  {opt.sublabel && (
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}> ({opt.sublabel})</span>
                  )}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// Keeps the Final Attack Skill % field digits-only and hard-capped at the artifact max,
// so a user can never see an out-of-range value stick. Empty stays empty rather than
// snapping to "0" so an unanswered field still reads that way.
function clampFinalAttackInput(raw: string): string {
  const digits = sanitizeDigitsInput(raw);
  if (digits === "") return "";
  return String(clampNumber(Number(digits), LEGION_ARTIFACT_FINAL_ATK_LIMIT));
}

// A labeled numeric row (mirrors WeaponAttField) for the Final Attack Skill artifact.
export function LegionFinalAttackField({ value, onUpdate, theme, required }: {
  value: string;
  onUpdate: (val: string) => void;
  theme: AppTheme;
  required?: boolean;
}) {
  const label = "Final Attack Skill Damage";
  return (
    <div style={{ marginTop: "0.6rem", marginBottom: "0.9rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.4rem" }}>
        <span style={{ fontSize: "0.88rem", fontWeight: 800, color: theme.muted }}>
          {label}
          {required && <RequiredMark theme={theme} />}
        </span>
        <InfoTooltip
          content={{
            title: label,
            description: <>Found in your Legion window, in the Artifacts tab. Assigning the <strong>Increases Damage of Final Attack Skill</strong> stat to a crystal grants <strong>Final Attack Skill Damage</strong>, listed under Artifact Bonuses. Enter the total for this stat (up to {LEGION_ARTIFACT_FINAL_ATK_LIMIT}%).</>,
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

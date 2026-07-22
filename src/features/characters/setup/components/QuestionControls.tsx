/*
  Shared question-input primitives used by the Stats step's questionnaire and the
  Legion Artifacts step (both flow-aware Stats' scouter block and full_setup's
  standalone step need the same toggle/field controls).
*/
"use client";

import { Fragment, type CSSProperties } from "react";
import { numericKeyDown, sanitizeDigitsInput, clampNumber } from "../../../../lib/inputUtils";
import type { AppTheme } from "../../../../components/themes";
import InfoTooltip, { LockGlyph, type TooltipContent } from "./InfoTooltip";
import { LEGION_ARTIFACT_FINAL_ATK_LIMIT } from "../data/scouterQuestionsData";
import { statusText } from "../../../../components/statusColors";

// react-doctor-disable-next-line only-export-components -- intentionally grouped with the components that use it; not worth fragmenting the file just to buy back Fast Refresh (dev-only)
export function statInputStyle(theme: AppTheme, width?: string): CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
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
// react-doctor-disable-next-line only-export-components -- intentionally grouped with the components that use it; not worth fragmenting the file just to buy back Fast Refresh (dev-only)
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
    color: statusText(theme, "warning"),
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "0.35rem 0.55rem",
    borderRadius: "8px",
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
// react-doctor-disable-next-line only-export-components -- intentionally grouped with the components that use it; not worth fragmenting the file just to buy back Fast Refresh (dev-only)
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
// react-doctor-disable-next-line only-export-components -- intentionally grouped with the components that use it; not worth fragmenting the file just to buy back Fast Refresh (dev-only)
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
// Vertical padding + min-height live in the "checklist-row" CSS class (globals.css),
// not here, so a mobile media query can grow the real tap target toward the 44px WCAG
// minimum without touching desktop — an inline style would always win over a class's
// media-query rule for the same property, so those two can't overlap.
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
    paddingLeft: 0,
    paddingRight: trailingPadding,
    font: "inherit",
    cursor: "pointer",
    color: theme.text,
    // Without this, Safari's double-tap-to-zoom gesture detection can eat or garble
    // two real taps landing close together in time on adjacent rows (one toggles back
    // off, the other never registers) — this tells it these are real controls, not
    // page content to zoom into.
    touchAction: "manipulation",
  };
}

// Square box for a true multi-select trait (ChecklistItem) — any number of these can
// be checked at once. `locked` (a disabled, derived answer) dims the active color to
// theme.muted instead of theme.accent, so a locked field reads as different from a
// normal answered one at a glance, without needing any accompanying text.
function checklistBoxStyle(theme: AppTheme, checked: boolean, locked?: boolean): CSSProperties {
  const activeColor = locked ? theme.muted : theme.accent;
  return {
    flexShrink: 0,
    width: "1.05rem",
    height: "1.05rem",
    borderRadius: "6px",
    border: `1.5px solid ${checked ? activeColor : theme.border}`,
    background: checked ? `${activeColor}22` : theme.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

// Round radio dot for a pick-one group (ChecklistGroup) — picking one option in the
// group clears any other, so it reads as a radio rather than a checkbox at a glance.
function checklistRadioStyle(theme: AppTheme, active: boolean, locked?: boolean): CSSProperties {
  const activeColor = locked ? theme.muted : theme.accent;
  return {
    flexShrink: 0,
    width: "1.05rem",
    height: "1.05rem",
    borderRadius: "50%",
    border: `1.5px solid ${active ? activeColor : theme.border}`,
    background: theme.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

function checklistMarkStyle(color: string): CSSProperties {
  return { fontSize: "0.75rem", fontWeight: 900, lineHeight: 1, color };
}

function checklistRadioDotStyle(theme: AppTheme, locked?: boolean): CSSProperties {
  return { width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: locked ? theme.muted : theme.accent };
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
export function ChecklistCheckbox({ label, checked, onToggle, theme, tooltip, lockTooltip, required, disabled }: {
  label: string;
  checked: boolean | undefined;
  onToggle: (checked: boolean) => void;
  theme: AppTheme;
  tooltip?: TooltipContent;
  /** Shown as a second, lock-glyph tooltip alongside `tooltip` when `disabled` — keeps
   *  "what this question means" (tooltip) separate from "why yours is locked"
   *  (lockTooltip) instead of cramming both into one popover. */
  lockTooltip?: TooltipContent;
  required?: boolean;
  /** Locks the checkbox to its current (derived) value — e.g. a Genesis/Destiny weapon
   *  already on file — same idea as ChecklistGroup's disabled prop. */
  disabled?: boolean;
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked === true}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => { if (!disabled) onToggle(!checked); }}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle(!checked);
        }
      }}
      className="checklist-row checklist-checkbox-row"
      style={{ ...checklistRowStyle(theme, "0"), display: "grid", ...(disabled ? { cursor: "default" } : {}) }}
    >
      <span style={checklistBoxStyle(theme, checked === true, disabled)}>
        {checked === true && <span style={checklistMarkStyle(disabled ? theme.muted : theme.accent)}>✓</span>}
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
        {disabled && lockTooltip && (
          <>
            {" "}
            <span
              style={{ display: "inline-flex", verticalAlign: "middle" }}
              onClick={(e) => e.stopPropagation()}
            >
              <InfoTooltip content={lockTooltip} theme={theme} icon={<LockGlyph />} label="Why this is locked" bordered={false} />
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
export function ChecklistGroup({ question, options, value, onToggle, theme, tooltip, lockTooltip, required, disabled }: {
  question: string;
  options: { value: string; label: string; sublabel?: string; standalone?: boolean }[];
  value: string | null;
  /** Clicking the active option deselects it (returns null). */
  onToggle: (value: string | null) => void;
  theme: AppTheme;
  tooltip?: TooltipContent;
  /** Shown as a second, lock-glyph tooltip alongside `tooltip` when `disabled` — keeps
   *  "what this question means" (tooltip) separate from "why yours is locked"
   *  (lockTooltip) instead of cramming both into one popover. */
  lockTooltip?: TooltipContent;
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
        {disabled && lockTooltip && (
          <InfoTooltip content={lockTooltip} theme={theme} icon={<LockGlyph />} label="Why this is locked" bordered={false} />
        )}
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
                className="checklist-row"
                style={{ ...checklistRowStyle(theme), ...(disabled ? { cursor: "default" } : {}) }}
              >
                <span style={checklistRadioStyle(theme, active, disabled)}>
                  {active && <span style={checklistRadioDotStyle(theme, disabled)} />}
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
export function LegionFinalAttackField({ value, onUpdate, theme, required, locked, lockTooltip }: {
  value: string;
  onUpdate: (val: string) => void;
  theme: AppTheme;
  required?: boolean;
  /** Locks the field to its current (derived) value — e.g. this world's Legion
   *  Artifacts board already proves it — same idea as WeaponAttField's own lock. */
  locked?: boolean;
  lockTooltip?: TooltipContent;
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
        {locked && lockTooltip && (
          <InfoTooltip content={lockTooltip} theme={theme} icon={<LockGlyph />} label="Why this is locked" bordered={false} />
        )}
      </div>
      <div style={{ position: "relative", width: "5rem" }}>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={value}
          placeholder="0"
          readOnly={locked}
          style={{ ...statInputStyle(theme, "100%"), paddingRight: "1.15rem", ...(locked ? { borderColor: theme.muted, cursor: "default" } : {}) }}
          onChange={(e) => { if (!locked) onUpdate(clampFinalAttackInput(e.target.value)); }}
          onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
          onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
          onKeyDown={numericKeyDown}
        />
        <span style={inputSuffixStyle(theme)}>%</span>
      </div>
    </div>
  );
}

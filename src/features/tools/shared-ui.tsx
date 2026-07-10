"use client";

import type { AppTheme } from "../../components/themes";

/** Label sitting above a control. Typography comes from `.tool-field-label`;
 *  pass `style` for the dynamic muted color (e.g. `styles.labelStyle`).
 *
 *  Pass `htmlFor` (matching an `id` on the control) whenever the child is a
 *  single native input or select — it renders a real `<label>` so the control
 *  gets an accessible name. Children that are custom widgets or buttons keep
 *  the plain `<div>` and must name themselves via `aria-label`. */
export function Field({
  label,
  htmlFor,
  style,
  containerStyle,
  children,
}: {
  label: string;
  htmlFor?: string;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div style={containerStyle}>
      {htmlFor ? (
        <label className="tool-field-label" htmlFor={htmlFor} style={style}>{label}</label>
      ) : (
        <div className="tool-field-label" style={style}>{label}</div>
      )}
      {children}
    </div>
  );
}

/** Hairline between stacked blocks that share one panel. */
export function PanelDivider({ theme }: { theme: AppTheme }) {
  return <div style={{ borderTop: `1px solid ${theme.border}`, margin: "1rem 0" }} />;
}

const toggleBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "10px",
  fontSize: "0.8rem",
  lineHeight: 1,
  fontWeight: 700,
  cursor: "pointer",
  userSelect: "none",
};

export function Toggle({
  theme,
  label,
  checked,
  onChange,
  disabled = false,
  style,
}: {
  theme: AppTheme;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const mergedStyle: React.CSSProperties = {
    ...toggleBase,
    ...style,
    color: checked ? theme.accentText : theme.muted,
    background: checked ? theme.accentSoft : theme.timerBg,
    border: `1px solid ${checked ? theme.accent : theme.border}`,
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
  return (
    <button
      type="button"
      className="tool-btn"
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      style={mergedStyle}
    >
      {/* The check slot always occupies space so toggling doesn't change the
          width. `visibility: hidden` drops it from the accessibility tree, so
          the pressed state is carried by `aria-pressed`, not by this glyph. */}
      <span aria-hidden="true" style={{ visibility: checked ? "visible" : "hidden", marginRight: "0.35em" }}>
        {"\u2713"}
      </span>
      {label}
    </button>
  );
}

export function PillGroup<T extends string>({
  theme,
  options,
  value,
  onChange,
}: {
  theme: AppTheme;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        background: theme.timerBg,
        borderRadius: "10px",
        padding: "3px",
        border: `1px solid ${theme.border}`,
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="tool-btn"
          onClick={() => onChange(o.value)}
          style={{
            padding: "5px 12px",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: value === o.value ? theme.accentOn : theme.muted,
            background: value === o.value ? theme.accent : "transparent",
            userSelect: "none",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Primary call-to-action button: solid accent fill, used for the main action of
// a tool (Simulate, Calculate, Log a Drop, …). Colors come from the theme; shape
// is fixed here so every tool's CTA matches.
const actionBtnBase: React.CSSProperties = {
  padding: "10px 22px",
  borderRadius: "10px",
  border: "1px solid",
  fontFamily: "var(--font-body)",
  fontSize: "0.85rem",
  fontWeight: 800,
  textAlign: "center",
};

export function ActionButton({
  theme,
  label,
  onClick,
  disabled = false,
  fullWidth = false,
  style,
}: {
  theme: AppTheme;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      className="tool-btn"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        ...actionBtnBase,
        background: theme.accent,
        borderColor: theme.accent,
        color: theme.accentOn,
        width: fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {label}
    </button>
  );
}

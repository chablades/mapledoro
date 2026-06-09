"use client";

import type { AppTheme } from "../../components/themes";

/** Label sitting above a control. Typography comes from `.tool-field-label`;
 *  pass `style` for the dynamic muted color (e.g. `styles.labelStyle`). */
export function Field({
  label,
  style,
  containerStyle,
  children,
}: {
  label: string;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div style={containerStyle}>
      <div className="tool-field-label" style={style}>{label}</div>
      {children}
    </div>
  );
}

const toggleBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "10px",
  fontSize: "0.8rem",
  lineHeight: 1, // pin the line box so the checkmark glyph can't change height on toggle
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
  const content = `${checked ? "\u2713 " : ""}${label}`;

  return (
    <button
      type="button"
      className="tool-btn"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={mergedStyle}
    >
      {content}
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
            color: value === o.value ? "#fff" : theme.muted,
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
        color: "#fff",
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

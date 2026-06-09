"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { AppTheme } from "../../components/themes";
import { toolStyles } from "./tool-styles";

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

  if (disabled) {
    return <div role="button" aria-disabled style={mergedStyle}>{content}</div>;
  }

  const activate = () => onChange(!checked);
  return (
    <div
      className="tool-btn"
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } }}
      style={mergedStyle}
    >
      {content}
    </div>
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
        <div
          key={o.value}
          className="tool-btn"
          role="button"
          tabIndex={0}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(o.value); } }}
          style={{
            padding: "5px 12px",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: value === o.value ? "#fff" : theme.muted,
            background: value === o.value ? theme.accent : "transparent",
            userSelect: "none",
          }}
        >
          {o.label}
        </div>
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

const confirmOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};

/** Reusable confirmation modal for destructive actions. Portaled to `body` so it
 *  overlays the whole viewport regardless of any transformed ancestor. The
 *  confirm action is always styled as destructive (red). */
export function ConfirmDialog({
  theme,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  theme: AppTheme;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const styles = toolStyles(theme);
  return createPortal(
    <div
      role="button"
      tabIndex={0}
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); onCancel(); } }}
      style={confirmOverlayStyle}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: theme.panel,
          border: `1px solid ${theme.border}`,
          borderRadius: "16px",
          maxWidth: 420,
          width: "100%",
          padding: "1.5rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", color: theme.text, marginBottom: "0.75rem" }}>
          {title}
        </div>
        <div style={{ fontSize: "0.85rem", color: theme.muted, fontWeight: 600, marginBottom: "1.25rem", lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <div
            className="tool-btn tool-dialog-btn"
            role="button"
            tabIndex={0}
            onClick={onCancel}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCancel(); } }}
            style={styles.dialogBtnStyle}
          >
            Cancel
          </div>
          <div
            className="tool-btn tool-dialog-btn"
            role="button"
            tabIndex={0}
            onClick={onConfirm}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onConfirm(); } }}
            style={{ ...styles.dialogBtnStyle, color: "#fff", background: "#e05a5a", borderColor: "#e05a5a" }}
          >
            {confirmLabel}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Small destructive pill (Reset / Clear). Red outline; matches across tools.
const dangerBtnStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: "8px",
  fontSize: "0.75rem",
  fontWeight: 800,
  color: "#e05a5a",
  background: "transparent",
  border: "1px solid #e05a5a33",
};

/** Destructive Reset/Clear button that opens a {@link ConfirmDialog} before
 *  running `onConfirm`. Manages its own confirming state. */
export function ConfirmButton({
  theme,
  label,
  title,
  message,
  confirmLabel,
  onConfirm,
  className,
  style,
}: {
  theme: AppTheme;
  label: string;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [confirming, setConfirming] = useState(false);
  const triggerClass = className ? `tool-btn ${className}` : "tool-btn";
  return (
    <>
      <div
        className={triggerClass}
        role="button"
        tabIndex={0}
        onClick={() => setConfirming(true)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setConfirming(true); } }}
        style={{ ...dangerBtnStyle, ...style }}
      >
        {label}
      </div>
      {confirming && (
        <ConfirmDialog
          theme={theme}
          title={title}
          message={message}
          confirmLabel={confirmLabel ?? label}
          onConfirm={() => { onConfirm(); setConfirming(false); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}

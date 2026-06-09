"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { AppTheme } from "./themes";

// Dialog action button colors (shape comes from the global `.tool-dialog-btn`
// class). Secondary = muted neutral; primary = soft accent fill.
export function dialogBtnColors(theme: AppTheme): React.CSSProperties {
  return {
    color: theme.muted,
    background: theme.timerBg,
    borderColor: theme.border,
  };
}

export function dialogPrimaryBtnColors(theme: AppTheme): React.CSSProperties {
  return {
    color: theme.accentText,
    background: theme.accentSoft,
    borderColor: theme.accent,
  };
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
          <button
            type="button"
            className="tool-btn tool-dialog-btn"
            onClick={onCancel}
            style={dialogBtnColors(theme)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="tool-btn tool-dialog-btn"
            onClick={onConfirm}
            style={{ ...dialogBtnColors(theme), color: "#fff", background: "#e05a5a", borderColor: "#e05a5a" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Small destructive pill (Reset / Clear). Red outline; matches across the app.
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
      <button
        type="button"
        className={triggerClass}
        onClick={() => setConfirming(true)}
        style={{ ...dangerBtnStyle, ...style }}
      >
        {label}
      </button>
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

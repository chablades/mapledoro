"use client";

import { createPortal } from "react-dom";
import type { AppTheme } from "./themes";

interface ConfirmModalProps {
  theme: AppTheme;
  title: string;
  description: string;
  confirmLabel: string;
  confirmDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  theme,
  title,
  description,
  confirmLabel,
  confirmDanger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.42)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          borderRadius: "14px",
          border: `1px solid ${theme.border}`,
          background: theme.panel,
          color: theme.text,
          padding: "1rem",
          boxShadow: "0 16px 48px rgba(0,0,0,0.24)",
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
          {title}
        </p>
        <p style={{ margin: 0, color: theme.muted, fontSize: "0.86rem", fontWeight: 700 }}>
          {description}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.55rem" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: "10px",
              background: theme.bg,
              color: theme.text,
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: "0.86rem",
              padding: "0.5rem 0.75rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              border: confirmDanger ? "1px solid #fca5a5" : `1px solid ${theme.accent}`,
              borderRadius: "10px",
              background: confirmDanger ? "#ef4444" : theme.accent,
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: "0.86rem",
              padding: "0.5rem 0.8rem",
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

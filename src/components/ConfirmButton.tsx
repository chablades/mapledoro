"use client";

import { useState, type CSSProperties } from "react";
import ConfirmModal from "./ConfirmModal";
import type { AppTheme } from "./themes";

// Small destructive pill (Reset / Clear). Red outline; matches across the app.
const dangerPillStyle: CSSProperties = {
  padding: "5px 12px",
  borderRadius: "8px",
  fontSize: "0.75rem",
  fontWeight: 800,
  color: "#ef4444",
  background: "transparent",
  border: "1px solid #ef444433",
};

/** Destructive Reset/Clear button that opens a {@link ConfirmModal} before
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
  style?: CSSProperties;
}) {
  const [confirming, setConfirming] = useState(false);
  const triggerClass = className ? `tool-btn ${className}` : "tool-btn";
  return (
    <>
      <button
        type="button"
        className={triggerClass}
        onClick={() => setConfirming(true)}
        style={{ ...dangerPillStyle, ...style }}
      >
        {label}
      </button>
      {confirming && (
        <ConfirmModal
          theme={theme}
          title={title}
          description={message}
          confirmLabel={confirmLabel ?? label}
          confirmDanger
          onConfirm={() => { onConfirm(); setConfirming(false); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}

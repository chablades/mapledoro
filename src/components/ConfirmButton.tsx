"use client";

import { useState, type CSSProperties } from "react";
import ConfirmModal from "./ConfirmModal";
import type { AppTheme } from "./themes";
import { statusText } from "./statusColors";

const dangerPillShape: CSSProperties = {
  padding: "5px 12px",
  borderRadius: "8px",
  fontSize: "0.75rem",
  fontWeight: 800,
  background: "transparent",
};

// Small destructive pill (Reset / Clear). The red is text on a neutral surface,
// so it comes from `statusText`, not from the `danger` fill. "33" is the same
// 20% alpha the outline has always used.
function dangerPillStyle(theme: AppTheme): CSSProperties {
  const red = statusText(theme, "danger");
  return { ...dangerPillShape, color: red, border: `1px solid ${red}33` };
}

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
        style={{ ...dangerPillStyle(theme), ...style }}
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

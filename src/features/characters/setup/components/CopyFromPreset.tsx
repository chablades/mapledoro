"use client";

import { useState, type CSSProperties } from "react";
import type { AppTheme } from "../../../../components/themes";
import ConfirmModal from "../../../../components/ConfirmModal";

// Padding + min dimensions keep these at a real touch target size (~32px)
// rather than hugging the label text, so adjacent buttons are harder to
// misclick on a phone.
const copyBtnStyle = (theme: AppTheme): CSSProperties => ({
  border: `1px dashed ${theme.border}`,
  borderRadius: 7,
  background: "transparent",
  color: theme.muted,
  fontFamily: "inherit",
  fontWeight: 700,
  fontSize: "0.75rem",
  padding: "6px 12px",
  minHeight: 32,
  minWidth: 32,
  cursor: "pointer",
});

// Styled as its own danger-tinted pill (not a bare text link) so it reads as
// a distinct, deliberate action rather than sitting flush against the copy
// buttons.
const clearBtnStyle: CSSProperties = {
  border: "1px solid #ef444440",
  borderRadius: 7,
  background: "transparent",
  color: "#ef4444",
  fontFamily: "inherit",
  fontWeight: 700,
  fontSize: "0.75rem",
  padding: "6px 12px",
  minHeight: 32,
  cursor: "pointer",
};

type PendingAction = { type: "copy"; from: number } | { type: "clear" };

/** Row of "copy this preset's data into the active preset" buttons, one per
 *  other preset, plus an optional "Clear preset" action. Sits below a preset
 *  tab bar so switching presets and copying/clearing stay visually distinct
 *  from picking which preset is active. Both actions overwrite the active
 *  preset with no undo, so a misclick confirms before anything runs. */
export function CopyFromPreset({
  theme,
  count,
  active,
  onCopy,
  onClear,
  labels,
}: {
  theme: AppTheme;
  count: number;
  active: number;
  onCopy: (from: number) => void;
  onClear?: () => void;
  labels?: readonly string[];
}) {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const others = Array.from({ length: count }, (_, i) => i).filter((i) => i !== active);
  if (others.length === 0 && !onClear) return null;

  const presetName = (i: number) => (labels ? labels[i] : `preset ${i + 1}`);

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
      {others.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>Copy from</span>
          {others.map((i) => (
            <button key={i} type="button" onClick={() => setPending({ type: "copy", from: i })} style={copyBtnStyle(theme)}>
              {labels ? labels[i] : i + 1}
            </button>
          ))}
        </div>
      )}
      {onClear && (
        <button type="button" onClick={() => setPending({ type: "clear" })} style={clearBtnStyle}>
          Clear preset
        </button>
      )}
      {pending && (
        <ConfirmModal
          theme={theme}
          title={pending.type === "copy" ? "Copy preset?" : "Clear preset?"}
          description={
            pending.type === "copy"
              ? `This will overwrite the current preset with ${presetName(pending.from)}'s data. There is no undo.`
              : "This will clear all data in the current preset. There is no undo."
          }
          confirmLabel={pending.type === "copy" ? "Copy" : "Clear"}
          confirmDanger
          onConfirm={() => {
            if (pending.type === "copy") onCopy(pending.from);
            else onClear?.();
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

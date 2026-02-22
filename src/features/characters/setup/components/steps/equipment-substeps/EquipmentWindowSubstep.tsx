import type { EquipmentSubstepProps } from "./types";

export default function EquipmentWindowSubstep({
  theme,
  draft,
  onPatch,
}: EquipmentSubstepProps) {
  return (
    <>
      <p
        style={{
          margin: 0,
          marginBottom: "0.6rem",
          fontSize: "0.9rem",
          color: theme.muted,
          fontWeight: 700,
        }}
      >
        Add your main equipment screenshot first, or keep manual notes as fallback.
      </p>
      <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.8rem", color: theme.muted, fontWeight: 800 }}>
        Equipment screenshot URL (placeholder)
      </label>
      <input
        type="text"
        value={draft.equipmentWindowScreenshot}
        onChange={(event) => onPatch({ equipmentWindowScreenshot: event.target.value })}
        placeholder="https://..."
        style={{
          width: "100%",
          border: `1px solid ${theme.border}`,
          borderRadius: "10px",
          background: theme.bg,
          color: theme.text,
          fontFamily: "inherit",
          fontSize: "0.9rem",
          fontWeight: 600,
          padding: "0.55rem 0.7rem",
          outline: "none",
          marginBottom: "0.7rem",
        }}
      />
      <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.8rem", color: theme.muted, fontWeight: 800 }}>
        Manual notes (fallback)
      </label>
      <textarea
        value={draft.equipmentWindowNotes}
        onChange={(event) => onPatch({ equipmentWindowNotes: event.target.value })}
        placeholder="Manual notes for equipment parsing..."
        rows={4}
        style={{
          width: "100%",
          border: `1px solid ${theme.border}`,
          borderRadius: "10px",
          background: theme.bg,
          color: theme.text,
          fontFamily: "inherit",
          fontSize: "0.9rem",
          fontWeight: 600,
          padding: "0.6rem 0.7rem",
          outline: "none",
          resize: "vertical",
        }}
      />
    </>
  );
}

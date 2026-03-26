import type { EquipmentSubstepProps } from "./types";

function statusLabel(value: string) {
  return value.trim() ? "Added" : "Missing";
}

function statusColor(value: string, ok: string, bad: string) {
  return value.trim() ? ok : bad;
}

export default function ReviewSubstep({ theme, draft }: EquipmentSubstepProps) {
  const ok = "#16a34a";
  const bad = "#dc2626";

  return (
    <>
      <p
        style={{
          margin: 0,
          marginBottom: "0.7rem",
          fontSize: "0.9rem",
          color: theme.muted,
          fontWeight: 700,
        }}
      >
        Quick check before moving to the next major setup step.
      </p>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", fontWeight: 700 }}>
          <span>Equipment Window</span>
          <span style={{ color: statusColor(`${draft.equipmentWindowScreenshot}${draft.equipmentWindowNotes}`, ok, bad) }}>
            {statusLabel(`${draft.equipmentWindowScreenshot}${draft.equipmentWindowNotes}`)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", fontWeight: 700 }}>
          <span>Pets</span>
          <span style={{ color: statusColor(`${draft.petsScreenshot}${draft.petsNotes}`, ok, bad) }}>
            {statusLabel(`${draft.petsScreenshot}${draft.petsNotes}`)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", fontWeight: 700 }}>
          <span>Decorations</span>
          <span style={{ color: statusColor(`${draft.decorationsScreenshot}${draft.decorationsNotes}`, ok, bad) }}>
            {statusLabel(`${draft.decorationsScreenshot}${draft.decorationsNotes}`)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.86rem", fontWeight: 700 }}>
          <span>Damage Skin</span>
          <span style={{ color: statusColor(`${draft.damageSkinScreenshot}${draft.damageSkinNotes}`, ok, bad) }}>
            {statusLabel(`${draft.damageSkinScreenshot}${draft.damageSkinNotes}`)}
          </span>
        </div>
      </div>
    </>
  );
}

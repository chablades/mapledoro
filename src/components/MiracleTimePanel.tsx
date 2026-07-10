"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Panel from "./Panel";
import type { AppTheme } from "./themes";
import { STATUS } from "./statusColors";
import { useClock } from "@/lib/useClock";
import type { MiracleTimeSlot, MiracleTimePayload } from "@/lib/miracleTime";

async function fetchMiracleTime(signal: AbortSignal): Promise<MiracleTimeSlot[]> {
  const res = await fetch("/api/miracle-time", { signal });
  if (!res.ok) throw new Error("Failed to load");
  const data = (await res.json()) as MiracleTimePayload;
  return data.slots;
}

const activeBadgeStyle: CSSProperties = {
  marginLeft: "auto",
  fontSize: "0.75rem",
  fontWeight: 800,
  color: STATUS.success.on,
  background: STATUS.success.fill,
  padding: "2px 8px",
  borderRadius: "6px",
  letterSpacing: "0.05em",
};

function formatLocal(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SlotRow({
  slot,
  theme,
  isActive,
}: {
  slot: MiracleTimeSlot;
  theme: AppTheme;
  isActive: boolean;
}) {
  const rowStyle: CSSProperties = {
    padding: "0.55rem 0.75rem",
    borderRadius: "10px",
    border: `1px solid ${isActive ? theme.accent : theme.border}`,
    background: isActive ? theme.accentSoft : theme.bg,
  };
  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: theme.text,
    lineHeight: 1.3,
  };

  return (
    <div style={rowStyle}>
      <div style={headerStyle}>{slot.category}</div>
      <div style={{ marginTop: "2px", fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
        {formatLocal(slot.startISO)} &ndash; {formatLocal(slot.endISO)}
      </div>
    </div>
  );
}

/** Renders nothing until upcoming slots are available — no data, no box. */
export default function MiracleTimePanel({ theme }: { theme: AppTheme }) {
  const [slots, setSlots] = useState<MiracleTimeSlot[]>([]);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const controller = new AbortController();
    fetchMiracleTime(controller.signal)
      .then(setSlots)
      .catch(() => {
        // No data or fetch failure — the panel simply stays hidden.
      });

    return () => { controller.abort(); };
  }, []);

  const now = useClock();
  const nowMs = now ? now.getTime() : 0;
  const upcoming = now
    ? slots.filter((s) => Date.parse(s.endISO) >= nowMs)
    : slots;
  const activeISO = now
    ? upcoming.find((s) => Date.parse(s.startISO) <= nowMs && nowMs <= Date.parse(s.endISO))?.startISO
    : undefined;

  if (upcoming.length === 0) return null;

  const statusText = activeISO ? "Active now" : `Next: ${formatLocal(upcoming[0].startISO)}`;

  return (
    <div style={{ marginTop: "0.75rem" }}>
      <Panel theme={theme} delay="0.2s">
        <div className="panel-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <span>🎲</span>
          <div style={{ flex: 1 }}>
            <div className="panel-header-title" style={{ color: theme.text, lineHeight: 1 }}>
              Miracle Time
            </div>
            <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, marginTop: "2px" }}>
              {statusText}
            </div>
          </div>
          {activeISO && <span style={activeBadgeStyle}>ACTIVE</span>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.75rem" }}>
          {upcoming.map((slot) => (
            <SlotRow
              key={slot.startISO}
              slot={slot}
              theme={theme}
              isActive={slot.startISO === activeISO}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}

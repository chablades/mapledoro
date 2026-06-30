"use client";

import { useEffect, useReducer, useRef, type CSSProperties } from "react";
import Panel from "./Panel";
import type { AppTheme } from "./themes";
import { useClock } from "@/lib/useClock";
import type { MiracleTimeSlot, MiracleTimePayload } from "@/lib/miracleTime";

type FetchState = { slots: MiracleTimeSlot[]; loading: boolean; error: string | null };
type FetchAction =
  | { type: "success"; slots: MiracleTimeSlot[] }
  | { type: "error"; message: string };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case "success": return { slots: action.slots, loading: false, error: null };
    case "error": return { ...state, loading: false, error: action.message };
  }
}

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
  color: "#fff",
  background: "#10b981",
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

export default function MiracleTimePanel({ theme }: { theme: AppTheme }) {
  const [{ slots, loading, error }, dispatch] = useReducer(fetchReducer, {
    slots: [],
    loading: true,
    error: null,
  });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const controller = new AbortController();
    fetchMiracleTime(controller.signal)
      .then((s) => dispatch({ type: "success", slots: s }))
      .catch((err) => {
        if (!controller.signal.aborted) {
          dispatch({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
        }
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

  let statusText: string;
  if (loading) statusText = "Loading...";
  else if (error) statusText = "Connection error";
  else if (activeISO) statusText = "Active now";
  else if (upcoming.length > 0) statusText = `Next: ${formatLocal(upcoming[0].startISO)}`;
  else statusText = "No data";

  return (
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

      {loading && (
        <div className="empty-state" style={{ color: theme.muted }}>
          Loading event data&hellip;
        </div>
      )}

      {error && (
        <div className="empty-state" style={{ color: theme.muted }}>
          <div style={{ marginBottom: "0.5rem" }}>Could not load Miracle Time data.</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
            Check that your Discord bot is configured.
          </div>
        </div>
      )}

      {!loading && !error && upcoming.length > 0 && (
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
      )}

      {!loading && !error && upcoming.length === 0 && (
        <div className="empty-state" style={{ color: theme.muted }}>
          No Miracle Time data available.
        </div>
      )}
    </Panel>
  );
}

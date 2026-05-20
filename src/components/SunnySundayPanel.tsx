"use client";

import { useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import type { AppTheme } from "./themes";
import type { SunnySundayWeek, SunnySundayPayload } from "@/lib/sunnySunday";

type FetchState = { weeks: SunnySundayWeek[]; loading: boolean; error: string | null };
type FetchAction =
  | { type: "success"; weeks: SunnySundayWeek[] }
  | { type: "error"; message: string }
  | { type: "done" };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case "success": return { weeks: action.weeks, loading: false, error: null };
    case "error": return { ...state, loading: false, error: action.message };
    case "done": return { ...state, loading: false };
  }
}

async function fetchSunnySundays(signal: AbortSignal): Promise<SunnySundayWeek[]> {
  const res = await fetch("/api/sunny-sundays", { signal });
  if (!res.ok) throw new Error("Failed to load");
  const data = (await res.json()) as SunnySundayPayload;
  return data.weeks;
}
import { useClock } from "@/lib/useClock";

interface SunnySundayPanelProps {
  theme: AppTheme;
}

function getEventEnd(iso: string) {
  const start = new Date(iso);
  const dayOfWeek = start.getUTCDay();
  const daysUntilMonday = ((8 - dayOfWeek) % 7) || 7;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + daysUntilMonday);
  end.setUTCHours(0, 0, 0, 0);
  return end;
}

function formatLocalDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function EventDetailsList({ details, theme }: { details: string[]; theme: AppTheme }) {
  const detailRowStyle: CSSProperties = {
    display: "flex",
    gap: "0.5rem",
    padding: "0.5rem 0.65rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: theme.text,
    borderRadius: "8px",
    lineHeight: 1.35,
  };

  return (
    <div style={{ padding: "0.5rem 0.75rem 0" }}>
      {details.map((line) => (
        <div key={line} style={detailRowStyle}>
          <span style={{ flexShrink: 0, color: theme.accent }}>•</span>
          {line}
        </div>
      ))}
    </div>
  );
}

function OtherWeeksAccordion({
  weeks,
  theme,
  showOther,
  onToggle,
}: {
  weeks: SunnySundayWeek[];
  theme: AppTheme;
  showOther: boolean;
  onToggle: () => void;
}) {
  const toggleBtnStyle: CSSProperties = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: "8px",
    border: "none",
    background: theme.accentSoft,
    fontSize: "0.8rem",
    fontWeight: 600,
    fontFamily: "inherit",
    color: theme.accent,
    transition: "background 0.2s, color 0.2s",
  };

  if (weeks.length === 0) return null;
  return (
    <div style={{ padding: "0.5rem 0.75rem 0.75rem", borderTop: `1px solid ${theme.border}`, marginTop: "0.4rem" }}>
      <button
        type="button"
        onClick={onToggle}
        style={toggleBtnStyle}
      >
        <span>Upcoming weeks ({weeks.length})</span>
        <span
          style={{
            transition: "transform 0.2s",
            transform: showOther ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </span>
      </button>

      {showOther && (
        <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {weeks.map((week, wi) => (
            <div
              key={wi}
              style={{
                borderRadius: "10px",
                border: `1px solid ${theme.border}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: theme.text,
                  background: theme.bg,
                }}
              >
                {week.date}
              </div>
              <div style={{ padding: "0.3rem 0.75rem 0.45rem" }}>
                {week.details.map((line, li) => (
                  <div
                    key={li}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      padding: "0.2rem 0",
                      fontSize: "0.78rem",
                      color: theme.text,
                      lineHeight: 1.35,
                    }}
                  >
                    <span style={{ flexShrink: 0, color: theme.accent }}>•</span>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SunnySundayPanel({ theme }: SunnySundayPanelProps) {
  const [{ weeks, loading, error }, dispatch] = useReducer(fetchReducer, { weeks: [], loading: true, error: null });
  const [showOther, setShowOther] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const controller = new AbortController();
    fetchSunnySundays(controller.signal)
      .then((w) => dispatch({ type: "success", weeks: w }))
      .catch((err) => {
        if (!controller.signal.aborted) {
          dispatch({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
        }
      });

    return () => { controller.abort(); };
  }, []);

  const now = useClock();
  const futureWeeks = now ? weeks.filter((w) => getEventEnd(w.dateISO) > now) : [];
  const upcoming = futureWeeks[0] ?? null;
  const otherWeeks = futureWeeks.slice(1);
  const isActive = upcoming && now ? new Date(upcoming.dateISO) <= now && getEventEnd(upcoming.dateISO) > now : false;

  let statusText: string;
  if (loading) statusText = "Loading...";
  else if (error) statusText = "Connection error";
  else if (upcoming) statusText = formatLocalDate(upcoming.dateISO);
  else statusText = "No data";

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

  return (
    <div
      className="fade-in panel panel-card"
      style={{
        animationDelay: "0.15s",
        background: theme.panel,
        border: `1px solid ${theme.border}`,
      }}
    >
      {/* Header */}
      <div className="panel-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <span>☀️</span>
        <div style={{ flex: 1 }}>
          <div className="panel-header-title" style={{ color: theme.text, lineHeight: 1 }}>
            Sunny Sunday
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: theme.muted,
              fontWeight: 700,
              marginTop: "2px",
            }}
          >
            {statusText}
          </div>
        </div>
        {isActive && (
          <span style={activeBadgeStyle}>
            ACTIVE
          </span>
        )}
      </div>

      {loading && (
        <div className="empty-state" style={{ color: theme.muted }}>
          Loading event data&hellip;
        </div>
      )}

      {error && (
        <div className="empty-state" style={{ color: theme.muted }}>
          <div style={{ marginBottom: "0.5rem" }}>Could not load Sunny Sunday data.</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
            Check that your Discord bot is configured.
          </div>
        </div>
      )}

      {!loading && !error && upcoming && (
        <>
          <EventDetailsList details={upcoming.details} theme={theme} />
          <OtherWeeksAccordion
            weeks={otherWeeks}
            theme={theme}
            showOther={showOther}
            onToggle={() => setShowOther((prev) => !prev)}
          />
        </>
      )}

      {!loading && !error && !upcoming && (
        <div className="empty-state" style={{ color: theme.muted }}>
          No Sunny Sunday data available.
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import type { AppTheme } from "./themes";
import type { SunnySundayWeek, SunnySundayPayload } from "@/lib/sunnySunday";

interface SunnySundayPanelProps {
  theme: AppTheme;
}

export default function SunnySundayPanel({ theme }: SunnySundayPanelProps) {
  const [weeks, setWeeks] = useState<SunnySundayWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOther, setShowOther] = useState(false);

  useEffect(() => {
    fetch("/api/sunny-sundays")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json() as Promise<SunnySundayPayload>;
      })
      .then((data) => {
        setWeeks(data.weeks);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => setLoading(false));
  }, []);

  // Re-check expiration client-side so stale cached responses don't show past events
  const now = new Date();
  const getEventEnd = (iso: string) => {
    const start = new Date(iso);
    const dayOfWeek = start.getUTCDay();
    const daysUntilMonday = ((8 - dayOfWeek) % 7) || 7;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + daysUntilMonday);
    end.setUTCHours(0, 0, 0, 0);
    return end;
  };
  const futureWeeks = weeks.filter((w) => getEventEnd(w.dateISO) > now);
  const upcoming = futureWeeks[0] ?? null;
  const otherWeeks = futureWeeks.slice(1);

  // Check if Sunny Sunday is currently active (between event start and next Monday 00:00 UTC)
  const isActive = upcoming ? new Date(upcoming.dateISO) <= now && getEventEnd(upcoming.dateISO) > now : false;

  // Format the upcoming date in the user's local timezone
  const formatLocalDate = (iso: string) => {
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
  };

  let statusText: string;
  if (loading) statusText = "Loading...";
  else if (error) statusText = "Connection error";
  else if (upcoming) statusText = formatLocalDate(upcoming.dateISO);
  else statusText = "No data";

  return (
    <div
      className="fade-in panel panel-card"
      style={{
        animationDelay: "0.4s",
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
              fontSize: "0.66rem",
              color: theme.muted,
              fontWeight: 700,
              marginTop: "2px",
            }}
          >
            {statusText}
          </div>
        </div>
        {isActive && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.65rem",
              fontWeight: 800,
              color: "#fff",
              background: "#10b981",
              padding: "2px 8px",
              borderRadius: "6px",
              letterSpacing: "0.05em",
            }}
          >
            ACTIVE
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="empty-state" style={{ color: theme.muted }}>
          Loading event data...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="empty-state" style={{ color: theme.muted }}>
          <div style={{ marginBottom: "0.5rem" }}>Could not load Sunny Sunday data.</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
            Check that your Discord bot is configured.
          </div>
        </div>
      )}

      {/* Upcoming Sunday details */}
      {!loading && !error && upcoming && (
        <>
          <div style={{ padding: "0.5rem 0.75rem 0" }}>
            {upcoming.details.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  padding: "0.5rem 0.65rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: theme.text,
                  borderRadius: "8px",
                  lineHeight: 1.35,
                }}
              >
                <span style={{ flexShrink: 0, color: theme.accent }}>•</span>
                {line}
              </div>
            ))}
          </div>

          {/* Other Sundays dropdown */}
          {otherWeeks.length > 0 && (
            <div style={{ padding: "0.5rem 0.75rem 0.75rem", borderTop: `1px solid ${theme.border}`, marginTop: "0.4rem" }}>
              <button
                type="button"
                onClick={() => setShowOther((prev) => !prev)}
                style={{
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
                  transition: "all 0.2s",
                }}
              >
                <span>Upcoming weeks ({otherWeeks.length})</span>
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
                  {otherWeeks.map((week, wi) => (
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
          )}
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

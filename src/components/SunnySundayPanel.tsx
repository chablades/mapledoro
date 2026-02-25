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

  // Split weeks into the next upcoming one vs the rest
  const upcoming = weeks.find((w) => !w.isPast) ?? weeks[weeks.length - 1] ?? null;
  const otherWeeks = weeks.filter((w) => w !== upcoming);

  return (
    <div
      className="fade-in panel"
      style={{
        animationDelay: "0.4s",
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "18px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.9rem 1.25rem",
          borderBottom: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span>☀️</span>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: "1.1rem",
              color: theme.text,
              lineHeight: 1,
            }}
          >
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
            {loading
              ? "Loading..."
              : error
                ? "Connection error"
                : upcoming
                  ? upcoming.date
                  : "No data"}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: "2rem 1.25rem", textAlign: "center", color: theme.muted, fontSize: "0.85rem" }}>
          Loading event data...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "2rem 1.25rem", textAlign: "center", color: theme.muted, fontSize: "0.85rem" }}>
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
                  padding: "0.5rem 0.65rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: theme.text,
                  borderRadius: "8px",
                  lineHeight: 1.35,
                }}
              >
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
                <span>Other weeks ({otherWeeks.length})</span>
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
                          color: week.isPast ? theme.muted : theme.text,
                          background: theme.bg,
                          opacity: week.isPast ? 0.6 : 1,
                        }}
                      >
                        {week.date}
                        {week.isPast && (
                          <span style={{ marginLeft: "6px", fontSize: "0.65rem", color: theme.muted }}>(past)</span>
                        )}
                      </div>
                      <div style={{ padding: "0.3rem 0.75rem 0.45rem" }}>
                        {week.details.map((line, li) => (
                          <div
                            key={li}
                            style={{
                              padding: "0.2rem 0",
                              fontSize: "0.78rem",
                              color: week.isPast ? theme.muted : theme.text,
                              opacity: week.isPast ? 0.6 : 1,
                              lineHeight: 1.35,
                            }}
                          >
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
        <div style={{ padding: "2rem 1.25rem", textAlign: "center", color: theme.muted, fontSize: "0.85rem" }}>
          No Sunny Sunday data available.
        </div>
      )}
    </div>
  );
}

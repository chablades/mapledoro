"use client";

import type { CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";

export interface ResultMetric {
  label: string;
  value: string;
  /** Renders the value in the danger color: an unreachable date or week count. */
  danger?: boolean;
}

export interface ResultRow {
  key: string;
  label: string;
  /** Muted qualifier after the label ("monthly", "liberation"). */
  note?: string;
  value: string;
  /** Muted qualifier after the value ("12w", "+40 frags"). */
  valueNote?: string;
}

export interface ResultTotal {
  label: string;
  value: string;
}

const listRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "5px 0",
  fontSize: "0.82rem",
  fontWeight: 700,
};

const subheadStyle: CSSProperties = {
  fontSize: "0.82rem",
  fontWeight: 800,
  margin: "0 0 0.5rem",
};

/** Label left, value right, on a tint. Not a bordered box: a card inside a card
 *  is always wrong. */
function MetricRow({ theme, metric }: { theme: AppTheme; metric: ResultMetric }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        background: theme.timerBg,
        borderRadius: "10px",
        padding: "10px 14px",
      }}
    >
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>{metric.label}</span>
      <span
        style={{
          fontSize: "1.15rem",
          fontWeight: 800,
          color: metric.danger ? statusText(theme, "danger") : theme.accentText,
        }}
      >
        {metric.value}
      </span>
    </div>
  );
}

function RowList({ theme, rows }: { theme: AppTheme; rows: ResultRow[] }) {
  return (
    <>
      {rows.map((row) => (
        <div key={row.key} style={{ ...listRowStyle, borderBottom: `1px solid ${theme.border}` }}>
          <span style={{ color: theme.text }}>
            {row.label}
            {row.note && (
              <span style={{ fontSize: "0.75rem", color: theme.muted, marginLeft: "6px" }}>({row.note})</span>
            )}
          </span>
          <span style={{ color: theme.accentText, fontWeight: 800 }}>
            {row.value}
            {row.valueNote && (
              <span style={{ color: theme.muted, fontWeight: 700, marginLeft: "6px", fontSize: "0.75rem" }}>
                {row.valueNote}
              </span>
            )}
          </span>
        </div>
      ))}
    </>
  );
}

/** Shared by Liberation and Astra: the same estimate, milestone list, and weekly
 *  income breakdown, differing only in labels and how many metrics they carry. */
export function ResultsPanel({
  theme,
  sectionPanel,
  metrics,
  milestonesTitle,
  milestones,
  breakdownTitle,
  breakdown,
  breakdownEmpty,
  totals,
}: {
  theme: AppTheme;
  sectionPanel: CSSProperties;
  metrics: ResultMetric[];
  milestonesTitle: string;
  milestones: ResultRow[];
  breakdownTitle: string;
  breakdown: ResultRow[];
  breakdownEmpty: string;
  totals: ResultTotal[];
}) {
  return (
    <section className="fade-in panel-card" style={{ ...sectionPanel, marginBottom: "1.25rem" }}>
      <h2 className="tool-panel-title" style={{ color: theme.text }}>Estimated Completion</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.5rem",
          marginBottom: "1.25rem",
        }}
      >
        {metrics.map((m) => (
          <MetricRow key={m.label} theme={theme} metric={m} />
        ))}
      </div>

      {milestones.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ ...subheadStyle, color: theme.text }}>{milestonesTitle}</h3>
          <RowList theme={theme} rows={milestones} />
        </div>
      )}

      <h3 style={{ ...subheadStyle, color: theme.text }}>{breakdownTitle}</h3>
      {breakdown.length === 0 ? (
        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: theme.muted, margin: 0 }}>{breakdownEmpty}</p>
      ) : (
        <>
          <RowList theme={theme} rows={breakdown} />
          <div style={{ paddingTop: "8px", marginTop: "4px" }}>
            {totals.map((t) => (
              <div
                key={t.label}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}
              >
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", color: theme.text }}>
                  {t.label}
                </span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: theme.accentText }}>
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

"use client";

import AppShell from "../../components/AppShell";
import type { AppTheme } from "../../components/themes";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: { type: "added" | "changed" | "fixed"; text: string }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "Unreleased",
    date: "2026-04-10",
    changes: [
      { type: "added", text: "About, Terms of Service, Privacy Policy, and Changelog pages linked from the footer." },
      { type: "fixed", text: "Sunny Sunday events now expire client-side so stale cached responses don't show past weeks." },
      { type: "changed", text: "Sunny Sunday dates now display in the user's local timezone with timezone abbreviation." },
      { type: "added", text: "ACTIVE badge on the Sunny Sunday panel when the event is currently happening." },
    ],
  },
];

const TYPE_LABEL: Record<ChangelogEntry["changes"][number]["type"], string> = {
  added: "Added",
  changed: "Changed",
  fixed: "Fixed",
};

const TYPE_COLOR: Record<ChangelogEntry["changes"][number]["type"], string> = {
  added: "#10b981",
  changed: "#3b82f6",
  fixed: "#f59e0b",
};

function ChangelogContent({ theme }: { theme: AppTheme }) {
  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-title" style={{ color: theme.text }}>
          Changelog
        </div>
        <div className="page-subtitle" style={{ color: theme.muted }}>
          Notable updates to MapleDoro, newest first.
        </div>

        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {CHANGELOG.map((entry) => (
            <div
              key={entry.version + entry.date}
              className="fade-in panel-card"
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "14px",
                padding: "1.25rem 1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.75rem",
                  marginBottom: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: theme.text }}>
                  {entry.version}
                </div>
                <div style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 700 }}>
                  {entry.date}
                </div>
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {entry.changes.map((change) => (
                  <li
                    key={change.text}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.6rem",
                      fontSize: "0.88rem",
                      color: theme.text,
                      fontWeight: 500,
                      lineHeight: 1.6,
                    }}
                  >
                    <span
                      className="changelog-type-pill"
                      style={{
                        background: TYPE_COLOR[change.type],
                      }}
                    >
                      {TYPE_LABEL[change.type]}
                    </span>
                    <span>{change.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <AppShell currentPath="/changelog">
      {({ theme }) => <ChangelogContent theme={theme} />}
    </AppShell>
  );
}

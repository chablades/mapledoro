"use client";

import { useState } from "react";
import AppShell from "../../components/AppShell";
import type { AppTheme } from "../../components/themes";

interface ChangelogEntry {
  date: string;
  changes: { type: "added" | "changed" | "fixed"; text: string }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-05-10",
    changes: [
      { type: "added", text: "Expanded character guide pages with community resources, skill icons, class infographics, and HEXA guide images where available." },
      { type: "changed", text: "Replaced placeholder quick-nav icons on homepage with intended icons." },
      { type: "fixed", text: "Fixed the Liberation Tracker bottom panel losing its styling in some layouts." },
    ],
  },
  {
    date: "2026-05-08",
    changes: [
      { type: "added", text: "Added a global light/dark mode selector and added theme selector under Settings." },
      { type: "added", text: "Added import and export data under Settings for backing up site data." },
    ],
  },
  {
    date: "2026-05-05",
    changes: [
      { type: "added", text: "Added a character profile overview with stat tabs, WSE equipment slots, and HEXA skill previews." },
      { type: "added", text: "Added automatic character refresh and stale-data indicators for saved character profiles." },
      { type: "added", text: "Added Sia Astelle to the HEXA Skill Tracker." },
      { type: "fixed", text: "Fixed Liberation, Symbol, and HEXA trackers loading wrong job by default." },
    ],
  },
  {
    date: "2026-05-01",
    changes: [
      { type: "added", text: "Added brief instructions to tool pages to make each calculator and tracker easier to start using." },
    ],
  },
  {
    date: "2026-04-27",
    changes: [
      { type: "changed", text: "Improved the Cubing Calculator experience with clearer controls and feedback." },
      { type: "changed", text: "Refined the Daily Tracker visuals." },
      { type: "fixed", text: "Fixed Liberation Tracker date calculations." },
    ],
  },
  {
    date: "2026-04-21",
    changes: [
      { type: "added", text: "Added the Daily Tracker for symbol dailies, daily bosses, and daily content across characters." },
      { type: "added", text: "Added the Cubing Calculator for estimating expected cube cost and cube counts." },
      { type: "changed", text: "Reorganized the Tools page into calculators, trackers, and planners." },
      { type: "changed", text: "Moved the Boss Crystal Tracker into the tracker section." },
    ],
  },
  {
    date: "2026-04-20",
    changes: [
      { type: "added", text: "Added milestone tracking to the Liberation calculators." },
    ],
  },
  {
    date: "2026-04-18",
    changes: [
      { type: "fixed", text: "Fixed Liberation Tracker end dates so they line up with MapleStory reset timing." },
    ],
  },
  {
    date: "2026-04-13",
    changes: [
      { type: "added", text: "Added the Character Guides page with searchable MapleStory class cards." },
    ],
  },
  {
    date: "2026-04-11",
    changes: [
      { type: "added", text: "Made character panels draggable in the Boss Crystal Calculator." },
    ],
  },
  {
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

const ENTRIES_PER_PAGE = 5;

function ChangelogContent({ theme }: { theme: AppTheme }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(CHANGELOG.length / ENTRIES_PER_PAGE);
  const firstEntry = (page - 1) * ENTRIES_PER_PAGE;
  const visibleEntries = CHANGELOG.slice(firstEntry, firstEntry + ENTRIES_PER_PAGE);

  const paginationButtonStyle = {
    border: `1px solid ${theme.border}`,
    borderRadius: "999px",
    background: theme.panel,
    color: theme.text,
    padding: "0.45rem 0.8rem",
    fontSize: "0.8rem",
    fontWeight: 800,
    fontFamily: "inherit",
    cursor: "pointer",
  } as const;

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
          {visibleEntries.map((entry) => (
            <div
              key={entry.date}
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

        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              marginTop: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: theme.muted, fontSize: "0.82rem", fontWeight: 700 }}>
              Showing {firstEntry + 1}-{Math.min(firstEntry + ENTRIES_PER_PAGE, CHANGELOG.length)} of {CHANGELOG.length}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                style={{
                  ...paginationButtonStyle,
                  opacity: page === 1 ? 0.45 : 1,
                  cursor: page === 1 ? "not-allowed" : "pointer",
                }}
              >
                Previous
              </button>
              <span style={{ color: theme.muted, fontSize: "0.82rem", fontWeight: 800 }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                style={{
                  ...paginationButtonStyle,
                  opacity: page === totalPages ? 0.45 : 1,
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
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

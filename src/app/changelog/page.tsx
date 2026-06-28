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
    date: "2026-06-27",
    changes: [
      { type: "added", text: "Added a Hard Mode to Mapledle that challenges you to name the exact skill, unlocked after you finish the day's class puzzle." },
      { type: "added", text: "You can now replay previous Mapledle puzzles using the arrows on the puzzle header." },
    ],
  },
  {
    date: "2026-06-25",
    changes: [
      { type: "added", text: "Added a Miracle Time schedule panel to the homepage, showing upcoming windows in your local time with an active indicator." },
    ],
  },
  {
    date: "2026-06-17",
    changes: [
      { type: "changed", text: "Renamed the Star Force Calculator's boom reduction tiers to Enhancement Mode, and the cost and boom reduction events now stack with it in both the calculator and Event Planner." },
      { type: "fixed", text: "Improved the layout of the Star Force Calculator's events and Enhancement Mode controls." },
    ],
  },
  {
    date: "2026-06-16",
    changes: [
      { type: "fixed", text: "Fixed Sunny Sunday events not appearing when the schedule was split across multiple Discord posts." },
      { type: "fixed", text: "Fixed the light/dark mode toggle knob not being vertically centered." },
    ],
  },
  {
    date: "2026-06-12",
    changes: [
      { type: "added", text: "Added Mapledle, a daily skill guessing game, under the new Games section." },
      { type: "added", text: "Added a check all button to the Boss Crystal Calculator to check or uncheck every boss at once." },
      { type: "changed", text: "Tools with a character selector now default to your Main character." },
      { type: "changed", text: "The weekly reset countdown now shows days, hours, and minutes." },
      { type: "changed", text: "The Flame Calculator now starts with the guild discount enabled." },
      { type: "changed", text: "The Cubing Calculator now keeps your desired stat selection unless the item type requires a different set of stats (such as WSE)." },
    ],
  },
  {
    date: "2026-06-10",
    changes: [
      { type: "changed", text: "Revamped the Event Planner with a cleaner layout and improved character syncing." },
      { type: "changed", text: "Improved use of vertical space in the HEXA Skill, Liberation, and Symbol trackers." },
      { type: "fixed", text: "Fixed several behavior issues on iOS." },
    ],
  },
  {
    date: "2026-06-09",
    changes: [
      { type: "changed", text: "Unified button styling across tools for a more consistent look." },
      { type: "fixed", text: "Fixed the current points input losing its styling in the Trace Restoration Calculator." },
      { type: "fixed", text: "Fixed uneven panel heights in the Liberation Tracker." },
    ],
  },
  {
    date: "2026-06-08",
    changes: [
      { type: "added", text: "The Boss Crystal Tracker now also tracks weekly clear status." },
    ],
  },
  {
    date: "2026-06-07",
    changes: [
      { type: "added", text: "Added the Geardock symbol to the Symbol Tracker." },
      { type: "added", text: "Added the ability to customize which tools appear on the homepage." },
      { type: "changed", text: "Tool pages now show your character's image in the character selector." },
    ],
  },
  {
    date: "2026-06-06",
    changes: [
      { type: "added", text: "Added Erel Light to the HEXA Skill Tracker." },
      { type: "added", text: "Added an outcome histogram to the Star Force Calculator." },
      { type: "changed", text: "Revamped the Pitched Boss Drop Tracker with a new drop logging dialog and improved charts." },
      { type: "changed", text: "Improved controls and feedback in the Star Force Calculator." },
      { type: "fixed", text: "Fixed newly added Sia Astelle characters not being identified correctly in the HEXA Skill Tracker." },
    ],
  },
  {
    date: "2026-06-05",
    changes: [
      { type: "added", text: "Added experimental boom reduction tiers to the Star Force Calculator." },
    ],
  },
  {
    date: "2026-06-03",
    changes: [
      { type: "changed", text: "Improved number input controls across trackers." },
      { type: "fixed", text: "Fixed the Liberation Tracker wiping saved progress in some cases." },
    ],
  },
  {
    date: "2026-05-28",
    changes: [
      { type: "fixed", text: "Fixed the Cubing and Flame calculators truncating entered values." },
    ],
  },
  {
    date: "2026-05-20",
    changes: [
      { type: "fixed", text: "Fixed the font not rendering correctly on the Guides page." },
    ],
  },
  {
    date: "2026-05-19",
    changes: [
      { type: "fixed", text: "Fixed various mobile layout issues across the site." },
    ],
  },
  {
    date: "2026-05-17",
    changes: [
      { type: "added", text: "Added the Trace Restoration Calculator for estimating trace costs across different success rates." },
      { type: "added", text: "Added the Flame Calculator for estimating expected flame score outcomes." },
      { type: "changed", text: "Revamped the homepage layout with a cleaner design." },
      { type: "changed", text: "Moved account-wide reminders from the homepage into the Daily Tracker." },
      { type: "changed", text: "Tweaked several themes for better contrast." },
    ],
  },
  {
    date: "2026-05-14",
    changes: [
      { type: "added", text: "Added Sol Hecate, Astra Secondary, and Destiny Liberation 2 to the Liberation Tracker." },
      { type: "changed", text: "Analytics now requires explicit user consent before activating." },
    ],
  },
  {
    date: "2026-05-13",
    changes: [
      { type: "fixed", text: "Fixed Daily Tracker layout on small screens, which now displays a single column on mobile." },
      { type: "fixed", text: "Fixed the light/dark mode toggle overflowing on small screen sizes." },
      { type: "fixed", text: "Fixed completion timeline collapsing on mobile views." },
      { type: "fixed", text: "Fixed mobile padding not applying correctly to some tool pages." },
    ],
  },
  {
    date: "2026-05-10",
    changes: [
      { type: "added", text: "Expanded character guide pages with community resources, skill icons, class infographics, and HEXA guide images where available." },
      { type: "changed", text: "Replaced placeholder quick-nav icons on homepage with intended icons." },
      { type: "fixed", text: "Fixed the Liberation Tracker bottom panel losing its styling in some layouts." },
      { type: "fixed", text: "Fixed Liberation Tracker completion dates being off by one day from weekly boss reset." },
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
                      alignItems: "center",
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

"use client";

import type { CSSProperties, ReactNode } from "react";
import HoverTooltip from "../../components/HoverTooltip";
import Panel from "../../components/Panel";
import type { AppTheme } from "../../components/themes";
import { formatCountdown, formatCountdownDays, getNextReset } from "../../lib/time";
import { useClock } from "../../lib/useClock";

const PLACEHOLDER_COUNTDOWN = "--:--:--";
const WEEKLY_RESET_DAY = 4; // Thursday, UTC
const EVENT_RESET_DAY = 3; // Wednesday, UTC

interface EventReset {
  name: string;
  /** UTC day (0 = Sunday) this event's weeklies roll over on. */
  day: number;
  /** Inclusive: the UTC midnight the event opens on. Omitted when it opened with the patch. */
  startsAt?: number;
  /** Exclusive: the UTC midnight the event's stated last day rolls into. */
  endsAt: number;
}

/** v271's event lineup, from the "MapleStory x Frieren" patch notes. Each entry's
 *  reset day and dates are the ones the notes state for that event, and the panel
 *  lists an event only while it runs: the Event Reset row disappears once every
 *  event on it is over, and the weekly row's list shrinks the same way. So the
 *  next patch needs this list replaced, not pruned.
 *
 *  Nexon writes the ends as "11:59 PM UTC"; each is stored as the following
 *  midnight, which is also the reset the event's final week ends on. */
const EVENT_RESETS: EventReset[] = [
  { name: "Frieren's Spell Collection", day: WEEKLY_RESET_DAY, endsAt: Date.UTC(2026, 9, 8) }, // Oct 7
  // Designer EXP / promotion evaluations.
  { name: "Mesotron-S Project", day: EVENT_RESET_DAY, startsAt: Date.UTC(2026, 8, 30), endsAt: Date.UTC(2026, 10, 11) }, // Sep 30 - Nov 10
  { name: "Go Go Sidekick!", day: EVENT_RESET_DAY, startsAt: Date.UTC(2026, 8, 30), endsAt: Date.UTC(2026, 10, 4) }, // Sep 30 - Nov 3
  { name: "Overclock Mesotron-S", day: EVENT_RESET_DAY, startsAt: Date.UTC(2026, 9, 14), endsAt: Date.UTC(2026, 10, 11) }, // Oct 14 - Nov 10
  { name: "Festival Guardian", day: EVENT_RESET_DAY, startsAt: Date.UTC(2026, 9, 14), endsAt: Date.UTC(2026, 10, 11) }, // Oct 14 - Nov 10
  { name: "Night of the Yeti", day: WEEKLY_RESET_DAY, startsAt: Date.UTC(2026, 9, 14), endsAt: Date.UTC(2026, 10, 12) }, // Oct 14 - Nov 11
  // Carried over from v270; its run outlasts that patch and v271's notes don't restate it.
  { name: "Item Burning Plus challenges", day: WEEKLY_RESET_DAY, endsAt: Date.UTC(2026, 10, 11) }, // Nov 10
];

/** Events running on `nowMs`. A null clock (SSR, pre-mount) passes 0 and gets the
 *  whole lineup, so the server renders every row the client can and the row set
 *  only ever shrinks after mount. */
function liveEventNames(day: number, nowMs: number): string[] {
  const isLive = (e: EventReset) => nowMs === 0 || ((e.startsAt ?? 0) <= nowMs && nowMs < e.endsAt);
  return EVENT_RESETS.filter((e) => e.day === day && isLive(e)).map((e) => e.name);
}

type RowKey = "daily" | "weekly" | "events";

/** The time-dependent half of a row, blank until the clock mounts. */
interface RowValues {
  schedule: string;
  countdown: string;
}

interface TimerRow extends RowValues {
  key: RowKey;
  label: string;
  tooltip: ReactNode;
}

const IDLE_VALUES: RowValues = { schedule: "", countdown: PLACEHOLDER_COUNTDOWN };

// The bubble centers short one-line labels (see .hover-tip-bubble), which turns a
// list into a ragged block -- these override to left-aligned.
const tooltipStyle: CSSProperties = { textAlign: "left", maxWidth: 200 };
const tooltipHeadStyle: CSSProperties = { fontWeight: 800, marginBottom: 4 };

function TooltipBody({ utc, summary, events }: { utc: string; summary: string; events?: string[] }) {
  return (
    <div style={tooltipStyle}>
      <div style={tooltipHeadStyle}>{utc}</div>
      <div>{summary}</div>
      {events?.map((name) => (
        <div key={name} style={{ marginTop: 2 }}>• {name}</div>
      ))}
    </div>
  );
}

const DAILY_TOOLTIP = (
  <TooltipBody
    utc="Midnight UTC, every day"
    summary="Daily boss entries, daily quests, Monster Park, Maple Tour, and daily event missions."
  />
);

/** Every formatter below is unreachable during SSR: `now` is null until useClock()
 *  ticks post-mount, and buildRows() returns the placeholder rows until then. */
function localTime(d: Date) {
  // react-doctor-disable-next-line no-locale-format-in-render -- post-mount `now` gate, see above
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function localDayTime(d: Date) {
  // react-doctor-disable-next-line no-locale-format-in-render -- post-mount `now` gate, see above
  return d.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function liveValues(now: Date): Record<RowKey, RowValues> {
  const nowMs = now.getTime();
  const daily = getNextReset(now, 0);
  const weekly = getNextReset(now, 0, WEEKLY_RESET_DAY);
  const events = getNextReset(now, 0, EVENT_RESET_DAY);

  return {
    daily: {
      schedule: `${localTime(daily)} daily`,
      countdown: formatCountdown(daily.getTime() - nowMs),
    },
    weekly: {
      schedule: localDayTime(weekly),
      countdown: formatCountdownDays(weekly.getTime() - nowMs),
    },
    events: {
      schedule: localDayTime(events),
      countdown: formatCountdownDays(events.getTime() - nowMs),
    },
  };
}

function buildRows(now: Date | null): TimerRow[] {
  const nowMs = now ? now.getTime() : 0;
  const values = now ? liveValues(now) : null;
  const valuesFor = (key: RowKey) => values?.[key] ?? IDLE_VALUES;
  const weeklyEvents = liveEventNames(WEEKLY_RESET_DAY, nowMs);
  const eventDayEvents = liveEventNames(EVENT_RESET_DAY, nowMs);

  return [
    { key: "daily", label: "Daily Reset", tooltip: DAILY_TOOLTIP, ...valuesFor("daily") },
    {
      key: "weekly",
      label: "Weekly Reset",
      tooltip: (
        <TooltipBody
          utc="Thursday, midnight UTC"
          summary={
            weeklyEvents.length > 0
              ? "Weekly boss entries and weekly quests, plus these event resets:"
              : "Weekly boss entries and weekly quests."
          }
          events={weeklyEvents}
        />
      ),
      ...valuesFor("weekly"),
    },
    // Dropped entirely once the last event on it ends, rather than counting down to
    // a reset with nothing left to reset.
    ...(eventDayEvents.length > 0
      ? [{
          key: "events" as const,
          // The asterisk points at the tooltip: which events these are is the whole
          // content of the row, and only the tooltip can carry the list.
          label: "Event Reset*",
          tooltip: (
            <TooltipBody
              utc="Wednesday, midnight UTC"
              summary="v271 events that reset off their own day:"
              events={eventDayEvents}
            />
          ),
          ...valuesFor("events"),
        }]
      : []),
  ];
}

const rowTextStyle: CSSProperties = { minWidth: 0, flex: 1 };
const scheduleStyle: CSSProperties = { fontSize: "0.75rem", fontWeight: 700 };

function timerRowStyle(theme: AppTheme): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    background: theme.timerBg,
    borderRadius: "14px",
    padding: "0.7rem 0.85rem",
    border: `1px solid ${theme.border}`,
  };
}

function TimerRowCard({ theme, row }: { theme: AppTheme; row: TimerRow }) {
  return (
    <div className="timer-row" style={timerRowStyle(theme)}>
      <div style={rowTextStyle}>
        {/* Ink on the name, muted on the schedule: three steps of hierarchy across the
            row (what resets, when it resets locally, how long that is). */}
        <div className="section-label" style={{ color: theme.text, marginBottom: row.schedule ? 4 : 0 }}>
          {row.label}
        </div>
        {row.schedule && <div style={{ ...scheduleStyle, color: theme.muted }}>{row.schedule}</div>}
      </div>
      <div className="timer-countdown" style={{ color: theme.accentText }}>
        {row.countdown}
      </div>
    </div>
  );
}

const tooltipWrapStyle: CSSProperties = { display: "block" };

/** Daily / weekly / event countdowns in one panel. Owns its own clock so a
 *  per-second tick re-renders these rows alone, not the whole dashboard. */
export default function ResetTimersPanel({ theme }: { theme: AppTheme }) {
  const now = useClock();
  const rows = buildRows(now);

  return (
    <Panel theme={theme} icon="⏱" title="Timers">
      <div className="timer-rows">
        {rows.map((row) => (
          <HoverTooltip key={row.key} theme={theme} label={row.tooltip} style={tooltipWrapStyle}>
            <TimerRowCard theme={theme} row={row} />
          </HoverTooltip>
        ))}
      </div>
    </Panel>
  );
}

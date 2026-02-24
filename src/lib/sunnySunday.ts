/*
  Sunny Sunday data parsing & caching.
  Parses multi-week Sunny Sunday event listings from Discord messages.

  Expected message format (one block per week):
  ---
  Saturday, February 28, 2026 4:00 PM (in 5 days)
  Star force destruction chance reduced by 30% ...
  30% off Star Force enhancement cost
  Excludes Superior equipment ...

  Saturday, March 7, 2026 4:00 PM (in 12 days)
  Treasure Hunter EXP x3
  ...
  ---
*/
import { fetchDiscordMessages } from "./discord";

// -- Types ------------------------------------------------------------------

export interface SunnySundayWeek {
  date: string;        // e.g. "Saturday, February 28, 2026 4:00 PM"
  dateISO: string;     // ISO string for sorting / comparison
  details: string[];   // lines describing the perks
  isPast: boolean;
}

export interface SunnySundayPayload {
  weeks: SunnySundayWeek[];
  fetchedAt: string;
}

// -- Parser -----------------------------------------------------------------

const DATE_RE =
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)/i;

const MONTH_MAP: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseDateLine(line: string): { label: string; iso: string } | null {
  const m = line.match(DATE_RE);
  if (!m) return null;

  const [, , monthName, dayStr, yearStr, timePart] = m;
  const month = MONTH_MAP[monthName.toLowerCase()];
  if (month === undefined) return null;

  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);

  // Parse 12-hour time
  const tm = timePart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  let hours = 0;
  let minutes = 0;
  if (tm) {
    hours = parseInt(tm[1], 10);
    minutes = parseInt(tm[2], 10);
    const isPM = tm[3].toUpperCase() === "PM";
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
  }

  const d = new Date(year, month, day, hours, minutes);
  // Label: everything up to (and not including) any parenthetical like "(in 5 days)"
  const label = line.replace(/\s*\(.*?\)\s*$/, "").trim();

  return { label, iso: d.toISOString() };
}

export function parseSunnySundayMessage(content: string): SunnySundayWeek[] {
  const lines = content.split("\n");
  const weeks: SunnySundayWeek[] = [];
  let current: SunnySundayWeek | null = null;
  const now = new Date();

  for (const raw of lines) {
    const line = raw.trim();

    // Try to match a date header
    const parsed = parseDateLine(line);
    if (parsed) {
      // Push previous section
      if (current) weeks.push(current);
      current = {
        date: parsed.label,
        dateISO: parsed.iso,
        details: [],
        isPast: new Date(parsed.iso) < now,
      };
      continue;
    }

    // Skip empty lines between sections (but don't close current section,
    // only a new date header or end-of-content does that)
    if (!line) continue;

    // Skip parenthetical-only lines like "(16 days ago)"
    if (/^\(.*\)$/.test(line)) continue;

    // Accumulate detail lines
    if (current) {
      current.details.push(line);
    }
  }

  // Push last section
  if (current) weeks.push(current);

  // Sort chronologically
  weeks.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());

  return weeks;
}

// -- Fetching ---------------------------------------------------------------

export async function fetchSunnySunday(): Promise<SunnySundayPayload | null> {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return null;

  const messages = await fetchDiscordMessages(channelId, 1);
  if (messages.length === 0) return null;

  const weeks = parseSunnySundayMessage(messages[0].content);
  if (weeks.length === 0) return null;

  return { weeks, fetchedAt: new Date().toISOString() };
}

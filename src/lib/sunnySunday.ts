/*
  Sunny Sunday data parsing & caching.
  Parses multi-week Sunny Sunday event listings from Discord messages.

  Architecture:
  - A cron job calls refreshSunnySunday() daily to check Discord for new data.
  - The result is persisted to a JSON cache file (the source of truth).
  - On Vercel: /tmp/sunny-sunday.json (writable in serverless).
  - Locally: data/sunny-sunday.json (for dev convenience).
  - The public GET route reads from the JSON cache first.
  - If the cache is empty (e.g. cold start wiped /tmp), it self-heals by
    fetching from Discord on the spot and repopulating the cache.
  - The cron skips the Discord call when cached weeks still have upcoming events.

  Expected Discord message format (one block per week):
  ---
  Saturday, February 28, 2026 4:00 PM (in 5 days)
  Star force destruction chance reduced by 30% ...
  30% off Star Force enhancement cost

  Saturday, March 7, 2026 4:00 PM (in 12 days)
  Treasure Hunter EXP x3
  ---
*/
import fs from "fs/promises";
import path from "path";
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

interface CachedData {
  messageId: string;
  fetchedAt: string;
  weeks: SunnySundayWeek[];
}

// -- Cache file -------------------------------------------------------------

const CACHE_FILE =
  process.env.VERCEL === "1"
    ? "/tmp/sunny-sunday.json"
    : path.join(process.cwd(), "data", "sunny-sunday.json");

export async function readCachedSchedule(): Promise<CachedData | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    return JSON.parse(raw) as CachedData;
  } catch {
    return null;
  }
}

async function writeCachedSchedule(data: CachedData): Promise<void> {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// -- Serving (for GET route) ------------------------------------------------

/**
 * Read from the cache file and recompute isPast relative to now.
 * If the cache is empty (e.g. after a Vercel cold start wiped /tmp),
 * automatically fetch from Discord to repopulate it.
 */
export async function getSunnySunday(): Promise<SunnySundayPayload | null> {
  let cached = await readCachedSchedule();

  // Self-heal: if cache is missing, try a live Discord fetch
  if (!cached || cached.weeks.length === 0) {
    await refreshSunnySunday().catch(() => {});
    cached = await readCachedSchedule();
  }

  if (!cached || cached.weeks.length === 0) return null;

  const now = new Date();
  const weeks = cached.weeks.map((w) => ({
    ...w,
    isPast: new Date(w.dateISO) < now,
  }));

  return { weeks, fetchedAt: cached.fetchedAt };
}

// -- Refresh (for cron route) -----------------------------------------------

/**
 * Returns true when the cache has no data or all listed events are in the past,
 * meaning we should check Discord for a new schedule.
 */
function shouldRefresh(cached: CachedData | null): boolean {
  if (!cached || cached.weeks.length === 0) return true;

  const now = new Date();
  const hasUpcoming = cached.weeks.some((w) => new Date(w.dateISO) > now);
  return !hasUpcoming;
}

/**
 * Called by the cron endpoint. Skips the Discord call if the cached schedule
 * still has upcoming events. Returns a status string for logging.
 */
export async function refreshSunnySunday(): Promise<string> {
  const cached = await readCachedSchedule();

  if (!shouldRefresh(cached)) {
    return "skipped — cached schedule still has upcoming events";
  }

  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return "skipped — DISCORD_CHANNEL_ID not set";

  const messages = await fetchDiscordMessages(channelId, 1);
  if (messages.length === 0) return "skipped — no messages in channel";

  const message = messages[0];

  // No change since last fetch
  if (cached && cached.messageId === message.id) {
    return "skipped — Discord message unchanged";
  }

  const weeks = parseSunnySundayMessage(message.content);
  if (weeks.length === 0) return "skipped — could not parse any weeks";

  await writeCachedSchedule({
    messageId: message.id,
    fetchedAt: new Date().toISOString(),
    weeks,
  });

  return `updated — ${weeks.length} week(s) saved`;
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

    const parsed = parseDateLine(line);
    if (parsed) {
      if (current) weeks.push(current);
      current = {
        date: parsed.label,
        dateISO: parsed.iso,
        details: [],
        isPast: new Date(parsed.iso) < now,
      };
      continue;
    }

    if (!line) continue;
    if (/^\(.*\)$/.test(line)) continue;

    if (current) {
      current.details.push(line);
    }
  }

  if (current) weeks.push(current);
  weeks.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());

  return weeks;
}

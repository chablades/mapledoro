/*
  Sunny Sunday data parsing & fetching.
  Parses multi-week Sunny Sunday event listings from Discord messages.

  Architecture:
  - The public GET route calls fetchSunnySunday() to get data from Discord.
  - Vercel's CDN caches the response via Cache-Control headers (s-maxage).
  - No file-system caching — the CDN edge is the cache layer.
  - First visitor after cache expires triggers a Discord fetch; everyone else
    gets the cached response instantly.

  Supported Discord message formats:
  1. Discord timestamps:  ### __<t:1774137600:F> (<t:1774137600:R>)__
  2. Plain-text dates:    Saturday, February 28, 2026 4:00 PM (in 5 days)
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

// -- Fetching ---------------------------------------------------------------

/**
 * Fetch the latest Sunny Sunday schedule directly from Discord,
 * parse it, and return the payload. Returns null if no data is available.
 */
export async function fetchSunnySunday(): Promise<SunnySundayPayload | null> {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) return null;

  const messages = await fetchDiscordMessages(channelId, 1);
  if (messages.length === 0) return null;

  const weeks = parseSunnySundayMessage(messages[0].content);
  if (weeks.length === 0) return null;

  return { weeks, fetchedAt: new Date().toISOString() };
}

// -- Parser -----------------------------------------------------------------

/** Matches a line that is a date header with Discord timestamp <t:UNIX:F> */
const DISCORD_DATE_LINE_RE = /<t:(\d+):F>/;

/** Plain-text date: Saturday, February 28, 2026 4:00 PM */
const PLAIN_DATE_RE =
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)/i;

const MONTH_MAP: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

/**
 * Compute when a Sunny Sunday event actually ends.
 * Events run from their listed start until the next Monday 00:00 UTC
 * (i.e. the MapleStory daily reset after Sunday).
 */
function getEventEndUTC(startDate: Date): Date {
  const d = new Date(startDate);
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 6=Sat
  // Days until next Monday: Sat(6)->2, Sun(0)->1, Mon(1)->7, etc.
  const daysUntilMonday = ((8 - dayOfWeek) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Format a Date as a readable label like "Saturday, March 19, 2026 4:00 PM" */
function formatDateLabel(d: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  const minStr = String(m).padStart(2, "0");
  return `${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} ${hour12}:${minStr} ${ampm}`;
}

function parseDateLine(line: string): { label: string; iso: string } | null {
  // Try Discord timestamp format first: <t:UNIX:F>
  const discordMatch = line.match(DISCORD_DATE_LINE_RE);
  if (discordMatch) {
    const unix = parseInt(discordMatch[1], 10);
    const d = new Date(unix * 1000);
    return { label: formatDateLabel(d), iso: d.toISOString() };
  }

  // Fall back to plain-text date format
  const m = line.match(PLAIN_DATE_RE);
  if (!m) return null;

  const [, , monthName, dayStr, yearStr, timePart] = m;
  const month = MONTH_MAP[monthName.toLowerCase()];
  if (month === undefined) return null;

  const day = parseInt(dayStr, 10);
  const year = parseInt(yearStr, 10);

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

/** Strip markdown formatting and Discord timestamp tags from detail lines */
function cleanDetail(line: string): string {
  return line
    .replace(/<t:\d+:[A-Za-z]>/g, "")  // remove Discord timestamps
    .replace(/\*\*/g, "")               // remove bold **
    .replace(/^-\s*/, "")               // remove leading "- "
    .replace(/^\*\s*/, "  • ")          // convert "* " sub-items to indented bullet
    .trim();
}

export function parseSunnySundayMessage(content: string): SunnySundayWeek[] {
  const lines = content.split("\n");
  const weeks: SunnySundayWeek[] = [];
  let current: SunnySundayWeek | null = null;
  const now = new Date();

  for (const raw of lines) {
    const line = raw.trim();

    // Skip the title line (## header with emoji/link)
    if (/^##\s/.test(line) && !DISCORD_DATE_LINE_RE.test(line)) continue;

    const parsed = parseDateLine(line);
    if (parsed) {
      if (current) weeks.push(current);
      current = {
        date: parsed.label,
        dateISO: parsed.iso,
        details: [],
        isPast: getEventEndUTC(new Date(parsed.iso)) < now,
      };
      continue;
    }

    if (!line) continue;
    if (/^\(.*\)$/.test(line)) continue;

    if (current) {
      const cleaned = cleanDetail(line);
      if (cleaned) current.details.push(cleaned);
    }
  }

  if (current) weeks.push(current);
  weeks.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());

  return weeks;
}

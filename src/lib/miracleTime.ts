/*
  Miracle Time data parsing & fetching.

  Architecture mirrors Sunny Sunday (see sunnySunday.ts):
  - The public GET route calls fetchMiracleTime() to read from Discord.
  - Vercel's CDN caches the response via Cache-Control headers (s-maxage).
  - First visitor after cache expiry triggers a Discord fetch; everyone else
    gets the cached response instantly.

  Discord message format (posted into the #miracle-time channel). One line per
  day; a leading "Miracle Time" header line and any other text are ignored:

    Miracle Time
    2026-06-26 | Accessories/Emblems/Hearts/Rings
    2026-06-27 | Primary Weapons/Secondary Equipment
    ...

  Each date is the UTC calendar day of the event. Miracle Time runs the standard
  GMS-day window — 00:00 to 23:59 UTC (5:00 PM to 4:59 PM Pacific) — which is
  derived from the date here rather than restated in every message.
*/
import { fetchDiscordMessages } from "./discord";

// -- Types ------------------------------------------------------------------

export interface MiracleTimeSlot {
  category: string; // e.g. "Accessories/Emblems/Hearts/Rings"
  startISO: string; // event start, 00:00 UTC of the listed day
  endISO: string;   // event end, 23:59:59.999 UTC of the listed day
}

export interface MiracleTimePayload {
  slots: MiracleTimeSlot[];
  fetchedAt: string;
}

// -- Parser -----------------------------------------------------------------

/** Matches the date half of a slot line, e.g. "2026-06-26" */
const SLOT_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Slot lines look like "2026-06-26 | Accessories/Emblems/Hearts/Rings".
// Split on the first "|" rather than one combined regex — keeps the date
// pattern fully anchored with fixed quantifiers (no backtracking risk).
function parseSlotLine(line: string): MiracleTimeSlot | null {
  const pipe = line.indexOf("|");
  if (pipe < 0) return null;

  const m = line.slice(0, pipe).trim().match(SLOT_DATE_RE);
  if (!m) return null;

  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1; // 0-indexed
  const day = parseInt(m[3], 10);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  const category = line.slice(pipe + 1).replace(/\*\*/g, "").trim();
  if (!category) return null;

  const start = Date.UTC(year, month, day, 0, 0, 0, 0);
  const end = Date.UTC(year, month, day, 23, 59, 59, 999);

  return {
    category,
    startISO: new Date(start).toISOString(),
    endISO: new Date(end).toISOString(),
  };
}

function parseMiracleTimeMessage(content: string): MiracleTimeSlot[] {
  const slots: MiracleTimeSlot[] = [];
  for (const raw of content.split("\n")) {
    const slot = parseSlotLine(raw.trim());
    if (slot) slots.push(slot);
  }
  return slots;
}

// -- Fetching ---------------------------------------------------------------

// A schedule may be split across a couple of consecutive posts, so scan a
// handful of recent messages rather than just the newest.
const MESSAGES_TO_SCAN = 5;

/**
 * Fetch the latest Miracle Time schedule from Discord, parse it, and return
 * the upcoming slots. Returns null if no data is available.
 */
export async function fetchMiracleTime(): Promise<MiracleTimePayload | null> {
  const channelId = process.env.MIRACLE_TIME_CHANNEL_ID;
  if (!channelId) return null;

  const messages = await fetchDiscordMessages(channelId, MESSAGES_TO_SCAN);
  if (messages.length === 0) return null;

  // Merge slots from every recent message, de-duping by start instant so a
  // schedule spanning multiple posts shows as one continuous list.
  const byStart = new Map<string, MiracleTimeSlot>();
  for (const msg of messages) {
    for (const slot of parseMiracleTimeMessage(msg.content)) {
      if (!byStart.has(slot.startISO)) byStart.set(slot.startISO, slot);
    }
  }
  if (byStart.size === 0) return null;

  // Already-finished slots are never displayed; drop them so the cached payload
  // only carries the upcoming schedule.
  const now = Date.now();
  const slots = [...byStart.values()]
    .filter((s) => new Date(s.endISO).getTime() >= now)
    .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());

  return { slots, fetchedAt: new Date().toISOString() };
}

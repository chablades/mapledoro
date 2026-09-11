/*
  Bug report relay: validates a report from the Bug Report page and posts it to
  the dev Discord channel via a webhook. The webhook URL never reaches the
  client. Defences, in order: same-origin only, JSON only, body size cap,
  strict field validation, honeypot, per-IP and global rate limits (Redis with
  in-memory fallback), then a bounded-timeout post to Discord.
*/
import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";
import {
  BUG_REPORT_LIMITS,
  BUG_REPORT_PAGE_LABELS,
  type BugReportCharacter,
  type BugReportMeta,
} from "../../../features/bug-report/bugReportContract";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;
const WINDOW_SECONDS = 60 * 60;
const IP_LIMIT_PER_WINDOW = 5;
const GLOBAL_LIMIT_PER_WINDOW = 40;
const DISCORD_TIMEOUT_MS = 8000;
const RATE_KEY_PREFIX = "mapledoro:rate:bugreport:v1:";
const FALLBACK_MAP_MAX = 1000;
const MAX_UA_LENGTH = 400;
const MAX_CHARACTER_NAME = 20;
const MAX_CHARACTER_JOB = 40;
const MAX_CHARACTER_WORLD = 30;
const MAX_THEME_LENGTH = 40;

// Only a real Discord webhook URL is accepted, so a mistyped env var can't turn
// this route into a relay that posts user content to an arbitrary host.
const WEBHOOK_URL_PATTERN = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
const webhookUrl = (() => {
  const raw = process.env.DISCORD_BUG_REPORT_WEBHOOK_URL?.trim() ?? "";
  return WEBHOOK_URL_PATTERN.test(raw) ? raw : null;
})();

const redisUrl = process.env.REDIS_URL?.trim() ?? "";
const redis = redisUrl
  ? new Redis(redisUrl, { lazyConnect: true, connectTimeout: 1500, maxRetriesPerRequest: 1 })
  : null;
let hasWarnedRedisFallback = false;
redis?.on("error", (err: Error) => {
  if (!hasWarnedRedisFallback) {
    hasWarnedRedisFallback = true;
    console.warn(`[bug-report][redis] Redis unavailable, falling back to in-memory rate limits. (${err.message})`);
  }
});

const fallbackRate = new Map<string, { count: number; expiresAt: number }>();

function getFallbackRateWindow(key: string, ttlMs: number) {
  const now = Date.now();
  const existing = fallbackRate.get(key);
  if (existing && now < existing.expiresAt) {
    existing.count += 1;
    return { count: existing.count, resetInMs: existing.expiresAt - now };
  }
  if (fallbackRate.size >= FALLBACK_MAP_MAX) {
    for (const [k, v] of fallbackRate) if (now >= v.expiresAt) fallbackRate.delete(k);
    if (fallbackRate.size >= FALLBACK_MAP_MAX) fallbackRate.clear();
  }
  fallbackRate.set(key, { count: 1, expiresAt: now + ttlMs });
  return { count: 1, resetInMs: ttlMs };
}

// Fixed window seeded once by SET ... NX, so retries while blocked don't slide it.
async function trackRateWindow(key: string, ttlSeconds: number) {
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      const rows = await redis.multi().set(key, 0, "EX", ttlSeconds, "NX").incr(key).pttl(key).exec();
      const count = Number(rows?.[1]?.[1] ?? 1);
      const pttl = Number(rows?.[2]?.[1] ?? -1);
      hasWarnedRedisFallback = false;
      return { count, resetInMs: pttl > 0 ? pttl : ttlSeconds * 1000 };
    } catch (error) {
      console.error(`[bug-report][redis] trackRateWindow failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return getFallbackRateWindow(key, ttlSeconds * 1000);
}

// Same trust order as the lookup route: Vercel sets x-real-ip at the edge, and
// the rightmost x-forwarded-for hop is proxy-appended; the leftmost is spoofable.
function getClientIp(request: NextRequest) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const parts = request.headers.get("x-forwarded-for")?.split(",") ?? [];
  return parts[parts.length - 1]?.trim() || "unknown";
}

// Browsers always send Origin on POST, so a missing or foreign Origin means the
// request did not come from a MapleDoro page. Sec-Fetch-Site backs it up where sent.
function isSameOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function jsonError(status: number, error: string, extraHeaders?: Record<string, string>) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });
}

function stripControlChars(value: string) {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = (code < 32 && code !== 10 && code !== 9) || (code >= 127 && code <= 159);
    if (!isControl) out += ch;
  }
  return out;
}

/** Returns the cleaned string, or null when it isn't a string or exceeds `max`. */
function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = stripControlChars(value.replaceAll("\r\n", "\n").replaceAll("\r", "\n")).trim();
  return cleaned.length <= max ? cleaned : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCharacter(value: unknown): BugReportCharacter | null | undefined {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return undefined;
  const name = cleanText(value.name, MAX_CHARACTER_NAME);
  const job = cleanText(value.job, MAX_CHARACTER_JOB);
  const world = cleanText(value.world, MAX_CHARACTER_WORLD);
  const level = value.level;
  if (!name || !job || world === null) return undefined;
  if (typeof level !== "number" || !Number.isInteger(level) || level < 0 || level > 300) return undefined;
  return { name, job, level, world };
}

function parseMeta(value: unknown): BugReportMeta | undefined {
  if (!isRecord(value)) return undefined;
  const viewport = typeof value.viewport === "string" && /^\d{1,5}x\d{1,5}$/.test(value.viewport) ? value.viewport : undefined;
  const theme = cleanText(value.theme, MAX_THEME_LENGTH);
  if (!viewport || !theme || theme.includes("\n")) return undefined;
  return { viewport, theme };
}

interface ValidReport {
  page: string;
  character: BugReportCharacter | null;
  happened: string;
  expected: string;
  steps: string;
  meta: BugReportMeta;
  isBot: boolean;
}

type Validation = { ok: true; report: ValidReport } | { ok: false; error: string };

function validate(body: unknown): Validation {
  if (!isRecord(body)) return { ok: false, error: "Invalid report." };
  const page = typeof body.page === "string" && BUG_REPORT_PAGE_LABELS.has(body.page) ? body.page : null;
  if (!page) return { ok: false, error: "Pick the page or tool the bug happened on." };
  const happened = cleanText(body.happened, BUG_REPORT_LIMITS.happened);
  if (happened === null) return { ok: false, error: `"What happened" must be ${BUG_REPORT_LIMITS.happened} characters or fewer.` };
  if (!happened) return { ok: false, error: "Tell us what happened." };
  const expected = cleanText(body.expected, BUG_REPORT_LIMITS.expected);
  if (expected === null) return { ok: false, error: `"What you expected" must be ${BUG_REPORT_LIMITS.expected} characters or fewer.` };
  const steps = cleanText(body.steps, BUG_REPORT_LIMITS.steps);
  if (steps === null) return { ok: false, error: `"Steps to reproduce" must be ${BUG_REPORT_LIMITS.steps} characters or fewer.` };
  const character = parseCharacter(body.character);
  if (character === undefined) return { ok: false, error: "Invalid report." };
  const meta = parseMeta(body.meta);
  if (!meta) return { ok: false, error: "Invalid report." };
  const isBot = typeof body.nickname !== "string" || body.nickname !== "";
  return { ok: true, report: { page, character, happened, expected, steps, meta, isBot } };
}

// Discord renders `[text](url)` masked links inside embeds, which would let a
// report plant a disguised link in the dev channel. Escaping the brackets keeps
// the text readable while defusing the syntax; other markdown is harmless here.
function defuseMarkdownLinks(text: string) {
  return text.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function buildEmbed(report: ValidReport, userAgent: string) {
  const pageLabel = BUG_REPORT_PAGE_LABELS.get(report.page) ?? report.page;
  const build = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";
  const safe = defuseMarkdownLinks;
  const fields: { name: string; value: string }[] = [];
  if (report.expected) fields.push({ name: "What they expected", value: safe(report.expected) });
  if (report.steps) fields.push({ name: "Steps to reproduce", value: safe(report.steps) });
  if (report.character) {
    const c = report.character;
    const worldSuffix = c.world ? `, ${safe(c.world)}` : "";
    fields.push({ name: "Character", value: `${safe(c.name)} (${safe(c.job)}, Lv. ${c.level}${worldSuffix})` });
  }
  fields.push({
    name: "Context",
    value: [
      `Page: ${report.page}`,
      `Build: ${build}`,
      `Viewport: ${report.meta.viewport}`,
      `Theme: ${safe(report.meta.theme)}`,
      `Browser: ${safe(userAgent) || "unknown"}`,
    ].join("\n"),
  });
  return {
    title: `Bug report: ${pageLabel}`,
    description: safe(report.happened),
    color: 0xe74c3c,
    fields,
    timestamp: new Date().toISOString(),
  };
}

async function postToDiscord(url: string, embed: ReturnType<typeof buildEmbed>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // No pings, whatever the report text contains.
    body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
    cache: "no-store",
  });
  // Status only: the body could echo the report, which must stay out of logs.
  if (!res.ok) console.error(`[bug-report] Discord webhook answered ${res.status}`);
  return res.ok;
}

async function readJsonBody(request: NextRequest): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return { ok: false, response: jsonError(413, "Report is too long.") };
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return { ok: false, response: jsonError(413, "Report is too long.") };
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: jsonError(400, "Invalid report.") };
  }
}

async function checkRateLimits(ip: string): Promise<NextResponse | null> {
  const perIp = await trackRateWindow(`${RATE_KEY_PREFIX}ip:${ip}`, WINDOW_SECONDS);
  if (perIp.count > IP_LIMIT_PER_WINDOW) {
    const retry = Math.max(1, Math.ceil(perIp.resetInMs / 1000));
    return jsonError(429, `You've sent a few reports recently. Try again in about ${Math.ceil(retry / 60)} minutes.`, { "Retry-After": String(retry) });
  }
  const global = await trackRateWindow(`${RATE_KEY_PREFIX}global`, WINDOW_SECONDS);
  if (global.count > GLOBAL_LIMIT_PER_WINDOW) {
    const retry = Math.max(1, Math.ceil(global.resetInMs / 1000));
    return jsonError(429, "Bug reports are busy right now. Try again in a little while.", { "Retry-After": String(retry) });
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError(403, "Reports can only be sent from the MapleDoro site.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonError(415, "Expected JSON.");
  }
  if (!webhookUrl) return jsonError(503, "Bug reporting isn't set up on this server yet.");

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const validation = validate(parsed.body);
  if (!validation.ok) return jsonError(400, validation.error);

  // Bots that fill the honeypot get a quiet success and nothing is sent.
  if (validation.report.isBot) return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });

  const limited = await checkRateLimits(getClientIp(request));
  if (limited) return limited;

  const userAgent = stripControlChars(request.headers.get("user-agent") ?? "").slice(0, MAX_UA_LENGTH);
  let delivered = false;
  try {
    delivered = await postToDiscord(webhookUrl, buildEmbed(validation.report, userAgent));
  } catch (error) {
    console.error(`[bug-report] Discord post failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!delivered) return jsonError(502, "Couldn't deliver the report. Please try again in a minute.");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

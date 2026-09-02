/*
  Stateless proxy for MapleScouter's calc API. Exists purely to get around CORS
  (api.maplescouter.com only allows requests from maplescouter.com itself, confirmed
  by testing a cross-origin fetch directly). Forwards the browser-built payload as-is
  and returns the response.

  Deliberately caches NOTHING here, MapleScouter's calc depends on mapledoro's own
  user-entered stat inputs, which have no server-side verification (all user data lives
  in localStorage per root CLAUDE.md). A shared server cache keyed by character name
  would let anyone importing/naming a character the same way poison the cached result
  for every other user looking at "that" character. Caching lives client-side, per
  character, keyed by a hash of the actual payload, see scouterCache.ts.

  Rate limit is per-IP, per-minute ONLY -- no daily cap, unlike the Nexon lookup route
  (src/app/api/characters/lookup/route.ts), since there's no known MapleScouter usage
  limit to respect the way Nexon's ranking API has one. The minute cap alone is enough
  to stop a runaway loop or something hitting this route directly, bypassing the UI's
  own manual-refresh-only/hash-cache protections.

  The generic proxy plumbing (rate limiting, timeout-guarded fetch, error shaping) lives in
  src/lib/mapleScouterProxy.ts, shared with scouter-simulator/route.ts -- this file only
  supplies the upstream URL and this route's own rate-limit bucket.
*/
import { NextRequest, NextResponse } from "next/server";
import { proxyMapleScouterCalc, parsePositiveIntEnv } from "../../../lib/mapleScouterProxy";

const MAPLESCOUTER_CALC_URL = "https://api.maplescouter.com/api/calc/dmg";
const RATE_LIMIT_KEY_PREFIX = "mapledoro:rate:scouter:v1:";

// Comfortably covers a real session refreshing several characters in a row (e.g.
// Scouter Setup done for 8 characters, clicking refresh on each), while still capping
// a runaway loop or direct hits within seconds.
const IP_REQUESTS_PER_MINUTE_LIMIT = parsePositiveIntEnv("SCOUTER_IP_MINUTE_LIMIT", 10);

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxyMapleScouterCalc(request, {
    upstreamUrl: MAPLESCOUTER_CALC_URL,
    rateLimitKeyPrefix: RATE_LIMIT_KEY_PREFIX,
    perMinuteLimit: IP_REQUESTS_PER_MINUTE_LIMIT,
  });
}

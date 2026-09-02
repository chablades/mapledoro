/*
  Stateless proxy for MapleScouter's "Additional Spec Simulator" calc API
  (POST https://api.maplescouter.com/api/calc/dmg-simulator, body `{ userStat, simulator }`).
  Same CORS-workaround/no-caching rationale as scouter/route.ts -- see that file's header.

  Separate rate-limit bucket from scouter/route.ts on purpose: simulator "what if" runs and
  real Scouter refreshes are different player intents, and sharing one bucket would let heavy
  simulator experimentation delay a real refresh (or vice versa).
*/
import { NextRequest, NextResponse } from "next/server";
import { proxyMapleScouterCalc, parsePositiveIntEnv } from "../../../lib/mapleScouterProxy";

const MAPLESCOUTER_SIMULATOR_URL = "https://api.maplescouter.com/api/calc/dmg-simulator";
const RATE_LIMIT_KEY_PREFIX = "mapledoro:rate:scouter-simulator:v1:";

const IP_REQUESTS_PER_MINUTE_LIMIT = parsePositiveIntEnv("SCOUTER_SIMULATOR_IP_MINUTE_LIMIT", 10);

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxyMapleScouterCalc(request, {
    upstreamUrl: MAPLESCOUTER_SIMULATOR_URL,
    rateLimitKeyPrefix: RATE_LIMIT_KEY_PREFIX,
    perMinuteLimit: IP_REQUESTS_PER_MINUTE_LIMIT,
  });
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { refreshSunnySunday } from "@/lib/sunnySunday";

/**
 * POST /api/sunny-sundays/refresh
 *
 * Called by a daily cron job. Checks whether the cached Sunny Sunday schedule
 * still has upcoming events — if so, skips the Discord call entirely. Otherwise,
 * fetches from Discord and updates the cache file.
 *
 * Protected by CRON_SECRET so only authorized callers can trigger a refresh.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await refreshSunnySunday();
    return NextResponse.json({ status: result });
  } catch (error) {
    console.error("Sunny Sunday refresh failed:", error);
    return NextResponse.json(
      { error: "Refresh failed", detail: String(error) },
      { status: 500 },
    );
  }
}

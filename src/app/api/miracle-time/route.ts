import { NextResponse } from "next/server";
import { fetchMiracleTime } from "@/lib/miracleTime";

/**
 * GET /api/miracle-time
 *
 * Fetches Miracle Time data from Discord and returns it.
 * Vercel's CDN caches the response for 24 hours (s-maxage=86400) and serves a
 * stale response while revalidating in the background (stale-while-revalidate).
 * Only the first visitor after cache expiry triggers a Discord API call.
 */
export async function GET() {
  try {
    const data = await fetchMiracleTime();

    if (!data) {
      return NextResponse.json(
        { error: "No Miracle Time data available" },
        { status: 404 },
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching Miracle Time data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Miracle Time data" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { fetchSunnySunday } from "@/lib/sunnySunday";

/**
 * GET /api/sunny-sundays
 *
 * Fetches Sunny Sunday data from Discord and returns it.
 * Vercel's CDN caches the response for 24 hours (s-maxage=86400).
 * If the cache is stale, it serves the old response while revalidating
 * in the background (stale-while-revalidate=3600).
 *
 * This means only the first visitor after cache expiry triggers a Discord
 * API call — everyone else gets an instant CDN hit.
 */
export async function GET() {
  try {
    const data = await fetchSunnySunday();

    if (!data) {
      return NextResponse.json(
        { error: "No Sunny Sunday data available" },
        { status: 404 },
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching Sunny Sunday data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Sunny Sunday data" },
      { status: 500 },
    );
  }
}

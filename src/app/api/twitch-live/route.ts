import { NextResponse } from "next/server";
import { isTwitchChannelLive } from "@/lib/twitch";

/**
 * GET /api/twitch-live
 *
 * Cosmetic feature: whether da_wakaiyuki is live, for the home page's Doro
 * live dot. Fails closed on any error so a Twitch outage just hides the dot
 * instead of breaking the home page. Vercel's CDN caches the response briefly
 * so a burst of visitors shares one Twitch call.
 */
export async function GET() {
  try {
    const live = await isTwitchChannelLive();
    return NextResponse.json(
      { live },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=30" } },
    );
  } catch (error) {
    console.error("Error checking Twitch live status:", error);
    return NextResponse.json(
      { live: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

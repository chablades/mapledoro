import { NextRequest, NextResponse } from "next/server";
import { refreshSunnySunday } from "@/lib/sunnySunday";

export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron (or allow in dev)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await refreshSunnySunday();
  return NextResponse.json({ status: result });
}

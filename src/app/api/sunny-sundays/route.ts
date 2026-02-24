import { NextResponse } from "next/server";
import { fetchSunnySunday } from "@/lib/sunnySunday";

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const data = await fetchSunnySunday();

    if (!data) {
      return NextResponse.json(
        { error: "No Sunny Sunday data available" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Sunny Sunday data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Sunny Sunday data" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getSunnySunday } from "@/lib/sunnySunday";

export async function GET() {
  try {
    const data = await getSunnySunday();

    if (!data) {
      return NextResponse.json(
        { error: "No Sunny Sunday data available" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading Sunny Sunday cache:", error);
    return NextResponse.json(
      { error: "Failed to read Sunny Sunday data" },
      { status: 500 },
    );
  }
}

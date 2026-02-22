import { NextResponse } from "next/server";

export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
  try {
    // In a real scenario, we would scrape the official site or use a known API.
    // For now, we'll return the latest known data. 
    // Ideally, this would use a fetch() to https://maplestory.nexon.net/news/patch-notes 
    // and parse the HTML if it weren't a JS-heavy SPA.
    
    const patchNotes = [
      {
        version: "v253",
        date: "Feb 19",
        title: "6th Job Skills Rebalance",
        tags: ["Balance"],
        url: "https://maplestory.nexon.net/news/patch-notes",
      },
      {
        version: "v252",
        date: "Feb 5",
        title: "Maple World Revamp",
        tags: ["Content"],
        url: "https://maplestory.nexon.net/news/patch-notes",
      },
      {
        version: "v251",
        date: "Jan 22",
        title: "Boss Crystal Limit ↑",
        tags: ["QoL"],
        url: "https://maplestory.nexon.net/news/patch-notes",
      },
    ];

    return NextResponse.json(patchNotes);
  } catch (error) {
    console.error("Error fetching patch notes:", error);
    return NextResponse.json({ error: "Failed to fetch patch notes" }, { status: 500 });
  }
}

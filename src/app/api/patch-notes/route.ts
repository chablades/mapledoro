import { NextResponse } from "next/server";

export const revalidate = 86400; // Cache for 24 hours

export async function GET() {
  try {
    const response = await fetch("https://www.nexon.com/maplestory/news/all?page=1");
    const html = await response.text();

    // Parse patch notes from HTML
    // Look for links in the format: [CATEGORY Date TITLE](URL)
    const linkRegex = /\[([A-Z]+)\s+([A-Za-z]+\s+\d{1,2},?\s*\d{4})\s+([^\]]+)\]\(([^)]+)\)/g;
    const matches = [];
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      matches.push({
        category: match[1],
        date: match[2],
        title: match[3].trim(),
        url: match[4],
      });
    }

    // Take the first 3 items regardless of category
    const patchNotes = matches
      .slice(0, 3)
      .map((item) => {
        // Extract version (e.g., v.266 or V.266)
        const versionMatch = item.title.match(/V\.?(\d+)/i);
        const version = versionMatch ? `v${versionMatch[1]}` : item.category;

        // Ensure URL is absolute
        const absoluteUrl = item.url.startsWith("http")
          ? item.url
          : `https://www.nexon.com${item.url}`;

        return {
          version,
          title: item.title,
          date: item.date,
          url: absoluteUrl,
          tags: [item.category],
        };
      });

    return NextResponse.json(patchNotes);
  } catch (error) {
    console.error("Error fetching patch notes:", error);
    // Fallback to latest patch notes
    const defaultPatchNotes = [
      {
        version: "v266",
        date: "Feb 18",
        title: "V.266 KNOWN ISSUES",
        tags: ["MAINTENANCE"],
        url: "https://www.nexon.com/maplestory/news/maintenance/36146/v-266-known-issues",
      },
      {
        version: "",
        date: "Feb 17",
        title: "[UPDATE FEB 21] CASH SHOP UPDATE FOR FEBRUARY 18",
        tags: ["SALE"],
        url: "https://www.nexon.com/maplestory/news/sale/35891/update-feb-21-cash-shop-update-for-february-18",
      },
      {
        version: "",
        date: "Feb 17",
        title: "ETHEREAL ATELIER: KEYS TO LOVE",
        tags: ["SALE"],
        url: "https://www.nexon.com/maplestory/news/sale/36387/ethereal-atelier-keys-to-love",
      },
    ];
    return NextResponse.json(defaultPatchNotes);
  }
}

import { NextResponse } from "next/server";

export const revalidate = 86400; // Cache for 24 hours

interface NexonNewsItem {
  id: number;
  name: string;
  category: string;
  liveDate: string;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildNewsUrl(item: NexonNewsItem): string {
  const slug = item.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `https://www.nexon.com/maplestory/news/${item.category}/${item.id}/${slug}`;
}

export async function GET() {
  try {
    // Nexon serves all news as static JSON on their CDN (the website is an SPA).
    const response = await fetch("https://g.nexonstatic.com/maplestory/cms/v1/news", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`CDN returned ${response.status}`);

    const items = (await response.json()) as NexonNewsItem[];

    // Sort by liveDate descending, take latest 15
    const sorted = [...items]
      .sort((a, b) => new Date(b.liveDate).getTime() - new Date(a.liveDate).getTime())
      .slice(0, 15);

    const patchNotes = sorted.map((item) => {
      const versionMatch = item.name.match(/V\.?(\d+)/i);
      const version = versionMatch ? `v${versionMatch[1]}` : "";

      return {
        version,
        title: item.name.toUpperCase(),
        date: formatDate(item.liveDate),
        url: buildNewsUrl(item),
        tags: [item.category.toUpperCase()],
      };
    });

    return NextResponse.json(patchNotes);
  } catch (error) {
    console.error("Error fetching patch notes:", error);
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

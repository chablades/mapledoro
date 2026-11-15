// Static patch notes used in two places: the SSR/hydration snapshot for
// PatchNotesPanel, and the API route's response when the Nexon CDN fetch
// fails. Shared so those two can't drift apart (they had, by four months).
//
// These go stale as the game updates. Refresh from
// https://g.nexonstatic.com/maplestory/cms/v1/news, keeping the shape the
// route's transform produces: uppercase title, "MMM d" date, category as a
// single uppercase tag, and `version` only when the title names one.

export type PatchNote = { version: string; date: string; title: string; tags: string[]; url: string };

export const FALLBACK_PATCH_NOTES: PatchNote[] = [
  {
    version: "v272",
    date: "Nov 13",
    title: "V.272 KNOWN ISSUES",
    tags: ["MAINTENANCE"],
    url: "https://www.nexon.com/maplestory/news/maintenance/48436/v-272-known-issues",
  },
  {
    version: "",
    date: "Nov 11",
    title: "NOW AVAILABLE: LETHE, SOVEREIGN OF OATHS!",
    tags: ["EVENTS"],
    url: "https://www.nexon.com/maplestory/news/events/47306/now-available-lethe-sovereign-of-oaths",
  },
  {
    version: "",
    date: "Nov 11",
    title: "ADVENTURE IN EVENT WORLD: QUANAH!",
    tags: ["EVENTS"],
    url: "https://www.nexon.com/maplestory/news/events/47304/adventure-in-event-world-quanah",
  },
  {
    version: "v272",
    date: "Nov 10",
    title: "V.272 - MAPLAYER ONE PATCH NOTES",
    tags: ["UPDATE"],
    url: "https://www.nexon.com/maplestory/news/update/47132/v-272-maplayer-one-patch-notes",
  },
];

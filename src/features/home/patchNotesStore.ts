// Patch notes external store — fetched once per page load (with a
// localStorage cache as fallback), consumed via useSyncExternalStore.

export type PatchNote = { version: string; date: string; title: string; tags: string[]; url: string };

const PATCH_CACHE_KEY = "mapledoro_patch_notes_v1";
const PATCH_CACHE_TTL_MS = 60 * 60 * 1000;

function readCachedPatchNotes(): PatchNote[] | null {
  try {
    const raw = localStorage.getItem(PATCH_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { expiresAt: number; data: PatchNote[] };
    if (Date.now() < cached.expiresAt && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data;
    }
  } catch { /* ignore */ }
  return null;
}

// Static fallback shown until the live fetch resolves (also the SSR snapshot).
export const initialPatchNotes: PatchNote[] = [
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

let patchNotesData: PatchNote[] = initialPatchNotes;
const patchListeners = new Set<() => void>();
let patchFetched = false;

export function subscribePatchNotes(listener: () => void) {
  patchListeners.add(listener);
  if (!patchFetched) {
    patchFetched = true;
    const cached = readCachedPatchNotes();
    fetch("/api/patch-notes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          patchNotesData = data as PatchNote[];
          try {
            localStorage.setItem(
              PATCH_CACHE_KEY,
              JSON.stringify({ expiresAt: Date.now() + PATCH_CACHE_TTL_MS, data }),
            );
          } catch { /* localStorage full or unavailable */ }
        } else if (cached) {
          patchNotesData = cached;
        }
        patchListeners.forEach((l) => l());
      })
      .catch(() => {
        if (cached) {
          patchNotesData = cached;
          patchListeners.forEach((l) => l());
        }
      });
  }
  return () => { patchListeners.delete(listener); };
}

export function getPatchNotesSnapshot() { return patchNotesData; }

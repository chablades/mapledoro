/*
  The Characters directory's world filter: which world the page is showing. Persisted so
  a return visit lands where the visitor left off.

  Shared rather than local to the directory pane because the background auto-refresh has
  to agree with it: landing only sweeps the world about to be displayed, so both sides
  must resolve "which world is that" identically.
*/

const DIRECTORY_WORLD_FILTER_STORAGE_KEY = "mapledoro_directory_world_filter";

/**
 * `number` is an explicit world choice, `null` the explicit "All worlds" choice, and
 * `"unset"` no stored preference at all (resolves to the roster's first world).
 *
 * Note that `null` currently only ever comes back from a malformed stored value:
 * `writeStoredWorldFilter` records "All worlds" by removing the key, which reads back
 * as `"unset"`. Preserved as-is; changing it would change where a return visit lands.
 */
export type StoredWorldFilter = number | null | "unset";

export function readStoredWorldFilter(): StoredWorldFilter {
  if (typeof window === "undefined") return "unset";
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(DIRECTORY_WORLD_FILTER_STORAGE_KEY);
  } catch {
    return "unset";
  }
  if (raw === null) return "unset";
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "number" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeStoredWorldFilter(worldId: number | null) {
  if (typeof window === "undefined") return;
  try {
    if (worldId === null) {
      window.localStorage.removeItem(DIRECTORY_WORLD_FILTER_STORAGE_KEY);
    } else {
      window.localStorage.setItem(DIRECTORY_WORLD_FILTER_STORAGE_KEY, JSON.stringify(worldId));
    }
  } catch {
    // Ignore localStorage write failures.
  }
}

/** The world actually being shown: falls back to the first world when unset, or when the stored one is no longer in the roster. */
export function resolveWorldFilter(
  raw: StoredWorldFilter,
  worldIds: readonly number[],
): number | null {
  if (raw === "unset") return worldIds[0] ?? null;
  if (raw !== null && !worldIds.includes(raw)) return worldIds[0] ?? null;
  return raw;
}

/** Sorted world IDs present in a roster, the order the directory's world picker uses. */
export function rosterWorldIds(roster: readonly { worldID: number }[]): number[] {
  return Array.from(new Set(roster.map((c) => c.worldID))).sort((a, b) => a - b);
}

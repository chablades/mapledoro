/*
  Browser-local cache helpers for character lookup responses.
*/
import type { NormalizedCharacterData } from "./types";
import { CHARACTER_CACHE_STORAGE_KEY } from "./constants";

export interface CharacterCacheEntry {
  characterName: string;
  found: boolean;
  expiresAt: number;
  savedAt: number;
  data: NormalizedCharacterData | null;
}

export function loadBrowserCharacterCache(): Map<string, CharacterCacheEntry> {
  if (typeof window === "undefined") {
    return new Map();
  }
  try {
    const raw = window.localStorage.getItem(CHARACTER_CACHE_STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as Record<string, CharacterCacheEntry>;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export function persistBrowserCharacterCache(
  cache: Map<string, CharacterCacheEntry>,
  maxEntries: number,
): Map<string, CharacterCacheEntry> {
  if (typeof window === "undefined") {
    return cache;
  }

  const validEntries = [...cache.entries()].filter(([, value]) => value.expiresAt > Date.now());
  validEntries.sort((a, b) => b[1].savedAt - a[1].savedAt);
  const limitedEntries = validEntries.slice(0, maxEntries);
  const nextCache = new Map(limitedEntries);
  window.localStorage.setItem(
    CHARACTER_CACHE_STORAGE_KEY,
    JSON.stringify(Object.fromEntries(nextCache)),
  );
  return nextCache;
}

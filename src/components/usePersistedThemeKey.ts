"use client";

/*
  Shared theme state hook.
  Theme is kept in-memory only (no localStorage/cookies).
*/
import { useState } from "react";

interface UsePersistedThemeKeyOptions {
  defaultKey: string;
  validKeys: string[];
}

export function usePersistedThemeKey({
  defaultKey,
  validKeys,
}: UsePersistedThemeKeyOptions) {
  const [validKeySet] = useState(() => new Set(validKeys));
  const [themeKey, setThemeKeyState] = useState(defaultKey);
  const setThemeKey = (nextKey: string) =>
    setThemeKeyState(validKeySet.has(nextKey) ? nextKey : defaultKey);

  return { themeKey, setThemeKey };
}

"use client";

/*
  Shared theme state hook with localStorage persistence.
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
  const [themeKey, setThemeKeyState] = useState(() => {
    try {
      const saved = localStorage.getItem("mapledoro-theme-key");
      if (saved && validKeySet.has(saved)) {
        return saved;
      }
    } catch {
      // Ignore storage access issues and keep default theme.
    }
    return defaultKey;
  });

  const setThemeKey = (nextKey: string) => {
    const key = validKeySet.has(nextKey) ? nextKey : defaultKey;
    setThemeKeyState(key);
    localStorage.setItem("mapledoro-theme-key", key);
  };

  return { themeKey, setThemeKey };
}

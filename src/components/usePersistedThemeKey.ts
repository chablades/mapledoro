"use client";

/*
  Shared theme state hook with localStorage persistence.
*/
import { useState, useEffect } from "react";

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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mapledoro-theme-key");
    if (saved && validKeySet.has(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeKeyState(saved);
    }
  }, [validKeySet]);

  const setThemeKey = (nextKey: string) => {
    const key = validKeySet.has(nextKey) ? nextKey : defaultKey;
    setThemeKeyState(key);
    localStorage.setItem("mapledoro-theme-key", key);
  };

  return { themeKey, setThemeKey };
}

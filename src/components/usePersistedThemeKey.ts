"use client";

/*
  Shared theme state hook with localStorage persistence.
*/
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

interface UsePersistedThemeKeyOptions {
  initialKey: string;
  validKeys: string[];
}

export function usePersistedThemeKey({
  initialKey,
  validKeys,
}: UsePersistedThemeKeyOptions) {
  const validKeySet = useMemo(() => new Set(validKeys), [validKeys]);
  const themeKeyStorageKey = "mapledoro-theme-key";
  const themeKeyCookieKey = "mapledoro-theme-key";
  const broadcastEventName = "mapledoro-theme-key-change";
  const normalizeThemeKey = useCallback((raw: string | null | undefined) => {
    if (!raw) {
      return initialKey;
    }
    return validKeySet.has(raw) ? raw : initialKey;
  }, [initialKey, validKeySet]);

  const writeThemeCookie = (key: string) => {
    try {
      document.cookie = `${themeKeyCookieKey}=${encodeURIComponent(key)}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      // Ignore cookie access issues.
    }
  };

  const getSnapshot = () => {
    try {
      return normalizeThemeKey(window.localStorage.getItem(themeKeyStorageKey));
    } catch {
      return initialKey;
    }
  };

  const getServerSnapshot = () => initialKey;

  const themeKey = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }
      const onStorage = (event: StorageEvent) => {
        if (event.key !== null && event.key !== themeKeyStorageKey) {
          return;
        }
        onStoreChange();
      };
      const onBroadcast = () => onStoreChange();
      window.addEventListener("storage", onStorage);
      window.addEventListener(broadcastEventName, onBroadcast);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(broadcastEventName, onBroadcast);
      };
    },
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(themeKeyStorageKey);
      const normalized = normalizeThemeKey(saved);
      window.localStorage.setItem(themeKeyStorageKey, normalized);
      writeThemeCookie(normalized);
    } catch {
      // Ignore storage access issues and keep default theme.
    }
  }, [normalizeThemeKey, themeKeyStorageKey, validKeySet]);

  const setThemeKey = (nextKey: string) => {
    const key = validKeySet.has(nextKey) ? nextKey : initialKey;
    try {
      window.localStorage.setItem(themeKeyStorageKey, key);
      writeThemeCookie(key);
      window.dispatchEvent(new Event(broadcastEventName));
    } catch {
      // Ignore storage access issues and keep current theme.
    }
  };

  return { themeKey, setThemeKey };
}

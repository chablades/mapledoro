"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
  One string-valued display preference, saved to localStorage and mirrored to a
  cookie of the same name so the server can render with it (no flash on load).
  Same storage shape as usePersistedColorMode, for the accessibility settings.
*/
export function usePersistedPref<T extends string>(key: string, valid: readonly T[], initial: T) {
  const eventName = `${key}-change`;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === key) onStoreChange();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(eventName, onStoreChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(eventName, onStoreChange);
      };
    },
    [key, eventName],
  );

  const getSnapshot = () => {
    try {
      const raw = window.localStorage.getItem(key);
      return valid.includes(raw as T) ? (raw as T) : initial;
    } catch {
      return initial;
    }
  };

  const value = useSyncExternalStore(subscribe, getSnapshot, () => initial);

  const setValue = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, next);
        document.cookie = `${key}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
        window.dispatchEvent(new Event(eventName));
      } catch {
        // Ignore storage access issues and keep the current value.
      }
    },
    [key, eventName],
  );

  return [value, setValue] as const;
}

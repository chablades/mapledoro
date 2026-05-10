"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ColorMode } from "./themes";

const STORAGE_KEY = "mapledoro-color-mode";
const COOKIE_KEY = "mapledoro-color-mode";
const BROADCAST_EVENT = "mapledoro-color-mode-change";
const VALID_MODES = new Set<ColorMode>(["light", "dark"]);

function writeCookie(mode: string) {
  try {
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(mode)}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Ignore cookie access issues.
  }
}

export function usePersistedColorMode(initialMode: ColorMode = "light") {
  const normalize = useCallback(
    (raw: string | null | undefined): ColorMode =>
      raw && VALID_MODES.has(raw as ColorMode) ? (raw as ColorMode) : initialMode,
    [initialMode],
  );

  const getSnapshot = () => {
    try {
      return normalize(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return initialMode;
    }
  };

  const getServerSnapshot = () => initialMode;

  const subscribe = useMemo(() => {
    return (onStoreChange: () => void) => {
      if (typeof window === "undefined") return () => undefined;
      const onStorage = (e: StorageEvent) => {
        if (e.key !== null && e.key !== STORAGE_KEY) return;
        onStoreChange();
      };
      const onBroadcast = () => onStoreChange();
      window.addEventListener("storage", onStorage);
      window.addEventListener(BROADCAST_EVENT, onBroadcast);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(BROADCAST_EVENT, onBroadcast);
      };
    };
  }, []);

  const colorMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setColorMode = (next: ColorMode) => {
    const mode = VALID_MODES.has(next) ? next : initialMode;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
      writeCookie(mode);
      window.dispatchEvent(new Event(BROADCAST_EVENT));
    } catch {
      // Ignore storage access issues.
    }
  };

  return { colorMode, setColorMode };
}

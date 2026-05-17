import { useSyncExternalStore } from "react";

let clockMs = 0;
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!interval) {
    clockMs = Date.now();
    interval = setInterval(() => {
      clockMs = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && interval) {
      clearInterval(interval);
      interval = null;
    }
  };
}

function getSnapshot() { return clockMs; }
function getServerSnapshot() { return 0; }

export function useClock(): Date | null {
  const ms = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return ms ? new Date(ms) : null;
}

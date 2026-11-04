"use client";

// Whether flames show line by line (the game's Bonus Stats "Details" on) or as summed stats.
// One per-browser preference shared by the Enhancements window and the gear tooltips, so
// flipping either switch flips both.

import { useSyncExternalStore } from "react";

// Owned here only: a per-browser view preference, nothing else.
const KEY = "mapledoro_flame_details";

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// The last value set this visit, so the switch still works where storage is blocked.
let memory: boolean | null = null;

function read(): boolean {
  if (memory !== null) return memory;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(on: boolean) {
  memory = on;
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch { /* blocked storage: the switch still works for this visit */ }
  for (const listener of listeners) listener();
}

/** [details on, set it]. Off until set, and off during server render. */
export function useFlameDetails(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  return [on, write];
}

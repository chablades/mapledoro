/*
  Daily puzzle selection for MapGuessr.

  Stub pool of mapIds from hierarchy.ts, XOR-obfuscated so answers aren't plain
  in the bundle. Replace with a generator + API-backed crops when ready.
*/

import { MAP_GUESSER_PUZZLE_DATA } from "./puzzle-data";

export interface MapGuesserPuzzle {
  mapId: number;
}

export const MAX_GUESSES = 6;

// UTC day of puzzle #1 (skeleton epoch — adjust before public launch).
const EPOCH_UTC_MS = Date.UTC(2026, 6, 27);
const DAY_MS = 86_400_000;
const XOR_KEY = "mapledoro-map-guesser";

let cache: MapGuesserPuzzle[] | null = null;

function decodePuzzles(): MapGuesserPuzzle[] {
  if (!cache) {
    const bytes = Uint8Array.from(atob(MAP_GUESSER_PUZZLE_DATA), (c) => c.charCodeAt(0));
    for (let i = 0; i < bytes.length; i++) bytes[i] ^= XOR_KEY.charCodeAt(i % XOR_KEY.length);
    const ids = JSON.parse(new TextDecoder().decode(bytes)) as number[];
    cache = ids.map((mapId) => ({ mapId }));
  }
  return cache;
}

export function currentPuzzleNumber(nowMs = Date.now()): number {
  return Math.max(1, Math.floor((nowMs - EPOCH_UTC_MS) / DAY_MS) + 1);
}

export function puzzleDateMs(puzzleNumber: number): number {
  return EPOCH_UTC_MS + (puzzleNumber - 1) * DAY_MS;
}

export function getPuzzle(puzzleNumber: number): MapGuesserPuzzle {
  const puzzles = decodePuzzles();
  return puzzles[(puzzleNumber - 1) % puzzles.length];
}

export function msUntilNextPuzzle(nowMs = Date.now()): number {
  return DAY_MS - ((nowMs - EPOCH_UTC_MS) % DAY_MS);
}

/** Encode helper for regenerating the stub payload (dev / scripts). */
export function encodePuzzleIds(ids: number[]): string {
  const json = JSON.stringify(ids);
  const bytes = new TextEncoder().encode(json);
  for (let i = 0; i < bytes.length; i++) bytes[i] ^= XOR_KEY.charCodeAt(i % XOR_KEY.length);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/*
  MapGuessr results, stored under `mapGuesser` in the shared `mapledoro_games_v1`
  key alongside Mapledle's `skillGuesser`. Only the `mapGuesser` field is touched;
  everything else in the store passes through untouched.
*/

import { MAX_GUESSES } from "./puzzles";

const STORAGE_KEY = "mapledoro_games_v1";

export interface MapGuesserResult {
  /** Guessed map ids, in order. */
  guesses: number[];
  won: boolean;
  done: boolean;
}

type Results = Record<string, MapGuesserResult>;

function readRaw(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readResults(): Results {
  const mapGuesser = readRaw()?.mapGuesser as { results?: Results } | undefined;
  return mapGuesser?.results ?? {};
}

export function readMapGuesserResult(puzzleNumber: number): MapGuesserResult | undefined {
  return readResults()[String(puzzleNumber)];
}

export function writeMapGuesserResult(puzzleNumber: number, result: MapGuesserResult): void {
  if (typeof window === "undefined") return;
  // A fresh store starts at Mapledle's schema version so its reader accepts it.
  const store = readRaw() ?? { version: 2, skillGuesser: { results: {} } };
  store.mapGuesser = { results: { ...readResults(), [String(puzzleNumber)]: result } };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

export interface MapGuesserStats {
  played: number;
  /** Whole percent, 0-100. */
  winRate: number;
  /** Average guesses across wins, or null before the first win. */
  avgGuesses: number | null;
  /** Wins by guess count (index i = i + 1 guesses), last index = losses. */
  distribution: number[];
}

export function computeMapGuesserStats(): MapGuesserStats {
  const results = Object.values(readResults()).filter((r) => r.done);
  const distribution = Array.from({ length: MAX_GUESSES + 1 }, () => 0);
  let wins = 0;
  let winGuessTotal = 0;
  for (const r of results) {
    if (r.won) {
      wins += 1;
      winGuessTotal += r.guesses.length;
      distribution[Math.min(r.guesses.length, MAX_GUESSES) - 1] += 1;
    } else {
      distribution[MAX_GUESSES] += 1;
    }
  }
  return {
    played: results.length,
    winRate: results.length > 0 ? Math.round((wins / results.length) * 100) : 0,
    avgGuesses: wins > 0 ? winGuessTotal / wins : null,
    distribution,
  };
}

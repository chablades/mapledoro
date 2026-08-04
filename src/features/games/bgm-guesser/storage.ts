/*
  localStorage store for BGM Guesser results.

  Shares the `mapledoro_games_v1` key (and its version 2 schema) with the Skill
  Guesser, under its own `bgmGuesser` section. Both modules read the whole store
  and write it back, so each preserves the other's section -- keep it that way
  rather than reconstructing the object from known keys.
*/

const STORAGE_KEY = "mapledoro_games_v1";

export interface BgmGuesserResult {
  guesses: string[];
  won: boolean;
  done: boolean;
}

interface GamesStore {
  version: 2;
  bgmGuesser?: { results: Record<string, BgmGuesserResult> };
  [section: string]: unknown;
}

function readStore(): GamesStore {
  if (typeof window === "undefined") return { version: 2 };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (parsed?.version === 2) return parsed as GamesStore;
  } catch { /* ignore */ }
  return { version: 2 };
}

export function readPuzzleResult(puzzleNumber: number): BgmGuesserResult | undefined {
  return readStore().bgmGuesser?.results[String(puzzleNumber)];
}

export function writeBgmGuesserResult(puzzleNumber: number, result: BgmGuesserResult): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const results = { ...store.bgmGuesser?.results, [String(puzzleNumber)]: result };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...store, bgmGuesser: { results } }));
  } catch { /* ignore */ }
}

export interface BgmGuesserStats {
  played: number;
  /** Whole percent, 0-100. */
  winRate: number;
  /** Average guesses across wins, or null before the first win. */
  avgGuesses: number | null;
  /** Wins by guess count (indexes 0-2 = 1-3 guesses), last index = losses. */
  distribution: number[];
}

export function computeBgmGuesserStats(maxGuesses: number): BgmGuesserStats {
  const results = Object.values(readStore().bgmGuesser?.results ?? {}).filter((r) => r.done);
  const distribution = Array.from({ length: maxGuesses + 1 }, () => 0);
  let wins = 0;
  let winGuessTotal = 0;
  for (const r of results) {
    if (r.won) {
      wins += 1;
      winGuessTotal += r.guesses.length;
      distribution[Math.min(r.guesses.length, maxGuesses) - 1] += 1;
    } else {
      distribution[maxGuesses] += 1;
    }
  }
  return {
    played: results.length,
    winRate: results.length > 0 ? Math.round((wins / results.length) * 100) : 0,
    avgGuesses: wins > 0 ? winGuessTotal / wins : null,
    distribution,
  };
}

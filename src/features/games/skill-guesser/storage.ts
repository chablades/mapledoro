/*
  localStorage store for game results. Games live in their own
  `mapledoro_games_v1` key (mirrors globalToolsStore's shape/versioning).
*/

const STORAGE_KEY = "mapledoro_games_v1";

export interface SkillGuesserResult {
  guesses: string[];
  won: boolean;
  done: boolean;
}

interface GamesStore {
  version: 1;
  skillGuesser: { results: Record<string, SkillGuesserResult> };
}

function emptyStore(): GamesStore {
  return { version: 1, skillGuesser: { results: {} } };
}

function readStore(): GamesStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && parsed.skillGuesser?.results) return parsed as GamesStore;
    }
  } catch { /* ignore */ }
  return emptyStore();
}

export function readSkillGuesserResult(puzzleNumber: number): SkillGuesserResult | null {
  return readStore().skillGuesser.results[String(puzzleNumber)] ?? null;
}

export function writeSkillGuesserResult(puzzleNumber: number, result: SkillGuesserResult): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  store.skillGuesser.results[String(puzzleNumber)] = result;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

export interface SkillGuesserStats {
  played: number;
  /** Whole percent, 0-100. */
  winRate: number;
  /** Average guesses across wins, or null before the first win. */
  avgGuesses: number | null;
  /** Wins by guess count (indexes 0-4 = 1-5 guesses), index 5 = losses. */
  distribution: number[];
}

export function computeSkillGuesserStats(): SkillGuesserStats {
  const results = Object.values(readStore().skillGuesser.results).filter((r) => r.done);
  const distribution = [0, 0, 0, 0, 0, 0];
  let wins = 0;
  let winGuessTotal = 0;
  for (const r of results) {
    if (r.won) {
      wins += 1;
      winGuessTotal += r.guesses.length;
      distribution[Math.min(r.guesses.length, 5) - 1] += 1;
    } else {
      distribution[5] += 1;
    }
  }
  return {
    played: results.length,
    winRate: results.length > 0 ? Math.round((wins / results.length) * 100) : 0,
    avgGuesses: wins > 0 ? winGuessTotal / wins : null,
    distribution,
  };
}

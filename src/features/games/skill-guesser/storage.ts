/*
  localStorage store for game results + game preferences. Games live in their
  own `mapledoro_games_v1` key (mirrors globalToolsStore's shape/versioning).

  Each puzzle keeps a separate result per mode: `normal` and `hard`. Hard mode
  only becomes playable once the normal game is finished, and clearing it is
  what reveals the skill name. (Store schema version 2; v1 stored a single
  result per puzzle plus a global hard-mode toggle — migrated to `normal`.)
*/

const STORAGE_KEY = "mapledoro_games_v1";

export type GameMode = "normal" | "hard";

export interface SkillGuesserResult {
  guesses: string[];
  won: boolean;
  done: boolean;
}

/** Per-puzzle results, one slot per mode. */
export interface PuzzleResults {
  normal?: SkillGuesserResult;
  hard?: SkillGuesserResult;
}

interface GamesStore {
  version: 2;
  skillGuesser: { results: Record<string, PuzzleResults> };
}

function emptyStore(): GamesStore {
  return { version: 2, skillGuesser: { results: {} } };
}

/* v1: { version: 1, skillGuesser: { results: Record<string, SkillGuesserResult>, hardMode? } }.
   Old results scored against the class, so they all fold into the `normal` slot. */
function migrateV1(parsed: { skillGuesser?: { results?: Record<string, SkillGuesserResult> } }): GamesStore | null {
  const oldResults = parsed.skillGuesser?.results;
  if (!oldResults) return null;
  const results: Record<string, PuzzleResults> = {};
  for (const [key, result] of Object.entries(oldResults)) {
    results[key] = { normal: result };
  }
  return { version: 2, skillGuesser: { results } };
}

function readStore(): GamesStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 2 && parsed.skillGuesser?.results) return parsed as GamesStore;
      if (parsed?.version === 1) {
        const migrated = migrateV1(parsed);
        if (migrated) return migrated;
      }
    }
  } catch { /* ignore */ }
  return emptyStore();
}

export function readPuzzleResults(puzzleNumber: number): PuzzleResults {
  return readStore().skillGuesser.results[String(puzzleNumber)] ?? {};
}

export function writeSkillGuesserResult(
  puzzleNumber: number,
  mode: GameMode,
  result: SkillGuesserResult,
): void {
  if (typeof window === "undefined") return;
  const store = readStore();
  const key = String(puzzleNumber);
  store.skillGuesser.results[key] = { ...store.skillGuesser.results[key], [mode]: result };
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

export function computeSkillGuesserStats(mode: GameMode): SkillGuesserStats {
  const results = Object.values(readStore().skillGuesser.results)
    .map((r) => r[mode])
    .filter((r): r is SkillGuesserResult => r !== undefined && r.done);
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

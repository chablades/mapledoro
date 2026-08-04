/*
  Daily puzzle selection for the BGM Guesser game.

  Puzzles come from the obfuscated payload in puzzle-data.generated.ts
  (see scripts/generate-bgm-guesser-data.mjs). The active puzzle advances
  at 00:00:00 UTC; puzzle #1 ran on BGM_GUESSER_EPOCH day.
*/

import { BGM_GUESSER_ANSWER_DATA, BGM_GUESSER_PUZZLE_DATA } from "./puzzle-data.generated";

export interface BgmGuesserPuzzle {
  /** Manifest group, e.g. "Bgm53". Track names aren't unique without it. */
  group: string;
  track: string;
  /** Real track title from maplebgm-db, revealed with the answer. */
  title: string;
  /** The area or boss the track plays for -- the thing being guessed. */
  answer: string;
}

export interface BgmGuesserAnswer {
  name: string;
  /** ui-mark icon id (see markIconUrl). */
  mark: string;
  isBoss: boolean;
}

export const MAX_GUESSES = 3;

// UTC day of puzzle #1.
const EPOCH_UTC_MS = Date.UTC(2026, 7, 4);
const DAY_MS = 86_400_000;
const XOR_KEY = "mapledoro-bgm-guesser";

let cache: BgmGuesserPuzzle[] | null = null;

function decodePuzzles(): BgmGuesserPuzzle[] {
  if (!cache) {
    const bytes = Uint8Array.from(atob(BGM_GUESSER_PUZZLE_DATA), (c) => c.charCodeAt(0));
    for (let i = 0; i < bytes.length; i++) bytes[i] ^= XOR_KEY.charCodeAt(i % XOR_KEY.length);
    const raw = JSON.parse(new TextDecoder().decode(bytes)) as [string, string, string, string][];
    cache = raw.map(([group, track, title, answer]) => ({ group, track, title, answer }));
  }
  return cache;
}

export const BGM_GUESSER_ANSWERS: BgmGuesserAnswer[] = BGM_GUESSER_ANSWER_DATA.map(
  ([name, mark, isBoss]) => ({ name, mark, isBoss: isBoss === 1 }),
);

const answersByName = new Map(BGM_GUESSER_ANSWERS.map((a) => [a.name, a]));

export function findBgmGuesserAnswer(name: string): BgmGuesserAnswer | undefined {
  return answersByName.get(name);
}

export function currentPuzzleNumber(nowMs = Date.now()): number {
  return Math.max(1, Math.floor((nowMs - EPOCH_UTC_MS) / DAY_MS) + 1);
}

/** UTC midnight (epoch ms) a given puzzle number went live. */
export function puzzleDateMs(puzzleNumber: number): number {
  return EPOCH_UTC_MS + (puzzleNumber - 1) * DAY_MS;
}

export function getPuzzle(puzzleNumber: number): BgmGuesserPuzzle {
  const puzzles = decodePuzzles();
  return puzzles[(puzzleNumber - 1) % puzzles.length];
}

/** Milliseconds until the next 00:00:00 UTC rollover. */
export function msUntilNextPuzzle(nowMs = Date.now()): number {
  return DAY_MS - ((nowMs - EPOCH_UTC_MS) % DAY_MS);
}

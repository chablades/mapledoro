/*
  Daily puzzle selection for the Skill Guesser game.

  Puzzles come from the obfuscated payload in puzzle-data.generated.ts
  (see scripts/generate-skill-guesser-data.mjs). The active puzzle advances
  at 00:00:00 UTC; puzzle #1 ran on SKILL_GUESSER_EPOCH day.
*/

import { SKILL_GUESSER_PUZZLE_DATA } from "./puzzle-data.generated";

export type PuzzleResource = "skill" | "hexa-skill" | "erda-skill";

export interface SkillGuesserPuzzle {
  resource: PuzzleResource;
  skillId: string;
  skillName: string;
  className: string;
}

export const MAX_GUESSES = 5;

// UTC day of puzzle #1.
const EPOCH_UTC_MS = Date.UTC(2026, 5, 11);
const DAY_MS = 86_400_000;
const XOR_KEY = "mapledoro-skill-guesser";

// Payload resourceType codes, matching the generator script.
const RESOURCES: PuzzleResource[] = ["skill", "hexa-skill", "erda-skill"];

let cache: SkillGuesserPuzzle[] | null = null;

function decodePuzzles(): SkillGuesserPuzzle[] {
  if (!cache) {
    const bytes = Uint8Array.from(atob(SKILL_GUESSER_PUZZLE_DATA), (c) => c.charCodeAt(0));
    for (let i = 0; i < bytes.length; i++) bytes[i] ^= XOR_KEY.charCodeAt(i % XOR_KEY.length);
    const raw = JSON.parse(new TextDecoder().decode(bytes)) as [number, string, string, string][];
    cache = raw.map(([type, skillId, skillName, className]) => ({
      resource: RESOURCES[type] ?? "skill",
      skillId,
      skillName,
      className,
    }));
  }
  return cache;
}

export function currentPuzzleNumber(nowMs = Date.now()): number {
  return Math.max(1, Math.floor((nowMs - EPOCH_UTC_MS) / DAY_MS) + 1);
}

export function getPuzzle(puzzleNumber: number): SkillGuesserPuzzle {
  const puzzles = decodePuzzles();
  return puzzles[(puzzleNumber - 1) % puzzles.length];
}

/** Milliseconds until the next 00:00:00 UTC rollover. */
export function msUntilNextPuzzle(nowMs = Date.now()): number {
  return DAY_MS - ((nowMs - EPOCH_UTC_MS) % DAY_MS);
}

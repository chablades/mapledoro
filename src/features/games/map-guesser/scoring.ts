/*
  Per-level Wordle-style feedback for a map path guess.

  Green  = exact match at this level
  Yellow = wrong here, but parent level is green (same world/continent/region)
  Red    = wrong here and parent is not green
*/

import { getNode, pathForMapId, type HierarchyLevel, type MapPath } from "./hierarchy";

export type HintColor = "green" | "yellow" | "red";

export interface LevelFeedback {
  level: HierarchyLevel;
  label: string;
  guessLabel: string;
  color: HintColor;
}

const LEVELS: HierarchyLevel[] = ["world", "continent", "region", "map"];

export function scorePath(target: MapPath, guess: MapPath): HintColor[] {
  const colors: HintColor[] = [];
  for (let i = 0; i < 4; i++) {
    if (guess[i] === target[i]) {
      colors.push("green");
    } else if (i === 0 || colors[i - 1] !== "green") {
      colors.push("red");
    } else {
      colors.push("yellow");
    }
  }
  return colors;
}

export function feedbackForGuess(targetMapId: number, guessMapId: number): LevelFeedback[] | null {
  const target = pathForMapId(targetMapId);
  const guess = pathForMapId(guessMapId);
  if (!target || !guess) return null;
  const colors = scorePath(target, guess);
  return LEVELS.map((level, i) => ({
    level,
    label: level.charAt(0).toUpperCase() + level.slice(1),
    guessLabel: getNode(guess[i])?.label ?? guess[i],
    color: colors[i],
  }));
}

export function isCorrectGuess(targetMapId: number, guessMapId: number): boolean {
  return targetMapId === guessMapId;
}

/** Share squares: one row of 4 emoji per guess (world→map). */
export function shareSquaresForGuess(targetMapId: number, guessMapId: number): string {
  const target = pathForMapId(targetMapId);
  const guess = pathForMapId(guessMapId);
  if (!target || !guess) return "⬛⬛⬛⬛";
  return scorePath(target, guess)
    .map((c) => (c === "green" ? "🟩" : c === "yellow" ? "🟨" : "🟥"))
    .join("");
}

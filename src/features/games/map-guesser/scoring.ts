/*
  Per-guess feedback for MapGuessr.

  Each level of the guess's path (world → screens → spot → map) is green while it
  matches the target's path, red where it first diverges, and gray after. Below the
  world level, the guess also gets a compass hint: the direction and rough distance
  from the guess to the answer on the deepest screen they share.
*/

import { getScreen, pathForMapId, positionOn } from "./hierarchy";

export type LevelColor = "green" | "red" | "gray";

interface Direction {
  /** Arrow glyph pointing from the guess toward the answer, or a pin when they share a spot. */
  arrow: string;
  text: string;
}

export interface GuessFeedback {
  levels: { label: string; color: LevelColor }[];
  correct: boolean;
  direction: Direction | null;
}

// Screen y grows downward, so angle 0 is east and 90 is south.
const ARROWS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];

function matchedDepth(target: string[], guess: string[]): number {
  let i = 0;
  while (i < target.length && i < guess.length && target[i] === guess[i]) i++;
  return i;
}

function compass(screenId: string, targetMapId: number, guessMapId: number): Direction | null {
  const screen = getScreen(screenId);
  const t = positionOn(screenId, targetMapId);
  const g = positionOn(screenId, guessMapId);
  if (!screen || !t || !g) return null;
  const dx = t.x - g.x;
  const dy = t.y - g.y;
  if (dx === 0 && dy === 0) return { arrow: "📍", text: `Right spot on ${screen.label}` };
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const arrow = ARROWS[Math.round((angle + 360) / 45) % 8];
  const ratio = Math.hypot(dx, dy) / Math.hypot(screen.w, screen.h);
  let distance = "Very far";
  if (ratio < 0.1) distance = "Very close";
  else if (ratio < 0.25) distance = "Close";
  else if (ratio < 0.5) distance = "Far";
  return { arrow, text: `${distance} on ${screen.label}` };
}

export function feedbackForGuess(targetMapId: number, guessMapId: number): GuessFeedback | null {
  const target = pathForMapId(targetMapId);
  const guess = pathForMapId(guessMapId);
  if (!target || !guess) return null;
  const correct = targetMapId === guessMapId;
  const matched = matchedDepth(
    target.map((l) => l.key),
    guess.map((l) => l.key),
  );
  const levels = guess.map((level, i) => {
    let color: LevelColor = "gray";
    if (i < matched) color = "green";
    else if (i === matched) color = "red";
    return { label: level.label, color };
  });
  // The deepest shared screen: the path's last two levels are the spot and the map.
  const sharedScreens = Math.min(matched, guess.length - 2, target.length - 2);
  const direction =
    correct || sharedScreens === 0 ? null : compass(guess[sharedScreens - 1].key, targetMapId, guessMapId);
  return { levels, correct, direction };
}

/** One row of share squares per guess: green for each matched level, then red, then black. */
export function shareSquaresForGuess(targetMapId: number, guessMapId: number): string {
  const feedback = feedbackForGuess(targetMapId, guessMapId);
  if (!feedback) return "";
  if (feedback.correct) return "🟩".repeat(feedback.levels.length);
  return feedback.levels
    .map((l) => {
      if (l.color === "green") return "🟩";
      return l.color === "red" ? "🟥" : "⬛";
    })
    .join("");
}

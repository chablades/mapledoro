/*
  Archive routing shared by the daily games (Mapledle, BGM Guesser).

  Each game has two routes: the bare path, which is always today's puzzle, and
  `<base>/<n>`, which opens an earlier day directly. Both render the same
  workspace; the segment only seeds which puzzle it starts on.
*/

"use client";

import { useEffect, useState } from "react";

/**
 * A URL segment turned into a real puzzle number. Anything that isn't a plain
 * number, or points past the latest puzzle, falls back to today rather than
 * erroring: the archive is an unbounded number space, and a stale link (a share
 * from a day that hasn't come around yet) shouldn't dead-end.
 */
function parsePuzzleSegment(segment: string | undefined, today: number): number {
  if (!segment || !/^\d+$/.test(segment)) return today;
  return Math.min(Math.max(Number(segment), 1), today);
}

/**
 * Puzzle-number state seeded from the archive route, keeping the address bar on
 * whichever day is being viewed so it can be linked or reloaded.
 *
 * The URL is rewritten with `history.replaceState` rather than a router
 * navigation: the route is fully client-rendered, so navigating would remount
 * the same workspace, and every arrow press would stack a back-button entry.
 * Today's puzzle canonicalises back to `basePath`, which also cleans up an
 * out-of-range or already-current segment.
 */
export function usePuzzleRoute(
  basePath: string,
  urlPuzzle: string | undefined,
  today: number,
): [number, React.Dispatch<React.SetStateAction<number>>] {
  const [puzzleNumber, setPuzzleNumber] = useState(() => parsePuzzleSegment(urlPuzzle, today));

  useEffect(() => {
    const path = puzzleNumber >= today ? basePath : `${basePath}/${puzzleNumber}`;
    if (window.location.pathname !== path) {
      window.history.replaceState(null, "", path + window.location.search);
    }
  }, [basePath, puzzleNumber, today]);

  return [puzzleNumber, setPuzzleNumber];
}

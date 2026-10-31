/*
  What the latest change to a character's Boss 380 and Boss 300 HEXA did, so the overview and the
  Scouter bookmark can show it after the player edits something (a setup, a tool, Legion) instead
  of them having to remember the old figures. The store keeps the figures last shown and the ones
  before they changed (scouterSeenByCharacter); any difference between what they are now and that
  is a change, played once wherever the player sees it first.
*/

import { useEffect, useLayoutEffect, type RefObject } from "react";
import { toCharacterKey } from "../model/characterKeys";
import { readCharactersStore, writeScouterSeen, type StoredCharacterRecord, type StoredScouterSeen } from "../model/charactersStore";
import { formatShortDate } from "../../tools/date";
import { formatFigure } from "./scouterFormat";

export interface ScouterChange {
  /** Boss 380 HEXA before the change. */
  before: number;
  /** Boss 300 HEXA before it, when known. */
  before300?: number;
  /** ISO date the change was first shown, or undefined for one being shown right now. */
  changedAt?: string;
  /** Its animation hasn't played to the end yet. */
  fresh: boolean;
  /** Marks the change as seen, so its animation doesn't play again. */
  markSeen: () => void;
}

interface Figures {
  boss380: number;
  boss300: number;
}

// A Boss 300 recorded before it was tracked is unknown, not a change.
function differs(stored: StoredScouterSeen, r380: number, r300: number): boolean {
  return stored.last !== r380 || (stored.last300 !== undefined && stored.last300 !== r300);
}

/** Records the figures shown, as the store's next "last", keeping the old ones as "previous". */
function recordFigures(id: string, r380: number, r300: number): void {
  const stored = readCharactersStore().scouterSeenByCharacter[id];
  if (!stored) {
    writeScouterSeen(id, { last: r380, last300: r300 });
  } else if (differs(stored, r380, r300)) {
    writeScouterSeen(id, { last: r380, previous: stored.last, last300: r300, previous300: stored.last300, changedAt: new Date().toISOString() });
  } else if (stored.last300 === undefined) {
    writeScouterSeen(id, { ...stored, last300: r300 });
  }
}

/** The latest change behind `figures` (the real Boss 380 and Boss 300 HEXA, null while there are
 *  none), or null when they have never changed since they were first shown. */
export function useScouterChange(character: StoredCharacterRecord, figures: Figures | null): ScouterChange | null {
  const id = toCharacterKey(character);
  const r380 = figures === null ? null : Math.round(figures.boss380);
  const r300 = figures === null ? null : Math.round(figures.boss300);
  const seen = readCharactersStore().scouterSeenByCharacter[id];

  // Recording new figures writes to storage, not React state: the render below already shows
  // the change from what was stored, and the next render reads it back as `previous`.
  useEffect(() => {
    if (r380 !== null && r300 !== null) recordFigures(id, r380, r300);
  }, [id, r380, r300]);

  if (r380 === null || r300 === null || !seen) return null;
  const markSeen = () => {
    const stored = readCharactersStore().scouterSeenByCharacter[id];
    if (stored?.last === r380 && !stored.seen) writeScouterSeen(id, { ...stored, seen: true });
  };
  if (differs(seen, r380, r300)) return { before: seen.last, before300: seen.last300, fresh: true, markSeen };
  if (seen.previous === undefined) return null;
  return { before: seen.previous, before300: seen.previous300, changedAt: seen.changedAt, fresh: !seen.seen, markSeen };
}

/** The tooltip line for a figure's change: "Was 100,000 (Jan 1, 2026)", or null when that figure
 *  didn't change (`before` is the figure's own old value, `now` its current one). */
export function changeLine(change: ScouterChange, before: number | undefined, now: number): string | null {
  if (before === undefined || before === Math.round(now)) return null;
  const when = change.changedAt ? ` (${formatShortDate(new Date(change.changedAt))})` : "";
  return `Was ${formatFigure(before)}${when}`;
}

// Lines up with .scouter-change-chip in globals.css: the chip is in by 10% of its 2.6 s, then the
// figure counts for a second while it stays.
const COUNT_DELAY_MS = 260;
const COUNT_MS = 1000;

/** Counts a figure from `from` up (or down) to `to` by editing its text node in place, so React
 *  keeps owning the node and a later re-render still updates it. Skipped under reduced motion. */
export function useCountUp(ref: RefObject<HTMLElement | null>, from: number, to: number, active: boolean) {
  useLayoutEffect(() => {
    const node = ref.current?.firstChild;
    if (!active || !node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.nodeValue = formatFigure(from);
    const start = performance.now() + COUNT_DELAY_MS;
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
      node.nodeValue = formatFigure(from + (to - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [ref, from, to, active]);
}

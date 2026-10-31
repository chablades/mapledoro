/*
  What the latest change to a character's Boss 380 HEXA did, so the overview can show it after
  the player edits something (a setup, a tool, Legion) instead of them having to remember the old
  figure. The store keeps the figure the overview last showed and the one before it changed
  (scouterSeenByCharacter); any difference between what it shows now and that is a change.
*/

import { useEffect } from "react";
import { toCharacterKey } from "../model/characterKeys";
import { readCharactersStore, writeScouterSeen, type StoredCharacterRecord } from "../model/charactersStore";

export interface ScouterChange {
  before: number;
  /** ISO date the change was first shown, or undefined for one being shown right now. */
  changedAt?: string;
  /** The overview hasn't played this change's animation to the end yet. */
  fresh: boolean;
  /** Marks the change as seen, so its animation doesn't play again. */
  markSeen: () => void;
}

/** The latest change behind `value` (the real Boss 380 HEXA, null while there is none), or null
 *  when the figure has never changed since the overview first showed it. */
export function useScouterChange(character: StoredCharacterRecord, value: number | null): ScouterChange | null {
  const id = toCharacterKey(character);
  const rounded = value === null ? null : Math.round(value);
  const seen = readCharactersStore().scouterSeenByCharacter[id];

  // Recording a new figure writes to storage, not React state: the render below already shows
  // the change from what was stored, and the next render reads it back as `previous`.
  useEffect(() => {
    if (rounded === null) return;
    const stored = readCharactersStore().scouterSeenByCharacter[id];
    if (stored?.last === rounded) return;
    writeScouterSeen(id, stored ? { last: rounded, previous: stored.last, changedAt: new Date().toISOString() } : { last: rounded });
  }, [id, rounded]);

  if (rounded === null || !seen) return null;
  const markSeen = () => {
    const stored = readCharactersStore().scouterSeenByCharacter[id];
    if (stored?.last === rounded && !stored.seen) writeScouterSeen(id, { ...stored, seen: true });
  };
  if (seen.last !== rounded) return { before: seen.last, fresh: true, markSeen };
  if (seen.previous === undefined) return null;
  return { before: seen.previous, changedAt: seen.changedAt, fresh: !seen.seen, markSeen };
}

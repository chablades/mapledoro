/*
  Symbols the character's saved level hasn't unlocked yet are shown with a warning, not hidden.
  The saved level comes from Nexon's daily update, so someone who leveled into an area today still
  reads a level behind it until tomorrow. Only legacy classes, who can never have Arcane or Sacred
  symbols, still don't see them.
*/

import { ALL_SACRED_AREAS, ARCANE_AREAS } from "../../../tools/symbols/symbol-data";

const REQUIRED_LEVEL = new Map([...ARCANE_AREAS, ...ALL_SACRED_AREAS].map((a) => [a.name, a.requiredLevel]));

/** The warning for a symbol region above the character's saved level, or null when it's
 *  unlocked (or the level is unknown). */
export function symbolUnlockWarning(areaName: string, characterLevel: number | undefined): string | null {
  const required = REQUIRED_LEVEL.get(areaName);
  if (required === undefined || characterLevel === undefined || characterLevel >= required) return null;
  return `Unlocks at Lv. ${required}. Your saved level is ${characterLevel}, so fill this in if you've reached it.`;
}

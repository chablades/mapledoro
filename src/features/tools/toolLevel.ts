import type { StoredCharacterRecord } from "../characters/model/charactersStore";
import { readCharacterToolData, writeCharacterToolData } from "./characterToolStorage";

/** A character's progress as one tool holds it, saved under that tool's own key. */
interface SavedToolLevel {
  level: number;
  /** EXP percent into that level. Only tools that show one save it. */
  percent?: number;
}

/**
 * The saved progress, but only while it is ahead of the character record, and `null` once the
 * record has caught up and owns the numbers again.
 *
 * A record only refreshes on a lookup, so a player who levels in game can type the new level in
 * and keep using the tool. The record is a floor, not a ceiling: what the player typed survives
 * until the next refresh reaches it, and is dropped the moment it does.
 */
export function readToolProgress(
  character: StoredCharacterRecord,
  toolKey: string,
): SavedToolLevel | null {
  const saved = readCharacterToolData<Partial<SavedToolLevel>>(character.characterName, toolKey);
  if (!saved?.level || saved.level <= character.level) return null;
  return { level: saved.level, percent: saved.percent };
}

/** The level a tool shows for a character, for the tools that track only the level. */
export function readToolLevel(character: StoredCharacterRecord, toolKey: string): number {
  return readToolProgress(character, toolKey)?.level ?? character.level;
}

export function writeToolLevel(
  charName: string,
  toolKey: string,
  level: number,
  percent?: number,
): void {
  writeCharacterToolData(charName, toolKey, { level, percent } satisfies SavedToolLevel);
}

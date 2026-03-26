import type { NormalizedCharacterData } from "./types";

export function normalizeCharacterName(name: string) {
  return name.trim().toLowerCase();
}

export function normalizeCharacterKey(key: string) {
  return normalizeCharacterName(key);
}

export function toCharacterKey(character: NormalizedCharacterData) {
  return normalizeCharacterName(character.characterName);
}

export function findRosterCharacterByName(
  roster: NormalizedCharacterData[],
  name: string,
) {
  const normalizedName = normalizeCharacterName(name);
  return roster.find(
    (entry) => normalizeCharacterName(entry.characterName) === normalizedName,
  );
}

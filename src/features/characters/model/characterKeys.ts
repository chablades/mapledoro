// Both NormalizedCharacterData (API response) and StoredCharacterRecord (persisted)
// have characterName, so we use a minimal structural type here.
interface HasCharacterName {
  characterName: string;
}

export function normalizeCharacterName(name: string) {
  return name.trim().toLowerCase();
}

export function normalizeCharacterKey(key: string) {
  return normalizeCharacterName(key);
}

export function toCharacterKey(character: HasCharacterName) {
  return normalizeCharacterName(character.characterName);
}

export function findRosterCharacterByName(
  roster: HasCharacterName[],
  name: string,
) {
  const normalizedName = normalizeCharacterName(name);
  return roster.find(
    (entry) => normalizeCharacterName(entry.characterName) === normalizedName,
  );
}

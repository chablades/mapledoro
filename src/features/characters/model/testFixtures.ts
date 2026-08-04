// Test-only fixture builders for StoredCharacterRecord/NormalizedCharacterData. Kept out of
// *.test.ts files since multiple test files under this feature need the same shape (merge,
// world-import, link-skill sync). Deliberately routes through the real `createStoredCharacterRecord`
// factory rather than hand-duplicating its ~10 nested field types, so a fixture is always as
// valid as the app's own "empty character" and drifts with the type instead of silently going stale.
import { createStoredCharacterRecord, type StoredCharacterRecord } from "./charactersStore";
import type { NormalizedCharacterData } from "./types";

let nextCharacterId = 1;

export function makeNormalizedCharacterData(overrides: Partial<NormalizedCharacterData> = {}): NormalizedCharacterData {
  const id = nextCharacterId++;
  return {
    characterID: id,
    characterName: `TestChar${id}`,
    worldID: 1,
    level: 200,
    exp: 0,
    jobName: "Dark Knight",
    characterImgURL: "",
    isSearchTarget: false,
    startRank: 0,
    overallRank: 0,
    overallGap: 0,
    legionRank: 0,
    legionGap: 0,
    legionLevel: 0,
    raidPower: 0,
    tierID: 0,
    score: 0,
    fetchedAt: 0,
    expiresAt: 0,
    ...overrides,
  };
}

export function makeStoredCharacterRecord(
  overrides: Partial<Parameters<typeof createStoredCharacterRecord>[0]> = {},
  characterOverrides: Partial<NormalizedCharacterData> = {},
): StoredCharacterRecord {
  return createStoredCharacterRecord({
    character: makeNormalizedCharacterData(characterOverrides),
    addedAt: 1000,
    updatedAt: 1000,
    ...overrides,
  });
}

import { describe, expect, it } from "vitest";
import {
  mergeImportedCharacterRecord,
  parseImportedWorldPayload,
  type ImportSectionId,
  type StoredCharacterRecord,
  type WorldExportPayload,
} from "./charactersStore";
import { makeStoredCharacterRecord } from "./testFixtures";
import { MAX_CHARACTERS_PER_WORLD } from "./constants";

const ALL_SECTIONS: ImportSectionId[] = [
  "identity", "stats", "equipment", "vMatrix", "linkSkills",
  "familiars", "scouter", "tools", "expHistory", "overviewLayout",
];

function allChoices(choice: "mine" | "imported"): Record<ImportSectionId, "mine" | "imported"> {
  return Object.fromEntries(ALL_SECTIONS.map((id) => [id, choice])) as Record<ImportSectionId, "mine" | "imported">;
}

describe("mergeImportedCharacterRecord", () => {
  const existing = makeStoredCharacterRecord(
    { gender: "male", isLiberated: false, addedAt: 500, updatedAt: 500 },
    { characterName: "ExistingIgn" },
  );
  const imported = makeStoredCharacterRecord(
    { gender: "female", isLiberated: true, addedAt: 999, updatedAt: 999 },
    { characterName: "ImportedIgn" },
  );

  it("always keeps the existing record's ign, regardless of choices", () => {
    const result = mergeImportedCharacterRecord(existing, imported, allChoices("imported"));
    expect(result.ign).toBe(existing.ign);
  });

  it("always keeps the existing record's meta.addedAt, and refreshes updatedAt", () => {
    const result = mergeImportedCharacterRecord(existing, imported, allChoices("mine"));
    expect(result.meta.addedAt).toBe(existing.meta.addedAt);
    expect(result.meta.updatedAt).toBeGreaterThanOrEqual(Date.now() - 1000);
  });

  it("picking 'mine' for identity keeps every identity field from existing", () => {
    const choices = { ...allChoices("imported"), identity: "mine" as const };
    const result = mergeImportedCharacterRecord(existing, imported, choices);
    expect(result.gender).toBe(existing.gender);
    expect(result.isLiberated).toBe(existing.isLiberated);
  });

  it("picking 'imported' for identity takes every identity field from imported", () => {
    const choices = { ...allChoices("mine"), identity: "imported" as const };
    const result = mergeImportedCharacterRecord(existing, imported, choices);
    expect(result.gender).toBe(imported.gender);
    expect(result.isLiberated).toBe(imported.isLiberated);
  });

  it("soul follows the 'scouter' choice, not its own section", () => {
    const withSoul = { ...existing, soul: { level: 5 } as StoredCharacterRecord["soul"] };
    const importedWithSoul = { ...imported, soul: { level: 9 } as StoredCharacterRecord["soul"] };
    const keepMineScouter = { ...allChoices("imported"), scouter: "mine" as const };
    const result = mergeImportedCharacterRecord(withSoul, importedWithSoul, keepMineScouter);
    expect(result.soul).toEqual(withSoul.soul);
  });

  it("each independent section can be picked separately (not all-or-nothing)", () => {
    const choices = { ...allChoices("mine"), stats: "imported" as const };
    const result = mergeImportedCharacterRecord(existing, imported, choices);
    expect(result.stats).toBe(imported.stats);
    expect(result.gender).toBe(existing.gender); // identity still "mine"
  });

  it("'mine' for every section reproduces every mergeable field from existing", () => {
    const result = mergeImportedCharacterRecord(existing, imported, allChoices("mine"));
    expect(result.gender).toBe(existing.gender);
    expect(result.stats).toBe(existing.stats);
    expect(result.equipment).toBe(existing.equipment);
    expect(result.tools).toBe(existing.tools);
    expect(result.expHistory).toBe(existing.expHistory);
  });

  it("'imported' for every section takes every mergeable field from imported", () => {
    const result = mergeImportedCharacterRecord(existing, imported, allChoices("imported"));
    expect(result.gender).toBe(imported.gender);
    expect(result.stats).toBe(imported.stats);
    expect(result.equipment).toBe(imported.equipment);
  });

  it("fields not covered by any ImportSectionId always come from imported (base spread)", () => {
    const result = mergeImportedCharacterRecord(existing, imported, allChoices("mine"));
    // level/jobName/etc. aren't part of any ImportSectionId choice - always follow imported
    expect(result.level).toBe(imported.level);
    expect(result.jobName).toBe(imported.jobName);
  });
});

describe("parseImportedWorldPayload", () => {
  function basePayload(characters: StoredCharacterRecord[]): unknown {
    return {
      kind: "world",
      worldID: 1,
      characters,
      mainCharacterKey: null,
      championCharacterKeys: [],
    };
  }

  it("returns null when kind is not 'world'", () => {
    expect(parseImportedWorldPayload({ kind: "character", worldID: 1, characters: [] })).toBeNull();
  });

  it("returns null when worldID is missing or not a number", () => {
    expect(parseImportedWorldPayload({ kind: "world", characters: [] })).toBeNull();
  });

  it("returns null when characters is not an array", () => {
    expect(parseImportedWorldPayload({ kind: "world", worldID: 1, characters: "nope" })).toBeNull();
  });

  it("returns null when characters exceeds MAX_CHARACTERS_PER_WORLD", () => {
    const characters = Array.from({ length: MAX_CHARACTERS_PER_WORLD + 1 }, (_, i) =>
      makeStoredCharacterRecord({}, { characterName: `Char${i}` }),
    );
    expect(parseImportedWorldPayload(basePayload(characters))).toBeNull();
  });

  it("accepts exactly MAX_CHARACTERS_PER_WORLD characters", () => {
    const characters = Array.from({ length: MAX_CHARACTERS_PER_WORLD }, (_, i) =>
      makeStoredCharacterRecord({}, { characterName: `Char${i}` }),
    );
    const result = parseImportedWorldPayload(basePayload(characters));
    expect(result?.characters).toHaveLength(MAX_CHARACTERS_PER_WORLD);
  });

  it("drops individually-invalid character entries but keeps the payload if others are valid", () => {
    const valid = makeStoredCharacterRecord({}, { characterName: "ValidOne" });
    const result = parseImportedWorldPayload(basePayload([valid, { not: "a character" } as unknown as StoredCharacterRecord]));
    expect(result?.characters).toHaveLength(1);
    expect(result?.characters[0].ign).toBe(valid.ign);
  });

  it("returns null when the payload has zero valid characters after filtering", () => {
    const result = parseImportedWorldPayload(basePayload([{ not: "a character" } as unknown as StoredCharacterRecord]));
    expect(result).toBeNull();
  });

  it("rejects the whole payload if two characters share the same IGN case-insensitively", () => {
    const a = makeStoredCharacterRecord({}, { characterName: "SameName" });
    const b = makeStoredCharacterRecord({}, { characterName: "samename" });
    expect(parseImportedWorldPayload(basePayload([a, b]))).toBeNull();
  });

  it("accepts characters with distinct IGNs", () => {
    const a = makeStoredCharacterRecord({}, { characterName: "First" });
    const b = makeStoredCharacterRecord({}, { characterName: "Second" });
    const result = parseImportedWorldPayload(basePayload([a, b]));
    expect(result?.characters).toHaveLength(2);
  });

  it("drops mainCharacterKey/championCharacterKeys entries of the wrong type", () => {
    const valid = makeStoredCharacterRecord({}, { characterName: "Anyone" });
    const payload = {
      ...basePayload([valid]) as Record<string, unknown>,
      mainCharacterKey: 12345,
      championCharacterKeys: ["ok", 42, "also-ok"],
    };
    const result = parseImportedWorldPayload(payload) as WorldExportPayload;
    expect(result.mainCharacterKey).toBeNull();
    expect(result.championCharacterKeys).toEqual(["ok", "also-ok"]);
  });
});

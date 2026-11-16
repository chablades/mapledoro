import { test } from "node:test";
import assert from "node:assert/strict";
import { createStoredCharacterRecord } from "../../src/features/characters/model/charactersStore.ts";
import { storedStatsToStatsStepDraft } from "../../src/features/characters/setup/data/statsStepDraft.ts";

void test("a new lookup character can supply the Character Info comparison before being saved", () => {
  for (const jobName of ["Lethe", "Hero"]) {
    const lookup = { characterName: "NewCharacter", worldID: 1, level: 260, jobName, exp: 0 };
    // The former type cast passed this raw lookup straight through to Character Info.
    assert.throws(() => storedStatsToStatsStepDraft(lookup), TypeError);
    const record = createStoredCharacterRecord({ character: lookup });
    const draft = storedStatsToStatsStepDraft(record);
    assert.deepEqual(draft.str, { base: "", percent: "", percentUnapplied: "" });
    assert.equal(record.characterName, lookup.characterName);
    assert.equal(record.jobName, jobName);
    assert.equal(lookup.stats, undefined);
  }
});

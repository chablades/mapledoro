// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStoredCharacterRecord } from "../../src/features/characters/model/charactersStore.ts";
import { storedEquipmentToDraft } from "../../src/features/characters/setup/data/equipmentStepDraft.ts";

function equipment() {
  return createStoredCharacterRecord({
    character: {
      characterID: 1, characterName: "UpgradeTest", worldID: 1, level: 280, exp: 0, jobName: "Hero",
      characterImgURL: "", isSearchTarget: false, startRank: 0, overallRank: 0, overallGap: 0, legionRank: 0,
      legionGap: 0, legionLevel: 0, raidPower: 0, tierID: 0, score: 0, fetchedAt: 0, expiresAt: 0,
    },
  }).equipment;
}

const HAT = { id: "01004808", name: "Arcane Umbra Knight Hat" };
const FLAMED_HAT = { ...HAT, starForce: 22, flame: [{ line: "str", tier: 6 }, { line: "allStat", tier: 6 }] };

void test("an item's Star Force and flames survive loading into the setup step", () => {
  const eq = equipment();
  eq.presets[0].hat = FLAMED_HAT;
  const draft = storedEquipmentToDraft(eq, undefined);
  assert.deepEqual(draft.presets[0].hat, FLAMED_HAT);
});

void test("a Preset 2 slot still mirrors Preset 1 when it holds the same item with the same upgrades", () => {
  const eq = equipment();
  eq.presets[0].hat = FLAMED_HAT;
  eq.presets[1].hat = FLAMED_HAT; // stored dense, a copy of Preset 1's
  assert.equal(storedEquipmentToDraft(eq, undefined).presets[1].hat, undefined);
});

void test("the same item with different upgrades in Preset 2 is its own copy", () => {
  const eq = equipment();
  eq.presets[0].hat = FLAMED_HAT;
  eq.presets[1].hat = { ...HAT, starForce: 17 };
  assert.deepEqual(storedEquipmentToDraft(eq, undefined).presets[1].hat, { ...HAT, starForce: 17 });
});

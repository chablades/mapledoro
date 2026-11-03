// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStoredCharacterRecord } from "../../src/features/characters/model/charactersStore.ts";
import { decodeCharacterQr, encodeCharacterQr } from "../../src/features/characters/share/qrCodec.ts";

// The decoder fetches item names from public/data; read them from disk instead.
const load = async (path) => JSON.parse(await readFile(new URL(`../../public${path}`, import.meta.url), "utf8"));

function character(skillRing) {
  const record = createStoredCharacterRecord({
    character: {
      characterID: 1, characterName: "QrTest", worldID: 1, level: 280, exp: 0, jobName: "Hero",
      characterImgURL: "", isSearchTarget: false, startRank: 0, overallRank: 0, overallGap: 0, legionRank: 0,
      legionGap: 0, legionLevel: 0, raidPower: 0, tierID: 0, score: 0, fetchedAt: 0, expiresAt: 0,
    },
  });
  const preset = record.equipment.presets[0];
  preset.rings[0] = { id: "01113329", name: "Continuous Ring" };
  preset.skillRing = skillRing;
  return record;
}

void test("a card's QR carries the skill ring", async () => {
  const { data } = encodeCharacterQr(character({ id: "01113098", name: "Ring of Restraint" }), {});
  const decoded = await decodeCharacterQr(data, load);
  const preset = decoded?.record.equipment.presets[0];
  assert.equal(preset?.rings[0]?.id, "01113329");
  assert.deepEqual(preset?.skillRing, { id: "01113098", name: "Ring of Restraint" });
});

void test("an empty skill ring slot decodes as empty", async () => {
  const { data } = encodeCharacterQr(character(null), {});
  const decoded = await decodeCharacterQr(data, load);
  assert.equal(decoded?.record.equipment.presets[0]?.skillRing ?? null, null);
});

// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStoredCharacterRecord } from "../../src/features/characters/model/charactersStore.ts";
import { decodeCharacterQr, encodeCharacterQr } from "../../src/features/characters/share/qrCodec.ts";

const load = async (path) => JSON.parse(await readFile(new URL(`../../public${path}`, import.meta.url), "utf8"));

function character(jobName) {
  return createStoredCharacterRecord({
    character: {
      characterID: 1, characterName: "QrTest", worldID: 1, level: 280, exp: 0, jobName,
      characterImgURL: "", isSearchTarget: false, startRank: 0, overallRank: 0, overallGap: 0, legionRank: 0,
      legionGap: 0, legionLevel: 0, raidPower: 0, tierID: 0, score: 0, fetchedAt: 0, expiresAt: 0,
    },
  });
}

void test("a new class gets its own slot in the card's class list", async () => {
  const { data } = encodeCharacterQr(character("Lethe"), {});
  assert.equal((await decodeCharacterQr(data, load))?.record.jobName, "Lethe");
  // A class missing from the list is spelled out in full, so its card comes out longer.
  const unlisted = encodeCharacterQr(character("Xethe"), {}).data;
  assert.ok(data.length < unlisted.length, "Lethe was encoded as an unlisted class");
});

// Cards already shared carry each class as its position in the list, so adding a class anywhere
// but the end would make these decode as a different class.
void test("cards made before a class was added still decode to the same class", async () => {
  const cards = {
    Hoyoung: "E80E5PUQJ:50*R6000000000000Y710000000000001*8V30000000D0000000000000000000",
    "Erel Light": "E80E5PUQJF80*R6000000000000Y710000000000001*8V30000000D0000000000000000000",
    "Wizard (I/L)": "E80E5PUQJBA0*R6000000000000Y710000000000001*8V30000000D0000000000000000000",
  };
  for (const [jobName, data] of Object.entries(cards)) {
    assert.equal((await decodeCharacterQr(data, load))?.record.jobName, jobName);
  }
});

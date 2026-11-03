// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearIntentionalRemovals,
  markIntentionalRemoval,
  restoreVanishedCharacters,
} from "../../src/features/characters/model/vanishGuard.ts";

const record = (name, worldID = 1) => ({ characterName: name, worldID, level: 200, jobName: "Hero" });

function storeOf(names, roles = {}) {
  return {
    version: 1,
    order: names.map((n) => n.toLowerCase()),
    charactersById: Object.fromEntries(names.map((n) => [n.toLowerCase(), record(n)])),
    mainCharacterIdByWorld: roles.main ?? {},
    championCharacterIdsByWorld: roles.champions ?? {},
    legionArtifactByWorld: { 1: { untouched: true } },
  };
}

void test("a character missing from the new store without a removal request is put back", () => {
  // The two-tab case: disk has alpha + bravo (bravo added in another tab), and this tab's
  // roster, which never saw bravo, saves only alpha.
  const before = storeOf(["Alpha", "Bravo"]);
  const next = storeOf(["Alpha"]);
  const { store, restored } = restoreVanishedCharacters(before, next);
  assert.deepEqual(restored, ["bravo"]);
  assert.deepEqual(store.order, ["alpha", "bravo"]);
  assert.equal(store.charactersById.bravo, before.charactersById.bravo);
});

void test("the rest of the write still goes through", () => {
  const before = storeOf(["Alpha", "Bravo"]);
  const next = storeOf(["Alpha"]);
  next.charactersById.alpha = { ...next.charactersById.alpha, level: 285 };
  const { store } = restoreVanishedCharacters(before, next);
  assert.equal(store.charactersById.alpha.level, 285);
  assert.deepEqual(store.legionArtifactByWorld, next.legionArtifactByWorld);
});

void test("inputs are not modified", () => {
  const before = storeOf(["Alpha", "Bravo"]);
  const next = storeOf(["Alpha"]);
  const nextCopy = structuredClone(next);
  restoreVanishedCharacters(before, next);
  assert.deepEqual(next, nextCopy);
});

void test("a requested removal goes through and is reported as removed", () => {
  const before = storeOf(["Alpha", "Charlie"]);
  const next = storeOf(["Alpha"]);
  markIntentionalRemoval(" Charlie ");
  const { store, restored, removed } = restoreVanishedCharacters(before, next);
  assert.deepEqual(restored, []);
  assert.deepEqual(removed, ["charlie"]);
  assert.equal(store, next);
  clearIntentionalRemovals(removed);
});

void test("a cleared marker protects the character again", () => {
  markIntentionalRemoval("delta");
  clearIntentionalRemovals(["delta"]);
  const { restored } = restoreVanishedCharacters(storeOf(["Alpha", "Delta"]), storeOf(["Alpha"]));
  assert.deepEqual(restored, ["delta"]);
});

void test("a restored character gets its Main back only if the world has none", () => {
  const before = storeOf(["Alpha", "Bravo"], { main: { 1: "bravo", 2: "bravo" } });
  const next = storeOf(["Alpha"], { main: { 2: "alpha" } });
  const { store } = restoreVanishedCharacters(before, next);
  assert.deepEqual(store.mainCharacterIdByWorld, { 1: "bravo", 2: "alpha" });
});

void test("a restored character gets its Champion slot back while the world is under the cap", () => {
  const before = storeOf(["Alpha", "Bravo"], { champions: { 1: ["alpha", "bravo"], 2: ["bravo"] } });
  const full = ["c1", "c2", "c3", "c4", "c5"];
  const next = storeOf(["Alpha"], { champions: { 1: ["alpha"], 2: full } });
  const { store } = restoreVanishedCharacters(before, next);
  assert.deepEqual(store.championCharacterIdsByWorld[1], ["alpha", "bravo"]);
  assert.deepEqual(store.championCharacterIdsByWorld[2], full);
});

void test("nothing missing returns the new store untouched", () => {
  const next = storeOf(["Alpha", "Bravo"]);
  const result = restoreVanishedCharacters(storeOf(["Alpha"]), next);
  assert.equal(result.store, next);
  assert.deepEqual(result.restored, []);
});

// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

// The tools store reads localStorage only in the browser, so give it a window and a small store.
const mem = new Map();
globalThis.window = globalThis;
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { BOSSES, PRE_V272_REMOVED } = await import("../../src/features/tools/boss-crystals/bosses.ts");
const { loadState, saveState } = await import("../../src/features/tools/boss-crystals/boss-crystals-types.ts");

const row = (checked, partySize = 1) => ({ checked, partySize });
const put = (bossCrystals) => mem.set("mapledoro_tools_v1", JSON.stringify({ version: 1, bossCrystals }));

void test("a save from before v272 keeps each boss's row after the four removed bosses left the list", () => {
  // Old layout: the four removed bosses first, then today's list. Plan Lotus (Hard) with party 2.
  const oldNames = [...PRE_V272_REMOVED, ...BOSSES.map((b) => b.name)];
  const bosses = oldNames.map((name) => row(name === "Lotus (Hard)" || name === "Hilla (Hard)", name === "Lotus (Hard)" ? 2 : 1));
  put({ server: "heroic", characters: [{ name: "Alt", imageURL: null, world: "heroic", bosses }] });

  const loaded = loadState();
  const rows = loaded.characters[0].bosses;
  assert.equal(rows.length, BOSSES.length);
  const planned = BOSSES.filter((_, i) => rows[i].checked).map((b) => b.name);
  assert.deepEqual(planned, ["Lotus (Hard)"]);
  assert.equal(rows[BOSSES.findIndex((b) => b.name === "Lotus (Hard)")].partySize, 2);
});

void test("a save made now records boss names and loads back unchanged", () => {
  const bosses = BOSSES.map((b) => row(b.name === "Kaling (Hard)"));
  saveState("heroic", [{ name: "Main", imageURL: null, world: "heroic", bosses }]);
  const saved = JSON.parse(mem.get("mapledoro_tools_v1")).bossCrystals;
  assert.deepEqual(saved.bossNames, BOSSES.map((b) => b.name));
  const rows = loadState().characters[0].bosses;
  assert.deepEqual(BOSSES.filter((_, i) => rows[i].checked).map((b) => b.name), ["Kaling (Hard)"]);
});

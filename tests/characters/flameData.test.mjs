// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canFlame, flameLinesFor, flameTiers, flameValue, formatFlameValue, maxStarForce, solveFlame, totalsOf,
} from "../../src/features/characters/setup/data/flameData.ts";

const armor = (level, bossReward = false) => ({ level, isWeapon: false, bossReward, baseAtt: 0, baseMatt: 0 });
// Arcane Umbra Shining Rod: Lv. 200, Magic ATT 347, Flame Advantaged.
const ARCANE_ROD = { level: 200, isWeapon: true, bossReward: true, baseAtt: 206, baseMatt: 347 };

void test("armor flames follow the wiki's level bands", () => {
  assert.equal(flameValue("str", 6, armor(200)), 66);
  assert.equal(flameValue("str", 6, armor(230)), 72); // 230+ is its own band
  assert.equal(flameValue("strDex", 5, armor(249)), 30); // 200 to 249 shares a band
  assert.equal(flameValue("maxHp", 7, armor(250)), 4900);
  assert.equal(flameValue("allStat", 6, armor(200)), 6);
  assert.equal(formatFlameValue("allStat", 6), "+6%");
  assert.equal(formatFlameValue("reqLevel", flameValue("reqLevel", 2, armor(200))), "-10");
});

void test("a weapon's attack flame is a share of its base attack, larger on boss weapons", () => {
  // 6 (level band) x 7 x 1.1^4 = 61.49% of 347, rounded up.
  assert.equal(flameValue("matt", 7, ARCANE_ROD), 214);
  const normal = { ...ARCANE_ROD, bossReward: false };
  assert.equal(flameValue("matt", 5, normal), Math.ceil(347 * 0.43923));
});

void test("boss items roll tiers 3 to 7; a normal weapon's attack stops at 5", () => {
  assert.deepEqual(flameTiers("str", armor(200, true)), [3, 4, 5, 6, 7]);
  assert.deepEqual(flameTiers("str", armor(200)), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(flameTiers("att", { ...ARCANE_ROD, bossReward: false }), [1, 2, 3, 4, 5]);
});

void test("weapons get Boss Damage and Damage, armor gets Speed and Jump", () => {
  const weapon = flameLinesFor(ARCANE_ROD);
  assert.ok(weapon.includes("bossDamage") && !weapon.includes("speed"));
  const hat = flameLinesFor(armor(200));
  assert.ok(hat.includes("jump") && !hat.includes("damage"));
});

void test("which slots take flames, with the three named exceptions", () => {
  assert.ok(canFlame("hat", "01004808"));
  assert.ok(!canFlame("ring1", "01113098"));
  assert.ok(!canFlame("shoulder", "01152000"));
  assert.ok(canFlame("shoulder", "01152155")); // Scarlet Shoulder
});

void test("the Star Force cap comes from level, with the Superior sets capped lower", () => {
  assert.equal(maxStarForce("Arcane Umbra Knight Hat", 200, 12), 30);
  assert.equal(maxStarForce("Some Lv 130 Hat", 130, 7), 20);
  assert.equal(maxStarForce("Tyrant Lycaon Boots", 150, 0), 15);
  assert.equal(maxStarForce("Sweetwater Shoes", 160, 8), 15);
  assert.equal(maxStarForce("Some Emblem", 200, 0), 0);
});

// A made-up Lv. 200 Flame Advantaged weapon with base ATT 200 / Magic ATT 300.
const WEAPON = { level: 200, isWeapon: true, bossReward: true, baseAtt: 200, baseMatt: 300 };
// Its flame: Defense T5, ATT T6, Magic ATT T7, Boss Damage T5, summed as the tooltip shows it.
const WEAPON_TOTALS = { "Defense": 55, "Attack Power": 96, "Magic ATT": 185, "Boss Damage": 10 };

void test("a boss weapon's summed flame resolves to one set of lines", () => {
  const { matches, missingLine } = solveFlame(WEAPON, WEAPON_TOTALS);
  assert.equal(missingLine, false);
  assert.equal(matches.length, 1);
  const byLine = Object.fromEntries(matches[0].map((l) => [l.line, l.tier]));
  assert.deepEqual(byLine, { defense: 5, att: 6, matt: 7, bossDamage: 5 });
});

void test("solving and summing are inverses", () => {
  const hat = { level: 200, isWeapon: false, bossReward: true, baseAtt: 0, baseMatt: 0 };
  const lines = [{ line: "str", tier: 6 }, { line: "strDex", tier: 5 }, { line: "allStat", tier: 6 }, { line: "att", tier: 5 }];
  const totals = totalsOf(lines, hat);
  assert.deepEqual(totals, { "STR": 96, "DEX": 30, "All Stats": 6, "Attack Power": 5 });
  assert.ok(solveFlame(hat, totals).matches.some((m) => m.length === 4 && lines.every((l) => m.some((x) => x.line === l.line && x.tier === l.tier))));
});

void test("a boss flame with a stat left out is flagged, not silently matched", () => {
  // Only 3 of the weapon's 4 green numbers.
  const { Defense: _left, ...three } = WEAPON_TOTALS;
  const { matches, missingLine } = solveFlame(WEAPON, three);
  assert.equal(missingLine, true);
  assert.ok(matches.every((m) => m.length < 4));
});

void test("numbers no flame can make find nothing", () => {
  assert.deepEqual(solveFlame(WEAPON, { "Defense": 56 }).matches, []);
});

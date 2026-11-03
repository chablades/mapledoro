// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBossClear, computePartyClear } from "../../src/features/characters/scouter/bossClearFormula.ts";
import { BOSSCUT_DATA } from "../../src/features/characters/scouter/bosscut-data.generated.ts";

const boss = (name, difficulty) => {
  const entry = BOSSCUT_DATA.find((e) => e.name === name && e.difficulty === difficulty);
  assert.ok(entry, `${name} ${difficulty} is in the boss data`);
  return entry;
};

// A straight-line curve keeps damage proportional to the stat, so the figures are easy to reason
// about. ascentConst 1 is MapleScouter's "no Ascent".
const line = { x: [0, 400000], y: [0, 4e9], m: [1e4, 1e4] };
function inputs(damage, ascentConst = 1) {
  return {
    calculatedHexaDamage300: damage, calculatedHexaDamage380: damage, calculatedDamage380: damage,
    calculatedHexaDamageKaling: damage, ascentConst, ignoreDefConst300: 0.9, ignoreDefConst380: 0.9,
    spline300: line, spline380: line, genePassConst: 1,
  };
}
const LEVEL = 290;
const FORCE = 99999;
const member = (damage, ascentConst, level = LEVEL) => ({ level, arcaneForce: FORCE, authenticForce: FORCE, inputs: inputs(damage, ascentConst) });

/** The damage that gives `rate` alone on `entry`, with no Ascent (clear rate is then linear). */
function damageFor(entry, rate) {
  const unit = computeBossClear(entry, LEVEL, FORCE, FORCE, inputs(1e8));
  const soloRate = unit.soloScalePercent === null ? unit.clearRate : unit.soloScalePercent / 100;
  return (1e8 * rate) / soloRate;
}

void test("a party of one matches the character's own Boss Clear on a solo-cut boss, Ascent included", () => {
  const seren = boss("seren", "Normal");
  for (const rate of [0.5, 1.2, 2.4, 5]) {
    const solo = member(damageFor(seren, rate), 0.12);
    const own = computeBossClear(seren, LEVEL, FORCE, FORCE, solo.inputs);
    const party = computePartyClear(seren, [solo]);
    assert.ok(Math.abs(party.clearRate - own.clearRate) < 1e-9, `at ${rate}`);
    assert.equal(party.members[0].clearRate, party.clearRate);
    assert.equal(party.partyHexa, own.bossStat);
  }
});

void test("members' shares add up to the party's clear rate, without Ascent a plain sum", () => {
  const seren = boss("seren", "Normal");
  const party = computePartyClear(seren, [member(damageFor(seren, 0.6), 1), member(damageFor(seren, 0.3), 1)]);
  assert.ok(Math.abs(party.members[0].clearRate - 0.6) < 1e-9);
  assert.ok(Math.abs(party.members[1].clearRate - 0.3) < 1e-9);
  assert.ok(Math.abs(party.clearRate - 0.9) < 1e-9);
  assert.equal(party.tagEnglish, "Party Min");
});

void test("Ascent is each member's own, at the party's pace", () => {
  const seren = boss("seren", "Normal");
  // Two members at 1.0 each: alone neither is fast enough for an Ascent bonus (it starts at
  // 176%), together the party is at 200%, so each member's 3 uses land in a shorter fight.
  const a = 0.1;
  const one = member(damageFor(seren, 1), a);
  assert.ok(Math.abs(computeBossClear(seren, LEVEL, FORCE, FORCE, one.inputs).clearRate - 1) < 1e-9);
  const party = computePartyClear(seren, [one, member(damageFor(seren, 1), 0)]);
  assert.ok(Math.abs(party.members[0].clearRate - (1 + a / 2)) < 1e-9, "the Ascent member gets +a/2");
  assert.ok(Math.abs(party.members[1].clearRate - 1) < 1e-9, "a member with no Ascent gets nothing");
});

void test("tags follow the combined rate", () => {
  const seren = boss("seren", "Normal");
  const tagAt = (rate) => computePartyClear(seren, [member(damageFor(seren, rate / 2), 1), member(damageFor(seren, rate / 2), 1)]);
  assert.deepEqual([tagAt(2.1).tagEnglish, tagAt(1.5).tagEnglish, tagAt(1).tagEnglish, tagAt(0.5).tagEnglish], ["Easy", "Possible", "Party Min", "Impossible"]);
  assert.equal(tagAt(1).colorTier, "purple");
});

void test("more members than the boss allows can't enter, but still get a rate", () => {
  const champion = boss("seren", "Champion");
  assert.equal(champion.partyLimit, 1);
  const party = computePartyClear(champion, [member(damageFor(champion, 1), 1), member(damageFor(champion, 1), 1)]);
  assert.equal(party.cannotEnter, "partyLimit");
  assert.equal(party.tagEnglish, "Can't Enter");
  assert.ok(Math.abs(party.clearRate - 2) < 1e-9);
});

void test("a member below the entry level blocks the party", () => {
  const seren = boss("seren", "Normal");
  const party = computePartyClear(seren, [member(damageFor(seren, 1), 1), member(damageFor(seren, 1), 1, 250)]);
  assert.equal(party.cannotEnter, "level");
  assert.equal(party.members[1].cannotEnter, true);
  assert.equal(party.members[0].cannotEnter, false);
});

void test("a party-only boss counts each member on the solo scale", () => {
  const kalos = boss("kalos", "Extreme");
  assert.ok(kalos.partyBossCut);
  const solo = member(damageFor(kalos, 0.4), 1);
  const own = computeBossClear(kalos, LEVEL, FORCE, FORCE, solo.inputs);
  const party = computePartyClear(kalos, [solo, member(damageFor(kalos, 0.4), 1)]);
  assert.ok(Math.abs(party.members[0].clearRate - own.soloScalePercent / 100) < 1e-9);
  assert.ok(Math.abs(party.clearRate - 0.8) < 1e-9);
});

void test("no members, no result", () => {
  assert.equal(computePartyClear(boss("seren", "Normal"), []), null);
});

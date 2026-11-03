// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fitsSkillSlot, gridSkillSlotKind, skillRingFits, skillRingHost, specialRingElsewhere,
} from "../../src/features/characters/setup/data/specialRingData.ts";

const RESTRAINT = { id: "01113098" };
const CONTINUOUS = { id: "01113329" };
const WEAPON_JUMP_S = { id: "01113113" };
const RORO_EXP = { id: "01113357" };
const PLAIN_RING = { id: "01113072" }; // Cracked Gollux Ring

void test("Restraint's skill slot takes a passive ring, Continuous's an active one", () => {
  assert.equal(gridSkillSlotKind({ ring2: RESTRAINT }), "passive");
  assert.equal(gridSkillSlotKind({ ring3: CONTINUOUS }), "active");
  assert.equal(gridSkillSlotKind({ ring1: PLAIN_RING, ring2: WEAPON_JUMP_S }), null);
});

void test("Continuous is the passive ring; Restraint, Weapon Jump and Roro's are active", () => {
  assert.ok(fitsSkillSlot("passive", CONTINUOUS.id));
  assert.ok(!fitsSkillSlot("passive", WEAPON_JUMP_S.id));
  for (const ring of [RESTRAINT, WEAPON_JUMP_S, RORO_EXP]) assert.ok(fitsSkillSlot("active", ring.id));
  assert.ok(!fitsSkillSlot("active", CONTINUOUS.id));
});

void test("the host is the first ring slot holding Restraint or Continuous", () => {
  assert.equal(skillRingHost({ ring1: PLAIN_RING, ring2: WEAPON_JUMP_S, ring3: CONTINUOUS }), "ring3");
  assert.equal(skillRingHost({ ring1: PLAIN_RING }), null);
});

void test("a skill ring stops fitting when its host ring is swapped", () => {
  assert.ok(skillRingFits({ ring1: CONTINUOUS, skillRing: WEAPON_JUMP_S }));
  assert.ok(!skillRingFits({ ring1: RESTRAINT, skillRing: WEAPON_JUMP_S }));
  assert.ok(!skillRingFits({ ring1: PLAIN_RING, skillRing: WEAPON_JUMP_S }));
  assert.ok(skillRingFits({ ring1: PLAIN_RING }));
});

void test("only one special skill ring across the 4 ring slots", () => {
  assert.ok(specialRingElsewhere({ ring1: RESTRAINT }, "ring2"));
  assert.ok(!specialRingElsewhere({ ring1: RESTRAINT }, "ring1"));
  assert.ok(!specialRingElsewhere({ ring1: PLAIN_RING, ring3: PLAIN_RING }, "ring2"));
});

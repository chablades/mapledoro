import { describe, expect, it } from "vitest";
import { resolveFinalDamagePercent, BASE_FINAL_DAMAGE_PERCENT } from "./finalDamageData";

const CLASS_ID = "dark_knight";
const base = BASE_FINAL_DAMAGE_PERCENT[CLASS_ID];

describe("resolveFinalDamagePercent", () => {
  it("returns undefined when classId is undefined", () => {
    expect(resolveFinalDamagePercent(undefined, false, 0)).toBeUndefined();
  });

  it("returns undefined for an unknown classId", () => {
    expect(resolveFinalDamagePercent("not_a_real_class", false, 0)).toBeUndefined();
  });

  it("returns the tiered base value with no modifiers applied", () => {
    for (const tier of [0, 1, 2] as const) {
      expect(resolveFinalDamagePercent(CLASS_ID, false, tier)).toBeCloseTo(base[tier], 10);
    }
  });

  it("applies the +10% Genesis Liberation multiplier", () => {
    const expected = (1 + base[0] / 100) * 1.1 * 100 - 100;
    expect(resolveFinalDamagePercent(CLASS_ID, true, 0)).toBeCloseTo(expected, 10);
  });

  it("applies the +10% Ruin Force Shield multiplier", () => {
    const expected = (1 + base[0] / 100) * 1.1 * 100 - 100;
    expect(resolveFinalDamagePercent(CLASS_ID, false, 0, 0, true)).toBeCloseTo(expected, 10);
  });

  it("applies the Reboot bonus multiplier", () => {
    const expected = (1 + base[0] / 100) * (1 + 25 / 100) * 100 - 100;
    expect(resolveFinalDamagePercent(CLASS_ID, false, 0, 25, false)).toBeCloseTo(expected, 10);
  });

  it("stacks all sources multiplicatively, not additively", () => {
    const expected = (1 + base[0] / 100) * 1.1 * 1.1 * (1 + 25 / 100) * 100 - 100;
    const actual = resolveFinalDamagePercent(CLASS_ID, true, 0, 25, true);
    expect(actual).toBeCloseTo(expected, 10);
    // sanity: multiplicative stacking must exceed naive additive stacking
    const additive = base[0] + 10 + 10 + 25;
    expect(actual!).toBeGreaterThan(additive);
  });

  it("treats a rebootBonusPercent of 0 as a no-op", () => {
    expect(resolveFinalDamagePercent(CLASS_ID, false, 0, 0)).toBeCloseTo(base[0], 10);
  });
});

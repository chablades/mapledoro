import { describe, expect, it } from "vitest";
import { resolveMasteryPercent } from "./masteryData";

describe("resolveMasteryPercent", () => {
  it("returns undefined when classId is undefined", () => {
    expect(resolveMasteryPercent(undefined, "1h", 0)).toBeUndefined();
  });

  it("returns undefined for an unknown classId", () => {
    expect(resolveMasteryPercent("not_a_real_class", "1h", 0)).toBeUndefined();
  });

  it("looks up the base value by tier for a non-Paladin class", () => {
    expect(resolveMasteryPercent("dark_knight", undefined, 0)).toBe(90);
    expect(resolveMasteryPercent("dark_knight", undefined, 1)).toBe(91);
    expect(resolveMasteryPercent("dark_knight", undefined, 2)).toBe(91);
  });

  it("adds +3 for Paladin with a 1H weapon", () => {
    expect(resolveMasteryPercent("paladin", "1h", 0)).toBe(93);
  });

  it("does not add the 1H bonus for Paladin with a 2H weapon", () => {
    expect(resolveMasteryPercent("paladin", "2h", 0)).toBe(90);
  });

  it("does not add the 1H bonus for Paladin when weaponHand is undefined", () => {
    expect(resolveMasteryPercent("paladin", undefined, 0)).toBe(90);
  });

  it("does not apply the Paladin 1H bonus to other classes", () => {
    expect(resolveMasteryPercent("dark_knight", "1h", 0)).toBe(90);
  });
});

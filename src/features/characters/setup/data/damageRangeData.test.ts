import { describe, expect, it } from "vitest";
import { computeDamageRange } from "./damageRangeData";
import { resolveMasteryPercent } from "./masteryData";
import { resolveFinalDamagePercent } from "./finalDamageData";
import { makeStoredCharacterRecord } from "../../model/testFixtures";
import type { StoredCharacterStats, StoredTripleStatField } from "../../model/charactersStore";

function field(base: number, percent = 0, percentUnapplied = 0): StoredTripleStatField {
  return { base: String(base), percent: String(percent), percentUnapplied: String(percentUnapplied) };
}

function emptyStats(): StoredCharacterStats {
  return makeStoredCharacterRecord().stats;
}

const TIER0 = 0 as const;

describe("computeDamageRange", () => {
  it("returns undefined when classId is missing", () => {
    expect(computeDamageRange(undefined, 200, "1h", false, emptyStats(), TIER0, undefined, undefined)).toBeUndefined();
  });

  it("returns undefined when stats is missing", () => {
    expect(computeDamageRange("dark_knight", 200, "1h", false, undefined, TIER0, undefined, undefined)).toBeUndefined();
  });

  it("returns undefined when level is missing", () => {
    expect(computeDamageRange("dark_knight", undefined, "1h", false, emptyStats(), TIER0, undefined, undefined)).toBeUndefined();
  });

  it("returns undefined for an unknown classId (no weapon multiplier)", () => {
    expect(computeDamageRange("not_a_real_class", 200, "1h", false, emptyStats(), TIER0, undefined, undefined)).toBeUndefined();
  });

  it("returns undefined when the computed upperActual rounds to 0 (e.g. all stats at 0)", () => {
    expect(computeDamageRange("dark_knight", 200, "1h", false, emptyStats(), TIER0, undefined, undefined)).toBeUndefined();
  });

  describe("2-stat class (dark_knight: str primary, dex secondary)", () => {
    function damageRangeFor(overrides: Partial<StoredCharacterStats> = {}) {
      const stats: StoredCharacterStats = {
        ...emptyStats(),
        str: field(1000),
        dex: field(500),
        attackPower: field(300),
        ...overrides,
      };
      return computeDamageRange("dark_knight", 200, "1h", false, stats, TIER0, undefined, undefined);
    }

    it("computes a nonzero damage range from real stat inputs", () => {
      const result = damageRangeFor();
      expect(result).toBeDefined();
      expect(result!.upper).toBeGreaterThan(0);
      expect(result!.lower).toBeGreaterThan(0);
      expect(result!.lower).toBeLessThanOrEqual(result!.upper);
    });

    it("matches the documented formula exactly for known inputs", () => {
      const statValue = 1000 * 4 + 500; // primary*4 + secondary
      const totalJobAtt = 300;
      const multiplier = 1.49; // dark_knight's WEAPON_MULTIPLIER
      const masteryPercent = resolveMasteryPercent("dark_knight", "1h", TIER0)!;
      const finalDamagePercent = resolveFinalDamagePercent("dark_knight", false, TIER0)!;

      const upperActual = Math.round((multiplier * statValue * totalJobAtt) / 100);
      const lowerActual = Math.round((upperActual * masteryPercent) / 100);
      const expectedUpper = Math.floor(upperActual * (1 + finalDamagePercent / 100));
      const expectedLower = Math.floor(1 + lowerActual * (1 + finalDamagePercent / 100));

      const result = damageRangeFor();
      expect(result!.upper).toBe(expectedUpper);
      expect(result!.lower).toBe(expectedLower);
    });

    it("scales upper damage with the damage% stat field", () => {
      const base = damageRangeFor().upper;
      const boosted = damageRangeFor({ damage: "50" }).upper;
      expect(boosted).toBeGreaterThan(base!);
    });

    it("increases the result under Genesis Liberation (via finalDamagePercent)", () => {
      const stats: StoredCharacterStats = { ...emptyStats(), str: field(1000), dex: field(500), attackPower: field(300) };
      const notLiberated = computeDamageRange("dark_knight", 200, "1h", false, stats, TIER0, undefined, undefined);
      const liberated = computeDamageRange("dark_knight", 200, "1h", true, stats, TIER0, undefined, undefined);
      expect(liberated!.upper).toBeGreaterThan(notLiberated!.upper);
    });

    it("increases the result on a Reboot world at the appropriate level bracket", () => {
      const stats: StoredCharacterStats = { ...emptyStats(), str: field(1000), dex: field(500), attackPower: field(300) };
      const notReboot = computeDamageRange("dark_knight", 200, "1h", false, stats, TIER0, undefined, undefined);
      // worldId 45 = Kronos, a Reboot world (see rebootData.test.ts)
      const reboot = computeDamageRange("dark_knight", 200, "1h", false, stats, TIER0, undefined, 45);
      expect(reboot!.upper).toBeGreaterThan(notReboot!.upper);
    });

    it("applies the folded-in percent and percentUnapplied stat fields", () => {
      const withPercent = damageRangeFor({ str: field(1000, 10, 5) }).upper; // floor(1000*1.10)+5 = 1105
      const withoutPercent = damageRangeFor({ str: field(1000) }).upper; // 1000
      expect(withPercent).toBeGreaterThan(withoutPercent!);
    });
  });

  describe("Xenon (str+dex+luk, no attackPower secondary split)", () => {
    it("sums all three stats with a flat x4 multiplier, per the special-case formula", () => {
      const stats: StoredCharacterStats = {
        ...emptyStats(),
        str: field(500), dex: field(500), luk: field(500), attackPower: field(300),
      };
      const result = computeDamageRange("xenon", 200, "1h", false, stats, TIER0, undefined, undefined);
      const statValue = 4 * (500 + 500 + 500);
      const multiplier = 1.3125; // xenon's corrected WEAPON_MULTIPLIER
      const masteryPercent = resolveMasteryPercent("xenon", "1h", TIER0)!;
      const finalDamagePercent = resolveFinalDamagePercent("xenon", false, TIER0)!;
      const upperActual = Math.round((multiplier * statValue * 300) / 100);
      const lowerActual = Math.round((upperActual * masteryPercent) / 100);
      const expectedUpper = Math.floor(upperActual * (1 + finalDamagePercent / 100));
      const expectedLower = Math.floor(1 + lowerActual * (1 + finalDamagePercent / 100));
      expect(result!.upper).toBe(expectedUpper);
      expect(result!.lower).toBe(expectedLower);
    });
  });

  describe("Demon Avenger (Pure HP formula)", () => {
    it("computes a nonzero result using HP instead of a primary/secondary stat pair", () => {
      const stats: StoredCharacterStats = {
        ...emptyStats(),
        hp: field(100000), str: field(500), attackPower: field(300),
      };
      const result = computeDamageRange("demon_avenger", 200, "1h", false, stats, TIER0, undefined, undefined);
      expect(result).toBeDefined();
      expect(result!.upper).toBeGreaterThan(0);
    });

    it("increases the result as HP increases beyond the Pure HP baseline", () => {
      const lowHp: StoredCharacterStats = { ...emptyStats(), hp: field(50000), str: field(500), attackPower: field(300) };
      const highHp: StoredCharacterStats = { ...emptyStats(), hp: field(500000), str: field(500), attackPower: field(300) };
      const low = computeDamageRange("demon_avenger", 200, "1h", false, lowHp, TIER0, undefined, undefined);
      const high = computeDamageRange("demon_avenger", 200, "1h", false, highHp, TIER0, undefined, undefined);
      expect(high!.upper).toBeGreaterThan(low!.upper);
    });
  });

  it("applies the Ruin Force Shield +10% Final Damage multiplier for Demon Avenger", () => {
    const stats: StoredCharacterStats = { ...emptyStats(), hp: field(100000), str: field(500), attackPower: field(300) };
    const without = computeDamageRange("demon_avenger", 200, "1h", false, stats, TIER0, undefined, undefined, false);
    const withShield = computeDamageRange("demon_avenger", 200, "1h", false, stats, TIER0, undefined, undefined, true);
    expect(withShield!.upper).toBeGreaterThan(without!.upper);
  });
});

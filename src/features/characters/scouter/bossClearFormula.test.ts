import { describe, expect, it } from "vitest";
import { computeBossClear } from "./bossClearFormula";
import type { BossCutEntry } from "./bosscut-data.generated";
import type { BossClearInputs } from "./scouterCache";

// A straight line through the origin (y = 100 * x) so splineEval/splineInverse are exactly
// invertible by hand, keeping expected values computable without reproducing MapleScouter's
// real (undisclosed-input) calibration curves. x goes well past any damage figure used below.
function linearSpline(slope: number) {
  return { x: [0, 1_000_000], y: [0, slope * 1_000_000], m: [slope, slope] };
}

function baseEntry(overrides: Partial<BossCutEntry> = {}): BossCutEntry {
  return {
    boss: "테스트보스",
    name: "test-boss",
    difficulty: "Normal",
    level: 200,
    guard: 380,
    arcaneForce: null,
    authenticForce: null,
    partyLimit: 6,
    bossCut: 100_000,
    partyBossCut: null,
    easyRate: 1,
    challenger: null,
    renewalDate: "",
    renewalDetail: "",
    ...overrides,
  };
}

function baseInputs(overrides: Partial<BossClearInputs> = {}): BossClearInputs {
  const spline = linearSpline(100);
  return {
    calculatedHexaDamage300: 100_000,
    calculatedHexaDamage380: 100_000,
    calculatedDamage380: 100_000,
    calculatedHexaDamageKaling: 100_000,
    ascentConst: 1, // 1 = no timer correction (see: ascentR = 0 when ascentConst === 1)
    ignoreDefConst300: 1,
    ignoreDefConst380: 1,
    spline300: spline,
    spline380: spline,
    genePassConst: 1,
    ...overrides,
  };
}

describe("computeBossClear", () => {
  it("returns null when guard is neither 300 nor 380", () => {
    const entry = baseEntry({ guard: 250 });
    expect(computeBossClear(entry, 200, 0, 0, baseInputs())).toBeNull();
  });

  it("returns null when both bossCut and partyBossCut are missing", () => {
    const entry = baseEntry({ bossCut: null, partyBossCut: null });
    expect(computeBossClear(entry, 200, 0, 0, baseInputs())).toBeNull();
  });

  it("falls back to partyBossCut when bossCut is null", () => {
    const entry = baseEntry({ bossCut: null, partyBossCut: 100_000 });
    expect(computeBossClear(entry, 200, 0, 0, baseInputs())).not.toBeNull();
  });

  it("marks a boss Can't Enter below its level requirement, independent of clear rate", () => {
    // meets every damage requirement, but level 100 is below the boss's own level field used
    // as the entry-level floor (see ENTRY_LEVEL_DEFAULT/cannotEnter's `?? 200` catch-all)
    const entry = baseEntry({ level: 295, bossCut: 1 });
    const inputs = baseInputs({ calculatedHexaDamage380: 1_000_000_000 });
    const result = computeBossClear(entry, 100, 0, 0, inputs)!;
    expect(result.tagEnglish).toBe("Can't Enter");
    expect(result.colorTier).toBe("gray");
  });

  it("computes clearRate as damage/cutInDamageSpace at character level == boss level with no arcane/authentic requirement", () => {
    // levelGap at diff=0 is 1.10 (LEVEL_GAP_PERCENT[0]), no arcane/authentic requirement means
    // both those gaps are 1 and correctionFactor's arcane/authentic multipliers are also 1.
    const entry = baseEntry({ level: 200, bossCut: 100_000, easyRate: 1 });
    const inputs = baseInputs({ calculatedHexaDamage380: 100_000 });
    const result = computeBossClear(entry, 200, 0, 0, inputs)!;

    const levelGap = 1.10; // LEVEL_GAP_PERCENT[0] / 100
    const correctionFactor = 1.2; // 1.2 * arcaneCorrection(1, no req) * authenticMultiplier(1, no req)
    const damage = (100_000 * levelGap) / correctionFactor;
    const cutInDamageSpace = 100 * 100_000; // linear spline: y = 100x
    const expectedClearRate = damage / cutInDamageSpace;
    expect(result.clearRate).toBeCloseTo(expectedClearRate, 8);
  });

  it("scales clearRate up when character damage increases, holding everything else fixed", () => {
    const entry = baseEntry();
    const low = computeBossClear(entry, 200, 0, 0, baseInputs({ calculatedHexaDamage380: 50_000 }))!;
    const high = computeBossClear(entry, 200, 0, 0, baseInputs({ calculatedHexaDamage380: 200_000 }))!;
    expect(high.clearRate).toBeGreaterThan(low.clearRate);
  });

  it("applies easyRate as a direct multiplier on the pre-timer clear rate", () => {
    const entry100 = baseEntry({ easyRate: 1 });
    const entry50 = baseEntry({ easyRate: 0.5 });
    const inputs = baseInputs({ ascentConst: 1 }); // no timer correction, so the multiplier is exact
    const full = computeBossClear(entry100, 200, 0, 0, inputs)!;
    const half = computeBossClear(entry50, 200, 0, 0, inputs)!;
    expect(half.clearRate).toBeCloseTo(full.clearRate * 0.5, 8);
  });

  it("selects the guard-300 vs guard-380 spline based on the entry's own guard field", () => {
    const steepSpline300 = linearSpline(1000);
    const flatSpline380 = linearSpline(10);
    const inputs = baseInputs({ spline300: steepSpline300, spline380: flatSpline380 });
    const entry300 = baseEntry({ guard: 300, bossCut: 100_000 });
    const entry380 = baseEntry({ guard: 380, bossCut: 100_000 });
    const result300 = computeBossClear(entry300, 200, 0, 0, inputs)!;
    const result380 = computeBossClear(entry380, 200, 0, 0, inputs)!;
    // same damage inputs, different spline steepness -> different clearRate
    expect(result300.clearRate).not.toBeCloseTo(result380.clearRate, 5);
  });

  describe("level gap", () => {
    it("gives a bonus multiplier (>1.10) for being over-leveled up to +5", () => {
      const entry = baseEntry({ level: 200 });
      const atLevel = computeBossClear(entry, 200, 0, 0, baseInputs())!;
      const overLevel = computeBossClear(entry, 205, 0, 0, baseInputs())!;
      expect(overLevel.levelGapDmg).toBeGreaterThan(atLevel.levelGapDmg);
      expect(overLevel.levelGapDmg).toBeCloseTo(1.20, 8); // LEVEL_GAP_PERCENT[5] / 100
    });

    it("clamps the level gap bonus at +5 over, no further benefit beyond that", () => {
      const entry = baseEntry({ level: 200 });
      const plus5 = computeBossClear(entry, 205, 0, 0, baseInputs())!;
      const plus50 = computeBossClear(entry, 250, 0, 0, baseInputs())!;
      expect(plus50.levelGapDmg).toBeCloseTo(plus5.levelGapDmg, 8);
    });

    it("clamps the level gap penalty at -40 under, no further penalty beyond that", () => {
      const entry = baseEntry({ level: 300 });
      const minus40 = computeBossClear(entry, 260, 0, 0, baseInputs())!;
      const minus100 = computeBossClear(entry, 200, 0, 0, baseInputs())!;
      expect(minus100.levelGapDmg).toBeCloseTo(minus40.levelGapDmg, 8);
      expect(minus40.levelGapDmg).toBe(0); // LEVEL_GAP_PERCENT[-40] = 0
    });
  });

  describe("arcane force gap", () => {
    it("reports arcaneGapDmg of 1 and a null bossArcaneForce when the boss has no requirement", () => {
      const entry = baseEntry({ arcaneForce: null });
      const result = computeBossClear(entry, 200, 9999, 0, baseInputs())!;
      expect(result.arcaneGapDmg).toBe(1);
      expect(result.bossArcaneForce).toBeNull();
    });

    it("caps the character's counted arcane force at 1750 regardless of the real value", () => {
      const entry = baseEntry({ arcaneForce: 1000 });
      const result = computeBossClear(entry, 200, 5000, 0, baseInputs())!;
      expect(result.characterArcaneForce).toBe(1750);
    });

    it("reaches the full arcane bonus ceiling (1.5x, non-Black-Mage) at a 150%+ ratio", () => {
      const entry = baseEntry({ arcaneForce: 1000, boss: "테스트보스" });
      const result = computeBossClear(entry, 200, 1500, 0, baseInputs())!; // ratio = 150%
      expect(result.arcaneGapDmg).toBeCloseTo(1.5, 8);
      expect(result.arcaneGapCeiling).toBe(1.5);
    });

    it("uses the reduced 1.1x ceiling specifically for Black Mage (검은 마법사)", () => {
      const entry = baseEntry({ arcaneForce: 1000, boss: "검은 마법사" });
      const result = computeBossClear(entry, 200, 1500, 0, baseInputs())!;
      expect(result.arcaneGapCeiling).toBeCloseTo(1.1, 8);
    });

    it("reproduces the documented Black Mage 9.09% FD loss at 1350/1320 arcane (achieved 1.00 vs ceiling 1.1)", () => {
      // from project_maplescouter_bosscut_formula_2026_07_28: achieved 1.00, ceiling 1.1 -> 1 - 1.00/1.1 = 9.09%
      const entry = baseEntry({ arcaneForce: 1320, boss: "검은 마법사" });
      const result = computeBossClear(entry, 200, 1350, 0, baseInputs())!;
      const lossPercent = (1 - result.arcaneGapDmg / result.arcaneGapCeiling) * 100;
      expect(lossPercent).toBeCloseTo(9.09, 1);
    });
  });

  describe("authentic force gap", () => {
    it("reports authenticGapDmg of 1 and a null bossAuthenticForce when the boss has no requirement", () => {
      const entry = baseEntry({ authenticForce: null });
      const result = computeBossClear(entry, 200, 0, 9999, baseInputs())!;
      expect(result.authenticGapDmg).toBe(1);
      expect(result.bossAuthenticForce).toBeNull();
    });

    it("reaches the ceiling (1.25x) once the character clears the boss requirement by 50+", () => {
      const entry = baseEntry({ authenticForce: 800 });
      const result = computeBossClear(entry, 200, 0, 850, baseInputs())!;
      expect(result.authenticGapDmg).toBeCloseTo(1.25, 8);
      expect(result.authenticGapCeiling).toBe(1.25);
    });

    it("drops well below 1 when the character is far short of the requirement", () => {
      const entry = baseEntry({ authenticForce: 800 });
      const result = computeBossClear(entry, 200, 0, 700, baseInputs())!; // -100 diff, below the -90 tier
      expect(result.authenticGapDmg).toBeLessThan(0.5);
    });
  });

  describe("tag/color tiers (soloable, partyLimit 6)", () => {
    // Match cutInDamageSpace exactly (clearRate ~= levelGap/correctionFactor ~= 1.10/1.2 ~= 0.917)
    // then scale calculatedHexaDamage380 to land in each documented tier.
    function clearRateFor(hexaDamage: number): number {
      const entry = baseEntry({ level: 200, bossCut: 100_000, easyRate: 1 });
      const inputs = baseInputs({ calculatedHexaDamage380: hexaDamage, ascentConst: 1 });
      return computeBossClear(entry, 200, 0, 0, inputs)!.clearRate;
    }

    it("tags Impossible below the Party Min floor (0.15)", () => {
      const entry = baseEntry({ level: 200, bossCut: 100_000 });
      const inputs = baseInputs({ calculatedHexaDamage380: 1000, ascentConst: 1 });
      const result = computeBossClear(entry, 200, 0, 0, inputs)!;
      expect(result.clearRate).toBeLessThan(0.15);
      expect(result.tagEnglish).toBe("Impossible");
      expect(result.colorTier).toBe("gray");
    });

    it("tags Easy at a clearRate of 2 or more", () => {
      // solve calculatedHexaDamage380 such that clearRate is comfortably >= 2: clearRate is
      // linear in hexaDamage (clearRateFor(100_000) computed above ~= 0.9167), scale
      // proportionally with a small margin to absorb floating-point rounding at the boundary
      const base = clearRateFor(100_000);
      const target = 100_000 * (2.001 / base);
      const entry = baseEntry({ level: 200, bossCut: 100_000 });
      const inputs = baseInputs({ calculatedHexaDamage380: target, ascentConst: 1 });
      const result = computeBossClear(entry, 200, 0, 0, inputs)!;
      expect(result.clearRate).toBeGreaterThanOrEqual(2);
      expect(result.tagEnglish).toBe("Easy");
      expect(result.colorTier).toBe("green");
    });
  });

  it("returns the party-only tag set when partyBossCut is set (isPartyBoss)", () => {
    // PARTY_ONLY_TIERS_DEFAULT's lowest cut tier ("6p Min Cut") needs clearRate >= 0.9; scale
    // damage well past that (cutInDamageSpace is 100x bossCut under the linear test spline)
    const entry = baseEntry({ bossCut: null, partyBossCut: 100_000, partyLimit: 6 });
    const inputs = baseInputs({ calculatedHexaDamage380: 100_000_000, ascentConst: 1 });
    const result = computeBossClear(entry, 200, 0, 0, inputs)!;
    expect(result.isPartyBoss).toBe(true);
    expect(["1p Min Cut", "2p Min Cut", "3p Min Cut", "4p Min Cut", "6p Min Cut"]).toContain(result.tagEnglish);
  });
});

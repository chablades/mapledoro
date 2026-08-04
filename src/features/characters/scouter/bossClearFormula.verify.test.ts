import { describe, expect, it } from "vitest";
import { computeBossClear } from "./bossClearFormula";
import type { BossCutEntry } from "./bosscut-data.generated";
import type { BossClearInputs } from "./scouterCache";

// Real character verification: Fuyurin64 (Kanna, level 295) on Hard Malefic Star, read
// 71.45% clear rate live in-app. Exported bossClearInputs from
// mapledoro-fuyurin64-2026-08-04(1).json 2026-08-04. See
// project_maplescouter_bosscut_formula_2026_07_28 memory for the prior "73.26% on Hard
// Malefic Star" reference this was meant to replace with a real, reproducible fixture.
const HARD_MALEFIC_STAR: BossCutEntry = {
  boss: "흉성", name: "maleficStar", difficulty: "Hard",
  level: 280, guard: 380, arcaneForce: null, authenticForce: 550, partyLimit: 3,
  bossCut: 120500, partyBossCut: null, easyRate: 0.93024, challenger: null,
  renewalDate: "2026-05-27", renewalDetail: "전 보스 상향조정 최소5%",
};

const FUYURIN_INPUTS: BossClearInputs = {
  calculatedHexaDamage300: 3279124775.185957,
  calculatedHexaDamage380: 3335449262.3469157,
  calculatedDamage380: 3335449262.3469157,
  calculatedHexaDamageKaling: 3335449262.3469157,
  ascentConst: 0.03531111111111107,
  ignoreDefConst300: 0.9934852753000001,
  ignoreDefConst380: 0.9917480153800001,
  spline300: {
    x: [0, 23716, 31615, 44999, 55216, 67090, 81295, 94622, 107655, 116314, 127030, 138897, 149851],
    y: [0, 89838001, 153429246, 330465596, 534426506, 856284268, 1354865594, 1895716447, 2862434128, 3832559207, 5306430664, 7986065466, 10420126552],
    m: [3788.0756029684603, 5481.069085162542, 9804.315199471775, 16057.5131707077, 22905.555725248305, 30472.3743483133, 37671.36945792025, 52519.60193927612, 90493.12489206606, 123040.04737454993, 170248.69316378163, 223968.10977974543, 222207.51195910168],
  },
  spline380: {
    x: [0, 23716, 31615, 44999, 55216, 67090, 81295, 94622, 107655, 116314, 127030, 138897, 149851],
    y: [0, 88376850, 151771613, 328105570, 531490216, 851005052, 1349212753, 1888403097, 2854786180, 3822855801, 5293999588, 7971683141, 10402035439],
    m: [3726.465255523697, 5420.374715506717, 9771.105153390832, 16001.505719031571, 22798.700350391482, 30334.04050193189, 37602.079892661925, 52409.10568590995, 90392.59646267092, 122793.5845364021, 170004.38562592867, 223713.99627184632, 221868.93354025926],
  },
  genePassConst: 1.0000000000000002,
};

describe("computeBossClear (real character verification)", () => {
  it("reproduces Fuyurin64's live-read Hard Malefic Star clear rate (71.45%)", () => {
    const result = computeBossClear(HARD_MALEFIC_STAR, 295, 1350, 820, FUYURIN_INPUTS);
    expect(result).not.toBeNull();
    // computed clearRatePercent is 71.45280857455042 -- matches the in-app reading to 4dp
    expect(result!.clearRatePercent).toBeCloseTo(71.45, 1);
  });
});

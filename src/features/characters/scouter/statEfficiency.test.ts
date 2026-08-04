import { describe, expect, it } from "vitest";
import {
  computeMainEfficiencies,
  detailEfficiencyRows,
  efficiencyUnitOptions,
  formatEfficiencyValue,
  meterPosition,
  resolveEfficiencyStatLabels,
  type EfficiencyStatLabels,
  type MainEfficiencyRow,
} from "./statEfficiency";
import type { ScouterSpecEfficiency } from "./scouterCache";

// Synthetic but internally-consistent fixture. Real values come from MapleScouter's server
// response (see statEfficiency.ts's file comment) and aren't derivable locally, so this
// exercises the module's own presentation math rather than asserting real-world numbers.
const EFF: ScouterSpecEfficiency = {
  dmgeff1: 0.01,
  atkeff1: 0.5,
  atkPereff1: 0.02,
  cridmgeff1: 0.015,
  igreff1: 0.008,
  igreff1_380: 0.01,
  igreffminus40_380: -0.012,
  mainStateff1: 0.005,
  mainStatPereff1: 0.03,
  mainStatAbseff1: 0.001,
  subStateff1: 0.003,
  subStatPereff1: 0.02,
  subStatAbseff1: 0.0008,
  ssubStateff1: 0.002,
  ssubStatPereff1: 0.015,
  ssubStatAbseff1: 0.0006,
  allStatEff: 0.01,
};

const LABELS: EfficiencyStatLabels = { atk: "ATT", main: "LUK", sub: "DEX", sub2: "STR" };
const LABELS_NO_SUB2: EfficiencyStatLabels = { atk: "MATT", main: "INT", sub: "LUK", sub2: null };

describe("resolveEfficiencyStatLabels", () => {
  it("returns MATT for a magic-attack class and ATT otherwise", () => {
    const magic = resolveEfficiencyStatLabels("Arch Mage (F/P)");
    const physical = resolveEfficiencyStatLabels("Dark Knight");
    expect(magic.atk).toBe("MATT");
    expect(physical.atk).toBe("ATT");
  });

  it("falls back to a generic label set for an unrecognized job name", () => {
    const labels = resolveEfficiencyStatLabels("Not A Real Job");
    expect(labels).toEqual({ atk: "ATT", main: "Main Stat", sub: null, sub2: null });
  });
});

describe("computeMainEfficiencies", () => {
  const rows = computeMainEfficiencies(EFF, 200, LABELS);

  it("produces exactly the 8 documented Main Eff. rows", () => {
    expect(rows.map((r) => r.id)).toEqual([
      "bd40", "bd45", "iedAdded", "iedWorn", "levelStat", "critDamage", "atkStat", "allStat",
    ]);
  });

  it("labels each row's unit using the resolved stat labels", () => {
    const bd40 = rows.find((r) => r.id === "bd40")!;
    expect(bd40.unit).toBe("ATT %");
    const atkStat = rows.find((r) => r.id === "atkStat")!;
    expect(atkStat.unit).toBe("LUK");
  });

  it("worn IED reads the negated igreffminus40_380 field, added IED reads 40x igreff1_380, both divided by the same compounded ATT% yardstick (deliberate asymmetry)", () => {
    const added = rows.find((r) => r.id === "iedAdded")!.value;
    const worn = rows.find((r) => r.id === "iedWorn")!.value;
    const compoundedAtk = 1 / (1 - 12 * EFF.atkPereff1) - 1;
    const expectedAdded = Math.round(((40 * EFF.igreff1_380) / compoundedAtk) * 12 * 10) / 10;
    const expectedWorn = Math.round(((-EFF.igreffminus40_380) / compoundedAtk) * 12 * 10) / 10;
    expect(added).toBeCloseTo(expectedAdded, 5);
    expect(worn).toBeCloseTo(expectedWorn, 5);
  });

  it("levelStat scales with floor(level / 9)", () => {
    const at18 = computeMainEfficiencies(EFF, 18, LABELS).find((r) => r.id === "levelStat")!.value;
    const at26 = computeMainEfficiencies(EFF, 26, LABELS).find((r) => r.id === "levelStat")!.value;
    const at27 = computeMainEfficiencies(EFF, 27, LABELS).find((r) => r.id === "levelStat")!.value;
    // floor(18/9)=2, floor(26/9)=2, floor(27/9)=3 - value should jump only at 27, not 26
    expect(at26).toBeCloseTo(at18, 10);
    expect(at27).toBeGreaterThan(at26);
  });

  it("bossDamagePerAtk falls back to the plain linear ratio when the compounded gains disagree", () => {
    // a large enough dmgeff1 relative to atkPereff1 forces the "not equivalent" branch
    const skewed: ScouterSpecEfficiency = { ...EFF, dmgeff1: 0.3, atkPereff1: 0.001 };
    const row = computeMainEfficiencies(skewed, 200, LABELS).find((r) => r.id === "bd40")!;
    const expectedLinear = Math.round(((40 * skewed.dmgeff1) / skewed.atkPereff1) * 10) / 10;
    expect(row.value).toBeCloseTo(expectedLinear, 5);
  });
});

describe("meterPosition", () => {
  const base: MainEfficiencyRow = {
    id: "x", source: "x", unit: "x", value: 10, min: 0, max: 20, emphasis: "center", reverse: false, hint: "",
  };

  it("maps a mid-range value to 50 for a non-reversed row", () => {
    expect(meterPosition(base)).toBeCloseTo(50, 10);
  });

  it("maps a mid-range value to 50 for a reversed row too (symmetry at the midpoint)", () => {
    expect(meterPosition({ ...base, reverse: true })).toBeCloseTo(50, 10);
  });

  it("clamps a below-min value to 0 (or 100 when reversed)", () => {
    expect(meterPosition({ ...base, value: -5 })).toBe(0);
    expect(meterPosition({ ...base, value: -5, reverse: true })).toBe(100);
  });

  it("clamps an above-max value to 100 (or 0 when reversed)", () => {
    expect(meterPosition({ ...base, value: 50 })).toBe(100);
    expect(meterPosition({ ...base, value: 50, reverse: true })).toBe(0);
  });
});

describe("detailEfficiencyRows", () => {
  it("includes sub rows when a sub label is present", () => {
    const rows = detailEfficiencyRows(EFF, LABELS);
    expect(rows.some((r) => r.id === "sub")).toBe(true);
  });

  it("omits sub2 rows when sub2 label is null", () => {
    const rows = detailEfficiencyRows(EFF, LABELS_NO_SUB2);
    expect(rows.some((r) => r.id.startsWith("sub2"))).toBe(false);
  });

  it("omits sub2 rows when ssubStateff1 is 0 even if a sub2 label is given", () => {
    const rows = detailEfficiencyRows({ ...EFF, ssubStateff1: 0 }, LABELS);
    expect(rows.some((r) => r.id.startsWith("sub2"))).toBe(false);
  });

  it("includes sub2 rows when both a label and a nonzero ssubStateff1 are present", () => {
    const rows = detailEfficiencyRows(EFF, LABELS);
    expect(rows.some((r) => r.id === "sub2")).toBe(true);
  });
});

describe("efficiencyUnitOptions", () => {
  it("always includes Final Damage % as the first option", () => {
    expect(efficiencyUnitOptions(LABELS)[0]).toEqual({ value: "finalDamage", label: "Final Damage %" });
  });
});

describe("formatEfficiencyValue", () => {
  const row = detailEfficiencyRows(EFF, LABELS).find((r) => r.id === "damage")!;

  it("formats the finalDamage unit as a percent to 3 decimals", () => {
    const result = formatEfficiencyValue(EFF, row, 40, "finalDamage");
    expect(result).toBe(`${(100 * row.eff * 40).toFixed(3)}%`);
  });

  it("formats a non-finalDamage unit as an amount of that stat, to 2 decimals", () => {
    const result = formatEfficiencyValue(EFF, row, 40, "atkPercent");
    const expected = ((row.eff * 40) / EFF.atkPereff1).toFixed(2);
    expect(result).toBe(expected);
  });
});

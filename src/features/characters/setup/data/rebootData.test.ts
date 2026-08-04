import { describe, expect, it } from "vitest";
import { isRebootWorld, rebootFinalDamageBonusPercent } from "./rebootData";

describe("isRebootWorld", () => {
  it("returns false when worldId is undefined", () => {
    expect(isRebootWorld(undefined)).toBe(false);
  });

  it("returns false for an unknown worldId", () => {
    expect(isRebootWorld(9999)).toBe(false);
  });

  it("returns true for each of the 3 Reboot worlds (Kronos/Solis/Hyperion)", () => {
    expect(isRebootWorld(45)).toBe(true);
    expect(isRebootWorld(46)).toBe(true);
    expect(isRebootWorld(70)).toBe(true);
  });

  it("returns false for each of the 3 Interactive worlds (Bera/Scania/Luna)", () => {
    expect(isRebootWorld(1)).toBe(false);
    expect(isRebootWorld(19)).toBe(false);
    expect(isRebootWorld(30)).toBe(false);
  });
});

describe("rebootFinalDamageBonusPercent", () => {
  it("returns 15 below level 100", () => {
    expect(rebootFinalDamageBonusPercent(1)).toBe(15);
    expect(rebootFinalDamageBonusPercent(99)).toBe(15);
  });

  it("returns 20 from level 100 to 149", () => {
    expect(rebootFinalDamageBonusPercent(100)).toBe(20);
    expect(rebootFinalDamageBonusPercent(149)).toBe(20);
  });

  it("returns 25 from level 150 to 199", () => {
    expect(rebootFinalDamageBonusPercent(150)).toBe(25);
    expect(rebootFinalDamageBonusPercent(199)).toBe(25);
  });

  it("returns 35 from level 200 to 249", () => {
    expect(rebootFinalDamageBonusPercent(200)).toBe(35);
    expect(rebootFinalDamageBonusPercent(249)).toBe(35);
  });

  it("returns 45 from level 250 and up", () => {
    expect(rebootFinalDamageBonusPercent(250)).toBe(45);
    expect(rebootFinalDamageBonusPercent(300)).toBe(45);
  });
});

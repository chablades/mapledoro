// How much of a character's damage a boss's requirements cost them: level, Arcane Force, Sacred
// Power and the boss's own Sacred Symbol, each against its best tier. Shared by the profile's
// Spotlight and the Party Scouter's breakdown.

import type { BossClearResult } from "./bossClearFormula";

function sacredSymbolLevelText(symbol: NonNullable<BossClearResult["sacredSymbol"]>): string {
  if (symbol.maxed) return "11";
  return symbol.level !== null && symbol.level < 11 ? String(symbol.level) : "<11";
}

export function lossBreakdown(result: BossClearResult): { combinedLossPercent: number; lines: { label: string; bossValue: number | string; yourValue: number | string; lossPercent: number | null }[] } {
  const gaps: { label: string; bossValue: number | string; yourValue: number | string; gapDmg: number; gapCeiling: number }[] = [
    { label: "Level", bossValue: result.bossLevel, yourValue: result.characterLevel, gapDmg: result.levelGapDmg, gapCeiling: result.levelGapCeiling },
  ];
  if (result.bossArcaneForce !== null) {
    gaps.push({ label: "Arcane Force", bossValue: result.bossArcaneForce, yourValue: result.characterArcaneForce, gapDmg: result.arcaneGapDmg, gapCeiling: result.arcaneGapCeiling });
  }
  if (result.bossAuthenticForce !== null) {
    gaps.push({ label: "Sacred Power", bossValue: result.bossAuthenticForce, yourValue: result.characterAuthenticForce, gapDmg: result.authenticGapDmg, gapCeiling: result.authenticGapCeiling });
  }
  // The boss's own Sacred Symbol, from saved symbol levels: its +20% damage is the ceiling.
  const symbol = result.sacredSymbol;
  if (symbol) {
    gaps.push({
      label: `${symbol.area} Symbol`, bossValue: "11", yourValue: sacredSymbolLevelText(symbol),
      gapDmg: symbol.maxed ? symbol.boost : 1, gapCeiling: symbol.boost,
    });
  }
  // Loss is relative to each stat's own bonus ceiling rather than to 1. Sitting exactly at a
  // boss's requirement reads gapDmg around 1.0 but is still short of the max bonus tier: Black
  // Mage at 1350 arcane against 1320 required reads gapDmg 1.0 against a 1.1 ceiling for that
  // boss, a 9.09% loss rather than 0%.
  //
  // The combined total is not a sum of the per-stat losses but the achieved-over-ceiling
  // product across all gaps. Jupiter at Level 295/295 with Sacred Power 810/820 gives 8.33%
  // and 16% individually, while MapleScouter's own displayed total is 23.00%, which matches
  // only (1.10*1.05)/(1.20*1.25). A gap the boss does not require contributes 1 to both sides
  // and drops out of the product.
  const achievedProduct = gaps.reduce((acc, g) => acc * g.gapDmg, 1);
  const ceilingProduct = gaps.reduce((acc, g) => acc * g.gapCeiling, 1);
  const combinedLossPercent = Math.round((1 - achievedProduct / ceilingProduct) * 100 * 100) / 100;
  const lines = gaps.map((g) => ({
    label: g.label,
    bossValue: g.bossValue,
    yourValue: g.yourValue,
    lossPercent: g.gapDmg < g.gapCeiling ? Math.round((1 - g.gapDmg / g.gapCeiling) * 100 * 100) / 100 : null,
  }));
  return { combinedLossPercent, lines };
}

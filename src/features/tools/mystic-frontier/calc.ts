// Mystic Frontier score calculation + reroll analysis.
//
// Score = floor((diceSum + totalFlat) × totalMult), where totalMult is the SUM of all
// active multiplier components (e.g. +1.2x and +1.4x → ×2.6). When no multiplier
// component is active the dice total is used directly (implicit ×1), mirroring the
// in-game "Final Multiplier" wording.

import { getPotential, type ResolvedPotential, type RollContext } from "./potentialEngine";
import { MF_RARITY_DICE, type MfElement, type MfRarity, type MfType } from "./types";
import type { MfBonusItem } from "./bonusItemsData";

export interface CalcSlot {
  present: boolean;
  rarity: MfRarity;
  type: MfType;
  element: MfElement;
  potentialIds: number[];
  die: number; // rolled value (1..max); 0 when unset
}

export interface ActiveLine {
  label: string;
  flat: number;
  mult: number;
}

export interface ScoreResult {
  diceSum: number;
  totalFlat: number;
  // null when no multiplier component is active (score is the dice total directly).
  totalMult: number | null;
  finalResult: number;
  activeLines: ActiveLine[];
}

function buildContext(slots: CalcSlot[]): RollContext {
  return {
    dice: slots.map((s) => s.die),
    present: slots.map((s) => s.present),
    lineup: slots.filter((s) => s.present).map((s) => ({ type: s.type, element: s.element })),
  };
}

function selectedPotentials(slots: CalcSlot[]): ResolvedPotential[] {
  const out: ResolvedPotential[] = [];
  for (const slot of slots) {
    if (!slot.present) continue;
    for (const id of slot.potentialIds) {
      const p = getPotential(id);
      if (p) out.push(p);
    }
  }
  return out;
}

// Lowest dice cap imposed by any selected "Prevents dice from rolling over N" line.
export function globalDiceCap(slots: CalcSlot[]): number | null {
  let cap: number | null = null;
  for (const p of selectedPotentials(slots)) {
    if (p.diceCap !== null) cap = cap === null ? p.diceCap : Math.min(cap, p.diceCap);
  }
  return cap;
}

// Effective max die value for a slot: rarity die size, capped by any global cap.
export function effectiveMaxDie(rarity: MfRarity, cap: number | null): number {
  const max = MF_RARITY_DICE[rarity];
  return cap === null ? max : Math.min(max, cap);
}

export function calculateScore(slots: CalcSlot[], bonusItems: MfBonusItem[]): ScoreResult {
  const ctx = buildContext(slots);
  const diceSum = ctx.dice.reduce((sum, d, i) => sum + (ctx.present[i] ? d : 0), 0);

  let totalFlat = 0;
  let totalMult = 0;
  const activeLines: ActiveLine[] = [];

  for (const item of bonusItems) {
    totalFlat += item.flat;
    totalMult += item.mult;
  }

  for (const p of selectedPotentials(slots)) {
    if (!p.matches(ctx)) continue;
    totalFlat += p.flat;
    totalMult += p.mult;
    activeLines.push({ label: p.label, flat: p.flat, mult: p.mult });
  }

  const afterFlat = diceSum + totalFlat;
  const finalResult = totalMult !== 0 ? Math.floor(afterFlat * totalMult) : afterFlat;

  return {
    diceSum,
    totalFlat,
    totalMult: totalMult !== 0 ? totalMult : null,
    finalResult,
    activeLines,
  };
}

export interface RerollSuggestion {
  slotIndex: number;
  currentDie: number;
  maxDie: number;
  // Die values (for this slot alone) that would meet the target.
  passingValues: number[];
  // Probability that a single reroll of this die passes (passingValues / maxDie).
  odds: number;
}

// For each filled slot, which single-die rerolls would reach the target. Other dice
// are held at their current values (matching the in-game "reroll one die" mechanic).
export function rerollSuggestions(
  slots: CalcSlot[],
  bonusItems: MfBonusItem[],
  target: number,
): RerollSuggestion[] {
  const cap = globalDiceCap(slots);
  const suggestions: RerollSuggestion[] = [];

  for (let i = 0; i < slots.length; i++) {
    if (!slots[i].present) continue;
    const maxDie = effectiveMaxDie(slots[i].rarity, cap);
    const passingValues: number[] = [];

    for (let value = 1; value <= maxDie; value++) {
      const trial = slots.map((s, j) => (j === i ? { ...s, die: value } : s));
      if (calculateScore(trial, bonusItems).finalResult >= target) passingValues.push(value);
    }

    suggestions.push({
      slotIndex: i,
      currentDie: slots[i].die,
      maxDie,
      passingValues,
      odds: maxDie > 0 ? passingValues.length / maxDie : 0,
    });
  }

  return suggestions;
}

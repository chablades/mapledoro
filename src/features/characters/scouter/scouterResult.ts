/*
  A character's Scouter result, computed in the browser by the local engine
  (engine/scouterLocal.ts) from the same payload MapleScouter's calc takes, so it always matches
  the character's current data with no refresh step.
*/

import type { StoredCharacterRecord } from "../model/charactersStore";
import { buildScouterPayload, hashScouterPayload, type ScouterPayloadContext } from "./scouterApi";
import { resolveScouterContext } from "./scouterWorldContext";
import { computeScouterResult, computeScouterResultSync, type ScouterComputeResult } from "./engine/scouterLocal";

interface ScouterSpline {
  x: number[];
  y: number[];
  m: number[];
}

/** Raw inputs to the Boss Clear (Cut) formula (see bossClearFormula.ts), named after the
 *  MapleScouter calc fields they replace. Optional on ScouterResultEntry, so a class without
 *  HEXA curves shows "not available" for Boss Clear instead of failing the whole entry. */
export interface BossClearInputs {
  calculatedHexaDamage300: number;
  calculatedHexaDamage380: number;
  calculatedDamage380: number;
  calculatedHexaDamageKaling: number;
  ascentConst: number;
  ignoreDefConst300: number;
  ignoreDefConst380: number;
  spline300: ScouterSpline;
  spline380: ScouterSpline;
  genePassConst: number;
  /** MapleScouter's own inputs, for a class whose clear factor these include. */
  scouterInputs?: BossClearInputs;
  /** Whether the damage above includes the maxed Sacred Symbol bonus (+20 damage), and how much
   *  that bonus multiplies this character's damage by. */
  sacredBonusOn?: boolean;
  sacredBoost?: number;
  /** Sacred Symbol regions at Lv 11 (sacredSymbols.ts). Boss Clear gives each boss the bonus only
   *  if its own region's symbol is in here (see bossClearFormula.ts). */
  sacredMaxed?: readonly string[];
  /** Set when the Genesis Pass's Power of the Adversary buff is on: how much it multiplies this
   *  character's 300 damage by. Boss Clear applies it, and its Arcane Power, to the bosses it
   *  covers (bossClearFormula.ts). */
  genePassBoost?: number;
  /** Saved Sacred Symbol levels by region, when known, so the tooltip can show the real level. */
  sacredLevels?: Partial<Record<string, number>>;
}

/** The Stat Efficiency bookmark's table, MapleScouter's `specEfficiency` rebuilt by the local
 *  engine. Each value is the fraction of extra final damage ONE unit of that stat buys this
 *  character, so `value * amount` is the damage gain and a ratio between two fields is an
 *  equivalence ("1 ATT is worth N main stat"). MapleScouter's wire names are kept so the
 *  presentation math in statEfficiency.ts stays readable beside the originals. */
export interface ScouterSpecEfficiency {
  dmgeff1: number; atkeff1: number; atkPereff1: number; cridmgeff1: number;
  igreff1: number; igreff1_380: number; igreffminus40_380: number;
  mainStateff1: number; mainStatPereff1: number; mainStatAbseff1: number;
  subStateff1: number; subStatPereff1: number; subStatAbseff1: number;
  ssubStateff1: number; ssubStatPereff1: number; ssubStatAbseff1: number;
  allStatEff: number;
}

export interface ScouterResultEntry {
  boss300Normal: number;
  boss300Hexa: number;
  boss380Normal: number;
  boss380Hexa: number;
  /** Set for a class with a clear factor (engine/classClearFactors.ts), which the four figures
   *  above already include. scouterFigures are the same four as MapleScouter itself shows. */
  clearFactor?: number;
  scouterFigures?: Pick<ScouterResultEntry, "boss300Normal" | "boss300Hexa" | "boss380Normal" | "boss380Hexa">;
  bossClearInputs?: BossClearInputs;
  specEfficiency?: ScouterSpecEfficiency;
}

/** "network": the engine's class data didn't load. "bad_response": the engine couldn't turn this
 *  payload into a real result. */
export type ScouterErrorReason = "bad_response" | "network";

function payloadFor(character: StoredCharacterRecord, ctx?: ScouterPayloadContext | null) {
  const payload = buildScouterPayload(character, resolveScouterContext(ctx));
  return payload ? { payload, hash: hashScouterPayload(payload) } : null;
}

/** The character's result from its current data: null when the class or setup can't produce a
 *  payload, or while the engine data is still loading. `ctx` is only passed for a character
 *  outside the saved store (see scouterWorldContext.ts). */
export function scouterResultFor(character: StoredCharacterRecord, ctx?: ScouterPayloadContext | null): ScouterComputeResult | null {
  const built = payloadFor(character, ctx);
  return built ? computeScouterResultSync(built.payload, built.hash) : null;
}

/** Same as scouterResultFor, loading the engine data first if needed. Null when the class or
 *  setup can't produce a payload. */
export async function loadScouterResultFor(character: StoredCharacterRecord, ctx?: ScouterPayloadContext | null): Promise<ScouterComputeResult | null> {
  const built = payloadFor(character, ctx);
  return built ? computeScouterResult(built.payload, built.hash) : null;
}

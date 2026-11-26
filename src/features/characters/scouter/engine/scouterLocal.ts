/*
  Browser side of the local Scouter engine: loads the per-class constants once from
  public/data/scouter-engine.json, then turns a ScouterUserStat into the ScouterResultEntry the
  Scouter figure, Boss Clear grid, Stat Efficiency bookmark, Simulator and Stat Optimizer read.
  Calculating takes milliseconds, so results are only remembered in memory, keyed by the
  payload hash, to keep re-renders free.
*/

import type { ScouterStat, ScouterUserStat } from "../scouterApi";
import type { BossClearInputs, ScouterErrorReason, ScouterResultEntry, ScouterSpecEfficiency } from "../scouterResult";
import { CLASS_BOSS_FACTOR } from "./classBossFactors";
import { CLASS_CLEAR_FACTOR } from "./classClearFactors";
import { coreAtt, coreAttAt, createEngine, splineEval, type EngineData, type EnginePrediction, type ScouterEngine } from "./scouterEngine";

const ENGINE_DATA_URL = "/data/scouter-engine.json";
const MAX_REMEMBERED_RESULTS = 64;

type ScouterEngineState = "idle" | "loading" | "ready" | "failed";

let state: ScouterEngineState = "idle";
let engine: ScouterEngine | null = null;
let loading: Promise<ScouterEngine | null> | null = null;
const listeners = new Set<() => void>();
const remembered = new Map<string, ScouterComputeResult>();

function setState(next: ScouterEngineState) {
  state = next;
  for (const listener of listeners) listener();
}

export const getScouterEngineState = (): ScouterEngineState => state;

export function subscribeScouterEngine(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Starts loading the engine data if it isn't loaded or loading. A failed load can be retried by
 *  calling this again (each component mount does). Resolves to null on failure. */
export function ensureScouterEngine(): Promise<ScouterEngine | null> {
  if (engine) return Promise.resolve(engine);
  loading ??= (async () => {
    setState("loading");
    try {
      const response = await fetch(ENGINE_DATA_URL);
      if (!response.ok) throw new Error(`engine data ${response.status}`);
      engine = createEngine((await response.json()) as EngineData);
      setState("ready");
      return engine;
    } catch {
      setState("failed");
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

type EditableStat = "atkBase" | "atkPercent" | "bossDmg" | "criticalDmg" | "ignoreDef"
  | `${"main" | "sub" | "ssub"}Stat${"Base" | "Per" | "Abs"}`;
type Nudge = (s: ScouterStat) => void;
const add = (field: EditableStat, amount: number): Nudge => (s) => { s[field] = String(Number(s[field]) + amount); };
const addAll = (fields: EditableStat[]): Nudge => (s) => { for (const field of fields) add(field, 1)(s); };
// +1% ignore defense multiplies what defense is left; "minus 40" removes a 40% source the same way.
const iedTimes = (keepFactor: number): Nudge => (s) => { s.ignoreDef = String(100 - (100 - Number(s.ignoreDef)) * keepFactor); };

/** MapleScouter's stat efficiency table, rebuilt by nudging one stat at a time: each value is the
 *  fraction of extra damage one unit buys. Boss damage and the "_380" entries move the 380 figure,
 *  the rest the 300 figure, as MapleScouter's table does (matching its saved tables to within 1% on
 *  every class). */
function specEfficiency(eng: ScouterEngine, u: ScouterUserStat, base: EnginePrediction): ScouterSpecEfficiency {
  const gain = (nudge: Nudge, figure: "damage" | "damage300" = "damage300") => {
    const sheet = structuredClone(u);
    nudge(sheet.stat);
    return eng.predict(sheet)[figure] / base[figure] - 1;
  };
  // MapleScouter's table counts a HEXA core's flat ATT at Lv 30 whatever its level (its damage and
  // HEXA figures use the real level), so the flat ATT line spreads over that much more ATT.
  const flatAtk = gain(add("atkBase", 1));
  const missingCoreAtt = coreAttAt(base.classId, 30) - coreAtt(base.classId, u.hexa);
  // Demon Avenger's all stat skips HP, its main stat.
  const allStat: EditableStat[] = base.classId === "demon_avenger" ? ["subStatPer", "ssubStatPer"] : ["mainStatPer", "subStatPer", "ssubStatPer"];
  return {
    dmgeff1: gain(add("bossDmg", 1), "damage"),
    atkeff1: 1 / (1 / flatAtk + missingCoreAtt),
    atkPereff1: gain(add("atkPercent", 1)),
    cridmgeff1: gain(add("criticalDmg", 1)),
    igreff1: gain(iedTimes(0.99)),
    igreff1_380: gain(iedTimes(0.99), "damage"),
    igreffminus40_380: gain(iedTimes(1 / 0.6), "damage"),
    mainStateff1: gain(add("mainStatBase", 1)),
    mainStatPereff1: gain(add("mainStatPer", 1)),
    mainStatAbseff1: gain(add("mainStatAbs", 1)),
    subStateff1: gain(add("subStatBase", 1)),
    subStatPereff1: gain(add("subStatPer", 1)),
    subStatAbseff1: gain(add("subStatAbs", 1)),
    ssubStateff1: gain(add("ssubStatBase", 1)),
    ssubStatPereff1: gain(add("ssubStatPer", 1)),
    ssubStatAbseff1: gain(add("ssubStatAbs", 1)),
    allStatEff: gain(addAll(allStat)),
  };
}

/** Boss Clear's damage inputs, scaled so each lands exactly on the HEXA figure shown: a boss with
 *  no level or force gap then shows the same adjusted HEXA as Boss 300/380, as maplescouter.com's
 *  own boss tiles do. That scale carries the class clear factor, the engine's spline calibration
 *  and flat cooldown reduction, which the HEXA figure counts but the raw damage figure does not. */
function bossClearInputs(eng: ScouterEngine, u: ScouterUserStat, base: EnginePrediction, figures: ScouterFigures): BossClearInputs | undefined {
  const c = eng.classData(base.classId);
  if (!c?.spline300 || !c.spline380) return undefined;
  const scale380 = splineEval(c.spline380, figures.boss380Hexa) / base.damage;
  const scale300 = splineEval(c.spline300, figures.boss300Hexa) / base.damage300;
  return {
    calculatedHexaDamage300: base.damage300 * scale300,
    calculatedHexaDamage380: base.damage * scale380,
    calculatedDamage380: eng.predictNormal(u).damage * scale380,
    calculatedHexaDamageKaling: eng.predictKaling(u) * scale380,
    ascentConst: eng.ascentShare(u),
    ignoreDefConst300: base.ign300,
    ignoreDefConst380: base.ign380,
    spline300: c.spline300,
    spline380: c.spline380,
    // 1 on every sheet MapleScouter has answered for.
    genePassConst: 1,
    sacredBonusOn: u.doping.authenticDmg,
    sacredBoost: sacredBoost(eng, u, base),
    genePassBoost: u.doping.genePass ? genePassBoost(eng, u, base) : undefined,
    bossFactors: CLASS_BOSS_FACTOR[base.classId],
  };
}

/** How much the Genesis Pass's Power of the Adversary buff multiplies this character's 300
 *  damage by (every boss it covers has 300% defense): ATT +20, All Stats +20, Max HP +1000,
 *  Boss Damage +10% and Ignore Defense +10%. Its Arcane Power +150 is applied by Boss Clear.
 *  MapleScouter only counts it for a character without Genesis Liberation, but in game it lasts
 *  as long as the pass, liberated or not. */
function genePassBoost(eng: ScouterEngine, u: ScouterUserStat, base: EnginePrediction): number {
  const buffed = structuredClone(u);
  // Demon Avenger's main stat is HP, which All Stats skips.
  const nudges = [
    add("atkBase", 20), add("mainStatBase", base.classId === "demon_avenger" ? 1000 : 20),
    add("subStatBase", 20), add("ssubStatBase", 20), add("bossDmg", 10), iedTimes(0.9),
  ];
  for (const nudge of nudges) nudge(buffed.stat);
  return eng.predict(buffed).damage300 / base.damage300;
}

/** How much the maxed Sacred Symbol bonus multiplies this character's 380 damage by. */
function sacredBoost(eng: ScouterEngine, u: ScouterUserStat, base: EnginePrediction): number {
  const toggled = structuredClone(u);
  toggled.doping.authenticDmg = !u.doping.authenticDmg;
  const other = eng.predict(toggled).damage;
  return u.doping.authenticDmg ? base.damage / other : other / base.damage;
}

/** MapleScouter's own inputs ride inside MapleDoro's, for a class with a clear factor, so every
 *  Boss Clear view can show MapleScouter's estimate beside MapleDoro's. */
function withScouterEstimate(inputs: BossClearInputs | undefined, scouterInputs: BossClearInputs | undefined): BossClearInputs | undefined {
  // MapleScouter ignores the Genesis Pass buff for a liberated character, and its own estimate
  // never gets the per-boss buff MapleDoro applies, so its inputs leave it out.
  return inputs && scouterInputs ? { ...inputs, scouterInputs: { ...scouterInputs, genePassBoost: undefined } } : inputs;
}

/** `detail` says which check failed, for the player and for a bug report. */
export type ScouterComputeResult =
  | { ok: true; entry: ScouterResultEntry }
  | { ok: false; reason: ScouterErrorReason; detail?: string };

const GROUP_LABEL: Record<keyof EnginePrediction["groups"], string> = {
  stat: "main and secondary stats", flatAtk: "ATT", atkPct: "ATT %", dmg: "damage and boss damage",
  crit: "critical damage", def: "ignore defense", cores: "HEXA skill levels", other: "other settings (rings, souls, cooldowns)",
};

/** Why a prediction can't be shown, or null when it can. */
function predictionProblem(p: EnginePrediction): string | null {
  const broken = (Object.keys(p.groups) as (keyof EnginePrediction["groups"])[]).filter((k) => !Number.isFinite(p.groups[k]));
  if (broken.length > 0) return `Some of this character's ${broken.map((k) => GROUP_LABEL[k]).join(", ")} aren't valid numbers. Check MapleScouter Setup.`;
  if (p.hexa === null || p.hexa300 === null) return "This class's HEXA curves are missing from the Scouter data.";
  // Damage scales with 1 - 3.8 x (1 - IED) against a 380% defense boss, which is below zero (no
  // damage at all, as in-game) until ignore defense is high enough for the class.
  if (p.groups.def <= 0) return "Ignore Enemy DEF is too low to damage a 380% defense boss at all. Raise it in MapleScouter Setup.";
  if (p.damage <= 0 || p.hexa <= 0) return "These stats are too low to register a HEXA score. Check main stat and ATT in MapleScouter Setup.";
  return null;
}

type ScouterFigures = Pick<ScouterResultEntry, "boss300Normal" | "boss300Hexa" | "boss380Normal" | "boss380Hexa">;

/** The four HEXA figures for a class with a clear factor (classClearFactors.ts): its damage scaled
 *  by the factor before turning into HEXA. MapleScouter's own figures ride along for display. */
function clearFactorFigures(
  eng: ScouterEngine, u: ScouterUserStat, base: EnginePrediction, normal: EnginePrediction, factor: number, scouterFigures: ScouterFigures,
): ScouterFigures & Pick<ScouterResultEntry, "clearFactor" | "scouterFigures"> {
  const cooldownSeconds = Number(u.stat.coolTimeReduce) || 0;
  const hexa = (p: EnginePrediction, figure: "damage" | "damage300", fallback: number) =>
    eng.hexaFor(p.classId, p[figure] * factor, cooldownSeconds, figure === "damage" ? "spline380" : "spline300") ?? fallback;
  return {
    boss300Normal: hexa(normal, "damage300", scouterFigures.boss300Normal),
    boss300Hexa: hexa(base, "damage300", scouterFigures.boss300Hexa),
    boss380Normal: hexa(normal, "damage", scouterFigures.boss380Normal),
    boss380Hexa: hexa(base, "damage", scouterFigures.boss380Hexa),
    clearFactor: factor,
    scouterFigures,
  };
}

function compute(eng: ScouterEngine, u: ScouterUserStat): ScouterComputeResult {
  try {
    if (!eng.classOf(u)) return { ok: false, reason: "bad_response", detail: "MapleDoro's Scouter has no data for this class yet." };
    const base = eng.predict(u), normal = eng.predictNormal(u);
    const problem = predictionProblem(base) ?? predictionProblem(normal);
    if (problem || base.hexa === null || base.hexa300 === null || normal.hexa === null || normal.hexa300 === null) {
      return { ok: false, reason: "bad_response", detail: problem ?? undefined };
    }
    const scouterFigures = { boss300Normal: normal.hexa300, boss300Hexa: base.hexa300, boss380Normal: normal.hexa, boss380Hexa: base.hexa };
    const factor = CLASS_CLEAR_FACTOR[base.classId] ?? 1;
    const figures = factor === 1 ? scouterFigures : clearFactorFigures(eng, u, base, normal, factor, scouterFigures);
    return {
      ok: true,
      entry: {
        ...figures,
        bossClearInputs: withScouterEstimate(bossClearInputs(eng, u, base, figures), factor === 1 ? undefined : bossClearInputs(eng, u, base, scouterFigures)),
        specEfficiency: specEfficiency(eng, u, base),
      },
    };
  } catch (error) {
    return { ok: false, reason: "bad_response", detail: `Calculation error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** The result for a payload, or null while the engine data hasn't loaded. `hash` is the payload's
 *  hashScouterPayload, used to remember results across re-renders. */
export function computeScouterResultSync(u: ScouterUserStat, hash: string): ScouterComputeResult | null {
  if (!engine) return null;
  const known = remembered.get(hash);
  if (known) return known;
  const result = compute(engine, u);
  remembered.set(hash, result);
  if (remembered.size > MAX_REMEMBERED_RESULTS) remembered.delete(remembered.keys().next().value as string);
  return result;
}

/** Same as computeScouterResultSync, loading the engine data first if needed. A failed load is
 *  "network". */
export async function computeScouterResult(u: ScouterUserStat, hash: string): Promise<ScouterComputeResult> {
  const eng = await ensureScouterEngine();
  if (!eng) return { ok: false, reason: "network" };
  return computeScouterResultSync(u, hash) ?? { ok: false, reason: "network" };
}

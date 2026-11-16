// Builds public/data/scouter-engine.json, the per-class constants the local damage engine runs on
// (src/features/characters/scouter/engine/scouterEngine.ts), from raw calibration data
// kept outside the repo: the probe results (class-sweep.json), MapleScouter's per-class splines
// (class-probes.json) and the sheet every probe was taken from (probe-payload.json).
//
//   node scripts/scouter-calibration/build-engine-data.mjs --data <dir>
//
// Every probe is "the reference sheet with one thing changed", so each formula group comes out as
// the reference sheet's total for that group. Taking the reference sheet's own inputs back out of
// each total leaves the class's hidden amount (passives and built-in bonuses), which is what the
// engine stores; one overall scale per class is set so the reference sheet reproduces its measured
// damage. Nothing from the reference sheet itself ends up in the output.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ENGINE_DATA_FILE, engineModule } from "./predict.mjs";
import { applyMeasuredClasses, readMeasuredClasses } from "./measured-classes.mjs";

const {
  CORE_ATT, coreAtt, coreAttAt, buffs, statWeights, soulAtkPct, contAtt, contBoss, sheetDmg, critOver, CRIT_RATE_TO_CRIT_DMG,
  restraintPts, splineEval, hexaAt, tableBonus, createEngine,
} = engineModule;
const args = process.argv.slice(2), dataDir = args[args.indexOf("--data") + 1];
if (!args.includes("--data") || !dataDir) {
  console.error("usage: node scripts/scouter-calibration/build-engine-data.mjs --data <dir with class-sweep.json, class-probes.json, probe-payload.json>");
  process.exit(1);
}
const readJson = (name) => JSON.parse(readFileSync(path.join(dataDir, name), "utf8"));
const SWEEP = readJson("class-sweep.json"), SPLINES = readJson("class-probes.json"), T = readJson("probe-payload.json").userStat;
const n = Number;
const COOLDOWN_REFS = ["hayato", "blade_master"];

// MapleScouter answers -3 (its error value) for some single-core-at-0 sheets (Lynn's and Mo Xuan's
// 3rd common node). Stand in one more Lv 1 to Lv 2 step below Lv 1.
for (const { probes } of Object.values(SWEEP)) {
  for (const [key, probe] of Object.entries(probes)) {
    const core = key.match(/^(\w+)=0$/)?.[1];
    if (core && probe.damage <= 0) probe.damage = 2 * probes[`${core}=1`].damage - probes[`${core}=2`].damage;
  }
}

// Link damage % by level, measured on one class as damage-bucket points.
function linkTables() {
  const p = SWEEP.kanna.probes, dmgT = 1 / (p["boss+100"].damage / p.base.damage - 1), table = {};
  for (const key of Object.keys(p)) {
    const m = key.match(/^link (\w+)=(\d+)$/);
    if (m) (table[m[1]] ??= {})[m[2]] = p[key].damage / p.base.damage;
  }
  for (const link of Object.keys(table)) {
    const r0 = table[link]["0"];
    for (const level of Object.keys(table[link])) table[link][level] = 100 * dmgT * (table[link][level] - r0);
  }
  return table;
}
const links = linkTables();

// The ATT slopes measured going up and going down from the reference sheet differ by about the same
// amount on every class (flat ATT ~0.066%, ATT% ~0.19%, sign varying by class), which looks like
// rounding at the reference point, so the two are averaged when both were measured.
const slopeOf = (r, p) => (up, down, step) => {
  const total = step / (r(up) - 1);
  return p[down] ? (total - step / (r(down) - 1)) / 2 : total;
};

// Core probes as a share of the reference damage, with the flat ATT a core gives taken out (the
// flat ATT group adds it back at the sheet's own ATT).
function coreTable(classId, p, atkT) {
  const out = {}, attCore = CORE_ATT[classId]?.[0];
  const levelOf = (key) => {
    if (!attCore) return 30;
    if (key === "allCores=0") return 0;
    const only = key.match(/^only (\w+)$/);
    if (only) return only[1] === attCore ? 30 : 0;
    const set = Object.fromEntries(key.split(",").map((kv) => kv.split("=")));
    return attCore in set ? n(set[attCore]) : 30;
  };
  const attShare = (L) => (atkT + coreAttAt(classId, L) - coreAttAt(classId, 30)) / atkT;
  for (const [key, probe] of Object.entries(p)) {
    const coreKey = key === "allCores=0" || /^only \w+Core\d$/.test(key)
      || key.split(",").every((kv) => /^\w+Core\d=\d+$/.test(kv));
    if (coreKey) out[key] = probe.damage / p.base.damage / attShare(levelOf(key));
  }
  return out;
}

// Core level curves: share of a Lv 30 core's value at each level, measured on Ren (whose cores
// simply add up).
const renCores = coreTable("ren", SWEEP.ren.probes, 1);
const curveTable = (core) => Array.from({ length: 31 }, (_, L) => (L === 0 ? 0 : L === 30 ? 1 : (renCores[`${core}=${L}`] - renCores[`${core}=0`]) / (1 - renCores[`${core}=0`])));
const curves = { skill1: curveTable("skillCore1"), skill2: curveTable("skillCore2"), mastery: curveTable("masteryCore1"), rein: curveTable("reinCore1"), general2: curveTable("generalCore2"), general3: curveTable("generalCore3") };

// Cooldown reference tables: each probe's HEXA bonus over its no-cooldown HEXA, by strength row.
const cooldownRefs = {};
for (const ref of COOLDOWN_REFS) {
  const spline = SPLINES[ref].spline380, p = SWEEP[ref].probes, scale = splineEval(spline, p.base.hexa) / p.base.damage, by = {};
  for (const [key, probe] of Object.entries(p)) {
    const m = key.match(/^(?:(atkPercent=\d+(?:,atkBase=\d+)?),)?coolTimeReduce=([1-6])$/);
    if (!m) continue;
    const row = (by[m[1] ?? "reference"] ??= { bonus: {} });
    row.bonus[m[2]] = splineEval(spline, probe.hexa) / (probe.damage * scale) - 1;
    row.h0 = hexaAt(spline, probe.damage * scale);
  }
  const rows = Object.values(by).filter((r) => Object.keys(r.bonus).length === 6).sort((a, b) => a.h0 - b.h0);
  cooldownRefs[ref] = { rows, norm2: tableBonus(rows, 2, p.base.hexa) };
}
const sharedBonus = (s, h0) => COOLDOWN_REFS.reduce((t, ref) => t + tableBonus(cooldownRefs[ref].rows, s, h0) / cooldownRefs[ref].norm2, 0) / COOLDOWN_REFS.length;

const classes = {};
for (const [classId, { koreanName, probes: p }] of Object.entries(SWEEP)) {
  const r = (k) => p[k].damage / p.base.damage, slope = slopeOf(r, p), bT = buffs(T, classId, links), w = statWeights(classId);
  const mult = (s, k) => 1 + n(s[`${k}StatPer`]) / 100;
  const term = (s) => ["main", "sub", "ssub"].reduce((t, k) => t + w[k] * (n(s[`${k}StatBase`]) * mult(s, k) + n(s[`${k}StatAbs`])), 0);

  // Stat term. A stat with its own % probe gets its own hidden base (Demon Avenger's buffs add
  // ~7,400 base HP); the rest share one amount per point of stat %, or, if every stat has its own,
  // what's left over is flat. The "% at 0" probe spans the whole range; +10 from the reference is off
  // by rounding there, which a sheet far below the reference's % multiplies.
  const statT = (5000 * w.main) / (r("mainStatAbs+5000") - 1);
  const STATS = ["main", "sub", "ssub"].filter((k) => w[k] > 0);
  const ownFrom = (k) => (p[`${k}StatPer=0`]
    ? ((1 - r(`${k}StatPer=0`)) * statT) / (w[k] * (mult(T.stat, k) - 1))
    : ((r(`${k}StatPer+10`) - 1) * statT) / (w[k] * 0.1));
  const own = Object.fromEntries(STATS.filter((k) => p[`${k}StatPer+10`] || p[`${k}StatPer=0`]).map((k) => [k, ownFrom(k) - n(T.stat[`${k}StatBase`])]));
  const shared = STATS.filter((k) => !(k in own));
  const ownPartT = Object.entries(own).reduce((t, [k, x]) => t + w[k] * x * mult(T.stat, k), 0);
  const rest = statT - term(T.stat) - ownPartT;
  const restPerMult = shared.length ? rest / shared.reduce((t, k) => t + w[k] * mult(T.stat, k), 0) : 0;
  const lvT = n(T.stat.level), perLevel = p["level=265"] ? ((r("level=265") - 1) * statT) / ((265 - lvT) * mult(T.stat, "main")) : 0;
  const hiddenBase = Object.fromEntries(STATS.map((k) => [k,
    (k in own ? own[k] : restPerMult) - bT.allStat - (k === "main" ? bT.hp + (perLevel * lvT) / w.main : 0)]));

  const atkT = p["atkBase=855"] ? (n(T.stat.atkBase) - 855) / (1 - r("atkBase=855")) : slope("atkBase+500", "atkBase-500", 500);
  const Aeff = p["atkPercent=0"] ? n(T.stat.atkPercent) / 100 / (1 - r("atkPercent=0")) : slope("atkPercent+10", "atkPercent-10", 0.1);
  const ring5 = Aeff * (1 - r("restraintRing=0")), restraint = { lv4: ring5 - Aeff * (1 - r("restraintRing=4")), lv5: ring5 };
  const dmgT = 1 / (r("boss+100") - 1), durT = n(T.stat.buffDuration), dmgPerBuffDuration = (-(r("buffDuration=0") - 1) * dmgT) / durT;
  const critT = 0.1 / (r("critDmg+10") - 1);
  const IT = n(T.stat.ignoreDef) / 100, r90 = r("ignoreDef=90"), kT = (1 - r90) / (0.1 - r90 * (1 - IT));
  // A factor linear in a stat, written as 1 + slope x (the overall scale absorbs the rest).
  const perUnit = (field, zeroProbe) => {
    if (!p[zeroProbe]) return 0;
    const r0 = r(zeroProbe), t = n(T.stat[field]);
    return (1 - r0) / (r0 * t);
  };
  const summonSlope = p["summonPersistTime=0"] ? (1 - r("summonPersistTime=0")) / n(T.stat.summonPersistTime) : 0;
  // On over off for a toggle, from a probe that flips the reference sheet's setting.
  const onOff = (probe, probeTurnsOn) => (p[probe] ? (probeTurnsOn ? r(probe) : 1 / r(probe)) : undefined);

  classes[classId] = {
    koreanName,
    stat: { hiddenBase, flat: shared.length ? 0 : rest, perLevel },
    flatAtk: atkT - n(T.stat.atkBase) - bT.flatAtk - coreAtt(classId, T.hexa),
    atkPct: Aeff - n(T.stat.atkPercent) / 100 - restraintPts(restraint, T) - (bT.atkPct + soulAtkPct(T) + contAtt(T)) / 100,
    restraint,
    dmg: dmgT - sheetDmg(T.stat) - (contBoss(T) + bT.dmg) / 100 - dmgPerBuffDuration * durT,
    dmgPerBuffDuration,
    crit: critT - (n(T.stat.criticalDmg) + (CRIT_RATE_TO_CRIT_DMG[classId] ?? 0) * critOver(T) + bT.crit) / 100,
    defenseK: kT / bT.iedKeep,
    toggles: {
      isReboot: onOff("isReboot=true", true),
      passiveSkillLevelUp: onOff("passiveSkillLevelUp=false", false),
      oneHandSword: onOff("oneHandSword=true", true),
    },
    perCooldownPercent: perUnit("coolTimeReducePercent", "coolTimeReducePercent=0"),
    perResetChance: perUnit("resetCoolDown", "resetCoolDown=0"),
    perSummonDuration: summonSlope / (1 - summonSlope * Math.min(42, n(T.stat.summonPersistTime))),
    cores: coreTable(classId, p, atkT),
    spline300: SPLINES[classId]?.spline300, spline380: SPLINES[classId]?.spline380,
    splineScale: SPLINES[classId] ? splineEval(SPLINES[classId].spline380, p.base.hexa) / p.base.damage : null,
    kalingAscent: SPLINES[classId]?.ascentConst,
    scale: 1,
  };
  if (!COOLDOWN_REFS.includes(classId) && SPLINES[classId]) {
    const spline = SPLINES[classId].spline380, base = splineEval(spline, p.base.hexa), h0 = hexaAt(spline, base);
    classes[classId].cooldownScale = Object.fromEntries([2, 3, 4, 5, 6].filter((x) => p[`coolTimeReduce=${x}`])
      .map((x) => [x, (splineEval(spline, p[`coolTimeReduce=${x}`].hexa) / base - 1) / sharedBonus(x, h0)]));
  }
}

// One overall scale per class so the reference sheet reproduces its measured damage.
const data = { classes, links, curves, cooldownRefs };
const unscaled = createEngine(data);
for (const [classId, c] of Object.entries(classes)) {
  const u = structuredClone(T);
  u.stat.myClass = c.koreanName;
  c.scale = SWEEP[classId].probes.base.damage / unscaled.predict(u).damage;
}
// Measured class data (new classes, and corrections to probed ones) goes on top of the probes:
// MapleScouter stopped sending class curves and constants in Nov 2026, so anything after that is
// measured from its results. See measured-classes.mjs.
applyMeasuredClasses(classes, readMeasuredClasses());
// Toggles a class has no probe for drop out of the JSON.
for (const c of Object.values(classes)) for (const k of Object.keys(c.toggles)) if (c.toggles[k] === undefined) delete c.toggles[k];
writeFileSync(ENGINE_DATA_FILE, `${JSON.stringify(data)}\n`);
console.log(`wrote ${path.relative(process.cwd(), ENGINE_DATA_FILE)} for ${Object.keys(classes).length} classes`);

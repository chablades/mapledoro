// Scouter calibration: compares MapleScouter's Boss Clear % against real clears to measure how far
// off it is per class. Report only for now; nothing here writes into the app yet.
//
//   node scripts/calibrate-scouter.mjs --data <dir> --clears <file>  report on the clears log
//   node scripts/calibrate-scouter.mjs probe --data <dir> [ids...]  fetch class probes (default: classes in clears.json without one)
//
// <dir> holds the private calibration data, never committed: class-probes.json and
// probe-payload.json (the reference sheet probes are sent from, a /calc/dmg body). The clears log
// lives in its own dataset outside the repo, since its video links identify players.
//
// Why a HEXA value is enough: MapleScouter's /calc/dmg response carries spline_300/380 and a few
// constants that depend only on the class, never on the character's stats (verified by probing one
// class with different stats). The spline maps a HEXA value back to the damage figure the Boss Clear
// formula uses, so each class is probed once (class-probes.json) and every clear after that needs
// only its HEXA value. The clear % itself comes from the app's own bossClearFormula.ts, so the
// report always matches what MapleDoro shows.
//
// Probing calls MapleScouter, whose Cloudflare blocks hosting providers: run it from a home
// connection, not from a server.
import { readFileSync, writeFileSync } from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(SCRIPT_DIR, "scouter-calibration");
const SCOUTER_DIR = path.join(SCRIPT_DIR, "..", "src", "features", "characters", "scouter");
const dataIndex = process.argv.indexOf("--data"), PRIVATE_DIR = dataIndex >= 0 ? process.argv[dataIndex + 1] : null;
if (!PRIVATE_DIR) {
  console.error("usage: node scripts/calibrate-scouter.mjs [probe] --data <dir> [--clears <file>] [ids...]");
  process.exit(1);
}
const clearsIndex = process.argv.indexOf("--clears");
const CLEARS_FILE = clearsIndex >= 0 ? process.argv[clearsIndex + 1] : path.join(PRIVATE_DIR, "clears.json");
const PROBES_FILE = path.join(PRIVATE_DIR, "class-probes.json");
const PROBE_PAYLOAD_FILE = path.join(PRIVATE_DIR, "probe-payload.json");
const CALC_URL = "https://api.maplescouter.com/api/calc/dmg";

// Classes MapleScouter has no KMS data for. Everything else is a KMS class, the control group:
// its factors should sit near 1.0, or the method itself is off.
const NON_KMS_CLASSES = new Set(["kanna", "hayato", "lynn", "mo_xuan", "sia_astelle", "erel_light"]);

// A video's shown % may drift a little from today's recompute (rounded HEXA, a later MapleScouter
// tweak). Past this, the shown % is flagged as not matching today's model.
const SHOWN_PERCENT_TOLERANCE = 0.03;
// MapleScouter's last boss-cut update. Clears from before it read 0.1-0.3 lower on every class
// against today's formula, so they're from a different balance state and don't count. Move this
// forward after the next update that changes cuts or class numbers.
const sinceIndex = process.argv.indexOf("--since");
const LAST_SCOUTER_UPDATE = sinceIndex >= 0 ? process.argv[sinceIndex + 1] : "2026-05-27";
// Bosses reworked since then: their earlier clears were against an easier or different fight.
// Kaling (2026-09-09): its perils can no longer all be hit at once.
const BOSS_CHANGED = { kaling: "2026-09-09" };
// Classes rebalanced since then, by their latest GMS balance patch.
const CLASS_CHANGED = { erel_light: "2026-09-09", sia_astelle: "2026-09-09" };
const clearCutoff = (clear) => [LAST_SCOUTER_UPDATE, BOSS_CHANGED[clear.boss] ?? "", CLASS_CHANGED[clear.class] ?? ""].sort().at(-1);
// Event items whose bonus is small and predictable enough to divide out instead of dropping the
// clear. Mapae Nodestone: +40% Boss Damage for 20 s of every 30. Boss Damage shares one bucket of
// about 1,100% with damage, buffs and links on endgame sheets, so that's about +2.2% damage at
// average uptime and +3.3% with bursts inside the window; rounded up so the clear errs weaker.
const EVENT_DAMAGE = { "Mapae Nodestone": 1.03 };
// Only close clears are averaged: one with lots of time left (fixed phases, invulnerability) only
// says "at least this strong". Overkill clears are still listed.
const MIN_TIMER_USED = 0.85;
const isClose = (r) => r.actualPercent <= 100 / MIN_TIMER_USED;
// Level gaps cap at 5 levels above the boss; an unknown level is assumed capped (endgame clears).
const LEVEL_GAP_CAP = 5;
// Destiny-tier clears always have Sacred Power past the cap, so the Authentic gap is maxed.
const ASSUMED_AUTHENTIC_FORCE = 9999;
const ASSUMED_ARCANE_FORCE = 1350;

register(pathToFileURL(path.join(DATA_DIR, "resolve-ts.mjs")));
const { computeBossClear } = await import(pathToFileURL(path.join(SCOUTER_DIR, "bossClearFormula.ts")).href);
const { BOSSCUT_DATA } = await import(pathToFileURL(path.join(SCOUTER_DIR, "bosscut-data.generated.ts")).href);
const { scouterKoreanClassName } = await import(pathToFileURL(path.join(SCOUTER_DIR, "scouterClassNames.ts")).href);

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (fallback !== undefined && error.code === "ENOENT") return fallback;
    throw error;
  }
}

// Same cubic Hermite evaluation as bossClearFormula.ts's splineEval (MapleScouter's own `M8`).
// Duplicated rather than exported, since the app has no other use for it outside that module.
function splineEval({ x, y, m }, t) {
  const n = x.length;
  if (t < x[0]) return y[0] + (t - x[0]) * m[0];
  if (t > x[n - 1]) return y[n - 1] + (t - x[n - 1]) * Math.max(m[n - 1], 1e-9);
  let seg = n - 2;
  for (let i = 0; i < n - 1; i++) {
    if (t >= x[i] && t <= x[i + 1]) {
      seg = i;
      break;
    }
  }
  const h = x[seg + 1] - x[seg];
  const s = (t - x[seg]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * y[seg] + (s3 - 2 * s2 + s) * h * m[seg] + (-2 * s3 + 3 * s2) * y[seg + 1] + (s3 - s2) * h * m[seg + 1];
}

// ── Probing ──────────────────────────────────────────────────────────────────

async function probeClass(classId, payloadTemplate) {
  const koreanName = scouterKoreanClassName(classId);
  if (!koreanName) throw new Error(`${classId}: not in scouterClassNames.ts, MapleScouter has no class to probe`);
  const payload = structuredClone(payloadTemplate);
  payload.userStat.stat.myClass = koreanName;
  const response = await fetch(CALC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "MapleDoro/1.0 (+https://www.mapledoro.com)" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`${classId}: MapleScouter returned HTTP ${response.status}`);
  const c = (await response.json()).calculatedData;
  return {
    koreanName,
    probedAt: new Date().toISOString().slice(0, 10),
    ascentConst: c.ascent_const,
    ignoreDefConst300: c.ignoreDefConst_300,
    ignoreDefConst380: c.ignoreDefConst_380,
    genePassConst: c.genePassConst,
    spline300: c.spline_300,
    spline380: c.spline_380,
  };
}

async function runProbe(requestedIds) {
  const probes = readJson(PROBES_FILE, {});
  const { clears } = readJson(CLEARS_FILE);
  const ids = requestedIds.length > 0 ? requestedIds : [...new Set(clears.map((c) => c.class))].filter((id) => !probes[id]);
  if (ids.length === 0) {
    console.log("Every class in clears.json already has a probe. Pass class ids to re-probe.");
    return;
  }
  const template = readJson(PROBE_PAYLOAD_FILE);
  for (const id of ids) {
    probes[id] = await probeClass(id, template);
    console.log(`probed ${id} (${probes[id].koreanName})`);
  }
  const sorted = Object.fromEntries(Object.entries(probes).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(PROBES_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
}

// ── Report ───────────────────────────────────────────────────────────────────

function evaluateClear(clear, probes) {
  const probe = probes[clear.class];
  if (!probe) return { error: `no probe for ${clear.class}, run: node scripts/calibrate-scouter.mjs probe` };
  const entry = BOSSCUT_DATA.find((b) => b.name === clear.boss && b.difficulty === clear.difficulty);
  if (!entry) return { error: `no bosscut entry for ${clear.boss} ${clear.difficulty}` };
  if (clear.hexa380 == null) return { skipped: "no HEXA value, logged only" };
  // A boss-adjusted HEXA already includes the boss's gap penalties, so recomputing from it would
  // apply them twice. The clear % MapleScouter showed with it is the prediction itself; without
  // one, the formula runs on it with every gap at its ceiling, which leaves it unchanged.
  if (clear.hexaAdjusted && clear.shownPercent != null) {
    const actualPercent = (100 * clear.timerSeconds) / (clear.timerSeconds - clear.secondsLeft);
    return {
      scouterPercent: clear.shownPercent, actualPercent,
      factor: clear.partySize === 1 ? actualPercent / clear.shownPercent : null,
      levelAssumed: false, shownMismatch: false,
    };
  }

  const damage = splineEval(probe.spline380, clear.hexa380);
  const inputs = {
    calculatedHexaDamage300: splineEval(probe.spline300, clear.hexa380),
    calculatedHexaDamage380: damage,
    calculatedDamage380: damage,
    calculatedHexaDamageKaling: damage,
    ascentConst: probe.ascentConst,
    ignoreDefConst300: probe.ignoreDefConst300,
    ignoreDefConst380: probe.ignoreDefConst380,
    spline300: probe.spline300,
    spline380: probe.spline380,
    genePassConst: probe.genePassConst,
  };
  const level = clear.hexaAdjusted || clear.level == null ? entry.level + LEVEL_GAP_CAP : clear.level;
  const result = computeBossClear(entry, level, ASSUMED_ARCANE_FORCE, ASSUMED_AUTHENTIC_FORCE, inputs);
  if (!result) return { error: `Boss Clear formula has no result for ${clear.boss} ${clear.difficulty}` };

  // A solo clear of a party-only boss (Extreme Kalos, Hard Jupiter, ...) is measured against
  // Scouter's solo-scale %, the same figure the app shows as "Solo %" for those bosses.
  const scouterPercent = clear.partySize === 1 && result.soloScalePercent != null ? result.soloScalePercent : result.clearRatePercent;
  const actualPercent = (100 * clear.timerSeconds) / (clear.timerSeconds - clear.secondsLeft);
  const shownDrift = clear.shownPercent == null ? null : scouterPercent / clear.shownPercent - 1;
  return {
    scouterPercent,
    actualPercent,
    factor: clear.partySize === 1 ? actualPercent / scouterPercent : null,
    levelAssumed: clear.level == null,
    shownMismatch: shownDrift != null && Math.abs(shownDrift) > SHOWN_PERCENT_TOLERANCE,
  };
}

function formatRow(clear, r) {
  const label = `${clear.class} ${clear.difficulty} ${clear.boss}`.padEnd(30);
  if (r.error) return `${label} ERROR: ${r.error}`;
  if (r.skipped) return `${label} (${r.skipped})`;
  const hexa = `${clear.hexaRounded ? "~" : ""}${clear.hexa380}`.padStart(8);
  const shown = clear.shownPercent == null ? "" : `  shown ${clear.shownPercent}%${r.shownMismatch ? " (MISMATCH)" : ""}`;
  const flags = [clear.runQuality !== "clean" && clear.runQuality, r.levelAssumed && "level assumed", clear.partySize > 1 && `party of ${clear.partySize}`, !isClose(r) && "overkill, not averaged"]
    .filter(Boolean)
    .join(", ");
  const factor = r.factor == null ? "  -  " : r.factor.toFixed(2);
  return `${label} HEXA ${hexa}  scouter ${r.scouterPercent.toFixed(1).padStart(5)}%  actual ${r.actualPercent.toFixed(1).padStart(5)}%  factor ${factor}${shown}${flags ? `  [${flags}]` : ""}`;
}

function summarize(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return `n=${values.length}  median ${median(values).toFixed(2)}  mean ${mean.toFixed(2)}  range ${Math.min(...values).toFixed(2)}-${Math.max(...values).toFixed(2)}`;
}

function groupFactors(rows, keyOf) {
  const groups = new Map();
  for (const { clear, r } of rows) {
    if (r.error || r.factor == null || clear.runQuality !== "clean" || !isClose(r)) continue;
    const key = keyOf(clear);
    groups.set(key, [...(groups.get(key) ?? []), r.factor]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function runReport() {
  const { clears: logged } = readJson(CLEARS_FILE);
  // A temporary event skill inflates a clear, and other regions differ from GMS in attack speed cap,
  // patch state and MapleScouter's class data, so neither counts toward a class factor (except an
  // EVENT_DAMAGE item, divided out below).
  const clears = logged.filter((clear) => (!clear.eventSkill || EVENT_DAMAGE[clear.eventSkill]) && (clear.region ?? "GMS") === "GMS"
    && !(clear.uploaded && clear.uploaded < clearCutoff(clear)));
  if (clears.length < logged.length) console.log(`${logged.length - clears.length} event-skill, non-GMS or outdated (before ${LAST_SCOUTER_UPDATE}, or before a boss rework) clear(s) left out.`);
  const seen = new Set();
  for (const c of logged.filter((clear) => clear.hexa380 != null)) {
    const key = [c.class, c.boss, c.difficulty, c.hexa380, c.secondsLeft].join("|");
    if (seen.has(key)) console.log(`Possible duplicate: ${c.class} ${c.difficulty} ${c.boss}, HEXA ${c.hexa380}, ${c.secondsLeft} s left.`);
    seen.add(key);
  }
  const unknownRegion = clears.filter((clear) => clear.region == null).length;
  if (unknownRegion > 0) console.log(`${unknownRegion} clear(s) have no region yet and are counted as GMS until confirmed.`);
  console.log();
  const probes = readJson(PROBES_FILE, {});
  const rows = clears.map((clear) => {
    const r = evaluateClear(clear, probes);
    const eventDamage = EVENT_DAMAGE[clear.eventSkill] ?? 1;
    // Clear rate is linear in damage below the Ascent bonus, so the item's damage scales it directly.
    if (eventDamage !== 1 && r.scouterPercent != null) {
      r.scouterPercent *= eventDamage;
      if (r.factor != null) r.factor /= eventDamage;
    }
    return { clear, r };
  });

  console.log("Clears (scouter = today's MapleScouter via bossClearFormula.ts; factor = actual / scouter)\n");
  for (const { clear, r } of rows) console.log(formatRow(clear, r));

  console.log(`\nPer class (clean solo runs that used at least ${MIN_TIMER_USED * 100}% of the timer):`);
  for (const [classId, factors] of groupFactors(rows, (c) => c.class)) {
    console.log(`  ${classId.padEnd(14)} ${NON_KMS_CLASSES.has(classId) ? "non-KMS" : "control"}  ${summarize(factors)}`);
  }
  console.log("\nPer class and boss (spots boss-specific exceptions):");
  for (const [key, factors] of groupFactors(rows, (c) => `${c.class} ${c.difficulty} ${c.boss}`)) {
    console.log(`  ${key.padEnd(30)} ${summarize(factors)}`);
  }
  printTwoWayFit(rows);
}

// ── Two-way fit ──────────────────────────────────────────────────────────────

// GMS Hard Limbo and Hard Baldrix are KMS Destiny (same cut), so each pair is one fight.
const SAME_FIGHT = { "Destiny limbo": "Hard limbo", "Destiny bardrix": "Hard bardrix" };
const fightOf = (clear) => SAME_FIGHT[`${clear.difficulty} ${clear.boss}`] ?? `${clear.difficulty} ${clear.boss}`;
const median = (values) => {
  const sorted = values.toSorted((a, b) => a - b), mid = sorted.length / 2;
  return sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
};
// The median of each group's values of a per-point quantity.
function groupMedians(points, keyOf, valueOf) {
  const groups = new Map();
  for (const p of points) groups.set(keyOf(p), [...(groups.get(keyOf(p)) ?? []), valueOf(p)]);
  return new Map([...groups].map(([key, values]) => [key, median(values)]));
}

/** Splits every close clear's factor into baseline x class x boss (median polish on logs), so a
 *  class is judged against how hard its bosses were for everyone, and a boss against how strong
 *  the classes that cleared it are. Class factors are relative to the KMS classes (their median is
 *  1), boss factors to the typical boss, and the baseline is what's left: a typical clear's factor
 *  against MapleScouter. A class+boss pair whose clears still sit well off the fit is a candidate
 *  exception. */
function printTwoWayFit(rows) {
  const points = rows
    .filter(({ clear, r }) => !r.error && r.factor != null && clear.runQuality === "clean" && isClose(r))
    .map(({ clear, r }) => ({ cls: clear.class, fight: fightOf(clear), y: Math.log(r.factor) }));
  let baseline = median(points.map((p) => p.y));
  let classOf = new Map(), bossOf = new Map();
  for (let i = 0; i < 30; i++) {
    classOf = groupMedians(points, (p) => p.cls, (p) => p.y - baseline - (bossOf.get(p.fight) ?? 0));
    bossOf = groupMedians(points, (p) => p.fight, (p) => p.y - baseline - classOf.get(p.cls));
  }
  // Move the KMS classes' median class effect and the median boss effect into the baseline.
  const classShift = median([...classOf].filter(([id]) => !NON_KMS_CLASSES.has(id)).map(([, v]) => v));
  const bossShift = median([...bossOf.values()]);
  baseline += classShift + bossShift;
  const counts = (keyOf) => points.reduce((m, p) => m.set(keyOf(p), (m.get(keyOf(p)) ?? 0) + 1), new Map());
  const classCount = counts((p) => p.cls), bossCount = counts((p) => p.fight);

  console.log(`\nTwo-way fit (close clean solo clears): baseline ${Math.exp(baseline).toFixed(2)}, a typical clear against MapleScouter`);
  console.log("Class factors (KMS classes' median = 1):");
  for (const [id, v] of [...classOf].sort(([, a], [, b]) => b - a)) {
    console.log(`  ${id.padEnd(16)} ${NON_KMS_CLASSES.has(id) ? "non-KMS" : "control"}  ${Math.exp(v - classShift).toFixed(2)}  (${classCount.get(id)} clears)`);
  }
  console.log("Boss factors (typical boss = 1; under 1 is harder than MapleScouter's cut):");
  for (const [fight, v] of [...bossOf].sort(([, a], [, b]) => b - a)) {
    console.log(`  ${fight.padEnd(22)} ${Math.exp(v - bossShift).toFixed(2)}  (${bossCount.get(fight)} clears)`);
  }
  const residuals = groupMedians(points, (p) => `${p.cls} ${p.fight}`, (p) => p.y - baseline - (classOf.get(p.cls) - classShift) - (bossOf.get(p.fight) - bossShift));
  const pairCount = counts((p) => `${p.cls} ${p.fight}`);
  const off = [...residuals].filter(([key, v]) => pairCount.get(key) >= 2 && Math.abs(v) > Math.log(1.1));
  console.log("Class+boss pairs at least 10% off the fit, with 2+ clears (candidate exceptions):");
  for (const [key, v] of off.sort(([, a], [, b]) => a - b)) console.log(`  ${key.padEnd(30)} x${Math.exp(v).toFixed(2)}  (${pairCount.get(key)} clears)`);
  if (off.length === 0) console.log("  none");
}

const [mode, ...args] = process.argv.slice(2).filter((a, i, all) => !["--data", "--clears", "--since"].includes(a) && !["--data", "--clears", "--since"].includes(all[i - 1]));
if (mode === "probe") await runProbe(args);
else runReport();

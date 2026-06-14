#!/usr/bin/env node
/**
 * Generates per-class V Matrix node catalogs from the WZ-dumped manifest.
 * Output: public/data/vmatrix/<classId>.json
 *   { job: Node[], boost: Node[], common: Node[] }  where Node = [id, displayName, maxLevel].
 *   id is the manifests/v269/v-matrix.json entry id, used directly for the
 *   haku.network v-matrix icon (resourceImageUrl("v-matrix", id, "icon.png")).
 *   maxLevel is per-entry, read from the manifest (job=30, boost=60, common=30),
 *   except MAX_LEVEL_OVERRIDES below for entries where the manifest is wrong.
 *
 * Source: manifests/v269/v-matrix.json `entries`, each keyed by id:
 *   - type 0 with `className` set: job nodes (jobs === [class's own job code])
 *   - type 1 with `className` set: boost nodes (already fused per matrix slot)
 *   - type 0 without `className`: common nodes — universal (jobs === ["all"])
 *     or branch/faction-shared (jobs includes a class's own job code)
 *   - type 2/3: special/event/unused — skipped entirely
 *
 * Common node order: branch/faction-shared nodes (ascending id) first, then the 15 universal
 * nodes in UNIVERSAL_ORDER — the in-game "Common" tab's fixed display order, which isn't
 * derivable from any manifest field and was confirmed against 3 classes' screenshots.
 *
 * Usage: node scripts/gen-vmatrix.mjs [v-matrix.json]
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const manifestPath = process.argv[2] ?? "manifests/v269/v-matrix.json";
const OUTPUT_DIR = resolve("public/data/vmatrix");

const SLUG_OVERRIDES = { Bowmaster: "bow_master", "Dual Blade": "blade_master" };
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const classIdFor = (className) => SLUG_OVERRIDES[className] ?? slugify(className);

// Removed classes still present in the manifest — Jett and old Beast Tamer ("11212").
const EXCLUDED_CLASSES = new Set(["Jett's Return", "11212"]);

// Manifest reports maxLevel 50 for these two Hayato/Kanna shared common nodes, but the
// in-game skill tooltip shows max level 30 — manifest data bug, override until corrected.
const MAX_LEVEL_OVERRIDES = { "10000021": 30, "10000030": 30 };
const maxLevelFor = (id, e) => MAX_LEVEL_OVERRIDES[id] ?? e.maxLevel;

const entries = JSON.parse(readFileSync(resolve(manifestPath), "utf8")).entries;

// Per-class job + boost nodes, and each class's own job code, from className-tagged entries.
const classes = new Map(); // classId -> { className, ownCode, job: Node[], boost: Node[] }
for (const [id, e] of Object.entries(entries)) {
  if (!e.className || EXCLUDED_CLASSES.has(e.className)) continue;
  let cls = classes.get(classIdFor(e.className));
  if (!cls) {
    cls = { className: e.className, ownCode: null, job: [], boost: [] };
    classes.set(classIdFor(e.className), cls);
  }
  if (e.type === 0) {
    cls.ownCode ??= e.jobs[0];
    cls.job.push([id, e.name, maxLevelFor(id, e)]);
  } else if (e.type === 1) {
    cls.boost.push([id, e.name, maxLevelFor(id, e)]);
  }
}

// Common candidates: type-0 entries with no className (universal + branch/faction-shared).
const commonCandidates = Object.entries(entries).filter(([, e]) => e.type === 0 && !e.className);
const branchCommon = commonCandidates.filter(([, e]) => !e.jobs.includes("all"));

const UNIVERSAL_ORDER = [
  "10000008", // Erda Nova
  "10000009", // Will of Erda
  "10000007", // Blink
  "10000022", // Erda Shower
  "10000000", // Rope Lift
  "10000010", // Decent Holy Symbol
  "10000036", // Decent Holy Fountain
  "10000006", // Decent Speed Infusion
  "10000005", // Decent Advanced Blessing
  "10000004", // Decent Combat Orders
  "10000003", // Decent Hyper Body
  "10000002", // Decent Sharp Eyes
  "10000001", // Decent Mystic Door
  "10000024", // True Arachnid Reflection
  "10000031", // Solar Crest
];
const universalCommon = UNIVERSAL_ORDER.map((id) => [id, entries[id].name, maxLevelFor(id, entries[id])]);

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const [classId, cls] of classes) {
  const common = [
    ...branchCommon.filter(([, e]) => e.jobs.includes(cls.ownCode)).map(([id, e]) => [id, e.name, maxLevelFor(id, e)]),
    ...universalCommon,
  ];

  writeFileSync(resolve(OUTPUT_DIR, `${classId}.json`), JSON.stringify({ job: cls.job, boost: cls.boost, common }));
  console.log(`${classId.padEnd(18)} job=${cls.job.length} boost=${cls.boost.length} common=${common.length}`);
}

console.log(`\n${classes.size} classes written -> ${OUTPUT_DIR}`);

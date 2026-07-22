#!/usr/bin/env node
/**
 * Generates per-class V Matrix node catalogs from the WZ-dumped manifest.
 * Output: public/data/vmatrix/<classId>.json
 *   { job: Node[], boost: Node[], common: Node[] }  where Node = [id, displayName, maxLevel].
 *   id is the manifests/v270/v-matrix.json entry id, used directly for the
 *   haku.network v-matrix icon (resourceImageUrl("v-matrix", id, "icon.png")).
 *   maxLevel is per-entry, read from the manifest (job=30, boost=60, common=30).
 *
 * Source: manifests/v270/v-matrix.json `entries`, each keyed by id:
 *   - type 0 with `className`, id >= 10010000: job nodes (jobs === [class's own job code])
 *   - type 1 with `className` set: boost nodes (already fused per matrix slot)
 *   - type 0 without `className`: common nodes — universal (jobs === ["all"])
 *     or branch/faction-shared (jobs includes a class's own job code)
 *   - type 0 with `className`, id < 10010000: class-EXCLUSIVE common nodes (e.g. Zero's
 *     "Transcendent", Kinesis's "Afterimage of the Otherworld") — they carry a className
 *     like job nodes but live in the shared common id space, so they belong in common, not job
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

const manifestPath = process.argv[2] ?? "manifests/v270/v-matrix.json";
const OUTPUT_DIR = resolve("public/data/vmatrix");

const SLUG_OVERRIDES = { Bowmaster: "bow_master", "Dual Blade": "blade_master" };
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const classIdFor = (className) => SLUG_OVERRIDES[className] ?? slugify(className);

// Removed classes still present in the manifest — Jett and old Beast Tamer ("11212").
const EXCLUDED_CLASSES = new Set(["Jett's Return", "11212"]);

// Job entries the manifest over-includes. Kinesis has 4 job nodes in-game (confirmed by
// Yuki), but the manifest lists 8 with no field to tell them apart, so the extras are
// excluded by id. Kinesis's 2026-07-22 revamp swapped which 4 are real: Psychic Tornado,
// Ultimate - Mind Over Matter, Ultimate - Psychic Shockwave, and Law of Gravity are no
// longer V matrix job nodes, replaced by Psychic Shockwave, Psychic Nova, Ultimate:
// Checkmate, and Psychic Castle. The job-count guard below will surface any future class
// that drifts from the 4-job / 6-boost shape.
const EXCLUDED_NODE_IDS = new Set(["10020006", "10020018", "10020031", "10020042"]);

const maxLevelFor = (id, e) => e.maxLevel;

// Job nodes are id >= 10010000; the 10000xxx space is shared common nodes. A few
// className-tagged entries (Zero's Transcendent pair, Kinesis's Afterimage) live in
// that common space and are class-exclusive COMMON nodes, not job nodes.
const COMMON_ID_MAX = 10010000;
const isCommonRangeId = (id) => Number(id) < COMMON_ID_MAX;

const entries = JSON.parse(readFileSync(resolve(manifestPath), "utf8")).entries;

// Per-class job + boost nodes, and each class's own job code, from className-tagged entries.
const classes = new Map(); // classId -> { className, ownCode, job: Node[], boost: Node[] }
for (const [id, e] of Object.entries(entries)) {
  if (!e.className || EXCLUDED_CLASSES.has(e.className) || EXCLUDED_NODE_IDS.has(id)) continue;
  let cls = classes.get(classIdFor(e.className));
  if (!cls) {
    cls = { className: e.className, ownCode: null, job: [], boost: [] };
    classes.set(classIdFor(e.className), cls);
  }
  if (e.type === 0) {
    cls.ownCode ??= e.jobs[0];
    // Class-exclusive common nodes (common id space) are picked up by commonCandidates below.
    if (!isCommonRangeId(id)) cls.job.push([id, e.name, maxLevelFor(id, e)]);
  } else if (e.type === 1) {
    cls.boost.push([id, e.name, maxLevelFor(id, e)]);
  }
}

// In-game order of the branch/faction-shared common nodes is NOT the manifest id order.
// Ids listed here sort to the front in this order; everything else falls back to ascending id.
const BRANCH_COMMON_ORDER = [
  "10000025", // Maple World Goddess's Blessing — precedes the faction node (e.g. Resistance Infantry) in-game
];
const branchRank = (id) => {
  const i = BRANCH_COMMON_ORDER.indexOf(id);
  return i === -1 ? BRANCH_COMMON_ORDER.length : i;
};

// Common candidates: type-0 entries that are either unowned (universal + branch/faction-shared)
// or class-exclusive common nodes living in the common id space (Zero/Kinesis specials).
const commonCandidates = Object.entries(entries).filter(([id, e]) => e.type === 0 && (!e.className || isCommonRangeId(id)));
const branchCommon = commonCandidates
  .filter(([, e]) => !e.jobs.includes("all"))
  .sort(([a], [b]) => branchRank(a) - branchRank(b) || a.localeCompare(b));

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

// Every class should have exactly 4 job nodes and 6 boost nodes. Anything else signals a
// manifest anomaly (over/under-included nodes) that needs a human look — flag it loudly.
const offShape = [...classes].filter(([, c]) => c.job.length !== 4 || c.boost.length !== 6);
if (offShape.length > 0) {
  console.warn(`\n⚠ ${offShape.length} class(es) not 4-job / 6-boost — verify against in-game:`);
  for (const [classId, c] of offShape) console.warn(`   ${classId.padEnd(18)} job=${c.job.length} boost=${c.boost.length}`);
} else {
  console.log("\nAll classes are 4-job / 6-boost ✓");
}

/*
  Generates the obfuscated daily-puzzle payload for the Skill Guesser game.

  Usage: node scripts/generate-skill-guesser-data.mjs

  Sources:
  - manifests/v270/skill.json — skill id -> name. MapleStory skill ids encode the
    owning job: floor(id / 10000) is the job id (e.g. 1121011 -> 112 = Hero 4th job).
    Each class's HEXA job group (x14/x20/x36) carries the origin/ascent skills and
    mastery add-on skills with their own per-skill icons, so HEXA content is
    covered without ever using a combined mastery icon.
  - src/features/tools/hexa-skills/hexa-classes.ts — backfills origin/ascent
    skills missing from skill.json via `hexa-skill` ids (e.g. Kain's Churning
    Malice), and contributes the SHINE classes' Erda Link enhancement skills via
    `erda-skill` paths. Mastery/nodeUrl composites are never picked up.
  - src/features/games/skill-guesser/classes.ts — the answer pool; every generated
    puzzle's class name must exist there.

  Filtering rules:
  - Only job ids unique to a single class are used; branch-shared jobs (Swordman,
    Magician, beginner jobs, 5th-job commons, …) are excluded and their skill
    names are banned everywhere (shared icons are unguessable).
  - "HEXA "/"SHINE " prefixed entries are skipped (enhanced duplicates of base
    skills / mastery icons).
  - Hyper passives ("<base skill> - Reinforce") are skipped (duplicate icons):
    both by known hyper suffix and by base-skill-name match.
  - A name appearing in more than one class pool is dropped from all of them.

  Output: src/features/games/skill-guesser/puzzle-data.generated.ts containing a
  base64(XOR(json)) payload of [resourceType, skillId, skillName, className]
  tuples in daily order (resourceType: 0 = skill, 1 = hexa-skill, 2 = erda-skill),
  so answers aren't trivially readable from the bundle.
*/

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUZZLE_COUNT = 365;
const SEED = 0x269;
const XOR_KEY = "mapledoro-skill-guesser";

// ── Class -> job-id prefixes (1st/2nd/3rd/4th job + HEXA add-on group) ──────

const CLASS_JOB_PREFIXES = {
  "Hero": [110, 111, 112, 114],
  "Paladin": [120, 121, 122, 124],
  "Dark Knight": [130, 131, 132, 134],
  "Arch Mage (Fire/Poison)": [210, 211, 212, 214],
  "Arch Mage (Ice/Lightning)": [220, 221, 222, 224],
  "Bishop": [230, 231, 232, 234],
  "Bow Master": [310, 311, 312, 314],
  "Marksman": [320, 321, 322, 324],
  "Pathfinder": [330, 331, 332, 334],
  "Night Lord": [410, 411, 412, 414],
  "Shadower": [420, 421, 422, 424],
  "Dual Blade": [430, 431, 432, 433, 434, 436],
  "Buccaneer": [510, 511, 512, 514],
  "Corsair": [520, 521, 522, 524],
  "Cannoneer": [530, 531, 532, 534],
  "Dawn Warrior": [1100, 1110, 1111, 1112, 1114],
  "Blaze Wizard": [1200, 1210, 1211, 1212, 1214],
  "Wind Archer": [1300, 1310, 1311, 1312, 1314],
  "Night Walker": [1400, 1410, 1411, 1412, 1414],
  "Thunder Breaker": [1500, 1510, 1511, 1512, 1514],
  "Mihile": [5100, 5110, 5111, 5112, 5114],
  "Aran": [2100, 2110, 2111, 2112, 2114],
  "Evan": [2200, 2211, 2214, 2217, 2220],
  "Mercedes": [2300, 2310, 2311, 2312, 2314],
  "Phantom": [2400, 2410, 2411, 2412, 2414],
  "Luminous": [2700, 2710, 2711, 2712, 2714],
  "Shade": [2500, 2510, 2511, 2512, 2514],
  "Battle Mage": [3200, 3210, 3211, 3212, 3214],
  "Wild Hunter": [3300, 3310, 3311, 3312, 3314],
  "Mechanic": [3500, 3510, 3511, 3512, 3514],
  "Xenon": [3600, 3610, 3611, 3612, 3614],
  "Blaster": [3700, 3710, 3711, 3712, 3714],
  "Demon Slayer": [3100, 3110, 3111, 3112, 3114],
  "Demon Avenger": [3101, 3120, 3121, 3122, 3124],
  "Kaiser": [6100, 6110, 6111, 6112, 6114],
  "Angelic Buster": [6500, 6510, 6511, 6512, 6514],
  "Cadena": [6400, 6410, 6411, 6412, 6414],
  "Kain": [6300, 6310, 6311, 6312, 6314],
  "Zero": [10100, 10110, 10111, 10112, 10114],
  "Kinesis": [14200, 14210, 14211, 14212, 14214],
  "Adele": [15100, 15110, 15111, 15112, 15114],
  "Illium": [15200, 15210, 15211, 15212, 15214],
  "Khali": [15400, 15410, 15411, 15412, 15414],
  "Ark": [15500, 15510, 15511, 15512, 15514],
  "Ren": [16100, 16110, 16111, 16112, 16114],
  "Lara": [16200, 16210, 16211, 16212, 16214],
  "Hoyoung": [16400, 16410, 16411, 16412, 16414],
  "Hayato": [4100, 4110, 4111, 4112, 4114],
  "Kanna": [4200, 4210, 4211, 4212, 4214],
  "Lynn": [17200, 17210, 17211, 17212, 17214],
  "Mo Xuan": [17500, 17510, 17511, 17512, 17514],
  "Sia Astelle": [18200, 18210, 18211, 18212, 18214],
  "Erel Light": [18100, 18110, 18111, 18112, 18114],
};

// Resource type codes in the payload.
const RES_SKILL = 0;
const RES_HEXA = 1;
const RES_ERDA = 2;

// Branch/account-shared jobs whose skill names are banned from every pool:
// icons for these are shared across classes, so they'd be unguessable.
const SHARED_JOB_PREFIXES = [
  0, // account-level (mounts, Goddess' Guard, …)
  100, 200, 300, 400, 500, // explorer branch commons
  910, 1000, 3000, 3001, 9100, // GM, Noblesse, Resistance/Demon commons, professions
  40000, 40001, 40002, 40003, 40004, 40005, // 5th job (common + archetype groups)
  50000, 50007, // 6th job commons (Sol Janus/Hecate, HEXA Stats)
];

// Hyper passive suffixes ("Raging Blow - Reinforce", …). These reuse the base
// skill's icon, so they'd be duplicate puzzles with awkward names.
const HYPER_SUFFIXES = new Set([
  "Reinforce", "Aura Reinforce", "Hex Reinforce", "Shield Reinforce", "Party Reinforce",
  "Linked Attack Reinforce", "Shockwave Reinforce", "Additional Reinforce", "Reinforce Duration",
  "Extra Strike", "Extra Target", "Extra Point", "Extra Attack", "Extra Guard", "Extra Shield",
  "Boss Rush", "Spread", "Guardbreak", "Guard Break", "Guardbreaker", "Critical Chance",
  "Enhance", "Bountiful Enhance", "Enchant Enhance", "Persist", "Cooldown Cutter",
  "Opportunity", "Range", "Range Up", "Add Range", "Add Attack", "Addition", "Efficiency",
  "Ferocity", "Cripple", "Preparation", "Split Attack", "Split Damage", "Armorbreak",
  "Harden", "Reduce Target", "Aftermath", "Experience", "Item Drop", "Slow", "Saving Grace",
  "Double Chance", "Temper Link", "Reduce Fury", "Reduced Fury", "Reduce Overload",
  "Dispel Magic", "Blur", "Guard Bonus", "Burden", "Bonus Attack", "Pummel", "Make Up",
  "Special Support", "ATT UP", "EXP UP", "EXP", "Link", "Penetration", "Ultimate Range",
  "Boss Point", "Steel Skin", "Repeated Attack Bonus", "Summon Chance", "Damage", "Direct",
  "Immunity Enhance 1", "Immunity Enhance 2", "True Immunity 1", "True Immunity 2",
  "Fury", "Boost",
]);

// ── Helpers ─────────────────────────────────────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Load sources ────────────────────────────────────────────────────────────

const skillManifest = JSON.parse(readFileSync(join(ROOT, "manifests/v270/skill.json"), "utf8")).entries;

const classesTs = readFileSync(join(ROOT, "src/features/games/skill-guesser/classes.ts"), "utf8");
const answerPool = new Set([...classesTs.matchAll(/name: "([^"]+)"/g)].map((m) => m[1]));

// hexa-classes.ts className -> Skill Guesser class name (only differing ones).
const HEXA_CLASS_NAME_MAP = {
  "Bowmaster": "Bow Master",
  "Arch Mage (F/P)": "Arch Mage (Fire/Poison)",
  "Arch Mage (I/L)": "Arch Mage (Ice/Lightning)",
};

/**
 * Parse single-skill-icon HEXA entries per class out of hexa-classes.ts:
 * origin/ascent (s() = `hexa-skill` id, su(…, "skill") = `skill` id) and the
 * SHINE classes' Erda Link enhancements (su(…, "erda-skill") = erda path).
 * Mastery node()/nodeUrl() composites are deliberately not matched.
 */
function parseHexaClassSkills() {
  const hexaTs = readFileSync(join(ROOT, "src/features/tools/hexa-skills/hexa-classes.ts"), "utf8");
  const result = new Map(); // className -> { originAscent: entry[], erda: entry[] }
  for (const rawBlock of hexaTs.split(/const \w+: HexaClassDef = \{/).slice(1)) {
    const block = rawBlock.slice(0, rawBlock.indexOf("\n};")); // stop at the class literal's end
    const hexaName = block.match(/className: "([^"]+)"/)?.[1];
    if (!hexaName) continue;
    const className = HEXA_CLASS_NAME_MAP[hexaName] ?? hexaName;
    if (!answerPool.has(className)) throw new Error(`hexa class "${hexaName}" not in answer pool`);
    const originAscent = [];
    for (const role of ["origin", "ascent"]) {
      const plain = block.match(new RegExp(`${role}: s\\("([^"]+)", "([^"]+)"\\)`));
      const asSkill = block.match(new RegExp(`${role}: su\\("([^"]+)", "skill", "([^"]+)"\\)`));
      if (plain) originAscent.push({ className, name: plain[1], type: RES_HEXA, id: plain[2] });
      else if (asSkill) originAscent.push({ className, name: asSkill[1], type: RES_SKILL, id: asSkill[2] });
      else throw new Error(`could not parse ${role} for "${hexaName}"`);
    }
    const erda = [...block.matchAll(/su\("([^"]+)", "erda-skill", "([^"]+)"\)/g)].map((m) => ({
      className,
      name: m[1],
      type: RES_ERDA,
      id: m[2],
    }));
    result.set(className, { originAscent, erda });
  }
  return result;
}

// ── Build per-class pools from skill.json ───────────────────────────────────

const jobToClass = new Map();
for (const [cls, prefixes] of Object.entries(CLASS_JOB_PREFIXES)) {
  if (!answerPool.has(cls)) throw new Error(`prefix-table class "${cls}" not in answer pool`);
  for (const p of prefixes) jobToClass.set(p, cls);
}

const sharedJobs = new Set(SHARED_JOB_PREFIXES);
const bannedNames = new Set();
const pools = new Map(Object.keys(CLASS_JOB_PREFIXES).map((c) => [c, []]));

const sortedIds = Object.keys(skillManifest).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
for (const id of sortedIds) {
  const name = skillManifest[id].name?.trim();
  if (!name) continue;
  const job = Math.floor(parseInt(id, 10) / 10000);
  if (sharedJobs.has(job)) {
    bannedNames.add(name);
    continue;
  }
  const cls = jobToClass.get(job);
  if (!cls) continue;
  if (name.startsWith("HEXA ") || name.startsWith("SHINE ")) continue;
  pools.get(cls).push({ className: cls, name, type: RES_SKILL, id });
}

// Strip a trailing roman numeral / digit rank from a skill name ("Mana Burst IV"
// -> "Mana Burst") so hyper passives of ranked skills are recognized.
function baseRank(name) {
  return name.replace(/ (?:[IVX]+|\d+)$/, "");
}

// Per-class cleanup: drop hyper passives ("<base> - <suffix>" where <suffix> is
// a known hyper suffix or <base> is another skill of the class), then dedup.
for (const [cls, pool] of pools) {
  const names = new Set(pool.flatMap((e) => [e.name, baseRank(e.name)]));
  const seen = new Set();
  const cleaned = [];
  for (const e of pool) {
    const dash = e.name.lastIndexOf(" - ");
    if (dash !== -1) {
      const base = e.name.slice(0, dash);
      const suffix = e.name.slice(dash + 3);
      if (HYPER_SUFFIXES.has(suffix) || names.has(base) || names.has(baseRank(base))) continue;
    }
    if (bannedNames.has(e.name) || seen.has(e.name)) continue;
    seen.add(e.name);
    cleaned.push(e);
  }
  pools.set(cls, cleaned);
}

// HEXA additions from hexa-classes.ts: backfill origin/ascent skills that
// skill.json lacks, and add the SHINE classes' Erda Link enhancements. These
// are class-specific by construction, so the shared-name ban doesn't apply.
const hexaClassSkills = parseHexaClassSkills();
for (const [cls, { originAscent, erda }] of hexaClassSkills) {
  const pool = pools.get(cls);
  const names = new Set(pool.map((e) => e.name));
  for (const e of [...originAscent, ...erda]) {
    if (names.has(e.name)) continue;
    names.add(e.name);
    pool.push(e);
  }
}

// Cross-class duplicate names are unguessable — drop everywhere.
const nameCounts = new Map();
for (const pool of pools.values()) {
  for (const e of pool) nameCounts.set(e.name, (nameCounts.get(e.name) ?? 0) + 1);
}
for (const [cls, pool] of pools) {
  pools.set(cls, pool.filter((e) => nameCounts.get(e.name) === 1));
}

// Every class should still carry its origin and ascent skill.
for (const [cls, { originAscent }] of hexaClassSkills) {
  const names = new Set(pools.get(cls).map((e) => e.name));
  for (const e of originAscent) {
    if (!names.has(e.name)) console.warn(`WARNING: ${cls} pool is missing ${e.name}`);
  }
}

// ── Select PUZZLE_COUNT entries, balanced across classes ────────────────────

const rng = mulberry32(SEED);
const classOrder = shuffle([...pools.keys()], rng);
for (const pool of pools.values()) shuffle(pool, rng);

const picks = [];
for (let round = 0; picks.length < PUZZLE_COUNT; round++) {
  let added = false;
  for (const cls of classOrder) {
    const pool = pools.get(cls);
    if (round < pool.length) {
      picks.push(pool[round]);
      added = true;
      if (picks.length === PUZZLE_COUNT) break;
    }
  }
  if (!added) break;
}

shuffle(picks, rng);
// Spread out same-class neighbors so consecutive days differ.
for (let i = 1; i < picks.length; i++) {
  if (picks[i].className !== picks[i - 1].className) continue;
  for (let j = i + 1; j < picks.length; j++) {
    if (picks[j].className !== picks[i - 1].className) {
      [picks[i], picks[j]] = [picks[j], picks[i]];
      break;
    }
  }
}

// ── Emit ────────────────────────────────────────────────────────────────────

const payload = JSON.stringify(picks.map((e) => [e.type, e.id, e.name, e.className]));
const bytes = Buffer.from(payload, "utf8");
for (let i = 0; i < bytes.length; i++) bytes[i] ^= XOR_KEY.charCodeAt(i % XOR_KEY.length);

const outPath = join(ROOT, "src/features/games/skill-guesser/puzzle-data.generated.ts");
writeFileSync(
  outPath,
  `// AUTO-GENERATED by scripts/generate-skill-guesser-data.mjs — do not edit.\n` +
    `// base64(XOR(json)) payload of [resourceType, skillId, skillName, className]\n` +
    `// tuples in daily order; decoded by puzzles.ts. Obfuscated so the answer\n` +
    `// isn't trivially readable from the bundle or devtools.\n` +
    `export const SKILL_GUESSER_PUZZLE_DATA =\n  "${bytes.toString("base64")}";\n`,
);

const counts = picks.reduce((m, e) => m.set(e.className, (m.get(e.className) ?? 0) + 1), new Map());
console.log(`wrote ${picks.length} puzzles to ${outPath}`);
console.log("pool sizes:", [...pools.entries()].map(([c, p]) => `${c}: ${p.length}`).join(", "));
console.log("picked per class:", [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}: ${n}`).join(", "));

#!/usr/bin/env node
/*
  Regenerates Mastery%/Final Damage% baselines for the 53 non-legacy classes from
  manifests/v269/skill-formulas.json.

  Each class's baseline is pinned by skill id (RECIPES below) rather than resolved by name at
  runtime — same pattern as gen-vmatrix.mjs's EXCLUDED_NODE_IDS. Every pinned entry also carries
  the `expected` value it evaluated to when the recipe was last verified against a real character
  (see FINAL_DAMAGE_DATA.md / MASTERY_DATA.md, both project-root, uncommitted). If a future manifest
  update changes a pinned skill's formula, this script throws instead of silently shipping a new
  number — that's a signal to re-verify against a real character (see CLAUDE.md "Class revamps"),
  not something to auto-accept.

  Final Damage combines multiplicatively: 100 * prod(1 + skill%/100) - 100.
  Mastery combines additively: MASTERY_BASE_PERCENT[classId] + sum(skill%). The "base" term is an
  inherent per-class constant (20/25/15/etc) that is NOT encoded anywhere in skill-formulas.json —
  it has to be sourced externally (Grandis Library + live-character verification) and hand-maintained
  below; only the skill-contribution half of Mastery is auto-verified against the manifest.

  Run: node scripts/gen-stat-baselines.mjs
*/

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "manifests/v269/skill-formulas.json");
const DATA_DIR = path.join(ROOT, "src/features/characters/setup/data");

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const entries = manifest.entries;

function evalFormula(expr, x) {
  const js = expr.replace(/d\(/g, "Math.floor(").replace(/u\(/g, "Math.ceil(");
  // eslint-disable-next-line no-new-func
  return new Function("x", `return ${js};`)(x);
}

/** All stats on an entry whose label matches (case-insensitive) a target label. */
function statsWithLabel(entry, label) {
  return entry.stats?.filter((s) => s.label.toLowerCase() === label) ?? [];
}

/**
 * Resolves one pinned {id, name, expected} to its current value, matching against `expected` to
 * disambiguate skills that carry more than one stat under the same label (e.g. Marksman's Greater
 * Empowered Arrows has both a flagged-for-review stat and the real always-on one, both labelled
 * "Final Damage"). Throws loudly if nothing on the pinned id still matches — that means the
 * manifest changed underneath this pin and it needs re-verifying, not silently re-pinning.
 */
// Zero's "Long Sword Mastery" mastery value sits in rawFormulas.mastery, never promoted to the
// classified stats[] array (a known extractor gap, reported but not yet fixed — unlike Hero's
// "Advanced Combo"/Angelic Buster's "True Heart Inheritance", which were the same shape of bug and
// did get fixed 2026-07-17). Remove this once the manifest promotes it properly; resolvePinned()
// will then find it via stats[] like everything else and this override becomes a no-op to delete.
const RAW_FORMULA_FALLBACK = { "101000203": "mastery" };

function resolvePinned(classId, statLabel, pin) {
  const entry = entries[pin.id];
  if (!entry) {
    throw new Error(`[gen-stat-baselines] ${classId}: pinned id ${pin.id} ("${pin.name}") no longer exists in the manifest.`);
  }
  const candidates = statsWithLabel(entry, statLabel).map((stat) => evalFormula(stat.formula, entry.maxLevel));
  let match = candidates.find((v) => Math.abs(v - pin.expected) < 0.01);
  if (match === undefined && RAW_FORMULA_FALLBACK[pin.id]) {
    const rawKey = RAW_FORMULA_FALLBACK[pin.id];
    const rawValue = evalFormula(entry.rawFormulas[rawKey], entry.maxLevel);
    if (Math.abs(rawValue - pin.expected) < 0.01) match = rawValue;
  }
  if (match === undefined) {
    throw new Error(
      `[gen-stat-baselines] ${classId}: pinned skill "${pin.name}" (id ${pin.id}) no longer evaluates to ${pin.expected} ` +
        `(found: ${candidates.join(", ") || "no matching stat"}). The skill's formula changed — re-verify against a real character.`,
    );
  }
  return match;
}

/**
 * Evaluates a pinned skill's own formula at `entry.maxLevel + levelOffset` instead of at its
 * pinned/verified maxLevel — this is the "Decent Combat Orders"/"Passive Skills +1 IA" boosted
 * state (Character Info setup always assumes at least one of these is active, since DCO sits in
 * every class's buff guide — see CLAUDE.md/memory for the full mechanism). Confirmed 2026-07-18
 * against 4 independently toggle-tested classes (Kanna/Lara/Ren/Hoyoung, done in an earlier
 * session by hand) that simply re-evaluating each skill's real formula one or two levels past its
 * normal cap exactly reproduces the empirically-measured DCO/IA+1 state — no per-class curve or
 * "KMS vs non-KMS" rule needed; what looked like a class-level mechanic was just each skill's own
 * formula shape (e.g. Kasen's `50+2*x` climbs twice as fast as the common `55+u(x/2)` shape).
 * No `expected` check here (unlike resolvePinned) — levelOffset 0 is already drift-guarded via
 * resolvePinned elsewhere, and this reuses the same verified id/formula, just at a different x.
 */
function resolvePinnedAtLevel(pin, statLabel, levelOffset) {
  // Decent Combat Orders / Passive Skills+1 only bump 4th-job skill levels — a pin explicitly
  // marked `job4: false` stays frozen at its tier-0 value regardless of the requested tier.
  const offset = pin.job4 === false ? 0 : levelOffset;
  const entry = entries[pin.id];
  const stat = statsWithLabel(entry, statLabel).find((s) => Math.abs(evalFormula(s.formula, entry.maxLevel) - pin.expected) < 0.01);
  if (!stat) {
    const rawKey = RAW_FORMULA_FALLBACK[pin.id];
    if (rawKey) return evalFormula(entry.rawFormulas[rawKey], entry.maxLevel + offset);
    throw new Error(`[gen-stat-baselines] tiered lookup: no matching stat for pinned id ${pin.id} — resolvePinned should have already thrown.`);
  }
  return evalFormula(stat.formula, entry.maxLevel + offset);
}

// ---------------------------------------------------------------------------------------------
// Final Damage recipes — one entry per class, ids pinned via the 2026-07-17 live-verification
// pass (FINAL_DAMAGE_DATA.md). Combined multiplicatively.
// ---------------------------------------------------------------------------------------------
// `job4: false` marks a pin whose skill is NOT the class's 4th-job advancement — Decent Combat
// Orders / Passive Skills+1 IA only bump 4th-job skill levels (confirmed 2026-07-18 against a real
// Ren tier-2 capture: the generator's old uniform "+tier to every pinned skill" logic overshot her
// real 89.40% Final Damage by bumping 2nd-job Serene Verse II too; freezing it at tier0 reproduces
// 89.40% exactly). Job-advancement per skill was cross-checked against Grandis Library for every
// pin in both recipe tables below (2026-07-18) — pins with no `job4` field are confirmed 4th job
// and get the normal tier offset; `job4: false` pins are frozen at their tier-0 value regardless of
// requested tier. See resolvePinnedAtLevel's job4 gating.
const FINAL_DAMAGE_RECIPES = {
  hoyoung: [
    { id: "160000076", name: "Fiend Seal", expected: 10, job4: false }, // Beginner Skill
    { id: "164100013", name: "Fortune Fitness", expected: 5, job4: false }, // 2nd job
    { id: "164110011", name: "Asura", expected: 9, job4: false }, // 3rd job
    { id: "164120010", name: "Advanced Ritual Fan Mastery", expected: 33 },
    { id: "164120012", name: "Dragon's Eye", expected: 10 },
  ],
  lara: [
    { id: "162120025", name: "Advanced Wand Mastery", expected: 30 },
    { id: "162120027", name: "Insight", expected: 45 },
  ],
  ren: [
    { id: "161000005", name: "Serene Verse", expected: 5, job4: false }, // 1st job
    { id: "161100008", name: "Serene Verse II", expected: 10, job4: false }, // 2nd job
    { id: "161110009", name: "Serene Verse III", expected: 10, job4: false }, // 3rd job
    { id: "161120011", name: "Exquisite Sword Mastery", expected: 11 },
    { id: "161120012", name: "Serene Verse IV", expected: 20 },
  ],
  blaze_wizard: [
    { id: "12110025", name: "Liberated Magic", expected: 25, job4: false }, // 3rd job
    { id: "12110026", name: "Burning Focus", expected: 8, job4: false }, // 3rd job
    { id: "12120009", name: "Pure Magic", expected: 50 },
  ],
  dawn_warrior: [
    { id: "11120019", name: "Soul Blessing III", expected: 17, job4: false }, // hard-capped at 10, "does not apply Combat Orders" per wiki
    { id: "11120009", name: "Master of the Sword", expected: 25 },
  ],
  mihile: [
    { id: "51100001", name: "Sword Mastery", expected: 20, job4: false }, // 2nd job
    { id: "51110001", name: "Loyal Oath", expected: 25, job4: false }, // 3rd job
    { id: "51121006", name: "Roiling Soul", expected: 25 },
  ],
  night_walker: [
    { id: "14110032", name: "Shadow Momentum", expected: 15, job4: false }, // 3rd job
    { id: "14120006", name: "Dark Blessing", expected: 12 },
  ],
  thunder_breaker: [
    { id: "15100023", name: "Knuckle Mastery", expected: 7, job4: false }, // 2nd job
    { id: "15120006", name: "Knuckle Expert", expected: 18 },
  ],
  wind_archer: [
    { id: "13100025", name: "Bow Mastery", expected: 10, job4: false }, // 2nd job
    { id: "13110028", name: "Eagle Eye", expected: 12, job4: false }, // 3rd job
    { id: "13120006", name: "Bow Expert", expected: 35 },
  ],
  arch_mage_f_p: [
    { id: "2110015", name: "Elemental Decrease", expected: 40, job4: false }, // 3rd job
    { id: "2120004", name: "Infinity", expected: 91 },
  ],
  arch_mage_i_l: [
    { id: "2110015", name: "Elemental Decrease", expected: 40, job4: false }, // 3rd job
    { id: "2120004", name: "Infinity", expected: 91 },
  ],
  bishop: [
    { id: "2320013", name: "Blessed Harmony", expected: 10 },
    { id: "2120004", name: "Infinity", expected: 91 },
    { id: "2320012", name: "Buff Mastery", expected: 11 },
    { id: "2321054", name: "Righteously Indignant", expected: 30, job4: false }, // Hyper Skill
  ],
  bow_master: [
    { id: "3110019", name: "Reckless Hunt: Bow", expected: 30, job4: false }, // 3rd job
    { id: "3120022", name: "Enchanted Quiver", expected: 6, job4: false }, // hard-capped at 10, "does not apply Combat Orders" per wiki
    { id: "3120018", name: "Armor Break", expected: 16 },
  ],
  buccaneer: [
    { id: "5120022", name: "Greater Sea Serpent II", expected: 10 },
    { id: "5121015", name: "Crossbones", expected: 13 },
    { id: "5120014", name: "Typhoon Crush", expected: 10 },
  ],
  cannoneer: [
    { id: "5311004", name: "Forty Winks", expected: 10, job4: false }, // 3rd job
    { id: "5310006", name: "Reinforced Cannon", expected: 5, job4: false }, // 3rd job
    { id: "5310009", name: "Counter Crush", expected: 5, job4: false }, // 3rd job
    { id: "5320009", name: "Cannon Overload", expected: 32 },
  ],
  corsair: [
    { id: "5210013", name: "Fullmetal Jacket", expected: 20, job4: false }, // 3rd job
    { id: "5221015", name: "Parrotargetting", expected: 25 },
    { id: "5220020", name: "Majestic Presence", expected: 8 },
  ],
  dark_knight: [
    { id: "1311015", name: "Cross Surge", expected: 50, job4: false }, // 3rd job
    { id: "1320016", name: "Final Pact", expected: 30 },
  ],
  blade_master: [
    { id: "4320005", name: "Venom", expected: 9, job4: false }, // 2nd job
    { id: "4330009", name: "Shadow Meld", expected: 8, job4: false }, // 3rd job
    { id: "4340013", name: "Katara Expert", expected: 20 },
  ],
  hero: [
    { id: "1100000", name: "Weapon Mastery", expected: 10, job4: false }, // 2nd job
    { id: "1120010", name: "Enrage", expected: 25 },
  ],
  marksman: [
    { id: "3200000", name: "Crossbow Mastery", expected: 20, job4: false }, // 2nd job
    { id: "3220021", name: "Greater Empowered Arrows", expected: 8 },
    { id: "3220015", name: "Bolt Surplus", expected: 15 },
    { id: "3220016", name: "Last Man Standing", expected: 13 },
  ],
  night_lord: [
    { id: "4110012", name: "Expert Throwing Star Handling", expected: 29, job4: false }, // 3rd job
    { id: "4120014", name: "Dark Harmony", expected: 15 },
  ],
  paladin: [{ id: "1220018", name: "High Paladin", expected: 35 }],
  pathfinder: [
    { id: "3310006", name: "Guidance of the Ancients", expected: 28, job4: false }, // 3rd job
    { id: "3320010", name: "Ancient Bow Expertise", expected: 12 },
  ],
  shadower: [
    { id: "4200000", name: "Dagger Mastery", expected: 9, job4: false }, // 2nd job
    { id: "4221017", name: "Cruel Stab", expected: 24 },
    { id: "4220013", name: "Shadower Instinct", expected: 16 },
  ],
  adele: [
    { id: "151100015", name: "Will to Live", expected: 10, job4: false }, // 2nd job
    { id: "151110006", name: "Ascent", expected: 17, job4: false }, // 3rd job
    { id: "151120009", name: "Ruination", expected: 30 },
  ],
  ark: [
    { id: "155100007", name: "Knuckle Mastery", expected: 5, job4: false }, // 2nd job
    { id: "155110010", name: "Advanced Fusion", expected: 12, job4: false }, // 3rd job
    { id: "155120014", name: "Battle Frenzy", expected: 20 },
  ],
  illium: [{ id: "152120015", name: "Wisdom of the Crystal", expected: 50, job4: false }], // no DCO/CO note per wiki, single unambiguous page confirming maxLevel 30
  khali: [
    { id: "154110008", name: "Intuition", expected: 28, job4: false }, // 3rd job
    { id: "154120011", name: "Redemption", expected: 35 },
  ],
  aran: [
    { id: "21100000", name: "Polearm Mastery", expected: 10, job4: false }, // 2nd job
    { id: "21120001", name: "High Mastery", expected: 21 },
  ],
  evan: [
    { id: "22141016", name: "Elemental Decrease", expected: 18, job4: false }, // 3rd job
    { id: "22140020", name: "Magic Amplification", expected: 30, job4: false }, // 3rd job
  ],
  luminous: [
    { id: "27121113", name: "Twilight Nova", expected: 33 },
    { id: "27121006", name: "Arcane Pitch", expected: 40 },
  ],
  mercedes: [
    { id: "23110004", name: "Ignis Roar", expected: 17, job4: false }, // 3rd job
    { id: "23120010", name: "Defense Break", expected: 20 },
    { id: "23121054", name: "Elvish Blessing", expected: 6, job4: false }, // Hyper Skill
  ],
  phantom: [
    { id: "24110007", name: "Piercing Vision", expected: 30, job4: false }, // 3rd job
    { id: "24120006", name: "Cane Expert", expected: 31 },
  ],
  shade: [
    { id: "25100106", name: "Knuckle Mastery", expected: 10, job4: false }, // 2nd job
    { id: "25110107", name: "Spirit Bond 3", expected: 15, job4: false }, // 3rd job
    { id: "25120113", name: "Advanced Knuckle Mastery", expected: 16 },
    { id: "25120214", name: "Critical Insight", expected: 10 },
    { id: "25120019", name: "Skulk Solidarity", expected: 14 },
  ],
  lynn: [{ id: "172120003", name: "Guardian's Signet", expected: 60 }],
  mo_xuan: [
    { id: "170000001", name: "Xuanshan Spirit", expected: 10, job4: false }, // Beginner Skill
    { id: "175121041", name: "Secret Art: Strength Within", expected: 10, job4: false }, // Hyper Skill
  ],
  angelic_buster: [
    { id: "65100004", name: "Beautiful Soul", expected: 5, job4: false }, // 2nd job
    { id: "65110008", name: "Blossoming Star", expected: 14, job4: false }, // 3rd job
    { id: "65110006", name: "Affinity Heart III", expected: 12, job4: false }, // 3rd job
    { id: "65120005", name: "Soul Shooter Expert", expected: 21 },
  ],
  cadena: [{ id: "64110014", name: "Keen Eye", expected: 4, job4: false }], // 3rd job
  kain: [
    { id: "63110014", name: "Natural Born Instinct", expected: 25, job4: false }, // 3rd job
    { id: "63120012", name: "Dogma", expected: 30 },
    { id: "63120013", name: "Whispershot Mastery", expected: 37 },
  ],
  kaiser: [{ id: "61110004", name: "Catalyze", expected: 33, job4: false }], // 3rd job
  kinesis: [
    { id: "142120004", name: "Mind Break", expected: 40, job4: false }, // hard-capped at 30, no DCO/CO bump despite being job4 (confirmed via in-game skill window)
    { id: "142120006", name: "Telepath Tactics", expected: 20 },
    { id: "142120003", name: "Mind Quake", expected: 15 },
    { id: "142120010", name: "Awakening", expected: 15 },
  ],
  zero: [
    { id: "100000279", name: "Resolution Time", expected: 17, job4: false }, // Transcendent Skill
    { id: "101000203", name: "Long Sword Mastery", expected: 26, job4: false }, // Lv. 100 unlock, not job-tiered
  ],
  battle_mage: [
    { id: "32110001", name: "Battle Mastery", expected: 30, job4: false }, // 3rd job
    { id: "32120020", name: "Spell Boost", expected: 22 },
  ],
  blaster: [
    { id: "37110008", name: "Shield Training", expected: 10, job4: false }, // 3rd job
    { id: "37120012", name: "Combo Training II", expected: 70 },
  ],
  demon_avenger: [{ id: "31220004", name: "Overwhelming Power", expected: 19 }],
  demon_slayer: [
    { id: "1100000", name: "Weapon Mastery", expected: 10, job4: false }, // 2nd job
    { id: "31110007", name: "Focused Fury", expected: 32, job4: false }, // 3rd job
  ],
  mechanic: [{ id: "35110016", name: "Overclock", expected: 42, job4: false }], // 3rd job
  wild_hunter: [
    { id: "33100009", name: "Primal Edge", expected: 14, job4: false }, // 2nd job
    { id: "33110011", name: "Feral Resonance", expected: 15, job4: false }, // 3rd job
    { id: "33120009", name: "Extended Magazine", expected: 30 },
    { id: "33120010", name: "Crossbow Expert", expected: 10 },
    { id: "33120012", name: "Wild Instinct", expected: 10 },
  ],
  xenon: [{ id: "36120016", name: "Multilateral VI", expected: 17 }],
  hayato: [{ id: "41110007", name: "Endless Rain", expected: 15, job4: false }], // 3rd job
  kanna: [],
  erel_light: [
    { id: "181000004", name: "Radiant Vision", expected: 10, job4: false }, // 1st job
    { id: "181100005", name: "Radiant Pulse", expected: 10, job4: false }, // 2nd job
    { id: "181100007", name: "Gram Mastery", expected: 10, job4: false }, // 2nd job
    { id: "181110004", name: "Radiant Control", expected: 15, job4: false }, // 3rd job
    { id: "181110005", name: "Radiant Shock", expected: 10, job4: false }, // 3rd job
    { id: "181120007", name: "Radiant Dawn", expected: 20 },
    { id: "181120008", name: "Gram Expert", expected: 20 },
  ],
  sia_astelle: [
    { id: "182110000", name: "Stellar Enhancement I", expected: 25, job4: false }, // 3rd job
    { id: "182120000", name: "Stellar Enhancement II", expected: 35 },
  ],
};

// ---------------------------------------------------------------------------------------------
// Mastery skill recipes — the skill-contribution half only (see MASTERY_BASE_PERCENT below for
// the other half). Combined additively. Ids pinned via the 2026-07-17/18 verification pass
// (MASTERY_DATA.md).
// ---------------------------------------------------------------------------------------------
const MASTERY_SKILL_RECIPES = {
  hero: [{ id: "1120003", name: "Advanced Combo", expected: 70 }],
  paladin: [{ id: "1220018", name: "High Paladin", expected: 70 }],
  dark_knight: [{ id: "1320018", name: "Barricade Mastery", expected: 70 }],
  bishop: [{ id: "2310008", name: "Holy Focus", expected: 70, job4: false }], // 3rd job — Bishop's Mastery is flat across all 3 tiers
  blade_master: [{ id: "4340013", name: "Katara Expert", expected: 70 }],
  shadower: [{ id: "4220012", name: "Dagger Expert", expected: 70 }],
  night_lord: [{ id: "4120012", name: "Claw Expert", expected: 70 }],
  pathfinder: [{ id: "3320010", name: "Ancient Bow Expertise", expected: 70 }],
  marksman: [{ id: "3220004", name: "Crossbow Expert", expected: 70 }],
  bow_master: [{ id: "3120005", name: "Bow Expert", expected: 70 }],
  cannoneer: [{ id: "5320009", name: "Cannon Overload", expected: 70 }],
  buccaneer: [{ id: "5121015", name: "Crossbones", expected: 70 }],
  corsair: [{ id: "5220020", name: "Majestic Presence", expected: 70 }],
  dawn_warrior: [{ id: "11120007", name: "Student of the Blade", expected: 70 }],
  thunder_breaker: [{ id: "15120006", name: "Knuckle Expert", expected: 70 }],
  night_walker: [{ id: "14120005", name: "Throwing Expert", expected: 70 }],
  wind_archer: [{ id: "13120006", name: "Bow Expert", expected: 70 }],
  blaze_wizard: [{ id: "12120009", name: "Pure Magic", expected: 70 }],
  mihile: [{ id: "51120001", name: "Expert Sword Mastery", expected: 70 }],
  mercedes: [{ id: "23120009", name: "Dual Bowguns Expert", expected: 70 }],
  aran: [{ id: "21120001", name: "High Mastery", expected: 70 }],
  phantom: [{ id: "24120006", name: "Cane Expert", expected: 70 }],
  luminous: [{ id: "27120007", name: "Magic Mastery", expected: 70 }],
  evan: [{ id: "22170071", name: "Magic Mastery", expected: 70 }],
  shade: [{ id: "25120113", name: "Advanced Knuckle Mastery", expected: 70 }],
  battle_mage: [{ id: "32120016", name: "Staff Expert", expected: 70 }],
  blaster: [{ id: "37120010", name: "Gauntlet Expert", expected: 70 }],
  mechanic: [{ id: "35120000", name: "Extreme Mech", expected: 70 }],
  wild_hunter: [{ id: "33120010", name: "Crossbow Expert", expected: 70 }],
  xenon: [{ id: "36120006", name: "Xenon Expert", expected: 70 }],
  demon_slayer: [{ id: "31120008", name: "Barricade Mastery", expected: 70 }],
  demon_avenger: [{ id: "31220006", name: "Advanced Desperado Mastery", expected: 70 }],
  kaiser: [{ id: "61120012", name: "Expert Sword Mastery", expected: 70 }],
  cadena: [{ id: "64120008", name: "Weapons Expert", expected: 70 }],
  kain: [{ id: "63120013", name: "Whispershot Mastery", expected: 70 }],
  kanna: [{ id: "42120019", name: "Kasen", expected: 70 }],
  hayato: [{ id: "40010000", name: "Natural Talent", expected: 80, job4: false }], // Beginner Skill
  adele: [{ id: "151120007", name: "Bladecaster Expertise", expected: 70 }],
  ark: [{ id: "155120010", name: "Knuckle Expert", expected: 70 }],
  illium: [{ id: "152120015", name: "Wisdom of the Crystal", expected: 70, job4: false }], // no DCO/CO note per wiki, single unambiguous page confirming maxLevel 30
  khali: [{ id: "154120007", name: "Chakram Expert", expected: 70 }],
  hoyoung: [{ id: "164120010", name: "Advanced Ritual Fan Mastery", expected: 70 }],
  lara: [{ id: "162120025", name: "Advanced Wand Mastery", expected: 70 }],
  ren: [{ id: "161120011", name: "Exquisite Sword Mastery", expected: 70 }],
  lynn: [{ id: "172120000", name: "Forest Power IV", expected: 70 }],
  mo_xuan: [{ id: "175120014", name: "Boundless", expected: 70 }],
  sia_astelle: [{ id: "182120002", name: "Astral Assimilation", expected: 70 }],
  erel_light: [{ id: "181120008", name: "Gram Expert", expected: 70 }],
  kinesis: [{ id: "142120013", name: "Mastery", expected: 70 }],
  zero: [{ id: "101000203", name: "Long Sword Mastery", expected: 70, job4: false }], // Lv. 100 unlock, not job-tiered
  angelic_buster: [
    { id: "60010217", name: "True Heart Inheritance", expected: 10, job4: false }, // Beginner Skill
    { id: "65120005", name: "Soul Shooter Expert", expected: 70 },
  ],
  arch_mage_f_p: [{ id: "2121005", name: "Ifrit", expected: 70 }],
  arch_mage_i_l: [{ id: "2221005", name: "Elquines", expected: 70 }],
};

// ---------------------------------------------------------------------------------------------
// Inherent per-class base Mastery% (not skill-derived — no formula for this exists anywhere in
// skill-formulas.json, sourced from Grandis Library + live-character verification instead, see
// MASTERY_DATA.md's "Base%" column). Every class defaults to a "beginner equivalent" base of 20%
// per strategywiki (some classes differ — see values below), and the combined total is capped at
// 99% game-wide ("Mastery is capped at 99%", strategywiki Formulas page) — that cap, not a
// nonstandard base, is why Hayato (20 base + 80 from Natural Talent = 100) reads 99% in-game. See
// MASTERY_CAP below.
// ---------------------------------------------------------------------------------------------
const MASTERY_BASE_PERCENT = {
  hero: 20,
  paladin: 20,
  dark_knight: 20,
  bishop: 25,
  blade_master: 20,
  shadower: 20,
  night_lord: 15,
  pathfinder: 15,
  marksman: 15,
  bow_master: 15,
  cannoneer: 15,
  buccaneer: 20,
  corsair: 15,
  dawn_warrior: 20,
  thunder_breaker: 20,
  night_walker: 15,
  wind_archer: 15,
  blaze_wizard: 25,
  mihile: 20,
  mercedes: 15,
  aran: 20,
  phantom: 20,
  luminous: 25,
  evan: 25,
  shade: 20,
  battle_mage: 25,
  blaster: 20,
  mechanic: 15,
  wild_hunter: 15,
  xenon: 20,
  demon_slayer: 20,
  demon_avenger: 20,
  kaiser: 20,
  cadena: 20,
  kain: 15,
  kanna: 25,
  hayato: 20,
  adele: 20,
  ark: 20,
  illium: 20,
  khali: 20,
  hoyoung: 20,
  lara: 25,
  ren: 20,
  lynn: 25,
  mo_xuan: 20,
  sia_astelle: 25,
  erel_light: 20,
  kinesis: 20,
  zero: 20,
  angelic_buster: 15,
  arch_mage_f_p: 25,
  arch_mage_i_l: 25,
};

// Note: Dual Blade's Shadow Meld (id 4330009, in FINAL_DAMAGE_RECIPES.blade_master) has no tooltip
// "[Passive Effect]" marker, so the manifest conservatively marks its stat alwaysOn:false — but it
// IS a real always-on source (see FINAL_DAMAGE_DATA.md "WZ skill-id pins"). resolvePinned() below
// doesn't check alwaysOn at all: inclusion is already decided by a skill's presence in a recipe, so
// no override list is needed here.

// ---------------------------------------------------------------------------------------------
// Damage Range's "Current Applied Weapon Constant" — not skill-formula data, sourced+verified from
// maplestorywiki.net/w/Damage_Formula (class-keyed table, cross-checked against strategywiki's
// generic weapon-type table and confirmed exact against real characters — including one real
// correction: Xenon's own in-game tooltip displays 1.50, which is WRONG; the real value used in
// the actual damage calc is 1.3125, confirmed by computing Damage Range both ways against a real
// Xenon screenshot and matching the in-game total exactly only with 1.3125). Hero/Paladin/Dawn
// Warrior split by weaponHand (already collected — see StatsSetupStep.tsx's weaponType option).
// Zero's two transformation forms (Alpha 1.34 / Beta 1.49) have different multipliers, but setup
// already requires "Must be in Beta status" (classSkillData.ts warning) for stat capture, so Beta's
// 1.49 is the only value that's ever consistent with already-collected Zero data.
// ---------------------------------------------------------------------------------------------
const WEAPON_MULTIPLIER = {
  night_lord: 1.75, night_walker: 1.75, mo_xuan: 1.75,
  buccaneer: 1.7, thunder_breaker: 1.7, shade: 1.7, blaster: 1.7, angelic_buster: 1.7, ark: 1.7,
  corsair: 1.5, cannoneer: 1.5, mechanic: 1.5,
  dark_knight: 1.49, aran: 1.49, zero: 1.49, // Beta, see comment above
  marksman: 1.35, wild_hunter: 1.35, kanna: 1.35,
  kaiser: 1.34, lynn: 1.34,
  xenon: 1.3125,
  bow_master: 1.3, pathfinder: 1.3, shadower: 1.3, blade_master: 1.3, wind_archer: 1.3,
  mercedes: 1.3, phantom: 1.3, demon_avenger: 1.3, kain: 1.3, cadena: 1.3, adele: 1.3,
  khali: 1.3, ren: 1.3, hoyoung: 1.3,
  hayato: 1.25,
  mihile: 1.24,
  arch_mage_f_p: 1.2, arch_mage_i_l: 1.2, bishop: 1.2, blaze_wizard: 1.2, illium: 1.2,
  kinesis: 1.2, evan: 1.2, luminous: 1.2, battle_mage: 1.2, sia_astelle: 1.2, erel_light: 1.2,
  lara: 1.2, demon_slayer: 1.2,
  // hero, paladin, dawn_warrior omitted here — see WEAPON_MULTIPLIER_BY_HAND below.
};

/** Hero/Paladin/Dawn Warrior: multiplier depends on weaponHand (already collected per-character). */
const WEAPON_MULTIPLIER_BY_HAND = {
  hero: { "1h": 1.34, "2h": 1.44 },
  paladin: { "1h": 1.24, "2h": 1.34 },
  dawn_warrior: { "1h": 1.24, "2h": 1.34 },
};

// Which stat feeds TotalJobATT in the Damage Range formula — Magicians use Magic ATT, everyone
// else (including Xenon and Demon Avenger) uses Attack Power. Mirrors classSkillData.ts's own
// requiredStats magicAtt list; kept as an explicit table here rather than importing that TS file
// (this script only reads JSON, matching every other gen-*.mjs script's convention).
const MAGIC_ATT_CLASSES = new Set([
  "lara", "blaze_wizard", "arch_mage_f_p", "arch_mage_i_l", "bishop", "illium", "kinesis",
  "evan", "luminous", "lynn", "battle_mage", "kanna", "sia_astelle", "erel_light",
]);

// ---------------------------------------------------------------------------------------------
// Generate — 3 tiers per class: [0]=pure base (no Combat-Orders-family buff, drift-guarded via
// resolvePinned), [1]=+1 skill level (Decent Combat Orders alone, OR Passive Skills+1 IA alone —
// confirmed interchangeable when used singly), [2]=+2 skill levels (both stacked, OR the single
// higher-tier "Combat Orders" buff alone — same numeric effect either way). Character Info setup
// always assumes at least tier 1, since (Decent) Combat Orders sits in every class's buff guide —
// see resolveComboOrdersTier in comboOrdersData.ts for how a character's actual tier is picked.
// ---------------------------------------------------------------------------------------------
const MASTERY_CAP = 99; // "Mastery is capped at 99%" — strategywiki Formulas page, game-wide rule.

const finalDamageOut = {};
for (const [classId, recipe] of Object.entries(FINAL_DAMAGE_RECIPES)) {
  const tiers = [0, 1, 2].map((tier) => {
    let product = 1;
    for (const pin of recipe) {
      // resolvePinned still runs at tier 0 for every pin, for its drift guard — the returned
      // value is discarded for tier>0 in favor of resolvePinnedAtLevel's own (unguarded) result.
      resolvePinned(classId, "final damage", pin);
      const value = resolvePinnedAtLevel(pin, "final damage", tier);
      product *= 1 + value / 100;
    }
    // No rounding here — Final Damage compounds multiplicatively and then feeds Genesis Liberation's
    // own ×1.1 (finalDamageData.ts) and the Damage Range formula's ×(1+FD/100) term (damageRangeData.ts),
    // both of which amplify a rounded-to-2-decimals input into a visibly wrong Damage Range (confirmed
    // 2026-07-18 on Ren: rounding tier1 to 70.64 instead of the raw 70.64085500000006 undershot her real
    // Damage Range upper value by 833). Round only at the UI display layer (finalDamageDisplay's
    // `.toFixed(2)`), never in stored/computed values.
    return recipe.length === 0 ? 0 : (product - 1) * 100;
  });
  finalDamageOut[classId] = tiers;
}

const masteryOut = {};
for (const [classId, recipe] of Object.entries(MASTERY_SKILL_RECIPES)) {
  const base = MASTERY_BASE_PERCENT[classId];
  if (base === undefined) {
    throw new Error(`[gen-stat-baselines] ${classId}: no MASTERY_BASE_PERCENT entry.`);
  }
  const tiers = [0, 1, 2].map((tier) => {
    let skillSum = 0;
    for (const pin of recipe) {
      resolvePinned(classId, "mastery", pin); // drift guard, see comment above
      skillSum += resolvePinnedAtLevel(pin, "mastery", tier);
    }
    return Math.min(base + skillSum, MASTERY_CAP);
  });
  masteryOut[classId] = tiers;
}

function writeTieredGenerated(fileName, exportName, comment, data) {
  const lines = [
    `// AUTO-GENERATED by scripts/gen-stat-baselines.mjs — do not edit.`,
    `// ${comment}`,
    `// [tier0, tier1, tier2] — see resolveComboOrdersTier in comboOrdersData.ts.`,
    `export const ${exportName}: Record<string, [number, number, number]> = {`,
    ...Object.entries(data).map(([id, tiers]) => `  ${id}: [${tiers.join(", ")}],`),
    `};`,
    "",
  ];
  fs.writeFileSync(path.join(DATA_DIR, fileName), lines.join("\n"));
  console.log(`Wrote ${fileName} (${Object.keys(data).length} classes)`);
}

writeTieredGenerated(
  "masteryData.generated.ts",
  "BASE_MASTERY_PERCENT",
  "Weapon Mastery% per class (v269), level-30 base plus Combat-Orders-family tiers.",
  masteryOut,
);
writeTieredGenerated(
  "finalDamageData.generated.ts",
  "BASE_FINAL_DAMAGE_PERCENT",
  "Always-on Final Damage% per class (v269), before Genesis Liberation, level-30 base plus Combat-Orders-family tiers.",
  finalDamageOut,
);

// Not manifest-derived (no formula source exists for weapon constants), so this doesn't go through
// resolvePinned()'s drift check — it's static reference data, same trust level as MASTERY_BASE_PERCENT.
{
  const lines = [
    `// AUTO-GENERATED by scripts/gen-stat-baselines.mjs — do not edit.`,
    `// Damage Range's "Current Applied Weapon Constant" per class, and which stat (Attack Power vs`,
    `// Magic ATT) feeds TotalJobATT. Sourced from maplestorywiki.net/w/Damage_Formula, cross-checked`,
    `// against strategywiki and real characters — not derived from the skill manifest (no formula`,
    `// source exists for this). See gen-stat-baselines.mjs for the Xenon correction and other notes.`,
    `export const WEAPON_MULTIPLIER: Record<string, number> = {`,
    ...Object.entries(WEAPON_MULTIPLIER).map(([id, value]) => `  ${id}: ${value},`),
    `};`,
    ``,
    `export const WEAPON_MULTIPLIER_BY_HAND: Record<string, { "1h": number; "2h": number }> = {`,
    ...Object.entries(WEAPON_MULTIPLIER_BY_HAND).map(([id, v]) => `  ${id}: { "1h": ${v["1h"]}, "2h": ${v["2h"]} },`),
    `};`,
    ``,
    `export const MAGIC_ATT_CLASSES: readonly string[] = [`,
    ...[...MAGIC_ATT_CLASSES].map((id) => `  "${id}",`),
    `];`,
    "",
  ];
  fs.writeFileSync(path.join(DATA_DIR, "damageRangeData.generated.ts"), lines.join("\n"));
  console.log(
    `Wrote damageRangeData.generated.ts (${Object.keys(WEAPON_MULTIPLIER).length + Object.keys(WEAPON_MULTIPLIER_BY_HAND).length} classes)`,
  );
}

#!/usr/bin/env node
/**
 * Generates per-class V Matrix node catalogs by scraping grandislibrary.com.
 * Output: public/data/vmatrix/<classId>.json
 *   { job: Node[], boost: Node[], common: Node[] }  where Node = [skillId|null, displayName].
 *   skillId is a manifests/v269/skill.json id used for the haku.network skill icon (null only
 *   when unresolved — the UI shows a placeholder tile; names always render).
 *
 * Data source: each class page embeds a Next.js __NEXT_DATA__ blob with post.skill.fifth:
 *   - fifthMain  → Job Nodes   (the class's 5th-job V skills; max level 30)
 *   - fifthBoost → Boost Nodes (boostable sub-5th-job skills; max level 60). v269 fuses some
 *       into shared tiles in-game; rendered flat here (pairing is client/WZ-only).
 *   - fifthCommon → branch/faction common V skills (string keys, resolved via COMMON_KEYS).
 * Universal common nodes (Erda Nova, Decents, …) are the same for every class and appended
 * from UNIVERSAL_COMMON.
 *
 * Icon resolution (per the image policy, art comes from haku.network by skill id):
 *   1. PIXEL MATCH (primary, for job + boost) — grandislibrary serves the same WZ icon art as
 *      the local skill dump, so each node's gl icon is downloaded and hash-matched against the
 *      dump's per-id icon.png. This is name-agnostic, so it fixes both unmatched boost names
 *      and wrong-stage matches (e.g. "Essence Sprinkle Boost" → 162121021, not the base id).
 *   2. NAME MATCH (fallback, and primary for common nodes which are key-based with no gl icon)
 *      — resolves the display name against skill.json, via NAME_OVERRIDES then normalized name.
 *   Pixel matching needs the skill dump (default E:/mapledoro-image/output/skill); without it,
 *   the script falls back to name matching only.
 *
 * Usage:  node scripts/gen-vmatrix.mjs [skill.json] [dumpSkillDir]
 *   (network: fetches 53 class pages + each job/boost icon from grandislibrary.com, cached)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";
import { tmpdir } from "os";
import { createHash } from "crypto";
import sharp from "sharp";

const skillManifestPath = process.argv[2] ?? "manifests/v269/skill.json";
const DUMP_SKILL_DIR = process.argv[3] ?? "E:/mapledoro-image/output/skill";
const OUTPUT_DIR = resolve("public/data/vmatrix");
const GL = "https://grandislibrary.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── Name → id resolver (skill.json) ──────────────────────────────────────────
const skillEntries = JSON.parse(readFileSync(resolve(skillManifestPath), "utf8")).entries;
const idByNormName = new Map();
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
for (const [id, e] of Object.entries(skillEntries)) {
  if (e.name) { const k = norm(e.name); if (!idByNormName.has(k)) idByNormName.set(k, id); }
}

// Manual name overrides for skills that don't match skill.json (decents reuse a base icon,
// grandislibrary abbreviations, or true manifest gaps pinned from the .wz). gl name → skill id.
const NAME_OVERRIDES = {
  "Decent Holy Fountain": "2311011", // no own entry; decents reuse the base skill icon (Holy Fountain)
};

const nameId = (name) => NAME_OVERRIDES[name] ?? idByNormName.get(norm(name)) ?? null;

// Boost skills appear in skill.json under the full "X Boost" name; fall back through the base
// skill and compound-name forms for boosts that have no single combined entry.
function boostNameId(boostName) {
  const base = boostName.replace(/\s*Boost$/i, "").trim();
  const variants = [
    boostName, base,
    boostName.replace(/^\[[^\]]+\]\s*/, ""), base.replace(/^\[[^\]]+\]\s*/, ""),
    base.split(/\s*\/\s*|\s+and\s+|\s*&\s*|,\s*/i)[0] + " Boost",
    base.split(/\s*\/\s*|\s+and\s+|\s*&\s*|,\s*/i)[0],
  ];
  for (const v of variants) { const id = nameId(v); if (id) return id; }
  return null;
}

// ── Pixel matcher (primary) ──────────────────────────────────────────────────
async function hashImg(input) {
  const buf = await sharp(input).resize(32, 32, { fit: "fill" }).ensureAlpha().raw().toBuffer();
  return createHash("md5").update(buf).digest("hex");
}

async function buildPixelIndex(dir) {
  if (!existsSync(dir)) {
    console.warn(`! skill dump not found at ${dir} — falling back to name matching only`);
    return null;
  }
  const index = new Map(); // pixel hash → skill id (first id wins; identical art renders the same)
  for (const id of readdirSync(dir)) {
    try { const h = await hashImg(`${dir}/${id}/icon.png`); if (!index.has(h)) index.set(h, id); }
    catch { /* no icon.png */ }
  }
  console.log(`pixel index: ${index.size} icons from ${dir}`);
  return index;
}

const ICON_CACHE = join(tmpdir(), "mapledoro-vmatrix-icons");
mkdirSync(ICON_CACHE, { recursive: true });

async function fetchIcon(iconPath) {
  const cacheFile = join(ICON_CACHE, iconPath.replace(/[^a-z0-9]/gi, "_"));
  if (existsSync(cacheFile)) return readFileSync(cacheFile);
  const res = await fetch(GL + iconPath, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] !== 0x89) return null; // not a PNG (e.g. 404 HTML)
  writeFileSync(cacheFile, buf);
  return buf;
}

const pixelIndex = await buildPixelIndex(DUMP_SKILL_DIR);

async function pixelId(iconPath) {
  if (!pixelIndex || !iconPath) return null;
  try {
    const buf = await fetchIcon(iconPath);
    if (!buf) return null;
    return pixelIndex.get(await hashImg(buf)) ?? null;
  } catch { return null; }
}

// ── Class list + slug→id (irregular cases only) ──────────────────────────────
const SLUG_TO_ID = {
  bowmaster: "bow_master",
  "dual-blade": "blade_master",
  "arch-mage-fire-poison": "arch_mage_f_p",
  "arch-mage-ice-lightning": "arch_mage_i_l",
};
const slugToId = (slug) => SLUG_TO_ID[slug] ?? slug.replace(/-/g, "_");

const CLASS_PAGES = `anima/hoyoung anima/lara anima/ren cygnus-knights/blaze-wizard cygnus-knights/dawn-warrior
cygnus-knights/mihile cygnus-knights/night-walker cygnus-knights/thunder-breaker cygnus-knights/wind-archer
explorers/arch-mage-fire-poison explorers/arch-mage-ice-lightning explorers/bishop explorers/bowmaster
explorers/buccaneer explorers/cannoneer explorers/corsair explorers/dark-knight explorers/dual-blade
explorers/hero explorers/marksman explorers/night-lord explorers/paladin explorers/pathfinder explorers/shadower
flora/adele flora/ark flora/illium flora/khali heroes/aran heroes/evan heroes/luminous heroes/mercedes
heroes/phantom heroes/shade jianghu/lynn jianghu/mo-xuan nova/angelic-buster nova/cadena nova/kain nova/kaiser
other/kinesis other/zero resistance/battle-mage resistance/blaster resistance/demon-avenger resistance/demon-slayer
resistance/mechanic resistance/wild-hunter resistance/xenon sengoku/hayato sengoku/kanna shine/erel-light
shine/sia-astelle`.split(/\s+/).filter(Boolean);

// fifthCommon key → skill name (resolved against the 400001xxx common-V block). expWarrior/etc
// is an Explorer-only, branch-keyed node indistinguishable from goddessBlessing here; skipped.
const COMMON_KEYS = {
  afterimageOfTheOtherworld: "Afterimage of the Otherworld", conversionOverdrive: "Conversion Overdrive",
  cygnusBlessing: "Empress Cygnus's Blessing", defenderOfTheDemon: "Defender of the Demon",
  etherealForm: "Ethereal Form", freudsWisdom: "Freud's Wisdom", goddessBlessing: "Maple World Goddess's Blessing",
  guidedArrow: "Guided Arrow", impenetrableSkin: "Impenetrable Skin", lastResort: "Last Resort",
  loadedDice: "Loaded Dice", lotusFlower: "Lotus Flower", manaOverload: "Mana Overload",
  mightOfTheNova: "Might of the Nova", otherworldGoddessBlessing: "Otherworld Goddess's Blessing",
  overdrive: "Overdrive", phalanxCharge: "Phalanx Charge", powerOfDestiny: "Power of Destiny",
  princessSakunoBlessing: "Princess Sakuno's Blessing", resistanceInfantry: "Resistance Infantry",
  ringOfSamsara: "Ring of Samsara", transcendent: "Transcendent",
  transcendentRhinnePrayer: "Transcendent Rhinne's Prayer", treeOfStars: "Tree of Stars",
  twilightBloom: "Twilight Bloom", venomBurst: "Venom Burst", viciousShot: "Vicious Shot",
  weaponAura: "Weapon Aura",
  grandisGoddessBlessingFL: "Grandis Goddess's Blessing", grandisGoddessBlessingHY: "Grandis Goddess's Blessing",
  grandisGoddessBlessingKAI: "Grandis Goddess's Blessing", grandisGoddessBlessingLARA: "Grandis Goddess's Blessing",
  grandisGoddessBlessingLEN: "Grandis Goddess's Blessing", grandisGoddessBlessingNV: "Grandis Goddess's Blessing",
};

const UNIVERSAL_COMMON = [
  "Erda Nova", "Will of Erda", "Erda Shower", "Rope Lift", "Blink",
  "Decent Holy Symbol", "Decent Holy Fountain", "Decent Speed Infusion",
  "Decent Advanced Blessing", "Decent Combat Orders", "Decent Hyper Body",
  "Decent Sharp Eyes", "Decent Mystic Door", "True Arachnid Reflection", "Solar Crest",
];

function extractPost(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no __NEXT_DATA__");
  return JSON.parse(m[1]).props.pageProps.post;
}

const unresolved = new Set();
// Common nodes are key/name-based (no gl icon to pixel-match).
const universalNodes = UNIVERSAL_COMMON.map((name) => {
  const id = nameId(name); if (!id) unresolved.add(name); return [id, name];
});

mkdirSync(OUTPUT_DIR, { recursive: true });

let ok = 0;
const failures = [];

for (const page of CLASS_PAGES) {
  const slug = page.split("/")[1];
  const classId = slugToId(slug);
  try {
    const res = await fetch(GL + "/" + page, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const fifth = extractPost(await res.text()).skill?.fifth;
    if (!fifth) throw new Error("no skill.fifth");

    // job + boost: pixel-match by gl icon first, then name.
    const job = [];
    for (const s of (fifth.fifthMain || []).filter((x) => x?.name)) {
      const id = (await pixelId(s.icons?.[0])) ?? nameId(s.name);
      if (!id) unresolved.add(s.name);
      job.push([id, s.name]);
    }
    const boost = [];
    for (const s of (fifth.fifthBoost || []).filter((x) => x?.name)) {
      const id = (await pixelId(s.icons?.[0])) ?? boostNameId(s.name);
      if (!id) unresolved.add(s.name);
      boost.push([id, s.name]);
    }
    // common: branch (keys) + universal, name-resolved.
    const branchCommon = (fifth.fifthCommon || []).map((k) => COMMON_KEYS[k]).filter(Boolean)
      .map((name) => { const id = nameId(name); if (!id) unresolved.add(name); return [id, name]; });
    const common = [...branchCommon, ...universalNodes];

    writeFileSync(resolve(OUTPUT_DIR, `${classId}.json`), JSON.stringify({ job, boost, common }));
    console.log(`${classId.padEnd(18)} job=${job.length} boost=${boost.length} common=${common.length}`);
    ok++;
  } catch (e) {
    failures.push(`${classId} (${page}): ${e.message}`);
  }
}

console.log(`\n${ok}/${CLASS_PAGES.length} classes written → ${OUTPUT_DIR}`);
if (failures.length) console.log("FAILURES:\n  " + failures.join("\n  "));
if (unresolved.size) console.log(`UNRESOLVED icons (${unresolved.size}):\n  ` + [...unresolved].sort().join("\n  "));

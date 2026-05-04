// One-shot scraper for MapleStory class skill data from maplestorywiki.net.
// Run: node scripts/scrape-class-skills.mjs
// Writes one file per class under src/app/guides/character-guides/classSkills/,
// plus a shared types/loader module that bundlers code-split per class.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "src/app/guides/character-guides/classSkills");
const CACHE_DIR = path.join(ROOT, ".cache/wiki-skills");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Class list copied from classData.ts RAW_CLASSES (names only).
const CLASS_NAMES = [
  "Hero", "Paladin", "Dark Knight",
  "Arch Mage (Fire/Poison)", "Arch Mage (Ice/Lightning)", "Bishop",
  "Bow Master", "Marksman", "Pathfinder",
  "Night Lord", "Shadower", "Dual Blade",
  "Corsair", "Cannoneer", "Buccaneer",
  "Dawn Warrior", "Blaze Wizard", "Wind Archer", "Night Walker", "Thunder Breaker", "Mihile",
  "Aran", "Evan", "Mercedes", "Phantom", "Luminous", "Shade",
  "Battle Mage", "Wild Hunter", "Mechanic", "Blaster", "Xenon",
  "Demon Slayer", "Demon Avenger",
  "Kaiser", "Angelic Buster", "Cadena", "Kain",
  "Illium", "Ark", "Adele", "Khali",
  "Hoyoung", "Lara", "Ren",
  "Zero", "Kinesis",
  "Hayato", "Kanna",
  "Lynn", "Mo Xuan",
  "Sia Astelle",
];

/** Convert "Arch Mage (Fire/Poison)" → "Arch_Mage_(Fire,_Poison)" for the wiki URL. */
function wikiSlug(name) {
  return name.replace(/\//g, ", ").replace(/ /g, "_");
}

/** Decode MediaWiki section IDs like "Crusader.27s_Guide" → "Crusader's Guide". */
function decodeSectionId(id) {
  const withPct = id.replace(/\.([0-9A-F]{2})/g, "%$1");
  try {
    return decodeURIComponent(withPct).replace(/_/g, " ");
  } catch {
    return id.replace(/_/g, " ");
  }
}

function stripTags(s) {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(td|th|tr|p|div|li)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fetchPage(name) {
  const slug = wikiSlug(name);
  const url = `https://maplestorywiki.net/w/${encodeURI(slug)}/Skills`;
  const cacheFile = path.join(CACHE_DIR, `${slug}.html`);

  try {
    const cached = await fs.readFile(cacheFile, "utf8");
    if (cached.length > 1000) return cached;
  } catch {
    // miss
  }

  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) {
    throw new Error(`${r.status} ${r.statusText} for ${url}`);
  }
  const html = await r.text();
  await ensureDir(CACHE_DIR);
  await fs.writeFile(cacheFile, html, "utf8");
  return html;
}

/**
 * Walk through the HTML in document order, finding <h2>/<h3> headers and
 * <table class="wikitable"> blocks. Each skill is a wikitable that contains
 * a Skill_<name>.png icon and a skill-name anchor.
 */
function parseSkills(html) {
  // Isolate main content (skip nav/footer). Best-effort: start at firstHeading.
  const startIdx = html.indexOf("mw-content-text");
  const content = startIdx > 0 ? html.slice(startIdx) : html;

  const skills = [];
  let currentSection = "Unknown";
  let currentJob = "Unknown";
  let currentJobTier = 1;

  // Matches either (A) headings h2/h3 with an id, OR (B) wikitable opening through its closing </table>.
  // V Skills / HEXA Skills tables use class="wikitable mw-collapsible ..." so allow extra classes.
  const re =
    /<h([23])[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>|<table class="wikitable[^"]*"[\s\S]*?<\/table>/g;

  let m;
  while ((m = re.exec(content)) !== null) {
    if (m[1]) {
      // heading
      const level = m[1];
      const id = m[2];
      const inner = m[3];
      const decoded = decodeSectionId(id);
      if (level === "2") {
        currentJob = decoded;
        currentSection = decoded;
        currentJobTier = tierFromHeading(inner, currentJobTier);
      } else {
        // h3 refines within an h2 section (e.g. "Passive Skill Boost" inside "Hyper Skills").
        currentSection = decoded;
      }
      continue;
    }

    const tbl = m[0];
    const skill = parseSkillTable(tbl, currentSection, currentJob, currentJobTier);
    if (skill) skills.push(skill);
  }

  // Dedupe: same skill may appear under multiple tabbers/sections.
  const seen = new Map();
  for (const s of skills) {
    const key = `${s.name}|${s.icon}`;
    if (!seen.has(key)) seen.set(key, s);
  }
  return [...seen.values()];
}

/**
 * Infer job tier (1–6) from an h2's inner HTML. The wiki marks each h2 with an
 * icon like Skill_1st_Job.png .. Skill_6th_Job.png. Beginner (0th) folds into
 * 1st, and Hyper Skills fold into 4th — the character guide only exposes 6 tabs.
 */
function tierFromHeading(inner, fallback) {
  const nth = inner.match(/Skill_(\d)(?:st|nd|rd|th)_Job\.png/i);
  if (nth) {
    const n = Number(nth[1]);
    if (n === 0) return 1; // beginner → 1st
    if (n >= 1 && n <= 6) return n;
  }
  if (/Skill_Hyper\.png/i.test(inner)) return 4;
  return fallback;
}

function parseSkillTable(tbl, section, job, jobTier) {
  const iconMatch = tbl.match(
    /<img[^>]+src="(https:\/\/media\.maplestorywiki\.net\/yetidb\/Skill_[^"]+\.png)"/,
  );
  if (!iconMatch) return null;
  const icon = iconMatch[1];

  // Skill name — first anchor near the icon. Tables vary: sometimes <a> wraps the <img>
  // and the name is a sibling anchor. Find all <a href="/w/..." title="..."> in the table
  // and pick the first whose title is not a File: link.
  const anchorRe = /<a\s+href="\/w\/([^"#?]+)"[^>]*(?:title="([^"]+)")?[^>]*>([^<]+)<\/a>/g;
  let name = null;
  let anchor;
  while ((anchor = anchorRe.exec(tbl)) !== null) {
    const href = anchor[1];
    const title = anchor[2] || "";
    const text = stripTags(anchor[3]);
    if (href.startsWith("File:") || title.startsWith("File:")) continue;
    if (!text) continue;
    name = text;
    break;
  }
  if (!name) return null;

  // Category (first <th> of the table). Expected: Active, Passive, Supportive, Toggle, etc.
  let category = "";
  const firstThMatch = tbl.match(/<th[^>]*>([\s\S]*?)<\/th>/);
  if (firstThMatch) {
    const txt = stripTags(firstThMatch[1]);
    if (txt && txt.length < 30 && !/^\d+$/.test(txt)) category = txt;
  }

  // Master Level
  let masterLevel;
  const mlMatch = tbl.match(
    /<th[^>]*>\s*Master Level[\s\S]*?<\/th>\s*<td[^>]*>\s*(\d+)/i,
  );
  if (mlMatch) masterLevel = Number(mlMatch[1]);

  // Pre-Requisite
  let prerequisite;
  const preMatch = tbl.match(
    /<th[^>]*>\s*Pre-?Requisite[\s\S]*?<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i,
  );
  if (preMatch) {
    const t = stripTags(preMatch[1]);
    if (t) prerequisite = t;
  }

  // Description
  let description = "";
  const descMatch = tbl.match(
    /<th[^>]*>\s*Description[\s\S]*?<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i,
  );
  if (descMatch) description = stripTags(descMatch[1]);

  // Levels — rows where a <th> cell is a pure number followed by a <td> effect.
  const levels = [];
  const lvlRe = /<th[^>]*>\s*(\d+)\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/g;
  let lm;
  while ((lm = lvlRe.exec(tbl)) !== null) {
    const lvl = Number(lm[1]);
    if (!Number.isFinite(lvl) || lvl <= 0 || lvl > 60) continue;
    const effect = stripTags(lm[2]);
    if (!effect) continue;
    levels.push({ level: lvl, effect });
  }

  return {
    name,
    icon,
    category: category || undefined,
    section,
    job,
    jobTier,
    masterLevel,
    prerequisite,
    description: description || undefined,
    levels: levels.length ? levels : undefined,
  };
}

/** Mirror of classSlug() from src/app/guides/character-guides/classData.ts. */
function classSlug(name) {
  return name
    .toLowerCase()
    .replace(/[()/]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toClassFileTs(entry) {
  const skillLines = entry.skills
    .map((s) => "  " + JSON.stringify(s))
    .join(",\n");
  return `/* Auto-generated by scripts/scrape-class-skills.mjs. Do not edit by hand. */
import type { ClassSkillSet } from "./types";

const data: ClassSkillSet = {
  className: ${JSON.stringify(entry.className)},
  skills: [
${skillLines}
  ],
};

export default data;
`;
}

function toTypesTs(classEntries) {
  const loaderLines = classEntries
    .map(
      (c) =>
        `  ${JSON.stringify(c.className)}: () => import("./${classSlug(c.className)}").then((m) => m.default),`,
    )
    .join("\n");

  return `/*
  Shared types for class skill data plus a per-class dynamic-import loader.
  Each class's data lives in its own file so the bundler code-splits by class —
  visiting /guides/character-guides/hero loads only hero.ts, not all 52 classes.

  Auto-generated by scripts/scrape-class-skills.mjs. Do not edit by hand.
*/

export interface ClassSkillLevel {
  level: number;
  effect: string;
}

/**
 * Numeric job tier, derived from the wiki heading icon:
 *   1 — 1st Job (beginner skills fold in here)
 *   2 — 2nd Job
 *   3 — 3rd Job
 *   4 — 4th Job (Hyper Skills fold in here)
 *   5 — 5th Job / V Skills
 *   6 — 6th Job / HEXA Skills
 */
export type JobTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface ClassSkill {
  name: string;
  icon: string;
  category?: string;
  section: string;
  job: string;
  jobTier: JobTier;
  masterLevel?: number;
  prerequisite?: string;
  description?: string;
  levels?: ClassSkillLevel[];
}

export interface ClassSkillSet {
  className: string;
  skills: ClassSkill[];
}

const LOADERS: Record<string, () => Promise<ClassSkillSet>> = {
${loaderLines}
};

const cache = new Map<string, Promise<ClassSkillSet | undefined>>();

export function loadClassSkills(className: string): Promise<ClassSkillSet | undefined> {
  if (!cache.has(className)) {
    const loader = LOADERS[className];
    cache.set(className, loader ? loader() : Promise.resolve(undefined));
  }
  return cache.get(className)!;
}
`;
}

async function main() {
  const results = [];
  for (const name of CLASS_NAMES) {
    try {
      const html = await fetchPage(name);
      const skills = parseSkills(html);
      results.push({ className: name, skills });
      console.log(`${name.padEnd(30)} ${String(skills.length).padStart(3)} skills`);
    } catch (err) {
      console.error(`FAIL ${name}: ${err.message}`);
      results.push({ className: name, skills: [] });
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  await ensureDir(OUT_DIR);
  for (const entry of results) {
    const slug = classSlug(entry.className);
    const file = path.join(OUT_DIR, `${slug}.ts`);
    await fs.writeFile(file, toClassFileTs(entry), "utf8");
  }
  await fs.writeFile(path.join(OUT_DIR, "types.ts"), toTypesTs(results), "utf8");

  const totalSkills = results.reduce((acc, c) => acc + c.skills.length, 0);
  console.log(`\nWrote ${results.length} class files + types.ts to ${OUT_DIR}`);
  console.log(`${results.length} classes, ${totalSkills} skills total`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

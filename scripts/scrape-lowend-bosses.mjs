// Boss Clear entries for the bosses below Lotus/Damien that MapleScouter has no cut for (Zakum
// through Akechi), estimated from boss HP.
// Run: node scripts/scrape-lowend-bosses.mjs
// Writes src/features/characters/scouter/lowend-boss-data.generated.ts
//
// MapleScouter pins every boss below Seren at the 40600 cut and puts the difficulty in easyRate,
// and within one boss HP x easyRate is constant to a few digits (Damien, Slime, Will, Gloom,
// Verus Hilla): easyRate there is "reference HP / this boss's HP". What differs between bosses is
// a measured per-boss factor (mechanics, uptime), about 0.5-1.1x across the older 300% defense
// bosses. So the reference constant here is the median of HP x easyRate x (30 min / time limit)
// over those bosses, and a new boss gets easyRate = 0.969 x reference x (time limit / 30 min) / HP.
// Expect roughly +-40% against a real measured cut; for these bosses that only matters to very weak
// characters.
//
// Boss stats come from the MapleStory Wiki's page source (`?action=raw`, which isn't behind the
// Cloudflare challenge the rendered pages are), fetched a few seconds apart. Re-run after a patch
// that changes boss HP, or after scrape-bosscut.mjs changes the reference bosses' easyRates.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "src/features/characters/scouter/lowend-boss-data.generated.ts");
const BOSSCUT_FILE = path.join(ROOT, "src/features/characters/scouter/bosscut-data.generated.ts");
const WIKI = "https://maplestorywiki.net/w/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const REQUEST_GAP_MS = 3000;
const FLOOR_CUT = 40600;
const DEFAULT_EASY_RATE = 0.969;

// Infobox fields are numbered by difficulty: timeLimit1 is Easy, timeLimit4 is Chaos.
const DIFFICULTIES = ["Easy", "Normal", "Hard", "Chaos", "Extreme"];

// Wiki page -> the scraped Boss Clear boss key, for the reference bosses. Lucid Hard is left out:
// MapleScouter gives it its own timer rule, so its easyRate isn't a plain HP ratio.
const REFERENCE = [
  { page: "Damien", name: "damien" }, { page: "Lotus", name: "lotus" },
  { page: "Guardian Angel Slime", name: "slime" }, { page: "Lucid", name: "lucid", skip: ["Hard"] },
  { page: "Will", name: "will" }, { page: "Gloom", name: "gloom" },
  { page: "Verus Hilla", name: "verusHilla" }, { page: "Darknell", name: "darknell" },
];

// Ids from manifests/v271/ui-boss.json, by exact name.
const LOW_END = [
  { page: "Zakum", icon: "1" }, { page: "Horntail", icon: "2" }, { page: "Hilla", icon: "3" },
  { page: "Pierre", icon: "4" }, { page: "Von Bon", icon: "5" }, { page: "Crimson Queen", icon: "6" },
  { page: "Vellum", icon: "7" }, { page: "Von Leon", icon: "8" }, { page: "Arkarium", icon: "9" },
  { page: "Magnus", icon: "10" }, { page: "Pink Bean", icon: "11" }, { page: "Cygnus", icon: "12" },
  { page: "Princess No", icon: "18" }, { page: "Papulatus", icon: "22" }, { page: "Akechi Mitsuhide", icon: "107" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;

async function raw(title) {
  if (requests++ > 0) await sleep(REQUEST_GAP_MS);
  const res = await fetch(`${WIKI}${encodeURIComponent(title.replace(/ /g, "_"))}?action=raw`, { headers: { "User-Agent": UA } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${title}: HTTP ${res.status}`);
  const text = await res.text();
  if (text.startsWith("<")) throw new Error(`${title}: got an HTML page instead of wikitext, stopping`);
  return text;
}

/** The page holding a boss's monster stats: follows a redirect, then the Monster tab when it's a
 *  subpage (tab1 is the base page itself). */
async function bossPage(title) {
  let text = await raw(title);
  const redirect = text && /^#REDIRECT\s*\[\[([^\]#|]+)/i.exec(text);
  if (redirect) text = await raw((title = redirect[1].trim()));
  if (text && /\|tab[2-9]=Monster\b/.test(text)) text = (await raw(`${title}/Monster`)) ?? text;
  if (!text) throw new Error(`${title}: page not found`);
  return text;
}

const firstNumber = (s) => {
  const m = /\d[\d,]*(\.\d+)?/.exec(String(s ?? ""));
  return m ? Number(m[0].replace(/,/g, "")) : null;
};

function infobox(text) {
  const out = {};
  for (const m of text.matchAll(/^\|(timeLimit|level)(\d)=([^\n]*)/gm)) {
    const diff = DIFFICULTIES[Number(m[2]) - 1];
    const value = m[1] === "timeLimit" ? /(\d+)\s*min/i.exec(m[3])?.[1] : firstNumber(m[3]);
    if (diff && value != null) (out[diff] ??= {})[m[1]] = Number(value);
  }
  return out;
}

/** Every {{Mob}} block under a difficulty heading, minus Story-mode and reward parts. */
function mobParts(text) {
  const parts = {};
  let diff = null, section = "";
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const h = /^(=+)\s*(.*?)\s*=+\s*$/.exec(lines[i]);
    if (h) {
      const d = DIFFICULTIES.find((x) => h[2] === x || h[2].startsWith(`${x}:`) || h[2].startsWith(`${x} `));
      if (h[1].length <= 4) diff = d ?? (h[1].length <= 3 ? null : diff);
      section = h[2];
      continue;
    }
    if (!diff || !lines[i].startsWith("{{Mob")) continue;
    const block = {};
    for (i++; i < lines.length && !lines[i].startsWith("}}"); i++) {
      const kv = /^\|(\w+)=(.*)$/.exec(lines[i]);
      if (kv) block[kv[1]] = kv[2];
    }
    if (/^Story|reward|chest/i.test(section) || /reward|chest/i.test(block.bname ?? "")) continue;
    const hp = firstNumber(block.HP);
    if (hp) (parts[diff] ??= []).push({ section, name: block.bname, level: firstNumber(block.level), hp, pdr: firstNumber(block.pdr) ?? 0 });
  }
  return parts;
}

/** Total HP to kill, counting a part listed more than once in one section with the same HP once
 *  (Pierre and Crimson Queen list each form of one shared HP pool separately). Zakum's arms have
 *  distinct names and Akechi's phases are separate sections, so those all count. */
function totalHp(parts) {
  const seen = new Set();
  let hp = 0;
  for (const p of parts) {
    const key = `${p.section}|${p.name}|${p.hp}`;
    if (!seen.has(key)) hp += p.hp;
    seen.add(key);
  }
  return hp;
}

async function bossDifficulties(page) {
  const text = await bossPage(page);
  const box = infobox(text);
  return Object.entries(mobParts(text)).map(([difficulty, parts]) => ({
    difficulty, parts, hp: totalHp(parts),
    timeLimit: box[difficulty]?.timeLimit ?? null,
    entryLevel: box[difficulty]?.level ?? null,
  }));
}

async function readBossCutEasyRates() {
  const src = await fs.readFile(BOSSCUT_FILE, "utf8");
  return [...src.matchAll(/^ {2}(\{ boss: .*\}),?$/gm)].map((m) => Function(`return (${m[1]})`)());
}

async function referenceConstant() {
  const cuts = await readBossCutEasyRates();
  const values = [];
  for (const ref of REFERENCE) {
    for (const d of await bossDifficulties(ref.page)) {
      if (ref.skip?.includes(d.difficulty)) continue;
      const cut = cuts.find((c) => c.name === ref.name && c.difficulty === d.difficulty);
      if (!cut || cut.bossCut !== FLOOR_CUT || cut.guard !== 300 || !cut.easyRate) continue;
      // Main bodies only: the low-defense parts on these pages are optional adds.
      const hp = totalHp(d.parts.filter((p) => p.pdr >= 300));
      // Per 30 minutes of its own timer, so a reference boss whose timer changes with its HP (the
      // 30-to-20-minute patch) keeps the same constant.
      if (!d.timeLimit) continue;
      values.push({ boss: `${ref.page} ${d.difficulty}`, k: ((hp * cut.easyRate) / DEFAULT_EASY_RATE) * (30 / d.timeLimit) });
    }
  }
  if (values.length < 10) throw new Error(`only ${values.length} reference difficulties matched; check the wiki pages and scrape-bosscut output`);
  const sorted = values.map((v) => v.k).sort((a, b) => a - b);
  for (const v of values) console.log(`  reference ${v.boss.padEnd(28)} ${(v.k / sorted[sorted.length >> 1]).toFixed(2)}`);
  return sorted[sorted.length >> 1];
}

const reference = await referenceConstant();
const entries = [];
for (const boss of LOW_END) {
  for (const d of await bossDifficulties(boss.page)) {
    if (!d.timeLimit || !d.entryLevel) throw new Error(`${boss.page} ${d.difficulty}: missing time limit or entry level`);
    const main = d.parts.reduce((a, b) => (b.hp > a.hp ? b : a));
    entries.push({
      boss: boss.page, name: boss.page.replace(/\s+/g, ""), difficulty: d.difficulty,
      level: main.level, guard: main.pdr, arcaneForce: null, authenticForce: null, partyLimit: 6,
      bossCut: FLOOR_CUT, partyBossCut: null,
      easyRate: Number(((DEFAULT_EASY_RATE * reference * (d.timeLimit / 30)) / d.hp).toPrecision(6)),
      challenger: null, renewalDate: "", renewalDetail: "",
      entryLevel: d.entryLevel, iconId: boss.icon, hp: d.hp, timeLimit: d.timeLimit,
    });
    console.log(`${boss.page.padEnd(17)} ${d.difficulty.padEnd(7)} hp ${d.hp.toExponential(3)} def ${main.pdr} t ${d.timeLimit} -> easyRate ${entries.at(-1).easyRate}`);
  }
}

const out = `/*
  Boss Clear entries for bosses MapleScouter has no cut for, estimated from boss HP against
  MapleScouter's own older bosses (see scripts/scrape-lowend-bosses.mjs for the model).
  Auto-generated by scripts/scrape-lowend-bosses.mjs from the MapleStory Wiki. Do not edit by hand.
*/

import type { BossCutEntry } from "./bosscut-data.generated";

export interface EstimatedBossEntry extends BossCutEntry {
  /** Lowest character level the difficulty allows in. */
  entryLevel: number;
  /** manifests ui-boss id for the boss art. */
  iconId: string;
  /** Total HP to kill, every required part. */
  hp: number;
  /** Time limit in minutes. */
  timeLimit: number;
}

export const LOWEND_BOSS_DATA: EstimatedBossEntry[] = [
${entries.map((e) => `  { ${JSON.stringify(e).slice(1, -1).replace(/"(\w+)":/g, "$1: ").replace(/,(?=\w+: )/g, ", ")} },`).join("\n")}
];
`;
await fs.writeFile(OUT_FILE, out);
console.log(`wrote ${entries.length} entries (${requests} requests)`);

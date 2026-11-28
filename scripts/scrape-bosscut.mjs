// One-shot scraper for MapleScouter's crowdsourced Boss Clear (Cut) data -- the community-
// measured minimum-damage thresholds and boss requirement physics behind their Boss Clear grid.
//
// NO LONGER WORKS as of Nov 2026: MapleScouter moved the cut values (bossCut/partyBossCut/
// easyRate) server-side. The page now POSTs the character to their API (CALC_BOSS_CUTS) and gets
// clear rates back; only boss metadata (level, defense, forces, party limit, renewalDate and
// renewalDetail) is still in the client chunk. Since then bosscut-data.generated.ts is updated
// by calibrating easyRate against MapleScouter's own results:
//   - Take one sheet and a KMS class (Ren works: its Ascent matches ours exactly), and get
//     MapleScouter's result at a few strengths (lower only the attack, then the main stat too),
//     so every boss reads below about 170% in at least one of them. Below that their Ascent
//     bonus doesn't apply, so our rate / their rate is that boss's correction alone, the same at
//     every strength (to 0.04% in Nov 2026) and for every class to about 1%. Divide each row's
//     easyRate by it. Four results plus the full-strength one covered every boss.
//   - Their results come from their own Result button in a browser, a few seconds apart (the
//     last one is saved in localStorage "manual-store" -> state.result.calculatedData.bossCuts).
//     Don't script their API.
//   - The changelog's renewalDetail multipliers ("배율 2.5% 증가") alone were not enough: the
//     table built from them read 2-16% too hard per boss. Copy renewalDate/renewalDetail anyway.
//   - Extreme Adversary and Extreme Kalos are reported on the solo scale now (isPartyBoss false),
//     so divide their correction by the party's solo-scale divisor first (3 and 5.667).
//   - MapleScouter also adjusts some classes on some bosses (up to about 12%, the same at every
//     strength). Those live in src/features/characters/scouter/engine/classBossFactors.ts, measured
//     per class at two strengths; re-measure them after recalibrating this table.
// Champion Black Mage is stored as Hard x0.75 (MapleScouter's own numbers agree since v272).
// Set BOSSCUT_SCRAPED_AT to the update's date too: it's the "Boss thresholds as of" date
// players see under every Boss Clear view.
// Run: node scripts/scrape-bosscut.mjs [--har <file>]
// Writes src/features/characters/scouter/bosscut-data.generated.ts
//
// No login, no headless browser, no hardcoded webpack module ID or chunk filename -- MapleScouter
// reshuffles both on every deploy. Instead this fetches the live page's own chunk list, then
// content-fingerprints the two object shapes we need (they're plain data literals, and object
// literal keys survive minification even though local variable names don't). Re-run this after
// every MapleScouter update; if either fingerprint stops matching, that means MapleScouter changed
// the shape of the data itself (not just renamed a variable), which needs human investigation
// before trusting the output -- see bossClearFormula.ts's own header for how this scraped data
// feeds the Boss Clear formula.
//
// --har <file>: read the page and its chunks from a HAR you saved in your own browser instead of
// fetching them, for when MapleScouter answers scripted requests with a Cloudflare challenge
// (403). Never work around the challenge itself. To save one: open `/en/result` in Chrome,
// DevTools > Network, reload, then right-click any request > "Save all as HAR (with content)".

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "src/features/characters/scouter/bosscut-data.generated.ts");
const RESULT_PAGE = "https://maplescouter.com/en/result";
const BASE = "https://maplescouter.com";

const DIFFICULTIES = "easy|normal|hard|chaos|extreme|destiny|champion";
const CUT_FINGERPRINT = new RegExp(
  `boss:"[^"]+",name:"[a-zA-Z]+",difficulty:"[^"]+",level:[^,]+,(?:authenticForce:[^,]+,)?(?:arcaneForce:[^,]+,)?guard:[^,]+,(?:bossCut|partyBossCut):\\d+`
);
const PHYSICS_FINGERPRINT = new RegExp(`=(\\{\\w+:\\{(?:${DIFFICULTIES}):\\{level:\\d+)`);

// Captures the region-1 (gms/tms/msea) array's name from MapleScouter's own region ternary
// (`X=1===Y?Z:2===Y?W.V:...`)
// region codes: {kms:0, gms:1, tms:1, msea:1, jms:2}.
const REGION_ARRAY_SELECTOR = /(\w+)=1===(\w+)\?(\w+):2===\2\?(\w+)\.(\w+):/;

// url -> body from --har, or null to fetch live.
const harBodies = await loadHar();

async function loadHar() {
  const i = process.argv.indexOf("--har");
  if (i < 0) return null;
  const har = JSON.parse(await fs.readFile(process.argv[i + 1], "utf8"));
  const bodies = new Map();
  for (const { request, response } of har.log.entries) {
    const c = response.content;
    if (c?.text) bodies.set(request.url.split("?")[0], c.encoding === "base64" ? Buffer.from(c.text, "base64").toString("utf8") : c.text);
  }
  console.log(`Read ${bodies.size} responses from the HAR.`);
  return bodies;
}

async function fetchText(url) {
  if (harBodies) {
    const body = harBodies.get(url);
    if (body === undefined) throw new Error(`${url} is not in the HAR`);
    return body;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

async function findChunkUrls() {
  // A HAR also holds the chunks the page loaded after the first paint, so take every one.
  if (harBodies) return [...harBodies.keys()].filter((u) => u.startsWith(`${BASE}/_next/static/chunks/`) && u.endsWith(".js"));
  const html = await fetchText(RESULT_PAGE);
  const matches = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)];
  return [...new Set(matches.map((m) => BASE + m[1]))];
}

// Brace/bracket-depth matching that respects string-literal boundaries, starting from an
// already-known opening `{`/`[` at `start`. Needed because these are raw minified JS literals,
// not JSON -- naive regex can't handle the nesting.
function matchEnclosing(src, start) {
  let depth = 0;
  let inStr = null;
  let i = start;
  for (; i < src.length; i++) {
    const c = src[i];
    const prev = src[i - 1];
    if (inStr) {
      if (c === inStr && prev !== "\\") inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      inStr = c;
      continue;
    }
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  return src.slice(start, i);
}

// Resolves an unbound identifier (e.g. a percentage-adjustment table) to its own declaration
// instead of stubbing it blindly, which previously zeroed out easyRate silently.
function findLocalDeclaration(moduleSrc, name) {
  const re = new RegExp(`(?:let|const|var)\\s+${name}=(\\{|\\[)`, "g");
  let last = null;
  let m;
  while ((m = re.exec(moduleSrc)) !== null) last = m;
  if (!last) return null;
  return matchEnclosing(moduleSrc, last.index + last[0].length - 1);
}

function safeEvalLiteral(literalSrc, moduleSrc = "") {
  const deepProxy = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === Symbol.iterator) return function* () {};
        if (prop === Symbol.toPrimitive) return () => 0;
        return deepProxy;
      },
    }
  );
  const bound = new Map();
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const names = [...bound.keys()];
      return new Function(...names, `return ${literalSrc};`)(...names.map((n) => bound.get(n)));
    } catch (e) {
      const m = /^(\w+) is not defined$/.exec(e.message);
      if (!m || bound.has(m[1])) throw e;
      const decl = moduleSrc && findLocalDeclaration(moduleSrc, m[1]);
      let resolved = deepProxy;
      if (decl) {
        try {
          resolved = safeEvalLiteral(decl, moduleSrc);
        } catch {
          // Its own declaration didn't resolve cleanly either -- fall back to the stub
          // rather than propagate a real-but-partially-wrong table.
        }
      }
      bound.set(m[1], resolved);
    }
  }
  throw new Error("safeEvalLiteral: too many unresolved identifiers");
}

// Scopes a declaration search to the same module the reference lives in, not the whole chunk --
// short minified names get reused across unrelated modules, so a fixed window isn't safe.
function moduleStartBefore(src, pos) {
  const re = /\},(\d+):\(/g;
  let last = null;
  let m;
  while ((m = re.exec(src)) !== null && m.index < pos) last = m;
  return last ? last.index + 1 : 0;
}

function findCutArrayInSource(src) {
  const m = CUT_FINGERPRINT.exec(src);
  if (!m) return null;
  let start = m.index;
  while (start > 0 && src[start] !== "[") start--;
  if (src[start] !== "[") return null;
  const searchWindow = src.slice(moduleStartBefore(src, start), start);
  return safeEvalLiteral(matchEnclosing(src, start), searchWindow);
}

/** Like findLocalDeclaration, but also matches a name inside a comma-separated declaration list
 *  (`let el={...},es=[...]`), which only the first name there gets a `let`/`const`/`var` for. */
function findLocalOrListDeclaration(moduleSrc, name) {
  const direct = findLocalDeclaration(moduleSrc, name);
  if (direct) return direct;
  const re = new RegExp(`,${name}=(\\{|\\[)`, "g");
  let last = null;
  let m;
  while ((m = re.exec(moduleSrc)) !== null) last = m;
  if (!last) return null;
  return matchEnclosing(moduleSrc, last.index + last[0].length - 1);
}

/** Finds the region-1 (gms/tms/msea) boss-cut array, not whichever array CUT_FINGERPRINT matches
 *  first. Returns null if REGION_ARRAY_SELECTOR or the named array's declaration isn't found. */
function findGmsCutArrayInSource(src) {
  const sel = REGION_ARRAY_SELECTOR.exec(src);
  if (!sel) return null;
  const arrayName = sel[3];
  const searchWindow = src.slice(moduleStartBefore(src, sel.index), sel.index);
  const decl = findLocalOrListDeclaration(searchWindow, arrayName);
  if (!decl) return null;
  return safeEvalLiteral(decl, searchWindow);
}

function findPhysicsObjectInSource(src) {
  const m = PHYSICS_FINGERPRINT.exec(src);
  if (!m) return null;
  const start = m.index + 1;
  const searchWindow = src.slice(moduleStartBefore(src, start), start);
  return safeEvalLiteral(matchEnclosing(src, start), searchWindow);
}

async function scanChunks(chunkUrls) {
  // All regions' boss-cut arrays pass the generic shape fingerprint, but only region 1's is
  // correct for GMS/TMS/MSEA, see REGION_ARRAY_SELECTOR. The array is always
  // defined locally inside the /result route's own page chunk, never a shared one.
  const resultPageChunks = chunkUrls.filter((u) => u.includes("/result/page-"));
  if (resultPageChunks.length === 0) {
    throw new Error(
      "No chunk URL matched '/result/page-' -- MapleScouter's route-chunk naming may have changed. " +
        "Do not fall back to scanning all chunks for the cut array: that previously grabbed the " +
        "wrong (non-GMS) dataset silently. Investigate before proceeding."
    );
  }

  let cutEntries = null;
  for (const url of resultPageChunks) {
    const src = await fetchText(url);
    cutEntries = findGmsCutArrayInSource(src);
    if (cutEntries) {
      console.log(`  GMS-specific bossCut table found in ${url} (${cutEntries.length} entries)`);
      break;
    }
  }
  if (!cutEntries) {
    console.warn(
      "\nWARNING: REGION_ARRAY_SELECTOR didn't match -- falling back to the generic fingerprint, " +
        "which may grab the wrong region's array. Investigate before trusting this run's output."
    );
    for (const url of resultPageChunks) {
      const src = await fetchText(url);
      cutEntries = findCutArrayInSource(src);
      if (cutEntries) {
        console.log(`  bossCut table found in ${url} (${cutEntries.length} entries) [fallback, region unverified]`);
        break;
      }
    }
  }
  if (!cutEntries) {
    throw new Error(
      `bossCut fingerprint not found in any of the ${resultPageChunks.length} /result/page- chunk(s) -- ` +
        "MapleScouter may have changed the data shape or moved it out of the page-local chunk."
    );
  }

  let physics = null;
  for (const url of chunkUrls) {
    let src;
    try {
      src = await fetchText(url);
    } catch {
      continue;
    }
    physics = findPhysicsObjectInSource(src);
    if (physics) {
      console.log(`  physics table found in ${url} (${Object.keys(physics).length} bosses)`);
      break;
    }
  }

  return { cutEntries, physics };
}

function merge(cutEntries, physics) {
  const merged = [];
  const missingPhysics = [];

  for (const e of cutEntries) {
    const diffKey = e.difficulty.toLowerCase();
    const phys = physics[e.name]?.[diffKey];
    if (!phys) {
      missingPhysics.push(`${e.name} (${e.difficulty})`);
      continue;
    }
    merged.push({
      boss: e.boss,
      name: e.name,
      difficulty: e.difficulty,
      level: phys.level,
      guard: phys.guard,
      arcaneForce: typeof phys.arcaneForce === "number" ? phys.arcaneForce : null,
      authenticForce: typeof phys.authenticForce === "number" ? phys.authenticForce : null,
      partyLimit: phys.maxPartyLimit,
      bossCut: typeof e.bossCut === "number" ? e.bossCut : null,
      partyBossCut: typeof e.partyBossCut === "number" ? e.partyBossCut : null,
      easyRate: typeof e.easyRate === "number" ? e.easyRate : null,
      challenger: typeof e.challenger === "number" ? e.challenger : null,
      renewalDate: e.renewalDate ?? "",
      renewalDetail: e.renewalDetail ?? "",
    });
  }

  return { merged, missingPhysics };
}

function toTsLiteral(entry) {
  const fields = Object.entries(entry).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `  { ${fields.join(", ")} },`;
}

async function main() {
  console.log(`Fetching chunk list from ${RESULT_PAGE} ...`);
  const chunkUrls = await findChunkUrls();
  console.log(`Found ${chunkUrls.length} chunk URLs. Scanning for data tables...`);

  const { cutEntries, physics } = await scanChunks(chunkUrls);
  if (!cutEntries) throw new Error("Could not find the bossCut table fingerprint in any chunk -- MapleScouter may have changed its shape.");
  if (!physics) throw new Error("Could not find the boss physics table fingerprint in any chunk -- MapleScouter may have changed its shape.");

  const { merged, missingPhysics } = merge(cutEntries, physics);
  if (missingPhysics.length) {
    console.warn(`\nWARNING: ${missingPhysics.length} cut entries had no matching physics data (skipped):`);
    for (const m of missingPhysics) console.warn(`  - ${m}`);
  }

  const scrapedAt = new Date().toISOString().slice(0, 10);
  const lines = [
    "/*",
    "  MapleScouter's crowdsourced Boss Clear (Cut) data: community-measured minimum damage",
    "  thresholds (bossCut/partyBossCut/easyRate) joined with boss requirement physics",
    "  (level/guard/arcaneForce/authenticForce/partyLimit).",
    "  Auto-generated by scripts/scrape-bosscut.mjs. Do not edit by hand.",
    "  Re-run after every MapleScouter update -- see the script header for how this scrapes",
    "  without relying on any hardcoded module ID or chunk filename.",
    "*/",
    "",
    "export interface BossCutEntry {",
    "  boss: string;",
    "  name: string;",
    "  difficulty: string;",
    "  level: number;",
    "  guard: number;",
    "  arcaneForce: number | null;",
    "  authenticForce: number | null;",
    "  partyLimit: number;",
    "  bossCut: number | null;",
    "  partyBossCut: number | null;",
    "  easyRate: number | null;",
    "  challenger: number | null;",
    "  renewalDate: string;",
    "  renewalDetail: string;",
    "}",
    "",
    `export const BOSSCUT_SCRAPED_AT = "${scrapedAt}";`,
    "",
    "export const BOSSCUT_DATA: BossCutEntry[] = [",
    ...merged.map(toTsLiteral),
    "];",
    "",
  ];

  await fs.writeFile(OUT_FILE, lines.join("\n"), "utf8");
  console.log(`\nWrote ${merged.length} entries to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

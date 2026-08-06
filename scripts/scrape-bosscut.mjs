// One-shot scraper for MapleScouter's crowdsourced Boss Clear (Cut) data -- the community-
// measured minimum-damage thresholds and boss requirement physics behind their Boss Clear grid.
// Run: node scripts/scrape-bosscut.mjs
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

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

async function findChunkUrls() {
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

// The literals reference a couple of outer tables via whatever single-letter name the minifier
// happened to pick that build -- some genuinely don't matter (a boss-physics lookup for the cut
// array, meso/hp/reward tables for the physics object), but at least one DOES: the cut array's
// own module defines a local percentage-adjustment table (`let o={...}`, real numeric-expression
// values, e.g. easyRate:.9792*o["노스우"]) immediately before the array itself, and stubbing it
// away silently zeroes out easyRate for every entry that references it instead of throwing --
// wrong data with no error, not caught until Normal Lotus was noticed reading "Impossible" for
// an endgame character. So on an unresolved identifier, don't stub blindly: first search the
// SAME module's source for that
// identifier's own `let X={...}`/`const X={...}` declaration and try to resolve it for real,
// only falling back to an inert stub if no such declaration exists (a genuinely unneeded table)
// or it fails to evaluate on its own.
// Takes the LAST (closest-to-point-of-use) match in the window, not the first -- short minified
// names like `s`/`o` get reused across many unrelated closures earlier in the same window, and
// the relevant declaration is the one immediately preceding where the identifier is actually
// referenced (e.g. `let o={...},c=[...]`), not whichever same-named var happens to appear first.
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

// Webpack bundles every module as `},moduleId:(params)=>{body}` chained in one big object
// literal -- `},\d+:\(` reliably marks where one module's body ends and the next begins. Used
// to scope the search for a referenced identifier's own local declaration (e.g. the `let
// o={...}` percentage table the cut array's easyRate values reference) to the SAME module the
// reference actually lives in, not the whole (multi-module) chunk file. A fixed character window
// isn't safe here: short minified names like `s`/`o` get reused across many unrelated closures
// in completely different modules within the same file, and a same-named-but-unrelated literal
// from another module (e.g. module 33528's own local `s`, a Korean strategy-note lookup table
// that happens to share the letter `s` with module 39159's own `s`, an actual import alias) can
// fall inside a fixed window and get wrongly bound -- caught live when this returned a resolved
// object instead of falling through to the inert stub, and the array's own `s.N6.jupiter...`
// access threw instead of silently stubbing (a loud, easy-to-notice failure -- much better than
// the original silent-zero bug this whole fix exists for).
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

function findPhysicsObjectInSource(src) {
  const m = PHYSICS_FINGERPRINT.exec(src);
  if (!m) return null;
  const start = m.index + 1;
  const searchWindow = src.slice(moduleStartBefore(src, start), start);
  return safeEvalLiteral(matchEnclosing(src, start), searchWindow);
}

async function scanChunks(chunkUrls) {
  // MapleScouter's own client code picks between THREE differently-shaped boss-cut arrays at
  // runtime depending on the viewer's region (`0!==regionConfig[region] ? mainArray : isChallengers
  // ? challengersArray : fallbackArray`, decoded from the actual result-page call site). All three
  // pass our generic shape fingerprint, but only `mainArray` -- the one used for every real,
  // recognized region (gms/kms/tms/jms/msea) -- is trustworthy; the fallback array is a *different*
  // dataset with different bossCut/easyRate numbers (confirmed empirically: it disagreed with a
  // live GMS character's real displayed result on this exact boss+difficulty). `mainArray` is
  // always defined locally inside the /result route's own page chunk (never imported from a
  // shared chunk), so restrict the cut-array search to that chunk specifically rather than "first
  // match wins" across the whole chunk list -- the physics table has no such per-region split and
  // is safe to find anywhere.
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
    cutEntries = findCutArrayInSource(src);
    if (cutEntries) {
      console.log(`  bossCut table found in ${url} (${cutEntries.length} entries)`);
      break;
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

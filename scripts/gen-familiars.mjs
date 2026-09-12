#!/usr/bin/env node
/**
 * Regenerates the FAMILIARS array (and the badge constants) in familiarsData.ts from the
 * WZ manifests.
 *
 * Usage:
 *   node scripts/gen-familiars.mjs manifests/v271/familiar.json
 *
 * Set FAMILIAR_DUMP_DIR to the local WZ image dump's output root (the dir containing
 * `mob/`, `familiar/`, etc.) to enable pixel-hash dedup of same-name familiars that
 * render an identical sprite (e.g. card reissues): the redundant entries get a
 * `duplicateOf` pointer instead of being removed, so old saved characters that
 * picked one still resolve fine, they just stop showing up as a second picker result.
 *   FAMILIAR_DUMP_DIR=/path/to/dump node scripts/gen-familiars.mjs manifests/v271/familiar.json
 *
 * It splices three constants and leaves everything else (types, tier data, helpers) alone:
 *   - FAMILIARS       : from the familiar.json passed as the arg
 *   - BADGE_ID_MAP    : name to ui/familiar icon id, rebuilt wholesale from the sibling
 *                       ui-familiar.json (its entry keys ARE the icon ids)
 *   - BADGE_NAMES     : the picker's display order. NOT derivable from the manifest (it's a
 *                       hand-curated progression order), so the existing order is kept as-is
 *                       and any manifest badge missing from it is appended to the end.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join, dirname } from "path";
import { createHash } from "crypto";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node scripts/gen-familiars.mjs <path/to/familiar.json>");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
const entries = manifest.entries ?? manifest;

const DUMP_DIR = process.env.FAMILIAR_DUMP_DIR;

// Mirrors the runtime fallback order in FamiliarCardSprite: "mob"-sourced entries
// render mob/<spriteMobId ?? mobId>/sprite.png; "familiar"-sourced (direct-sprite,
// no real monster) entries render familiar/<own id>/sprite.png.
function effectiveSpritePath(id, entry) {
  if (entry.spriteFrom === "mob") {
    const effId = entry.spriteMobId || entry.mobId;
    return join(DUMP_DIR, "mob", String(effId), "sprite.png");
  }
  return join(DUMP_DIR, "familiar", String(id), "sprite.png");
}

const hashCache = new Map();
function hashSprite(path) {
  if (hashCache.has(path)) return hashCache.get(path);
  const h = existsSync(path) ? createHash("sha1").update(readFileSync(path)).digest("hex") : null;
  hashCache.set(path, h);
  return h;
}

// Same-name entries whose effective sprite hashes identically are true duplicates
// (e.g. periodic card reissues). Keep the lowest id, or whichever lacks `cardIdsFrom`,
// the manifest's own "this is a reissue of X" marker, as canonical and mark the rest.
// Different-named entries that happen to share art (recolors the dump didn't capture
// distinctly) are not touched, since the name itself already disambiguates them in the
// picker.
function computeDuplicates(rawEntries) {
  const duplicateOf = new Map();
  if (!DUMP_DIR) return duplicateOf;

  const byName = new Map();
  for (const [id, entry] of rawEntries) {
    const list = byName.get(entry.name ?? "") ?? [];
    list.push({ id, entry });
    byName.set(entry.name ?? "", list);
  }

  for (const list of byName.values()) {
    if (list.length < 2) continue;
    const byHash = new Map();
    for (const item of list) {
      const hash = hashSprite(effectiveSpritePath(item.id, item.entry));
      if (!hash) continue;
      const group = byHash.get(hash) ?? [];
      group.push(item);
      byHash.set(hash, group);
    }
    for (const group of byHash.values()) {
      if (group.length < 2) continue;
      const original = group.find((g) => !g.entry.cardIdsFrom) ?? group.reduce((a, b) => (Number(a.id) < Number(b.id) ? a : b));
      for (const item of group) {
        if (item.id !== original.id) duplicateOf.set(item.id, Number(original.id));
      }
    }
  }
  return duplicateOf;
}

const entryList = Object.entries(entries);
const duplicateOf = computeDuplicates(entryList);
if (DUMP_DIR) console.log(`Dedup: ${duplicateOf.size} redundant entries marked via FAMILIAR_DUMP_DIR.`);

const lines = [];
for (const [rawId, entry] of entryList) {
  const id = Number(rawId);
  const name = String(entry.name ?? "");
  const mobId = String(entry.mobId ?? "");
  const cardId = String(entry.cardIds?.[0] ?? "");
  // spriteMobId overrides mobId for sprite lookups only (mobId stays the "real" mob
  // for data/storage purposes). Some familiars' own mobId has no sprite manifest
  // entry, and the WZ dump records a separate id that does.
  const spriteMobId = String(entry.spriteMobId ?? "");
  const spriteField = spriteMobId && spriteMobId !== mobId ? `,spriteMobId:${JSON.stringify(spriteMobId)}` : "";
  const dup = duplicateOf.get(rawId);
  const dupField = dup !== undefined ? `,duplicateOf:${dup}` : "";
  lines.push(`  {id:${id},name:${JSON.stringify(name)},mobId:${JSON.stringify(mobId)},cardId:${JSON.stringify(cardId)}${spriteField}${dupField}}`);
}

const familiarsBlock = `export const FAMILIARS: readonly FamiliarEntry[] = [\n${lines.join(",\n")}\n]`;

const targetPath = resolve("src/features/characters/setup/data/familiarsData.ts");
let source = readFileSync(targetPath, "utf8");

/**
 * Replaces the whole `export const <name> = <value>` statement whose declaration line
 * starts with `declPrefix` (everything up to and including the `=`). `openChar`/`closeChar`
 * are the value's brackets ("[" "]" for an array, "{" "}" for an object); the replacement
 * runs from `declPrefix`'s start through the matching close bracket. Bails if not found.
 */
function spliceConst(src, declPrefix, openChar, closeChar, replacement) {
  const startIdx = src.indexOf(declPrefix);
  if (startIdx === -1) {
    console.error(`Could not find "${declPrefix}" in familiarsData.ts`);
    process.exit(1);
  }
  const openIdx = src.indexOf(openChar, startIdx + declPrefix.length);
  let depth = 0;
  let endIdx = openIdx;
  for (let i = openIdx; i < src.length; i++) {
    if (src[i] === openChar) depth++;
    else if (src[i] === closeChar) {
      depth--;
      if (depth === 0) { endIdx = i; break; }
    }
  }
  return src.slice(0, startIdx) + replacement + src.slice(endIdx + 1);
}

source = spliceConst(source, "export const FAMILIARS: readonly FamiliarEntry[] =", "[", "]", familiarsBlock);

// ── Badge constants (from ui-familiar.json, the sibling of familiar.json) ─────────────────
// Its entry keys are the ui/familiar icon ids; the values carry the badge name. BADGE_ID_MAP
// is a straight name→id dump. BADGE_NAMES keeps its existing hand-curated progression order
// (not in the manifest) and only gains entries: any manifest badge not already listed is
// appended, so a new badge shows up at the end of the picker rather than going missing.
const uiFamiliarPath = resolve(dirname(resolve(manifestPath)), "ui-familiar.json");
const uiFamiliar = JSON.parse(readFileSync(uiFamiliarPath, "utf8"));
const badgeEntries = Object.entries(uiFamiliar.entries ?? uiFamiliar)
  .filter(([, v]) => typeof v?.name === "string" && /Badge$/.test(v.name))
  .map(([id, v]) => [Number(id), v.name]);

// Read the current BADGE_NAMES to preserve its hand-curated order.
const namesBlockMatch = source.match(/export const BADGE_NAMES: readonly string\[\] = \[([\s\S]*?)\];/);
const currentNames = namesBlockMatch
  ? [...namesBlockMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : [];
const manifestNames = new Set(badgeEntries.map(([, n]) => n));
const orderedNames = [
  ...currentNames.filter((n) => manifestNames.has(n)), // keep curated order, drop any removed
  ...badgeEntries.map(([, n]) => n).filter((n) => !currentNames.includes(n)), // append new
];

const namesLines = [];
for (let i = 0; i < orderedNames.length; i += 5) {
  namesLines.push("  " + orderedNames.slice(i, i + 5).map((n) => JSON.stringify(n)).join(", ") + ",");
}
// No trailing ";" -- spliceConst replaces only through the "]", keeping the original ";".
const namesBlock = `export const BADGE_NAMES: readonly string[] = [\n${namesLines.join("\n")}\n]`;

const idMapLines = [];
const sortedById = [...badgeEntries].sort((a, b) => a[0] - b[0]);
for (let i = 0; i < sortedById.length; i += 4) {
  idMapLines.push("  " + sortedById.slice(i, i + 4).map(([id, n]) => `${JSON.stringify(n)}: ${id}`).join(", ") + ",");
}
const idMapBlock = `export const BADGE_ID_MAP: Record<string, number> = {\n${idMapLines.join("\n")}\n}`;

source = spliceConst(source, "export const BADGE_NAMES: readonly string[] =", "[", "]", namesBlock);
source = spliceConst(source, "export const BADGE_ID_MAP: Record<string, number> =", "{", "}", idMapBlock);

writeFileSync(targetPath, source, "utf8");

console.log(`Written ${lines.length} familiars, ${orderedNames.length} badges to familiarsData.ts`);

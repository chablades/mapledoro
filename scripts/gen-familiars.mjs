#!/usr/bin/env node
/**
 * Regenerates the FAMILIARS array in familiarsData.ts from a familiar manifest.
 *
 * Usage:
 *   node scripts/gen-familiars.mjs manifests/v269/familiar.json
 *
 * Set FAMILIAR_DUMP_DIR to the local WZ image dump's output root (the dir containing
 * `mob/`, `familiar/`, etc.) to enable pixel-hash dedup of same-name familiars that
 * render an identical sprite (e.g. card reissues): the redundant entries get a
 * `duplicateOf` pointer instead of being removed, so old saved characters that
 * picked one still resolve fine — they just stop showing up as a second picker result.
 *   FAMILIAR_DUMP_DIR=/path/to/dump node scripts/gen-familiars.mjs manifests/v269/familiar.json
 *
 * The script splices only the FAMILIARS constant — everything else in the
 * file (types, tier data, helper functions) is left untouched.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";
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
// (e.g. periodic card reissues) — keep the lowest id (or whichever lacks
// `cardIdsFrom`, the manifest's own "this is a reissue of X" marker) as canonical
// and mark the rest. Different-named entries that happen to share art (recolors
// the dump didn't capture distinctly) are NOT touched — the name itself already
// disambiguates them in the picker.
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
  // for data/storage purposes) — some familiars' own mobId has no sprite manifest
  // entry, and the WZ dump records a separate id that does.
  const spriteMobId = String(entry.spriteMobId ?? "");
  const spriteField = spriteMobId && spriteMobId !== mobId ? `,spriteMobId:${JSON.stringify(spriteMobId)}` : "";
  const dup = duplicateOf.get(rawId);
  const dupField = dup !== undefined ? `,duplicateOf:${dup}` : "";
  lines.push(`  {id:${id},name:${JSON.stringify(name)},mobId:${JSON.stringify(mobId)},cardId:${JSON.stringify(cardId)}${spriteField}${dupField}}`);
}

const block = `export const FAMILIARS: readonly FamiliarEntry[] = [\n${lines.join(",\n")}\n]`;

const targetPath = resolve("src/features/characters/setup/data/familiarsData.ts");
const source = readFileSync(targetPath, "utf8");

const startMarker = "export const FAMILIARS: readonly FamiliarEntry[] = [";
const startIdx = source.indexOf(startMarker);
if (startIdx === -1) {
  console.error("Could not find FAMILIARS array in familiarsData.ts");
  process.exit(1);
}

// Find the opening `[` of the array value (after the `=`)
const eqIdx = source.indexOf("= [", startIdx);
const openIdx = source.indexOf("[", eqIdx);

// Find the matching closing `]`
let depth = 0;
let endIdx = openIdx;
for (let i = openIdx; i < source.length; i++) {
  if (source[i] === "[") depth++;
  else if (source[i] === "]") {
    depth--;
    if (depth === 0) { endIdx = i; break; }
  }
}

const updated = source.slice(0, startIdx) + block + source.slice(endIdx + 1);
writeFileSync(targetPath, updated, "utf8");

console.log(`Written ${lines.length} familiars to familiarsData.ts`);

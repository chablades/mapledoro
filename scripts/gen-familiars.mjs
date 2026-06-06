#!/usr/bin/env node
/**
 * Regenerates the FAMILIARS array in familiarsData.ts from a familiar manifest.
 *
 * Usage:
 *   node scripts/gen-familiars.mjs manifests/v269/familiar.json
 *
 * The script splices only the FAMILIARS constant — everything else in the
 * file (types, tier data, helper functions) is left untouched.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node scripts/gen-familiars.mjs <path/to/familiar.json>");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
const entries = manifest.entries ?? manifest;

const lines = [];
for (const [rawId, entry] of Object.entries(entries)) {
  const id = Number(rawId);
  const name = String(entry.name ?? "");
  const mobId = String(entry.mobId ?? "");
  const cardId = String(entry.cardIds?.[0] ?? "");
  lines.push(`  {id:${id},name:${JSON.stringify(name)},mobId:${JSON.stringify(mobId)},cardId:${JSON.stringify(cardId)}}`);
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

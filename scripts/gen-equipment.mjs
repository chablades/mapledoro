#!/usr/bin/env node
/**
 * Generates per-slot equipment item JSON files from the item manifest.
 * Output: public/data/equipment/{slot}.json
 * Each file: Array<[id, name] | [id, name, stats]> — id is 8-digit zero-padded; the
 *   stats object is appended only for items that have base stats (cosmetics omit it).
 *   Base stats come from item-stats.json (sibling of item.json), joined by id.
 *   `tuc` (raw 0-indexed WZ upgrade count) is normalized here to `upgradeSlots` (tuc + 1,
 *   the in-game slot count); all other stat keys are passed through verbatim.
 *
 * Usage:
 *   node scripts/gen-equipment.mjs manifests/v269/item.json
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

const manifestPath = process.argv[2] ?? "manifests/v269/item.json";
const OUTPUT_DIR = resolve("public/data/equipment");

const manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
const entries = manifest.entries;

// Base stats live in a sibling file, joined by the same 8-digit id.
const statsPath = resolve(dirname(resolve(manifestPath)), "item-stats.json");
const statEntries = JSON.parse(readFileSync(statsPath, "utf8")).entries;

/**
 * Builds the served stats object for an item, or undefined if it has no stats.
 * Renames raw `tuc` → `upgradeSlots` (+1 for the in-game count); passes other keys through.
 * @param {string} rawId
 */
function servedStats(rawId) {
  const stats = statEntries[rawId];
  if (!stats) return undefined;
  const { tuc, ...rest } = stats;
  if (tuc !== undefined) rest.upgradeSlots = tuc + 1;
  return rest;
}

mkdirSync(OUTPUT_DIR, { recursive: true });

// Maps each slot name to which item categories and optional ID prefixes match it.
// prefixes: 5-character string prefixes of the raw item ID (zero-padded).
const SLOT_FILTERS = {
  ring:      { cats: ["Character/Ring"] },
  face:      { cats: ["Character/Accessory"], prefixes: ["01010", "01012"] },
  eye:       { cats: ["Character/Accessory"], prefixes: ["01011", "01022"] },
  earring:   { cats: ["Character/Accessory"], prefixes: ["01032"] },
  pendant:   { cats: ["Character/Accessory"], prefixes: ["01122", "01123"] },
  belt:      { cats: ["Character/Accessory"], prefixes: ["01132"] },
  pocket:    { cats: ["Character/Accessory"], prefixes: ["01162"] },
  medal:     { cats: ["Character/Accessory"], prefixes: ["01142", "01143"] },
  shoulder:  { cats: ["Character/Accessory"], prefixes: ["01152"] },
  badge:     { cats: ["Character/Accessory"], prefixes: ["01182"] },
  emblem:    { cats: ["Character/Accessory"], prefixes: ["01190", "01191"] },
  hat:       { cats: ["Character/Cap"] },
  cape:      { cats: ["Character/Cape"] },
  top:       { cats: ["Character/Coat", "Character/Longcoat"] },
  bottom:    { cats: ["Character/Pants", "Character/Longcoat"] },
  glove:     { cats: ["Character/Glove"] },
  shoe:      { cats: ["Character/Shoes"] },
  weapon:    { cats: ["Character/Weapon"] },
  secondary: { cats: ["Character/Shield"] },
  android:   { cats: ["Character/Android"], prefixes: ["01662"] },
  heart:     { cats: ["Character/Android"], prefixes: ["01672"] },
};

for (const [slot, filter] of Object.entries(SLOT_FILTERS)) {
  /** @type {Array<[string, string] | [string, string, object]>} */
  const items = [];

  for (const [rawId, entry] of Object.entries(entries)) {
    if (!entry.name) continue;
    if (!filter.cats.includes(entry.category)) continue;
    if (filter.prefixes && !filter.prefixes.some((p) => rawId.startsWith(p))) continue;
    const stats = servedStats(rawId);
    items.push(stats ? [rawId, entry.name, stats] : [rawId, entry.name]);
  }

  const outputPath = resolve(OUTPUT_DIR, `${slot}.json`);
  writeFileSync(outputPath, JSON.stringify(items));
  console.log(`${slot}: ${items.length} items → ${slot}.json`);
}

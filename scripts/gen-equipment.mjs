#!/usr/bin/env node
/**
 * Generates per-slot equipment item JSON files from the item manifest.
 * Output: public/data/equipment/{slot}.json
 * Each file: Array<[id, name] | [id, name, stats]> — id is 8-digit zero-padded; the
 *   stats object is appended only for items that have base stats (cosmetics omit it).
 *   Base stats come from item-stats.json (sibling of item.json), joined by id. Items
 *   flagged `cash` there (pure cash-shop cosmetic overlays, e.g. Illusion Ring) are
 *   dropped entirely -- they never occupy their slot in-game, unlike cash-shop-SOLD
 *   but stat-bearing gear like the Eternal Wedding Ring, which doesn't carry this flag.
 *   `tuc` (raw 0-indexed WZ upgrade count) is normalized here to `upgradeSlots` (tuc + 1,
 *   the in-game slot count); all other stat keys are passed through verbatim. Genesis/
 *   Destiny-tier weapons (islot "Wp"/"WpSi" + onlyEquip, name-prefixed "Genesis "/
 *   "Destiny ", the Sealed Genesis Weapon Box lineage) are the one confirmed exception:
 *   their `tuc` is already the real in-game slot count with no +1 -- verified against both
 *   the wiki's dedicated pages (Genesis Sword, Destiny Celestial Light) and a real player's
 *   Destiny Pistol (8 slots). The onlyEquip + islot guard matters: other onlyEquip items
 *   (Almighty Ring, Guardian's Eternal Ring) checked fine with the normal +1 rule, and
 *   name alone is too loose (unrelated items like "Genesis Bandana" hat and Genesis/Destiny
 *   coupons/boxes also start with those words but aren't part of this weapon lineage).
 *
 * Usage:
 *   node scripts/gen-equipment.mjs manifests/v270/item.json
 *
 * Set EQUIP_ICON_DIR to the local WZ image dump's `item/` dir to enable icon-based
 * dedup, applied to every slot (collapses look-alike name reissues; keeps distinct
 * same-name entries that just happen to share a display name and/or icon):
 *   EQUIP_ICON_DIR=/path/to/dump/item node scripts/gen-equipment.mjs manifests/v270/item.json
 *
 * Set EQUIP_DEDUP_VERDICTS to the manual dedup audit's verdicts file (see
 * E:\mapledoro-image\tools\equipment\dedup-verdicts.json / its README) to apply
 * human-confirmed drop/label decisions for same-name+icon groups that survive the
 * icon-based dedup above with genuinely different stats (e.g. two "Eternal Wedding
 * Ring" ids at +5 vs +7 all stat) — drops confirmed leftover/regional-ghost/cafe-only
 * ids entirely and appends a disambiguating label to the served `name` for the rest,
 * so the picker never shows two indistinguishable rows. Skipped (served names
 * unchanged) if unset. Pet/pet-equip are out of scope (deferred — class/branch
 * filtering already keeps their duplicates from co-occurring in any picker).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { createHash } from "crypto";

const manifestPath = process.argv[2] ?? "manifests/v270/item.json";
const OUTPUT_DIR = resolve("public/data/equipment");

// Local WZ image dump (dev-only, not in-repo, machine-specific path) used to dedupe
// pet/pet-equip/title/totem/weapon/hat/ring/secondary by icon so reissues sharing a
// name collapse but visually-distinct same-name entries stay separate. Point
// EQUIP_ICON_DIR at the dump's `item/` dir; if unset, this dedup is skipped entirely
// (no risk of wrongly merging distinct items).
const ICON_DIR = process.env.EQUIP_ICON_DIR;
const iconHashCache = new Map();
function iconHash(id) {
  if (iconHashCache.has(id)) return iconHashCache.get(id);
  let h = "";
  const p = resolve(ICON_DIR, id, "iconRaw.png");
  if (existsSync(p)) h = createHash("sha1").update(readFileSync(p)).digest("hex");
  iconHashCache.set(id, h);
  return h;
}

// Human-confirmed dedup verdicts (drop / disambiguation label) from the manual audit —
// see the EQUIP_DEDUP_VERDICTS doc comment above. Keyed by `${slot}|${id}` since the
// same id never appears in two slots.
const VERDICTS_PATH = process.env.EQUIP_DEDUP_VERDICTS;
const verdictsByKey = new Map();
if (VERDICTS_PATH && existsSync(VERDICTS_PATH)) {
  const verdictGroups = JSON.parse(readFileSync(resolve(VERDICTS_PATH), "utf8"));
  for (const group of verdictGroups) {
    for (const item of group.items) verdictsByKey.set(`${group.slot}|${item.id}`, item);
  }
} else {
  console.warn(`⚠ EQUIP_DEDUP_VERDICTS ${VERDICTS_PATH ? `(${VERDICTS_PATH}) not found` : "unset"} — skipping dedup verdict bake-in. Picker may show undifferentiated duplicate rows.`);
}

/** Appends a verdict's disambiguation label to a served name, same convention as the
 * app's own Astra-stage/Destiny-part labels: `Name (label)`. A label that's already
 * fully wrapped in parens (the short "(Type)" tags used for weapon/secondary-type
 * disambiguation) has its outer parens stripped first so it doesn't double up. */
function withVerdictLabel(name, label) {
  if (!label) return name;
  const clean = /^\(.*\)$/.test(label) ? label.slice(1, -1) : label;
  return `${name} (${clean})`;
}

const manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
const entries = manifest.entries;

// Base stats live in a sibling file, joined by the same 8-digit id.
const statsPath = resolve(dirname(resolve(manifestPath)), "item-stats.json");
const statEntries = JSON.parse(readFileSync(statsPath, "utf8")).entries;

/**
 * Builds the served stats object for an item, or undefined if it has no stats.
 * Renames raw `tuc` → `upgradeSlots` (+1 for the in-game count, except the Genesis/Destiny
 * weapon lineage where `tuc` is already the real count -- see file header).
 * @param {string} rawId
 * @param {string} name
 */
function servedStats(rawId, name) {
  const stats = statEntries[rawId];
  if (!stats) return undefined;
  const { tuc, cash, ...rest } = stats;
  const isGenesisDestinyWeapon = /^(Genesis|Destiny) /.test(name) && stats.islot?.startsWith("Wp") && stats.onlyEquip;
  if (tuc !== undefined) rest.upgradeSlots = isGenesisDestinyWeapon ? tuc : tuc + 1;
  return rest;
}

// item-stats.json's `cash` flag marks pure cash-shop cosmetic overlays (e.g. Illusion
// Ring) that never actually occupy their slot in-game -- confirmed against the raw .wz
// dump to exclude real cash-shop-SOLD but stat-bearing gear like the Eternal Wedding
// Ring, which does not carry this flag. Checked empty across all 50k+ flagged entries:
// none carry any combat stat, so it's a safe drop for slots with a non-cash source to
// fall back to. Pet/pet-equip are the one exception: every real, wearable item there is
// cash-shop-sourced (there's no "real gear" alternative like Eternal Wedding Ring to
// preserve), so the flag there means "cash-shop sourced" rather than "overlay junk" --
// applying it would empty both pickers entirely, so those two slots are exempt.
const CASH_FILTER_EXEMPT_SLOTS = new Set(["pet", "petequip"]);
const isCashCosmetic = (rawId) => statEntries[rawId]?.cash === true;

/**
 * Pet/pet-equip compatibility: pets list which pet-equip ids they can wear (`wearableEquips`),
 * and pet-equips list which pet ids can wear them (`wearablePets`). Carried through as extra
 * fields on the served item alongside (or in place of) stats.
 * @param {string} slot
 * @param {Record<string, unknown>} entry
 */
function wearableLinks(slot, entry) {
  if (slot === "pet" && Array.isArray(entry.wearableEquips)) return { wearableEquips: entry.wearableEquips };
  if (slot === "petequip" && Array.isArray(entry.wearablePets)) return { wearablePets: entry.wearablePets };
  return undefined;
}

/**
 * Nearly every equipment slot ships cash-shop/event reissues that share a display name
 * and icon but differ by id — these surfaced as duplicate rows in the setup picker (e.g.
 * "Dusk" three times, "MVP Bronze" twice, "Crystal Ventus Badge" twice). But name+icon
 * alone isn't proof of a true duplicate: MapleStory also reuses a
 * name+icon across genuinely different items — e.g. two "Eternal Wedding Ring" ids grant
 * +5 vs +7 all stats, and growth-series weapons repeat a name+icon at each level
 * breakpoint with different stats. So this also requires the full stat block to match
 * before collapsing (this caught 4 already-live totem groups that had been wrongly
 * merged under the old name+icon-only key). Stat-less cosmetics (nothing to compare)
 * additionally require the same 5-digit id-type-prefix, since some ship one id per
 * weapon/armor *type* sharing a single name+icon (e.g. "Chaos Potion" weapon covers
 * exist as ~21 ids, one per weapon type) — collapsing those would delete the cover for
 * every type but the survivor.
 * Keeps the first id as canonical, unions the wearable* compatibility list across the
 * group (pet/petequip only — excluded from the stats-match comparison so differing
 * compatibility lists still merge-and-union instead of blocking the match), and
 * returns `canonicalById` so the *paired* slot's id cross-references can be remapped
 * to ids that still exist after the collapse.
 *
 * `requireSamePrefix` (weapon/secondary only) makes the 5-digit prefix match mandatory
 * even when stats are identical: `weaponPrefixesForClass`/`secondarySpecForClass`
 * (classBranch.ts) filter those pickers to a class's exact weapon/secondary TYPE by this
 * same prefix downstream, so a cross-prefix merge — even of two entries with byte-identical
 * stats — would delete the type-specific id a differently-typed class depends on (e.g. the
 * Lv100 "Chaos Potion" set weapon ships as one same-stat id per one-handed weapon type;
 * collapsing sword/axe/blunt into one survivor would remove it from axe/blunt users' pickers).
 * Ring/hat/title/totem/pet have no such per-type prefix filtering, so a stats match is
 * sufficient proof there regardless of prefix (e.g. ring reissues that only changed
 * flavor text land at a new prefix but keep identical stats).
 *
 * `upgradeSlots` is also excluded from the stats-match comparison (same treatment as
 * `linkKey`): the same weapon/ring/hat is routinely reissued at a different starting
 * slot count (e.g. two "Arcane Umbra Spirit Walker Fan" ids, byte-identical otherwise,
 * at 10 vs. 9 slots) — this isn't a different item the way an Eternal Wedding Ring's
 * +5-vs-+7 stat difference is, it's incidental drop variance the picker has no use for
 * (found affecting 67 of 75 duplicate-name weapon groups alone).
 * @param {Array<[string,string]|[string,string,object]>} items
 * @param {"wearableEquips"|"wearablePets"} [linkKey] omitted for slots with no cross-slot links
 * @param {boolean} [requireSamePrefix]
 */
function dedupeByName(items, linkKey, requireSamePrefix) {
  const byKey = new Map();
  const canonicalById = new Map();
  for (const [id, name, stats] of items) {
    const compareStats = stats ? { ...stats, upgradeSlots: undefined, ...(linkKey ? { [linkKey]: undefined } : null) } : stats;
    const typePrefix = id.slice(0, 5);
    const statsKey = compareStats ? JSON.stringify(compareStats) : `noStats:${typePrefix}`;
    const key = requireSamePrefix ? `${name} ${iconHash(id)} ${typePrefix} ${statsKey}` : `${name} ${iconHash(id)} ${statsKey}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, stats ? [id, name, { ...stats }] : [id, name]);
      canonicalById.set(id, id);
      continue;
    }
    canonicalById.set(id, existing[0]);
    const links = stats?.[linkKey];
    if (links?.length) {
      const target = existing[2] ?? (existing[2] = {});
      target[linkKey] = [...new Set([...(target[linkKey] ?? []), ...links])];
    }
  }
  return { deduped: [...byKey.values()], canonicalById };
}

/** Rewrites a slot's id cross-reference list to canonical ids (dropping now-dead ids). */
function remapLinks(items, linkKey, canonicalById) {
  for (const item of items) {
    const links = item[2]?.[linkKey];
    if (!links) continue;
    item[2][linkKey] = [...new Set(links.map((id) => canonicalById.get(id) ?? id))];
  }
}

mkdirSync(OUTPUT_DIR, { recursive: true });

// In the item data, a stat-bearing item's `islot` is the slot/type code it occupies:
// "Wp"/"WpSi" = a primary weapon (WpSi = two-handed, also blocks the secondary slot),
// "Si" = a pure secondary (katara, Magic Arrows, Soul Ring, shields, …). The game files
// lump both primary weapons and secondaries under the Character/Weapon category, so the
// weapon and secondary picker files are split apart here by `islot`.
const isSecondaryIslot = (stats) => stats?.islot === "Si";

// Maps each slot name to which item categories and optional ID prefixes match it.
// prefixes: 5-character string prefixes of the raw item ID (zero-padded).
// where(rawId, entry, stats): optional override predicate; when present, cats/prefixes
//   are ignored and the item is included iff where() returns true.
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
  // Primary weapons: Character/Weapon minus the Si secondaries (cosmetics have no stats
  // and stay here — they're weapons).
  weapon:    { where: (_id, entry, stats) => entry.category === "Character/Weapon" && !isSecondaryIslot(stats) },
  // Secondaries: shields plus the Si-coded items mislabeled as Character/Weapon.
  secondary: { where: (_id, entry, stats) => entry.category === "Character/Shield" || (entry.category === "Character/Weapon" && isSecondaryIslot(stats)) },
  android:   { cats: ["Character/Android"], prefixes: ["01662"] },
  heart:     { cats: ["Character/Android"], prefixes: ["01672"] },
  title:     { cats: ["Item/Install"], prefixes: ["03700"] },
  totem:     { cats: ["Character/Totem"] },
  pet:       { cats: ["Item/Pet"] },
  petequip:  { cats: ["Character/PetEquip"] },
};

/** @type {Record<string, Array<[string, string] | [string, string, object]>>} */
const outputs = {};

for (const [slot, filter] of Object.entries(SLOT_FILTERS)) {
  const items = [];

  for (const [rawId, entry] of Object.entries(entries)) {
    if (!entry.name) continue;
    if (!CASH_FILTER_EXEMPT_SLOTS.has(slot) && isCashCosmetic(rawId)) continue;
    const stats = servedStats(rawId, entry.name);
    if (filter.where) {
      if (!filter.where(rawId, entry, stats)) continue;
    } else {
      if (!filter.cats.includes(entry.category)) continue;
      if (filter.prefixes && !filter.prefixes.some((p) => rawId.startsWith(p))) continue;
    }
    const combined = stats || wearableLinks(slot, entry) ? { ...stats, ...wearableLinks(slot, entry) } : undefined;
    items.push(combined ? [rawId, entry.name, combined] : [rawId, entry.name]);
  }

  outputs[slot] = items;
}

// Collapse duplicate-named items across every slot. Pet and pet-equip are a
// cross-referenced pair, so their compatibility ids get remapped to the survivor's
// canonical id afterward; weapon/secondary need the extra type-prefix guard
// (requireSamePrefix, see dedupeByName's doc comment); every other slot has no such
// cross-slot concern and uses the plain name+icon+stats match.
if (!ICON_DIR || !existsSync(ICON_DIR)) {
  console.warn(`⚠ EQUIP_ICON_DIR ${ICON_DIR ? `(${ICON_DIR}) not found` : "unset"} — skipping all slot dedup. Picker may show duplicate names.`);
} else {
  if (outputs.pet && outputs.petequip) {
    const pet = dedupeByName(outputs.pet, "wearableEquips");
    const petequip = dedupeByName(outputs.petequip, "wearablePets");
    remapLinks(pet.deduped, "wearableEquips", petequip.canonicalById);
    remapLinks(petequip.deduped, "wearablePets", pet.canonicalById);
    outputs.pet = pet.deduped;
    outputs.petequip = petequip.deduped;
  }
  for (const slot of ["weapon", "secondary"]) {
    if (outputs[slot]) outputs[slot] = dedupeByName(outputs[slot], undefined, true).deduped;
  }
  for (const slot of Object.keys(SLOT_FILTERS)) {
    if (slot === "pet" || slot === "petequip" || slot === "weapon" || slot === "secondary") continue;
    if (outputs[slot]) outputs[slot] = dedupeByName(outputs[slot]).deduped;
  }
}

/**
 * Destiny-tier weapons (name-prefixed "Destiny ", onlyEquip) exist in exactly two
 * liberation stages sharing one name — Part 1 (lower upgradeSlots) and Part 2 (one
 * higher). A few weapon types (e.g. Destiny Energy Chain) also carry two class-branch
 * variants distinguished by setItemID, each with its own Part 1/2 pair, so group by
 * (name, setItemID) before ranking — id order matches liberation order in every case
 * checked (including the one tie, Destiny Gram, where upgradeSlots alone can't tell
 * them apart). Only labels names that actually form a clean pair.
 * @param {Array<[string,string]|[string,string,object]>} allItems
 */
function destinyPartLabels(allItems) {
  const groups = new Map();
  for (const [id, name, stats] of allItems) {
    if (!name.startsWith("Destiny ") || !stats?.onlyEquip) continue;
    const key = `${name}|${stats.setItemID ?? ""}`;
    (groups.get(key) ?? groups.set(key, []).get(key)).push(id);
  }
  const labels = new Map();
  for (const ids of groups.values()) {
    if (ids.length !== 2) continue;
    const [part1, part2] = [...ids].sort();
    labels.set(part1, "Part 1");
    labels.set(part2, "Part 2");
  }
  return labels;
}

/**
 * Astra secondaries (all named "Astra <Type>") come in 3 enhancement stages sharing one
 * name. Stage order matches ascending id — verified for both id schemes in use: most
 * share a dedicated id range with the stage baked into the trailing digit, but a
 * handful of shield/katara Astra items reuse their base type's id range as a plain
 * sequential triplet instead. Grouping by name and ranking by ascending id handles both
 * without hardcoding either numbering scheme.
 * @param {Array<[string,string]|[string,string,object]>} allItems
 */
function astraStageLabels(allItems) {
  const groups = new Map();
  for (const [id, name] of allItems) {
    if (!name.startsWith("Astra ")) continue;
    (groups.get(name) ?? groups.set(name, []).get(name)).push(id);
  }
  const labels = new Map();
  for (const ids of groups.values()) {
    if (ids.length !== 3) continue;
    [...ids].sort().forEach((id, i) => labels.set(id, `Stage ${i + 1}`));
  }
  return labels;
}

// Drop confirmed leftover/regional-ghost/cafe-only ids first, before computing any
// label — a same-name group's disambiguation only needs to account for who's actually
// left in the served picker, not who the audit also considered and rejected.
for (const [slot, items] of Object.entries(outputs)) {
  outputs[slot] = items.filter(([id]) => !verdictsByKey.get(`${slot}|${id}`)?.drop);
}

// Computed across every slot's items combined (not just weapon/secondary individually)
// since Zero's dual-wield secondary picker pools weapon.json + secondary.json together —
// a Destiny/Astra name's parts/stages must group correctly regardless of which slot(s)
// happen to be looked at downstream.
const survivingItems = Object.values(outputs).flat();
const destinyLabels = destinyPartLabels(survivingItems);
const astraLabels = astraStageLabels(survivingItems);

// How many items with this exact (pre-label) name survived the drop pass, per slot.
// A label exists to tell two same-name rows apart — if the audit dropped every sibling
// and only one id is left standing, there's nothing left to disambiguate, so the label
// (often just verdict leftovers like "9 slots" describing a now-gone non-GMS twin)
// becomes pure noise. Grouped by slot+name for the same cross-slot-collision reason as
// branchSplitNoLabelIds above.
const survivorCounts = new Map();
for (const [slot, items] of Object.entries(outputs)) {
  for (const [, name] of items) {
    const key = `${slot}|${name}`;
    survivorCounts.set(key, (survivorCounts.get(key) ?? 0) + 1);
  }
}

// reqJob bitmask bit per equip branch (Warrior/Magician/Bowman/Thief/Pirate), mirrored
// from setup/data/classBranch.ts's BRANCH_BIT — keep in sync if that ever changes.
const BRANCH_BIT = { warrior: 1, magician: 2, bowman: 4, thief: 8, pirate: 16 };
// Every class's reqJob bitmask, but ONLY the ones spanning 2+ branches — mirrored from
// classBranch.ts's CLASS_BRANCHES. Single-branch classes never matter here: a same-
// name+icon group split one-variant-per-branch (e.g. Challenger Hat) is only ever seen
// as more than one row by a class whose own mask covers more than one of that group's
// branches, which today is Xenon alone. Add an entry here if a future class spans
// multiple branches too.
const MULTI_BRANCH_MASKS = [BRANCH_BIT.thief | BRANCH_BIT.pirate]; // Xenon

/**
 * Some same-name+icon groups (e.g. Challenger Hat) are a clean "one variant per equip
 * branch" split, each item gated by a single-bit `reqJob` (Warrior xor Magician xor
 * Bowman xor Thief xor Pirate). A disambiguating label on every variant is needed only
 * for the sub-branches a MULTI_BRANCH_MASKS class can see 2+ of at once (currently just
 * Xenon's Thief+Pirate) — every other branch is only ever shown alone in any class's
 * picker, so the label is pure noise there (e.g. Lara, single-branch Magician, would
 * see "Challenger Hat (Challenger Set (Magician) · ...)" when a bare "Challenger Hat"
 * is unambiguous for her). Labels are baked in once per id at generation time (not
 * per-viewing-class), so a branch that's part of some other class's ambiguous pair
 * keeps its label everywhere it's shown, even to classes who only ever see that one
 * variant alone — there's no way around that without per-class-conditional serving.
 * Returns the set of ids whose label should be suppressed. Grouped by slot+name, not
 * name alone — an id from one slot must never merge with a same-named id from another
 * (e.g. a pet and a weapon can share a name; this has bitten an earlier ad-hoc pinning
 * pass in this project's history).
 * @param {Record<string, Array<[string,string]|[string,string,object]>>} bySlot
 */
function branchSplitNoLabelIds(bySlot) {
  const groups = new Map();
  for (const [slot, items] of Object.entries(bySlot)) {
    for (const [id, name, stats] of items) {
      const key = `${slot}|${name}`;
      (groups.get(key) ?? groups.set(key, []).get(key)).push({ id, reqJob: stats?.reqJob });
    }
  }
  const noLabel = new Set();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const jobs = group.map((it) => it.reqJob);
    if (!jobs.every((j) => Object.values(BRANCH_BIT).includes(j))) continue;
    if (new Set(jobs).size !== jobs.length) continue;
    for (const it of group) {
      const coOccurs = MULTI_BRANCH_MASKS.some((mask) => (mask & it.reqJob) !== 0 && group.some((sib) => sib !== it && (mask & sib.reqJob) !== 0));
      if (!coOccurs) noLabel.add(it.id);
    }
  }
  return noLabel;
}
const branchSplitSuppressed = branchSplitNoLabelIds(outputs);

/**
 * The audit's verdict/mechanical labels list every differing stat (e.g. "Lv48 ·
 * M.ATT+63 · 9 slots"), but usually only one or two fields actually distinguish a
 * group's items -- the rest just ride along (e.g. Cromi's two tiers only need
 * "Lv48"/"Lv38", not the M.ATT/slot values that happen to differ too). A field only
 * earns a spot in the output once it starts telling apart items that were still tied
 * going into it -- not just "is this among the first N fields" (a plain prefix would
 * force Reminiscence Memorial Staff's "Lv10 · ATT+15 · M.ATT+25"/"...M.ATT+23" pair to
 * show ATT+15 on both even though every other item in the group already stops needing
 * anything past Lv10, and the pair only actually differs on M.ATT).
 *
 * Walks field position 0, 1, 2, ... across the whole group at once, splitting into
 * "clusters" of ids still sharing an identical chosen-field-sequence so far. At each
 * position: if a cluster's items disagree on that field, the field is kept (for every
 * member of that cluster) and the cluster re-splits by that field's value; if they all
 * agree, the field is silently skipped (it wouldn't add any information) and the
 * cluster carries on tied into the next position. Stops once every cluster has shrunk
 * to size 1. A cluster that's still tied after every field runs out (true duplicate
 * labels) falls back to each member's full, unmodified label.
 * @param {Map<string,string>} labelsById one same-name group's id -> resolved label
 */
function minimalDistinguishingLabel(labelsById) {
  const ids = [...labelsById.keys()];
  const fragmentsById = new Map(ids.map((id) => [id, labelsById.get(id).split(" · ")]));
  const maxLen = Math.max(...ids.map((id) => fragmentsById.get(id).length));
  const chosenFields = new Map(ids.map((id) => [id, []]));

  let clusters = [ids];
  for (let pos = 0; pos < maxLen && clusters.some((c) => c.length > 1); pos++) {
    const nextClusters = [];
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        nextClusters.push(cluster);
        continue;
      }
      const byValue = new Map();
      for (const id of cluster) {
        const v = fragmentsById.get(id)[pos] ?? "";
        (byValue.get(v) ?? byValue.set(v, []).get(v)).push(id);
      }
      if (byValue.size === 1) {
        nextClusters.push(cluster); // field agrees across the whole cluster -- skip it
        continue;
      }
      // A shorter label (this item simply has no field at `pos`, distinct from an
      // empty-but-present field) still splits the cluster correctly via the "" bucket
      // above, but must never push an empty string as a "shown" field -- that produces
      // a dangling " · " with nothing after it. Items with no value here just get
      // nothing added at this position instead.
      for (const id of cluster) {
        const v = fragmentsById.get(id)[pos];
        if (v !== undefined) chosenFields.get(id).push(v);
      }
      nextClusters.push(...byValue.values());
    }
    clusters = nextClusters;
  }

  const result = new Map();
  for (const cluster of clusters) {
    for (const id of cluster) {
      const chosen = chosenFields.get(id);
      result.set(id, cluster.length === 1 && chosen.length ? chosen.join(" · ") : labelsById.get(id));
    }
  }
  return result;
}

/**
 * A handful of pinned verdict labels embed their own "(...)" segment (e.g. a weapon-
 * type tag written as "(One-Handed Sword) Lv30", or a set/branch tag written as
 * "Eternal Set (Pirate) · STR+150") instead of the plain " · "-joined field list used
 * everywhere else. Left alone, that becomes a nested double-paren once the whole label
 * gets its own outer wrap (e.g. "Name ((One-Handed Sword) Lv30)"). Reflows any embedded
 * "(...)" into an ordinary field, so it also becomes independently truncatable by
 * minimalDistinguishingLabel instead of being stuck as one solid chunk. A label with no
 * embedded parens (the common case, and short single-word tags like "(Spear)") is
 * returned unchanged.
 * @param {string} label
 */
function reflowLabel(label) {
  const parts = label
    .split(/\s*\(([^()]+)\)\s*/)
    .map((p) => p.replace(/^\s*·\s*|\s*·\s*$/g, "").trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.join(" · ") : label;
}

/**
 * A "Destiny X" name can span TWO separate icon-based audit groups (Part 1's icon vs
 * Part 2's, which usually differ) -- each gets its own class-branch verdict label
 * resolved independently (e.g. "Eternal Set (Pirate)"), with nothing cross-checking
 * that both parts land on the same served name and can therefore still collide with
 * each other (Destiny Energy Chain: Part 1 Pirate and Part 2 Pirate both verdict-
 * labeled "Eternal Set (Pirate) ... STR+190" -- byte-identical served names, the exact
 * bug this whole audit exists to prevent). Inserts the mechanical Part label as the
 * verdict label's 2nd field (right after its branch/type tag) so minimalDistinguishingLabel
 * can tell the two apart -- unless the verdict label already spells out the part
 * itself (Destiny Celestial Light's verdict already says "Part 1"/"Part 2" verbatim,
 * a human override of a wiki mistake; don't double it up).
 * @param {string|undefined} verdictLabel already reflowed
 * @param {string|undefined} partLabel
 */
function withDestinyPart(verdictLabel, partLabel) {
  if (!partLabel) return verdictLabel;
  if (!verdictLabel) return partLabel;
  const frags = verdictLabel.split(" · ");
  if (frags.includes(partLabel)) return verdictLabel;
  frags.splice(1, 0, partLabel);
  return frags.join(" · ");
}

/**
 * Fields present on literally every item's label in a same-name group carry zero
 * disambiguating value (e.g. "Eternal Set" on all 4 Destiny Energy Chain ids -- every
 * item already reads as a Destiny Energy Chain, so restating its set name teaches
 * nothing new). Strips them before minimalDistinguishingLabel runs, so its per-item
 * minimization isn't wasted keeping a field that could never help tell two items
 * apart to begin with.
 * @param {Map<string,string>} labelsById one same-name group's id -> resolved label
 */
function stripGroupWideRedundantFragments(labelsById) {
  const ids = [...labelsById.keys()];
  if (ids.length < 2) return labelsById;
  const fragmentsById = new Map(ids.map((id) => [id, labelsById.get(id).split(" · ")]));
  const [first, ...rest] = ids.map((id) => new Set(fragmentsById.get(id)));
  const common = [...first].filter((f) => rest.every((set) => set.has(f)));
  if (!common.length) return labelsById;
  const result = new Map();
  for (const id of ids) {
    const kept = fragmentsById.get(id).filter((f) => !common.includes(f));
    result.set(id, kept.length ? kept.join(" · ") : labelsById.get(id));
  }
  return result;
}

// Resolve every surviving item's label first (Astra stage always wins outright;
// otherwise the verdict label with any Destiny part folded in, per withDestinyPart --
// branchSplitSuppressed and a sub-2 survivorCounts both mean no label is worth showing
// at all), then strip group-wide-redundant fields and shorten each same-name group's
// labels together via minimalDistinguishingLabel before baking any of them into a served name.
const resolvedLabelById = new Map();
for (const [slot, items] of Object.entries(outputs)) {
  for (const [id, name] of items) {
    if (branchSplitSuppressed.has(id)) continue;
    if ((survivorCounts.get(`${slot}|${name}`) ?? 0) < 2) continue;
    if (astraLabels.has(id)) {
      resolvedLabelById.set(id, astraLabels.get(id));
      continue;
    }
    const verdictLabel = verdictsByKey.get(`${slot}|${id}`)?.label;
    const label = withDestinyPart(verdictLabel ? reflowLabel(verdictLabel) : undefined, destinyLabels.get(id));
    if (label) resolvedLabelById.set(id, label);
  }
}
const labelGroups = new Map();
for (const [slot, items] of Object.entries(outputs)) {
  for (const [id, name] of items) {
    if (!resolvedLabelById.has(id)) continue;
    const key = `${slot}|${name}`;
    (labelGroups.get(key) ?? labelGroups.set(key, new Map()).get(key)).set(id, resolvedLabelById.get(id));
  }
}
for (const group of labelGroups.values()) {
  const stripped = stripGroupWideRedundantFragments(group);
  for (const [id, label] of minimalDistinguishingLabel(stripped)) resolvedLabelById.set(id, label);
}

for (const [slot, items] of Object.entries(outputs)) {
  outputs[slot] = items.map(([id, name, stats]) => {
    const label = resolvedLabelById.get(id);
    if (!label) return stats ? [id, name, stats] : [id, name];
    const labeled = withVerdictLabel(name, label);
    return stats ? [id, labeled, stats] : [id, labeled];
  });
}

for (const [slot, items] of Object.entries(outputs)) {
  const outputPath = resolve(OUTPUT_DIR, `${slot}.json`);
  writeFileSync(outputPath, JSON.stringify(items));
  console.log(`${slot}: ${items.length} items → ${slot}.json`);
}

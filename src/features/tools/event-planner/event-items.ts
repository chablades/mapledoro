/*
  Equipment items available for the Star Force Event Planner.
  Icons sourced from maplestorywiki.net CDN.

  AbsoLab, Arcane Umbra, and Eternal sets use an Overall (not separate
  Top/Bottom). All armor slots have class-specific variants (Knight,
  Mage, Archer, Thief, Pirate). The wiki CDN has class-specific icons
  for Hats and Overalls; Shoes, Gloves, Cape, and Shoulder share a
  single generic icon per set.
*/

const CDN = "https://media.maplestorywiki.net/yetidb";

export interface EventItem {
  id: string;
  name: string;
  slot: string;
  level: number;
  category: string;
  icon: string;
}

export interface ItemCategory {
  id: string;
  label: string;
}

export const ITEM_CATEGORIES: ItemCategory[] = [
  { id: "absolab", label: "AbsoLab" },
  { id: "arcane", label: "Arcane Umbra" },
  { id: "eternal", label: "Eternal" },
  { id: "cra", label: "Chaos Root Abyss" },
  { id: "dawn", label: "Dawn Boss" },
  { id: "pitched", label: "Pitched Boss" },
  { id: "brilliant", label: "Brilliant Boss" },
  { id: "gollux", label: "Gollux" },
  { id: "misc", label: "Misc" },
];

const CATEGORY_MAP = new Map(ITEM_CATEGORIES.map((c) => [c.id, c.label]));

export function categoryLabel(id: string): string {
  return CATEGORY_MAP.get(id) ?? id;
}

function eqp(name: string): string {
  return `${CDN}/Eqp_${name.replace(/ /g, "_").replace(/'/g, "%27")}.png`;
}

/** Maximum star force level based on item level (GMS post-NEXT). */
export function maxStarForLevel(level: number): number {
  if (level >= 138) return 25;
  if (level >= 128) return 20;
  if (level >= 118) return 15;
  if (level >= 108) return 10;
  if (level >= 95) return 8;
  return 5;
}

// ── Class-branched set generation ───────────────────────────────────────────

type ClassName = "Knight" | "Mage" | "Archer" | "Thief" | "Pirate";
const ALL_CLASSES: ClassName[] = ["Knight", "Mage", "Archer", "Thief", "Pirate"];

interface SetConfig {
  idPrefix: string;
  setName: string;
  level: number;
  category: string;
  /** Per-class hat display name suffix + icon override (null = use display name). */
  hats: Record<ClassName, { suffix: string; icon: string }>;
  /** Per-class overall display name suffix + icon override. */
  overalls: Record<ClassName, { suffix: string; icon: string }>;
  /** Generic icon base name for shared slots (Shoes, Gloves, Cape, Shoulder). */
  genericBase: string;
}

function makeSetItems(cfg: SetConfig): EventItem[] {
  const items: EventItem[] = [];
  const { idPrefix, setName, level, category, genericBase } = cfg;

  for (const cls of ALL_CLASSES) {
    const slug = cls.toLowerCase();
    const hat = cfg.hats[cls];
    const overall = cfg.overalls[cls];

    items.push(
      { id: `${idPrefix}-${slug}-hat`, name: `${setName} ${cls} ${hat.suffix}`, slot: "Hat", level, category, icon: eqp(hat.icon) },
      { id: `${idPrefix}-${slug}-overall`, name: `${setName} ${cls} ${overall.suffix}`, slot: "Overall", level, category, icon: eqp(overall.icon) },
      { id: `${idPrefix}-${slug}-shoes`, name: `${setName} ${cls} Shoes`, slot: "Shoes", level, category, icon: eqp(`${genericBase} Shoes`) },
      { id: `${idPrefix}-${slug}-gloves`, name: `${setName} ${cls} Gloves`, slot: "Gloves", level, category, icon: eqp(`${genericBase} Gloves`) },
      { id: `${idPrefix}-${slug}-cape`, name: `${setName} ${cls} Cape`, slot: "Cape", level, category, icon: eqp(`${genericBase} Cape`) },
      { id: `${idPrefix}-${slug}-shoulder`, name: `${setName} ${cls} Shoulder`, slot: "Shoulder", level, category, icon: eqp(`${genericBase} Shoulder`) },
    );
  }

  return items;
}

// Hat/Overall icon mappings — verified against CDN (200 OK).
// Where a class-specific icon is missing, falls back to a known-good one.

const ABSOLAB_CFG: SetConfig = {
  idPrefix: "absolab", setName: "AbsoLab", level: 160, category: "absolab",
  genericBase: "AbsoLab",
  hats: {
    Knight: { suffix: "Helm", icon: "AbsoLab Knight Helm" },
    Mage:   { suffix: "Hat",  icon: "AbsoLab Knight Helm" },
    Archer: { suffix: "Hat",  icon: "AbsoLab Knight Helm" },
    Thief:  { suffix: "Hat",  icon: "AbsoLab Knight Helm" },
    Pirate: { suffix: "Hat",  icon: "AbsoLab Knight Helm" },
  },
  overalls: {
    Knight: { suffix: "Suit", icon: "AbsoLab Knight Suit" },
    Mage:   { suffix: "Suit", icon: "AbsoLab Mage Suit" },
    Archer: { suffix: "Suit", icon: "AbsoLab Archer Suit" },
    Thief:  { suffix: "Suit", icon: "AbsoLab Knight Suit" },
    Pirate: { suffix: "Suit", icon: "AbsoLab Pirate Suit" },
  },
};

const ARCANE_CFG: SetConfig = {
  idPrefix: "arcane", setName: "Arcane Umbra", level: 200, category: "arcane",
  genericBase: "Arcane Umbra",
  hats: {
    Knight: { suffix: "Hat", icon: "Arcane Umbra Knight Hat" },
    Mage:   { suffix: "Hat", icon: "Arcane Umbra Mage Hat" },
    Archer: { suffix: "Hat", icon: "Arcane Umbra Archer Hat" },
    Thief:  { suffix: "Hat", icon: "Arcane Umbra Thief Hat" },
    Pirate: { suffix: "Hat", icon: "Arcane Umbra Pirate Hat" },
  },
  overalls: {
    Knight: { suffix: "Suit", icon: "Arcane Umbra Knight Suit" },
    Mage:   { suffix: "Suit", icon: "Arcane Umbra Mage Suit" },
    Archer: { suffix: "Suit", icon: "Arcane Umbra Archer Suit" },
    Thief:  { suffix: "Suit", icon: "Arcane Umbra Thief Suit" },
    Pirate: { suffix: "Suit", icon: "Arcane Umbra Pirate Suit" },
  },
};

const ETERNAL_CFG: SetConfig = {
  idPrefix: "eternal", setName: "Eternal", level: 250, category: "eternal",
  genericBase: "Eternal",
  hats: {
    Knight: { suffix: "Helm",  icon: "Eternal Knight Helm" },
    Mage:   { suffix: "Hat",   icon: "Eternal Mage Hat" },
    Archer: { suffix: "Hat",   icon: "Eternal Archer Hat" },
    Thief:  { suffix: "Hat",   icon: "Eternal Knight Helm" },
    Pirate: { suffix: "Hat",   icon: "Eternal Pirate Hat" },
  },
  overalls: {
    Knight: { suffix: "Armor", icon: "Eternal Knight Armor" },
    Mage:   { suffix: "Robe",  icon: "Eternal Mage Robe" },
    Archer: { suffix: "Suit",  icon: "Eternal Knight Armor" },
    Thief:  { suffix: "Suit",  icon: "Eternal Knight Armor" },
    Pirate: { suffix: "Coat",  icon: "Eternal Pirate Coat" },
  },
};

// ── Item list ───────────────────────────────────────────────────────────────

export const EVENT_ITEMS: readonly EventItem[] = [
  // ── AbsoLab (Lv 160) — 30 armor + 1 weapon ───────────────────────────────
  ...makeSetItems(ABSOLAB_CFG),
  { id: "absolab-weapon", name: "AbsoLab Weapon", slot: "Weapon", level: 160, category: "absolab", icon: eqp("AbsoLab Broad Saber") },

  // ── Arcane Umbra (Lv 200) — 30 armor + 1 weapon ──────────────────────────
  ...makeSetItems(ARCANE_CFG),
  { id: "arcane-weapon", name: "Arcane Umbra Weapon", slot: "Weapon", level: 200, category: "arcane", icon: eqp("Arcane Umbra Two-handed Sword") },

  // ── Eternal (Lv 250) — 30 armor, no weapon ───────────────────────────────
  ...makeSetItems(ETERNAL_CFG),

  // ── Chaos Root Abyss (Lv 150) — class-specific hat/top/bottom ──────────────
  // Warrior
  { id: "cra-warrior-hat", name: "Royal Warrior Helm", slot: "Hat", level: 150, category: "cra", icon: eqp("Royal Warrior Helm") },
  { id: "cra-warrior-top", name: "Eagle Eye Warrior Armor", slot: "Top", level: 150, category: "cra", icon: eqp("Eagle Eye Warrior Armor") },
  { id: "cra-warrior-bottom", name: "Trixter Warrior Pants", slot: "Bottom", level: 150, category: "cra", icon: eqp("Trixter Warrior Pants") },
  // Mage
  { id: "cra-mage-hat", name: "Royal Dunwitch Hat", slot: "Hat", level: 150, category: "cra", icon: eqp("Royal Dunwitch Hat") },
  { id: "cra-mage-top", name: "Eagle Eye Dunwitch Robe", slot: "Top", level: 150, category: "cra", icon: eqp("Eagle Eye Dunwitch Robe") },
  { id: "cra-mage-bottom", name: "Trixter Dunwitch Pants", slot: "Bottom", level: 150, category: "cra", icon: eqp("Trixter Dunwitch Pants") },
  // Bowman
  { id: "cra-archer-hat", name: "Royal Ranger Beret", slot: "Hat", level: 150, category: "cra", icon: eqp("Royal Ranger Beret") },
  { id: "cra-archer-top", name: "Eagle Eye Ranger Cowl", slot: "Top", level: 150, category: "cra", icon: eqp("Eagle Eye Ranger Cowl") },
  { id: "cra-archer-bottom", name: "Trixter Ranger Pants", slot: "Bottom", level: 150, category: "cra", icon: eqp("Trixter Ranger Pants") },
  // Thief
  { id: "cra-thief-hat", name: "Royal Assassin Hood", slot: "Hat", level: 150, category: "cra", icon: eqp("Royal Assassin Hood") },
  { id: "cra-thief-top", name: "Eagle Eye Assassin Shirt", slot: "Top", level: 150, category: "cra", icon: eqp("Eagle Eye Assassin Shirt") },
  { id: "cra-thief-bottom", name: "Trixter Assassin Pants", slot: "Bottom", level: 150, category: "cra", icon: eqp("Trixter Assassin Pants") },
  // Pirate
  { id: "cra-pirate-hat", name: "Royal Wanderer Hat", slot: "Hat", level: 150, category: "cra", icon: eqp("Royal Wanderer Hat") },
  { id: "cra-pirate-top", name: "Eagle Eye Wanderer Coat", slot: "Top", level: 150, category: "cra", icon: eqp("Eagle Eye Wanderer Coat") },
  { id: "cra-pirate-bottom", name: "Trixter Wanderer Pants", slot: "Bottom", level: 150, category: "cra", icon: eqp("Trixter Wanderer Pants") },
  // Weapon
  { id: "cra-weapon", name: "Fafnir Weapon", slot: "Weapon", level: 150, category: "cra", icon: eqp("Fafnir Mistilteinn") },

  // ── Dawn Boss ──────────────────────────────────────────────────────────────
  { id: "dawn-ring", name: "Dawn Guardian Angel Ring", slot: "Ring", level: 160, category: "dawn", icon: eqp("Guardian Angel Ring") },
  { id: "dawn-pendant", name: "Daybreak Pendant", slot: "Pendant", level: 140, category: "dawn", icon: eqp("Daybreak Pendant") },
  { id: "dawn-earring", name: "Estella Earrings", slot: "Earring", level: 160, category: "dawn", icon: eqp("Estella Earrings") },
  { id: "dawn-face", name: "Twilight Mark", slot: "Face", level: 140, category: "dawn", icon: eqp("Twilight Mark") },

  // ── Pitched Boss (star force eligible) ─────────────────────────────────────
  { id: "pitched-berserked", name: "Berserked", slot: "Face", level: 160, category: "pitched", icon: eqp("Berserked") },
  { id: "pitched-eyepatch", name: "Magic Eyepatch", slot: "Eye", level: 160, category: "pitched", icon: eqp("Magic Eyepatch") },
  { id: "pitched-total-control", name: "Total Control", slot: "Heart", level: 200, category: "pitched", icon: eqp("Total Control") },
  { id: "pitched-belt", name: "Dreamy Belt", slot: "Belt", level: 200, category: "pitched", icon: eqp("Dreamy Belt") },
  { id: "pitched-pendant", name: "Source of Suffering", slot: "Pendant", level: 160, category: "pitched", icon: eqp("Source of Suffering") },
  { id: "pitched-earring", name: "Commanding Force Earring", slot: "Earring", level: 200, category: "pitched", icon: eqp("Commanding Force Earring") },
  { id: "pitched-ring", name: "Endless Terror", slot: "Ring", level: 200, category: "pitched", icon: eqp("Endless Terror") },

  // ── Brilliant Boss ────────────────────────────────────────────────────────
  { id: "brilliant-oath", name: "Oath of Death", slot: "Pendant", level: 250, category: "brilliant", icon: eqp("Oath of Death") },
  { id: "brilliant-whisper", name: "Whisper of the Source", slot: "Ring", level: 250, category: "brilliant", icon: eqp("Whisper of the Source") },

  // ── Gollux ─────────────────────────────────────────────────────────────────
  { id: "gollux-sup-ring", name: "Superior Gollux Ring", slot: "Ring", level: 150, category: "gollux", icon: eqp("Superior Gollux Ring") },
  { id: "gollux-sup-pendant", name: "Superior Engraved Gollux Pendant", slot: "Pendant", level: 150, category: "gollux", icon: eqp("Superior Engraved Gollux Pendant") },
  { id: "gollux-sup-earring", name: "Superior Gollux Earrings", slot: "Earring", level: 150, category: "gollux", icon: eqp("Superior Gollux Earrings") },
  { id: "gollux-sup-belt", name: "Superior Engraved Gollux Belt", slot: "Belt", level: 150, category: "gollux", icon: eqp("Superior Engraved Gollux Belt") },
  { id: "gollux-rein-ring", name: "Reinforced Gollux Ring", slot: "Ring", level: 140, category: "gollux", icon: eqp("Reinforced Gollux Ring") },
  { id: "gollux-rein-pendant", name: "Reinforced Engraved Gollux Pendant", slot: "Pendant", level: 140, category: "gollux", icon: eqp("Reinforced Engraved Gollux Pendant") },
  { id: "gollux-rein-earring", name: "Reinforced Gollux Earrings", slot: "Earring", level: 140, category: "gollux", icon: eqp("Reinforced Gollux Earrings") },
  { id: "gollux-rein-belt", name: "Reinforced Engraved Gollux Belt", slot: "Belt", level: 140, category: "gollux", icon: eqp("Reinforced Engraved Gollux Belt") },

  // ── Misc ───────────────────────────────────────────────────────────────────
  { id: "misc-kannas-treasure", name: "Kanna's Treasure", slot: "Ring", level: 140, category: "misc", icon: eqp("Kanna's Treasure") },
  { id: "misc-wings-of-fate", name: "Wings of Fate", slot: "Cape", level: 120, category: "misc", icon: eqp("Wings of Fate") },
  { id: "misc-meister-ring", name: "Meister Ring", slot: "Ring", level: 140, category: "misc", icon: eqp("Meister Ring") },
  { id: "misc-sw-pendant", name: "Sweetwater Pendant", slot: "Pendant", level: 160, category: "misc", icon: eqp("Sweetwater Pendant") },
  { id: "misc-sw-monocle", name: "Sweetwater Monocle", slot: "Eye", level: 160, category: "misc", icon: eqp("Sweetwater Monocle") },
  { id: "misc-black-bean-mark", name: "Black Bean Mark", slot: "Face", level: 135, category: "misc", icon: eqp("Black Bean Mark") },
  { id: "misc-papulatus-mark", name: "Papulatus Mark", slot: "Eye", level: 145, category: "misc", icon: eqp("Papulatus Mark") },
  { id: "misc-dominator-pendant", name: "Dominator Pendant", slot: "Pendant", level: 140, category: "misc", icon: eqp("Dominator Pendant") },
];

export const EVENT_ITEMS_BY_ID = new Map(EVENT_ITEMS.map((item) => [item.id, item]));

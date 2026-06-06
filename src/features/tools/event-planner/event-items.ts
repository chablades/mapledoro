/*
  Equipment items available for the Star Force Event Planner.
  Icons sourced from the MapleResource API (haku.network) via <ItemIcon>;
  `itemId` is the manifest id (manifests/v268/item.json) looked up by name.

  AbsoLab, Arcane Umbra, and Eternal sets use an Overall (not separate
  Top/Bottom) and have class-specific variants (Knight, Mage, Archer,
  Thief, Pirate) for every armor slot.
*/

export interface EventItem {
  id: string;
  name: string;
  slot: string;
  level: number;
  category: string;
  itemId: string;
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

/** Per-class manifest item ids for every armor slot, plus the hat/overall display suffix. */
interface ClassPieces {
  hatSuffix: string;
  overallSuffix: string;
  hat: string;
  overall: string;
  shoes: string;
  gloves: string;
  cape: string;
  shoulder: string;
}

interface SetConfig {
  idPrefix: string;
  setName: string;
  level: number;
  category: string;
  pieces: Record<ClassName, ClassPieces>;
}

function makeSetItems(cfg: SetConfig): EventItem[] {
  const items: EventItem[] = [];
  const { idPrefix, setName, level, category } = cfg;

  for (const cls of ALL_CLASSES) {
    const slug = cls.toLowerCase();
    const p = cfg.pieces[cls];

    items.push(
      { id: `${idPrefix}-${slug}-hat`, name: `${setName} ${cls} ${p.hatSuffix}`, slot: "Hat", level, category, itemId: p.hat },
      { id: `${idPrefix}-${slug}-overall`, name: `${setName} ${cls} ${p.overallSuffix}`, slot: "Overall", level, category, itemId: p.overall },
      { id: `${idPrefix}-${slug}-shoes`, name: `${setName} ${cls} Shoes`, slot: "Shoes", level, category, itemId: p.shoes },
      { id: `${idPrefix}-${slug}-gloves`, name: `${setName} ${cls} Gloves`, slot: "Gloves", level, category, itemId: p.gloves },
      { id: `${idPrefix}-${slug}-cape`, name: `${setName} ${cls} Cape`, slot: "Cape", level, category, itemId: p.cape },
      { id: `${idPrefix}-${slug}-shoulder`, name: `${setName} ${cls} Shoulder`, slot: "Shoulder", level, category, itemId: p.shoulder },
    );
  }

  return items;
}

// itemId values are the per-class, per-slot manifest ids (Thief = "Bandit" set in AbsoLab).

const ABSOLAB_CFG: SetConfig = {
  idPrefix: "absolab", setName: "AbsoLab", level: 160, category: "absolab",
  pieces: {
    Knight: { hatSuffix: "Helm", overallSuffix: "Suit", hat: "01004422", overall: "01052882", shoes: "01073030", gloves: "01082636", cape: "01102775", shoulder: "01152174" },
    Mage:   { hatSuffix: "Hat",  overallSuffix: "Suit", hat: "01004423", overall: "01052887", shoes: "01073032", gloves: "01082637", cape: "01102794", shoulder: "01152176" },
    Archer: { hatSuffix: "Hat",  overallSuffix: "Suit", hat: "01004424", overall: "01052888", shoes: "01073033", gloves: "01082638", cape: "01102795", shoulder: "01152177" },
    Thief:  { hatSuffix: "Hat",  overallSuffix: "Suit", hat: "01004425", overall: "01052889", shoes: "01073034", gloves: "01082639", cape: "01102796", shoulder: "01152178" },
    Pirate: { hatSuffix: "Hat",  overallSuffix: "Suit", hat: "01004426", overall: "01052890", shoes: "01073035", gloves: "01082640", cape: "01102797", shoulder: "01152179" },
  },
};

const ARCANE_CFG: SetConfig = {
  idPrefix: "arcane", setName: "Arcane Umbra", level: 200, category: "arcane",
  pieces: {
    Knight: { hatSuffix: "Hat", overallSuffix: "Suit", hat: "01004808", overall: "01053063", shoes: "01073158", gloves: "01082695", cape: "01102940", shoulder: "01152196" },
    Mage:   { hatSuffix: "Hat", overallSuffix: "Suit", hat: "01004809", overall: "01053064", shoes: "01073159", gloves: "01082696", cape: "01102941", shoulder: "01152197" },
    Archer: { hatSuffix: "Hat", overallSuffix: "Suit", hat: "01004810", overall: "01053065", shoes: "01073160", gloves: "01082697", cape: "01102942", shoulder: "01152198" },
    Thief:  { hatSuffix: "Hat", overallSuffix: "Suit", hat: "01004811", overall: "01053066", shoes: "01073161", gloves: "01082698", cape: "01102943", shoulder: "01152199" },
    Pirate: { hatSuffix: "Hat", overallSuffix: "Suit", hat: "01004812", overall: "01053067", shoes: "01073162", gloves: "01082699", cape: "01102944", shoulder: "01152200" },
  },
};

const ETERNAL_CFG: SetConfig = {
  idPrefix: "eternal", setName: "Eternal", level: 250, category: "eternal",
  pieces: {
    Knight: { hatSuffix: "Helm", overallSuffix: "Armor", hat: "01005980", overall: "01042433", shoes: "01073629", gloves: "01082760", cape: "01103433", shoulder: "01152212" },
    Mage:   { hatSuffix: "Hat",  overallSuffix: "Robe",  hat: "01005981", overall: "01042434", shoes: "01073630", gloves: "01082761", cape: "01103434", shoulder: "01152213" },
    Archer: { hatSuffix: "Hat",  overallSuffix: "Suit",  hat: "01005982", overall: "01042435", shoes: "01073631", gloves: "01082762", cape: "01103435", shoulder: "01152214" },
    Thief:  { hatSuffix: "Hat",  overallSuffix: "Suit",  hat: "01005983", overall: "01042436", shoes: "01073632", gloves: "01082763", cape: "01103436", shoulder: "01152215" },
    Pirate: { hatSuffix: "Hat",  overallSuffix: "Coat",  hat: "01005984", overall: "01042437", shoes: "01073633", gloves: "01082764", cape: "01103437", shoulder: "01152216" },
  },
};

// ── Item list ───────────────────────────────────────────────────────────────

export const EVENT_ITEMS: readonly EventItem[] = [
  // ── AbsoLab (Lv 160) — 30 armor + 1 weapon ───────────────────────────────
  ...makeSetItems(ABSOLAB_CFG),
  { id: "absolab-weapon", name: "AbsoLab Weapon", slot: "Weapon", level: 160, category: "absolab", itemId: "01402251" }, // AbsoLab Broad Saber

  // ── Arcane Umbra (Lv 200) — 30 armor + 1 weapon ──────────────────────────
  ...makeSetItems(ARCANE_CFG),
  { id: "arcane-weapon", name: "Arcane Umbra Weapon", slot: "Weapon", level: 200, category: "arcane", itemId: "01402259" }, // Arcane Umbra Two-handed Sword

  // ── Eternal (Lv 250) — 30 armor, no weapon ───────────────────────────────
  ...makeSetItems(ETERNAL_CFG),

  // ── Chaos Root Abyss (Lv 150) — class-specific hat/top/bottom ──────────────
  // Warrior
  { id: "cra-warrior-hat", name: "Royal Warrior Helm", slot: "Hat", level: 150, category: "cra", itemId: "01003797" },
  { id: "cra-warrior-top", name: "Eagle Eye Warrior Armor", slot: "Top", level: 150, category: "cra", itemId: "01042254" },
  { id: "cra-warrior-bottom", name: "Trixter Warrior Pants", slot: "Bottom", level: 150, category: "cra", itemId: "01062165" },
  // Mage
  { id: "cra-mage-hat", name: "Royal Dunwitch Hat", slot: "Hat", level: 150, category: "cra", itemId: "01003798" },
  { id: "cra-mage-top", name: "Eagle Eye Dunwitch Robe", slot: "Top", level: 150, category: "cra", itemId: "01042255" },
  { id: "cra-mage-bottom", name: "Trixter Dunwitch Pants", slot: "Bottom", level: 150, category: "cra", itemId: "01062166" },
  // Bowman
  { id: "cra-archer-hat", name: "Royal Ranger Beret", slot: "Hat", level: 150, category: "cra", itemId: "01003799" },
  { id: "cra-archer-top", name: "Eagle Eye Ranger Cowl", slot: "Top", level: 150, category: "cra", itemId: "01042256" },
  { id: "cra-archer-bottom", name: "Trixter Ranger Pants", slot: "Bottom", level: 150, category: "cra", itemId: "01062167" },
  // Thief
  { id: "cra-thief-hat", name: "Royal Assassin Hood", slot: "Hat", level: 150, category: "cra", itemId: "01003800" },
  { id: "cra-thief-top", name: "Eagle Eye Assassin Shirt", slot: "Top", level: 150, category: "cra", itemId: "01042257" },
  { id: "cra-thief-bottom", name: "Trixter Assassin Pants", slot: "Bottom", level: 150, category: "cra", itemId: "01062168" },
  // Pirate
  { id: "cra-pirate-hat", name: "Royal Wanderer Hat", slot: "Hat", level: 150, category: "cra", itemId: "01003801" },
  { id: "cra-pirate-top", name: "Eagle Eye Wanderer Coat", slot: "Top", level: 150, category: "cra", itemId: "01042258" },
  { id: "cra-pirate-bottom", name: "Trixter Wanderer Pants", slot: "Bottom", level: 150, category: "cra", itemId: "01062169" },
  // Weapon
  { id: "cra-weapon", name: "Fafnir Weapon", slot: "Weapon", level: 150, category: "cra", itemId: "01302275" }, // Fafnir Mistilteinn

  // ── Dawn Boss ──────────────────────────────────────────────────────────────
  { id: "dawn-ring", name: "Dawn Guardian Angel Ring", slot: "Ring", level: 160, category: "dawn", itemId: "01113313" }, // Guardian Angel Ring
  { id: "dawn-pendant", name: "Daybreak Pendant", slot: "Pendant", level: 140, category: "dawn", itemId: "01122443" },
  { id: "dawn-earring", name: "Estella Earrings", slot: "Earring", level: 160, category: "dawn", itemId: "01032330" },
  { id: "dawn-face", name: "Twilight Mark", slot: "Face", level: 140, category: "dawn", itemId: "01012757" },

  // ── Pitched Boss (star force eligible) ─────────────────────────────────────
  { id: "pitched-berserked", name: "Berserked", slot: "Face", level: 160, category: "pitched", itemId: "01012632" },
  { id: "pitched-eyepatch", name: "Magic Eyepatch", slot: "Eye", level: 160, category: "pitched", itemId: "01022278" },
  { id: "pitched-total-control", name: "Total Control", slot: "Heart", level: 200, category: "pitched", itemId: "01672095" },
  { id: "pitched-belt", name: "Dreamy Belt", slot: "Belt", level: 200, category: "pitched", itemId: "01132308" },
  { id: "pitched-pendant", name: "Source of Suffering", slot: "Pendant", level: 160, category: "pitched", itemId: "01122430" },
  { id: "pitched-earring", name: "Commanding Force Earring", slot: "Earring", level: 200, category: "pitched", itemId: "01032316" },
  { id: "pitched-ring", name: "Endless Terror", slot: "Ring", level: 200, category: "pitched", itemId: "01113306" },

  // ── Brilliant Boss ────────────────────────────────────────────────────────
  { id: "brilliant-oath", name: "Oath of Death", slot: "Pendant", level: 250, category: "brilliant", itemId: "01122447" },
  { id: "brilliant-whisper", name: "Whisper of the Source", slot: "Ring", level: 250, category: "brilliant", itemId: "01113341" },

  // ── Gollux ─────────────────────────────────────────────────────────────────
  { id: "gollux-sup-ring", name: "Superior Gollux Ring", slot: "Ring", level: 150, category: "gollux", itemId: "01113075" },
  { id: "gollux-sup-pendant", name: "Superior Engraved Gollux Pendant", slot: "Pendant", level: 150, category: "gollux", itemId: "01122267" },
  { id: "gollux-sup-earring", name: "Superior Gollux Earrings", slot: "Earring", level: 150, category: "gollux", itemId: "01032223" },
  { id: "gollux-sup-belt", name: "Superior Engraved Gollux Belt", slot: "Belt", level: 150, category: "gollux", itemId: "01132246" },
  { id: "gollux-rein-ring", name: "Reinforced Gollux Ring", slot: "Ring", level: 140, category: "gollux", itemId: "01113074" },
  { id: "gollux-rein-pendant", name: "Reinforced Engraved Gollux Pendant", slot: "Pendant", level: 140, category: "gollux", itemId: "01122266" },
  { id: "gollux-rein-earring", name: "Reinforced Gollux Earrings", slot: "Earring", level: 140, category: "gollux", itemId: "01032222" },
  { id: "gollux-rein-belt", name: "Reinforced Engraved Gollux Belt", slot: "Belt", level: 140, category: "gollux", itemId: "01132245" },

  // ── Misc ───────────────────────────────────────────────────────────────────
  { id: "misc-kannas-treasure", name: "Kanna's Treasure", slot: "Ring", level: 140, category: "misc", itemId: "01113155" },
  { id: "misc-wings-of-fate", name: "Wings of Fate", slot: "Cape", level: 120, category: "misc", itemId: "01102887" },
  { id: "misc-meister-ring", name: "Meister Ring", slot: "Ring", level: 140, category: "misc", itemId: "01113055" },
  { id: "misc-sw-pendant", name: "Sweetwater Pendant", slot: "Pendant", level: 160, category: "misc", itemId: "01122269" },
  { id: "misc-sw-monocle", name: "Sweetwater Monocle", slot: "Eye", level: 160, category: "misc", itemId: "01022211" },
  { id: "misc-black-bean-mark", name: "Black Bean Mark", slot: "Face", level: 135, category: "misc", itemId: "01022232" },
  { id: "misc-papulatus-mark", name: "Papulatus Mark", slot: "Eye", level: 145, category: "misc", itemId: "01022277" },
  { id: "misc-dominator-pendant", name: "Dominator Pendant", slot: "Pendant", level: 140, category: "misc", itemId: "01122150" },
];

export const EVENT_ITEMS_BY_ID = new Map(EVENT_ITEMS.map((item) => [item.id, item]));

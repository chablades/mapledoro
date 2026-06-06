/*
  Drop Tracker items, grouped by category for the searchable dropdown.
  Icons sourced from the MapleResource API (haku.network) via <ItemIcon>;
  `itemId` is the manifest id (manifests/v269/item.json) looked up by name.

  Storage compatibility: the original pitched `id` slugs are unchanged so
  drops already logged under the `pitchedBossDrops` key still resolve.
*/

export interface DropItem {
  id: string;
  name: string;
  category: string;
  itemId: string;
}

export interface DropCategory {
  id: string;
  label: string;
}

export const DROP_CATEGORIES: DropCategory[] = [
  { id: "pitched", label: "Pitched Boss" },
  { id: "armor-box", label: "Armor Boxes" },
  { id: "ring-box", label: "Ring Boxes" },
  { id: "brilliant", label: "Brilliant Boss Accessory Set" },
  { id: "grindstone", label: "Grindstones" },
  { id: "exceptional", label: "Exceptional Enhancements" },
];

const CATEGORY_MAP = new Map(DROP_CATEGORIES.map((c) => [c.id, c.label]));

export function categoryLabel(id: string): string {
  return CATEGORY_MAP.get(id) ?? id;
}

export const DROP_ITEMS: DropItem[] = [
  // ── Pitched Boss ──────────────────────────────────────────────────────────
  { id: "berserked", name: "Berserked", category: "pitched", itemId: "01012632" },
  { id: "magic-eyepatch", name: "Magic Eyepatch", category: "pitched", itemId: "01022278" },
  { id: "black-heart", name: "Black Heart", category: "pitched", itemId: "01672076" },
  { id: "dreamy-belt", name: "Dreamy Belt", category: "pitched", itemId: "01132308" },
  { id: "source-of-suffering", name: "Source of Suffering", category: "pitched", itemId: "01122430" },
  { id: "genesis-badge", name: "Genesis Badge", category: "pitched", itemId: "01182285" },
  { id: "commanding-force-earring", name: "Commanding Force Earring", category: "pitched", itemId: "01032316" },
  { id: "endless-terror", name: "Endless Terror", category: "pitched", itemId: "01113306" },
  { id: "cursed-spellbook", name: "Cursed Spellbook", category: "pitched", itemId: "01162080" }, // Cursed Red Spellbook
  { id: "mitras-rage", name: "Mitra's Rage", category: "pitched", itemId: "01190555" }, // Mitra's Rage: Warrior

  // ── Armor Boxes ───────────────────────────────────────────────────────────
  { id: "divine-eternal-armor-box", name: "Divine Eternal Armor Box", category: "armor-box", itemId: "02638064" },
  { id: "ancient-eternal-armor-box", name: "Ancient Eternal Armor Box", category: "armor-box", itemId: "02831226" },
  { id: "eternal-armor-of-oaths-box", name: "Eternal Armor of Oaths Box", category: "armor-box", itemId: "02639253" },
  { id: "eternal-armor-of-desire-box", name: "Eternal Armor of Desire Box", category: "armor-box", itemId: "02638066" },
  { id: "ferocious-beast-eternal-armor-box", name: "Ferocious Beast Eternal Armor Box", category: "armor-box", itemId: "02638065" },

  // ── Ring Boxes ────────────────────────────────────────────────────────────
  { id: "green-jade-boss-ring-box", name: "Green Jade Boss Ring Box", category: "ring-box", itemId: "02028407" },
  { id: "red-jade-boss-ring-box", name: "Red Jade Boss Ring Box", category: "ring-box", itemId: "02028408" },
  { id: "black-jade-boss-ring-box", name: "Black Jade Boss Ring Box", category: "ring-box", itemId: "02028409" },
  { id: "white-jade-boss-ring-box", name: "White Jade Boss Ring Box", category: "ring-box", itemId: "02028410" },
  { id: "life-boss-ring-box", name: "Life Boss Ring Box", category: "ring-box", itemId: "02028430" },

  // ── Brilliant Boss Accessory Set ──────────────────────────────────────────
  { id: "oath-of-death", name: "Oath of Death", category: "brilliant", itemId: "01122447" },
  { id: "whisper-of-the-source", name: "Whisper of the Source", category: "brilliant", itemId: "01113341" },
  { id: "immortal-legacy", name: "Immortal Legacy", category: "brilliant", itemId: "01143471" },

  // ── Grindstones ───────────────────────────────────────────────────────────
  { id: "grindstone-of-life", name: "Grindstone of Life", category: "grindstone", itemId: "02539001" },
  { id: "grindstone-of-faith", name: "Grindstone of Faith", category: "grindstone", itemId: "02539004" },

  // ── Exceptional Enhancements ──────────────────────────────────────────────
  { id: "exceptional-hammer-medal", name: "Exceptional Hammer (Medal)", category: "exceptional", itemId: "02644208" },
  { id: "exceptional-hammer-earrings", name: "Exceptional Hammer (Earrings)", category: "exceptional", itemId: "02644207" },
  { id: "exceptional-hammer-eye-acc", name: "Exceptional Hammer (Eye Acc)", category: "exceptional", itemId: "02644206" },
  { id: "exceptional-hammer-face-acc", name: "Exceptional Hammer (Face Acc)", category: "exceptional", itemId: "02644205" },
  { id: "exceptional-hammer-belt", name: "Exceptional Hammer (Belt)", category: "exceptional", itemId: "02644204" },
];

export const DROP_ITEMS_BY_ID = new Map(DROP_ITEMS.map((item) => [item.id, item]));

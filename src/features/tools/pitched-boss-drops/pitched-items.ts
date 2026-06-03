export interface PitchedBossItem {
  id: string;
  name: string;
  boss: string;
  slot: string;
  itemId: string;
}

export const PITCHED_BOSS_ITEMS: PitchedBossItem[] = [
  { id: "berserked", name: "Berserked", boss: "Hard Lotus", slot: "Face Accessory", itemId: "01012632" },
  { id: "magic-eyepatch", name: "Magic Eyepatch", boss: "Hard Damien", slot: "Eye Accessory", itemId: "01022278" },
  { id: "black-heart", name: "Black Heart", boss: "Hard Lotus", slot: "Heart", itemId: "01672076" },
  { id: "dreamy-belt", name: "Dreamy Belt", boss: "Hard Lucid", slot: "Belt", itemId: "01132308" },
  { id: "source-of-suffering", name: "Source of Suffering", boss: "Hard Verus Hilla", slot: "Pendant", itemId: "01122430" },
  { id: "genesis-badge", name: "Genesis Badge", boss: "Hard Black Mage", slot: "Badge", itemId: "01182285" },
  { id: "commanding-force-earring", name: "Commanding Force Earring", boss: "Hard Darknell", slot: "Earring", itemId: "01032316" },
  { id: "endless-terror", name: "Endless Terror", boss: "Chaos Gloom", slot: "Ring", itemId: "01113306" },
  { id: "cursed-spellbook", name: "Cursed Spellbook", boss: "Hard Will", slot: "Pocket", itemId: "01162080" }, // Cursed Red Spellbook
  { id: "mitras-rage", name: "Mitra's Rage", boss: "Hard Seren", slot: "Emblem", itemId: "01190555" }, // Mitra's Rage: Warrior
];

export const PITCHED_ITEMS_BY_ID = new Map(
  PITCHED_BOSS_ITEMS.map((item) => [item.id, item]),
);

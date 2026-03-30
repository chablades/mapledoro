const CDN = "https://media.maplestorywiki.net/yetidb";

export interface PitchedBossItem {
  id: string;
  name: string;
  boss: string;
  slot: string;
  icon: string;
}

export const PITCHED_BOSS_ITEMS: PitchedBossItem[] = [
  { id: "berserked", name: "Berserked", boss: "Hard Lotus", slot: "Face Accessory", icon: `${CDN}/Eqp_Berserked.png` },
  { id: "magic-eyepatch", name: "Magic Eyepatch", boss: "Hard Damien", slot: "Eye Accessory", icon: `${CDN}/Eqp_Magic_Eyepatch.png` },
  { id: "black-heart", name: "Black Heart", boss: "Hard Lotus", slot: "Heart", icon: `${CDN}/Eqp_Black_Heart.png` },
  { id: "dreamy-belt", name: "Dreamy Belt", boss: "Hard Lucid", slot: "Belt", icon: `${CDN}/Eqp_Dreamy_Belt.png` },
  { id: "source-of-suffering", name: "Source of Suffering", boss: "Hard Verus Hilla", slot: "Pendant", icon: `${CDN}/Eqp_Source_of_Suffering.png` },
  { id: "genesis-badge", name: "Genesis Badge", boss: "Hard Black Mage", slot: "Badge", icon: `${CDN}/Eqp_Genesis_Badge.png` },
  { id: "commanding-force-earring", name: "Commanding Force Earring", boss: "Hard Darknell", slot: "Earring", icon: `${CDN}/Eqp_Commanding_Force_Earring.png` },
  { id: "endless-terror", name: "Endless Terror", boss: "Chaos Gloom", slot: "Ring", icon: `${CDN}/Eqp_Endless_Terror.png` },
  { id: "cursed-spellbook", name: "Cursed Spellbook", boss: "Hard Will", slot: "Pocket", icon: `${CDN}/Eqp_Cursed_Red_Spellbook.png` },
  { id: "mitras-rage", name: "Mitra's Rage", boss: "Hard Seren", slot: "Emblem", icon: `${CDN}/Eqp_Mitra's_Rage_Warrior.png` },
];

export const PITCHED_ITEMS_BY_ID = new Map(
  PITCHED_BOSS_ITEMS.map((item) => [item.id, item]),
);

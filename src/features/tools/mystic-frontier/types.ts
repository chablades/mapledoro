// Shared Mystic Frontier types.

export type MfRarity = "common" | "rare" | "epic" | "unique" | "legendary";

export const MF_RARITY_ORDER: readonly MfRarity[] = [
  "common",
  "rare",
  "epic",
  "unique",
  "legendary",
];

export const MF_RARITY_LABELS: Record<MfRarity, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  unique: "Unique",
  legendary: "Legendary",
};

// Max die value (number of sides) granted by each rarity.
export const MF_RARITY_DICE: Record<MfRarity, number> = {
  common: 3,
  rare: 4,
  epic: 5,
  unique: 6,
  legendary: 6,
};

export type MfElement =
  | "None"
  | "Fire"
  | "Ice"
  | "Lightning"
  | "Poison"
  | "Dark"
  | "Holy";

export type MfType =
  | "Human"
  | "Beast"
  | "Plant"
  | "Aquatic"
  | "Fairy"
  | "Reptile"
  | "Devil"
  | "Undead"
  | "Mechanical";

/*
  Answer pool + hint data for the Skill Guesser game.

  One entry per playable GMS class (matches the guides class list). Hints are
  revealed after failed guesses: main stat → secondary type → main weapon type.
  Main stats follow classSkillData.ts; secondaries/weapons follow GMS naming.

  The generator script (scripts/generate-skill-guesser-data.mjs) validates the
  puzzle payload against these names — regenerate after renaming a class.
*/

export interface SkillGuesserClass {
  name: string;
  mainStat: string;
  secondary: string;
  weapon: string;
}

export const SKILL_GUESSER_CLASSES: SkillGuesserClass[] = [
  // ── Explorers ──
  { name: "Hero", mainStat: "STR", secondary: "Medallion", weapon: "Two-Handed Sword" },
  { name: "Paladin", mainStat: "STR", secondary: "Rosary", weapon: "Two-Handed Blunt Weapon" },
  { name: "Dark Knight", mainStat: "STR", secondary: "Iron Chain", weapon: "Spear" },
  { name: "Arch Mage (Fire/Poison)", mainStat: "INT", secondary: "Magic Book", weapon: "Staff" },
  { name: "Arch Mage (Ice/Lightning)", mainStat: "INT", secondary: "Magic Book", weapon: "Staff" },
  { name: "Bishop", mainStat: "INT", secondary: "Magic Book", weapon: "Staff" },
  { name: "Bow Master", mainStat: "DEX", secondary: "Arrow Fletching", weapon: "Bow" },
  { name: "Marksman", mainStat: "DEX", secondary: "Bow Thimble", weapon: "Crossbow" },
  { name: "Pathfinder", mainStat: "DEX", secondary: "Relic", weapon: "Ancient Bow" },
  { name: "Night Lord", mainStat: "LUK", secondary: "Charm", weapon: "Claw" },
  { name: "Shadower", mainStat: "LUK", secondary: "Dagger Scabbard", weapon: "Dagger" },
  { name: "Dual Blade", mainStat: "LUK", secondary: "Katara", weapon: "Dagger" },
  { name: "Buccaneer", mainStat: "STR", secondary: "Wrist Band", weapon: "Knuckle" },
  { name: "Corsair", mainStat: "DEX", secondary: "Far Sight", weapon: "Gun" },
  { name: "Cannoneer", mainStat: "STR", secondary: "Powder Keg", weapon: "Hand Cannon" },
  // ── Cygnus Knights ──
  { name: "Dawn Warrior", mainStat: "STR", secondary: "Jewel", weapon: "Sword" },
  { name: "Blaze Wizard", mainStat: "INT", secondary: "Jewel", weapon: "Staff" },
  { name: "Wind Archer", mainStat: "DEX", secondary: "Jewel", weapon: "Bow" },
  { name: "Night Walker", mainStat: "LUK", secondary: "Jewel", weapon: "Claw" },
  { name: "Thunder Breaker", mainStat: "STR", secondary: "Jewel", weapon: "Knuckle" },
  { name: "Mihile", mainStat: "STR", secondary: "Soul Shield", weapon: "One-Handed Sword" },
  // ── Heroes of Maple ──
  { name: "Aran", mainStat: "STR", secondary: "Mass", weapon: "Polearm" },
  { name: "Evan", mainStat: "INT", secondary: "Document", weapon: "Wand" },
  { name: "Mercedes", mainStat: "DEX", secondary: "Magic Arrow", weapon: "Dual Bowguns" },
  { name: "Phantom", mainStat: "LUK", secondary: "Card", weapon: "Cane" },
  { name: "Luminous", mainStat: "INT", secondary: "Orb", weapon: "Shining Rod" },
  { name: "Shade", mainStat: "STR", secondary: "Fox Marble", weapon: "Knuckle" },
  // ── Resistance ──
  { name: "Battle Mage", mainStat: "INT", secondary: "Magic Marble", weapon: "Staff" },
  { name: "Wild Hunter", mainStat: "DEX", secondary: "Arrowhead", weapon: "Crossbow" },
  { name: "Mechanic", mainStat: "DEX", secondary: "Magnum", weapon: "Gun" },
  { name: "Xenon", mainStat: "STR, DEX & LUK", secondary: "Core Controller", weapon: "Whip Blade" },
  { name: "Blaster", mainStat: "STR", secondary: "Charge", weapon: "Arm Cannon" },
  // ── Demons ──
  { name: "Demon Slayer", mainStat: "STR", secondary: "Demon Aegis", weapon: "One-Handed Axe or Blunt Weapon" },
  { name: "Demon Avenger", mainStat: "HP", secondary: "Demon Aegis", weapon: "Desperado" },
  // ── Nova ──
  { name: "Kaiser", mainStat: "STR", secondary: "Dragon Essence", weapon: "Two-Handed Sword" },
  { name: "Angelic Buster", mainStat: "DEX", secondary: "Soul Ring", weapon: "Soul Shooter" },
  { name: "Cadena", mainStat: "LUK", secondary: "Transmitter", weapon: "Chain" },
  { name: "Kain", mainStat: "DEX", secondary: "Weapon Belt", weapon: "Whispershot" },
  // ── Flora ──
  { name: "Illium", mainStat: "INT", secondary: "Lucent Wings", weapon: "Lucent Gauntlet" },
  { name: "Ark", mainStat: "STR", secondary: "Abyssal Path", weapon: "Knuckle" },
  { name: "Adele", mainStat: "STR", secondary: "Bladebinder", weapon: "Bladecaster" },
  { name: "Khali", mainStat: "LUK", secondary: "Hex Seeker", weapon: "Chakram" },
  // ── Anima ──
  { name: "Hoyoung", mainStat: "LUK", secondary: "Fan Tassel", weapon: "Ritual Fan" },
  { name: "Lara", mainStat: "INT", secondary: "Ornament", weapon: "Wand" },
  { name: "Ren", mainStat: "STR", secondary: "Imugi Gem", weapon: "One-Handed Sword" },
  // ── Other ──
  { name: "Zero", mainStat: "STR", secondary: "Lazuli (Long Sword)", weapon: "Lapis (Heavy Sword)" },
  { name: "Kinesis", mainStat: "INT", secondary: "Chess Piece", weapon: "Psy-limiter" },
  // ── Sengoku ──
  { name: "Hayato", mainStat: "STR", secondary: "Kodachi", weapon: "Katana" },
  { name: "Kanna", mainStat: "INT", secondary: "Talisman", weapon: "Fan" },
  // ── Jianghu ──
  { name: "Lynn", mainStat: "INT", secondary: "Leaf", weapon: "Memorial Staff" },
  { name: "Mo Xuan", mainStat: "DEX", secondary: "Brace Band", weapon: "Martial Brace" },
  // ── Shine ──
  { name: "Sia Astelle", mainStat: "INT", secondary: "Compass", weapon: "Celestial Light" },
  { name: "Erel Light", mainStat: "STR", secondary: "Keir", weapon: "Gram" },
];

const CLASS_BY_NAME = new Map(SKILL_GUESSER_CLASSES.map((c) => [c.name, c]));

export function findSkillGuesserClass(name: string): SkillGuesserClass | null {
  return CLASS_BY_NAME.get(name) ?? null;
}

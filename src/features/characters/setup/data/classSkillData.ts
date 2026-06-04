/*
  Class-specific skill data for the stats setup step.
  Each entry defines the buff skills a player must activate before screenshotting
  their stats, and which stat fields are relevant for that class.

  Legacy classes (lower job advancements, not accepted by MapleScouter) have empty
  buffSkills and requiredStats — the UI will fall back to showing all stat fields.

  TODO: Some classes have setup option variants noted inline:
    - dawn_warrior, hero, paladin: One-Handed vs Two-Handed Weapon
    - demon_avenger: Ephinea Soul or Mu Gong Soul; optional Ruin Force Shield
    - demon_slayer: optional Ruin Force Shield
  These will be handled by a future setupOptions system on ClassSkillData.
*/

import type { StatFieldId } from "./statFields";
import { resourceImageUrl } from "../../../../lib/mapleResource";

export interface BuffSkill {
  skillIconUrl: string;
  skillName: string;
  /** Job advancement label for display in tooltip (e.g. "3", "Hyper Skills (140)", "Beginner", "Transcendent") */
  jobAdvancement: string;
}

export interface ClassWarning {
  message: string;
  /** If this warning is about a specific skill (e.g. "do not use"), show its icon */
  skill?: BuffSkill;
}

export interface ClassSkillData {
  id: string;
  nexonJobName: string;
  /** Override display name when Nexon's jobName differs from what players call the class (e.g. "Dual Blade" vs Nexon's "Blade Master") */
  displayName?: string;
  /** Warnings shown before the buff guide. Use skill for "do not use X" entries. */
  warnings?: ClassWarning[];
  buffSkills: BuffSkill[];
  /** Class-specific required stats, ordered by importance (primary first). Universal stats are added automatically. */
  requiredStats: StatFieldId[];
}

// Stats required for every class regardless of type
export const UNIVERSAL_REQUIRED_STATS: StatFieldId[] = [
  "damage",
  "bossDamage",
  "ignoreDefense",
  "criticalRate",
  "criticalDamage",
  "buffDuration",
  "cooldownReduction",
  "cooldownSkip",
  "ignoreElementalResistance",
  "additionalStatusDamage",
  "summonDuration",
  "arcanePower",
  "sacredPower",
];

/** Returns the full set of required stats for a class (class-specific first, then universal) */
export function getRequiredStatsForClass(classData: ClassSkillData): StatFieldId[] {
  return [...classData.requiredStats, ...UNIVERSAL_REQUIRED_STATS];
}

// ── Commonly reused buff skills ────────────────────────────────────────────────

// Skill icon by id from the haku.network `skill` resource (ids in manifests/v268/skill.json).
const sk = (id: string): string => resourceImageUrl("skill", id, "icon.png");

const DSE: BuffSkill = {
  skillIconUrl: sk("0008002"),
  skillName: "Decent Sharp Eyes",
  jobAdvancement: "5",
};
const DCO: BuffSkill = {
  skillIconUrl: sk("0008004"),
  skillName: "Decent Combat Orders",
  jobAdvancement: "5",
};

// ── Warning skills (shown with icon in "do not use" warnings) ─────────────────

const LOADED_DICE: BuffSkill = {
  skillIconUrl: sk("400051000"),
  skillName: "Loaded Dice",
  jobAdvancement: "5",
};
const FINAL_CUT: BuffSkill = {
  skillIconUrl: sk("400004128"),
  skillName: "Final Cut",
  jobAdvancement: "4",
};
const CROSS_SURGE: BuffSkill = {
  skillIconUrl: sk("1311015"),
  skillName: "Cross Surge",
  jobAdvancement: "3",
};
const SPIRIT_BLADE: BuffSkill = {
  skillIconUrl: sk("1101006"),
  skillName: "Spirit Blade",
  jobAdvancement: "2",
};
const OVERLOAD_RELEASE: BuffSkill = {
  skillIconUrl: sk("31011001"),
  skillName: "Overload Release",
  jobAdvancement: "1",
};
const CIRCUIT_SURGE: BuffSkill = {
  skillIconUrl: sk("36001002"),
  skillName: "Circuit Surge",
  jobAdvancement: "1",
};
const OOPARTS_CODE: BuffSkill = {
  skillIconUrl: sk("36121003"),
  skillName: "OOPArts Code",
  jobAdvancement: "4",
};
const FLIP_OF_THE_COIN: BuffSkill = {
  skillIconUrl: sk("4221054"),
  skillName: "Flip of the Coin",
  jobAdvancement: "Hyper Skills (140)",
};
const RESONANCE_RUSH: BuffSkill = {
  skillIconUrl: sk("151101003"),
  skillName: "Resonance Rush",
  jobAdvancement: "2",
};
const SPELL_BULLETS: BuffSkill = {
  skillIconUrl: sk("155001103"),
  skillName: "Spell Bullets",
  jobAdvancement: "1",
};
const LUCENT_BRAND: BuffSkill = {
  skillIconUrl: sk("152000007"),
  skillName: "Lucent Brand",
  jobAdvancement: "1",
};
const IGNIS_ROAR: BuffSkill = {
  skillIconUrl: sk("23110004"),
  skillName: "Ignis Roar",
  jobAdvancement: "3",
};
const HEIR_OF_THE_DIVINE: BuffSkill = {
  skillIconUrl: sk("175120016"),
  skillName: "Heir of the Divine",
  jobAdvancement: "4",
};
const MUSCLE_MEMORY: BuffSkill = {
  skillIconUrl: sk("64100004"),
  skillName: "Muscle Memory",
  jobAdvancement: "2",
};
const COMBO_TRAINING: BuffSkill = {
  skillIconUrl: sk("37110009"),
  skillName: "Combo Training",
  jobAdvancement: "3",
};

// ── Class data ────────────────────────────────────────────────────────────────

export const CLASS_SKILL_DATA: ClassSkillData[] = [
  // ── Active classes ──────────────────────────────────────────────────────────

  {
    id: "hoyoung",
    nexonJobName: "Hoyoung",
    buffSkills: [DSE, DCO],
    requiredStats: ["luk", "dex", "attackPower"],
  },
  {
    id: "lara",
    nexonJobName: "Lara",
    buffSkills: [DSE, DCO],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "ren",
    nexonJobName: "Ren",
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "blaze_wizard",
    nexonJobName: "Blaze Wizard",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("12121004"), skillName: "Fires of Creation", jobAdvancement: "4" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "dawn_warrior",
    nexonJobName: "Dawn Warrior",
    // TODO: setup option — One-Handed Weapon or Two-Handed Weapon
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("11100031"), skillName: "Equinox Cycle", jobAdvancement: "2" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "mihile",
    nexonJobName: "Mihile",
    warnings: [{ message: "Solo party only for Soul Link (3rd job)" }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("51121006"), skillName: "Roiling Soul", jobAdvancement: "4" },
      { skillIconUrl: sk("51110008"), skillName: "Soul Link", jobAdvancement: "3" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "night_walker",
    nexonJobName: "Night Walker",
    buffSkills: [DSE, DCO],
    requiredStats: ["luk", "dex", "attackPower"],
  },
  {
    id: "thunder_breaker",
    nexonJobName: "Thunder Breaker",
    warnings: [{ message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE }],
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "wind_archer",
    nexonJobName: "Wind Archer",
    buffSkills: [
      { skillIconUrl: sk("3121002"), skillName: "Sharp Eyes", jobAdvancement: "4" },
      DCO,
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "demon_avenger",
    nexonJobName: "Demon Avenger",
    warnings: [{ message: "Do not use Overload Release (1st job)", skill: OVERLOAD_RELEASE }],
    // TODO: setup options — Ephinea Soul (up to Lv. 2) or Mu Gong Soul; optional Ruin Force Shield
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("31211004"), skillName: "Diabolic Recovery", jobAdvancement: "3" },
    ],
    requiredStats: ["hp", "str", "attackPower"],
  },
  {
    id: "demon_slayer",
    nexonJobName: "Demon Slayer",
    // TODO: setup option — optional Ruin Force Shield
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("31121005"), skillName: "Dark Metamorphosis", jobAdvancement: "4" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "arch_mage_f_p",
    nexonJobName: "Arch Mage (F/P)",
    displayName: "Arch Mage (Fire/Poison)",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("2101001"), skillName: "Meditation", jobAdvancement: "2" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "arch_mage_i_l",
    nexonJobName: "Arch Mage (I/L)",
    displayName: "Arch Mage (Ice/Lightning)",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("2101001"), skillName: "Meditation", jobAdvancement: "2" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "bishop",
    nexonJobName: "Bishop",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("2321005"), skillName: "Advanced Blessing", jobAdvancement: "4" },
      { skillIconUrl: sk("2321054"), skillName: "Righteously Indignant", jobAdvancement: "Hyper Skills (140)" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "blade_master",
    nexonJobName: "Blade Master",
    displayName: "Dual Blade",
    warnings: [{ message: "Do not use Final Cut (4th job)", skill: FINAL_CUT }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("400004133"), skillName: "Blade Clone", jobAdvancement: "Hyper Skills (140)" },
    ],
    requiredStats: ["luk", "dex", "str", "attackPower"],
  },
  {
    id: "bow_master",
    nexonJobName: "Bow Master",
    buffSkills: [
      { skillIconUrl: sk("3121002"), skillName: "Sharp Eyes", jobAdvancement: "4" },
      DCO,
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "buccaneer",
    nexonJobName: "Buccaneer",
    warnings: [{ message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("5100017"), skillName: "Sea Serpent", jobAdvancement: "2" },
      { skillIconUrl: sk("5121015"), skillName: "Crossbones", jobAdvancement: "4" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "cannoneer",
    nexonJobName: "Cannoneer",
    warnings: [{ message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("5301003"), skillName: "Monkey Magic", jobAdvancement: "2" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "corsair",
    nexonJobName: "Corsair",
    warnings: [{ message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("5221018"), skillName: "Jolly Roger", jobAdvancement: "4" },
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "dark_knight",
    nexonJobName: "Dark Knight",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("1301013"), skillName: "Evil Eye", jobAdvancement: "2" },
      { skillIconUrl: sk("1311015"), skillName: "Cross Surge", jobAdvancement: "3" },
      { skillIconUrl: sk("1321015"), skillName: "Dark Resonance", jobAdvancement: "4" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "hero",
    nexonJobName: "Hero",
    warnings: [{ message: "Must have 10 combo orb" }],
    // TODO: setup option — One-Handed Weapon or Two-Handed Weapon
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("1101006"), skillName: "Spirit Blade", jobAdvancement: "2" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "marksman",
    nexonJobName: "Marksman",
    buffSkills: [
      { skillIconUrl: sk("3121002"), skillName: "Sharp Eyes", jobAdvancement: "4" },
      DCO,
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "night_lord",
    nexonJobName: "Night Lord",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("4121054"), skillName: "Bleed Dart", jobAdvancement: "Hyper Skills (140)" },
    ],
    requiredStats: ["luk", "dex", "attackPower"],
  },
  {
    id: "paladin",
    nexonJobName: "Paladin",
    warnings: [{ message: "Must have 0 charge" }],
    // TODO: setup option — One-Handed Weapon or Two-Handed Weapon
    buffSkills: [
      DSE,
      { skillIconUrl: sk("0008004"), skillName: "Combat Orders", jobAdvancement: "3" },
      { skillIconUrl: sk("1210014"), skillName: "Parashock Guard", jobAdvancement: "3" },
      { skillIconUrl: sk("1221015"), skillName: "Divine Blessing", jobAdvancement: "4" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "pathfinder",
    nexonJobName: "Pathfinder",
    buffSkills: [
      { skillIconUrl: sk("3121002"), skillName: "Sharp Eyes", jobAdvancement: "4" },
      DCO,
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "shadower",
    nexonJobName: "Shadower",
    warnings: [{ message: "Must have 0 stacks for Flip of the Coin (Hyper Skill)", skill: FLIP_OF_THE_COIN }],
    buffSkills: [DSE, DCO],
    requiredStats: ["luk", "dex", "str", "attackPower"],
  },
  {
    id: "adele",
    nexonJobName: "Adele",
    warnings: [{ message: "Must have 0 stacks for Resonance Rush (2nd job)", skill: RESONANCE_RUSH }],
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "ark",
    nexonJobName: "Ark",
    warnings: [
      { message: "Must be in Flora form (not Specter)" },
      { message: "Must have 0 Spell Bullets (1st job)", skill: SPELL_BULLETS },
      { message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE },
    ],
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "illium",
    nexonJobName: "Illium",
    warnings: [{ message: "Must have 0 stacks (moving, Lucent Brand 1st job)", skill: LUCENT_BRAND }],
    buffSkills: [DSE, DCO],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "khali",
    nexonJobName: "Khali",
    buffSkills: [DSE, DCO],
    requiredStats: ["luk", "dex", "attackPower"],
  },
  {
    id: "kinesis",
    nexonJobName: "Kinesis",
    buffSkills: [DSE, DCO],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "aran",
    nexonJobName: "Aran",
    warnings: [{ message: "Must have 500 combo" }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("21111012"), skillName: "Maha Blessing", jobAdvancement: "3" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "evan",
    nexonJobName: "Evan",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("22171073"), skillName: "Blessing of the Onyx", jobAdvancement: "4" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "luminous",
    nexonJobName: "Luminous",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("27111006"), skillName: "Photic Meditation", jobAdvancement: "3" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "mercedes",
    nexonJobName: "Mercedes",
    warnings: [{ message: "Must have 0 stacks (Ignis Roar, 3rd job)", skill: IGNIS_ROAR }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("23121004"), skillName: "Ancient Warding", jobAdvancement: "4" },
      { skillIconUrl: sk("23121054"), skillName: "Elvish Blessing", jobAdvancement: "Hyper Skills (140)" },
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "phantom",
    nexonJobName: "Phantom",
    warnings: [
      { message: "Do not use Final Cut (4th job)", skill: FINAL_CUT },
      { message: "Do not use Cross Surge (3rd job)", skill: CROSS_SURGE },
      { message: "Do not use Spirit Blade (2nd job)", skill: SPIRIT_BLADE },
    ],
    buffSkills: [DSE, DCO],
    requiredStats: ["luk", "dex", "attackPower"],
  },
  {
    id: "shade",
    nexonJobName: "Shade",
    warnings: [{ message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE }],
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "lynn",
    nexonJobName: "Lynn",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("172111009"), skillName: "Nature's Providence", jobAdvancement: "3" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "mo_xuan",
    nexonJobName: "Mo Xuan",
    warnings: [
      { message: "Must have 5 stacks for Heir of the Divine (4th job)", skill: HEIR_OF_THE_DIVINE },
      { message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE },
    ],
    buffSkills: [DSE, DCO],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "angelic_buster",
    nexonJobName: "Angelic Buster",
    warnings: [{ message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("65121004"), skillName: "Star Gazer", jobAdvancement: "4" },
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "cadena",
    nexonJobName: "Cadena",
    warnings: [{ message: "Must have 0 stacks for Muscle Memory (2nd job)", skill: MUSCLE_MEMORY }],
    buffSkills: [DSE, DCO],
    requiredStats: ["luk", "dex", "str", "attackPower"],
  },
  {
    id: "kain",
    nexonJobName: "Kain",
    buffSkills: [DSE, DCO],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "kaiser",
    nexonJobName: "Kaiser",
    warnings: [
      { message: "Must be in human form" },
      { message: "Morph Gauge must be 0" },
    ],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("60001217"), skillName: "Realign: Attacker Mode", jobAdvancement: "Beginner" },
      { skillIconUrl: sk("61101004"), skillName: "Blaze On", jobAdvancement: "2" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "battle_mage",
    nexonJobName: "Battle Mage",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("32121017"), skillName: "Dark Aura", jobAdvancement: "4" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "blaster",
    nexonJobName: "Blaster",
    warnings: [{ message: "Must have 0 stacks for Combo Training (3rd job)", skill: COMBO_TRAINING }],
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "mechanic",
    nexonJobName: "Mechanic",
    warnings: [{ message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("35111003"), skillName: "Tank Mech", jobAdvancement: "3" },
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "wild_hunter",
    nexonJobName: "Wild Hunter",
    buffSkills: [
      { skillIconUrl: sk("3121002"), skillName: "Sharp Eyes", jobAdvancement: "4" },
      DCO,
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "xenon",
    nexonJobName: "Xenon",
    warnings: [
      { message: "Supply Surplus must be 20/20 (Beginner)" },
      { message: "Do not use Circuit Surge (1st job)", skill: CIRCUIT_SURGE },
      { message: "Do not use OOPArts Code (4th job)", skill: OOPARTS_CODE },
    ],
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "luk", "attackPower"],
  },
  {
    id: "hayato",
    nexonJobName: "Hayato",
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "kanna",
    nexonJobName: "Kanna",
    buffSkills: [DSE, DCO],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "sia_astelle",
    nexonJobName: "Sia Astelle",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("182101005"), skillName: "Celestial Alignment", jobAdvancement: "2" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "zero",
    nexonJobName: "Zero",
    warnings: [{ message: "Must be in Beta status" }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: sk("100000263"), skillName: "Divine Aura", jobAdvancement: "Transcendent" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },

  // ── Legacy classes (no buff guide, shows all stat fields) ───────────────────

  { id: "ancient_archer", nexonJobName: "Ancient Archer", buffSkills: [], requiredStats: [] },
  { id: "archer", nexonJobName: "Archer", buffSkills: [], requiredStats: [] },
  { id: "assassin", nexonJobName: "Assassin", buffSkills: [], requiredStats: [] },
  { id: "bandit", nexonJobName: "Bandit", buffSkills: [], requiredStats: [] },
  { id: "beginner", nexonJobName: "Beginner", buffSkills: [], requiredStats: [] },
  { id: "berserker", nexonJobName: "Berserker", buffSkills: [], requiredStats: [] },
  { id: "blade_acolyte", nexonJobName: "Blade Acolyte", buffSkills: [], requiredStats: [] },
  { id: "blade_lord", nexonJobName: "Blade Lord", buffSkills: [], requiredStats: [] },
  { id: "blade_recruit", nexonJobName: "Blade Recruit", buffSkills: [], requiredStats: [] },
  { id: "blade_specialist", nexonJobName: "Blade Specialist", buffSkills: [], requiredStats: [] },
  { id: "brawler", nexonJobName: "Brawler", buffSkills: [], requiredStats: [] },
  { id: "cannon_master", nexonJobName: "Cannon Master", buffSkills: [], requiredStats: [] },
  { id: "cannon_trooper", nexonJobName: "Cannon Trooper", buffSkills: [], requiredStats: [] },
  { id: "chief_bandit", nexonJobName: "Chief Bandit", buffSkills: [], requiredStats: [] },
  { id: "citizen", nexonJobName: "Citizen", buffSkills: [], requiredStats: [] },
  { id: "cleric", nexonJobName: "Cleric", buffSkills: [], requiredStats: [] },
  { id: "crossbowman", nexonJobName: "Crossbowman", buffSkills: [], requiredStats: [] },
  { id: "crusader", nexonJobName: "Crusader", buffSkills: [], requiredStats: [] },
  { id: "fighter", nexonJobName: "Fighter", buffSkills: [], requiredStats: [] },
  { id: "gunslinger", nexonJobName: "Gunslinger", buffSkills: [], requiredStats: [] },
  { id: "hermit", nexonJobName: "Hermit", buffSkills: [], requiredStats: [] },
  { id: "hunter", nexonJobName: "Hunter", buffSkills: [], requiredStats: [] },
  { id: "mage_f_p", nexonJobName: "Mage (F/P)", displayName: "Mage (Fire/Poison)", buffSkills: [], requiredStats: [] },
  { id: "mage_i_l", nexonJobName: "Mage (I/L)", displayName: "Mage (Ice/Lightning)", buffSkills: [], requiredStats: [] },
  { id: "magician", nexonJobName: "Magician", buffSkills: [], requiredStats: [] },
  { id: "marauder", nexonJobName: "Marauder", buffSkills: [], requiredStats: [] },
  { id: "outlaw", nexonJobName: "Outlaw", buffSkills: [], requiredStats: [] },
  { id: "page", nexonJobName: "Page", buffSkills: [], requiredStats: [] },
  { id: "pirate", nexonJobName: "Pirate", buffSkills: [], requiredStats: [] },
  { id: "priest", nexonJobName: "Priest", buffSkills: [], requiredStats: [] },
  { id: "ranger", nexonJobName: "Ranger", buffSkills: [], requiredStats: [] },
  { id: "rogue", nexonJobName: "Rogue", buffSkills: [], requiredStats: [] },
  { id: "sniper", nexonJobName: "Sniper", buffSkills: [], requiredStats: [] },
  { id: "soulchaser", nexonJobName: "Soulchaser", buffSkills: [], requiredStats: [] },
  { id: "spearman", nexonJobName: "Spearman", buffSkills: [], requiredStats: [] },
  { id: "swordman", nexonJobName: "Swordman", buffSkills: [], requiredStats: [] },
  { id: "white_knight", nexonJobName: "White Knight", buffSkills: [], requiredStats: [] },
  { id: "wizard_f_p", nexonJobName: "Wizard (F/P)", displayName: "Wizard (Fire/Poison)", buffSkills: [], requiredStats: [] },
  { id: "wizard_i_l", nexonJobName: "Wizard (I/L)", displayName: "Wizard (Ice/Lightning)", buffSkills: [], requiredStats: [] },
];

export function getClassDataByNexonJobName(jobName: string): ClassSkillData | undefined {
  return CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
}

export function getClassDataById(id: string): ClassSkillData | undefined {
  return CLASS_SKILL_DATA.find((c) => c.id === id);
}

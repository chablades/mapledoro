/*
  Class-specific skill data for the stats setup step.
  Each entry defines the buff skills a player must activate before screenshotting
  their stats, and which stat fields are relevant for that class.

  Legacy classes (lower job advancements, not accepted by MapleScuter) have empty
  buffSkills and requiredStats — the UI will fall back to showing all stat fields.

  TODO: Some classes have setup option variants noted inline:
    - dawn_warrior, hero, paladin: One-Handed vs Two-Handed Weapon
    - demon_avenger: Ephinea Soul or Mu Gong Soul; optional Ruin Force Shield
    - demon_slayer: optional Ruin Force Shield
  These will be handled by a future setupOptions system on ClassSkillData.
*/

import type { StatFieldId } from "./statFields";

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

const DSE: BuffSkill = {
  skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Sharp_Eyes.png",
  skillName: "Decent Sharp Eyes",
  jobAdvancement: "5",
};
const DCO: BuffSkill = {
  skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Combat_Orders.png",
  skillName: "Decent Combat Orders",
  jobAdvancement: "5",
};

// ── Warning skills (shown with icon in "do not use" warnings) ─────────────────

const LOADED_DICE: BuffSkill = {
  skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Loaded_Dice.png",
  skillName: "Loaded Dice",
  jobAdvancement: "5",
};
const FINAL_CUT: BuffSkill = {
  skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Final_Cut.png",
  skillName: "Final Cut",
  jobAdvancement: "4",
};
const CROSS_SURGE: BuffSkill = {
  skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Cross_Surge.png",
  skillName: "Cross Surge",
  jobAdvancement: "3",
};
const SPIRIT_BLADE: BuffSkill = {
  skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Spirit_Blade.png",
  skillName: "Spirit Blade",
  jobAdvancement: "2",
};
const OVERLOAD_RELEASE: BuffSkill = {
  skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Overload_Release.png",
  skillName: "Overload Release",
  jobAdvancement: "1",
};
const CIRCUIT_SURGE: BuffSkill = {
  skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Circuit_Surge.png",
  skillName: "Circuit Surge",
  jobAdvancement: "1",
};
const OOPARTS_CODE: BuffSkill = {
  skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_OOPArts_Code.png",
  skillName: "OOPArts Code",
  jobAdvancement: "4",
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Fires_of_Creation.png", skillName: "Fires of Creation", jobAdvancement: "4" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Equinox_Cycle.png", skillName: "Equinox Cycle", jobAdvancement: "2" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Roiling_Soul.png", skillName: "Roiling Soul", jobAdvancement: "4" },
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Soul_Link.png", skillName: "Soul Link", jobAdvancement: "3" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Sharp_Eyes.png", skillName: "Sharp Eyes", jobAdvancement: "4" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Diabolic_Recovery.png", skillName: "Diabolic Recovery", jobAdvancement: "3" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Dark_Metamorphosis.png", skillName: "Dark Metamorphosis", jobAdvancement: "4" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Meditation.png", skillName: "Meditation", jobAdvancement: "2" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Meditation.png", skillName: "Meditation", jobAdvancement: "2" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "bishop",
    nexonJobName: "Bishop",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Advanced_Blessing.png", skillName: "Advanced Blessing", jobAdvancement: "4" },
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Righteously_Indignant.png", skillName: "Righteously Indignant", jobAdvancement: "Hyper Skills (140)" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Blade_Clone.png", skillName: "Blade Clone", jobAdvancement: "Hyper Skills (140)" },
    ],
    requiredStats: ["luk", "dex", "str", "attackPower"],
  },
  {
    id: "bow_master",
    nexonJobName: "Bow Master",
    buffSkills: [
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Sharp_Eyes.png", skillName: "Sharp Eyes", jobAdvancement: "4" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Sea_Serpent.png", skillName: "Sea Serpent", jobAdvancement: "2" },
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Crossbones.png", skillName: "Crossbones", jobAdvancement: "4" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Monkey_Magic.png", skillName: "Monkey Magic", jobAdvancement: "2" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Jolly_Roger.png", skillName: "Jolly Roger", jobAdvancement: "4" },
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "dark_knight",
    nexonJobName: "Dark Knight",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Evil_Eye.png", skillName: "Evil Eye", jobAdvancement: "2" },
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Cross_Surge.png", skillName: "Cross Surge", jobAdvancement: "3" },
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Dark_Resonance.png", skillName: "Dark Resonance", jobAdvancement: "4" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Spirit_Blade.png", skillName: "Spirit Blade", jobAdvancement: "2" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "marksman",
    nexonJobName: "Marksman",
    buffSkills: [
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Sharp_Eyes.png", skillName: "Sharp Eyes", jobAdvancement: "4" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Bleed_Dart.png", skillName: "Bleed Dart", jobAdvancement: "Hyper Skills (140)" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Combat_Orders.png", skillName: "Combat Orders", jobAdvancement: "3" },
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Parashock_Guard.png", skillName: "Parashock Guard", jobAdvancement: "3" },
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Divine_Blessing.png", skillName: "Divine Blessing", jobAdvancement: "4" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "pathfinder",
    nexonJobName: "Pathfinder",
    buffSkills: [
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Sharp_Eyes.png", skillName: "Sharp Eyes", jobAdvancement: "4" },
      DCO,
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "shadower",
    nexonJobName: "Shadower",
    warnings: [{ message: "Must have 0 stacks for Flip of the Coin (Hyper Skill)" }],
    buffSkills: [DSE, DCO],
    requiredStats: ["luk", "dex", "str", "attackPower"],
  },
  {
    id: "adele",
    nexonJobName: "Adele",
    warnings: [{ message: "Must have 0 stacks for Resonance Rush (2nd job)" }],
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "ark",
    nexonJobName: "Ark",
    warnings: [
      { message: "Must be in Flora form (not Specter)" },
      { message: "Must have 0 Spell Bullets (1st job)" },
      { message: "Do not use Loaded Dice (5th job)", skill: LOADED_DICE },
    ],
    buffSkills: [DSE, DCO],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "illium",
    nexonJobName: "Illium",
    warnings: [{ message: "Must have 0 stacks (moving, Lucent Brand 1st job)" }],
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Maha_Blessing.png", skillName: "Maha Blessing", jobAdvancement: "3" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "evan",
    nexonJobName: "Evan",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Blessing_of_the_Onyx.png", skillName: "Blessing of the Onyx", jobAdvancement: "4" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "luminous",
    nexonJobName: "Luminous",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Photic_Meditation.png", skillName: "Photic Meditation", jobAdvancement: "3" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "mercedes",
    nexonJobName: "Mercedes",
    warnings: [{ message: "Must have 0 stacks (Ignis Roar, 3rd job)" }],
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Ancient_Warding.png", skillName: "Ancient Warding", jobAdvancement: "4" },
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Elvish_Blessing.png", skillName: "Elvish Blessing", jobAdvancement: "Hyper Skills (140)" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Nature%27s_Providence.png", skillName: "Nature's Providence", jobAdvancement: "3" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "mo_xuan",
    nexonJobName: "Mo Xuan",
    warnings: [
      { message: "Must have 5 stacks for Heir of the Divine (4th job)" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Star_Gazer.png", skillName: "Star Gazer", jobAdvancement: "4" },
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "cadena",
    nexonJobName: "Cadena",
    warnings: [{ message: "Must have 0 stacks for Muscle Memory (2nd job)" }],
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Realign_Attacker_Mode.png", skillName: "Realign: Attacker Mode", jobAdvancement: "Beginner" },
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Blaze_On.png", skillName: "Blaze On", jobAdvancement: "2" },
    ],
    requiredStats: ["str", "dex", "attackPower"],
  },
  {
    id: "battle_mage",
    nexonJobName: "Battle Mage",
    buffSkills: [
      DSE,
      DCO,
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Dark_Aura.png", skillName: "Dark Aura", jobAdvancement: "4" },
    ],
    requiredStats: ["int", "luk", "magicAtt"],
  },
  {
    id: "blaster",
    nexonJobName: "Blaster",
    warnings: [{ message: "Must have 0 stacks for Combo Training (3rd job)" }],
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Tank_Mech.png", skillName: "Tank Mech", jobAdvancement: "3" },
    ],
    requiredStats: ["dex", "str", "attackPower"],
  },
  {
    id: "wild_hunter",
    nexonJobName: "Wild Hunter",
    buffSkills: [
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Sharp_Eyes.png", skillName: "Sharp Eyes", jobAdvancement: "4" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Celestial_Alignment.png", skillName: "Celestial Alignment", jobAdvancement: "2" },
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
      { skillIconUrl: "https://media.maplestorywiki.net/yetidb/Skill_Divine_Aura.png", skillName: "Divine Aura", jobAdvancement: "Transcendent" },
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

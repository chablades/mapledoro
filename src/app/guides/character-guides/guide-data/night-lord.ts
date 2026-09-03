import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Night Lord config — reconciled from night-lord.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Thief baseStats cap Weapon Mastery at 85%; Dark Sight surfaced in Utility. [OK] base
  data · [DRAFT] sequence · [ICON] icons omitted · [DESIGN] description. innerAbility
  duplicated to both columns.
*/

export const nightLord: ClassConfig = {
  name: "Night Lord",
  branch: "Explorers",
  archetype: "Thief",
  description:
    "The king of bind-and-burst — Life and Death locks a boss while stacked Quad Star and Death Star delete it, all while Dark Sight dodges a long list of boss attacks.",
  portraitUrl: classPortraitUrl("Night Lord"),
  accentColor: "#4a3f7a",
  facts: [
    { label: "Primary weapon", value: "Claw" },
    { label: "Secondary", value: "Charm" },
    { label: "Main stat", value: "LUK · DEX" },
    { label: "Playstyle", value: "Bind & burst" },
  ],
  linkSkill: {
    name: "Thief's Cunning",
    desc: "On debuffing an enemy — +Damage for 10s (20s cd).",
    pills: [
      ["Lv6", "+18%", "20s"],
      ["Lv9", "+27%", "20s"],
    ],
    note: "Stacks ×3, one per Explorer Thief at master level.",
  },
  legion: "Critical Rate +1 / 2 / 3 / 4 / 5%",
  weaponNote:
    "Claw + Charm applies a 1.75× multiplier (attack Stage 8). Uses Throwing Stars for ammo. Weapon Mastery caps at 85%.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Attack +21" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Attack +21" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    bleedDart: { name: "Bleed Dart", desc: "+50 ATT buff + bleed. 90s." },
    lastResort: { name: "Last Resort", nodeType: "boost", desc: "+30 ATT, ×+10–24% Final Damage (by stage). 30s / 60s cd." },
    throwBlasting: { name: "Throw Blasting", nodeType: "boost", desc: "Buff. 60s / 120s cd." },
    throwingStarBarrage: { name: "Throwing Star Barrage", nodeType: "boost", desc: "Burst buff / line. 30s / 120s cd." },
    shadowWalker: { name: "Shadow Walker", nodeType: "boost", desc: "×+14% Final Damage while in Dark Sight. 20s / 120s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) LUK window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    // ── Attacks / summons ──
    quadStar: { name: "Quad Star", desc: "Main attack — throws 4 stars." },
    deathStar: { name: "Death Star", desc: "Hyper burst nuke." },
    suddenRaid: { name: "Sudden Raid", desc: "Burst line." },
    frailtyCurse: { name: "Frailty Curse", desc: "Zone — +20% Boss, +30% Ignore DEF to enemies inside. Summon. 40s." },
    darkFlare: { name: "Dark Flare", nodeType: "boost", desc: "Placeable that blocks / reflects. 60s." },
    darkLordsOmen: { name: "Dark Lord's Omen", nodeType: "boost", desc: "Summon burst. 12s / 60s cd." },
    lifeAndDeath: { name: "Life and Death", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Survivability ──
    darkSight: { name: "Dark Sight", desc: "Stealth toggle that dodges a long list of boss attacks (touch damage, debris, many specials). 0–15s cd." },
    nightfallSignet: { name: "Nightfall Signet", desc: "2s i-frame. 60s cd." },
    shadowShifter: { name: "Shadow Shifter", desc: "Chance to create a decoy that nullifies a hit." },
    // ── Passives (baseStats contributors) ──
    clawExpert: { name: "Claw Expert", nodeType: "boost", desc: "Passive — +70% mastery, +10% crit damage, +30 ATT." },
    darkHarmony: { name: "Dark Harmony", desc: "Passive — +20 ATT, ×+14% FD, +30% Ignore DEF." },
    spiritOfTheStar: { name: "Spirit of the Star", desc: "Passive — +10 ATT, +10% Boss Damage." },
    criticalThrow: { name: "Critical Throw", desc: "Passive — +50% crit rate, +5% crit damage." },
    expertThrowingStar: { name: "Expert Throwing Star Handling", desc: "Passive — +20% crit rate, ×+29% FD." },
    alchemicAdrenaline: { name: "Alchemic Adrenaline", desc: "+10% crit damage." },
    thiefsCunning: { name: "Thief's Cunning", desc: "Explorer Thief link — +18% Damage on debuff." },
    nimbleBody: { name: "Nimble Body", desc: "1st job passive — +20 LUK, +avoid." },
    agileClaws: { name: "Agile Claws", desc: "2nd job passive — +2 attack speed, +20 LUK." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 LUK / DEX." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +LUK to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "bleedDart" },
    { skill: "lastResort" },
    { skill: "throwBlasting" },
    { skill: "throwingStarBarrage" },
    { skill: "shadowWalker" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "frailtyCurse" },
    { skill: "darkFlare" },
    { skill: "darkLordsOmen" },
    { skill: "suddenRaid" },
    { skill: "deathStar" },
    { skill: "lifeAndDeath" },
    { skill: "quadStar" },
  ],
  seqNote:
    "Stack attack buffs and summons, drop Frailty Curse, then bind with Life and Death and burst Quad Star / Death Star. Draft order — confirm with the Night Lord Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Bind & burst",
      rows: [
        { skill: "lifeAndDeath", timing: "10s · 360s cd" },
        { skill: "quadStar", timing: "burst" },
      ],
    },
    {
      label: "Dark Sight & iFrames",
      rows: [
        { skill: "darkSight", timing: "dodge boss attacks" },
        { skill: "nightfallSignet", timing: "2s · 60s cd" },
        { skill: "shadowShifter", timing: "decoy block" },
      ],
    },
    {
      label: "Party",
      rows: [{ skill: "frailtyCurse", timing: "+Boss / IED zone · 40s" }],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Thieves cap Weapon Mastery at 85%.",
    rows: [
      { stat: "Weapon multiplier", total: "1.75×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 8",
        sub: "base Stage 6",
        parts: [{ skill: "agileClaws", value: "+2" }],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "clawExpert", value: "+70%" }],
      },
      {
        stat: "LUK",
        total: "+70 · +15% AP",
        parts: [
          { skill: "nimbleBody", value: "+20" },
          { skill: "agileClaws", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +110 (140)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "spiritOfTheStar", value: "+10" },
          { skill: "darkHarmony", value: "+20" },
          { skill: "clawExpert", value: "+30" },
          { skill: "bleedDart", value: "+50", cond: "temp" },
          { skill: "lastResort", value: "+30", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+75%",
        sub: "incl. +5% base",
        parts: [
          { skill: "criticalThrow", value: "+50%" },
          { skill: "expertThrowingStar", value: "+20%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+25%",
        parts: [
          { skill: "criticalThrow", value: "+5%" },
          { skill: "alchemicAdrenaline", value: "+10%" },
          { skill: "clawExpert", value: "+10%" },
        ],
      },
      {
        stat: "Damage",
        total: "(+48%)",
        parts: [
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "thiefsCunning", value: "+18%", cond: "debuff" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+30%",
        parts: [
          { skill: "spiritOfTheStar", value: "+10%" },
          { skill: "frailtyCurse", value: "+20%" },
        ],
      },
      {
        stat: "Final damage",
        total: "+47.06% (107.88%)",
        parts: [
          { skill: "expertThrowingStar", value: "×+29%" },
          { skill: "darkHarmony", value: "×+14%" },
          { skill: "shadowWalker", value: "×+14%", cond: "temp" },
          { skill: "lastResort", value: "×+10–24%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+51% (58%)",
        parts: [
          { skill: "darkHarmony", value: "×+30%" },
          { skill: "frailtyCurse", value: "×+30% zone" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/night-lord", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Night_Lord", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Marksman config — reconciled from marksman.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Archer baseStats cap Weapon Mastery at 85%. [OK] base data · [DRAFT] sequence ·
  [ICON] icons omitted · [DESIGN] description. innerAbility duplicated to both columns.
*/

export const marksman: ClassConfig = {
  name: "Marksman",
  branch: "Explorers",
  archetype: "Archer",
  description:
    "A long-range sniper who deletes single targets with the guaranteed-crit Snipe — Evasion Boost pushes crit rate to ~100%, so everything crits, all from a safe distance.",
  portraitUrl: classPortraitUrl("Marksman"),
  accentColor: "#5277a8",
  facts: [
    { label: "Primary weapon", value: "Crossbow" },
    { label: "Secondary", value: "Bow Thimble" },
    { label: "Main stat", value: "DEX · STR" },
    { label: "Playstyle", value: "Single-target snipe" },
  ],
  linkSkill: {
    name: "Adventurer's Curiosity",
    desc: "+Crit Rate (and +Monster Collection chance).",
    pills: [
      ["Lv6", "+10% Crit", "+35% Coll"],
      ["Lv9", "+15% Crit", "+50% Coll"],
    ],
    note: "Stacks ×3, one per Explorer Archer at master level.",
  },
  legion: "Critical Rate +1 / 2 / 3 / 4 / 5%",
  weaponNote:
    "Crossbow + Bow Thimble applies a 1.35× multiplier (attack Stage 7). Uses Arrows for ammo; Soul Arrow removes consumption. Weapon Mastery caps at 85%.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1" },
      { tier: "unq", tag: "Unique", text: "Crit Rate +20%" },
      { tier: "epc", tag: "Epic", text: "Boss Damage +10%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1" },
      { tier: "unq", tag: "Unique", text: "Crit Rate +20%" },
      { tier: "epc", tag: "Epic", text: "Boss Damage +10%" },
    ],
  },
  skills: {
    // ── Buffs ──
    sharpEyes: { name: "Sharp Eyes", desc: "Party crit buff — +20% crit rate, +15% crit damage. 300s." },
    bullseyeShot: { name: "Bullseye Shot", desc: "Buff — +20% crit rate, +10% crit damage, +20% Damage, ×+20% Ignore DEF. 40s / 120s cd." },
    viciousShot: { name: "Vicious Shot", nodeType: "boost", desc: "+crit damage (50% of crit rate). 30s / 120s cd." },
    evasionBoost: { name: "Evasion Boost", desc: "+100% crit rate on activation — effectively guaranteed crits." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) DEX window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    // ── Attacks / summons ──
    snipe: { name: "Snipe", desc: "Signature single-target nuke — guaranteed crit, long range." },
    frostprey: { name: "Frostprey", nodeType: "boost", desc: "Bird summon. 220s." },
    arrowIllusion: { name: "Arrow Illusion", desc: "Decoy summon; ×+30% Ignore DEF. 30s." },
    furyOfTheWild: { name: "Fury of the Wild", nodeType: "boost", desc: "Beast summon burst. 40s / 105s cd." },
    finalAim: { name: "Final Aim", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── iFrames ──
    painKiller: { name: "Pain Killer", desc: "3s i-frame. 75s cd." },
    perfectShot: { name: "Perfect Shot", nodeType: "boost", desc: "Burst line; up to 2s i-frame while casting + 1s after. 60s cd." },
    // ── Passives (baseStats contributors) ──
    crossbowExpert: { name: "Crossbow Expert", nodeType: "boost", desc: "Passive — +70% mastery, +15% crit damage, +30 ATT." },
    crossbowMastery: { name: "Crossbow Mastery", desc: "×+20% Final Damage." },
    greaterEmpoweredArrows: { name: "Greater Empowered Arrows", desc: "×+8% FD passive, +4% FD / +13% Ignore DEF from buff." },
    boltSurplus: { name: "Bolt Surplus", desc: "×+15% Final Damage." },
    lastManStanding: { name: "Last Man Standing", desc: "×+10% Final Damage." },
    marksmanship: { name: "Marksmanship", desc: "Passive — +15% Damage, ×+25% Ignore DEF." },
    recklessHunt: { name: "Reckless Hunt: Crossbow", desc: "+20% crit damage." },
    soulArrow: { name: "Soul Arrow: Crossbow", desc: "+30 ATT; no arrow consumption." },
    criticalShot: { name: "Critical Shot", desc: "Passive — +40% crit rate." },
    mortalBlow: { name: "Mortal Blow", desc: "+20% Damage (10% chance)." },
    illusionStep: { name: "Illusion Step", desc: "Passive — +80 DEX, +avoid." },
    adventurersCuriosity: { name: "Adventurer's Curiosity", desc: "Explorer Archer link — +15% crit rate." },
    archeryMastery: { name: "Archery Mastery", desc: "Passive — +1 attack speed." },
    agileCrossbows: { name: "Agile Crossbows", desc: "2nd job passive — +2 attack speed, +20 DEX." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 DEX / STR." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +DEX to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "sharpEyes" },
    { skill: "bullseyeShot" },
    { skill: "viciousShot" },
    { skill: "evasionBoost" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "frostprey" },
    { skill: "arrowIllusion" },
    { skill: "furyOfTheWild" },
    { skill: "finalAim" },
    { skill: "snipe" },
  ],
  seqNote:
    "Stack Sharp Eyes and Bullseye Shot, raise your summons, then open with Snipe inside the Final Aim window. Draft order — confirm with the Marksman Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Burst & crit",
      rows: [
        { skill: "snipe", timing: "guaranteed-crit nuke" },
        { skill: "evasionBoost", timing: "crit → ~100%" },
      ],
    },
    {
      label: "iFrames",
      rows: [
        { skill: "painKiller", timing: "3s · 75s cd" },
        { skill: "perfectShot", timing: "up to 2s · 60s cd" },
      ],
    },
    {
      label: "Support & binds",
      rows: [
        { skill: "sharpEyes", timing: "+20% crit · 300s" },
        { skill: "finalAim", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Archers cap Weapon Mastery at 85%.",
    rows: [
      { stat: "Weapon multiplier", total: "1.35×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 4",
        parts: [
          { skill: "archeryMastery", value: "+1" },
          { skill: "agileCrossbows", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "crossbowExpert", value: "+70%" }],
      },
      {
        stat: "DEX",
        total: "+130 · +15% AP",
        parts: [
          { skill: "agileCrossbows", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "illusionStep", value: "+80" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +60",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "soulArrow", value: "+30" },
          { skill: "crossbowExpert", value: "+30" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+75% (95% excl. Evasion Boost)",
        sub: "incl. +5% base",
        parts: [
          { skill: "adventurersCuriosity", value: "+10%" },
          { skill: "criticalShot", value: "+40%" },
          { skill: "sharpEyes", value: "+20%" },
          { skill: "bullseyeShot", value: "+20%", cond: "temp" },
          { skill: "evasionBoost", value: "+100%", cond: "temp" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+50% (60%)",
        parts: [
          { skill: "recklessHunt", value: "+20%" },
          { skill: "sharpEyes", value: "+15%" },
          { skill: "crossbowExpert", value: "+15%" },
          { skill: "bullseyeShot", value: "+10%", cond: "temp" },
          { skill: "viciousShot", value: "+50% of crit", cond: "temp" },
        ],
      },
      {
        stat: "Damage",
        total: "+15% (85%)",
        parts: [
          { skill: "marksmanship", value: "+15%" },
          { skill: "bullseyeShot", value: "+20%", cond: "temp" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "mortalBlow", value: "+20%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+63.94% (70.5%)",
        parts: [
          { skill: "crossbowMastery", value: "×+20%" },
          { skill: "greaterEmpoweredArrows", value: "×+8%" },
          { skill: "boltSurplus", value: "×+15%" },
          { skill: "lastManStanding", value: "×+10%" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+58% (70.77%)",
        parts: [
          { skill: "marksmanship", value: "×+25%" },
          { skill: "greaterEmpoweredArrows", value: "×+20%" },
          { skill: "arrowIllusion", value: "×+30%" },
          { skill: "bullseyeShot", value: "×+20%", cond: "temp" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/marksman", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Marksman", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Pathfinder config — reconciled from pathfinder.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Relic-gauge archer; Ancient/Enhanced Force skills carry a separate +50% Boss / +FD
  line. Archer mastery caps at 85%. [OK] base data · [DRAFT] sequence · [ICON] icons
  omitted · [DESIGN] description. innerAbility duplicated to both columns.
*/

export const pathfinder: ClassConfig = {
  name: "Pathfinder",
  branch: "Explorers",
  archetype: "Archer",
  description:
    "A mobile relic-archer who fires Cardinal Force macros off a Relic Gauge — Ancient/Enhanced Force skills hit with a bonus +50% Boss Damage, backed by several defensive windows.",
  portraitUrl: classPortraitUrl("Pathfinder"),
  accentColor: "#2a9d8f",
  facts: [
    { label: "Primary weapon", value: "Ancient Bow" },
    { label: "Secondary", value: "Relic" },
    { label: "Main stat", value: "DEX · STR" },
    { label: "Playstyle", value: "Relic gauge · mobile" },
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
  legion: "DEX +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Ancient Bow + Relic applies a 1.3× multiplier (attack Stage 7). Weapon Mastery caps at 85%. Skills draw from the Relic Gauge (Deluge / Burst / Torrent emblems).",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Chance to Skip Cooldown +20%" },
      { tier: "unq", tag: "Unique", text: "Crit Rate +20%" },
      { tier: "epc", tag: "Epic", text: "Boss Damage +10%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Chance to Skip Cooldown +20%" },
      { tier: "unq", tag: "Unique", text: "Crit Rate +20%" },
      { tier: "epc", tag: "Epic", text: "Boss Damage +10%" },
    ],
  },
  skills: {
    // ── Buffs ──
    sharpEyes: { name: "Sharp Eyes", desc: "Party crit buff — +20% crit rate, +15% crit damage. 300s." },
    cursebound: { name: "Cursebound Endurance", desc: "Buff. 300s." },
    awakenedRelic: { name: "Awakened Relic", desc: "Buff. 30s / 120s cd." },
    viciousShot: { name: "Vicious Shot", nodeType: "boost", desc: "+crit damage (50% of crit rate). 30s / 120s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) DEX window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    // ── Attacks / summons ──
    cardinalBurst: { name: "Cardinal Burst", desc: "Main bossing macro (cast first); pairs with Cardinal Deluge." },
    shadowRaven: { name: "Shadow Raven", nodeType: "boost", desc: "Raven summon. 220s." },
    ravenTempest: { name: "Raven Tempest", nodeType: "boost", desc: "Summon burst. 27s / 10s · 120s cd." },
    relicUnbound: { name: "Relic Unbound", nodeType: "boost", desc: "Burst. 22s / 10s / 40s · 120s cd." },
    furyOfTheWild: { name: "Fury of the Wild", nodeType: "boost", desc: "Beast summon burst. 40s / 105s cd." },
    forsakenRelic: { name: "Forsaken Relic", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Defense ──
    ancientAstra: { name: "Ancient Astra", desc: "Hyper burst — Burst variant is a 2s i-frame (35s cd); Deluge/Torrent variant is −60% damage taken while casting (25s cd)." },
    obsidianBarrier: { name: "Obsidian Barrier", nodeType: "boost", desc: "−40% damage taken + 10% crit damage, 12s. 120s cd." },
    novaBlast: { name: "Nova Blast", nodeType: "boost", desc: "Burst line with i-frame. 120s cd." },
    // ── Passives (baseStats contributors) ──
    ancientArchery: { name: "Ancient Archery", desc: "+50% Boss & ×+10% FD to Ancient / Enhanced Force skills." },
    ancientBowExpertise: { name: "Ancient Bow Expertise", nodeType: "boost", desc: "Passive — +70% mastery, ×+12% FD, +60 ATT." },
    guidanceOfAncients: { name: "Guidance of the Ancients", desc: "×+28% Final Damage passive." },
    archersEssence: { name: "Archer's Essence", desc: "Passive — +10% crit rate, +10% Damage, +30% Ignore DEF." },
    bountifulTorrent: { name: "Bountiful Torrent", desc: "+25% ATT." },
    curseweaver: { name: "Curseweaver", desc: "+10% crit damage to Ancient Bow skills." },
    illusionStep: { name: "Illusion Step", desc: "Passive — +80 DEX, +avoid." },
    evasionBoost: { name: "Evasion Boost", desc: "+100% crit rate on activation." },
    forcefulShot: { name: "Forceful Shot", desc: "Passive — +40% crit rate." },
    ancientBowMastery: { name: "Ancient Bow Mastery", desc: "Passive — +30 ATT." },
    adventurersCuriosity: { name: "Adventurer's Curiosity", desc: "Explorer Archer link — +15% crit rate." },
    archeryMastery: { name: "Archery Mastery", desc: "Passive — +1 attack speed." },
    agileAncientBows: { name: "Agile Ancient Bows", desc: "2nd job passive — +2 attack speed, +20 DEX." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 DEX / STR." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +DEX to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "sharpEyes" },
    { skill: "cursebound" },
    { skill: "awakenedRelic" },
    { skill: "viciousShot" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "obsidianBarrier" },
    { skill: "shadowRaven" },
    { skill: "ravenTempest" },
    { skill: "relicUnbound" },
    { skill: "furyOfTheWild" },
    { skill: "forsakenRelic" },
    { skill: "cardinalBurst" },
  ],
  seqNote:
    "Stack buffs and summons, then fire the Cardinal Burst / Deluge macro inside the Forsaken Relic window. Draft order — confirm with the Pathfinder Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "iFrames & defense",
      rows: [
        { skill: "ancientAstra", timing: "2s i-frame · 35s cd" },
        { skill: "novaBlast", timing: "i-frame · 120s cd" },
        { skill: "obsidianBarrier", timing: "−40% · 12s · 120s cd" },
      ],
    },
    {
      label: "Support",
      rows: [{ skill: "sharpEyes", timing: "+20% crit · 300s" }],
    },
    {
      label: "Binds",
      rows: [{ skill: "forsakenRelic", timing: "10s · 360s cd" }],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Archers cap Weapon Mastery at 85%.",
    rows: [
      { stat: "Weapon multiplier", total: "1.3×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 4",
        parts: [
          { skill: "archeryMastery", value: "+1" },
          { skill: "agileAncientBows", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "ancientBowExpertise", value: "+70%" }],
      },
      {
        stat: "DEX",
        total: "+130 · +15% AP",
        parts: [
          { skill: "agileAncientBows", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "illusionStep", value: "+80" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+29% · +90",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "bountifulTorrent", value: "+25%" },
          { skill: "ancientBowMastery", value: "+30" },
          { skill: "ancientBowExpertise", value: "+60" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+85% (excl. Evasion Boost)",
        sub: "incl. +5% base",
        parts: [
          { skill: "adventurersCuriosity", value: "+10%" },
          { skill: "forcefulShot", value: "+40%" },
          { skill: "archersEssence", value: "+10%" },
          { skill: "sharpEyes", value: "+20%" },
          { skill: "evasionBoost", value: "+100%", cond: "temp" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+25% (35%)",
        parts: [
          { skill: "sharpEyes", value: "+15%" },
          { skill: "curseweaver", value: "+10%" },
          { skill: "obsidianBarrier", value: "+10%", cond: "temp" },
          { skill: "viciousShot", value: "+50% of crit", cond: "temp" },
        ],
      },
      {
        stat: "Damage",
        total: "+10% (40%)",
        parts: [
          { skill: "archersEssence", value: "+10%" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+50% (AF/EF)",
        sub: "Ancient / Enhanced Force skills only",
        parts: [{ skill: "ancientArchery", value: "+50%" }],
      },
      {
        stat: "Final damage",
        total: "+43.36% (57.7% AF/EF)",
        parts: [
          { skill: "guidanceOfAncients", value: "×+28%" },
          { skill: "ancientBowExpertise", value: "×+12%" },
          { skill: "ancientArchery", value: "×+10% AF/EF" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+30%",
        parts: [{ skill: "archersEssence", value: "+30%" }],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/pathfinder", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Pathfinder", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

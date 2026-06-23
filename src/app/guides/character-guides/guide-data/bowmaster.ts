import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Bow Master config — reconciled from bowmaster.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts
  (canonical name "Bow Master"; route slug bow-master). Archer baseStats cap Weapon
  Mastery at 85% and lean on %ATT. [OK] base data · [DRAFT] sequence · [ICON] icons
  omitted · [DESIGN] description. innerAbility duplicated to both columns.
*/

export const bowmaster: ClassConfig = {
  name: "Bow Master",
  branch: "Explorers",
  archetype: "Archer",
  description:
    "A channel-DPS archer who locks Hurricane onto a boss and powers the whole party with Sharp Eyes — backed by a 90% big-hit block for one-shot insurance.",
  portraitUrl: classPortraitUrl("Bow Master"),
  accentColor: "#43a86a",
  facts: [
    { label: "Primary weapon", value: "Bow" },
    { label: "Secondary", value: "Arrow Fletching" },
    { label: "Main stat", value: "DEX · STR" },
    { label: "Playstyle", value: "Channel · crit support" },
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
    "Bow + Arrow Fletching applies a 1.3× multiplier (attack Stage 7). Uses Arrows for ammo; Soul Arrow removes consumption. Weapon Mastery caps at 85%.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Crit Rate +20%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Crit Rate +20%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    sharpEyes: { name: "Sharp Eyes", desc: "Party crit buff — +20% crit rate, +15% crit damage. 300s." },
    concentration: { name: "Concentration", desc: "+50 ATT, +20% Boss Damage buff. 40s / 120s cd." },
    quiverBarrage: { name: "Quiver Barrage", nodeType: "boost", desc: "+20% ATT, ×+15% Final Damage. 40s / 120s cd." },
    viciousShot: { name: "Vicious Shot", nodeType: "boost", desc: "+crit damage (50% of crit rate). 30s / 120s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) DEX window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    stormOfArrows: { name: "Storm of Arrows", nodeType: "boost", desc: "+30% Damage burst. 70s / 120s cd." },
    inhumanSpeed: { name: "Inhuman Speed", nodeType: "boost", desc: "Attack-speed / uptime burst. 3–30s / 120s cd." },
    // ── Attacks / summons ──
    hurricane: { name: "Hurricane", desc: "Main bossing line — a channel of continuous arrows." },
    phoenix: { name: "Phoenix", nodeType: "boost", desc: "Summon. 220s." },
    arrowBlaster: { name: "Arrow Blaster", desc: "Placeable cannon summon. 60s." },
    furyOfTheWild: { name: "Fury of the Wild", nodeType: "boost", desc: "Beast summon burst. 40s / 105s cd." },
    ascendantShadow: { name: "Ascendant Shadow", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Defense / mobility ──
    silhouetteMirage: { name: "Silhouette Mirage", nodeType: "boost", desc: "Toggle — blocks 90% of hits dealing >50% Max HP. Max 2 charges, 50s recharge." },
    zephyrShield: { name: "Zephyr Shield", desc: "3s i-frame. 120s cd." },
    blinkShot: { name: "Blink Shot", desc: "Mobility + summon. 120s." },
    // ── Passives (baseStats contributors) ──
    bowExpert: { name: "Bow Expert", nodeType: "boost", desc: "Passive — +70% mastery, +16% crit damage, +60 ATT." },
    armorBreak: { name: "Armor Break", desc: "×+13% Final Damage, ×+40% Ignore DEF." },
    enchantedQuiver: { name: "Enchanted Quiver", desc: "×+6% Final Damage." },
    illusionStep: { name: "Illusion Step", desc: "Passive — +80 DEX, +avoid." },
    advFinalAttack: { name: "Advanced Final Attack", desc: "+20 ATT, follow-up hits." },
    criticalShot: { name: "Critical Shot", desc: "Passive — +40% crit rate." },
    marksmanship: { name: "Marksmanship", desc: "Passive — +25% ATT, ×+25% Ignore DEF." },
    recklessHunt: { name: "Reckless Hunt: Bow", desc: "+40 ATT, ×+30% Final Damage." },
    soulArrow: { name: "Soul Arrow: Bow", desc: "+30 ATT; no arrow consumption." },
    mortalBlow: { name: "Mortal Blow", desc: "+35% Damage after 30 hits." },
    adventurersCuriosity: { name: "Adventurer's Curiosity", desc: "Explorer Archer link — +15% crit rate." },
    archeryMastery: { name: "Archery Mastery", desc: "Passive — +1 attack speed." },
    agileBows: { name: "Agile Bows", desc: "2nd job passive — +2 attack speed, +20 DEX." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 DEX / STR." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +DEX to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "sharpEyes" },
    { skill: "concentration" },
    { skill: "quiverBarrage" },
    { skill: "viciousShot" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "stormOfArrows" },
    { skill: "inhumanSpeed" },
    { skill: "phoenix" },
    { skill: "arrowBlaster" },
    { skill: "furyOfTheWild" },
    { skill: "ascendantShadow" },
    { skill: "hurricane" },
  ],
  seqNote:
    "Stack Sharp Eyes and attack buffs, drop your summons, then channel Hurricane inside the Ascendant Shadow window. Draft order — confirm with the Bow Master Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Party support",
      rows: [{ skill: "sharpEyes", timing: "+20% crit / +15% crit dmg · 300s" }],
    },
    {
      label: "Defense",
      rows: [
        { skill: "silhouetteMirage", timing: "block 90% big hits · 2 charges" },
        { skill: "zephyrShield", timing: "3s · 120s cd" },
      ],
    },
    {
      label: "Binds & mobility",
      rows: [
        { skill: "ascendantShadow", timing: "10s · 360s cd" },
        { skill: "blinkShot", timing: "teleport · 120s" },
      ],
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
          { skill: "agileBows", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "bowExpert", value: "+70%" }],
      },
      {
        stat: "DEX",
        total: "+130 · +15% AP",
        parts: [
          { skill: "agileBows", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "illusionStep", value: "+80" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+29% (49%) · +150 (200)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "marksmanship", value: "+25%" },
          { skill: "bowExpert", value: "+60" },
          { skill: "recklessHunt", value: "+40" },
          { skill: "soulArrow", value: "+30" },
          { skill: "advFinalAttack", value: "+20" },
          { skill: "quiverBarrage", value: "+20%", cond: "temp" },
          { skill: "concentration", value: "+50", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+75%",
        sub: "incl. +5% base",
        parts: [
          { skill: "adventurersCuriosity", value: "+10%" },
          { skill: "criticalShot", value: "+40%" },
          { skill: "sharpEyes", value: "+20%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+31%",
        parts: [
          { skill: "sharpEyes", value: "+15%" },
          { skill: "bowExpert", value: "+16%" },
          { skill: "viciousShot", value: "+50% of crit", cond: "temp" },
        ],
      },
      {
        stat: "Damage",
        total: "(95%)",
        parts: [
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "stormOfArrows", value: "+30%", cond: "temp" },
          { skill: "mortalBlow", value: "+35%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "(20%)",
        parts: [{ skill: "concentration", value: "+20%", cond: "temp" }],
      },
      {
        stat: "Final damage",
        total: "+55.71% (79.07%)",
        parts: [
          { skill: "recklessHunt", value: "×+30%" },
          { skill: "enchantedQuiver", value: "×+6%" },
          { skill: "armorBreak", value: "×+13%" },
          { skill: "quiverBarrage", value: "×+15%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+55% (57.25%)",
        parts: [
          { skill: "marksmanship", value: "×+25%" },
          { skill: "armorBreak", value: "×+40%" },
          { skill: "sharpEyes", value: "×+5%" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/bowmaster", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Bow_Master", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

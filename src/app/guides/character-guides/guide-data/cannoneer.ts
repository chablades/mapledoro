import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Cannoneer config — reconciled from cannoneer.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Explosive cannon DPS with monkey summons and a party STR buff; highest flat STR.
  [OK] base data · [DRAFT] sequence · [ICON] icons omitted · [DESIGN] description.
  innerAbility duplicated to both columns.
*/

export const cannoneer: ClassConfig = {
  name: "Cannoneer",
  branch: "Explorers",
  archetype: "Pirate",
  description:
    "An explosive cannon pirate who blankets bosses with monkey summons and giant blasts, buffs the party's STR with Mega Monkey Magic, and shrugs off hits.",
  portraitUrl: classPortraitUrl("Cannoneer"),
  accentColor: "#d98b3a",
  facts: [
    { label: "Primary weapon", value: "Hand Cannon" },
    { label: "Secondary", value: "Powder Keg" },
    { label: "Main stat", value: "STR · DEX" },
    { label: "Playstyle", value: "Cannon burst · summons" },
  ],
  linkSkill: {
    name: "Pirate's Blessing",
    desc: "+All Stat, +Max HP/MP, −Damage Taken. Toggle swaps equip STR ↔ DEX.",
    pills: [
      ["Lv6", "+70 stat", "−15%"],
      ["Lv9", "+100 stat", "−21%"],
    ],
    note: "Stacks ×3, one per Explorer Pirate at master level.",
  },
  legion: "STR +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Hand Cannon + Powder Keg applies a 1.5× multiplier (attack Stage 7 after passives). Weapon Mastery caps at 85%.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1" },
      { tier: "unq", tag: "Unique", text: "Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1" },
      { tier: "unq", tag: "Unique", text: "Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    megaMonkeyMagic: { name: "Mega Monkey Magic", desc: "Party buff — +60 STR (and self stats). 180s." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) STR window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    poolmaker: { name: "Poolmaker", nodeType: "boost", desc: "+30% Damage zone. 60s / 60s cd." },
    piratesBanner: { name: "Pirate's Banner", nodeType: "boost", desc: "+25% (AP) STR, ×+25% Ignore DEF placeable. 30s." },
    overdrive: { name: "Overdrive", nodeType: "boost", desc: "+ATT (% of base weapon power). 28s / 60s cd." },
    // ── Attacks / summons ──
    cannonBarrage: { name: "Cannon Barrage", desc: "Main bossing line." },
    supportMonkey: { name: "Support Monkey", nodeType: "boost", desc: "Cannon-monkey summon. 60s." },
    anchorsAweigh: { name: "Anchors Aweigh", nodeType: "boost", desc: "Anchor summon. 60s." },
    monkeyBusiness: { name: "Monkey Business", nodeType: "boost", desc: "Monkey-squad summon. 25s / 60s cd." },
    rollingRainbow: { name: "Rolling Rainbow", desc: "Rainbow summon burst. 12s / 60s cd." },
    cannonOfMassDestruction: { name: "Cannon of Mass Destruction", nodeType: "boost", desc: "Giant cannon burst; max 2 charges, 30s recharge." },
    superCannonExplosion: { name: "Super Cannon Explosion", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Survivability ──
    cannonProof: { name: "Cannon-Proof", desc: "2.5s i-frame. 30s cd." },
    // ── Passives (baseStats contributors) ──
    cannonOverload: { name: "Cannon Overload", nodeType: "boost", desc: "Passive — +70% mastery, ×+30% FD, +20% Ignore DEF, +1 attack speed." },
    piratesSpirit: { name: "Pirate's Spirit", desc: "Passive — +29% Boss Damage." },
    monkeyFury: { name: "Monkey Fury", desc: "+40% Damage; Monkey Mortar summon." },
    fortyWinks: { name: "Forty Winks", desc: "Toggle — +20% crit rate, +15% crit damage, ×+10% FD." },
    reinforcedCannon: { name: "Reinforced Cannon", desc: "+40 ATT, ×+5% FD, +1 attack speed." },
    counterCrush: { name: "Counter Crush", desc: "×+5% Final Damage." },
    criticalFire: { name: "Critical Fire", desc: "Passive — +20% crit rate, +5% crit damage." },
    cannonBoost: { name: "Cannon Boost", desc: "+20 ATT." },
    buckshot: { name: "Buckshot", desc: "Passive — +1 attack speed." },
    loadedDice: { name: "Loaded Dice", desc: "Gambling buff — +40 ATT." },
    piratesBlessing: { name: "Pirate's Blessing", desc: "Explorer Pirate link — +100 all stats, −21% damage taken." },
    agileCannons: { name: "Agile Cannons", desc: "2nd job passive — +2 attack speed, +20 STR." },
    pirateTraining: { name: "Pirate Training", desc: "2nd job passive — +30 STR." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +STR to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "megaMonkeyMagic" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "poolmaker" },
    { skill: "piratesBanner" },
    { skill: "overdrive" },
    { skill: "supportMonkey" },
    { skill: "anchorsAweigh" },
    { skill: "monkeyBusiness" },
    { skill: "rollingRainbow" },
    { skill: "cannonOfMassDestruction" },
    { skill: "superCannonExplosion" },
    { skill: "cannonBarrage" },
  ],
  seqNote:
    "Buff up, deploy your monkeys, then bind with Super Cannon Explosion and burst Cannon Barrage (Cannon Bazooka filler). Draft order — confirm with the Cannoneer Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Party support",
      rows: [{ skill: "megaMonkeyMagic", timing: "+STR party · 180s" }],
    },
    {
      label: "Burst & zones",
      rows: [
        { skill: "cannonOfMassDestruction", timing: "2-charge nuke · 30s recharge" },
        { skill: "poolmaker", timing: "+30% dmg zone · 60s cd" },
      ],
    },
    {
      label: "iFrames & binds",
      rows: [
        { skill: "cannonProof", timing: "2.5s · 30s cd" },
        { skill: "superCannonExplosion", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Pirate's Blessing also grants −21% damage taken.",
    rows: [
      { stat: "Weapon multiplier", total: "1.5×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 2",
        parts: [
          { skill: "agileCannons", value: "+2" },
          { skill: "reinforcedCannon", value: "+1" },
          { skill: "cannonOverload", value: "+1" },
          { skill: "buckshot", value: "+1" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "cannonOverload", value: "+70%" }],
      },
      {
        stat: "STR",
        total: "+180 · +15% AP",
        parts: [
          { skill: "piratesBlessing", value: "+70" },
          { skill: "agileCannons", value: "+20" },
          { skill: "pirateTraining", value: "+30" },
          { skill: "megaMonkeyMagic", value: "+60" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
          { skill: "piratesBanner", value: "+25% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +60 (100)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "cannonBoost", value: "+20" },
          { skill: "reinforcedCannon", value: "+40" },
          { skill: "loadedDice", value: "+40", cond: "temp" },
          { skill: "overdrive", value: "+80% base ATT", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+45%",
        sub: "incl. +5% base",
        parts: [
          { skill: "criticalFire", value: "+20%" },
          { skill: "fortyWinks", value: "+20%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+20%",
        parts: [
          { skill: "criticalFire", value: "+5%" },
          { skill: "fortyWinks", value: "+15%" },
        ],
      },
      {
        stat: "Damage",
        total: "+40% (100%)",
        parts: [
          { skill: "monkeyFury", value: "+40%" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "poolmaker", value: "+30% zone", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+29%",
        parts: [{ skill: "piratesSpirit", value: "+29%" }],
      },
      {
        stat: "Final damage",
        total: "+57.66%",
        parts: [
          { skill: "fortyWinks", value: "×+10%" },
          { skill: "reinforcedCannon", value: "×+5%" },
          { skill: "counterCrush", value: "×+5%" },
          { skill: "cannonOverload", value: "×+30%" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+20% (40%)",
        parts: [
          { skill: "cannonOverload", value: "+20%" },
          { skill: "piratesBanner", value: "×+25%", cond: "temp" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/cannoneer", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Cannoneer", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

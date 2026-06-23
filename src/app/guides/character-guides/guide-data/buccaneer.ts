import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Buccaneer config — reconciled from buccaneer.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Durable brawler with Time Leap party cooldown reset. [OK] base data · [DRAFT]
  sequence · [ICON] icons omitted · [DESIGN] description. innerAbility duplicated to
  both columns.
*/

export const buccaneer: ClassConfig = {
  name: "Buccaneer",
  branch: "Explorers",
  archetype: "Pirate",
  description:
    "A tanky knuckle brawler who builds Serpent Scales into Assault-mode bursts — and resets the whole party's cooldowns with Time Leap for double-burst windows.",
  portraitUrl: classPortraitUrl("Buccaneer"),
  accentColor: "#3b8fd4",
  facts: [
    { label: "Primary weapon", value: "Knuckle" },
    { label: "Secondary", value: "Wrist Band" },
    { label: "Main stat", value: "STR · DEX" },
    { label: "Playstyle", value: "Combo brawler · utility" },
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
    "Knuckle + Wrist Band applies a 1.7× multiplier (attack Stage 8). Weapon Mastery reaches 90%.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    speedInfusion: { name: "Speed Infusion", desc: "Party attack-speed buff (+2 AS). 180s." },
    crossbones: { name: "Crossbones", nodeType: "boost", desc: "+70% mastery, +15% ATT, ×+13% FD buff. 180s." },
    doubleDown: { name: "Double Down", desc: "Gambling burst (rolls Loaded Dice)." },
    stimulatingConversation: { name: "Stimulating Conversation", desc: "+20% Damage, +20% Boss Damage buff. 60s / 120s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) STR window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    lightningForm: { name: "Lightning Form", nodeType: "boost", desc: "×+26% Final Damage; up to 3.6s i-frame during Energy Orb cast. 55s / 120s cd." },
    piratesBanner: { name: "Pirate's Banner", nodeType: "boost", desc: "+25% (AP) STR, ×+25% Ignore DEF placeable. 30s." },
    overdrive: { name: "Overdrive", nodeType: "boost", desc: "+ATT (% of base weapon power). 28s / 60s cd." },
    // ── Attacks / summons ──
    octopunch: { name: "Octopunch", desc: "Main bossing line (Fighting skill — triggers Sea Serpent's Rage / Raging Serpent Assault)." },
    seaSerpentsRage: { name: "Sea Serpent's Rage", desc: "Sea Serpent skill (auto-triggers from Octopunch); ×+10% Final Damage." },
    lordOfTheDeep: { name: "Lord of the Deep", nodeType: "boost", desc: "Serpent summon burst." },
    unleashNeptunus: { name: "Unleash Neptunus", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Survivability & party ──
    timeLeap: { name: "Time Leap", desc: "Resets the cooldowns of most party skills — marquee utility. 120s cd." },
    defensiveStance: { name: "Defensive Stance", desc: "−25% damage taken, 4s. 4s cd." },
    howlingFist: { name: "Howling Fist", nodeType: "boost", desc: "Burst; i-frame + −50% damage taken while punching. 60s cd." },
    // ── Passives (baseStats contributors) ──
    typhoonCrush: { name: "Typhoon Crush", desc: "+30 ATT, ×+10% FD, +40% Ignore DEF." },
    aggressiveStance: { name: "Aggressive Stance", desc: "+25% Damage passive." },
    precisionStrikes: { name: "Precision Strikes", desc: "+30 ATT, +15% crit (+20% vs bosses), +10% crit damage." },
    groggyMastery: { name: "Groggy Mastery", desc: "+60% crit rate, +15% crit damage to debuffed enemies." },
    greaterSeaSerpentII: { name: "Greater Sea Serpent II", desc: "×+10% Final Damage." },
    shadowHeart: { name: "Shadow Heart", desc: "Passive — +20% crit rate, +5% crit damage." },
    serpentSpirit: { name: "Serpent Spirit", desc: "Passive — +15% crit damage." },
    darkClarity: { name: "Dark Clarity", desc: "Passive — +30 ATT." },
    loadedDice: { name: "Loaded Dice", desc: "Double Down buff — +40 ATT." },
    piratesBlessing: { name: "Pirate's Blessing", desc: "Explorer Pirate link — +100 all stats, −21% damage taken." },
    agileKnuckles: { name: "Agile Knuckles", desc: "2nd job passive — +2 attack speed, +20 STR." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 STR / DEX." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +STR to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "speedInfusion" },
    { skill: "crossbones" },
    { skill: "doubleDown" },
    { skill: "stimulatingConversation" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "lightningForm" },
    { skill: "piratesBanner" },
    { skill: "overdrive" },
    { skill: "lordOfTheDeep" },
    { skill: "unleashNeptunus" },
    { skill: "octopunch" },
  ],
  seqNote:
    "Stack buffs and summons, build Serpent Scales, then bind with Unleash Neptunus and burst Octopunch (triggers Sea Serpent's Rage / Raging Serpent Assault). Draft order — confirm with the Buccaneer Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Party utility",
      rows: [
        { skill: "timeLeap", timing: "reset party cd · 120s" },
        { skill: "speedInfusion", timing: "+2 atk speed · 180s" },
      ],
    },
    {
      label: "Defense & iFrames",
      rows: [
        { skill: "defensiveStance", timing: "−25% · 4s" },
        { skill: "howlingFist", timing: "−50% taken · 60s cd" },
        { skill: "lightningForm", timing: "up to 3.6s i-frame · 120s cd" },
      ],
    },
    {
      label: "Binds",
      rows: [{ skill: "unleashNeptunus", timing: "10s · 360s cd" }],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Pirate's Blessing also grants −21% damage taken.",
    rows: [
      { stat: "Weapon multiplier", total: "1.7×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 8",
        sub: "base Stage 5",
        parts: [
          { skill: "agileKnuckles", value: "+2" },
          { skill: "speedInfusion", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "90%",
        sub: "base +20%",
        parts: [{ skill: "crossbones", value: "+70%" }],
      },
      {
        stat: "STR",
        total: "+120 · +15% AP",
        parts: [
          { skill: "piratesBlessing", value: "+70" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "agileKnuckles", value: "+20" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
          { skill: "piratesBanner", value: "+25% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+19% · +90 (130)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "crossbones", value: "+15%" },
          { skill: "darkClarity", value: "+30" },
          { skill: "precisionStrikes", value: "+30" },
          { skill: "typhoonCrush", value: "+30" },
          { skill: "loadedDice", value: "+40", cond: "temp" },
          { skill: "overdrive", value: "+80% base ATT", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40% (100% debuffed)",
        sub: "incl. +5% base · +60% bosses",
        parts: [
          { skill: "shadowHeart", value: "+20%" },
          { skill: "precisionStrikes", value: "+15%" },
          { skill: "groggyMastery", value: "+60% debuffed", cond: "debuff" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+30% (45%)",
        parts: [
          { skill: "shadowHeart", value: "+5%" },
          { skill: "precisionStrikes", value: "+10%" },
          { skill: "serpentSpirit", value: "+15%" },
          { skill: "groggyMastery", value: "+15% debuffed", cond: "debuff" },
        ],
      },
      {
        stat: "Damage",
        total: "+25% (75%)",
        parts: [
          { skill: "aggressiveStance", value: "+25%" },
          { skill: "stimulatingConversation", value: "+20%", cond: "temp" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+20%",
        parts: [{ skill: "stimulatingConversation", value: "+20%" }],
      },
      {
        stat: "Final damage",
        total: "+24.3% (87.94%)",
        parts: [
          { skill: "greaterSeaSerpentII", value: "×+10%" },
          { skill: "crossbones", value: "×+13%" },
          { skill: "typhoonCrush", value: "×+10%" },
          { skill: "seaSerpentsRage", value: "×+10%" },
          { skill: "lightningForm", value: "×+26%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+40% (55%)",
        parts: [
          { skill: "typhoonCrush", value: "+40%" },
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
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/buccaneer", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Buccaneer", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

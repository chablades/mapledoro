import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Shadower config — reconciled from shadower.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Dual DEX + STR secondary; Dark Sight surfaced in Utility. [OK] base data · [DRAFT]
  sequence · [ICON] icons omitted · [DESIGN] description. innerAbility duplicated to
  both columns.
*/

export const shadower: ClassConfig = {
  name: "Shadower",
  branch: "Explorers",
  archetype: "Thief",
  description:
    "A meso-detonation bruiser — Meso Explosion bursts dropped mesos for big hits while Smokescreen drops a party crit-and-defense zone, with Dark Sight for dodging.",
  portraitUrl: classPortraitUrl("Shadower"),
  accentColor: "#6e5a8e",
  facts: [
    { label: "Primary weapon", value: "Dagger" },
    { label: "Secondary", value: "Dagger Scabbard · Shield" },
    { label: "Main stat", value: "LUK · DEX/STR" },
    { label: "Playstyle", value: "Meso burst · support" },
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
  legion: "LUK +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Dagger + Dagger Scabbard / Shield applies a 1.3× multiplier (attack Stage 8). Weapon Mastery reaches 90%.",
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
    lastResort: { name: "Last Resort", nodeType: "boost", desc: "+30 ATT, ×+10–24% Final Damage (by stage). 30s / 60s cd." },
    shadowWalker: { name: "Shadow Walker", nodeType: "boost", desc: "×+14% Final Damage while in Dark Sight. 20s / 120s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) LUK window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    // ── Attacks / zones ──
    assassinate: { name: "Assassinate", desc: "Main bossing line." },
    cruelStab: { name: "Cruel Stab", desc: "Main mobbing line; ×+24% Final Damage." },
    mesoExplosion: { name: "Meso Explosion", desc: "Signature — detonates dropped mesos for burst." },
    suddenRaid: { name: "Sudden Raid", desc: "Burst line." },
    smokescreen: { name: "Smokescreen", desc: "Party zone — −10% damage taken, +20% crit damage to enemies inside. 30s / 150s cd." },
    shadowVeil: { name: "Shadow Veil", desc: "Placeable buff zone. 12s / 60s cd." },
    darkFlare: { name: "Dark Flare", nodeType: "boost", desc: "Placeable that blocks / reflects. 60s." },
    halveCut: { name: "Halve Cut", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Survivability ──
    darkSight: { name: "Dark Sight", desc: "Stealth toggle that dodges a long list of boss attacks. 0–15s cd." },
    trickblade: { name: "Trickblade", nodeType: "boost", desc: "Burst line; 1.8s i-frame. 20s cd." },
    sonicBlow: { name: "Sonic Blow", nodeType: "boost", desc: "Burst; −50% damage taken 2s. 60s cd." },
    // ── Passives (baseStats contributors) ──
    daggerExpert: { name: "Dagger Expert", nodeType: "boost", desc: "Passive — +70% mastery, +15% crit damage, +40 ATT." },
    shadowerInstinct: { name: "Shadower Instinct", desc: "Passive — +45 ATT, ×+16% FD, +20% Ignore DEF." },
    bloodMoney: { name: "Blood Money", desc: "Toggle — +20% crit damage, +10 LUK." },
    criticalEdge: { name: "Critical Edge", desc: "Passive — +25% crit rate, +5% crit damage." },
    daggerMastery: { name: "Dagger Mastery", desc: "×+6% Final Damage." },
    mesoMastery: { name: "Meso Mastery", desc: "+20 ATT; meso utility." },
    flipOfTheCoin: { name: "Flip of the Coin", desc: "Passive — +25% crit rate, +25% Damage." },
    advancedDarkSight: { name: "Advanced Dark Sight", desc: "×+12% Final Damage while in Dark Sight." },
    channelKarma: { name: "Channel Karma", desc: "Passive — +30 ATT." },
    shieldMastery: { name: "Shield Mastery", desc: "Shield passive — +15 ATT." },
    steal: { name: "Steal", desc: "Passive — +30 ATT." },
    thiefsCunning: { name: "Thief's Cunning", desc: "Explorer Thief link — +18% Damage on debuff." },
    nimbleBody: { name: "Nimble Body", desc: "1st job passive — +20 LUK, +avoid." },
    agileDaggers: { name: "Agile Daggers", desc: "2nd job passive — +2 attack speed, +20 LUK." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 LUK / DEX." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +LUK to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "lastResort" },
    { skill: "shadowWalker" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "smokescreen" },
    { skill: "shadowVeil" },
    { skill: "darkFlare" },
    { skill: "sonicBlow" },
    { skill: "suddenRaid" },
    { skill: "halveCut" },
    { skill: "assassinate" },
  ],
  seqNote:
    "Stack buffs, set Smokescreen / Shadow Veil, then bind with Halve Cut and burst Assassinate with Meso Explosion. Draft order — confirm with the Shadower Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Party support",
      rows: [{ skill: "smokescreen", timing: "−10% taken / +20% crit · 150s cd" }],
    },
    {
      label: "Burst & iFrames",
      rows: [
        { skill: "mesoExplosion", timing: "meso detonate" },
        { skill: "trickblade", timing: "1.8s · 20s cd" },
        { skill: "sonicBlow", timing: "−50% taken · 2s · 60s cd" },
      ],
    },
    {
      label: "Dark Sight & binds",
      rows: [
        { skill: "darkSight", timing: "dodge boss attacks" },
        { skill: "halveCut", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Weapon Mastery reaches 90%.",
    rows: [
      { stat: "Weapon multiplier", total: "1.3×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 8",
        sub: "base Stage 6",
        parts: [{ skill: "agileDaggers", value: "+2" }],
      },
      {
        stat: "Weapon mastery",
        total: "90%",
        sub: "base +20%",
        parts: [{ skill: "daggerExpert", value: "+70%" }],
      },
      {
        stat: "LUK",
        total: "+80 · +15% AP",
        parts: [
          { skill: "nimbleBody", value: "+20" },
          { skill: "agileDaggers", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "bloodMoney", value: "+10" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +150 (210)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "channelKarma", value: "+30" },
          { skill: "shieldMastery", value: "+15" },
          { skill: "mesoMastery", value: "+20" },
          { skill: "shadowerInstinct", value: "+45" },
          { skill: "daggerExpert", value: "+40" },
          { skill: "steal", value: "+30" },
          { skill: "lastResort", value: "+30", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+55%",
        sub: "incl. +5% base",
        parts: [
          { skill: "criticalEdge", value: "+25%" },
          { skill: "flipOfTheCoin", value: "+25%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+40% (60%)",
        parts: [
          { skill: "criticalEdge", value: "+5%" },
          { skill: "bloodMoney", value: "+20%" },
          { skill: "daggerExpert", value: "+15%" },
          { skill: "smokescreen", value: "+20% zone", cond: "temp" },
        ],
      },
      {
        stat: "Damage",
        total: "+25% (73%)",
        parts: [
          { skill: "flipOfTheCoin", value: "+25%" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "thiefsCunning", value: "+18%", cond: "debuff" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+52.47% (138.22%)",
        parts: [
          { skill: "daggerMastery", value: "×+6%" },
          { skill: "cruelStab", value: "×+24%" },
          { skill: "shadowerInstinct", value: "×+16%" },
          { skill: "advancedDarkSight", value: "×+12%" },
          { skill: "shadowWalker", value: "×+14%", cond: "temp" },
          { skill: "lastResort", value: "×+10–24%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+20%",
        parts: [{ skill: "shadowerInstinct", value: "+20%" }],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/shadower", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Shadower", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Night Walker config — reconciled from night-walker.config.ts onto the repo
  ClassConfig shape. Source: Grandis Library (GMS v266); link + legion + name from
  classData.ts. The only Cygnus class with Dark Sight (shared avoidable-attacks utility).
  6th-job Origin/Ascent naming (Silence vs Stygian Command) is [DRAFT] — the 360s bind
  is tagged origin; the Ascent node stays nodeType "mastery". [OK] base data · [DRAFT]
  sequence + 6th-job names · [ICON] icons omitted · [DESIGN] description.
*/

export const nightWalker: ClassConfig = {
  name: "Night Walker",
  branch: "Cygnus Knights",
  archetype: "Thief",
  description:
    "A dark-attribute throwing-star assassin with auto-attacking bats, clones, and Shadow Spears — the only Cygnus class with Dark Sight for dodging boss attacks.",
  portraitUrl: classPortraitUrl("Night Walker"),
  accentColor: "#4a4595",
  facts: [
    { label: "Primary weapon", value: "Claw" },
    { label: "Secondary", value: "Jewel" },
    { label: "Main stat", value: "LUK · DEX" },
    { label: "Playstyle", value: "Dark throws · bats" },
  ],
  linkSkill: {
    name: "Cygnus Blessing",
    desc: "+ATT & MATT, +Status Resistance, +Elemental Resistance.",
    pills: [
      ["Lv5", "+15 ATT", "+7% ER"],
      ["Lv15", "+35 ATT", "+22% ER"],
    ],
    note: "Stacks ×5, once per Cygnus Knight — excluding Mihile.",
  },
  legion: "LUK +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Claw + Jewel applies a 1.75× multiplier (attack Stage 8). Uses Throwing Stars; Weapon Mastery caps at 85%. All attacks are dark-attribute; the only Cygnus class with Dark Sight.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Attack +21 / Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Attack +21 / Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    darkServant: { name: "Dark Servant", desc: "Clone buff that echoes attacks. 180s." },
    greaterDarkServant: { name: "Greater Dark Servant", nodeType: "boost", desc: "Enhanced clone burst. 20s / 120s cd." },
    lastResort: { name: "Last Resort", nodeType: "boost", desc: "+30 ATT, ×+10% FD Stage 1 / +24% Stage 2. 30s / 60s cd." },
    shadowSpear: { name: "Shadow Spear", desc: "5th job — dark hits build Shadow Spears that detonate. 30s / 60s cd." },
    shadowIllusion: { name: "Shadow Illusion", desc: "Hyper clone buff. 20s / 120s cd." },
    dominion: { name: "Dominion", desc: "Hyper buff — +100% crit rate, ×+20% FD. 20s / 120s cd." },
    gloryOfTheGuardians: { name: "Glory of the Guardians", desc: "+10% Damage buff. 60s / 120s cd." },
    empressCygnusBlessing: { name: "Empress Cygnus's Blessing", desc: "Buff. 45s / 120s cd." },
    transcendentCygnusBlessing: { name: "Transcendent Cygnus's Blessing", nodeType: "boost", desc: "+72% Damage; −5% damage taken. 45s / 120s cd." },
    // ── Attacks / summons ──
    quintupleStar: { name: "Quintuple Star", desc: "Main bossing line (Throw skill)." },
    darkOmen: { name: "Dark Omen", nodeType: "boost", desc: "Bat-summon burst. 7s / 60s cd." },
    shadowSlide: { name: "Shadow Slide", nodeType: "boost", desc: "Summon. 55s / 60s cd." },
    shadowStitch: { name: "Shadow Stitch", desc: "10–12s bind. 120s cd." },
    silence: { name: "Silence", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd. [DRAFT] Origin vs Ascent label." },
    // ── Survivability ──
    darkSight: { name: "Dark Sight", desc: "Stealth that dodges a long list of boss attacks (shared Cygnus / Explorer-Thief table). 200s." },
    darknessAscending: { name: "Darkness Ascending", desc: "Revive + 4s i-frame. 1800s cd." },
    darkEvasion: { name: "Dark Evasion", desc: "3s i-frame. 75s cd." },
    rapidThrow: { name: "Rapid Throw", nodeType: "boost", desc: "Burst; −50% damage taken up to 2.4s. 120s cd." },
    vitalitySiphon: { name: "Vitality Siphon", desc: "10% HP barrier (Reinforce adds +60 ATT). 15s." },
    // ── Passives (baseStats contributors) ──
    throwingExpert: { name: "Throwing Expert", nodeType: "boost", desc: "Passive — +70% mastery, +10% crit damage, +30 ATT." },
    criticalThrow: { name: "Critical Throw", desc: "Passive — +35% crit rate, +10% crit damage." },
    throwingMastery: { name: "Throwing Mastery", desc: "+30% Damage passive." },
    shadowMomentum: { name: "Shadow Momentum", desc: "×+15% Final Damage passive." },
    darkBlessing: { name: "Dark Blessing", desc: "Passive — +30 ATT, ×+10% FD, ×+15% Ignore DEF." },
    adaptiveDarknessIII: { name: "Adaptive Darkness III", desc: "×+7% Ignore DEF per stack (max +35%)." },
    alchemicAdrenaline: { name: "Alchemic Adrenaline", desc: "+10% crit damage passive." },
    shadowBite: { name: "Shadow Bite", desc: "×+20% Final Damage passive." },
    callOfCygnus: { name: "Call of Cygnus", desc: "+15% assigned-AP LUK passive." },
    cygnusBlessing: { name: "Cygnus Blessing", desc: "Cygnus Knights link — +35 ATT & MATT." },
    agileThrowing: { name: "Agile Throwing", desc: "2nd job passive — +2 attack speed, +20 LUK." },
    physicalTraining: { name: "Physical Training", desc: "Passive — +60 LUK." },
    elementalHarmony: { name: "Elemental Harmony", desc: "Passive — +1 LUK per 2 levels." },
    elementalExpert: { name: "Elemental Expert", desc: "Passive — +10% ATT." },
    spiritProjection: { name: "Spirit Projection", desc: "Passive — +10 ATT." },
    herosEcho: { name: "Hero's Echo", desc: "+4% ATT party buff. 2400s / 300s cd." },
  },
  sequence: [
    { skill: "darkServant" },
    { skill: "greaterDarkServant" },
    { skill: "lastResort" },
    { skill: "shadowSpear" },
    { skill: "shadowIllusion" },
    { skill: "dominion" },
    { skill: "gloryOfTheGuardians" },
    { skill: "empressCygnusBlessing" },
    { skill: "transcendentCygnusBlessing", cd: "2 min" },
    { skill: "darkOmen" },
    { skill: "shadowSlide" },
    { skill: "shadowStitch" },
    { skill: "silence" },
    { skill: "quintupleStar" },
  ],
  seqNote:
    "Stack clones and buffs, build Shadow Spears, then bind with Silence and burst Quintuple Star with bats up. Origin/Ascent naming is unconfirmed — verify with the Night Walker Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Dark Sight",
      rows: [{ skill: "darkSight", timing: "dodge boss attacks · only Cygnus with it" }],
    },
    {
      label: "iFrames & revive",
      rows: [
        { skill: "darknessAscending", timing: "revive · 4s · 1800s cd" },
        { skill: "darkEvasion", timing: "3s · 75s cd" },
        { skill: "rapidThrow", timing: "−50% taken · 2.4s · 120s cd" },
      ],
    },
    {
      label: "Bats & binds",
      rows: [
        { skill: "darkServant", timing: "clone · 180s" },
        { skill: "shadowStitch", timing: "10–12s · 120s cd" },
        { skill: "silence", timing: "10s · 360s cd" },
      ],
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
        parts: [{ skill: "agileThrowing", value: "+2" }],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "throwingExpert", value: "+70%" }],
      },
      {
        stat: "LUK",
        total: "+80 · +15% AP",
        sub: "+1 per 2 levels",
        parts: [
          { skill: "agileThrowing", value: "+20" },
          { skill: "physicalTraining", value: "+60" },
          { skill: "elementalHarmony", value: "+1/2 lvls" },
          { skill: "callOfCygnus", value: "+15% AP" },
        ],
      },
      {
        stat: "Attack",
        total: "+14% · +95 (185)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "elementalExpert", value: "+10%" },
          { skill: "cygnusBlessing", value: "+25" },
          { skill: "spiritProjection", value: "+10" },
          { skill: "throwingExpert", value: "+30" },
          { skill: "darkBlessing", value: "+30" },
          { skill: "vitalitySiphon", value: "+60", cond: "temp" },
          { skill: "lastResort", value: "+30", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40% (100%)",
        sub: "incl. +5% base",
        parts: [
          { skill: "criticalThrow", value: "+35%" },
          { skill: "dominion", value: "+100%", cond: "temp" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+30%",
        parts: [
          { skill: "criticalThrow", value: "+10%" },
          { skill: "alchemicAdrenaline", value: "+10%" },
          { skill: "throwingExpert", value: "+10%" },
        ],
      },
      {
        stat: "Damage",
        total: "+30% (112%)",
        parts: [
          { skill: "throwingMastery", value: "+30%" },
          { skill: "gloryOfTheGuardians", value: "+10%", cond: "temp" },
          { skill: "transcendentCygnusBlessing", value: "+72%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+51.8% (125.88%)",
        parts: [
          { skill: "shadowMomentum", value: "×+15%" },
          { skill: "darkBlessing", value: "×+10%" },
          { skill: "shadowBite", value: "×+20%" },
          { skill: "dominion", value: "×+20%", cond: "temp" },
          { skill: "lastResort", value: "×+10–24%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+44.75%",
        parts: [
          { skill: "darkBlessing", value: "×+15%" },
          { skill: "adaptiveDarknessIII", value: "max +35%" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/cygnus-knights/night-walker", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Night_Walker", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

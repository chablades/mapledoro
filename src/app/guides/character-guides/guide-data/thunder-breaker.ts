import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Thunder Breaker config — reconciled from thunder-breaker.config.ts onto the repo
  ClassConfig shape. Source: Grandis Library (GMS v266); link + legion + name from
  classData.ts. Linking brawler that snowballs Lightning Elemental into burst. The
  Ascent node (Annihilating Rush) is omitted (not referenced); Deep Reinforcement is
  kept as nodeType "mastery". [OK] base data · [DRAFT] sequence + 6th-job names ·
  [ICON] icons omitted · [DESIGN] description. innerAbility duplicated to both columns.
*/

export const thunderBreaker: ClassConfig = {
  name: "Thunder Breaker",
  branch: "Cygnus Knights",
  archetype: "Pirate",
  description:
    "A fast linking brawler whose chained attacks cut cast delays and stack Lightning Elemental — spent by Link Mastery skills for big burst, enabled by Primal Bolt.",
  portraitUrl: classPortraitUrl("Thunder Breaker"),
  accentColor: "#2f9fe0",
  facts: [
    { label: "Primary weapon", value: "Knuckle" },
    { label: "Secondary", value: "Jewel" },
    { label: "Main stat", value: "STR · DEX" },
    { label: "Playstyle", value: "Linking · burst" },
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
  legion: "STR +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Knuckle + Jewel applies a 1.7× multiplier (attack Stage 8). Linking attacks build Lightning Elemental (+Ignore DEF / +Damage), spent by Link Mastery skills.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20% / Passive Skills +1" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38% / Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20% / Passive Skills +1" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38% / Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    speedInfusion: { name: "Speed Infusion", desc: "+2 attack speed party buff. 300s." },
    typhoon: { name: "Typhoon", desc: "Buff + attack — +3% Damage / Lightning Charge (max +15%). 90s / 12s cd." },
    overdrive: { name: "Overdrive", nodeType: "boost", desc: "+ATT (% of base weapon power). 28s / 60s cd." },
    loadedDice: { name: "Loaded Dice", nodeType: "boost", desc: "+40 ATT (dice) buff." },
    primalBolt: { name: "Primal Bolt", desc: "Hyper buff — Link Mastery skills stop consuming Lightning Elemental and links cut cooldowns; up to +50% Ignore DEF. 30s / 120s cd." },
    lightningCascade: { name: "Lightning Cascade", nodeType: "boost", desc: "×+27% Final Damage buff / burst. 52s / 120s cd." },
    gloryOfTheGuardians: { name: "Glory of the Guardians", desc: "+10% Damage buff. 60s / 120s cd." },
    empressCygnusBlessing: { name: "Empress Cygnus's Blessing", desc: "Buff. 45s / 120s cd." },
    transcendentCygnusBlessing: { name: "Transcendent Cygnus's Blessing", nodeType: "boost", desc: "+72% Damage; −5% damage taken. 45s / 120s cd." },
    // ── Attacks / summons ──
    annihilate: { name: "Annihilate", desc: "Main bossing line." },
    deepRising: { name: "Deep Rising", desc: "Hyper burst + i-frame. 45s cd." },
    sharkTorpedo: { name: "Shark Torpedo", nodeType: "boost", desc: "Link Mastery burst (consumes Lightning Elemental). 120s cd." },
    lightningGodSpearStrike: { name: "Lightning God Spear Strike", nodeType: "boost", desc: "Link Mastery burst. 120s cd." },
    thunderWallSeaWave: { name: "Thunder Wall Sea Wave", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Mechanic / survivability ──
    lightningElemental: { name: "Lightning Elemental", desc: "Links build stacks granting %Ignore DEF + %Damage (consumed by Link Mastery skills)." },
    deepReinforcement: { name: "Deep Reinforcement", nodeType: "mastery", desc: "HEXA — up to 15% HP barrier, 2s." },
    // ── Passives (baseStats contributors) ──
    knuckleExpert: { name: "Knuckle Expert", nodeType: "boost", desc: "Passive — +70% mastery, +15% crit damage, ×+17% FD, +60 ATT." },
    knuckleMastery: { name: "Knuckle Mastery", desc: "×+7% Final Damage passive." },
    lightningLord: { name: "Lightning Lord", desc: "Passive — +30 ATT, +10% crit damage, +4% Damage/stack (max +20%)." },
    thunderGod: { name: "Thunder God", desc: "Passive — +10% crit rate, +15% crit damage, +9% Ignore DEF/stack (max +45%)." },
    ironclad: { name: "Ironclad", desc: "Passive — +10% crit rate, +5% Damage." },
    gains: { name: "Gains", desc: "Passive — +60 STR, +15% crit rate, +5% crit damage." },
    lightningBoost: { name: "Lightning Boost", desc: "Passive — +25 ATT." },
    linkMastery: { name: "Link Mastery", desc: "×+6% Final Damage per linked attack (max +18%)." },
    callOfCygnus: { name: "Call of Cygnus", desc: "+15% assigned-AP STR passive." },
    cygnusBlessing: { name: "Cygnus Blessing", desc: "Cygnus Knights link — +35 ATT & MATT." },
    agileKnuckles: { name: "Agile Knuckles", desc: "2nd job passive — +2 attack speed, +20 STR." },
    elementalHarmony: { name: "Elemental Harmony", desc: "Passive — +1 STR per 2 levels." },
    elementalExpert: { name: "Elemental Expert", desc: "Passive — +10% ATT." },
    herosEcho: { name: "Hero's Echo", desc: "+4% ATT party buff. 2400s / 300s cd." },
  },
  sequence: [
    { skill: "speedInfusion" },
    { skill: "typhoon" },
    { skill: "overdrive" },
    { skill: "loadedDice" },
    { skill: "primalBolt" },
    { skill: "lightningCascade" },
    { skill: "gloryOfTheGuardians" },
    { skill: "empressCygnusBlessing" },
    { skill: "transcendentCygnusBlessing", cd: "2 min" },
    { skill: "deepRising" },
    { skill: "sharkTorpedo" },
    { skill: "lightningGodSpearStrike" },
    { skill: "thunderWallSeaWave" },
    { skill: "annihilate" },
  ],
  seqNote:
    "Stack buffs and Primal Bolt, then bind with Thunder Wall Sea Wave and burst Annihilate while linking (Thunderbolt / Gale build Lightning Elemental). Draft order — confirm with the Thunder Breaker Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Linking",
      rows: [
        { skill: "lightningElemental", timing: "stacks IED / Damage" },
        { skill: "primalBolt", timing: "burst enabler · 120s cd" },
      ],
    },
    {
      label: "Buffs & burst",
      rows: [
        { skill: "speedInfusion", timing: "+2 atk speed · 300s" },
        { skill: "deepRising", timing: "i-frame · 45s cd" },
      ],
    },
    {
      label: "Defense & binds",
      rows: [
        { skill: "deepReinforcement", timing: "HP barrier · 2s" },
        { skill: "thunderWallSeaWave", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Lightning Elemental / Link Mastery scale with sustained linking.",
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
        parts: [{ skill: "knuckleExpert", value: "+70%" }],
      },
      {
        stat: "STR",
        total: "+60 · +15% AP",
        sub: "+1 per 2 levels",
        parts: [
          { skill: "gains", value: "+60" },
          { skill: "elementalHarmony", value: "+1/2 lvls" },
          { skill: "callOfCygnus", value: "+15% AP" },
        ],
      },
      {
        stat: "Attack",
        total: "+14% · +140 (180)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "elementalExpert", value: "+10%" },
          { skill: "cygnusBlessing", value: "+25" },
          { skill: "lightningBoost", value: "+25" },
          { skill: "lightningLord", value: "+30" },
          { skill: "knuckleExpert", value: "+60" },
          { skill: "loadedDice", value: "+40", cond: "temp" },
          { skill: "overdrive", value: "+80% base ATT", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40%",
        sub: "incl. +5% base",
        parts: [
          { skill: "gains", value: "+15%" },
          { skill: "ironclad", value: "+10%" },
          { skill: "thunderGod", value: "+10%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+30%",
        parts: [
          { skill: "gains", value: "+5%" },
          { skill: "lightningLord", value: "+10%" },
          { skill: "knuckleExpert", value: "+15%" },
          { skill: "thunderGod", value: "+15%" },
        ],
      },
      {
        stat: "Damage",
        total: "+40% (122%)",
        parts: [
          { skill: "ironclad", value: "+5%" },
          { skill: "typhoon", value: "max +15%" },
          { skill: "lightningLord", value: "max +20%" },
          { skill: "gloryOfTheGuardians", value: "+10%", cond: "temp" },
          { skill: "transcendentCygnusBlessing", value: "+72%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+47.77% (87.61%)",
        parts: [
          { skill: "knuckleMastery", value: "×+7%" },
          { skill: "knuckleExpert", value: "×+17%" },
          { skill: "linkMastery", value: "max ×+18%" },
          { skill: "lightningCascade", value: "×+27%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+45% (50%)",
        parts: [
          { skill: "thunderGod", value: "max +45%" },
          { skill: "primalBolt", value: "+50%", cond: "temp" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/cygnus-knights/thunder-breaker", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Thunder_Breaker", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

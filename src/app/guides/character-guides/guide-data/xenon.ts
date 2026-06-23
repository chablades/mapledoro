import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Xenon config — reconciled from xenon.config.ts onto the repo ClassConfig shape.
  Source: Grandis Library (GMS v266); link + legion + name from classData.ts. SPECIAL
  CASE: tri-stat hybrid (STR / DEX / LUK), equips both Thief and Pirate gear, values
  %All Stat; one combined tri-stat baseStats row. Single-character Hybrid Logic link.
  [OK] base data · [DRAFT] sequence · [ICON] icons omitted · [DESIGN] description.
*/

export const xenon: ClassConfig = {
  name: "Xenon",
  branch: "Resistance",
  archetype: "Thief + Pirate",
  description:
    "A tri-stat android that equips both Thief and Pirate gear and scales off STR, DEX, and LUK at once — managing a Supply Surplus energy gauge and Modal Shift attack variations, with field zones for the party.",
  portraitUrl: classPortraitUrl("Xenon"),
  accentColor: "#27b0a0",
  facts: [
    { label: "Primary weapon", value: "Whip Blade" },
    { label: "Secondary", value: "Core Controller" },
    { label: "Main stat", value: "STR / DEX / LUK (tri-stat)" },
    { label: "Playstyle", value: "Hybrid · energy · zones" },
  ],
  linkSkill: {
    name: "Hybrid Logic",
    desc: "+All Stats. A single-character link — does not stack like the shared Resistance link.",
    pills: [["Lv3", "+15% All Stat", "—"]],
    note: "Single-character link (master Lv. 3).",
  },
  legion: "STR / DEX / LUK +5 / 10 / 20 / 40 / 50",
  weaponNote:
    "Whip Blade + Core Controller applies a 1.3125× multiplier (attack Stage 7). Scales off all three of STR / DEX / LUK, so %All Stat is unusually valuable; equips both Thief and Pirate gear.",
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
    // ── Energy / buffs ──
    circuitSurge: { name: "Circuit Surge", desc: "Energy buff — +30 ATT. 240s (3 Energy)." },
    salvoSystem: { name: "Salvo System", desc: "Toggle auto-bombs." },
    coreOverload: { name: "Core Overload", nodeType: "boost", desc: "Big buff — +All Stat, +10% Damage, ×+FD, +30% Ignore DEF (scales with power units). 30s / 120s cd." },
    amaranthGenerator: { name: "Amaranth Generator", desc: "Buff. 10s / 60s cd." },
    lastResort: { name: "Last Resort", nodeType: "boost", desc: "+30 ATT, ×+10–24% Final Damage (by stage). 30s / 60s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) window. 60s / 120s cd.",
    },
    overdrive: { name: "Overdrive", nodeType: "boost", desc: "+ATT (% of base weapon power). 28s / 60s cd." },
    oopArtsCode: { name: "OOParts Code", desc: "Energy buff — +24% Boss Damage, ×+30% FD. 60s (20 Energy)." },
    // ── Attacks / zones ──
    mechaPurgeSnipe: { name: "Mecha Purge: Snipe", desc: "Main bossing line (single-target Modal variant)." },
    hypogramForceField: { name: "Hypogram Field: Force Field", desc: "Damage zone. 60s." },
    hypogramSupport: { name: "Hypogram Field: Support", desc: "Support zone (party utility). 60s." },
    hypogramFusion: { name: "Hypogram Field: Fusion", nodeType: "boost", desc: "+20% Damage zone. 20s / 60s cd." },
    entanglingLash: { name: "Entangling Lash", desc: "10s bind. 120s cd." },
    artificialEvolution: { name: "Artificial Evolution", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── iFrames / defense ──
    omegaBlaster: { name: "Omega Blaster", nodeType: "boost", desc: "Burst; −50% damage taken up to 3.5s + 2s i-frame during Origin. 120s cd." },
    orbitalCataclysm: { name: "Orbital Cataclysm", desc: "Hyper burst + i-frame. 50s cd." },
    manifestProjector: { name: "Manifest Projector", desc: "Energy field (absorbs up to 1000% Max HP damage)." },
    // ── Passives (baseStats contributors) ──
    xenonExpert: { name: "Xenon Expert", nodeType: "boost", desc: "Passive — +70% mastery, +6% crit damage, +30 ATT." },
    multilateralIV: { name: "Multilateral VI", desc: "Passive — +40% Damage, ×+15% FD." },
    perspectiveShift: { name: "Perspective Shift", desc: "Passive — +40% crit rate." },
    offensiveMatrix: { name: "Offensive Matrix", desc: "Passive — +30% Ignore DEF." },
    structuralIntegrity: { name: "Structural Integrity", desc: "Passive — +25 All Stat." },
    starForceConversion: { name: "Star Force Conversion", desc: "+7 All Stat per 10 Star Force (max +70)." },
    xenonMastery: { name: "Xenon Mastery", desc: "Passive — +20 ATT." },
    hybridLogic: { name: "Hybrid Logic", desc: "Xenon link — +15% All Stat." },
    hybridDefenses: { name: "Hybrid Defenses", desc: "Passive — +10 All Stat." },
    supplySurplus: { name: "Supply Surplus", desc: "Energy gauge — +1% All Stat per power unit (max +20%)." },
    loadedDice: { name: "Loaded Dice", desc: "Gambling buff — +40 ATT." },
    xenonBooster: { name: "Xenon Booster", desc: "Passive — +2 attack speed." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +All Stat to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "circuitSurge" },
    { skill: "salvoSystem" },
    { skill: "coreOverload" },
    { skill: "amaranthGenerator" },
    { skill: "lastResort" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "overdrive" },
    { skill: "oopArtsCode" },
    { skill: "hypogramForceField" },
    { skill: "hypogramFusion" },
    { skill: "entanglingLash" },
    { skill: "artificialEvolution" },
    { skill: "mechaPurgeSnipe" },
  ],
  seqNote:
    "Build Energy, stack buffs and OOParts Code, drop your Hypogram fields, then bind with Artificial Evolution and burst Mecha Purge: Snipe (Beam Dance for mobbing). Draft order — confirm with the Xenon Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Party & zones",
      rows: [
        { skill: "hypogramSupport", timing: "party zone · 60s" },
        { skill: "hypogramForceField", timing: "damage zone · 60s" },
      ],
    },
    {
      label: "iFrames & defense",
      rows: [
        { skill: "omegaBlaster", timing: "−50% taken · 2s i-frame · 120s cd" },
        { skill: "orbitalCataclysm", timing: "i-frame · 50s cd" },
        { skill: "manifestProjector", timing: "absorb 1000% HP" },
      ],
    },
    {
      label: "Binds",
      rows: [
        { skill: "entanglingLash", timing: "10s · 120s cd" },
        { skill: "artificialEvolution", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. STR / DEX / LUK are one combined tri-stat row.",
    rows: [
      { stat: "Weapon multiplier", total: "1.3125×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 5",
        parts: [{ skill: "xenonBooster", value: "+2" }],
      },
      {
        stat: "Weapon mastery",
        total: "90%",
        sub: "base +20%",
        parts: [{ skill: "xenonExpert", value: "+70%" }],
      },
      {
        stat: "STR / DEX / LUK",
        total: "+30% (50%) · +105 · +15% AP",
        sub: "tri-stat — values %All Stat",
        parts: [
          { skill: "hybridLogic", value: "+10%" },
          { skill: "supplySurplus", value: "max +20%" },
          { skill: "structuralIntegrity", value: "+25" },
          { skill: "hybridDefenses", value: "+10" },
          { skill: "starForceConversion", value: "max +70" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "coreOverload", value: "max +20%", cond: "temp" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +80 (150)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "circuitSurge", value: "+30" },
          { skill: "xenonMastery", value: "+20" },
          { skill: "xenonExpert", value: "+30" },
          { skill: "lastResort", value: "+30", cond: "temp" },
          { skill: "loadedDice", value: "+40", cond: "temp" },
          { skill: "overdrive", value: "+80% base ATT", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+45%",
        sub: "incl. +5% base",
        parts: [{ skill: "perspectiveShift", value: "+40%" }],
      },
      {
        stat: "Crit damage",
        total: "+6%",
        parts: [{ skill: "xenonExpert", value: "+6%" }],
      },
      {
        stat: "Damage",
        total: "+40% (90%)",
        parts: [
          { skill: "multilateralIV", value: "+40%" },
          { skill: "coreOverload", value: "+10%", cond: "temp" },
          { skill: "hypogramFusion", value: "+20% field", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "(+24%)",
        parts: [{ skill: "oopArtsCode", value: "+24%", cond: "temp" }],
      },
      {
        stat: "Final damage",
        total: "+49.5% (122.46%)",
        parts: [
          { skill: "multilateralIV", value: "×+15%" },
          { skill: "oopArtsCode", value: "×+30%", cond: "temp" },
          { skill: "coreOverload", value: "max ×+20%", cond: "temp" },
          { skill: "lastResort", value: "×+10–24%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+30% (51%)",
        parts: [
          { skill: "offensiveMatrix", value: "+30%" },
          { skill: "coreOverload", value: "×+30%", cond: "temp" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/resistance/xenon", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Xenon", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

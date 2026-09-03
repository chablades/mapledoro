import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Paladin config — reconciled from the draft paladin.config.ts onto the repo's
  ClassConfig shape (the same shape hero.ts uses, so it drops into ClassGuide.tsx
  with no JSX changes). Source: Grandis Library (GMS v266, Sengoku Warrior
  Reawakening), supported by the Paladin Discord + NamuWiki.

  Field provenance:
    - baseStats / innerAbility / weapons / legion / link — Grandis, transcribed. [OK]
    - sequence / hyperStats — reasoned from Grandis cooldown/buff data. [DRAFT]
    - skill iconIds — not yet resolved; omitted → letter fallback. Only the link
      icon (shared Invincible Belief, id 0000252) is reused from Hero. [ICON TODO]
    - leveling (HEXA order) — no data yet → empty (renders "Coming soon"). [TODO]
    - recLinks — the draft's "recommended skills" is a different concept from the
      repo's other-class link recommendations, so no source data → empty. [TODO]
    - description / difficulty — written for this page; verify vibe. [DESIGN]
*/

export const paladin: ClassConfig = {
  name: "Paladin",
  branch: "Explorers",
  archetype: "Warrior",
  description:
    "A holy knight built around elemental charges and Vessel of Light stacks — heavy on survivability, with stacked binds and a 30-second invincibility to walk through one-shot mechanics.",
  portraitUrl: classPortraitUrl("Paladin"),
  accentColor: "#4a7fe0",
  facts: [
    { label: "Primary weapon", value: "1H / 2H Sword · Blunt" },
    { label: "Secondary", value: "Rosary · Shield" },
    { label: "Main stat", value: "STR · DEX" },
    { label: "Playstyle", value: "Holy charges · tanky" },
  ],
  linkSkill: {
    name: "Invincible Belief",
    iconId: "0000252",
    desc: "Auto-triggers at ≤15% HP — restores Max HP every 1s for 3s.",
    pills: [
      ["Lv6", "35%", "210s"],
      ["Lv9", "44%", "90s"],
    ],
    note: "Stacks ×3, one per Explorer Warrior at master level.",
  },
  legion: "STR +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "1H sword + shield = 1.24× multiplier (AS 8); 2H = 1.34× (AS 7). High Paladin gives a 1H sword a little extra mastery and crit damage.",
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
    // ── Burst / actives ──
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) STR window. 60s / 120s cd.",
    },
    epicAdventure: {
      name: "Epic Adventure",
      desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd.",
    },
    weaponAura: {
      name: "Weapon Aura",
      nodeType: "boost",
      desc: "+6% Final Damage and ×+16% Ignore DEF. 130s / 120s cd.",
    },
    divineEcho: {
      name: "Divine Echo",
      nodeType: "boost",
      desc: "×+75% Final Damage. 30s / 60s cd — the burst-window anchor.",
    },
    smiteShield: {
      name: "Smite Shield",
      desc: "10s bind. 120s cd.",
    },
    sacredBastion: {
      name: "Sacred Bastion",
      nodeType: "mastery",
      desc: "10s bind + i-frame. 360s cd.",
    },
    hammersRighteous: {
      name: "Hammers of the Righteous",
      nodeType: "origin",
      desc: "HEXA origin skill. Inflicts Absolute Bind on cast (≥10s, separate 100s timer).",
    },
    // ── Survivability / lockdown ──
    sacrosanctity: {
      name: "Sacrosanctity",
      desc: "30s full invincibility i-frame. 300s cd (−75s scaling based on remaining duration).",
    },
    grandGuardian: {
      name: "Grand Guardian",
      nodeType: "boost",
      desc: "−50% damage taken for up to 4s. 120s cd.",
    },
    guardian: {
      name: "Guardian",
      desc: "Revive a downed party member → 10s i-frame on revive. 600s cd.",
    },
    divineCharge: {
      name: "Divine Charge",
      desc: "Holy-Power charge; applies Silence to enemies.",
    },
    magicCrash: {
      name: "Magic Crash",
      desc: "Dispels enemy buffs.",
    },
    // ── Passives (baseStats contributors) ──
    highPaladin: {
      name: "High Paladin",
      nodeType: "boost",
      desc: "Core passive — +71% mastery, +42% crit rate, +20% crit damage, +42% Final Damage, +31% Ignore DEF.",
    },
    greaterVessel: {
      name: "Greater Vessel of Light",
      nodeType: "boost",
      desc: "Passive — +60 ATT and +25% Damage.",
    },
    divineBlessing: {
      name: "Divine Blessing",
      desc: "+21% Final Damage buff. 200s duration.",
    },
    nobleDemand: {
      name: "Noble Demand",
      desc: "×+50% Ignore DEF multiplier.",
    },
    agileArms: {
      name: "Agile Arms",
      desc: "2nd job passive — +2 attack speed, +20 STR.",
    },
    weaponMastery: {
      name: "Weapon Mastery",
      desc: "2nd job passive — weapon mastery and +1 attack speed.",
    },
    physicalTraining: {
      name: "Physical Training",
      desc: "2nd job passive — +30 STR.",
    },
    impenetrableSkin: {
      name: "Impenetrable Skin",
      desc: "Passive — +30 STR and a barrier.",
    },
    mapleWarrior: {
      name: "Maple Warrior",
      desc: "4th job buff — +STR to assigned AP. Effectively permanent.",
    },
    herosEcho: {
      name: "Hero's Echo",
      desc: "Beginner skill — +4% ATT for 40 min.",
    },
    parashockGuard: {
      name: "Parashock Guard",
      desc: "Shield skill — +20 ATT.",
    },
    shieldMastery: {
      name: "Shield Mastery",
      desc: "Shield passive — +20 ATT.",
    },
    divineShield: {
      name: "Divine Shield",
      desc: "Buff — +20 ATT.",
    },
  },
  sequence: [
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "weaponAura" },
    { skill: "divineEcho" },
    { skill: "smiteShield" },
    { skill: "sacredBastion" },
    { skill: "hammersRighteous" },
  ],
  seqNote:
    "Cast left to right to stack buffs into the Divine Echo window, then chain the binds (Smite Shield → Sacred Bastion → Hammers of the Righteous) into Blast / Heaven's Hammer. Draft order — confirm with the Paladin Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Binds",
      rows: [
        { skill: "smiteShield", timing: "10s · 120s cd" },
        { skill: "sacredBastion", timing: "10s · 360s cd" },
        { skill: "hammersRighteous", timing: "≥10s · 100s cd" },
      ],
    },
    {
      label: "iFrames & defense",
      rows: [
        { skill: "sacrosanctity", timing: "30s · 300s cd" },
        { skill: "grandGuardian", timing: "up to 4s · 120s cd" },
        { skill: "guardian", timing: "revive · 600s cd" },
      ],
    },
    {
      label: "Dispel & lockdown",
      rows: [
        { skill: "divineCharge", timing: "silence" },
        { skill: "magicCrash", timing: "dispel buffs" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value.",
    rows: [
      { stat: "Weapon multiplier", total: "1H 1.24× · 2H 1.34×", parts: [] },
      {
        stat: "Attack speed",
        total: "1H 8 · 2H 7",
        parts: [
          { skill: "agileArms", value: "+2" },
          { skill: "weaponMastery", value: "+1" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "91–94%",
        sub: "base +20%",
        parts: [{ skill: "highPaladin", value: "+71%" }],
      },
      {
        stat: "STR",
        total: "+50 (80) · +16% AP",
        parts: [
          { skill: "agileArms", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "impenetrableSkin", value: "+30" },
          { skill: "mapleWarrior", value: "+16% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +120",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "parashockGuard", value: "+20" },
          { skill: "shieldMastery", value: "+20" },
          { skill: "divineShield", value: "+20" },
          { skill: "greaterVessel", value: "+60" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+47%",
        sub: "incl. +5% base",
        parts: [{ skill: "highPaladin", value: "+42%" }],
      },
      {
        stat: "Crit damage",
        total: "+25–26%",
        parts: [{ skill: "highPaladin", value: "+20%" }],
      },
      {
        stat: "Damage",
        total: "+25% (55%)",
        parts: [
          { skill: "greaterVessel", value: "+25%" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+71.82% (218.73%)",
        parts: [
          { skill: "divineBlessing", value: "+21%" },
          { skill: "highPaladin", value: "+42%" },
          { skill: "divineEcho", value: "+75%", cond: "temp" },
          { skill: "weaponAura", value: "+6%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+31% (71.02%)",
        sub: "73.92% w/ blunt",
        parts: [
          { skill: "highPaladin", value: "+31%" },
          { skill: "nobleDemand", value: "×+50%" },
          { skill: "weaponAura", value: "×+16%", cond: "temp" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/paladin", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Paladin", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Arch Mage (Ice/Lightning) config — reconciled from arch-mage-il.config.ts onto the
  repo ClassConfig shape. Source: Grandis Library (GMS v266); link + legion + name
  from classData.ts. Mage baseStats add Magic Attack / Ignore Elemental Resistance /
  Buff Duration rows. [OK] base data · [DRAFT] sequence · [ICON] icons omitted ·
  [DESIGN] description. innerAbility duplicated to both columns.
*/

export const archMageIl: ClassConfig = {
  name: "Arch Mage (Ice/Lightning)",
  branch: "Explorers",
  archetype: "Magician",
  description:
    "A map-control caster who freezes with Ice to stack Freezing Crush, then bursts Lightning — and whose Freezing Breath is a 13s bind that doubles as a long i-frame.",
  portraitUrl: classPortraitUrl("Arch Mage (Ice/Lightning)"),
  accentColor: "#42c8dd",
  facts: [
    { label: "Primary weapon", value: "Wand · Staff" },
    { label: "Secondary", value: "Shield · Magic Book" },
    { label: "Main stat", value: "INT · LUK" },
    { label: "Playstyle", value: "Freeze · shock · control" },
  ],
  linkSkill: {
    name: "Empirical Knowledge",
    desc: "31% on hit to mark the highest-HP enemy — +5% Damage & +5% Ignore DEF per stack (×3, 10s).",
    pills: [["Lv9", "31% on hit", "+5%/stack"]],
    note: "Stacks ×3, one per Explorer Mage at master level.",
  },
  legion: "INT +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Wand or Staff applies a 1.2× multiplier (attack Stage 7 with MP Boost + Agile Magic). A Wand adds +5% crit rate.",
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
    // ── Toggles / buffs ──
    absoluteZeroAura: { name: "Absolute Zero Aura", desc: "Toggle aura (Ice)." },
    manaOverload: { name: "Mana Overload", nodeType: "boost", desc: "Toggle — ×+8% Final Damage. 30s cd." },
    meditation: { name: "Meditation", desc: "+30 MATT party buff. 240s." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) INT window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    glacialFury: { name: "Glacial Fury", desc: "Buff — ramps MATT / crit damage / FD on Ice hits. 20s / 60s cd." },
    infinity: { name: "Infinity", desc: "×+91% Final Damage ramping buff — keep uptime." },
    // ── Attacks / summons ──
    chainLightning: { name: "Chain Lightning", desc: "Main bossing line (Lightning); multi-platform chains." },
    blizzard: { name: "Blizzard", desc: "Main mobbing line (Ice); near map-wide." },
    lightningOrb: { name: "Lightning Orb", desc: "Hyper attack (Lightning); −50% damage taken up to 2s. 60s cd." },
    thunderSphere: { name: "Thunder Sphere", desc: "Summon (Lightning). 120s / 60s." },
    elquines: { name: "Elquines", nodeType: "boost", desc: "Summon (Ice) — +70% mastery. 600s." },
    frostArk: { name: "Frost Ark", nodeType: "boost", desc: "Summon burst (Ice); map control. 20s / 120s cd." },
    spiritOfSnow: { name: "Spirit of Snow", nodeType: "boost", desc: "Summon (Ice); map clear. 30s / 120s cd." },
    freezingBreath: {
      name: "Freezing Breath",
      desc: "13s bind + up to 10s i-frame; +30% MDR / +15% PDR on target. 120s cd — marquee utility.",
    },
    frozenLightning: {
      name: "Frozen Lightning",
      nodeType: "origin",
      desc: "HEXA origin — 10s bind + i-frame. 360s cd.",
    },
    // ── Passives (baseStats contributors) ──
    freezingCrush: {
      name: "Freezing Crush",
      desc: "Core mechanic — Ice hits stack a debuff that raises crit damage & FD of Lightning attacks.",
    },
    shatter: { name: "Shatter", desc: "+2% Ignore DEF per Freezing Crush stack (max +10% to frozen enemies)." },
    stormMagic: { name: "Storm Magic", desc: "×+18% Final Damage vs enemies with DoT / stun / freeze." },
    jupiterThunder: { name: "Jupiter Thunder", desc: "×+12% Final Damage to Lightning attacks." },
    elementAmp: { name: "Element Amplification", desc: "Passive — +50% Damage." },
    arcaneAim: { name: "Arcane Aim", desc: "Passive — +8% Damage per hit (max +40%), +20% Ignore DEF." },
    arcaneOverdrive: { name: "Arcane Overdrive", desc: "Passive — +30% crit rate, +13% crit damage." },
    arcaneOverdrive5: { name: "Arcane Overdrive (5th)", nodeType: "boost", desc: "×+21% Final Damage (−7% every 10s)." },
    elementalDecrease: { name: "Elemental Decrease", desc: "Passive — +40% Final Damage, +10% Ignore Elemental Resistance." },
    buffMastery: { name: "Buff Mastery", desc: "+30 MATT, +50% buff duration." },
    empiricalKnowledge: { name: "Empirical Knowledge", desc: "Explorer Mage link — +5% Damage & +5% Ignore DEF per stack (×3)." },
    agileMagic: { name: "Agile Magic", desc: "2nd job passive — +2 attack speed, +20 INT." },
    mpBoost: { name: "MP Boost", desc: "1st job passive — +1 attack speed; +5% crit rate with a Wand." },
    highWisdom: { name: "High Wisdom", desc: "Passive — +40 INT." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +INT to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
    spellMastery: { name: "Spell Mastery", desc: "Passive — spell mastery, +10 MATT, +5% crit rate." },
  },
  sequence: [
    { skill: "absoluteZeroAura" },
    { skill: "manaOverload" },
    { skill: "meditation" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "glacialFury" },
    { skill: "infinity" },
    { skill: "elquines" },
    { skill: "thunderSphere" },
    { skill: "frostArk" },
    { skill: "freezingBreath" },
    { skill: "frozenLightning" },
    { skill: "chainLightning" },
  ],
  seqNote:
    "Raise toggles and summons, ramp Infinity, build Freezing Crush with Ice skills, then burst Lightning (Chain Lightning) inside the Frozen Lightning window. Draft order — confirm with the Explorer Mage Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Binds & iFrames",
      rows: [
        { skill: "freezingBreath", timing: "13s bind · 10s i-frame · 120s cd" },
        { skill: "frozenLightning", timing: "10s · 360s cd" },
      ],
    },
    {
      label: "Map clear",
      rows: [
        { skill: "blizzard", timing: "near map-wide" },
        { skill: "frostArk", timing: "20s · 120s cd" },
        { skill: "spiritOfSnow", timing: "30s · 120s cd" },
      ],
    },
    {
      label: "Defense",
      rows: [{ skill: "lightningOrb", timing: "−50% taken · 60s cd" }],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Freeze-scaled values shown at cap.",
    rows: [
      { stat: "Weapon multiplier", total: "1.2×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 4",
        parts: [
          { skill: "mpBoost", value: "+1" },
          { skill: "agileMagic", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "95%",
        sub: "base +25%",
        parts: [{ skill: "elquines", value: "+70%" }],
      },
      {
        stat: "INT",
        total: "+60 · +15% AP",
        parts: [
          { skill: "agileMagic", value: "+20" },
          { skill: "highWisdom", value: "+40" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Magic attack",
        total: "+4% · +70 (110)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "meditation", value: "+30" },
          { skill: "spellMastery", value: "+10" },
          { skill: "buffMastery", value: "+30" },
          { skill: "glacialFury", value: "max +40 Ice", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40% (45%)",
        sub: "incl. +5% base",
        parts: [
          { skill: "spellMastery", value: "+5%" },
          { skill: "arcaneOverdrive", value: "+30%" },
          { skill: "mpBoost", value: "+5%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+13% (23–29%)",
        parts: [
          { skill: "arcaneOverdrive", value: "+13%" },
          { skill: "freezingCrush", value: "+2%/Ice hit" },
          { skill: "glacialFury", value: "max +16%", cond: "temp" },
        ],
      },
      {
        stat: "Damage",
        total: "+90% (189%)",
        parts: [
          { skill: "elementAmp", value: "+50%" },
          { skill: "arcaneAim", value: "max +40%" },
          { skill: "empiricalKnowledge", value: "max +9%" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+188.79% (384.91–398.76%)",
        parts: [
          { skill: "elementalDecrease", value: "+40%" },
          { skill: "infinity", value: "×+91%" },
          { skill: "jupiterThunder", value: "×+12%" },
          { skill: "freezingCrush", value: "×+1%/Ice hit" },
          { skill: "glacialFury", value: "max +8%", cond: "temp" },
          { skill: "stormMagic", value: "×+18%" },
          { skill: "manaOverload", value: "×+8%" },
          { skill: "arcaneOverdrive5", value: "×+21%" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+20% (54.14%)",
        parts: [
          { skill: "arcaneAim", value: "+20%" },
          { skill: "empiricalKnowledge", value: "max +9%", cond: "debuff" },
          { skill: "freezingBreath", value: "+30% MDR", cond: "debuff" },
          { skill: "shatter", value: "max +10%", cond: "debuff" },
        ],
      },
      {
        stat: "Ignore elemental resist",
        total: "+10%",
        parts: [{ skill: "elementalDecrease", value: "+10%" }],
      },
      {
        stat: "Buff duration",
        total: "+50%",
        parts: [{ skill: "buffMastery", value: "+50%" }],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/arch-mage-ice-lightning", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Arch_Mage_(Ice,_Lightning)", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

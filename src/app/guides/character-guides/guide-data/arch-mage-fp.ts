import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Arch Mage (Fire/Poison) config — reconciled from arch-mage-fp.config.ts onto the
  repo ClassConfig shape. Source: Grandis Library (GMS v266); link + legion + name
  from classData.ts. Mage baseStats add Magic Attack / Ignore Elemental Resistance /
  Buff Duration rows (rendered generically). [OK] base data · [DRAFT] sequence ·
  [ICON] icons omitted · [DESIGN] description. innerAbility duplicated to both columns.
*/

export const archMageFp: ClassConfig = {
  name: "Arch Mage (Fire/Poison)",
  branch: "Explorers",
  archetype: "Magician",
  description:
    "A damage-over-time caster who layers poison and flame, then detonates the stacks with Mist Eruption — DoT keeps ticking through Damage Reflect and weapon/magic cancel.",
  portraitUrl: classPortraitUrl("Arch Mage (Fire/Poison)"),
  accentColor: "#e8662e",
  facts: [
    { label: "Primary weapon", value: "Wand · Staff" },
    { label: "Secondary", value: "Shield · Magic Book" },
    { label: "Main stat", value: "INT · LUK" },
    { label: "Playstyle", value: "DoT · detonate" },
  ],
  linkSkill: {
    name: "Empirical Knowledge",
    desc: "31% on hit to mark the highest-HP enemy — +5% Damage & +5% Ignore DEF per stack (×3, 10s).",
    pills: [["Lv9", "31% on hit", "+5%/stack"]],
    note: "Stacks ×3, one per Explorer Mage at master level.",
  },
  legion: "Max MP +2 / 3 / 4 / 5 / 6%",
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
    ignite: { name: "Ignite", desc: "Toggle — fire skills detonate poison." },
    infernoAura: { name: "Inferno Aura", desc: "Toggle aura DoT." },
    manaOverload: { name: "Mana Overload", nodeType: "boost", desc: "Toggle — ×+8% Final Damage. 30s cd." },
    meditation: { name: "Meditation", desc: "+30 MATT party buff. 240s." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) INT window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    infinity: { name: "Infinity", desc: "×+91% Final Damage ramping buff — keep uptime; central to the FD chain." },
    // ── DoTs / burst ──
    creepingToxin: { name: "Creeping Toxin", desc: "Spreading DoT. 60s." },
    poisonMist: { name: "Poison Mist", desc: "DoT field." },
    flameHaze: { name: "Flame Haze", desc: "DoT line." },
    elementalFury: { name: "Elemental Fury", nodeType: "boost", desc: "Burst summon, 3–6s by Fervent Drain stacks. 60s cd." },
    mistEruption: {
      name: "Mist Eruption",
      desc: "Burst detonator — consumes DoT stacks for a big nuke; FD scales with active DoTs.",
    },
    infernalVenom: {
      name: "Infernal Venom",
      nodeType: "origin",
      desc: "HEXA origin — 10s bind + i-frame; raises Fervent Drain cap to +50% FD. 360s cd.",
    },
    etherealForm: { name: "Ethereal Form", nodeType: "boost", desc: "3s i-frame. 60s cd — F/P's only reliable dodge." },
    // ── Passives (baseStats contributors) ──
    ifrit: { name: "Ifrit", nodeType: "boost", desc: "Summon — +70% mastery. 600s." },
    arcaneOverdrive: { name: "Arcane Overdrive", desc: "Passive — +30% crit rate, +13% crit damage." },
    elementAmp: { name: "Element Amplification", desc: "Passive — +50% Damage." },
    arcaneAim: { name: "Arcane Aim", desc: "Passive — +8% Damage per hit (max +40%), +20% Ignore DEF." },
    elementalDecrease: { name: "Elemental Decrease", desc: "Passive — +40% Final Damage, +10% Ignore Elemental Resistance." },
    feverDrain: { name: "Fervent Drain", desc: "×+5% Final Damage per active DoT (max +25%)." },
    burningMagic: { name: "Burning Magic", desc: "×+13% Final Damage vs enemies with DoT / stun / freeze." },
    arcaneOverdrive5: { name: "Arcane Overdrive (5th)", nodeType: "boost", desc: "×+21% Final Damage (−7% every 10s)." },
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
    { skill: "ignite" },
    { skill: "infernoAura" },
    { skill: "manaOverload" },
    { skill: "meditation" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "infinity" },
    { skill: "creepingToxin" },
    { skill: "poisonMist" },
    { skill: "flameHaze" },
    { skill: "elementalFury" },
    { skill: "infernalVenom" },
    { skill: "mistEruption" },
  ],
  seqNote:
    "Raise toggles, ramp Infinity, lay your DoTs, then detonate with Mist Eruption inside the Infernal Venom window. Draft order — confirm with the Explorer Mage Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Binds & iFrames",
      rows: [
        { skill: "infernalVenom", timing: "10s · 360s cd" },
        { skill: "etherealForm", timing: "3s · 60s cd" },
      ],
    },
    {
      label: "Burst & DoT",
      rows: [
        { skill: "mistEruption", timing: "DoT detonate" },
        { skill: "creepingToxin", timing: "spreading DoT" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. DoT-scaled values shown at cap.",
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
        parts: [{ skill: "ifrit", value: "+70%" }],
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
        total: "+4% · +70",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "meditation", value: "+30" },
          { skill: "spellMastery", value: "+10" },
          { skill: "buffMastery", value: "+30" },
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
        total: "+13%",
        parts: [{ skill: "arcaneOverdrive", value: "+13%" }],
      },
      {
        stat: "Damage",
        total: "+90% (129%)",
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
        total: "+260.99% (492.3%)",
        parts: [
          { skill: "elementalDecrease", value: "+40%" },
          { skill: "infinity", value: "×+91%" },
          { skill: "feverDrain", value: "×+5%/DoT" },
          { skill: "burningMagic", value: "×+13%" },
          { skill: "manaOverload", value: "×+8%" },
          { skill: "arcaneOverdrive5", value: "×+21%" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+20% (27.2%)",
        parts: [
          { skill: "arcaneAim", value: "+20%" },
          { skill: "empiricalKnowledge", value: "max +9%", cond: "debuff" },
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
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/arch-mage-fire-poison", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Arch_Mage_(Fire,_Poison)", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

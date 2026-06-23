import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Battle Mage config — reconciled from battle-mage.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Melee party-support caster built around one-at-a-time party auras. Mage baseStats add
  a Magic Attack row. [OK] base data · [DRAFT] sequence · [ICON] icons omitted ·
  [DESIGN] description. innerAbility duplicated to both columns.
*/

export const battleMage: ClassConfig = {
  name: "Battle Mage",
  branch: "Resistance",
  archetype: "Magician",
  description:
    "A melee support caster who runs one party aura at a time — Dark for damage, Hasty for speed, Weakening for IED — while a dark spirit auto-attacks alongside Finishing Blow.",
  portraitUrl: classPortraitUrl("Battle Mage"),
  accentColor: "#7a3f9e",
  facts: [
    { label: "Primary weapon", value: "Staff" },
    { label: "Secondary", value: "Shield · Magic Marble" },
    { label: "Main stat", value: "INT · LUK" },
    { label: "Playstyle", value: "Melee caster · auras" },
  ],
  linkSkill: {
    name: "Spirit of Freedom",
    desc: "Invincibility after being revived (removed on changing maps).",
    pills: [
      ["Lv6", "6s", "revive"],
      ["Lv12", "12s", "revive"],
    ],
    note: "Stacks ×4, once per Resistance class — except Demons and Xenon.",
  },
  legion: "INT +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Staff + Shield / Magic Marble applies a 1.2× multiplier (attack Stage 8). One party aura is active at a time; a dark spirit auto-attacks alongside you.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Damage to enemies w/ Abnormal Status +8%" },
      { tier: "epc", tag: "Epic", text: "Magic Attack +21" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Damage to enemies w/ Abnormal Status +8%" },
      { tier: "epc", tag: "Epic", text: "Magic Attack +21" },
    ],
  },
  skills: {
    // ── Auras & buffs ──
    darkAura: { name: "Dark Aura", desc: "Aura toggle — +10% Damage, +7% MATT; Hyper adds +5% Boss Damage. The bossing aura." },
    weakeningAura: { name: "Weakening Aura", desc: "Aura toggle — ×+20% Ignore DEF debuff (Hyper Enhance adds ×+5% FD)." },
    hastyAura: { name: "Hasty Aura", desc: "Aura toggle — +2 attack speed (+1 more while toggled) to the party." },
    staffBoost: { name: "Staff Boost", desc: "+2 attack speed buff. 200s." },
    manaOverload: { name: "Mana Overload", desc: "Toggle — ×+8% Final Damage. 30s cd." },
    forLiberty: { name: "For Liberty", desc: "+10% Damage buff. 60s / 120s cd." },
    masterOfDeath: { name: "Master of Death", desc: "Hyper buff / summon. 20s / 120s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) INT window. 60s / 120s cd.",
    },
    auraScythe: { name: "Aura Scythe", nodeType: "boost", desc: "+60 MATT buff (Ambassador Scythe pairs with Finishing Blow). 25s / 60s cd." },
    // ── Attacks / summons ──
    finishingBlow: { name: "Finishing Blow", desc: "Main bossing line (pairs with Aura Scythe: Ambassador Scythe)." },
    abyssalLightning: { name: "Abyssal Lightning", nodeType: "boost", desc: "Burst + i-frame. 30s / 120s cd." },
    altarOfAnnihilation: { name: "Altar of Annihilation", nodeType: "boost", desc: "Placeable burst zone. 40s / 0.3s cd." },
    grimHarvest: { name: "Grim Harvest", nodeType: "boost", desc: "Summon. 30s / 60s cd." },
    crimsonPact: { name: "Crimson Pact", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Party / survivability ──
    partyShield: { name: "Party Shield", desc: "Party −10% damage taken, 30s. 120s cd." },
    ethArealForm: { name: "Ethereal Form", desc: "3s i-frame. 60s cd." },
    // ── Passives (baseStats contributors) ──
    staffExpert: { name: "Staff Expert", nodeType: "boost", desc: "Passive — +70% mastery, +20% crit damage, +30 MATT." },
    spellBoost: { name: "Spell Boost", desc: "Passive — +6% Damage, ×+22% FD, +30% Ignore DEF, +10 MATT." },
    battleMastery: { name: "Battle Mastery", desc: "Passive — +10% crit damage, ×+30% FD." },
    battleRage: { name: "Battle Rage", desc: "Passive — +25% Damage, +20% crit rate, +10% crit damage." },
    staffArtist: { name: "Staff Artist", desc: "Passive — +20 MATT, +15% crit rate." },
    staffMastery: { name: "Staff Mastery", desc: "Passive — spell mastery, +30 MATT, +20% crit rate." },
    highWisdom: { name: "High Wisdom", desc: "Passive — +40 INT." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +INT to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "darkAura" },
    { skill: "weakeningAura" },
    { skill: "hastyAura" },
    { skill: "staffBoost" },
    { skill: "manaOverload" },
    { skill: "forLiberty" },
    { skill: "masterOfDeath" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "auraScythe" },
    { skill: "abyssalLightning" },
    { skill: "altarOfAnnihilation" },
    { skill: "grimHarvest" },
    { skill: "crimsonPact" },
    { skill: "finishingBlow" },
  ],
  seqNote:
    "Set your auras, stack buffs and summons, then bind with Crimson Pact and burst Finishing Blow (Dark Shock / Condemnation toggled). Draft order — confirm with the Battle Mage Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Party auras",
      rows: [
        { skill: "darkAura", timing: "+Damage aura" },
        { skill: "hastyAura", timing: "+atk speed aura" },
        { skill: "weakeningAura", timing: "IED debuff aura" },
      ],
    },
    {
      label: "Party defense",
      rows: [{ skill: "partyShield", timing: "−10% party · 30s · 120s cd" }],
    },
    {
      label: "iFrames & binds",
      rows: [
        { skill: "ethArealForm", timing: "3s · 60s cd" },
        { skill: "abyssalLightning", timing: "i-frame · 120s cd" },
        { skill: "crimsonPact", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value.",
    rows: [
      { stat: "Weapon multiplier", total: "1.2×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 8",
        sub: "base Stage 4",
        parts: [
          { skill: "staffBoost", value: "+2" },
          { skill: "hastyAura", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "95%",
        sub: "base +25%",
        parts: [{ skill: "staffExpert", value: "+70%" }],
      },
      {
        stat: "INT",
        total: "+40 · +15% AP",
        parts: [
          { skill: "highWisdom", value: "+40" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Magic attack",
        total: "+21% · +80 (140)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "darkAura", value: "+7%" },
          { skill: "spellBoost", value: "+10%" },
          { skill: "staffArtist", value: "+20" },
          { skill: "staffMastery", value: "+30" },
          { skill: "staffExpert", value: "+30" },
          { skill: "auraScythe", value: "+60", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+60%",
        sub: "incl. +5% base",
        parts: [
          { skill: "staffArtist", value: "+15%" },
          { skill: "staffMastery", value: "+20%" },
          { skill: "battleRage", value: "+20%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+40%",
        parts: [
          { skill: "battleMastery", value: "+10%" },
          { skill: "staffExpert", value: "+20%" },
          { skill: "battleRage", value: "+10%" },
        ],
      },
      {
        stat: "Damage",
        total: "+31% (71%)",
        parts: [
          { skill: "spellBoost", value: "+6%" },
          { skill: "battleRage", value: "+25%" },
          { skill: "darkAura", value: "+10%" },
          { skill: "forLiberty", value: "+10%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "(+5%)",
        parts: [{ skill: "darkAura", value: "+5%", cond: "temp" }],
      },
      {
        stat: "Final damage",
        total: "+58.6% (79.85%)",
        parts: [
          { skill: "battleMastery", value: "×+30%" },
          { skill: "spellBoost", value: "×+22%" },
          { skill: "weakeningAura", value: "×+5%" },
          { skill: "manaOverload", value: "×+8%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+44%",
        parts: [
          { skill: "spellBoost", value: "+30%" },
          { skill: "weakeningAura", value: "×+20%", cond: "debuff" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/resistance/battle-mage", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Battle_Mage", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Demon Slayer config — reconciled from demon-slayer.config.ts onto the repo
  ClassConfig shape. Source: Grandis Library (GMS v266); link + legion + name from
  classData.ts. Uses Demon Fury instead of MP; single-character Fury Unleashed link.
  [OK] base data · [DRAFT] sequence · [ICON] icons omitted · [DESIGN] description.
  innerAbility duplicated to both columns.
*/

export const demonSlayer: ClassConfig = {
  name: "Demon Slayer",
  branch: "Demons",
  archetype: "Warrior",
  description:
    "A sturdy demon bruiser that spends Demon Fury instead of MP — transforms with Dark Metamorphosis and stacks heavy damage-reduction and i-frames between Demon Impact bursts.",
  portraitUrl: classPortraitUrl("Demon Slayer"),
  accentColor: "#a8324a",
  facts: [
    { label: "Primary weapon", value: "1H Blunt · 1H Axe" },
    { label: "Secondary", value: "Demon Aegis" },
    { label: "Main stat", value: "STR · DEX" },
    { label: "Playstyle", value: "Transform bruiser" },
  ],
  linkSkill: {
    name: "Fury Unleashed",
    desc: "+Boss Damage. A single-character link — does not stack like the shared Resistance link.",
    pills: [["Lv3", "+20% Boss", "—"]],
    note: "Single-character link (master Lv. 3).",
  },
  legion: "Abnormal Status Resistance +1 / 2 / 3 / 4 / 5",
  weaponNote:
    "1H Blunt or Axe + Demon Aegis applies a 1.2× multiplier (attack Stage 8). Uses no MP — attacks cost Demon Fury, which regenerates over time and on Demon Lash hits.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Damage to enemies w/ Abnormal Status +8%" },
      { tier: "epc", tag: "Epic", text: "Chance to Skip Cooldown +10%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Damage to enemies w/ Abnormal Status +8%" },
      { tier: "epc", tag: "Epic", text: "Chance to Skip Cooldown +10%" },
    ],
  },
  skills: {
    // ── Buffs ──
    leechAura: { name: "Leech Aura", desc: "Lifesteal aura buff. 180s." },
    boundlessRage: { name: "Boundless Rage", desc: "Buff. 35s / 120s cd." },
    demonicFortitude: { name: "Demonic Fortitude", desc: "+10% Damage buff. 60s / 120s cd." },
    demonAwakening: { name: "Demon Awakening", nodeType: "boost", desc: "+65% crit rate buff (enhances Demon Lash / Cerberus Chomp). 60s / 120s cd." },
    otherworldGoddessBlessing: { name: "Otherworld Goddess's Blessing", nodeType: "boost", desc: "×+11% FD; −75% damage taken (triggers once). 40s / 120s cd." },
    weaponAura: { name: "Weapon Aura", nodeType: "boost", desc: "×+6% Final Damage, ×+16% Ignore DEF. 130s / 120s cd." },
    darkMetamorphosis: { name: "Dark Metamorphosis", desc: "Demon form — +35% Damage, plus an i-frame on cast. 180s / 90s cd." },
    // ── Attacks / summons ──
    demonImpact: { name: "Demon Impact", desc: "Main bossing line (Fury cost)." },
    spiritOfRage: { name: "Spirit of Rage", nodeType: "boost", desc: "Demon summon. 16s / 120s cd." },
    orthrus: { name: "Orthrus", nodeType: "boost", desc: "Twin-hound summon. 55s / 120s cd." },
    bindingDarkness: { name: "Binding Darkness", desc: "10s bind; passive grants +30% Ignore DEF. 120s cd." },
    nightmare: { name: "Nightmare", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Survivability ──
    vengeance: { name: "Vengeance", desc: "−20% damage taken, 10s. 120s cd." },
    defenderOfTheDemon: { name: "Defender of the Demon", nodeType: "boost", desc: "Summon; −25% damage taken (6s / 2 attacks). 120s cd." },
    demonBane: { name: "Demon Bane", nodeType: "boost", desc: "Burst + 6s i-frame. 120s cd." },
    // ── Passives (baseStats contributors) ──
    barricadeMastery: { name: "Barricade Mastery", nodeType: "boost", desc: "Passive — +70% mastery, +12% crit damage, +30 ATT." },
    outrage: { name: "Outrage", desc: "Passive — +20 ATT, +20% crit rate." },
    insultToInjury: { name: "Insult to Injury", desc: "+15% crit rate; ×+15% FD vs stun / blind / freeze / paralysis." },
    focusedFury: { name: "Focused Fury", desc: "×+31% Final Damage, +1 attack speed passive." },
    weaponMastery: { name: "Weapon Mastery", desc: "×+10% Final Damage passive." },
    demonCry: { name: "Demon Cry", desc: "AoE + ×+15% Ignore DEF debuff." },
    furyUnleashed: { name: "Fury Unleashed", desc: "Demon Slayer link — +20% Boss Damage." },
    agileDemon: { name: "Agile Demon", desc: "2nd job passive — +2 attack speed, +20 STR." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 STR / DEX." },
    impenetrableSkin: { name: "Impenetrable Skin", desc: "Passive — +30 STR and a barrier." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +STR to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "leechAura" },
    { skill: "boundlessRage" },
    { skill: "demonicFortitude" },
    { skill: "demonAwakening" },
    { skill: "otherworldGoddessBlessing", cd: "2 min" },
    { skill: "weaponAura" },
    { skill: "darkMetamorphosis" },
    { skill: "spiritOfRage" },
    { skill: "orthrus" },
    { skill: "defenderOfTheDemon" },
    { skill: "bindingDarkness" },
    { skill: "nightmare" },
    { skill: "demonImpact" },
  ],
  seqNote:
    "Stack buffs and summons, transform with Dark Metamorphosis, then bind with Nightmare and burst Demon Impact (Cerberus Chomp on cooldown). Draft order — confirm with the Demon Slayer Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Transform",
      rows: [{ skill: "darkMetamorphosis", timing: "+35% · i-frame · 90s cd" }],
    },
    {
      label: "Damage reduction",
      rows: [
        { skill: "vengeance", timing: "−20% · 10s · 120s cd" },
        { skill: "defenderOfTheDemon", timing: "−25% · 120s cd" },
        { skill: "otherworldGoddessBlessing", timing: "−75% once · 120s cd" },
      ],
    },
    {
      label: "iFrames & binds",
      rows: [
        { skill: "demonBane", timing: "6s i-frame · 120s cd" },
        { skill: "bindingDarkness", timing: "10s · 120s cd" },
        { skill: "nightmare", timing: "10s · 360s cd" },
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
        sub: "base Stage 5",
        parts: [
          { skill: "agileDemon", value: "+2" },
          { skill: "focusedFury", value: "+1" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "90%",
        sub: "base +20%",
        parts: [{ skill: "barricadeMastery", value: "+70%" }],
      },
      {
        stat: "STR",
        total: "+50 (80) · +15% AP",
        parts: [
          { skill: "agileDemon", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "impenetrableSkin", value: "+30" },
          { skill: "mapleWarrior", value: "+15% AP" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +50",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "outrage", value: "+20" },
          { skill: "barricadeMastery", value: "+30" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40% (100%)",
        sub: "incl. +5% base",
        parts: [
          { skill: "outrage", value: "+20%" },
          { skill: "insultToInjury", value: "+15%" },
          { skill: "demonAwakening", value: "+65%", cond: "temp" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+12%",
        parts: [{ skill: "barricadeMastery", value: "+12%" }],
      },
      {
        stat: "Damage",
        total: "+35% (45%)",
        parts: [
          { skill: "darkMetamorphosis", value: "+35%" },
          { skill: "demonicFortitude", value: "+10%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+20%",
        parts: [{ skill: "furyUnleashed", value: "+20%" }],
      },
      {
        stat: "Final damage",
        total: "+44.1% (94.5%)",
        parts: [
          { skill: "weaponMastery", value: "×+10%" },
          { skill: "focusedFury", value: "×+31%" },
          { skill: "insultToInjury", value: "×+15%", cond: "debuff" },
          { skill: "weaponAura", value: "×+6%", cond: "temp" },
          { skill: "otherworldGoddessBlessing", value: "×+11%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+30% (50.02%)",
        parts: [
          { skill: "bindingDarkness", value: "+30%" },
          { skill: "demonCry", value: "×+15%" },
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
    { label: "Grandis Library", url: "https://grandislibrary.com/resistance/demon-slayer", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Demon_Slayer", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

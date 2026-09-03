import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Demon Avenger config — reconciled from demon-avenger.config.ts onto the repo
  ClassConfig shape. Source: Grandis Library (GMS v266); link + legion + name from
  classData.ts. SPECIAL CASE: damage scales off Max HP (primaryStat HP), no MP — the
  baseStats lead row is HP. Single-character Wild Rage link. [OK] base data · [DRAFT]
  sequence · [ICON] icons omitted · [DESIGN] description. innerAbility duplicated.
*/

export const demonAvenger: ClassConfig = {
  name: "Demon Avenger",
  branch: "Demons",
  archetype: "Warrior",
  description:
    "A demon that fights with HP instead of MP — damage scales off a massive Max HP pool, kept topped by lifesteal and layered damage-reduction windows that make it nearly unkillable.",
  portraitUrl: classPortraitUrl("Demon Avenger"),
  accentColor: "#8e2f3a",
  facts: [
    { label: "Primary weapon", value: "Desperado" },
    { label: "Secondary", value: "Demon Aegis" },
    { label: "Main stat", value: "HP (scales damage) · STR" },
    { label: "Playstyle", value: "HP tank · sustain" },
  ],
  linkSkill: {
    name: "Wild Rage",
    desc: "+Damage. A single-character link — does not stack like the shared Resistance link.",
    pills: [["Lv3", "+15% Dmg", "—"]],
    note: "Single-character link (master Lv. 3).",
  },
  legion: "Boss Damage +1 / 2 / 3 / 5 / 6%",
  weaponNote:
    "Desperado + Demon Aegis applies a 1.3× multiplier (attack Stage 7). Damage scales off Max HP, not STR — stack Max HP and Crit Damage. Exceed skills cost HP and build Overload.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Chance to Skip Cooldown +20%" },
      { tier: "unq", tag: "Unique", text: "Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Chance to Skip Cooldown +20%" },
      { tier: "unq", tag: "Unique", text: "Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    diabolicRecovery: { name: "Diabolic Recovery", desc: "+25% Max HP buff. 180s." },
    demonicFrenzy: { name: "Demonic Frenzy", nodeType: "boost", desc: "Toggle — ×+1% FD per 2% Max HP consumed (max +11%); −30% damage taken while active." },
    limitsSurpassed: { name: "Limits Surpassed", desc: "Buff. 24s / 60s cd." },
    forbiddenContract: { name: "Forbidden Contract", desc: "+10% Damage buff. 24s / 60s cd." },
    demonicFortitude: { name: "Demonic Fortitude", desc: "+10% Damage buff. 60s / 120s cd." },
    otherworldGoddessBlessing: { name: "Otherworld Goddess's Blessing", nodeType: "boost", desc: "×+11% FD; −75% damage taken (triggers once). 40s / 120s cd." },
    weaponAura: { name: "Weapon Aura", nodeType: "boost", desc: "×+6% Final Damage, ×+16% Ignore DEF. 130s / 120s cd." },
    overloadRelease: { name: "Overload Release", desc: "Dumps Overload stacks — restores HP and grants ×+25% FD by stacks consumed. 90s buff." },
    // ── Attacks / summons ──
    dimensionalSword: { name: "Dimensional Sword", nodeType: "boost", desc: "Sword summon. 40s / 120s cd." },
    defenderOfTheDemon: { name: "Defender of the Demon", nodeType: "boost", desc: "Summon; −25% damage taken. 120s cd." },
    bloodPrison: { name: "Blood Prison", desc: "10s bind. 120s cd." },
    requiem: { name: "Requiem", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Survivability ──
    revenant: { name: "Revenant", nodeType: "boost", desc: "Buff + 15s i-frame (HP cannot drop below 1). 120s cd." },
    lifeSap: { name: "Life Sap", desc: "Passive HP sustain (effectiveness drops at high Overload)." },
    // ── Passives (baseStats contributors) ──
    advancedDesperadoMastery: { name: "Advanced Desperado Mastery", nodeType: "boost", desc: "Passive — +70% mastery, +8% crit damage, +50 ATT." },
    overwhelmingPower: { name: "Overwhelming Power", desc: "Passive — +30% Damage, ×+19% FD, +30% Ignore DEF, +1 attack speed." },
    abyssalConnection: { name: "Abyssal Connection", desc: "Passive — +40 ATT, +20% crit rate." },
    demonicVeracity: { name: "Demonic Veracity", desc: "Passive — +15% crit rate." },
    painDampener: { name: "Pain Dampener", desc: "+20% Damage to Exceed skills." },
    rageWithin: { name: "Rage Within", desc: "Passive — +600 flat HP." },
    netherSlice: { name: "Nether Slice", desc: "×+30% Ignore DEF line." },
    wildRage: { name: "Wild Rage", desc: "Demon Avenger link — +15% Damage." },
    agileDemon: { name: "Agile Demon", desc: "2nd job passive — +2 attack speed, +400 HP, +20 STR." },
    impenetrableSkin: { name: "Impenetrable Skin", desc: "Passive — +1500 HP and a barrier." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +15% Max HP and +AP scaling. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "diabolicRecovery" },
    { skill: "demonicFrenzy" },
    { skill: "limitsSurpassed" },
    { skill: "forbiddenContract" },
    { skill: "demonicFortitude" },
    { skill: "otherworldGoddessBlessing", cd: "2 min" },
    { skill: "weaponAura" },
    { skill: "revenant" },
    { skill: "dimensionalSword" },
    { skill: "defenderOfTheDemon" },
    { skill: "bloodPrison" },
    { skill: "requiem" },
    { skill: "overloadRelease" },
  ],
  seqNote:
    "Stack buffs and damage-reduction, then bind with Requiem and dump Overload Release before your Exceed bursts (Lunar Slash / Execution + Nether Shield). Draft order — confirm with the Demon Avenger Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "HP sustain",
      rows: [
        { skill: "diabolicRecovery", timing: "+25% Max HP · 180s" },
        { skill: "lifeSap", timing: "passive lifesteal" },
      ],
    },
    {
      label: "iFrames & defense",
      rows: [
        { skill: "revenant", timing: "15s · HP ≥ 1 · 120s cd" },
        { skill: "demonicFrenzy", timing: "−30% taken" },
        { skill: "otherworldGoddessBlessing", timing: "−75% once · 120s cd" },
      ],
    },
    {
      label: "Binds",
      rows: [
        { skill: "bloodPrison", timing: "10s · 120s cd" },
        { skill: "requiem", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Damage scales off the HP row, not STR.",
    rows: [
      { stat: "Weapon multiplier", total: "1.3×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 4",
        parts: [
          { skill: "agileDemon", value: "+2" },
          { skill: "overwhelmingPower", value: "+1" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "90%",
        sub: "base +20%",
        parts: [{ skill: "advancedDesperadoMastery", value: "+70%" }],
      },
      {
        stat: "HP",
        total: "+40% · +1000 (2500) · +15% AP",
        sub: "the damage stat — scale it",
        parts: [
          { skill: "diabolicRecovery", value: "+25%" },
          { skill: "agileDemon", value: "+400" },
          { skill: "rageWithin", value: "+600" },
          { skill: "impenetrableSkin", value: "+1500" },
          { skill: "mapleWarrior", value: "+15% HP/AP" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +90",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "abyssalConnection", value: "+40" },
          { skill: "advancedDesperadoMastery", value: "+50" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40%",
        sub: "incl. +5% base",
        parts: [
          { skill: "demonicVeracity", value: "+15%" },
          { skill: "abyssalConnection", value: "+20%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+8%",
        parts: [{ skill: "advancedDesperadoMastery", value: "+8%" }],
      },
      {
        stat: "Damage",
        total: "+45% (65%) · 85% Exceed",
        parts: [
          { skill: "overwhelmingPower", value: "+30%" },
          { skill: "wildRage", value: "+15%" },
          { skill: "painDampener", value: "+20% Exceed" },
          { skill: "forbiddenContract", value: "+10%", cond: "temp" },
          { skill: "demonicFortitude", value: "+10%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+65.11% (94.27%)",
        parts: [
          { skill: "overloadRelease", value: "×+25%" },
          { skill: "overwhelmingPower", value: "×+19%" },
          { skill: "demonicFrenzy", value: "max ×+11%" },
          { skill: "weaponAura", value: "×+6%", cond: "temp" },
          { skill: "otherworldGoddessBlessing", value: "×+11%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+51% (58.84%)",
        parts: [
          { skill: "overwhelmingPower", value: "+30%" },
          { skill: "netherSlice", value: "×+30%" },
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
    { label: "Grandis Library", url: "https://grandislibrary.com/resistance/demon-avenger", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Demon_Avenger", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

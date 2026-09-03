import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Dawn Warrior config — reconciled from dawn-warrior.config.ts onto the repo
  ClassConfig shape. Source: Grandis Library (GMS v266); link + legion + name from
  classData.ts. Dual Solar/Luna stances; dual 1H/2H weapon-multiplier + attack-speed
  rows. The 6th-job Ascent node (Totality) is kept as nodeType "mastery" with a [DRAFT]
  naming note. [OK] base data · [DRAFT] sequence + 6th-job names · [ICON] icons omitted ·
  [DESIGN] description. innerAbility duplicated to both columns.
*/

export const dawnWarrior: ClassConfig = {
  name: "Dawn Warrior",
  branch: "Cygnus Knights",
  archetype: "Warrior",
  description:
    "A dual-stance Cygnus knight whose Equinox Cycle auto-alternates Solar (Final Damage / speed) and Luna (crit / doubled hits) — a bruiser with strong i-frames and a +72% damage burst.",
  portraitUrl: classPortraitUrl("Dawn Warrior"),
  accentColor: "#e8a838",
  facts: [
    { label: "Primary weapon", value: "1H / 2H Sword" },
    { label: "Secondary", value: "Jewel · Shield" },
    { label: "Main stat", value: "STR · DEX" },
    { label: "Playstyle", value: "Solar / Luna stances" },
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
  legion: "Max HP +250 / 500 / 1000 / 2000 / 2500",
  weaponNote:
    "1H Sword = 1.24× multiplier (attack Stage 9); 2H Sword = 1.34× (Stage 8). Secondary is a Jewel or Shield. Equinox Cycle auto-alternates Solar and Luna stances.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    weaponAura: { name: "Weapon Aura", desc: "×+6% Final Damage, ×+16% Ignore DEF. 130s / 120s cd." },
    cosmicForge: { name: "Cosmic Forge", desc: "Hyper buff. 30s / 120s cd." },
    gloryOfTheGuardians: { name: "Glory of the Guardians", desc: "+10% Damage buff. 60s / 120s cd." },
    empressCygnusBlessing: { name: "Empress Cygnus's Blessing", desc: "Buff. 45s / 120s cd." },
    riftOfDamnation: { name: "Rift of Damnation", nodeType: "boost", desc: "Buff. 30s / 120s cd." },
    transcendentCygnusBlessing: { name: "Transcendent Cygnus's Blessing", nodeType: "boost", desc: "+72% Damage; −5% damage taken. 45s / 120s cd." },
    goddessBlessing: { name: "Maple World Goddess's Blessing", desc: "+400% (assigned-AP) STR window. 60s / 120s cd." },
    // ── Attacks / summons ──
    cosmicBurst: { name: "Cosmic Burst", desc: "Main bossing line." },
    equinoxCycle: { name: "Equinox Cycle", desc: "Auto-alternates Solar / Luna stances while attacking; in 4th job both stance effects apply." },
    cosmos: { name: "Cosmos", nodeType: "boost", desc: "Celestial summon burst. 15s / 60s cd." },
    soulEclipse: { name: "Soul Eclipse", nodeType: "boost", desc: "Burst + i-frame. 20s / 120s cd (long i-frame window)." },
    phalanxCharge: { name: "Phalanx Charge", nodeType: "boost", desc: "Shared 5th-job summon. 15s / 60s cd." },
    impalingRays: { name: "Impaling Rays", desc: "10s bind. 120s cd." },
    astralBlitz: { name: "Astral Blitz", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── iFrames ──
    blazingAssault: { name: "Blazing Assault", desc: "1.8s i-frame line. 45s cd." },
    lusterCharge: { name: "Luster Charge", desc: "1.8s i-frame line. 45s cd." },
    // ── Passives (baseStats contributors) ──
    studentOfTheBlade: { name: "Student of the Blade", nodeType: "boost", desc: "Passive — +70% mastery, +23% crit damage, +50 ATT." },
    masterOfTheSword: { name: "Master of the Sword", desc: "Passive — +35% crit rate, ×+25% FD, +2 attack speed." },
    soulPledge: { name: "Soul Pledge", desc: "Passive — +10% crit rate, +30 STR." },
    unpredictable: { name: "Unpredictable", desc: "Passive — +20% Boss Damage, ×+30% Ignore DEF." },
    trueSight: { name: "True Sight", desc: "×+5% FD (+10% Enhance), ×+10% Ignore DEF (Guardbreak) debuff." },
    soulBlessingIII: { name: "Soul Blessing III", desc: "×+16% Final Damage passive." },
    callOfCygnus: { name: "Call of Cygnus", desc: "+15% assigned-AP STR passive." },
    soulSpeed: { name: "Soul Speed", desc: "2nd job passive — +2 attack speed, +20 STR." },
    physicalTraining: { name: "Physical Training", desc: "Passive — +40 STR." },
    innerVoice: { name: "Inner Voice", desc: "Passive — +40 STR, +30 ATT." },
    elementalExpert: { name: "Elemental Expert", desc: "Passive — +10% ATT." },
    soulElement: { name: "Soul Element", desc: "Passive — +20 ATT, ×+10% Ignore DEF." },
    soulBlessing: { name: "Soul Blessing", desc: "Passive — +15 ATT." },
    divineHand: { name: "Divine Hand", desc: "Passive — +20 ATT." },
    soulBlessingII: { name: "Soul Blessing II", desc: "Passive — +15 ATT." },
    cygnusBlessing: { name: "Cygnus Blessing", desc: "Cygnus Knights link — +35 ATT & MATT." },
    impenetrableSkin: { name: "Impenetrable Skin", desc: "+30 STR survival buff. 18s / 120s cd." },
    herosEcho: { name: "Hero's Echo", desc: "+4% ATT party buff. 2400s / 300s cd." },
  },
  sequence: [
    { skill: "weaponAura" },
    { skill: "cosmicForge" },
    { skill: "gloryOfTheGuardians" },
    { skill: "empressCygnusBlessing" },
    { skill: "riftOfDamnation" },
    { skill: "transcendentCygnusBlessing", cd: "2 min" },
    { skill: "soulEclipse" },
    { skill: "cosmos" },
    { skill: "phalanxCharge" },
    { skill: "impalingRays" },
    { skill: "astralBlitz" },
    { skill: "cosmicBurst" },
  ],
  seqNote:
    "Stack buffs, pop Transcendent Cygnus's Blessing, then bind with Astral Blitz and burst Cosmic Burst (Solar / Luna auto-cycle via Equinox). Draft order — confirm with the Dawn Warrior Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Stances",
      rows: [{ skill: "equinoxCycle", timing: "auto Solar / Luna" }],
    },
    {
      label: "iFrames",
      rows: [
        { skill: "soulEclipse", timing: "long i-frame · 120s cd" },
        { skill: "blazingAssault", timing: "1.8s · 45s cd" },
        { skill: "lusterCharge", timing: "1.8s · 45s cd" },
      ],
    },
    {
      label: "Burst & binds",
      rows: [
        { skill: "transcendentCygnusBlessing", timing: "+72% · 120s cd" },
        { skill: "impalingRays", timing: "10s · 120s cd" },
        { skill: "astralBlitz", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Weapon multiplier / attack speed differ by 1H vs 2H.",
    rows: [
      { stat: "Weapon multiplier", total: "1H 1.24× · 2H 1.34×", parts: [] },
      {
        stat: "Attack speed",
        total: "1H Stage 9 · 2H Stage 8",
        sub: "base 1H Stage 5 · 2H Stage 4",
        parts: [
          { skill: "soulSpeed", value: "+2" },
          { skill: "masterOfTheSword", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "90%",
        sub: "base +20%",
        parts: [{ skill: "studentOfTheBlade", value: "+70%" }],
      },
      {
        stat: "STR",
        total: "+130 (160) · +15% AP",
        sub: "+1 per 2 levels",
        parts: [
          { skill: "soulSpeed", value: "+20" },
          { skill: "physicalTraining", value: "+40" },
          { skill: "innerVoice", value: "+40" },
          { skill: "soulPledge", value: "+30" },
          { skill: "impenetrableSkin", value: "+30" },
          { skill: "callOfCygnus", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+14% · +175",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "elementalExpert", value: "+10%" },
          { skill: "cygnusBlessing", value: "+25" },
          { skill: "soulElement", value: "+20" },
          { skill: "soulBlessing", value: "+15" },
          { skill: "divineHand", value: "+20" },
          { skill: "soulBlessingII", value: "+15" },
          { skill: "innerVoice", value: "+30" },
          { skill: "studentOfTheBlade", value: "+50" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+50%",
        sub: "incl. +5% base",
        parts: [
          { skill: "soulPledge", value: "+10%" },
          { skill: "masterOfTheSword", value: "+35%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+23%",
        parts: [{ skill: "studentOfTheBlade", value: "+23%" }],
      },
      {
        stat: "Damage",
        total: "(+72%)",
        parts: [
          { skill: "gloryOfTheGuardians", value: "+10%", cond: "temp" },
          { skill: "transcendentCygnusBlessing", value: "+72%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+20%",
        parts: [{ skill: "unpredictable", value: "+20%" }],
      },
      {
        stat: "Final damage",
        total: "+52.25% (76.76%)",
        parts: [
          { skill: "soulBlessingIII", value: "×+16%" },
          { skill: "masterOfTheSword", value: "×+25%" },
          { skill: "trueSight", value: "×+5%", cond: "debuff" },
          { skill: "weaponAura", value: "×+6%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+43.3% (57.66%)",
        parts: [
          { skill: "soulElement", value: "×+10%" },
          { skill: "unpredictable", value: "×+30%" },
          { skill: "trueSight", value: "×+10%", cond: "debuff" },
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
    { label: "Grandis Library", url: "https://grandislibrary.com/cygnus-knights/dawn-warrior", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Dawn_Warrior", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

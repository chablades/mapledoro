import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Wind Archer config — reconciled from wind-archer.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Evasive wind archer built on the Trifling Wind toggle. Archer mastery caps at 85%.
  The Ascent node (Elemental Tempest) is omitted (not referenced). [OK] base data ·
  [DRAFT] sequence + 6th-job names · [ICON] icons omitted · [DESIGN] description.
*/

export const windArcher: ClassConfig = {
  name: "Wind Archer",
  branch: "Cygnus Knights",
  archetype: "Archer",
  description:
    "An evasive wind archer whose Trifling Wind toggle auto-fires projectiles on every attack, backed by wind summons and a ~300% Gale Barrier shield.",
  portraitUrl: classPortraitUrl("Wind Archer"),
  accentColor: "#5bbf9e",
  facts: [
    { label: "Primary weapon", value: "Bow" },
    { label: "Secondary", value: "Jewel" },
    { label: "Main stat", value: "DEX · STR" },
    { label: "Playstyle", value: "Auto-fire wind · evasive" },
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
  legion: "DEX +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Bow + Jewel applies a 1.3× multiplier (attack Stage 8). Uses Arrows; Weapon Mastery caps at 85%. Trifling Wind adds auto-firing wind projectiles to every attack.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Crit Rate +20%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Crit Rate +20%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs / toggles ──
    triflingWind: { name: "Trifling Wind", desc: "Toggle — ejects wind projectiles that auto-fire on attack." },
    stormBringer: { name: "Storm Bringer", desc: "Active wind buff / summon. 200s." },
    sharpEyes: { name: "Sharp Eyes", desc: "Party crit buff — +20% crit rate, +15% crit damage. 300s." },
    viciousShot: { name: "Vicious Shot", nodeType: "boost", desc: "+crit damage (50% of crit rate). 30s / 120s cd." },
    stormWhim: { name: "Storm Whim", desc: "Hyper buff. 30s / 120s cd." },
    gloryOfTheGuardians: { name: "Glory of the Guardians", desc: "+10% Damage buff. 60s / 120s cd." },
    empressCygnusBlessing: { name: "Empress Cygnus's Blessing", desc: "Buff. 45s / 120s cd." },
    transcendentCygnusBlessing: { name: "Transcendent Cygnus's Blessing", nodeType: "boost", desc: "+72% Damage; −5% damage taken. 45s / 120s cd." },
    guidedArrow: { name: "Guided Arrow", nodeType: "boost", desc: "Auto-tracking arrows toggle." },
    // ── Attacks / summons ──
    songOfHeaven: { name: "Song of Heaven", desc: "Main bossing / mobbing line." },
    emeraldFlower: { name: "Emerald Flower", desc: "Placeable. 60s." },
    howlingGale: { name: "Howling Gale", nodeType: "boost", desc: "Wind summon burst. 10s / 20–60s cd." },
    vortexSphere: { name: "Vortex Sphere", nodeType: "boost", desc: "Pulling summon. 30s cd." },
    monsoon: { name: "Monsoon", desc: "Hyper burst + 3s i-frame. 120s cd." },
    mistralSpring: { name: "Mistral Spring", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Defense ──
    galeBarrier: { name: "Gale Barrier", nodeType: "boost", desc: "Special barrier (~300% shield) + periodic wind bursts. 45s. 90s cd." },
    // ── Passives (baseStats contributors) ──
    bowExpert: { name: "Bow Expert", nodeType: "boost", desc: "Passive — +70% mastery, +20% crit damage, +40% Boss Damage, ×+35% FD, +30 ATT." },
    bowMastery: { name: "Bow Mastery", desc: "×+10% Final Damage passive." },
    eagleEye: { name: "Eagle Eye", desc: "×+9% Final Damage passive." },
    emeraldDust: { name: "Emerald Dust", desc: "×+10% Ignore DEF passive." },
    touchOfTheWind: { name: "Touch of the Wind", desc: "Passive — +15% DEX, +10 ATT." },
    pinpointPierce: { name: "Pinpoint Pierce", desc: "+15% Damage, ×+15% Ignore DEF line." },
    callOfCygnus: { name: "Call of Cygnus", desc: "+15% assigned-AP DEX passive." },
    stormElemental: { name: "Storm Elemental", desc: "+10% Damage passive." },
    whispersOfTheWind: { name: "Whispers of the Wind", desc: "Passive — +20 ATT." },
    sylvanAid: { name: "Sylvan Aid", desc: "Passive — +20 ATT, +10% crit rate." },
    secondWind: { name: "Second Wind", desc: "Passive — +15 ATT." },
    albatrossMax: { name: "Albatross Max", desc: "Passive — +2 attack speed, +30 ATT, +25% crit rate, +25% Damage, ×+15% FD / Ignore DEF." },
    cygnusBlessing: { name: "Cygnus Blessing", desc: "Cygnus Knights link — +35 ATT & MATT." },
    agileBows: { name: "Agile Bows", desc: "2nd job passive — +2 attack speed, +20 DEX." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 DEX / STR." },
    elementalHarmony: { name: "Elemental Harmony", desc: "Passive — +1 DEX per 2 levels." },
    elementalExpert: { name: "Elemental Expert", desc: "Passive — +10% ATT." },
    herosEcho: { name: "Hero's Echo", desc: "+4% ATT party buff. 2400s / 300s cd." },
  },
  sequence: [
    { skill: "triflingWind" },
    { skill: "stormBringer" },
    { skill: "sharpEyes" },
    { skill: "viciousShot" },
    { skill: "stormWhim" },
    { skill: "gloryOfTheGuardians" },
    { skill: "empressCygnusBlessing" },
    { skill: "transcendentCygnusBlessing", cd: "2 min" },
    { skill: "emeraldFlower" },
    { skill: "howlingGale" },
    { skill: "vortexSphere" },
    { skill: "guidedArrow" },
    { skill: "mistralSpring" },
    { skill: "songOfHeaven" },
  ],
  seqNote:
    "Toggle Trifling Wind, stack buffs and summons, then bind with Mistral Spring and sustain Song of Heaven (Fairy Spiral / Monsoon on cooldown). Draft order — confirm with the Wind Archer Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Wind toggle",
      rows: [{ skill: "triflingWind", timing: "auto-fire wind" }],
    },
    {
      label: "Defense & burst",
      rows: [
        { skill: "galeBarrier", timing: "~300% shield · 45s · 90s cd" },
        { skill: "monsoon", timing: "3s i-frame · 120s cd" },
      ],
    },
    {
      label: "Support & binds",
      rows: [
        { skill: "sharpEyes", timing: "+crit · 300s" },
        { skill: "mistralSpring", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Archers cap Weapon Mastery at 85%.",
    rows: [
      { stat: "Weapon multiplier", total: "1.3×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 8",
        sub: "base Stage 4",
        parts: [
          { skill: "agileBows", value: "+2" },
          { skill: "albatrossMax", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "bowExpert", value: "+70%" }],
      },
      {
        stat: "DEX",
        total: "+15% · +50 · +15% AP",
        sub: "+1 per 2 levels",
        parts: [
          { skill: "touchOfTheWind", value: "+15%" },
          { skill: "agileBows", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "elementalHarmony", value: "+1/2 lvls" },
          { skill: "callOfCygnus", value: "+15% AP" },
        ],
      },
      {
        stat: "Attack",
        total: "+24% · +140",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "elementalExpert", value: "+10%" },
          { skill: "touchOfTheWind", value: "+10%" },
          { skill: "cygnusBlessing", value: "+25" },
          { skill: "whispersOfTheWind", value: "+20" },
          { skill: "sylvanAid", value: "+20" },
          { skill: "secondWind", value: "+15" },
          { skill: "bowExpert", value: "+30" },
          { skill: "albatrossMax", value: "+30" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+60%",
        sub: "incl. +5% base",
        parts: [
          { skill: "sylvanAid", value: "+10%" },
          { skill: "albatrossMax", value: "+25%" },
          { skill: "sharpEyes", value: "+20%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+35%",
        parts: [
          { skill: "sharpEyes", value: "+15%" },
          { skill: "bowExpert", value: "+20%" },
          { skill: "viciousShot", value: "+50% of crit", cond: "temp" },
        ],
      },
      {
        stat: "Damage",
        total: "+50% (132%)",
        parts: [
          { skill: "stormElemental", value: "+10%" },
          { skill: "pinpointPierce", value: "+15%" },
          { skill: "albatrossMax", value: "+25%" },
          { skill: "gloryOfTheGuardians", value: "+10%", cond: "temp" },
          { skill: "transcendentCygnusBlessing", value: "+72%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+40%",
        parts: [{ skill: "bowExpert", value: "+40%" }],
      },
      {
        stat: "Final damage",
        total: "+61.87%",
        parts: [
          { skill: "bowMastery", value: "×+10%" },
          { skill: "eagleEye", value: "×+9%" },
          { skill: "bowExpert", value: "×+35%" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+34.98%",
        parts: [
          { skill: "pinpointPierce", value: "×+15%" },
          { skill: "albatrossMax", value: "×+15%" },
          { skill: "emeraldDust", value: "×+10%" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/cygnus-knights/wind-archer", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Wind_Archer", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Blaster config — reconciled from blaster.config.ts onto the repo ClassConfig shape.
  Source: Grandis Library (GMS v266); link + legion + name from classData.ts. High-APM
  combo bruiser with Ammo + Dynamo Gauge resources and Charge-skill animation canceling.
  [OK] base data · [DRAFT] sequence · [ICON] icons omitted · [DESIGN] description.
  innerAbility duplicated to both columns.
*/

export const blaster: ClassConfig = {
  name: "Blaster",
  branch: "Resistance",
  archetype: "Warrior",
  description:
    "A high-APM combo bruiser who juggles Ammo and a Dynamo Gauge, animation-cancels Charge skills into shockwaves, and stacks heavy self-defense between Bunker Buster bursts.",
  portraitUrl: classPortraitUrl("Blaster"),
  accentColor: "#d6492e",
  facts: [
    { label: "Primary weapon", value: "Arm Cannon" },
    { label: "Secondary", value: "Charge" },
    { label: "Main stat", value: "STR · DEX" },
    { label: "Playstyle", value: "Combo · animation cancel" },
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
  legion: "Ignore DEF +1 / 2 / 3 / 5 / 6%",
  weaponNote:
    "Arm Cannon + Charge applies a 1.7× multiplier (attack Stage 8). Runs two resources — Ammo (auto-reloads) and a Dynamo Gauge spent on Bunker Buster Explosion.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Damage to enemies w/ Abnormal Status +8%" },
      { tier: "epc", tag: "Epic", text: "Attack +21" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Damage to enemies w/ Abnormal Status +8%" },
      { tier: "epc", tag: "Epic", text: "Attack +21" },
    ],
  },
  skills: {
    // ── Buffs ──
    armCannonBoost: { name: "Arm Cannon Boost", desc: "+2 attack speed buff. 200s." },
    cannonOverdrive: { name: "Cannon Overdrive", desc: "Hyper buff. 50s / 120s cd." },
    forLiberty: { name: "For Liberty", desc: "+10% Damage Resistance buff. 60s / 120s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) STR window. 60s / 120s cd.",
    },
    rocketPunch: { name: "Rocket Punch", nodeType: "boost", desc: "Buff. 50s / 120s cd." },
    afterimageShock: { name: "Afterimage Shock", nodeType: "boost", desc: "Buff. 100s / 120s cd." },
    weaponAura: { name: "Weapon Aura", nodeType: "boost", desc: "×+6% Final Damage, ×+16% Ignore DEF. 130s / 120s cd." },
    // ── Attacks / summons ──
    bunkerBusterExplosion: { name: "Bunker Buster Explosion", desc: "Spends a full Dynamo Gauge for a huge burst, then Overheat lockout." },
    resistanceInfantry: { name: "Resistance Infantry", nodeType: "boost", desc: "Summon allies. 15s / 60s cd." },
    finalDestroyer: { name: "Final Destroyer", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Combo tech / survivability ──
    bobbing: { name: "Bobbing", desc: "Charge skill — hold + release to animation-cancel into a shockwave." },
    hyperMagnumPunch: { name: "Hyper Magnum Punch", desc: "Charge skill + 2s i-frame, −35% damage taken up to 4s. 120s cd." },
    blastShield: { name: "Blast Shield", desc: "HP barrier (up to 100% HP) that slowly dissipates." },
    vitalityShield: { name: "Vitality Shield", desc: "−35% damage taken, 15s. 120s cd." },
    gatlingPunch: { name: "Gatling Punch", nodeType: "boost", desc: "Burst; −50% damage taken up to 2s. 120s cd." },
    defensiveOverdrive: { name: "Defensive Overdrive", desc: "3s i-frame. 120s cd." },
    revolvingBlast: { name: "Revolving Blast", desc: "10s bind. 120s cd." },
    // ── Passives (baseStats contributors) ──
    gauntletExpert: { name: "Gauntlet Expert", nodeType: "boost", desc: "Passive — +70% mastery, +14% crit damage, +10% Boss Damage." },
    chargeMastery: { name: "Charge Mastery", desc: "+20% Damage passive." },
    advancedChargeMastery: { name: "Advanced Charge Mastery", desc: "+35% Ignore DEF; −35% damage taken while casting a Charge skill." },
    comboTraining: { name: "Combo Training", desc: "+15% ATT, +1 attack speed passive." },
    comboTrainingII: { name: "Combo Training II", desc: "+40 ATT, +25% crit rate, ×+68% FD passive." },
    shieldTraining: { name: "Shield Training", desc: "×+10% Final Damage passive." },
    armCannonMastery: { name: "Arm Cannon Mastery", desc: "Passive — +20 ATT, +30% crit rate." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 STR / DEX." },
    impenetrableSkin: { name: "Impenetrable Skin", desc: "Passive — +30 STR and a barrier." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +STR to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "armCannonBoost" },
    { skill: "cannonOverdrive" },
    { skill: "forLiberty" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "rocketPunch" },
    { skill: "afterimageShock" },
    { skill: "weaponAura" },
    { skill: "resistanceInfantry" },
    { skill: "finalDestroyer" },
    { skill: "bunkerBusterExplosion" },
  ],
  seqNote:
    "Stack buffs, then bind with Final Destroyer and dump the Dynamo Gauge with Bunker Buster Explosion before rebuilding via Revolving Cannon. Draft order — confirm with the Blaster Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Combo tech",
      rows: [
        { skill: "bobbing", timing: "charge cancel" },
        { skill: "hyperMagnumPunch", timing: "2s i-frame · 120s cd" },
      ],
    },
    {
      label: "Damage reduction",
      rows: [
        { skill: "blastShield", timing: "HP barrier" },
        { skill: "vitalityShield", timing: "−35% · 15s · 120s cd" },
        { skill: "gatlingPunch", timing: "−50% · 2s · 120s cd" },
      ],
    },
    {
      label: "iFrames & binds",
      rows: [
        { skill: "defensiveOverdrive", timing: "3s · 120s cd" },
        { skill: "revolvingBlast", timing: "10s · 120s cd" },
        { skill: "finalDestroyer", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value.",
    rows: [
      { stat: "Weapon multiplier", total: "1.7×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 8",
        sub: "base Stage 5",
        parts: [
          { skill: "armCannonBoost", value: "+2" },
          { skill: "comboTraining", value: "+1" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "90%",
        sub: "base +20%",
        parts: [{ skill: "gauntletExpert", value: "+70%" }],
      },
      {
        stat: "STR",
        total: "+30 (60) · +15% AP",
        parts: [
          { skill: "physicalTraining", value: "+30" },
          { skill: "impenetrableSkin", value: "+30" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+19% · +60",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "comboTraining", value: "+15%" },
          { skill: "armCannonMastery", value: "+20" },
          { skill: "comboTrainingII", value: "+40" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+60%",
        sub: "incl. +5% base",
        parts: [
          { skill: "armCannonMastery", value: "+30%" },
          { skill: "comboTrainingII", value: "+25%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+14%",
        parts: [{ skill: "gauntletExpert", value: "+14%" }],
      },
      {
        stat: "Damage",
        total: "+15% (50%)",
        parts: [
          { skill: "chargeMastery", value: "+20%" },
          { skill: "forLiberty", value: "+10%" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+10%",
        parts: [{ skill: "gauntletExpert", value: "+10%" }],
      },
      {
        stat: "Final damage",
        total: "+84.8% (95.89%)",
        parts: [
          { skill: "shieldTraining", value: "×+10%" },
          { skill: "comboTrainingII", value: "×+68%" },
          { skill: "weaponAura", value: "×+6%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+35% (45.4%)",
        parts: [
          { skill: "advancedChargeMastery", value: "+35%" },
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
    { label: "Grandis Library", url: "https://grandislibrary.com/resistance/blaster", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Blaster", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

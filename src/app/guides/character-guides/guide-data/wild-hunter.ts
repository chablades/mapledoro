import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Wild Hunter config — reconciled from wild-hunter.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  RECENTLY REMASTERED — the whole kit is [DRAFT]; verify numbers against the Wild Hunter
  Discord. Assist skills auto-fire on crossbow hits; Command skills cast with no
  animation. Archer mastery caps at 85%. [ICON] icons omitted · [DESIGN] description.
*/

export const wildHunter: ClassConfig = {
  name: "Wild Hunter",
  branch: "Resistance",
  archetype: "Archer",
  description:
    "A mobile jaguar archer (recently remastered) whose Assist skills auto-fire on crossbow hits and Command skills cast with no animation — dense i-frames over sustained Wild Arrow Blast: Apex damage.",
  portraitUrl: classPortraitUrl("Wild Hunter"),
  accentColor: "#5aa047",
  facts: [
    { label: "Primary weapon", value: "Crossbow" },
    { label: "Secondary", value: "Arrowhead" },
    { label: "Main stat", value: "DEX · STR" },
    { label: "Playstyle", value: "Jaguar · automation" },
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
  legion: "20% chance — +4 / 8 / 12 / 16 / 20% Damage on attack",
  weaponNote:
    "Crossbow + Arrowhead applies a 1.35× multiplier (attack Stage 7). Uses Arrows; Weapon Mastery caps at 85%. Rides Ashlii (Jaguar Rider) to enable Command skills. Recently remastered — verify numbers.",
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
    // ── Buffs ──
    callOfTheWild: { name: "Call of the Wild", desc: "+10% ATT party buff. 300s." },
    sharpEyes: { name: "Sharp Eyes", desc: "Party crit buff — +20% crit rate, +15% crit damage. 300s." },
    viciousShot: { name: "Vicious Shot", nodeType: "boost", desc: "+crit damage (50% of crit rate). 30s / 120s cd." },
    forLiberty: { name: "For Liberty", desc: "+10% Damage buff. 60s / 120s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) DEX window. 60s / 120s cd.",
    },
    // ── Attacks / jaguar ──
    jaguarRider: { name: "Jaguar Rider", desc: "Mount Ashlii (the jaguar) — the permanent ride; enables Command skills." },
    wildArrowBlastApex: { name: "Wild Arrow Blast: Apex", desc: "Main bossing line (final WAB form)." },
    assistSkullBash: { name: "Assist: Skull Bash", desc: "[Assist] auto-fires on Crossbow attacks (3rd in the cycle)." },
    commandPredatorsEye: { name: "Command: Predator's Eye", desc: "[Command] no-cast Ashlii attack / debuff." },
    trapSeed: { name: "Trap Seed", desc: "Placeable trap. 60s." },
    lureBeacon: { name: "Lure Beacon", desc: "Placeable lure. 60s." },
    voltSnare: { name: "Volt Snare", desc: "10s bind. 120s cd." },
    synchronousHunt: { name: "Synchronous Hunt", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    gearStorm: { name: "Gear Storm", nodeType: "mastery", desc: "HEXA burst + i-frame (3 uses per boss). 240s cd." },
    // ── iFrames ──
    felineBerserk: { name: "Feline Berserk", desc: "2s i-frame. 70s cd." },
    primalBloom: { name: "Primal Bloom", nodeType: "boost", desc: "Burst buff + 10s i-frame. 20s / 120s cd." },
    overbite: { name: "Overbite", nodeType: "boost", desc: "1.9s i-frame every 60 Another Bites — near-continuous dodge." },
    // ── Passives (baseStats contributors) ──
    crossbowExpert: { name: "Crossbow Expert", nodeType: "boost", desc: "Passive — +70% mastery, ×+10% FD, +30 ATT." },
    naturesWrath: { name: "Nature's Wrath", desc: "Passive — +30 ATT, +30% crit rate, +1 attack speed." },
    primalEdge: { name: "Primal Edge", desc: "Passive — +25% crit rate, ×+10% FD." },
    feralResonance: { name: "Feral Resonance", desc: "Passive — +14% crit rate, +5% crit damage, ×+15% FD." },
    extendedMagazine: { name: "Extended Magazine", desc: "Passive — +10% crit damage, ×+30% FD." },
    wildInstinct: { name: "Wild Instinct", desc: "Passive — +15% crit damage, ×+10% FD, +40% Ignore DEF." },
    crossbowMastery: { name: "Crossbow Mastery", desc: "+10% Damage passive." },
    advancedFinalAttack: { name: "Advanced Final Attack", desc: "+20 ATT; follow-up hits." },
    soulArrow: { name: "Soul Arrow", desc: "+20 ATT; no arrow consumption." },
    agileCrossbows: { name: "Agile Crossbows", desc: "2nd job passive — +2 attack speed, +20 DEX." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 DEX / STR." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +DEX to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "callOfTheWild" },
    { skill: "sharpEyes" },
    { skill: "viciousShot" },
    { skill: "forLiberty" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "primalBloom" },
    { skill: "trapSeed" },
    { skill: "lureBeacon" },
    { skill: "commandPredatorsEye" },
    { skill: "voltSnare" },
    { skill: "synchronousHunt" },
    { skill: "gearStorm" },
    { skill: "wildArrowBlastApex" },
  ],
  seqNote:
    "Stack buffs and traps, then bind with Synchronous Hunt and open Gear Storm before sustaining Wild Arrow Blast: Apex (Assists auto-fire, Commands cast free). Remastered meta — confirm with the Wild Hunter Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Jaguar automation",
      rows: [
        { skill: "jaguarRider", timing: "ride · enables Commands" },
        { skill: "assistSkullBash", timing: "auto on crossbow hits" },
      ],
    },
    {
      label: "iFrames",
      rows: [
        { skill: "felineBerserk", timing: "2s · 70s cd" },
        { skill: "primalBloom", timing: "10s i-frame · 120s cd" },
        { skill: "overbite", timing: "1.9s per 60 bites" },
      ],
    },
    {
      label: "Party & binds",
      rows: [
        { skill: "sharpEyes", timing: "+crit · 300s" },
        { skill: "voltSnare", timing: "10s · 120s cd" },
        { skill: "synchronousHunt", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Remastered kit — treat values as [DRAFT]. Totals count near-permanent sources; (parens) include temporary buffs. Archers cap Weapon Mastery at 85%.",
    rows: [
      { stat: "Weapon multiplier", total: "1.35×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 4",
        parts: [
          { skill: "naturesWrath", value: "+1" },
          { skill: "agileCrossbows", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "crossbowExpert", value: "+70%" }],
      },
      {
        stat: "DEX",
        total: "+50 · +15% AP",
        parts: [
          { skill: "agileCrossbows", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+14% · +100",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "callOfTheWild", value: "+10%" },
          { skill: "naturesWrath", value: "+30" },
          { skill: "soulArrow", value: "+20" },
          { skill: "crossbowExpert", value: "+30" },
          { skill: "advancedFinalAttack", value: "+20" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+94%",
        sub: "incl. +5% base",
        parts: [
          { skill: "naturesWrath", value: "+30%" },
          { skill: "primalEdge", value: "+25%" },
          { skill: "feralResonance", value: "+14%" },
          { skill: "sharpEyes", value: "+20%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+45%",
        parts: [
          { skill: "feralResonance", value: "+5%" },
          { skill: "sharpEyes", value: "+15%" },
          { skill: "extendedMagazine", value: "+10%" },
          { skill: "wildInstinct", value: "+15%" },
          { skill: "viciousShot", value: "+50% of crit", cond: "temp" },
        ],
      },
      {
        stat: "Damage",
        total: "+10% (40%)",
        parts: [
          { skill: "crossbowMastery", value: "+10%" },
          { skill: "forLiberty", value: "+10%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+98.98%",
        parts: [
          { skill: "primalEdge", value: "×+10%" },
          { skill: "feralResonance", value: "×+15%" },
          { skill: "extendedMagazine", value: "×+30%" },
          { skill: "crossbowExpert", value: "×+10%" },
          { skill: "wildInstinct", value: "×+10%" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+40%",
        parts: [{ skill: "wildInstinct", value: "+40%" }],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/resistance/wild-hunter", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Wild_Hunter", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

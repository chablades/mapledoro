import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Dual Blade config — reconciled from dual-blade.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Notable: 0% BASE Ignore DEF (gear it) — kept as a teaching row. Dark Sight in
  Utility. [OK] base data · [DRAFT] sequence · [ICON] icons omitted · [DESIGN]
  description. innerAbility duplicated to both columns.
*/

export const dualBlade: ClassConfig = {
  name: "Dual Blade",
  branch: "Explorers",
  archetype: "Thief",
  description:
    "A rapid-strike duelist who opens with Final Cut and shreds bosses with Phantom Blow — loaded with i-frames and Dark Sight dodging, but starts with 0% base Ignore DEF.",
  portraitUrl: classPortraitUrl("Dual Blade"),
  accentColor: "#9c4368",
  facts: [
    { label: "Primary weapon", value: "Dagger" },
    { label: "Secondary", value: "Katara" },
    { label: "Main stat", value: "LUK · DEX/STR" },
    { label: "Playstyle", value: "Rapid burst" },
  ],
  linkSkill: {
    name: "Thief's Cunning",
    desc: "On debuffing an enemy — +Damage for 10s (20s cd).",
    pills: [
      ["Lv6", "+18%", "20s"],
      ["Lv9", "+27%", "20s"],
    ],
    note: "Stacks ×3, one per Explorer Thief at master level.",
  },
  legion: "LUK +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Dagger + Katara applies a 1.3× multiplier (attack Stage 8). Weapon Mastery reaches 90%. Base Ignore DEF is 0% — source it from gear, links, and hyper stats.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20% / Chance to Skip Cooldown +20%" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38% / Attack +21" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20% / Chance to Skip Cooldown +20%" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38% / Attack +21" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    finalCut: { name: "Final Cut", desc: "×+40% Final Damage buff + 3s i-frame. 63s cd — the burst-window opener." },
    lastResort: { name: "Last Resort", nodeType: "boost", desc: "+30 ATT, ×+10–24% Final Damage (by stage). 30s / 60s cd." },
    shadowWalker: { name: "Shadow Walker", nodeType: "boost", desc: "×+14% Final Damage while in Dark Sight. 20s / 120s cd." },
    bladeClone: { name: "Blade Clone", desc: "Hyper clone; +10% Damage. 90s." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) LUK window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    // ── Attacks / clones ──
    phantomBlow: { name: "Phantom Blow", desc: "Signature main attack — rapid multi-hit slashes." },
    asurasAnger: { name: "Asura's Anger", desc: "Hyper burst; −50% damage taken up to 3s. 60s cd." },
    bladeStorm: { name: "Blade Storm", nodeType: "boost", desc: "Burst; −50% damage taken up to 2s. 60s cd." },
    suddenRaid: { name: "Sudden Raid", desc: "Burst line." },
    mirrorImage: { name: "Mirror Image", desc: "Clone that echoes attacks. 200s." },
    mirroredTarget: { name: "Mirrored Target", desc: "Decoy summon. 90s." },
    karmaBlade: { name: "Karma Blade", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Survivability ──
    darkSight: { name: "Dark Sight", desc: "Stealth toggle that dodges a long list of boss attacks. 0–15s cd." },
    chainsOfHell: { name: "Chains of Hell", desc: "Grab + 1.5s i-frame. 45s cd." },
    // ── Passives (baseStats contributors) ──
    kataraExpert: { name: "Katara Expert", nodeType: "boost", desc: "Passive — +70% mastery, ×+20% FD, +30 ATT." },
    sharpness: { name: "Sharpness", desc: "Passive — +35% crit rate, +15% crit damage." },
    thorns: { name: "Thorns", desc: "+30 ATT." },
    advancedDarkSight: { name: "Advanced Dark Sight", desc: "×+20% Final Damage while in Dark Sight." },
    shadowMeld: { name: "Shadow Meld", desc: "On activate — +100% crit rate, +15 ATT, ×+7% FD." },
    lifeDrain: { name: "Life Drain", desc: "+5% Boss Damage; lifesteal." },
    venom: { name: "Venom", desc: "×+9% Final Damage; DoT." },
    flashbang: { name: "Flashbang", desc: "+10% Damage." },
    channelKarma: { name: "Channel Karma", desc: "Passive — +30 ATT." },
    thiefsCunning: { name: "Thief's Cunning", desc: "Explorer Thief link — +18% Damage on debuff." },
    kataraBooster: { name: "Katara Booster", desc: "Passive — +2 attack speed, +20 LUK." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 LUK / DEX." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +LUK to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "finalCut" },
    { skill: "lastResort" },
    { skill: "shadowWalker" },
    { skill: "bladeClone" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "mirrorImage" },
    { skill: "mirroredTarget" },
    { skill: "asurasAnger" },
    { skill: "bladeStorm" },
    { skill: "suddenRaid" },
    { skill: "karmaBlade" },
    { skill: "phantomBlow" },
  ],
  seqNote:
    "Open with Final Cut, stack buffs and clones, then bind with Karma Blade and burst Phantom Blow. Draft order — confirm with the Dual Blade Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "iFrames & defense",
      rows: [
        { skill: "finalCut", timing: "3s i-frame · 63s cd" },
        { skill: "asurasAnger", timing: "−50% taken · 3s · 60s cd" },
        { skill: "bladeStorm", timing: "−50% taken · 2s · 60s cd" },
        { skill: "chainsOfHell", timing: "grab · 1.5s · 45s cd" },
      ],
    },
    {
      label: "Dark Sight & binds",
      rows: [
        { skill: "darkSight", timing: "dodge boss attacks" },
        { skill: "karmaBlade", timing: "10s · 360s cd" },
      ],
    },
    {
      label: "Clones",
      rows: [
        { skill: "mirrorImage", timing: "clone · 200s" },
        { skill: "mirroredTarget", timing: "decoy · 90s" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Base Ignore DEF is 0% — gear it.",
    rows: [
      { stat: "Weapon multiplier", total: "1.3×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 8",
        sub: "base Stage 6",
        parts: [{ skill: "kataraBooster", value: "+2" }],
      },
      {
        stat: "Weapon mastery",
        total: "90%",
        sub: "base +20%",
        parts: [{ skill: "kataraExpert", value: "+70%" }],
      },
      {
        stat: "LUK",
        total: "+50 · +15% AP",
        parts: [
          { skill: "kataraBooster", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +90 (135)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "channelKarma", value: "+30" },
          { skill: "kataraExpert", value: "+30" },
          { skill: "thorns", value: "+30" },
          { skill: "shadowMeld", value: "+15", cond: "temp" },
          { skill: "lastResort", value: "+30", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40% (100%)",
        sub: "incl. +5% base",
        parts: [
          { skill: "sharpness", value: "+35%" },
          { skill: "shadowMeld", value: "+100%", cond: "temp" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+15%",
        parts: [{ skill: "sharpness", value: "+15%" }],
      },
      {
        stat: "Damage",
        total: "+20% (68%)",
        parts: [
          { skill: "flashbang", value: "+10%" },
          { skill: "bladeClone", value: "+10%" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "thiefsCunning", value: "+18%", cond: "debuff" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+5%",
        parts: [{ skill: "lifeDrain", value: "+5%" }],
      },
      {
        stat: "Final damage",
        total: "+39.96% (225.57%)",
        parts: [
          { skill: "venom", value: "×+9%" },
          { skill: "shadowMeld", value: "×+7%" },
          { skill: "kataraExpert", value: "×+20%" },
          { skill: "finalCut", value: "×+40%", cond: "temp" },
          { skill: "advancedDarkSight", value: "×+20%" },
          { skill: "shadowWalker", value: "×+14%", cond: "temp" },
          { skill: "lastResort", value: "×+10–24%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+0%",
        sub: "base kit grants none — gear your Ignore DEF",
        parts: [],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/dual-blade", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Dual_Blade", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

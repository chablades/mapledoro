import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Mechanic config — reconciled from mechanic.config.ts onto the repo ClassConfig
  shape. Source: Grandis Library (GMS v266); link + legion + name from classData.ts.
  Deployable-heavy mech pilot with two modes (Humanoid / Tank, +30% crit in Tank).
  QUIRK: Grandis labels the primary-AP baseStats row "STR" even though the damage stat
  is DEX — transcribed verbatim. [OK] base data · [DRAFT] sequence · [ICON] icons
  omitted · [DESIGN] description. innerAbility duplicated to both columns.
*/

export const mechanic: ClassConfig = {
  name: "Mechanic",
  branch: "Resistance",
  archetype: "Pirate",
  description:
    "A deployable-heavy mech pilot who swaps between Humanoid and Tank modes (+30% crit in Tank) and blankets the field with bots, pylons, and summons — strong party utility via Support Unit and portals.",
  portraitUrl: classPortraitUrl("Mechanic"),
  accentColor: "#4d7a9c",
  facts: [
    { label: "Primary weapon", value: "Gun" },
    { label: "Secondary", value: "Magnum" },
    { label: "Main stat", value: "DEX · STR" },
    { label: "Playstyle", value: "Deployables · summons" },
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
  legion: "Buff Duration +5 / 10 / 15 / 20 / 25%",
  weaponNote:
    "Gun + Magnum applies a 1.5× multiplier (attack Stage 8). Two mech modes — Humanoid (mobility / offense) and Tank (+30% crit). Grandis labels the primary-AP row STR even though the damage stat is DEX.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Attack +21 / Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Boss Damage +20%" },
      { tier: "unq", tag: "Unique", text: "Attack +21 / Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs ──
    mechanicRage: { name: "Mechanic Rage", desc: "+2 attack speed buff. 180s." },
    rollOfTheDice: { name: "Roll of the Dice", desc: "Gambling stat buff. 180s (90s cd if 1)." },
    fullSpread: { name: "Full Spread", desc: "Buff. 10s / 60s cd." },
    forLiberty: { name: "For Liberty", desc: "+10% Damage buff. 60s / 120s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) window. 60s / 120s cd.",
    },
    overdrive: { name: "Overdrive", nodeType: "boost", desc: "+ATT (% of base weapon power). 28s / 60s cd." },
    // ── Attacks / deployables ──
    heavySalvoPlus: { name: "Heavy Salvo Plus", desc: "Main bossing line (mark a target with Homing Beacon first)." },
    roboLauncherRM7: { name: "Robo Launcher RM7", nodeType: "boost", desc: "Rocket-bot summon. 70s." },
    rockNShock: { name: "Rock 'n Shock", desc: "Electric pylon network summon. 70s." },
    supportUnitHEX: { name: "Support Unit: H-EX", desc: "Support bot — +10% Ignore DEF, +7% FD nearby (Hyper Party Reinforce adds +2% party). 80s." },
    botsNTots: { name: "Bots 'n Tots", nodeType: "boost", desc: "Bot-swarm summon. 70s." },
    mechaCarrier: { name: "Mecha Carrier", nodeType: "boost", desc: "Carrier summon burst. 50s / 120s cd." },
    doomsdayDevice: { name: "Doomsday Device", nodeType: "boost", desc: "Massive placeable burst. 100s / 120s cd." },
    openPortalGX9: { name: "Open Portal: GX-9", desc: "Party teleport portal. 300s." },
    groundZero: { name: "Ground Zero", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── iFrames ──
    giantRobotSG88: { name: "Giant Robot SG-88", desc: "Big-robot burst + 3s i-frame. 60s cd." },
    fullMetalBarrage: { name: "Full Metal Barrage", nodeType: "boost", desc: "Burst + up to 10s i-frame. 120s cd." },
    // ── Passives (baseStats contributors) ──
    extremeMech: { name: "Extreme Mech", nodeType: "boost", desc: "Passive — +70% mastery, +55 ATT." },
    mechanicMastery: { name: "Mechanic Mastery", desc: "Passive — +20 ATT, +15% crit rate, +5% crit damage." },
    overclock: { name: "Overclock", desc: "Passive — +20% crit rate, ×+42% FD, +30% Ignore DEF." },
    robotMastery: { name: "Robot Mastery", desc: "+45% Damage passive." },
    enhancedSupportUnit: { name: "Enhanced Support Unit", desc: "×+7% Final Damage while near a Support Unit." },
    humanoidMech: { name: "Humanoid Mech", desc: "Mech mount (mobility / offense form). +40 ATT." },
    tankMech: { name: "Tank Mech", desc: "Mech mount (tank form) — +30% crit rate while in tank form." },
    hiddenPeace: { name: "Hidden Peace", desc: "+10% Damage passive." },
    battleProgram: { name: "Battle Program", desc: "Passive — +1 attack speed." },
    loadedDice: { name: "Loaded Dice", desc: "Gambling buff — +40 ATT." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 STR / DEX." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +AP scaling. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "mechanicRage" },
    { skill: "rollOfTheDice" },
    { skill: "fullSpread" },
    { skill: "forLiberty" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "overdrive" },
    { skill: "roboLauncherRM7" },
    { skill: "rockNShock" },
    { skill: "supportUnitHEX" },
    { skill: "botsNTots" },
    { skill: "mechaCarrier" },
    { skill: "doomsdayDevice" },
    { skill: "groundZero" },
    { skill: "heavySalvoPlus" },
  ],
  seqNote:
    "Buff up, deploy the whole kit, then bind with Ground Zero and sustain Heavy Salvo Plus with a Homing Beacon up. Draft order — confirm with the Mechanic Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Deployables",
      rows: [
        { skill: "roboLauncherRM7", timing: "rocket bot · 70s" },
        { skill: "rockNShock", timing: "pylons · 70s" },
        { skill: "botsNTots", timing: "bot swarm · 70s" },
      ],
    },
    {
      label: "Party utility",
      rows: [
        { skill: "supportUnitHEX", timing: "+IED / FD bot · 80s" },
        { skill: "openPortalGX9", timing: "party portal · 300s" },
      ],
    },
    {
      label: "iFrames & binds",
      rows: [
        { skill: "giantRobotSG88", timing: "3s · 60s cd" },
        { skill: "fullMetalBarrage", timing: "up to 10s · 120s cd" },
        { skill: "groundZero", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. The primary-AP row is labeled STR by Grandis, but DEX is the damage stat.",
    rows: [
      { stat: "Weapon multiplier", total: "1.5×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 8",
        sub: "base Stage 5",
        parts: [
          { skill: "mechanicRage", value: "+2" },
          { skill: "battleProgram", value: "+1" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "extremeMech", value: "+70%" }],
      },
      {
        stat: "STR",
        total: "+30 · +15% AP",
        sub: "Grandis labels this STR; DEX is the damage stat",
        parts: [
          { skill: "physicalTraining", value: "+30" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +115 (155)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "humanoidMech", value: "+40" },
          { skill: "mechanicMastery", value: "+20" },
          { skill: "extremeMech", value: "+55" },
          { skill: "loadedDice", value: "+40", cond: "temp" },
          { skill: "overdrive", value: "+80% base ATT", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40% (70%)",
        sub: "incl. +5% base",
        parts: [
          { skill: "mechanicMastery", value: "+15%" },
          { skill: "overclock", value: "+20%" },
          { skill: "tankMech", value: "+30% tank form" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+5%",
        parts: [{ skill: "mechanicMastery", value: "+5%" }],
      },
      {
        stat: "Damage",
        total: "+55% (85%)",
        parts: [
          { skill: "hiddenPeace", value: "+10%" },
          { skill: "robotMastery", value: "+45%" },
          { skill: "forLiberty", value: "+10%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+51.94% (54.78%)",
        parts: [
          { skill: "overclock", value: "×+42%" },
          { skill: "enhancedSupportUnit", value: "×+7%" },
          { skill: "supportUnitHEX", value: "×+2%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+37%",
        parts: [
          { skill: "overclock", value: "+30%" },
          { skill: "supportUnitHEX", value: "×+10%" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/resistance/mechanic", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Mechanic", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

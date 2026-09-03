import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Hero seed config. Verified against Grandis Library (weapon multipliers, 90% mastery,
  +40%/(70%) crit, the multiplicative final-damage chain, ~58% IED). `leveling.interactive`,
  `recLinks.mobbing`, and the exact sequence are drafts — confirm with the Hero Discord
  before publishing.

  Skill `iconId`s are MapleResource `skill` ids from manifests/v268/skill.json.
*/

export const hero: ClassConfig = {
  name: "Hero",
  branch: "Explorers",
  archetype: "Warrior",
  description:
    "A combo-orb warrior built around big two-handed swings and one of the cleanest burst sequences in the game.",
  portraitUrl: classPortraitUrl("Hero"),
  accentColor: "#e5484d",
  facts: [
    { label: "Primary weapon", value: "2H Axe / Sword", itemIds: ["1412065", "1402002"] },
    { label: "Secondary", value: "Medallion · Shield", itemIds: ["1092060"] },
    { label: "Main stat", value: "STR · DEX" },
    { label: "Playstyle", value: "Burst combo" },
  ],
  linkSkill: {
    name: "Invincible Belief",
    iconId: "0000252",
    desc: "Auto-triggers at ≤15% HP — restores Max HP every 1s for 3s.",
    pills: [
      ["Lv6", "35%", "210s"],
      ["Lv9", "44%", "90s"],
    ],
    note: "Stacks ×3, one per Explorer Warrior at master level.",
  },
  legion: "STR +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "2H = 1.44× multiplier (AS 7) vs 1H 1.34× (AS 8). Axe adds +5% damage from Weapon Mastery — take the axe.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1" },
      { tier: "unq", tag: "Unique", text: "+20% Boss Damage or +30 ATT" },
      { tier: "epc", tag: "Epic", text: "+12 All Stats" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1" },
      { tier: "unq", tag: "Unique", text: "+20% Boss Damage or +30 ATT" },
      { tier: "epc", tag: "Epic", text: "+12 All Stats" },
    ],
  },
  skills: {
    spiritCalibur: {
      name: "Spirit Calibur",
      iconId: "1141500",
      nodeType: "origin",
      desc: "Main burst. 10s bind on cast with a brief i-frame. 360s cd — your highest HEXA priority.",
    },
    hexaRagingBlow: {
      name: "HEXA Raging Blow",
      iconId: "1141000",
      nodeType: "mastery",
      desc: "Upgrades your bread-and-butter attack — biggest sustained DPS gain of the Mastery nodes.",
    },
    hexaRisingRage: {
      name: "HEXA Rising Rage",
      iconId: "1141002",
      nodeType: "mastery",
      desc: "Upgrades the burst filler. Leveled last among priorities — finish to 28 late.",
    },
    hexaPuncture: {
      name: "HEXA Puncture",
      iconId: "1141008",
      nodeType: "mastery",
      desc: "Upgrades the damage-over-time debuff. Lv 1 unlock is most of the value.",
    },
    hexaFinalAttack: {
      name: "HEXA Final Attack",
      iconId: "1140009",
      nodeType: "mastery",
      desc: "Upgrades Advanced Final Attack procs. Lv 1 early, low priority after.",
    },
    instinctualCombo: {
      name: "Instinctual Combo",
      iconId: "400011073",
      nodeType: "boost",
      desc: "Combo-orb enhancer and core burst-window buff. 20s up / 120s cd.",
    },
    solJanus: {
      name: "Sol Janus",
      iconId: "500001000",
      nodeType: "common",
      desc: "Shared 6th-job utility. Take to Lv 4 early for the breakpoint, then park it.",
    },
    goddess: {
      name: "Goddess's Blessing",
      iconId: "400001042",
      desc: "+20% damage party burst buff, 60s up / 120s cd. The 2-minute anchor — everything aligns to it.",
    },
    enrage: {
      name: "Enrage",
      iconId: "1120010",
      desc: "+20% crit damage, ×1.25 final damage. Keep it running into every burst.",
    },
    risingRage: {
      name: "Rising Rage",
      iconId: "1121052",
      desc: "Big vertical hits — builds combo orbs heading into the window.",
    },
    cryValhalla: {
      name: "Cry Valhalla",
      iconId: "1121054",
      desc: "Hyper buff: +50 ATT, +30% crit rate. 30s up / 120s cd.",
    },
    swordIllusion: {
      name: "Sword Illusion",
      iconId: "400011124",
      desc: "Sword field with a large final-damage boost while active — cast inside the window.",
    },
    burningSoul: {
      name: "Burning Soul Blade",
      iconId: "400011001",
      desc: "Summons the blade to fight alongside you. 20s up / 120s cd.",
    },
    worldreaver: {
      name: "Worldreaver",
      iconId: "400011027",
      desc: "1.6s i-frame on a 25s cd. Keep at Lv 1 — utility only, no damage value.",
    },
    blitzShield: {
      name: "Blitz Shield",
      iconId: "400001011",
      desc: "HP barrier with up to 5s of protection, 15s cd. Your on-demand defensive.",
    },
    weaponMastery: {
      name: "Weapon Mastery",
      iconId: "1100000",
      desc: "2nd job passive — +15% crit rate, +1 attack speed, ×1.10 final damage, +5% damage with an axe equipped.",
    },
    agileArms: {
      name: "Agile Arms",
      iconId: "1100015",
      desc: "2nd job passive — +2 attack speed, +20 STR.",
    },
    physicalTraining: {
      name: "Physical Training",
      iconId: "1100009",
      desc: "2nd job passive — +30 STR.",
    },
    advancedCombo: {
      name: "Advanced Combo",
      iconId: "1120003",
      desc: "4th job passive — +70% weapon mastery and stronger combo orbs.",
    },
    mapleWarrior: {
      name: "Maple Warrior",
      iconId: "1121000",
      desc: "4th job buff — +15% STR to assigned AP. Effectively permanent.",
    },
    herosEcho: {
      name: "Hero's Echo",
      iconId: "0001005",
      desc: "Beginner skill — +4% ATT for 40 min.",
    },
    spiritBlade: {
      name: "Spirit Blade",
      iconId: "1101006",
      desc: "2nd job buff — +30 ATT, 200s uptime.",
    },
    advFinalAttack: {
      name: "Advanced Final Attack",
      iconId: "1120013",
      desc: "4th job passive — +30 ATT plus extra attack procs.",
    },
    comboAttack: {
      name: "Combo Attack",
      iconId: "1100013",
      desc: "The combo orb engine — +2 ATT per orb (max +20 at full orbs).",
    },
    ferocity: {
      name: "AFA — Ferocity",
      iconId: "1120047",
      desc: "Hyper passive — +20 ATT to Advanced Final Attack.",
    },
    chanceAttack: {
      name: "Chance Attack",
      iconId: "1110009",
      desc: "3rd job passive — +20% crit rate; ×1.25 final damage against debuffed or incapacitated enemies.",
    },
    puncture4: {
      name: "Puncture",
      iconId: "1121015",
      desc: "4th job — +25% damage passive and applies the damage-over-time debuff.",
    },
    epicAdventure: {
      name: "Epic Adventure",
      iconId: "1121053",
      desc: "Explorer hyper buff — +10% damage. 60s up / 120s cd.",
    },
    bossRush: {
      name: "ACA — Boss Rush",
      iconId: "1120045",
      desc: "Hyper passive — +2% boss damage per combo orb (max +20%).",
    },
    reinforce: {
      name: "ACA — Reinforce",
      iconId: "1120043",
      desc: "Hyper passive — with Instinctual Combo, +12% final damage per orb (max ~+135%).",
    },
    combatMastery: {
      name: "Combat Mastery",
      iconId: "1120012",
      desc: "4th job passive — ignore +50% of enemy DEF.",
    },
    weaponAura: {
      name: "Weapon Aura",
      iconId: "400011000",
      desc: "5th job — ×1.06 final damage and +16% IED while the aura is up (near-permanent).",
    },
    impenetrableSkin: {
      name: "Impenetrable Skin",
      iconId: "400011066",
      desc: "5th job defensive — +30 STR and a barrier. 120s cd.",
    },
  },
  sequence: [
    { skill: "goddess", cd: "2 min" },
    { skill: "enrage" },
    { skill: "risingRage" },
    { skill: "cryValhalla" },
    { skill: "swordIllusion" },
    { skill: "burningSoul" },
    { skill: "instinctualCombo" },
    { skill: "spiritCalibur" },
  ],
  seqNote:
    "Cast left to right. Lead with the 2-minute buff so its cooldown anchors every burst window.",
  leveling: {
    heroic: [
      ["spiritCalibur", 1],
      ["hexaRagingBlow", 1],
      ["spiritCalibur", 9],
      ["instinctualCombo", 1],
      ["hexaRagingBlow", 7],
      ["hexaRisingRage", 1],
      ["hexaPuncture", 1],
      ["instinctualCombo", 7],
      ["hexaFinalAttack", 1],
      ["spiritCalibur", 19],
      ["hexaRagingBlow", 19],
      ["solJanus", 4],
      ["instinctualCombo", 18],
      ["spiritCalibur", 29],
      ["hexaRagingBlow", 29],
      ["instinctualCombo", 29],
      ["hexaRisingRage", 28],
    ],
    interactive: [
      ["spiritCalibur", 1],
      ["hexaRagingBlow", 1],
      ["instinctualCombo", 1],
      ["spiritCalibur", 9],
      ["hexaRagingBlow", 9],
      ["hexaRisingRage", 1],
      ["hexaPuncture", 1],
      ["hexaFinalAttack", 1],
      ["instinctualCombo", 9],
      ["solJanus", 4],
      ["spiritCalibur", 19],
      ["hexaRagingBlow", 19],
      ["instinctualCombo", 19],
      ["spiritCalibur", 29],
      ["hexaRagingBlow", 29],
      ["instinctualCombo", 29],
      ["hexaRisingRage", 28],
    ],
  },
  lvlFoot:
    "Worldreaver stays Lv 1 — i-frame utility only. Verify order against the Hero Discord after each balance patch.",
  utility: [
    { label: "Bind", rows: [{ skill: "spiritCalibur", timing: "10s · 360s cd" }] },
    {
      label: "iFrames",
      rows: [
        { skill: "worldreaver", timing: "1.6s · 25s cd" },
        { skill: "blitzShield", timing: "up to 5s · 15s cd" },
        { skill: "spiritCalibur", timing: "during cast" },
      ],
    },
    {
      label: "Key cooldowns",
      rows: [
        { skill: "cryValhalla", timing: "30s · 120s cd" },
        { skill: "burningSoul", timing: "20s · 120s cd" },
        { skill: "instinctualCombo", timing: "20s · 120s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Per-orb amounts assume full Combo Orbs.",
    rows: [
      { stat: "Weapon multiplier", total: "1H 1.34× · 2H 1.44×", parts: [] },
      {
        stat: "Attack speed",
        total: "1H 8 · 2H 7",
        parts: [
          { skill: "weaponMastery", value: "+1" },
          { skill: "agileArms", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "90%",
        sub: "base +20%",
        parts: [{ skill: "advancedCombo", value: "+70%" }],
      },
      {
        stat: "STR",
        total: "+50 (80) · +15% AP",
        parts: [
          { skill: "agileArms", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "impenetrableSkin", value: "+30", cond: "temp" },
          { skill: "goddess", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +80 (154)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "spiritBlade", value: "+30" },
          { skill: "advFinalAttack", value: "+30" },
          { skill: "comboAttack", value: "+2", cond: "orb" },
          { skill: "ferocity", value: "+20" },
          { skill: "cryValhalla", value: "+50", cond: "temp" },
          { skill: "instinctualCombo", value: "+4", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40% (70%)",
        sub: "incl. +5% base",
        parts: [
          { skill: "weaponMastery", value: "+15%" },
          { skill: "chanceAttack", value: "+20%" },
          { skill: "cryValhalla", value: "+30%", cond: "temp" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+20%",
        parts: [{ skill: "enrage", value: "+20%" }],
      },
      {
        stat: "Damage",
        total: "+55–60%",
        parts: [
          { skill: "puncture4", value: "+25%" },
          { skill: "weaponMastery", value: "+5%", cond: "axe" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "goddess", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "+20% (24%)",
        parts: [
          { skill: "bossRush", value: "+2%", cond: "orb" },
          { skill: "instinctualCombo", value: "+4%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+202.5% (447%)",
        sub: "multiplicative chain",
        parts: [
          { skill: "weaponMastery", value: "×1.10" },
          { skill: "enrage", value: "×1.25" },
          { skill: "reinforce", value: "+12%", cond: "orb" },
          { skill: "swordIllusion", value: "+72–81%", cond: "temp" },
          { skill: "chanceAttack", value: "×1.25", cond: "debuff" },
          { skill: "weaponAura", value: "×1.06" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+50% (~58%)",
        parts: [
          { skill: "combatMastery", value: "+50%" },
          { skill: "weaponAura", value: "+16%" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [
      ["Demon Avenger", "+15% Damage"],
      ["Kanna", "+10% Damage"],
      ["Demon Slayer", "+15% Boss Damage"],
      ["Hayato", "+25 All Stats / +15% Dmg"],
      ["Ark", "+11% Damage"],
      ["Cadena", "+12% Damage"],
      ["Illium", "+12% Damage"],
      ["Adele", "+10% Boss / +4% Dmg"],
      ["Hoyoung", "+13% IED"],
      ["Luminous", "+15% IED"],
      ["Lara", "+11% Damage"],
      ["Kinesis", "+10% Crit Damage"],
    ],
    mobbing: [
      ["Kanna", "+10% Damage"],
      ["Demon Avenger", "+15% Damage"],
      ["Mercedes", "+EXP"],
      ["Aran", "+Combo EXP"],
      ["Evan", "+Rune duration"],
      ["Lara", "+11% Damage"],
    ],
  },
  resources: [
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Hero", kind: "wiki" },
    { label: "NamuWiki", url: "#", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
    { label: "Class Doc (buffhero.win)", url: "https://buffhero.win/", kind: "doc" },
  ],
};

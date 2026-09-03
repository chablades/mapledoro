import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Dark Knight config — reconciled from the draft dark-knight.config.ts onto the
  repo's ClassConfig shape (drops into ClassGuide.tsx with no JSX changes).
  Source: Grandis Library (GMS v266). Link pills + legion + summary come from the
  repo's authoritative classData.ts.

  Field provenance:
    - baseStats / weapons / legion / link / innerAbility — Grandis + classData. [OK]
    - sequence / hyperStats — reasoned from Grandis cooldown/buff data. [DRAFT]
    - innerAbility duplicated into bossing + mobbing (one draft list). [DRAFT]
    - skill iconIds — not yet resolved; omitted → letter fallback. Only the shared
      Invincible Belief link icon (0000252) is reused. [ICON TODO]
    - leveling (HEXA order) — no data yet → empty (renders "Coming soon"). [TODO]
    - recLinks — no source data → empty (renders "Coming soon"). [TODO]
    - description — written for this page. [DESIGN]
*/

export const darkKnight: ClassConfig = {
  name: "Dark Knight",
  branch: "Explorers",
  archetype: "Warrior",
  description:
    "A spear-and-polearm warrior who sacrifices HP for raw power — the deepest HP pool of any class, with Final Pact granting unmatched invincibility uptime.",
  portraitUrl: classPortraitUrl("Dark Knight"),
  accentColor: "#7d4fd6",
  facts: [
    { label: "Primary weapon", value: "Spear · Polearm" },
    { label: "Secondary", value: "Iron Chain" },
    { label: "Main stat", value: "STR · DEX" },
    { label: "Playstyle", value: "HP sacrifice · tanky" },
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
  legion: "Max HP +2 / 3 / 4 / 5 / 6%",
  weaponNote:
    "Spear and Polearm both apply a 1.49× multiplier. Polearm starts at a higher attack stage; Spear gains +1 attack speed and +5% damage from Weapon Mastery.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1 (AS10) / Boss Damage +20% (AS8)" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Boss Damage +10% / +21 ATT" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1 (AS10) / Boss Damage +20% (AS8)" },
      { tier: "unq", tag: "Unique", text: "Buff Duration +38%" },
      { tier: "epc", tag: "Epic", text: "Boss Damage +10% / +21 ATT" },
    ],
  },
  skills: {
    // ── Actives / buffs ──
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) STR window. 60s / 120s cd.",
    },
    epicAdventure: {
      name: "Epic Adventure",
      desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd.",
    },
    weaponAura: {
      name: "Weapon Aura",
      nodeType: "boost",
      desc: "+6% Final Damage and ×+16% Ignore DEF. 130s / 120s cd.",
    },
    darkResonance: {
      name: "Dark Resonance",
      desc: "+15% Boss Damage, +8% Final Damage, +30% / ×+10% Ignore DEF. 30s / 70s cd.",
    },
    finalPact: {
      name: "Final Pact",
      desc: "Lesser / Moderate / Greater i-frame contract — +crit, +crit damage, ×+30% Final Damage. The burst anchor.",
    },
    crossSurge: {
      name: "Cross Surge",
      desc: "+50% Final Damage passive ×+20% buff — converts HP into power. 200s.",
    },
    hyperBody: {
      name: "Hyper Body",
      desc: "Party-wide +Max HP/MP buff. 200s.",
    },
    darkThirst: {
      name: "Dark Thirst",
      desc: "+50 ATT. 20s / 60s cd.",
    },
    // ── Survivability ──
    deadSpace: {
      name: "Dead Space",
      nodeType: "mastery",
      desc: "10s bind + i-frame. 360s cd.",
    },
    darkHalidom: {
      name: "Dark Halidom",
      nodeType: "origin",
      desc: "HEXA origin skill. Inflicts Absolute Bind on cast.",
    },
    calamitousCyclone: {
      name: "Calamitous Cyclone",
      nodeType: "boost",
      desc: "−50% damage taken for up to 4s. 120s cd.",
    },
    // ── Passives (baseStats contributors) ──
    barricadeMastery: {
      name: "Barricade Mastery",
      nodeType: "boost",
      desc: "Core passive — +70% mastery, +15% crit damage, +30 ATT.",
    },
    lordOfDarkness: {
      name: "Lord of Darkness",
      desc: "Passive — +30% crit rate, +8% crit damage.",
    },
    hexEvilEye: {
      name: "Hex of the Evil Eye",
      desc: "Passive — +40 ATT, +10% crit rate.",
    },
    evilEyeReinforce: {
      name: "Evil Eye — Hex Reinforce",
      desc: "Hyper passive — +30 ATT.",
    },
    agileArms: {
      name: "Agile Arms",
      desc: "2nd job passive — +2 attack speed, +20 STR.",
    },
    weaponMastery: {
      name: "Weapon Mastery",
      desc: "2nd job passive — weapon mastery and +1 attack speed.",
    },
    physicalTraining: {
      name: "Physical Training",
      desc: "2nd job passive — +30 STR.",
    },
    impenetrableSkin: {
      name: "Impenetrable Skin",
      desc: "Passive — +30 STR and a barrier.",
    },
    mapleWarrior: {
      name: "Maple Warrior",
      desc: "4th job buff — +STR to assigned AP. Effectively permanent.",
    },
    herosEcho: {
      name: "Hero's Echo",
      desc: "Beginner skill — +4% ATT for 40 min.",
    },
  },
  sequence: [
    { skill: "crossSurge" },
    { skill: "hyperBody" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "darkThirst" },
    { skill: "weaponAura" },
    { skill: "darkResonance" },
    { skill: "finalPact" },
    { skill: "deadSpace" },
    { skill: "darkHalidom" },
  ],
  seqNote:
    "Cast left to right to stack buffs into the Final Pact (Greater) burst window, then chain Dead Space → Dark Halidom for binds. Draft order — confirm with the Dark Knight Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Binds",
      rows: [
        { skill: "deadSpace", timing: "10s · 360s cd" },
        { skill: "darkHalidom", timing: "Absolute Bind" },
      ],
    },
    {
      label: "iFrames & defense",
      rows: [
        { skill: "finalPact", timing: "up to 40s i-frame" },
        { skill: "calamitousCyclone", timing: "up to 4s · 120s cd" },
      ],
    },
    {
      label: "Sustain & party",
      rows: [
        { skill: "hyperBody", timing: "+HP/MP · 200s" },
        { skill: "crossSurge", timing: "HP → damage · 200s" },
      ],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value.",
    rows: [
      { stat: "Weapon multiplier", total: "1.49×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 5 Polearm · Stage 4 Spear",
        parts: [
          { skill: "agileArms", value: "+2" },
          { skill: "weaponMastery", value: "+1" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "91–94%",
        sub: "base +20%",
        parts: [{ skill: "barricadeMastery", value: "+70%" }],
      },
      {
        stat: "STR",
        total: "+50 (80) · +15% AP",
        parts: [
          { skill: "agileArms", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "impenetrableSkin", value: "+30" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+4% · +100 (150)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "hexEvilEye", value: "+40" },
          { skill: "barricadeMastery", value: "+30" },
          { skill: "evilEyeReinforce", value: "+30" },
          { skill: "darkThirst", value: "+50", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+75%",
        sub: "incl. +5% base",
        parts: [
          { skill: "hexEvilEye", value: "+10%" },
          { skill: "lordOfDarkness", value: "+30%" },
          { skill: "finalPact", value: "+10%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+38%",
        parts: [
          { skill: "lordOfDarkness", value: "+8%" },
          { skill: "barricadeMastery", value: "+15%" },
          { skill: "finalPact", value: "+15%" },
        ],
      },
      {
        stat: "Damage",
        total: "(+30–35%)",
        parts: [
          { skill: "weaponMastery", value: "+5%" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "(+15%)",
        parts: [{ skill: "darkResonance", value: "+15%", cond: "temp" }],
      },
      {
        stat: "Final damage",
        total: "+134% (178.19%)",
        parts: [
          { skill: "crossSurge", value: "+50% / +20%" },
          { skill: "finalPact", value: "×+30%" },
          { skill: "darkResonance", value: "×+8%" },
          { skill: "weaponAura", value: "×+6%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+30% (47.08%)",
        parts: [
          { skill: "darkResonance", value: "+30% / ×+10%" },
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
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/dark-knight", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Dark_Knight", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

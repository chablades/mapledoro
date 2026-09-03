import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Bishop config — reconciled from bishop.config.ts onto the repo ClassConfig shape.
  Source: Grandis Library (GMS v266); link + legion + name from classData.ts. The
  premier party-support mage; baseStats add Magic Attack / Ignore Elemental
  Resistance / Buff Duration rows. [OK] base data · [DRAFT] sequence · [ICON] icons
  omitted · [DESIGN] description. innerAbility duplicated to both columns.
*/

export const bishop: ClassConfig = {
  name: "Bishop",
  branch: "Explorers",
  archetype: "Magician",
  description:
    "The premier party-support mage — party revive, lethal-hit blocks, status immunity, and stat buffs, paired with a Benevolence/Vengeance burst built around Angel Ray and Genesis.",
  portraitUrl: classPortraitUrl("Bishop"),
  accentColor: "#e6b93f",
  facts: [
    { label: "Primary weapon", value: "Wand · Staff" },
    { label: "Secondary", value: "Shield · Magic Book" },
    { label: "Main stat", value: "INT · LUK" },
    { label: "Playstyle", value: "Support · burst" },
  ],
  linkSkill: {
    name: "Empirical Knowledge",
    desc: "31% on hit to mark the highest-HP enemy — +5% Damage & +5% Ignore DEF per stack (×3, 10s).",
    pills: [["Lv9", "31% on hit", "+5%/stack"]],
    note: "Stacks ×3, one per Explorer Mage at master level.",
  },
  legion: "INT +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Wand or Staff applies a 1.2× multiplier (attack Stage 7 with MP Boost + Agile Magic). A Wand adds +5% crit rate.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1" },
      { tier: "unq", tag: "Unique", text: "Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Attack Speed +1" },
      { tier: "unq", tag: "Unique", text: "Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Buffs / mode ──
    righteouslyIndignant: {
      name: "Righteously Indignant",
      desc: "Mode switch Benevolence ↔ Vengeance. Passive — +50 MATT, ×+30% FD, ×+20% Ignore DEF, +10% ignore elem resist.",
    },
    manaOverload: { name: "Mana Overload", nodeType: "boost", desc: "Toggle — ×+8% Final Damage. 30s cd." },
    advancedBlessing: { name: "Advanced Blessing", desc: "Party MATT buff (+30 MATT, +20 self). 240s." },
    advBlessingFerocity: { name: "Advanced Blessing — Ferocity", desc: "Hyper passive — +20 ATT." },
    advBlessingBossRush: { name: "Advanced Blessing — Boss Rush", desc: "Hyper passive — +10% Boss Damage." },
    holySymbol: { name: "Holy Symbol", desc: "Party EXP / item-drop buff. 240s." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) INT window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    benediction: { name: "Benediction", nodeType: "boost", desc: "×+33% Final Damage buff (scales with 6th job). 30s / 120s cd — burst anchor." },
    bloodOfTheDivine: { name: "Blood of the Divine", nodeType: "boost", desc: "×+8% Final Damage self-buff (Vengeance). 10s / 120s cd." },
    infinity: { name: "Infinity", desc: "×+91% Final Damage ramping buff." },
    blessedHarmony: { name: "Blessed Harmony", desc: "Passive — +10% Final Damage." },
    // ── Attacks / summons ──
    angelRay: { name: "Angel Ray", desc: "Main attack + party heal-on-hit." },
    bahamut: { name: "Bahamut", nodeType: "boost", desc: "Summon. 600s." },
    angelOfBalance: { name: "Angel of Balance", nodeType: "boost", desc: "Summon — +100% Damage (Vengeance) / ×+10% FD holy (Benevolence). 30s / 120s cd." },
    peacemaker: { name: "Peacemaker", nodeType: "boost", desc: "+23% Damage (Holy Light); burst line." },
    holyAdvent: { name: "Holy Advent", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame, ×+5% FD. 360s cd." },
    // ── Party support ──
    heavensDoor: { name: "Heaven's Door", desc: "Party buff — blocks one lethal hit. 60s cd, 600s lockout." },
    resurrection: { name: "Resurrection", desc: "Revive party members; grants self +Damage after revive." },
    holyMagicShell: { name: "Holy Magic Shell", desc: "Party guard shell — 15s / 15 hits, −10% damage taken. 90s cd." },
    divineProtection: { name: "Divine Protection", desc: "Blocks up to 5 critical abnormal statuses. 80s cd." },
    // ── Passives (baseStats contributors) ──
    holyFocus: { name: "Holy Focus", desc: "Passive — +70% mastery, +40% crit rate." },
    arcaneOverdrive: { name: "Arcane Overdrive", desc: "Passive — +30% crit rate, +16% crit damage." },
    arcaneAim: { name: "Arcane Aim", desc: "Passive — +8% Damage per hit (max +40%), +20% Ignore DEF." },
    arcaneOverdrive5: { name: "Arcane Overdrive (5th)", nodeType: "boost", desc: "×+21% Final Damage (−7% every 10s)." },
    buffMastery: { name: "Buff Mastery", desc: "+30 MATT, ×+11% Final Damage, +50% buff duration." },
    angelicWrath: { name: "Angelic Wrath", desc: "×+44% Ignore DEF passive (Vengeance form of Heal)." },
    empiricalKnowledge: { name: "Empirical Knowledge", desc: "Explorer Mage link — +5% Damage & +5% Ignore DEF per stack (×3)." },
    agileMagic: { name: "Agile Magic", desc: "2nd job passive — +2 attack speed, +20 INT." },
    mpBoost: { name: "MP Boost", desc: "1st job passive — +1 attack speed; +5% crit rate with a Wand." },
    highWisdom: { name: "High Wisdom", desc: "Passive — +40 INT." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +INT to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
    spellMastery: { name: "Spell Mastery", desc: "Passive — spell mastery, +10 MATT, +5% crit rate." },
  },
  sequence: [
    { skill: "righteouslyIndignant" },
    { skill: "manaOverload" },
    { skill: "advancedBlessing" },
    { skill: "holySymbol" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "benediction" },
    { skill: "bahamut" },
    { skill: "angelOfBalance" },
    { skill: "bloodOfTheDivine" },
    { skill: "holyAdvent" },
    { skill: "angelRay" },
  ],
  seqNote:
    "Switch to Vengeance, stack buffs and summons, then burst Angel Ray / Genesis inside the Holy Advent window. Draft order — confirm with the Explorer Mage Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Party survival",
      rows: [
        { skill: "heavensDoor", timing: "block lethal · 60s cd" },
        { skill: "holyMagicShell", timing: "15s / 15 hits · 90s cd" },
        { skill: "divineProtection", timing: "status immunity · 80s cd" },
      ],
    },
    {
      label: "Party support",
      rows: [
        { skill: "resurrection", timing: "party revive" },
        { skill: "holySymbol", timing: "EXP / drop · 240s" },
        { skill: "advancedBlessing", timing: "party MATT · 240s" },
      ],
    },
    {
      label: "Binds",
      rows: [{ skill: "holyAdvent", timing: "10s · 360s cd" }],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. 6th-job scaling shown where noted.",
    rows: [
      { stat: "Weapon multiplier", total: "1.2×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 4",
        parts: [
          { skill: "mpBoost", value: "+1" },
          { skill: "agileMagic", value: "+2" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "95%",
        sub: "base +25%",
        parts: [{ skill: "holyFocus", value: "+70%" }],
      },
      {
        stat: "INT",
        total: "+60 · +15% AP",
        sub: "+3–90 more from 6th job",
        parts: [
          { skill: "agileMagic", value: "+20" },
          { skill: "highWisdom", value: "+40" },
          { skill: "benediction", value: "+3–90" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
        ],
      },
      {
        stat: "Magic attack",
        total: "+4% · +120 (140)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "advancedBlessing", value: "+30" },
          { skill: "spellMastery", value: "+10" },
          { skill: "buffMastery", value: "+30" },
          { skill: "righteouslyIndignant", value: "+50" },
          { skill: "advBlessingFerocity", value: "+20" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+75% (80%)",
        sub: "incl. +5% base",
        parts: [
          { skill: "arcaneOverdrive", value: "+30%" },
          { skill: "holyFocus", value: "+40%" },
          { skill: "mpBoost", value: "+5%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+16%",
        parts: [{ skill: "arcaneOverdrive", value: "+16%" }],
      },
      {
        stat: "Damage",
        total: "+40% (207%)",
        parts: [
          { skill: "arcaneAim", value: "max +40%" },
          { skill: "empiricalKnowledge", value: "max +9%" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "angelOfBalance", value: "+100%", cond: "temp" },
          { skill: "peacemaker", value: "+23%", cond: "temp" },
          { skill: "resurrection", value: "max +25%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Boss damage",
        total: "(+10%)",
        parts: [{ skill: "advBlessingBossRush", value: "+10%", cond: "temp" }],
      },
      {
        stat: "Final damage",
        total: "+227.43% (557.73%)",
        parts: [
          { skill: "blessedHarmony", value: "+10%" },
          { skill: "infinity", value: "×+91%" },
          { skill: "buffMastery", value: "×+11%" },
          { skill: "righteouslyIndignant", value: "×+30%" },
          { skill: "angelOfBalance", value: "×+10% holy" },
          { skill: "bloodOfTheDivine", value: "×+8%" },
          { skill: "holyAdvent", value: "×+5%" },
          { skill: "benediction", value: "×+33%" },
          { skill: "manaOverload", value: "×+8%" },
          { skill: "arcaneOverdrive5", value: "×+21%" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+67.39%",
        parts: [
          { skill: "arcaneAim", value: "+20%" },
          { skill: "righteouslyIndignant", value: "×+20%" },
          { skill: "angelicWrath", value: "×+44%" },
          { skill: "empiricalKnowledge", value: "max +9%", cond: "debuff" },
        ],
      },
      {
        stat: "Ignore elemental resist",
        total: "+10%",
        parts: [{ skill: "righteouslyIndignant", value: "+10%" }],
      },
      {
        stat: "Buff duration",
        total: "+50%",
        parts: [{ skill: "buffMastery", value: "+50%" }],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/bishop", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Bishop", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

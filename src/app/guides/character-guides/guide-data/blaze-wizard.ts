import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Blaze Wizard config — reconciled from blaze-wizard.config.ts onto the repo
  ClassConfig shape. Source: Grandis Library (GMS v266); link + legion + name from
  classData.ts. HEAVY [DRAFT]: a KMST April-2025 rework is pending and not live in GMS
  v266 — verify the whole kit against the Blaze Wizard Discord. Mage baseStats add a
  Magic Attack row. The Ascent node (Flame Concerto) is omitted (not referenced).
  [ICON] icons omitted · [DESIGN] description. innerAbility duplicated to both columns.
*/

export const blazeWizard: ClassConfig = {
  name: "Blaze Wizard",
  branch: "Cygnus Knights",
  archetype: "Magician",
  description:
    "A mobile flame-juggler who flings Orbital Flames and toggles Lion / Fox mode — most of its damage comes from the Burning Conduit field. A KMST rework is pending, so treat the kit as draft.",
  portraitUrl: classPortraitUrl("Blaze Wizard"),
  accentColor: "#e34a2c",
  facts: [
    { label: "Primary weapon", value: "Wand · Staff" },
    { label: "Secondary", value: "Shield · Jewel" },
    { label: "Main stat", value: "INT · LUK" },
    { label: "Playstyle", value: "Orbital flames · juggle" },
  ],
  linkSkill: {
    name: "Cygnus Blessing",
    desc: "+ATT & MATT, +Status Resistance, +Elemental Resistance.",
    pills: [
      ["Lv5", "+15 MATT", "+7% ER"],
      ["Lv15", "+35 MATT", "+22% ER"],
    ],
    note: "Stacks ×5, once per Cygnus Knight — excluding Mihile.",
  },
  legion: "INT +10 / 20 / 40 / 80 / 100",
  weaponNote:
    "Wand or Staff applies a 1.2× multiplier (attack Stage 7, 8 inside Burning Conduit). Burning Conduit (+60% Damage) is the core damage source. KMST rework pending — verify numbers.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Passive Skills +1" },
      { tier: "unq", tag: "Unique", text: "Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Passive Skills +1" },
      { tier: "unq", tag: "Unique", text: "Boss Damage +10%" },
      { tier: "epc", tag: "Epic", text: "Damage to enemies w/ Abnormal Status +8%" },
    ],
  },
  skills: {
    // ── Toggles / buffs ──
    firesOfCreation: { name: "Fires of Creation", desc: "Toggle Lion / Fox mode; grants +30% Ignore DEF." },
    manaOverload: { name: "Mana Overload", desc: "Toggle — ×+8% Final Damage (drains MP). 30s cd." },
    orbitalFlameRange: { name: "Orbital Flame - Range", desc: "Toggle that extends Orbital Flame range / behavior." },
    salamanderMischief: { name: "Salamander Mischief", nodeType: "boost", desc: "Summon + up to +105 MATT buff. 40s / 60s cd." },
    gloryOfTheGuardians: { name: "Glory of the Guardians", desc: "+10% Damage buff. 60s / 120s cd." },
    empressCygnusBlessing: { name: "Empress Cygnus's Blessing", desc: "Buff. 45s / 120s cd." },
    transcendentCygnusBlessing: { name: "Transcendent Cygnus's Blessing", nodeType: "boost", desc: "+72% Damage; −5% damage taken. 45s / 120s cd." },
    burningConduit: { name: "Burning Conduit", desc: "Placeable — +60% Damage to attacks inside. 40s / 40–60s cd. The core damage source." },
    // ── Attacks / summons ──
    orbitalFlame: { name: "Orbital Flame", desc: "Signature attack — orbiting flames sent directionally." },
    orbitalExplosion: { name: "Orbital Explosion", desc: "Detonates orbiting flames." },
    phoenixDrive: { name: "Phoenix Drive", desc: "Hyper phoenix summon burst. 20s / 120s cd." },
    cataclysm: { name: "Cataclysm", desc: "Hyper burst + i-frame. 100s cd." },
    cinderMaelstrom: { name: "Cinder Maelstrom", desc: "10s bind. 120s cd." },
    eternity: { name: "Eternity", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── Survivability ──
    phoenixRun: { name: "Phoenix Run", desc: "Revive + 3s i-frame. 1800s cd." },
    infernoSphere: { name: "Inferno Sphere", nodeType: "boost", desc: "Burst; −50% damage taken up to 5s. 120s cd." },
    etherealForm: { name: "Ethereal Form", nodeType: "boost", desc: "3s i-frame. 60s cd." },
    flameBarrier: { name: "Flame Barrier", desc: "Blocks up to 10 Critical abnormal statuses. 15s. 120s cd." },
    // ── Passives (baseStats contributors) ──
    pureMagic: { name: "Pure Magic", nodeType: "boost", desc: "Passive — +70% mastery, ×+50% FD, +40 MATT." },
    burningFocus: { name: "Burning Focus", desc: "Passive — +30% crit rate, +20% crit damage, ×+8% FD." },
    liberatedMagic: { name: "Liberated Magic", desc: "×+25% Final Damage passive." },
    finalFlameElemental: { name: "Final Flame Elemental", desc: "Passive — +3% MATT, +40 MATT." },
    callOfCygnus: { name: "Call of Cygnus", desc: "+15% assigned-AP INT passive." },
    wordOfFire: { name: "Word of Fire", desc: "Passive — +2 attack speed, +20 MATT, +5% crit rate." },
    spellControl: { name: "Spell Control", desc: "Passive — +1 attack speed, +10 MATT." },
    brilliantEnlightenment: { name: "Brilliant Enlightenment", desc: "Passive — +60 INT." },
    elementalHarmony: { name: "Elemental Harmony", desc: "Passive — +1 INT per 2 levels." },
    elementalExpert: { name: "Elemental Expert", desc: "Passive — +10% ATT." },
    naturalTalent: { name: "Natural Talent", desc: "Passive — +5% crit rate with a Wand." },
    cygnusBlessing: { name: "Cygnus Blessing", desc: "Cygnus Knights link — +35 ATT & MATT." },
    herosEcho: { name: "Hero's Echo", desc: "+4% ATT party buff. 2400s / 300s cd." },
  },
  sequence: [
    { skill: "firesOfCreation" },
    { skill: "manaOverload" },
    { skill: "orbitalFlameRange" },
    { skill: "salamanderMischief" },
    { skill: "gloryOfTheGuardians" },
    { skill: "empressCygnusBlessing" },
    { skill: "transcendentCygnusBlessing", cd: "2 min" },
    { skill: "burningConduit" },
    { skill: "phoenixDrive" },
    { skill: "cataclysm" },
    { skill: "cinderMaelstrom" },
    { skill: "eternity" },
    { skill: "orbitalFlame" },
  ],
  seqNote:
    "Set your toggles and the Burning Conduit, stack buffs, then bind with Eternity and juggle Orbital Flame / Blazing Extinction. Pending KMST rework — verify with the Blaze Wizard Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Flame juggling",
      rows: [
        { skill: "orbitalFlame", timing: "directional flames" },
        { skill: "orbitalExplosion", timing: "detonate" },
      ],
    },
    {
      label: "iFrames & defense",
      rows: [
        { skill: "phoenixRun", timing: "revive · 3s · 1800s cd" },
        { skill: "infernoSphere", timing: "−50% · 5s · 120s cd" },
        { skill: "etherealForm", timing: "3s · 60s cd" },
      ],
    },
    {
      label: "Status & binds",
      rows: [
        { skill: "flameBarrier", timing: "block status · 15s · 120s cd" },
        { skill: "cinderMaelstrom", timing: "10s · 120s cd" },
        { skill: "eternity", timing: "10s · 360s cd" },
      ],
    },
  ],
  baseStats: {
    note: "Pending KMST rework — treat values as [DRAFT]. Totals count near-permanent sources; (parens) include temporary buffs at full value.",
    rows: [
      { stat: "Weapon multiplier", total: "1.2×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7 (8)",
        sub: "base Stage 4",
        parts: [
          { skill: "wordOfFire", value: "+2" },
          { skill: "spellControl", value: "+1" },
          { skill: "burningConduit", value: "+1" },
        ],
      },
      {
        stat: "Weapon mastery",
        total: "95%",
        sub: "base +25%",
        parts: [{ skill: "pureMagic", value: "+70%" }],
      },
      {
        stat: "INT",
        total: "+60 · +15% AP",
        sub: "+1 per 2 levels",
        parts: [
          { skill: "brilliantEnlightenment", value: "+60" },
          { skill: "elementalHarmony", value: "+1/2 lvls" },
          { skill: "callOfCygnus", value: "+15% AP" },
        ],
      },
      {
        stat: "Magic attack",
        total: "+17% · +135 (240)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "elementalExpert", value: "+10%" },
          { skill: "finalFlameElemental", value: "+3%" },
          { skill: "cygnusBlessing", value: "+25" },
          { skill: "wordOfFire", value: "+20" },
          { skill: "spellControl", value: "+10" },
          { skill: "finalFlameElemental", value: "+40" },
          { skill: "pureMagic", value: "+40" },
          { skill: "salamanderMischief", value: "+105", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+40% (45%)",
        sub: "incl. +5% base",
        parts: [
          { skill: "wordOfFire", value: "+5%" },
          { skill: "burningFocus", value: "+30%" },
          { skill: "naturalTalent", value: "+5%" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+20%",
        parts: [{ skill: "burningFocus", value: "+20%" }],
      },
      {
        stat: "Damage",
        total: "+0% (142%)",
        parts: [
          { skill: "gloryOfTheGuardians", value: "+10%", cond: "temp" },
          { skill: "burningConduit", value: "+60% field", cond: "temp" },
          { skill: "transcendentCygnusBlessing", value: "+72%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+102.5% (118.7%)",
        parts: [
          { skill: "liberatedMagic", value: "×+25%" },
          { skill: "burningFocus", value: "×+8%" },
          { skill: "pureMagic", value: "×+50%" },
          { skill: "manaOverload", value: "×+8%", cond: "temp" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+30%",
        parts: [{ skill: "firesOfCreation", value: "+30%" }],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/cygnus-knights/blaze-wizard", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Blaze_Wizard", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

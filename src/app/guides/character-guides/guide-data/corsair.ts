import type { ClassConfig } from "../guide-types";
import { classPortraitUrl } from "../../../../lib/classPortraits";

/*
  Corsair config — reconciled from corsair.config.ts onto the repo ClassConfig shape.
  Source: Grandis Library (GMS v266); link + legion + name from classData.ts. Summon-
  stacking gunner (hence the %Summon Duration legion). [OK] base data · [DRAFT]
  sequence · [ICON] icons omitted · [DESIGN] description. innerAbility duplicated to
  both columns.
*/

export const corsair: ClassConfig = {
  name: "Corsair",
  branch: "Explorers",
  archetype: "Pirate",
  description:
    "A summon-stacking gunslinger who layers crew, ships, and bombers, then channels Rapid Fire over the top — mobile, with several i-frame burst skills.",
  portraitUrl: classPortraitUrl("Corsair"),
  accentColor: "#b5544a",
  facts: [
    { label: "Primary weapon", value: "Gun" },
    { label: "Secondary", value: "Far Sight" },
    { label: "Main stat", value: "DEX · STR" },
    { label: "Playstyle", value: "Summon stack · channel" },
  ],
  linkSkill: {
    name: "Pirate's Blessing",
    desc: "+All Stat, +Max HP/MP, −Damage Taken. Toggle swaps equip STR ↔ DEX.",
    pills: [
      ["Lv6", "+70 stat", "−15%"],
      ["Lv9", "+100 stat", "−21%"],
    ],
    note: "Stacks ×3, one per Explorer Pirate at master level.",
  },
  legion: "Summon Duration +4 / 6 / 8 / 10 / 12%",
  weaponNote:
    "Gun + Far Sight applies a 1.5× multiplier (attack Stage 7). Uses Bullets for ammo. Weapon Mastery caps at 85%.",
  innerAbility: {
    bossing: [
      { tier: "leg", tag: "Legendary", text: "Number of enemies hit +1" },
      { tier: "unq", tag: "Unique", text: "Chance to Skip Cooldown +10%" },
      { tier: "epc", tag: "Epic", text: "Boss Damage +10%" },
    ],
    mobbing: [
      { tier: "leg", tag: "Legendary", text: "Number of enemies hit +1" },
      { tier: "unq", tag: "Unique", text: "Chance to Skip Cooldown +10%" },
      { tier: "epc", tag: "Epic", text: "Boss Damage +10%" },
    ],
  },
  skills: {
    // ── Buffs ──
    jollyRoger: { name: "Jolly Roger", desc: "+20% ATT buff. 180s." },
    whalersPotion: { name: "Whaler's Potion", desc: "Buff. 20s / 60s cd." },
    goddessBlessing: {
      name: "Maple World Goddess's Blessing",
      nodeType: "boost",
      desc: "+20% Damage and a +400% (assigned-AP) DEX window. 60s / 120s cd.",
    },
    epicAdventure: { name: "Epic Adventure", desc: "Explorer hyper buff — +10% Damage. 60s / 120s cd." },
    piratesBanner: { name: "Pirate's Banner", nodeType: "boost", desc: "+25% (AP) DEX, ×+25% Ignore DEF placeable. 30s." },
    overdrive: { name: "Overdrive", nodeType: "boost", desc: "+ATT (% of base weapon power). 28s / 60s cd." },
    // ── Attacks / summons ──
    rapidFire: { name: "Rapid Fire", desc: "Main bossing channel — sustained gunfire." },
    scurvySummons: { name: "Scurvy Summons", nodeType: "boost", desc: "Summons crew (powers Ahoy Mateys). 120s / 45s cd." },
    siegeBomber: { name: "Siege Bomber", nodeType: "boost", desc: "Placeable bomber summon. 60s." },
    broadside: { name: "Broadside", nodeType: "boost", desc: "Ship-broadside summon (Tempest Bombardment toggle). 60s." },
    eightLegsEaston: { name: "Eight-Legs Easton", desc: "Octopus summon." },
    nautilusAssault: { name: "Nautilus Assault", nodeType: "boost", desc: "Ship summon burst + i-frame. 120s cd." },
    theDreadnought: { name: "The Dreadnought", nodeType: "origin", desc: "HEXA origin — 10s bind + i-frame. 360s cd." },
    // ── iFrames / burst ──
    targetLock: { name: "Target Lock", nodeType: "boost", desc: "Lock-on burst + i-frame. 30s cd." },
    bulletBarrage: { name: "Bullet Barrage", nodeType: "boost", desc: "Burst; −50% damage taken up to 3s. 60s cd." },
    // ── Passives (baseStats contributors) ──
    majesticPresence: { name: "Majestic Presence", nodeType: "boost", desc: "Passive — +70% mastery, +30 ATT, ×+8% FD." },
    ahoyMateys: { name: "Ahoy Mateys", desc: "Crew buff — +45 ATT, +10% crit, +25–30% crit damage while summoned." },
    parrotargetting: { name: "Parrotargetting", desc: "Passive — +20% crit damage, ×+25% FD." },
    aggressiveStance: { name: "Aggressive Stance", desc: "+15% Damage passive." },
    fullmetalJacket: { name: "Fullmetal Jacket", desc: "Passive — +30% crit rate, ×+20% FD, +20% Ignore DEF." },
    shadowHeart: { name: "Shadow Heart", desc: "Passive — +20% crit rate, +5% crit damage." },
    infinityBlast: { name: "Infinity Blast", desc: "Passive — +10 ATT." },
    crossCutBlast: { name: "Cross Cut Blast", desc: "Passive — +60 ATT." },
    gunMastery: { name: "Gun Mastery", desc: "Passive — +10% crit rate." },
    loadedDice: { name: "Loaded Dice", desc: "Gambling buff — +40 ATT." },
    piratesBlessing: { name: "Pirate's Blessing", desc: "Explorer Pirate link — +100 all stats, −21% damage taken." },
    agileGuns: { name: "Agile Guns", desc: "2nd job passive — +2 attack speed, +20 DEX." },
    physicalTraining: { name: "Physical Training", desc: "2nd job passive — +30 DEX / STR." },
    mapleWarrior: { name: "Maple Warrior", desc: "4th job buff — +DEX to assigned AP. Effectively permanent." },
    herosEcho: { name: "Hero's Echo", desc: "Beginner skill — +4% ATT for 40 min." },
  },
  sequence: [
    { skill: "jollyRoger" },
    { skill: "whalersPotion" },
    { skill: "goddessBlessing", cd: "2 min" },
    { skill: "epicAdventure" },
    { skill: "piratesBanner" },
    { skill: "overdrive" },
    { skill: "scurvySummons" },
    { skill: "siegeBomber" },
    { skill: "broadside" },
    { skill: "eightLegsEaston" },
    { skill: "nautilusAssault" },
    { skill: "theDreadnought" },
    { skill: "rapidFire" },
  ],
  seqNote:
    "Stack buffs, deploy every summon, then bind with The Dreadnought and channel Rapid Fire (Brain Scrambler on cooldown). Draft order — confirm with the Corsair Discord.",
  leveling: {
    heroic: [],
    interactive: [],
  },
  utility: [
    {
      label: "Summons",
      rows: [
        { skill: "scurvySummons", timing: "crew · 45s cd" },
        { skill: "siegeBomber", timing: "bomber · 60s" },
        { skill: "broadside", timing: "ship · 60s" },
      ],
    },
    {
      label: "iFrames & burst",
      rows: [
        { skill: "targetLock", timing: "i-frame · 30s cd" },
        { skill: "nautilusAssault", timing: "i-frame · 120s cd" },
        { skill: "bulletBarrage", timing: "−50% taken · 3s · 60s cd" },
      ],
    },
    {
      label: "Binds",
      rows: [{ skill: "theDreadnought", timing: "10s · 360s cd" }],
    },
  ],
  baseStats: {
    note: "Totals count near-permanent sources. Values in (parens) include temporary buffs at full value. Pirate's Blessing also grants −21% damage taken.",
    rows: [
      { stat: "Weapon multiplier", total: "1.5×", parts: [] },
      {
        stat: "Attack speed",
        total: "Stage 7",
        sub: "base Stage 5",
        parts: [{ skill: "agileGuns", value: "+2" }],
      },
      {
        stat: "Weapon mastery",
        total: "85%",
        sub: "base +15%",
        parts: [{ skill: "majesticPresence", value: "+70%" }],
      },
      {
        stat: "DEX",
        total: "+120 · +15% AP",
        parts: [
          { skill: "piratesBlessing", value: "+70" },
          { skill: "agileGuns", value: "+20" },
          { skill: "physicalTraining", value: "+30" },
          { skill: "mapleWarrior", value: "+15% AP" },
          { skill: "goddessBlessing", value: "+400% AP", cond: "temp" },
          { skill: "piratesBanner", value: "+25% AP", cond: "temp" },
        ],
      },
      {
        stat: "Attack",
        total: "+24% · +100 (185)",
        parts: [
          { skill: "herosEcho", value: "+4%" },
          { skill: "jollyRoger", value: "+20%" },
          { skill: "infinityBlast", value: "+10" },
          { skill: "crossCutBlast", value: "+60" },
          { skill: "majesticPresence", value: "+30" },
          { skill: "ahoyMateys", value: "+45", cond: "temp" },
          { skill: "loadedDice", value: "+40", cond: "temp" },
          { skill: "overdrive", value: "+80% base ATT", cond: "temp" },
        ],
      },
      {
        stat: "Crit rate",
        total: "+65% (75%)",
        sub: "incl. +5% base",
        parts: [
          { skill: "shadowHeart", value: "+20%" },
          { skill: "gunMastery", value: "+10%" },
          { skill: "fullmetalJacket", value: "+30%" },
          { skill: "ahoyMateys", value: "+10%", cond: "temp" },
        ],
      },
      {
        stat: "Crit damage",
        total: "+50% (55%)",
        parts: [
          { skill: "shadowHeart", value: "+5%" },
          { skill: "parrotargetting", value: "+20%" },
          { skill: "ahoyMateys", value: "+25%", cond: "temp" },
        ],
      },
      {
        stat: "Damage",
        total: "+15% (45%)",
        parts: [
          { skill: "aggressiveStance", value: "+15%" },
          { skill: "epicAdventure", value: "+10%", cond: "temp" },
          { skill: "goddessBlessing", value: "+20%", cond: "temp" },
        ],
      },
      {
        stat: "Final damage",
        total: "+62%",
        parts: [
          { skill: "fullmetalJacket", value: "×+20%" },
          { skill: "parrotargetting", value: "×+25%" },
          { skill: "majesticPresence", value: "×+8%" },
        ],
      },
      {
        stat: "Ignore DEF",
        total: "+20% (40%)",
        parts: [
          { skill: "fullmetalJacket", value: "+20%" },
          { skill: "piratesBanner", value: "×+25%", cond: "temp" },
        ],
      },
    ],
  },
  recLinks: {
    bossing: [],
    mobbing: [],
  },
  resources: [
    { label: "Grandis Library", url: "https://grandislibrary.com/explorers/corsair", kind: "doc" },
    { label: "MapleStory Wiki", url: "https://maplestorywiki.net/w/Corsair", kind: "wiki" },
    { label: "Class Discord", url: "#", kind: "disc" },
  ],
};

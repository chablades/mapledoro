const CDN = "https://media.maplestorywiki.net/yetidb";

/* ------------------------------------------------------------------ */
/*  Star Force Research — Whisper Crystals                             */
/* ------------------------------------------------------------------ */

export interface WhisperBoss {
  id: string;
  name: string;
  frequency: "weekly" | "monthly";
}

export const PITCHED_WHISPER_BOSSES: WhisperBoss[] = [
  { id: "lotus", name: "Hard / Extreme Lotus", frequency: "weekly" },
  { id: "damien", name: "Hard Damien", frequency: "weekly" },
  { id: "lucid", name: "Hard Lucid", frequency: "weekly" },
  { id: "will", name: "Hard Will", frequency: "weekly" },
  { id: "gloom", name: "Chaos Gloom", frequency: "weekly" },
  { id: "vhilla", name: "Hard Verus Hilla", frequency: "weekly" },
  { id: "darknell", name: "Hard Darknell", frequency: "weekly" },
  { id: "seren", name: "Hard / Extreme Seren", frequency: "weekly" },
  { id: "bm", name: "Hard / Extreme Black Mage", frequency: "monthly" },
];

interface PitchedTarget {
  id: string;
  name: string;
  cost: number;
}

export const PITCHED_TARGETS: PitchedTarget[] = [
  { id: "pitched-set", name: "Pitched Boss Set Equipment", cost: 130 },
  { id: "mitras-rage", name: "Mitra's Rage Selection Box", cost: 260 },
  { id: "genesis-badge", name: "Genesis Badge", cost: 390 },
];

export const DAWN_WHISPER_BOSSES: WhisperBoss[] = [
  { id: "gas", name: "Normal / Chaos Guardian Angel Slime", frequency: "weekly" },
  { id: "lucid", name: "Normal / Hard Lucid", frequency: "weekly" },
  { id: "will", name: "Normal / Hard Will", frequency: "weekly" },
  { id: "gloom", name: "Normal / Chaos Gloom", frequency: "weekly" },
  { id: "vhilla", name: "Normal / Hard Verus Hilla", frequency: "weekly" },
  { id: "darknell", name: "Normal / Hard Darknell", frequency: "weekly" },
  { id: "seren", name: "Normal / Hard / Extreme Seren", frequency: "weekly" },
];

export const DAWN_TARGET_COST = 65;

export const PITCHED_CRYSTAL_ITEM_ID = "04001956"; // Pitched Whisper Crystal
export const DAWN_CRYSTAL_ITEM_ID = "04001955"; // Dawn Whisper Crystal

/* ------------------------------------------------------------------ */
/*  Trace Restoration — Missions & Points                             */
/* ------------------------------------------------------------------ */

interface TraceItem {
  id: string;
  name: string;
  points: number;
}

export const TRACE_ITEMS: TraceItem[] = [
  { id: "kannas-treasure", name: "Kanna's Treasure", points: 392 },
  { id: "black-bean-mark", name: "Black Bean Mark", points: 400 },
  { id: "dominator-pendant", name: "Dominator Pendant", points: 431 },
  { id: "papulatus-mark", name: "Papulatus Mark", points: 462 },
  { id: "ra-armor", name: "Root Abyss Armor", points: 495 },
  { id: "sweetwater", name: "Sweetwater Equipment", points: 512 },
  { id: "solid-gollux", name: "Solid Gollux Accessories", points: 523 },
  { id: "absolab", name: "AbsoLab Armor", points: 588 },
  { id: "reinforced-gollux", name: "Reinforced Gollux Accessories", points: 607 },
  { id: "daybreak-pendant", name: "Daybreak Pendant", points: 646 },
  { id: "superior-gollux", name: "Superior Gollux Accessories", points: 697 },
  { id: "guardian-angel-ring", name: "Guardian Angel Ring", points: 844 },
  { id: "arcane-umbra", name: "Arcane Umbra Armor", points: 960 },
  { id: "pitched-boss", name: "Pitched Boss Items", points: 1680 },
  { id: "eternal", name: "Eternal Armor", points: 2312 },
  { id: "brilliant-boss", name: "Brilliant Boss Items", points: 2500 },
];

interface TraceMission {
  id: string;
  description: string;
  points: number;
  exclusiveGroup?: string;
}

export interface TraceBoss {
  id: string;
  name: string;
  icon: string;
  missions: TraceMission[];
  maxPoints: number;
  frequency: "weekly" | "monthly";
}

export const TRACE_BOSSES: TraceBoss[] = [
  {
    id: "lotus",
    name: "Lotus",
    icon: `${CDN}/Maple_Guide_-_Lotus.png`,
    frequency: "weekly",
    maxPoints: 14,
    missions: [
      { id: "lotus-hard", description: "Challenge on Hard Mode", points: 1, exclusiveGroup: "difficulty" },
      { id: "lotus-extreme", description: "Challenger in Extreme Mode", points: 8, exclusiveGroup: "difficulty" },
      { id: "lotus-dc2", description: "Start with a Death Count of 2", points: 1 },
      { id: "lotus-fd", description: "Final Damage: -20%", points: 1 },
      { id: "lotus-dt", description: "Damage Taken: +10%", points: 1 },
      { id: "lotus-laser", description: "Hit Lotus with laser 5 times", points: 3 },
    ],
  },
  {
    id: "damien",
    name: "Damien",
    icon: `${CDN}/Maple_Guide_-_Damien.png`,
    frequency: "weekly",
    maxPoints: 7,
    missions: [
      { id: "damien-hard", description: "Challenge on Hard Mode", points: 1 },
      { id: "damien-dc5", description: "Start with a Death Count of 5", points: 1 },
      { id: "damien-fd", description: "Final Damage: -20%", points: 1 },
      { id: "damien-dt", description: "Damage Taken: +10%", points: 1 },
      { id: "damien-brand", description: "Don't let the Brand take hold", points: 3 },
    ],
  },
  {
    id: "lucid",
    name: "Lucid",
    icon: `${CDN}/Maple_Guide_-_Lucid.png`,
    frequency: "weekly",
    maxPoints: 12,
    missions: [
      { id: "lucid-normal", description: "Challenge on Normal Mode", points: 1, exclusiveGroup: "difficulty" },
      { id: "lucid-hard", description: "Challenge on Hard Mode", points: 3, exclusiveGroup: "difficulty" },
      { id: "lucid-dc5", description: "Start with a Death Count of 5", points: 2 },
      { id: "lucid-fd", description: "Final Damage: -20%", points: 2 },
      { id: "lucid-dt", description: "Damage Taken: +10%", points: 2 },
      { id: "lucid-floor", description: "Don't fall below the floor", points: 3 },
    ],
  },
  {
    id: "will",
    name: "Will",
    icon: `${CDN}/Maple_Guide_-_Will.png`,
    frequency: "weekly",
    maxPoints: 13,
    missions: [
      { id: "will-normal", description: "Challenge on Normal Mode", points: 1, exclusiveGroup: "difficulty" },
      { id: "will-hard", description: "Challenge on Hard Mode", points: 3, exclusiveGroup: "difficulty" },
      { id: "will-dc5", description: "Start with a Death Count of 5", points: 2 },
      { id: "will-fd", description: "Final Damage: -20%", points: 2 },
      { id: "will-dt", description: "Damage Taken: +10%", points: 2 },
      { id: "will-web", description: "Clear a total of 5 Spiderwebs in Phase 3", points: 4 },
    ],
  },
  {
    id: "darknell",
    name: "Darknell",
    icon: `${CDN}/Maple_Guide_-_Guard_Captain_Darknell.png`,
    frequency: "weekly",
    maxPoints: 14,
    missions: [
      { id: "darknell-normal", description: "Challenge on Normal Mode", points: 1, exclusiveGroup: "difficulty" },
      { id: "darknell-hard", description: "Challenge on Hard Mode", points: 4, exclusiveGroup: "difficulty" },
      { id: "darknell-dc2", description: "Start with a Death Count of 2", points: 2 },
      { id: "darknell-fd", description: "Final Damage: -20%", points: 2 },
      { id: "darknell-dt", description: "Damage Taken: +10%", points: 2 },
      { id: "darknell-pillar", description: "Get hit by Pillar of Light 3 times", points: 4 },
    ],
  },
  {
    id: "gloom",
    name: "Gloom",
    icon: `${CDN}/Maple_Guide_-_Giant_Monster_Gloom.png`,
    frequency: "weekly",
    maxPoints: 13,
    missions: [
      { id: "gloom-normal", description: "Challenge on Normal Mode", points: 1, exclusiveGroup: "difficulty" },
      { id: "gloom-chaos", description: "Challenge on Chaos Mode", points: 3, exclusiveGroup: "difficulty" },
      { id: "gloom-dc2", description: "Start with a Death Count of 2", points: 2 },
      { id: "gloom-fd", description: "Final Damage: -20%", points: 2 },
      { id: "gloom-dt", description: "Damage Taken: +10%", points: 2 },
      { id: "gloom-terror", description: "Terror Gauge fill rate increased by 150%", points: 4 },
    ],
  },
  {
    id: "vhilla",
    name: "Verus Hilla",
    icon: `${CDN}/Maple_Guide_-_Verus_Hilla.png`,
    frequency: "weekly",
    maxPoints: 19,
    missions: [
      { id: "vhilla-normal", description: "Challenge on Normal Mode", points: 2, exclusiveGroup: "difficulty" },
      { id: "vhilla-hard", description: "Challenge on Hard Mode", points: 4, exclusiveGroup: "difficulty" },
      { id: "vhilla-dc2", description: "Start with a Death Count of 2", points: 4 },
      { id: "vhilla-fd", description: "Final Damage: -20%", points: 3 },
      { id: "vhilla-dt", description: "Damage Taken: +10%", points: 3 },
      { id: "vhilla-thread", description: "Get hit by thread 3 times", points: 5 },
    ],
  },
  {
    id: "gas",
    name: "Guardian Angel Slime",
    icon: `${CDN}/Maple_Guide_-_Guardian_Angel_Slime.png`,
    frequency: "weekly",
    maxPoints: 14,
    missions: [
      { id: "gas-normal", description: "Challenge on Normal Mode", points: 1, exclusiveGroup: "difficulty" },
      { id: "gas-chaos", description: "Challenge on Chaos Mode", points: 4, exclusiveGroup: "difficulty" },
      { id: "gas-dc2", description: "Start with a Death Count of 2", points: 2 },
      { id: "gas-fd", description: "Final Damage: -20%", points: 2 },
      { id: "gas-dt", description: "Damage Taken: +10%", points: 2 },
      { id: "gas-gate", description: "Clear after blocking 2 Holy Gates in the first wave", points: 4 },
    ],
  },
  {
    id: "blackmage",
    name: "Black Mage",
    icon: `${CDN}/Maple_Guide_-_Black_Mage.png`,
    frequency: "monthly",
    maxPoints: 50,
    missions: [
      { id: "bm-hard", description: "Challenge on Hard Mode", points: 8, exclusiveGroup: "difficulty" },
      { id: "bm-extreme", description: "Challenger in Extreme Mode", points: 16, exclusiveGroup: "difficulty" },
      { id: "bm-fd", description: "Final Damage: -20%", points: 12 },
      { id: "bm-dt", description: "Damage Taken: +10%", points: 12 },
      { id: "bm-fulldc", description: "Clear Phase 1 and 2 with a full Death Count", points: 10 },
    ],
  },
  {
    id: "seren",
    name: "Seren",
    icon: `${CDN}/Maple_Guide_-_Chosen_Seren.png`,
    frequency: "weekly",
    maxPoints: 31,
    missions: [
      { id: "seren-normal", description: "Challenge on Normal Mode", points: 2, exclusiveGroup: "difficulty" },
      { id: "seren-hard", description: "Challenge in Hard Mode (Extreme 2x Points)", points: 4, exclusiveGroup: "difficulty" },
      { id: "seren-dc2", description: "Start with a Death Count of 2", points: 6 },
      { id: "seren-fd", description: "Final Damage: -20%", points: 5 },
      { id: "seren-dt", description: "Damage Taken: +10%", points: 5 },
      { id: "seren-potion", description: "Limit Usable Item (Potion) to 30", points: 7 },
    ],
  },
];

export const MAX_POINTS_CAP = 2500;

/*
  Liberation quest and boss data for Genesis & Destiny liberation calculators.
*/

import { bossIconUrl } from "../../../lib/mapleResource";

// -- Types --------------------------------------------------------------------

export type LiberationType = "genesis" | "destiny" | "destiny2";

export interface LiberationBoss {
  name: string;
  icon: string;
  difficulties: { label: string; traces: number }[];
  maxParty: number;
  /** "weekly" or "monthly" */
  reset: "weekly" | "monthly";
}

export interface LiberationQuest {
  label: string;
  required: number;
}

// -- Genesis ------------------------------------------------------------------

export const GENESIS_BOSSES: LiberationBoss[] = [
  {
    name: "Lotus",
    icon: bossIconUrl("13"),
    difficulties: [
      { label: "Normal", traces: 10 },
      { label: "Hard", traces: 50 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Damien",
    icon: bossIconUrl("15"),
    difficulties: [
      { label: "Normal", traces: 10 },
      { label: "Hard", traces: 50 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Lucid",
    icon: bossIconUrl("19"),
    difficulties: [
      { label: "Easy", traces: 15 },
      { label: "Normal", traces: 20 },
      { label: "Hard", traces: 65 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Will",
    icon: bossIconUrl("23"),
    difficulties: [
      { label: "Easy", traces: 15 },
      { label: "Normal", traces: 25 },
      { label: "Hard", traces: 75 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Gloom",
    icon: bossIconUrl("26"),
    difficulties: [
      { label: "Normal", traces: 20 },
      { label: "Chaos", traces: 65 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Verus Hilla",
    icon: bossIconUrl("24"),
    difficulties: [
      { label: "Normal", traces: 45 },
      { label: "Hard", traces: 90 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Darknell",
    icon: bossIconUrl("27"),
    difficulties: [
      { label: "Normal", traces: 25 },
      { label: "Hard", traces: 75 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Black Mage",
    icon: bossIconUrl("25"),
    difficulties: [
      { label: "Hard", traces: 600 },
      { label: "Extreme", traces: 600 },
    ],
    maxParty: 6,
    reset: "monthly",
  },
];

export const GENESIS_QUESTS: LiberationQuest[] = [
  { label: "Von Leon the Lion King", required: 500 },
  { label: "Arkarium, Guardian of Time", required: 500 },
  { label: "Tyrant Magnus", required: 500 },
  { label: "Lotus, Wing Master", required: 1000 },
  { label: "Damien, Sword of Destruction", required: 1000 },
  { label: "Will, King of Spiders", required: 1000 },
  { label: "Lucid, Keeper of Nightmares", required: 1000 },
  { label: "Verus Hilla, Red Witch", required: 1000 },
];

export const GENESIS_TOTAL = 6500;

// -- Destiny ------------------------------------------------------------------

export const DESTINY_BOSSES: LiberationBoss[] = [
  {
    name: "Chosen Seren",
    icon: bossIconUrl("28"),
    difficulties: [
      { label: "Hard", traces: 6 },
      { label: "Extreme", traces: 80 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Kalos the Guardian",
    icon: bossIconUrl("30"),
    difficulties: [
      { label: "Normal", traces: 10 },
      { label: "Chaos", traces: 70 },
      { label: "Extreme", traces: 400 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "First Adversary",
    icon: bossIconUrl("35"),
    difficulties: [
      { label: "Normal", traces: 15 },
      { label: "Hard", traces: 120 },
      { label: "Extreme", traces: 500 },
    ],
    maxParty: 3,
    reset: "weekly",
  },
  {
    name: "Radiant Malefic Star",
    icon: bossIconUrl("37"),
    difficulties: [
      { label: "Normal", traces: 20 },
      { label: "Hard", traces: 380 },
    ],
    maxParty: 3,
    reset: "weekly",
  },
  {
    name: "Kaling",
    icon: bossIconUrl("31"),
    difficulties: [
      { label: "Normal", traces: 20 },
      { label: "Hard", traces: 160 },
      { label: "Extreme", traces: 1200 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Limbo",
    icon: bossIconUrl("33"),
    difficulties: [
      { label: "Normal", traces: 120 },
      { label: "Hard", traces: 360 },
    ],
    maxParty: 3,
    reset: "weekly",
  },
  {
    name: "Baldrix",
    icon: bossIconUrl("34"),
    difficulties: [
      { label: "Normal", traces: 150 },
      { label: "Hard", traces: 450 },
    ],
    maxParty: 3,
    reset: "weekly",
  },
  {
    name: "Jupiter",
    icon: bossIconUrl("38"),
    difficulties: [
      { label: "Normal", traces: 160 },
      { label: "Hard", traces: 500 },
    ],
    maxParty: 3,
    reset: "weekly",
  },
];

export const DESTINY_QUESTS: LiberationQuest[] = [
  { label: "Decisive Battle, Chosen Seren", required: 2000 },
  { label: "Decisive Battle, Watcher Kalos", required: 2500 },
  { label: "Decisive Battle, Apostle Kaling", required: 3000 },
];

export const DESTINY_TOTAL = 7500;

// -- Destiny Part 2 --------------------------------------------------------------

export const DESTINY2_QUESTS: LiberationQuest[] = [
  { label: "Decisive Battle, First Adversary", required: 10000 },
  { label: "Decisive Battle, Limbo", required: 12500 },
  { label: "Decisive Battle, Baldrix", required: 15000 },
];

export const DESTINY2_TOTAL = 37500;

// -- Helpers ------------------------------------------------------------------

export function getTracesPerClear(
  baseTraces: number,
  partySize: number,
  genesisPass: boolean,
  type: LiberationType,
): number {
  const multiplier = type === "genesis" && genesisPass ? 3 : 1;
  return Math.floor((baseTraces / partySize) * multiplier);
}

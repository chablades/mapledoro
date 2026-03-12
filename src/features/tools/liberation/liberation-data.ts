/*
  Liberation quest and boss data for Genesis & Destiny liberation calculators.
*/

// -- Types --------------------------------------------------------------------

export type LiberationType = "genesis" | "destiny";

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
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Lotus.png",
    difficulties: [
      { label: "Normal", traces: 10 },
      { label: "Hard", traces: 50 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Damien",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Damien.png",
    difficulties: [
      { label: "Normal", traces: 10 },
      { label: "Hard", traces: 50 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Lucid",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Lucid.png",
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
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Will.png",
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
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Giant_Monster_Gloom.png",
    difficulties: [
      { label: "Normal", traces: 20 },
      { label: "Chaos", traces: 65 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Verus Hilla",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Verus_Hilla.png",
    difficulties: [
      { label: "Normal", traces: 45 },
      { label: "Hard", traces: 90 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Darknell",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Guard_Captain_Darknell.png",
    difficulties: [
      { label: "Normal", traces: 25 },
      { label: "Hard", traces: 75 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Black Mage",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Black_Mage.png",
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
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Chosen_Seren.png",
    difficulties: [
      { label: "Hard", traces: 6 },
      { label: "Extreme", traces: 80 },
    ],
    maxParty: 6,
    reset: "weekly",
  },
  {
    name: "Kalos the Guardian",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Kalos_the_Guardian.png",
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
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_First_Adversary.png",
    difficulties: [
      { label: "Normal", traces: 15 },
      { label: "Hard", traces: 120 },
      { label: "Extreme", traces: 500 },
    ],
    maxParty: 3,
    reset: "weekly",
  },
  {
    name: "Kaling",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Kaling.png",
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
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Limbo.png",
    difficulties: [
      { label: "Normal", traces: 120 },
      { label: "Hard", traces: 360 },
    ],
    maxParty: 3,
    reset: "weekly",
  },
  {
    name: "Baldrix",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Baldrix.png",
    difficulties: [
      { label: "Normal", traces: 150 },
      { label: "Hard", traces: 450 },
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

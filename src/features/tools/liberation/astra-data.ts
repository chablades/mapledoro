/*
  Astra Secondary mission, boss, and daily-quest data.
*/

import { bossIconUrl } from "../../../lib/mapleResource";

// -- Types --------------------------------------------------------------------

export interface AstraMission {
  label: string;
  tracesRequired: number;
  fragmentsRequired: number;
}

interface AstraDifficulty {
  label: string;
  traces: number;
  hasVoucher: boolean;
  voucherCount?: number;
  voucherValue?: number;
}

export interface AstraBoss {
  name: string;
  icon: string;
  difficulties: AstraDifficulty[];
  maxParty: number;
}

interface AstraDailyQuest {
  id: string;
  label: string;
  fragments: number;
}

// -- Constants ----------------------------------------------------------------

export const MAX_TRACES_CAPACITY = 1000;

export const ASTRA_MISSIONS: AstraMission[] = [
  { label: "1st Mission: Initial Awakening", tracesRequired: 600, fragmentsRequired: 3000 },
  { label: "2nd Mission: The True Nature of Erion", tracesRequired: 600, fragmentsRequired: 3000 },
  { label: "3rd Mission: Final Enhancement", tracesRequired: 800, fragmentsRequired: 4000 },
];

export const ASTRA_TOTAL_TRACES = 2000;
export const ASTRA_TOTAL_FRAGMENTS = 10000;

export const ASTRA_BOSSES: AstraBoss[] = [
  {
    name: "Chosen Seren",
    icon: bossIconUrl("28"),
    difficulties: [
      { label: "Normal", traces: 6, hasVoucher: false },
      { label: "Hard", traces: 15, hasVoucher: false },
      { label: "Extreme", traces: 180, hasVoucher: true, voucherCount: 6, voucherValue: 5 },
    ],
    maxParty: 6,
  },
  {
    name: "Kalos the Guardian",
    icon: bossIconUrl("30"),
    difficulties: [
      { label: "Easy", traces: 6, hasVoucher: false },
      { label: "Normal", traces: 30, hasVoucher: false },
      { label: "Chaos", traces: 100, hasVoucher: false },
      { label: "Extreme", traces: 500, hasVoucher: true, voucherCount: 6, voucherValue: 30 },
    ],
    maxParty: 6,
  },
  {
    name: "First Adversary",
    icon: bossIconUrl("35"),
    difficulties: [
      { label: "Easy", traces: 10, hasVoucher: false },
      { label: "Normal", traces: 40, hasVoucher: false },
      { label: "Hard", traces: 180, hasVoucher: true, voucherCount: 3, voucherValue: 10 },
      { label: "Extreme", traces: 540, hasVoucher: true, voucherCount: 3, voucherValue: 80 },
    ],
    maxParty: 3,
  },
  {
    name: "Radiant Malefic Star",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Malefic_Star.png",
    difficulties: [
      { label: "Normal", traces: 60, hasVoucher: false },
      { label: "Hard", traces: 240, hasVoucher: true, voucherCount: 3, voucherValue: 30 },
    ],
    maxParty: 3,
  },
  {
    name: "Kaling",
    icon: bossIconUrl("31"),
    difficulties: [
      { label: "Easy", traces: 20, hasVoucher: false },
      { label: "Normal", traces: 80, hasVoucher: false },
      { label: "Hard", traces: 240, hasVoucher: true, voucherCount: 6, voucherValue: 10 },
      { label: "Extreme", traces: 1440, hasVoucher: true, voucherCount: 6, voucherValue: 80 },
    ],
    maxParty: 6,
  },
  {
    name: "Limbo",
    icon: bossIconUrl("33"),
    difficulties: [
      { label: "Normal", traces: 80, hasVoucher: false },
      { label: "Hard", traces: 240, hasVoucher: true, voucherCount: 3, voucherValue: 20 },
    ],
    maxParty: 3,
  },
  {
    name: "Baldrix",
    icon: bossIconUrl("34"),
    difficulties: [
      { label: "Normal", traces: 80, hasVoucher: false },
      { label: "Hard", traces: 240, hasVoucher: true, voucherCount: 3, voucherValue: 40 },
    ],
    maxParty: 3,
  },
  {
    name: "Jupiter",
    icon: "https://media.maplestorywiki.net/yetidb/Maple_Guide_-_Jupiter.png",
    difficulties: [
      { label: "Normal", traces: 210, hasVoucher: true, voucherCount: 3, voucherValue: 15 },
      { label: "Hard", traces: 630, hasVoucher: true, voucherCount: 3, voucherValue: 120 },
    ],
    maxParty: 3,
  },
];

export const ASTRA_DAILY_QUESTS: AstraDailyQuest[] = [
  { id: "cernium", label: "Cernium Research", fragments: 1 },
  { id: "hotel_arcs", label: "Clean Up Around Hotel Arcus", fragments: 3 },
  { id: "odium", label: "Odium Area Expedition", fragments: 6 },
  { id: "shangri_la", label: "Shangri-La Contamination Purification", fragments: 10 },
  { id: "arteria", label: "Defeat the Arteria Remnants", fragments: 15 },
  { id: "carcion", label: "Carcion Recovery Support", fragments: 25 },
  { id: "tallahart", label: "Investigate the Tallahart Ancient God's Power", fragments: 45 },
  { id: "geardrak", label: "Geardrak Cronos' Remnants Collection", fragments: 65 },
];

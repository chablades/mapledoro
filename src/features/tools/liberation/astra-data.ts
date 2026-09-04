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
    icon: bossIconUrl("37"),
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
    icon: bossIconUrl("38"),
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

// -- Secondary Weapon Transfer -------------------------------------------------

interface AstraTransferColumn {
  /** What the player transfers *from*, in the wiki's own grouping. */
  label: string;
  /** Astra secondary the transfer produces; supplies the column's icon. */
  itemId: string;
  itemName: string;
  /** Meso cost per ASTRA_TRANSFER_STAR_LABELS row, same order. `null` where no
   *  transferable item reaches that star force: only the Warrior side has a
   *  source shield (Terminus Defender) that goes past 20 stars. */
  costs: (number | null)[];
}

/** Rows of the transfer cost table. The first covers "or below" and the last
 *  "or above", which is why they aren't plain numbers. */
export const ASTRA_TRANSFER_STAR_LABELS = [
  "10★ or below", "11★", "12★", "13★", "14★", "15★", "16★", "17★", "18★",
  "19★", "20★", "21★", "22★", "23★", "24★", "25★", "26★ or above",
];

/** Wiki tables quote costs in billions; stored as raw mesos and rounded, since
 *  1.1 * 1e9 is not exact in binary floating point. */
const inBillions = (values: (number | null)[]): (number | null)[] =>
  values.map((v) => (v === null ? null : Math.round(v * 1_000_000_000)));

export const ASTRA_TRANSFER_COLUMNS: AstraTransferColumn[] = [
  {
    label: "Warrior Shields",
    itemId: "01092123", // Astra Sacred Aegis
    itemName: "Astra Sacred Aegis",
    costs: inBillions([1, 1.1, 1.2, 1.3, 1.4, 1.5, 2, 2.5, 3, 5.5, 10, 12.5, 15, 19, 50, 134, 360]),
  },
  {
    label: "Mage Shields",
    itemId: "01092126", // Astra Arcane Shield
    itemName: "Astra Arcane Shield",
    costs: inBillions([1, 1.1, 1.2, 1.3, 1.4, 1.5, 2, 2.5, 3, 5.5, 10, null, null, null, null, null, null]),
  },
  {
    label: "Shadower",
    itemId: "01092129", // Astra Bane Shield
    itemName: "Astra Bane Shield",
    costs: inBillions([1, 1.1, 1.2, 1.3, 1.4, 1.5, 2, 2.5, 3, 5.5, 10, null, null, null, null, null, null]),
  },
  {
    label: "Kanna",
    itemId: "01354310", // Astra Talisman
    itemName: "Astra Talisman",
    costs: inBillions([1, 1, 1, 1, 1, 1, 1.1, 1.3, 1.5, 2, 2.5, 3.5, 5, 9.5, 25, 67, 180]),
  },
  {
    label: "Dual Blade",
    itemId: "01342121", // Astra Katara
    itemName: "Astra Katara",
    costs: inBillions([1, 1, 1, 1, 1, 1, 1.1, 1.3, 1.5, 2, 2.5, 3.5, 5, 9.5, 25, 67, 180]),
  },
];

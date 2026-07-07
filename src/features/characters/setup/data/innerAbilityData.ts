// ── Inner Ability ────────────────────────────────────────────────────────
// Each of a preset's 3 lines has its own independent rank (a Legendary-grade
// preset can still roll Rare/Epic/Unique individual lines). Line value pools
// per rank from the authoritative KMS table
// (https://maplestory.nexon.com/Guide/OtherProbability/ability/reputevalue),
// cross-referenced with https://maplestorywiki.net/w/Inner_Ability.

import type {
  StoredIATier, StoredInnerAbility, StoredInnerAbilityLine, StoredInnerAbilityPreset,
} from "../../model/charactersStore";

export type IATier = "rare" | "epic" | "unique" | "legendary";

export const IA_TIER_LABELS: Record<IATier, string> = {
  rare: "Rare",
  epic: "Epic",
  unique: "Unique",
  legendary: "Legendary",
};

export const IA_TIER_ORDER: IATier[] = ["rare", "epic", "unique", "legendary"];

// Stat lines also roll as a dual: a primary stat (large value) plus a secondary stat (smaller
// value, any of the other three). Primary→secondary values are paired per tier, e.g. epic 17→9.
const STAT_KEYS = ["STR", "DEX", "INT", "LUK"] as const;
const DUAL_STAT_VALUES: Record<IATier, ReadonlyArray<readonly [number, number]>> = {
  rare: [[5, 3], [6, 3], [7, 4], [8, 4], [9, 5], [10, 5]],
  epic: [[15, 8], [16, 8], [17, 9], [18, 9], [19, 10], [20, 10]],
  unique: [[25, 13], [26, 13], [27, 14], [28, 14], [29, 15], [30, 15]],
  legendary: [[35, 18], [36, 18], [37, 19], [38, 19], [39, 20], [40, 20]],
};
function dualStatLines(tier: IATier): string[] {
  const lines: string[] = [];
  for (const primary of STAT_KEYS) {
    for (const secondary of STAT_KEYS) {
      if (primary === secondary) continue;
      for (const [p, s] of DUAL_STAT_VALUES[tier]) lines.push(`${primary}: +${p}, ${secondary}: +${s}`);
    }
  }
  return lines;
}

const IA_LINES: Record<IATier, string[]> = {
  rare: [
    "STR: +5", "STR: +6", "STR: +7", "STR: +8", "STR: +9", "STR: +10",
    "DEX: +5", "DEX: +6", "DEX: +7", "DEX: +8", "DEX: +9", "DEX: +10",
    "INT: +5", "INT: +6", "INT: +7", "INT: +8", "INT: +9", "INT: +10",
    "LUK: +5", "LUK: +6", "LUK: +7", "LUK: +8", "LUK: +9", "LUK: +10",
    "All Stats: +5", "All Stats: +6", "All Stats: +7", "All Stats: +8", "All Stats: +9", "All Stats: +10",
    // AP redistribution: a % of the AP invested in one stat is added to another.
    "2% of AP assigned to STR added to DEX", "3% of AP assigned to STR added to DEX",
    "2% of AP assigned to DEX added to STR", "3% of AP assigned to DEX added to STR",
    "2% of AP assigned to INT added to LUK", "3% of AP assigned to INT added to LUK",
    "2% of AP assigned to LUK added to DEX", "3% of AP assigned to LUK added to DEX",
    "Max HP: +75", "Max HP: +90", "Max HP: +105", "Max HP: +120", "Max HP: +135", "Max HP: +150",
    "Max MP: +75", "Max MP: +90", "Max MP: +105", "Max MP: +120", "Max MP: +135", "Max MP: +150",
    "Item Drop Rate: +3%", "Item Drop Rate: +4%", "Item Drop Rate: +5%",
    "Mesos Obtained: +3%", "Mesos Obtained: +4%", "Mesos Obtained: +5%",
    "+2% damage to normal monsters", "+3% damage to normal monsters",
    "+2% damage when attacking targets inflicted with Abnormal Status", "+3% damage when attacking targets inflicted with Abnormal Status",
    "Buff skill duration: +7%", "Buff skill duration: +8%", "Buff skill duration: +9%", "Buff skill duration: +10%", "Buff skill duration: +12%", "Buff skill duration: +13%",
    "Jump: +4", "Jump: +6", "Jump: +8",
    "Speed: +4", "Speed: +6", "Speed: +8",
    "Defense: +50", "Defense: +60", "Defense: +70", "Defense: +80", "Defense: +90", "Defense: +100",
  ],
  epic: [
    "STR: +15", "STR: +16", "STR: +17", "STR: +18", "STR: +19", "STR: +20",
    "DEX: +15", "DEX: +16", "DEX: +17", "DEX: +18", "DEX: +19", "DEX: +20",
    "INT: +15", "INT: +16", "INT: +17", "INT: +18", "INT: +19", "INT: +20",
    "LUK: +15", "LUK: +16", "LUK: +17", "LUK: +18", "LUK: +19", "LUK: +20",
    "All Stats: +15", "All Stats: +16", "All Stats: +17", "All Stats: +18", "All Stats: +19", "All Stats: +20",
    // AP redistribution: a % of the AP invested in one stat is added to another.
    "4% of AP assigned to STR added to DEX", "5% of AP assigned to STR added to DEX",
    "4% of AP assigned to DEX added to STR", "5% of AP assigned to DEX added to STR",
    "4% of AP assigned to INT added to LUK", "5% of AP assigned to INT added to LUK",
    "4% of AP assigned to LUK added to DEX", "5% of AP assigned to LUK added to DEX",
    "Max HP: +225", "Max HP: +240", "Max HP: +255", "Max HP: +270", "Max HP: +285", "Max HP: +300",
    "Max MP: +225", "Max MP: +240", "Max MP: +255", "Max MP: +270", "Max MP: +285", "Max MP: +300",
    "Critical Rate: +5%", "Critical Rate: +6%", "Critical Rate: +7%", "Critical Rate: +8%", "Critical Rate: +9%", "Critical Rate: +10%",
    "Attack: +6", "Attack: +9", "Attack: +12",
    "Magic Attack: +6", "Magic Attack: +9", "Magic Attack: +12",
    "Damage: +6%", "Damage: +9%", "Damage: +12%",
    "Item Drop Rate: +8%", "Item Drop Rate: +9%", "Item Drop Rate: +10%",
    "Mesos Obtained: +8%", "Mesos Obtained: +9%", "Mesos Obtained: +10%",
    "+4% damage to normal monsters", "+5% damage to normal monsters",
    "+4% damage when attacking targets inflicted with Abnormal Status", "+5% damage when attacking targets inflicted with Abnormal Status",
    "Buff skill duration: +19%", "Buff skill duration: +20%", "Buff skill duration: +22%", "Buff skill duration: +23%", "Buff skill duration: +24%", "Buff skill duration: +25%",
    "Jump: +10", "Jump: +12", "Jump: +14",
    "Speed: +10", "Speed: +12", "Speed: +14",
    "Defense: +150", "Defense: +160", "Defense: +170", "Defense: +180", "Defense: +190", "Defense: +200",
  ],
  unique: [
    "STR: +25", "STR: +26", "STR: +27", "STR: +28", "STR: +29", "STR: +30",
    "DEX: +25", "DEX: +26", "DEX: +27", "DEX: +28", "DEX: +29", "DEX: +30",
    "INT: +25", "INT: +26", "INT: +27", "INT: +28", "INT: +29", "INT: +30",
    "LUK: +25", "LUK: +26", "LUK: +27", "LUK: +28", "LUK: +29", "LUK: +30",
    "All Stats: +25", "All Stats: +26", "All Stats: +27", "All Stats: +28", "All Stats: +29", "All Stats: +30",
    // AP redistribution: a % of the AP invested in one stat is added to another.
    "7% of AP assigned to STR added to DEX", "8% of AP assigned to STR added to DEX",
    "7% of AP assigned to DEX added to STR", "8% of AP assigned to DEX added to STR",
    "7% of AP assigned to INT added to LUK", "8% of AP assigned to INT added to LUK",
    "7% of AP assigned to LUK added to DEX", "8% of AP assigned to LUK added to DEX",
    "Max HP: +375", "Max HP: +390", "Max HP: +405", "Max HP: +420", "Max HP: +435", "Max HP: +450",
    "Max MP: +375", "Max MP: +390", "Max MP: +405", "Max MP: +420", "Max MP: +435", "Max MP: +450",
    "Max HP: +5%", "Max HP: +6%", "Max HP: +7%", "Max HP: +8%", "Max HP: +9%", "Max HP: +10%",
    "Max MP: +5%", "Max MP: +6%", "Max MP: +7%", "Max MP: +8%", "Max MP: +9%", "Max MP: +10%",
    "Boss Damage: +5%", "Boss Damage: +6%", "Boss Damage: +7%", "Boss Damage: +8%", "Boss Damage: +9%", "Boss Damage: +10%",
    "Critical Rate: +15%", "Critical Rate: +16%", "Critical Rate: +17%", "Critical Rate: +18%", "Critical Rate: +19%", "Critical Rate: +20%",
    "Attack: +15", "Attack: +18", "Attack: +21",
    "Magic Attack: +15", "Magic Attack: +18", "Magic Attack: +21",
    "Damage: +15%", "Damage: +18%", "Damage: +21%",
    "Item Drop Rate: +13%", "Item Drop Rate: +14%", "Item Drop Rate: +15%",
    "Mesos Obtained: +13%", "Mesos Obtained: +14%", "Mesos Obtained: +15%",
    "+7% damage to normal monsters", "+8% damage to normal monsters",
    "+7% damage when attacking targets inflicted with Abnormal Status", "+8% damage when attacking targets inflicted with Abnormal Status",
    "Buff skill duration: +32%", "Buff skill duration: +33%", "Buff skill duration: +34%", "Buff skill duration: +35%", "Buff skill duration: +37%", "Buff skill duration: +38%",
    "5% chance to skip cooldowns", "6% chance to skip cooldowns", "7% chance to skip cooldowns", "8% chance to skip cooldowns", "9% chance to skip cooldowns", "10% chance to skip cooldowns",
    "Jump: +18", "Jump: +20",
    "Speed: +18", "Speed: +20",
    "Defense: +250", "Defense: +260", "Defense: +270", "Defense: +280", "Defense: +290", "Defense: +300",
    "DEF: +5%", "DEF: +6%", "DEF: +7%", "DEF: +8%", "DEF: +9%", "DEF: +10%",
    "Final Damage: +13% of DEF", "Final Damage: +15% of DEF", "Final Damage: +18% of DEF", "Final Damage: +20% of DEF", "Final Damage: +23% of DEF", "Final Damage: +25% of DEF",
  ],
  legendary: [
    "STR: +35", "STR: +36", "STR: +37", "STR: +38", "STR: +39", "STR: +40",
    "DEX: +35", "DEX: +36", "DEX: +37", "DEX: +38", "DEX: +39", "DEX: +40",
    "INT: +35", "INT: +36", "INT: +37", "INT: +38", "INT: +39", "INT: +40",
    "LUK: +35", "LUK: +36", "LUK: +37", "LUK: +38", "LUK: +39", "LUK: +40",
    "All Stats: +35", "All Stats: +36", "All Stats: +37", "All Stats: +38", "All Stats: +39", "All Stats: +40",
    // AP redistribution: a % of the AP invested in one stat is added to another.
    "9% of AP assigned to STR added to DEX", "10% of AP assigned to STR added to DEX",
    "9% of AP assigned to DEX added to STR", "10% of AP assigned to DEX added to STR",
    "9% of AP assigned to INT added to LUK", "10% of AP assigned to INT added to LUK",
    "9% of AP assigned to LUK added to DEX", "10% of AP assigned to LUK added to DEX",
    "Max HP: +525", "Max HP: +540", "Max HP: +555", "Max HP: +570", "Max HP: +585", "Max HP: +600",
    "Max MP: +525", "Max MP: +540", "Max MP: +555", "Max MP: +570", "Max MP: +585", "Max MP: +600",
    "Max HP: +15%", "Max HP: +16%", "Max HP: +17%", "Max HP: +18%", "Max HP: +19%", "Max HP: +20%",
    "Max MP: +15%", "Max MP: +16%", "Max MP: +17%", "Max MP: +18%", "Max MP: +19%", "Max MP: +20%",
    "Boss Damage: +15%", "Boss Damage: +16%", "Boss Damage: +17%", "Boss Damage: +18%", "Boss Damage: +19%", "Boss Damage: +20%",
    "Critical Rate: +25%", "Critical Rate: +26%", "Critical Rate: +27%", "Critical Rate: +28%", "Critical Rate: +29%", "Critical Rate: +30%",
    "Attack: +27", "Attack: +30",
    "Magic Attack: +27", "Magic Attack: +30",
    "Damage: +27%", "Damage: +30%",
    "Item Drop Rate: +18%", "Item Drop Rate: +19%", "Item Drop Rate: +20%",
    "Mesos Obtained: +18%", "Mesos Obtained: +19%", "Mesos Obtained: +20%",
    "+9% damage to normal monsters", "+10% damage to normal monsters",
    "+9% damage when attacking targets inflicted with Abnormal Status", "+10% damage when attacking targets inflicted with Abnormal Status",
    "Buff skill duration: +44%", "Buff skill duration: +45%", "Buff skill duration: +47%", "Buff skill duration: +48%", "Buff skill duration: +49%", "Buff skill duration: +50%",
    "15% chance to skip cooldowns", "16% chance to skip cooldowns", "17% chance to skip cooldowns", "18% chance to skip cooldowns", "19% chance to skip cooldowns", "20% chance to skip cooldowns",
    "Attack +1 for every 10 levels", "Attack +1 for every 12 levels", "Attack +1 for every 14 levels", "Attack +1 for every 16 levels",
    "Magic Attack +1 for every 10 levels", "Magic Attack +1 for every 12 levels", "Magic Attack +1 for every 14 levels", "Magic Attack +1 for every 16 levels",
    "Attack Speed: +1 Level",
    "Passive Skills: +1 Level (excludes Active Hybrids, 5th job skills, 6th job skills)",
    "Number of enemies hit by multi-target skill +1",
    "Defense: +350", "Defense: +360", "Defense: +370", "Defense: +380", "Defense: +390", "Defense: +400",
    "DEF: +15%", "DEF: +16%", "DEF: +17%", "DEF: +18%", "DEF: +19%", "DEF: +20%",
    "Final Damage: +38% of DEF", "Final Damage: +40% of DEF", "Final Damage: +43% of DEF", "Final Damage: +45% of DEF", "Final Damage: +48% of DEF", "Final Damage: +50% of DEF",
  ],
};

// Fold the generated dual-stat lines into each tier's pool.
for (const tier of IA_TIER_ORDER) IA_LINES[tier].push(...dualStatLines(tier));

export function getLinesForIATier(tier: IATier): string[] {
  return IA_LINES[tier];
}

// The only two legendary lines MapleScouter cares about (see scouterQuestionsData.ts's
// IA_LINE_OPTIONS) — full_setup derives its scouter-facing Inner Ability line answer by
// checking for these exact strings in the Stats step's Inner Ability card instead of
// asking again.
export const IA_PASSIVE_PLUS_ONE_LINE = "Passive Skills: +1 Level (excludes Active Hybrids, 5th job skills, 6th job skills)";
export const IA_MULTI_TARGET_PLUS_ONE_LINE = "Number of enemies hit by multi-target skill +1";

// ── Draft shape (setup UI) ───────────────────────────────────────────────────
// Inner Ability presets (3 lines each, each with an independent tier). Lives on the
// Stats step's draft (StatsStepDraft.innerAbility) — it's a Character Info fact
// (found in the in-game Stats window), not an Equipment one.

export interface IALineDraft {
  tier?: IATier | "";
  value?: string;
}
export interface IAPresetDraft {
  lines?: IALineDraft[];
}
export interface IADraft {
  activePreset?: number;
  presets?: IAPresetDraft[];
}

export interface IALineFull { tier: IATier | ""; value: string }
export interface IAPresetFull { lines: [IALineFull, IALineFull, IALineFull] }
export interface IAFull { activePreset: number; presets: [IAPresetFull, IAPresetFull, IAPresetFull] }

/** Fills in defaults for the partial Inner Ability draft so the UI can index it safely. */
export function normalizeIA(ia: IADraft | undefined): IAFull {
  const presets = ia?.presets ?? [];
  const preset = (i: number): IAPresetFull => {
    const lines = presets[i]?.lines ?? [];
    const line = (j: number): IALineFull => ({ tier: lines[j]?.tier ?? "", value: lines[j]?.value ?? "" });
    return { lines: [line(0), line(1), line(2)] };
  };
  const activePreset = ia?.activePreset;
  return {
    activePreset: activePreset === 1 || activePreset === 2 ? activePreset : 0,
    presets: [preset(0), preset(1), preset(2)],
  };
}

const IA_TIER_INDEX: Record<IATier, number> = { rare: 0, epic: 1, unique: 2, legendary: 3 };

/** Tiers a line may take given the ability grade. Line 1 is always the grade; lines 2-3 floor at
 *  two tiers below (clamped to Rare). Line 2 may reach the grade itself — covering legacy GMS /
 *  TMS Hyper-circulator Legendary 2nd lines — while line 3 caps one tier below the grade. */
export function allowedLineTiers(grade: IATier, lineIdx: number): IATier[] {
  if (lineIdx === 0) return [grade];
  const g = IA_TIER_INDEX[grade];
  const hi = lineIdx === 1 ? g : Math.max(0, g - 1);
  return IA_TIER_ORDER.slice(Math.max(0, g - 2), hi + 1);
}

// ── Storage conversion ───────────────────────────────────────────────────────

function draftIALineToStored(l: IALineDraft | undefined): StoredInnerAbilityLine {
  return { tier: (l?.tier ?? "") as StoredIATier, value: l?.value ?? "" };
}

function draftIAPresetToStored(p: IAPresetDraft | undefined): StoredInnerAbilityPreset {
  const lines = p?.lines ?? [];
  return { lines: [draftIALineToStored(lines[0]), draftIALineToStored(lines[1]), draftIALineToStored(lines[2])] };
}

export function convertInnerAbilityDraftToStored(draft: IADraft | undefined): StoredInnerAbility {
  const presets = draft?.presets ?? [];
  return {
    // Always saved as preset 1 — the tab switcher used to view/edit each preset isn't an
    // explicit "this is my active loadout" choice, so trusting it would silently save
    // whatever preset was last open while editing.
    activePreset: 0,
    presets: [draftIAPresetToStored(presets[0]), draftIAPresetToStored(presets[1]), draftIAPresetToStored(presets[2])],
  };
}

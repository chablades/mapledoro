// AUTO-GENERATED references to manifests/v269/item.json (Mystic Frontier bonus dice).
// Cosmetic "Mysterious Stopwatch" items are omitted (no effect on the score).

export type MfBonusFamily = "Blessed" | "Swift" | "Sharp" | "Holy";
export type MfBonusColor = "White" | "Blue" | "Purple" | "Orange" | "Green";

export interface MfBonusItem {
  id: string;
  name: string;
  family: MfBonusFamily;
  color: MfBonusColor;
  flat: number;
  mult: number;
}

export const MF_BONUS_ITEMS: readonly MfBonusItem[] = [
  { id: "03802169", name: "Blessed Dice", family: "Blessed", color: "White", flat: 3, mult: 0 },
  { id: "03802170", name: "Blessed Blue Dice", family: "Blessed", color: "Blue", flat: 6, mult: 0 },
  { id: "03802171", name: "Blessed Purple Dice", family: "Blessed", color: "Purple", flat: 9, mult: 0 },
  { id: "03802172", name: "Blessed Orange Dice", family: "Blessed", color: "Orange", flat: 12, mult: 0 },
  { id: "03802173", name: "Blessed Green Dice", family: "Blessed", color: "Green", flat: 15, mult: 0 },
  { id: "03802174", name: "Swift-Rolling Dice", family: "Swift", color: "White", flat: 0, mult: 1.2 },
  { id: "03802175", name: "Swift-Rolling Blue Dice", family: "Swift", color: "Blue", flat: 0, mult: 1.4 },
  { id: "03802176", name: "Swift-Rolling Purple Dice", family: "Swift", color: "Purple", flat: 0, mult: 1.6 },
  { id: "03802177", name: "Swift-Rolling Orange Dice", family: "Swift", color: "Orange", flat: 0, mult: 1.8 },
  { id: "03802178", name: "Swift-Rolling Green Dice", family: "Swift", color: "Green", flat: 0, mult: 2.0 },
  { id: "03802179", name: "Sharp-Edged Dice", family: "Sharp", color: "White", flat: -1, mult: 1.6 },
  { id: "03802180", name: "Sharp-Edged Blue Dice", family: "Sharp", color: "Blue", flat: -1, mult: 1.8 },
  { id: "03802181", name: "Sharp-Edged Purple Dice", family: "Sharp", color: "Purple", flat: -1, mult: 2.0 },
  { id: "03802182", name: "Sharp-Edged Orange Dice", family: "Sharp", color: "Orange", flat: -1, mult: 2.2 },
  { id: "03802183", name: "Sharp-Edged Green Dice", family: "Sharp", color: "Green", flat: -1, mult: 2.4 },
  { id: "03802184", name: "Holy Rollers", family: "Holy", color: "White", flat: 1, mult: 1.4 },
  { id: "03802185", name: "Blue Holy Rollers", family: "Holy", color: "Blue", flat: 1, mult: 1.6 },
  { id: "03802186", name: "Purple Holy Rollers", family: "Holy", color: "Purple", flat: 1, mult: 1.8 },
  { id: "03802187", name: "Orange Holy Rollers", family: "Holy", color: "Orange", flat: 1, mult: 2.0 },
  { id: "03802188", name: "Green Holy Rollers", family: "Holy", color: "Green", flat: 1, mult: 2.2 },
];

export const MF_BONUS_FAMILIES: readonly MfBonusFamily[] = ["Blessed", "Swift", "Sharp", "Holy"];
export const MF_BONUS_COLORS: readonly MfBonusColor[] = ["White", "Blue", "Purple", "Orange", "Green"];

// One-line effect summary per family (the magnitude scales with color).
export const MF_BONUS_FAMILY_DESC: Record<MfBonusFamily, string> = {
  Blessed: "Dice Total bonus",
  Swift: "Final Multiplier bonus",
  Sharp: "Dice Total −1, larger Final Multiplier",
  Holy: "Dice Total +1 and Final Multiplier",
};

export function getBonusItem(family: MfBonusFamily, color: MfBonusColor): MfBonusItem | undefined {
  return MF_BONUS_ITEMS.find((b) => b.family === family && b.color === color);
}

// Concise per-item effect summary (the dice-total and multiplier components it adds).
export function formatBonusEffect(item: MfBonusItem): string {
  const parts: string[] = [];
  if (item.flat !== 0) parts.push(`${item.flat > 0 ? "+" : ""}${item.flat} Dice Total`);
  if (item.mult !== 0) parts.push(`+${item.mult.toFixed(1)}× Final Multiplier`);
  return parts.join(" · ");
}

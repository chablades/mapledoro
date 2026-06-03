import type { MvpTier } from "./star-force/star-force-data";

export const MVP_OPTIONS: { value: MvpTier; label: string }[] = [
  { value: "none", label: "None" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "diamond", label: "Diamond" },
];

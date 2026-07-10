/*
  Registry of all stat fields that can be captured during the stats setup step.
  Class data references these IDs to declare which stats are required per class.
*/

export type TripleStatFieldId =
  | "str"
  | "dex"
  | "int"
  | "luk"
  | "hp"
  | "attackPower"
  | "magicAtt";

export type SingleStatFieldId =
  | "damage"
  | "bossDamage"
  | "ignoreDefense"
  | "criticalRate"
  | "criticalDamage"
  | "buffDuration"
  | "cooldownSkip"
  | "ignoreElementalResistance"
  | "additionalStatusDamage"
  | "summonDuration"
  | "arcanePower"
  | "sacredPower";

export type StatFieldId = TripleStatFieldId | "cooldownReduction" | SingleStatFieldId;

export interface TripleStatFieldDef {
  id: TripleStatFieldId;
  label: string;
  type: "triple";
}

// Triple stats: Base value, % value, % value not applied (3 separate screenshots)
export const TRIPLE_STAT_FIELDS: TripleStatFieldDef[] = [
  { id: "str", label: "STR", type: "triple" },
  { id: "dex", label: "DEX", type: "triple" },
  { id: "int", label: "INT", type: "triple" },
  { id: "luk", label: "LUK", type: "triple" },
  { id: "hp", label: "HP", type: "triple" },
  { id: "attackPower", label: "Attack Power", type: "triple" },
  { id: "magicAtt", label: "Magic ATT", type: "triple" },
];


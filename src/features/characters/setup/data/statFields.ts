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

export interface CooldownReductionStatFieldDef {
  id: "cooldownReduction";
  label: string;
  type: "cooldown_reduction";
}

export interface SingleStatFieldDef {
  id: SingleStatFieldId;
  label: string;
  type: "single";
}

export type StatFieldDef =
  | TripleStatFieldDef
  | CooldownReductionStatFieldDef
  | SingleStatFieldDef;

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

// Single-value stats
export const SINGLE_STAT_FIELDS: SingleStatFieldDef[] = [
  { id: "damage", label: "Damage", type: "single" },
  { id: "bossDamage", label: "Boss Damage", type: "single" },
  { id: "ignoreDefense", label: "Ignore Enemy DEF", type: "single" },
  { id: "criticalRate", label: "Critical Rate", type: "single" },
  { id: "criticalDamage", label: "Critical Damage", type: "single" },
  { id: "buffDuration", label: "Buff Duration", type: "single" },
  { id: "cooldownSkip", label: "Cooldown Skip Chance", type: "single" },
  { id: "ignoreElementalResistance", label: "Ignore Elemental Resistance", type: "single" },
  { id: "additionalStatusDamage", label: "Additional Status Damage", type: "single" },
  { id: "summonDuration", label: "Summons Duration Increase", type: "single" },
  { id: "arcanePower", label: "Arcane Force", type: "single" },
  { id: "sacredPower", label: "Sacred Power", type: "single" },
];

export const COOLDOWN_REDUCTION_STAT_FIELD: CooldownReductionStatFieldDef = {
  id: "cooldownReduction",
  label: "Cooldown Reduction",
  type: "cooldown_reduction",
};

export const ALL_STAT_FIELDS: StatFieldDef[] = [
  ...TRIPLE_STAT_FIELDS,
  COOLDOWN_REDUCTION_STAT_FIELD,
  ...SINGLE_STAT_FIELDS,
];

export function getStatFieldById(id: StatFieldId): StatFieldDef | undefined {
  return ALL_STAT_FIELDS.find((f) => f.id === id);
}

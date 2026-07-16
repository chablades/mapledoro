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
  | "sacredPower"
  // Resource bar shown alongside HP — a raw number, not a percentage. Labeled "MP" by
  // default; some classes replace MP with their own resource entirely (Demon Fury,
  // Time Force, Psychic Points) via ClassSkillData.resourceLabel. Profile-pencil only
  // (stats_flow) — never asked in the guided Setup flows, see StatsSetupStep's
  // showAllStats.
  | "mp"
  // In-game Character Info window stat, profile-pencil only (same reasoning as mp).
  | "normalEnemyDamage";

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

// Labels for the single-value combat/symbol fields, shared between the setup step's own
// question labels and the profile's read-only Stats bookmark.
export const STAT_LABELS: Partial<Record<StatFieldId, string>> = {
  damage: "Damage",
  bossDamage: "Boss Damage",
  ignoreDefense: "Ignore DEF",
  criticalRate: "Critical Rate",
  criticalDamage: "Critical Damage",
  buffDuration: "Buff Duration",
  cooldownReduction: "Cooldown Reduction",
  cooldownSkip: "Cooldown Not Applied",
  ignoreElementalResistance: "Ignore Elem. Resist.",
  additionalStatusDamage: "Addl. Status Damage",
  summonDuration: "Summons Duration Inc.",
  arcanePower: "Arcane Power",
  sacredPower: "Sacred Power",
  // Default label; ClassSkillData.resourceLabel overrides this per class (DF/TF/PP).
  mp: "MP",
  normalEnemyDamage: "Normal Enemy Damage",
};


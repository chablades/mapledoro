/*
  Legion Artifact system (Maple Union -> Legion -> Artifacts tab): 9 Crystals, each
  independently leveled 1-5, each holding 3 of 16 selectable stat lines (no duplicate
  stat on the same crystal). A stat's effective total level is the sum of that stat's
  level across every crystal it's assigned to, capped at 10 (like V Matrix boost nodes).
  Source: https://maplestorywiki.net/w/Legion_Artifact, cross-referenced against an
  in-game screenshot (Yuki, 2026-07-01) confirming per-level values are linear
  (max value / 10 per level) for every stat shown at Lv 10.
*/

export const MAX_CRYSTAL_LEVEL = 5;
export const MAX_ARTIFACT_LEVEL = 60;
export const MAX_STAT_TOTAL_LEVEL = 10;
export const CRYSTAL_STAT_SLOTS = 3;

export interface LegionCrystalDef {
  id: string;
  name: string;
  requiredArtifactLevel: number;
}

// Order matches the wiki's Crystal List and the in-game grid (3x3, left-to-right then
// top-to-bottom).
export const LEGION_CRYSTALS: LegionCrystalDef[] = [
  { id: "orangeMushroom", name: "Orange Mushroom", requiredArtifactLevel: 0 },
  { id: "slime", name: "Slime", requiredArtifactLevel: 0 },
  { id: "hornyMushroom", name: "Horny Mushroom", requiredArtifactLevel: 0 },
  { id: "stump", name: "Stump", requiredArtifactLevel: 10 },
  { id: "stoneGolem", name: "Stone Golem", requiredArtifactLevel: 20 },
  { id: "balrog", name: "Balrog", requiredArtifactLevel: 30 },
  { id: "zakum", name: "Zakum", requiredArtifactLevel: 40 },
  { id: "pinkBean", name: "Pink Bean", requiredArtifactLevel: 50 },
  { id: "papulatus", name: "Papulatus", requiredArtifactLevel: 60 },
];

export type LegionArtifactStatId =
  | "allStats" | "hpMp" | "attMatt" | "damage" | "bossDamage" | "ignoreDefense"
  | "buffDuration" | "skipCooldown" | "mesos" | "itemDrop" | "criticalRate"
  | "criticalDamage" | "multiTargetExp" | "statusResistance" | "summonDuration"
  | "finalAttackDamage";

export interface LegionArtifactStatDef {
  id: LegionArtifactStatId;
  label: string;
  /** Bonus per point of a stat's effective (capped) total level. */
  perLevel: number;
  unit: "flat" | "percent";
  /** A level-independent flat effect this stat also grants once its total level is >= 1
   *  (e.g. "+1 target" alongside the scaling EXP% on the same line). */
  flagAtLevelOne?: string;
}

// perLevel = wiki's "up to X" max divided by MAX_STAT_TOTAL_LEVEL (10) — verified against
// every stat shown in Yuki's Lv 10 screenshot (e.g. Skill Cooldown Bypass Chance: 7.5/10 =
// 0.75%/level matched the screenshot's "+7.50%" exactly).
export const LEGION_ARTIFACT_STATS: LegionArtifactStatDef[] = [
  { id: "allStats", label: "All Stats", perLevel: 15, unit: "flat" },
  { id: "hpMp", label: "Max HP and MP", perLevel: 750, unit: "flat" },
  { id: "attMatt", label: "Attack Power and Magic ATT", perLevel: 3, unit: "flat" },
  { id: "damage", label: "Damage", perLevel: 1.5, unit: "percent" },
  { id: "bossDamage", label: "Boss Damage", perLevel: 1.5, unit: "percent" },
  { id: "ignoreDefense", label: "Ignore Defense", perLevel: 2, unit: "percent" },
  { id: "buffDuration", label: "Buff Duration", perLevel: 2, unit: "percent" },
  { id: "skipCooldown", label: "Skill Cooldown Bypass Chance", perLevel: 0.75, unit: "percent" },
  { id: "mesos", label: "Mesos Obtained", perLevel: 1.2, unit: "percent" },
  { id: "itemDrop", label: "Item Drop Rate", perLevel: 1.2, unit: "percent" },
  { id: "criticalRate", label: "Critical Rate", perLevel: 2, unit: "percent" },
  { id: "criticalDamage", label: "Critical Damage", perLevel: 0.4, unit: "percent" },
  { id: "multiTargetExp", label: "EXP Obtained", perLevel: 1.2, unit: "percent", flagAtLevelOne: "Max AoE Skill Targets +1" },
  { id: "statusResistance", label: "Status Resistance", perLevel: 1.2, unit: "flat" },
  { id: "summonDuration", label: "Summoned Minion Duration", perLevel: 2, unit: "percent" },
  { id: "finalAttackDamage", label: "Damage of Final Attack Skills", perLevel: 3, unit: "percent" },
];

const STAT_BY_ID = new Map(LEGION_ARTIFACT_STATS.map((s) => [s.id, s]));

export function getLegionArtifactStat(id: LegionArtifactStatId): LegionArtifactStatDef | undefined {
  return STAT_BY_ID.get(id);
}

export function unlockedCrystalCount(artifactLevel: number): number {
  return Math.min(LEGION_CRYSTALS.length, 3 + Math.floor(Math.max(0, artifactLevel) / 10));
}

export function isCrystalUnlocked(index: number, artifactLevel: number): boolean {
  return artifactLevel >= LEGION_CRYSTALS[index].requiredArtifactLevel;
}

export interface LegionCrystalDraft {
  level?: number;
  stats?: (LegionArtifactStatId | null)[];
}

export interface LegionArtifactBoardDraft {
  artifactLevel?: number;
  crystals?: LegionCrystalDraft[];
}

export function parseLegionArtifactBoardDraft(raw: string): LegionArtifactBoardDraft {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as LegionArtifactBoardDraft : {};
  } catch {
    return {};
  }
}

export function serializeLegionArtifactBoardDraft(draft: LegionArtifactBoardDraft): string {
  return JSON.stringify(draft);
}

export function sanitizeCrystalLevel(level: number | undefined): number {
  return Math.max(0, Math.min(MAX_CRYSTAL_LEVEL, Math.floor(level ?? 0)));
}

/** Raw (uncapped) summed level per stat across every crystal it's assigned to. */
export function computeRawStatLevels(
  crystals: LegionCrystalDraft[] | undefined,
): Partial<Record<LegionArtifactStatId, number>> {
  const totals: Partial<Record<LegionArtifactStatId, number>> = {};
  for (const crystal of crystals ?? []) {
    if (!crystal) continue;
    const level = sanitizeCrystalLevel(crystal.level);
    if (level <= 0) continue;
    for (const statId of crystal.stats ?? []) {
      if (!statId) continue;
      totals[statId] = (totals[statId] ?? 0) + level;
    }
  }
  return totals;
}

/** Effective (capped) level for a stat, 0-10 — extra points beyond 10 are wasted. */
export function effectiveStatLevel(rawLevel: number | undefined): number {
  return Math.min(MAX_STAT_TOTAL_LEVEL, Math.max(0, rawLevel ?? 0));
}

/** Numeric bonus value at a stat's effective level (before unit formatting). */
export function statBonusValue(statId: LegionArtifactStatId, effectiveLevel: number): number {
  const def = STAT_BY_ID.get(statId);
  if (!def) return 0;
  return Math.round(def.perLevel * effectiveLevel * 10) / 10;
}

/** Formats a stat's computed bonus at its effective level, e.g. "+45" or "+18%, Max AoE Skill Targets +1". */
export function formatStatBonus(statId: LegionArtifactStatId, effectiveLevel: number): string {
  const def = STAT_BY_ID.get(statId);
  if (!def || effectiveLevel <= 0) return "+0";
  const value = statBonusValue(statId, effectiveLevel);
  const valueLabel = def.unit === "percent" ? `+${value}%` : `+${value}`;
  return def.flagAtLevelOne ? `${valueLabel}, ${def.flagAtLevelOne}` : valueLabel;
}

export function hasAnyCrystalProgress(crystals: LegionCrystalDraft[] | undefined): boolean {
  return (crystals ?? []).some((c) => c && (c.level ?? 0) > 0);
}

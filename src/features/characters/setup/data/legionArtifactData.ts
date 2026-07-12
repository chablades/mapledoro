/*
  Legion Artifact system (Maple Union -> Legion -> Artifacts tab): 9 Crystals, each
  independently leveled 1-5, each holding 3 of 16 selectable stat lines (no duplicate
  stat on the same crystal). A stat's effective total level is the sum of that stat's
  level across every crystal it's assigned to, capped at 10 (like V Matrix boost nodes).
  Source: https://maplestorywiki.net/w/Legion_Artifact, cross-referenced against an
  in-game screenshot (Yuki, 2026-07-01) confirming per-level values are linear
  (max value / 10 per level) for every stat shown at Lv 10.
*/

import type { StoredLegionCrystal } from "../../model/charactersStore";

// A crystal can't be "unleveled": once unlocked it's always at least level 1 in-game.
export const MIN_CRYSTAL_LEVEL = 1;
export const MAX_CRYSTAL_LEVEL = 5;
// Same idea one level up: a Legion that has an Artifact board at all starts at Artifact
// Level 1, not 0 (namu.wiki's own level table starts numbering at 1).
export const MIN_ARTIFACT_LEVEL = 1;
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
  /** Increment granted at each of the 10 effective levels (index 0 = level 1, index 9 =
   *  level 10). Almost every stat is a flat `perLevel` repeated 10x, but 4 stats (mesos,
   *  itemDrop, multiTargetExp, statusResistance) actually double their per-level increment
   *  at levels 5 and 10 specifically — confirmed against namu.wiki's per-stat footnotes
   *  (2026-07-08), e.g. mesos: "레벨당 1%씩 증가. 단, 5레벨과 10레벨에는 2%씩 증가"
   *  ("+1%/level, except levels 5 and 10 which give +2%"). A flat perLevel model landed on
   *  the right TOTAL at level 10 (which is all the original Lv10-screenshot check verified)
   *  but was wrong at every other level. */
  levelSteps: number[];
  unit: "flat" | "percent";
  /** A level-independent flat effect this stat also grants once its total level is >= 1
   *  (e.g. "+1 target" alongside the scaling EXP% on the same line). */
  flagAtLevelOne?: string;
}

function uniformSteps(perLevel: number): number[] {
  return Array.from({ length: MAX_STAT_TOTAL_LEVEL }, () => perLevel);
}

// The 4 stepped stats: +1 per level, except levels 5 and 10 which grant +2 instead of +1.
const STEPPED_PERCENT = [1, 1, 1, 1, 2, 1, 1, 1, 1, 2];

// Verified against namu.wiki's Lv 10 effect text + per-stat footnotes (2026-07-08), which
// give both the level-10 total AND (via footnotes) the per-level growth pattern — not just
// a single-level screenshot check like the original sourcing.
export const LEGION_ARTIFACT_STATS: LegionArtifactStatDef[] = [
  { id: "allStats", label: "All Stats", levelSteps: uniformSteps(15), unit: "flat" },
  { id: "hpMp", label: "Max HP/MP", levelSteps: uniformSteps(750), unit: "flat" },
  { id: "attMatt", label: "Attack Power/Magic ATT", levelSteps: uniformSteps(3), unit: "flat" },
  { id: "damage", label: "Damage", levelSteps: uniformSteps(1.5), unit: "percent" },
  { id: "bossDamage", label: "Boss Damage", levelSteps: uniformSteps(1.5), unit: "percent" },
  { id: "ignoreDefense", label: "Ignore Defense", levelSteps: uniformSteps(2), unit: "percent" },
  { id: "buffDuration", label: "Buff Duration", levelSteps: uniformSteps(2), unit: "percent" },
  { id: "skipCooldown", label: "Skill Cooldown Bypass Chance", levelSteps: uniformSteps(0.75), unit: "percent" },
  { id: "mesos", label: "Meso Drop", levelSteps: STEPPED_PERCENT, unit: "percent" },
  { id: "itemDrop", label: "Item Drop Rate", levelSteps: STEPPED_PERCENT, unit: "percent" },
  { id: "criticalRate", label: "Critical Rate", levelSteps: uniformSteps(2), unit: "percent" },
  { id: "criticalDamage", label: "Critical Damage", levelSteps: uniformSteps(0.4), unit: "percent" },
  { id: "multiTargetExp", label: "Bonus EXP", levelSteps: STEPPED_PERCENT, unit: "percent", flagAtLevelOne: "Max AoE Skill Targets +1" },
  { id: "statusResistance", label: "Status Resistance", levelSteps: STEPPED_PERCENT, unit: "flat" },
  { id: "summonDuration", label: "Summon Duration", levelSteps: uniformSteps(2), unit: "percent" },
  { id: "finalAttackDamage", label: "Damage of Final Attack Skill", levelSteps: uniformSteps(3), unit: "percent" },
];

// Every crystal starts with these exact 3 lines (in this order) before the player spends
// a reset stone to reroll them — confirmed against Yuki's in-game board, where untouched
// crystals all share this same default set.
export const DEFAULT_CRYSTAL_STATS: LegionArtifactStatId[] = ["allStats", "hpMp", "attMatt"];

const STAT_BY_ID = new Map(LEGION_ARTIFACT_STATS.map((s) => [s.id, s]));

export function getLegionArtifactStat(id: LegionArtifactStatId): LegionArtifactStatDef | undefined {
  return STAT_BY_ID.get(id);
}

export function isCrystalUnlocked(index: number, artifactLevel: number): boolean {
  return artifactLevel >= LEGION_CRYSTALS[index].requiredArtifactLevel;
}

export interface LegionCrystalDraft {
  level?: number;
  stats?: (LegionArtifactStatId | null)[];
}

export interface LegionArtifactBoardDraft {
  // String, not number — matches Oz Rings' draft pattern so the input can stay blank
  // until touched instead of a typed "0" collapsing back to an indistinguishable empty
  // state (see the input's own sanitizer for the clamp/leading-zero handling).
  artifactLevel?: string;
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
  return Math.max(MIN_CRYSTAL_LEVEL, Math.min(MAX_CRYSTAL_LEVEL, Math.floor(level ?? MIN_CRYSTAL_LEVEL)));
}

// The draft shape allows optional/sparse fields (mid-edit); storage wants every crystal
// fully filled in (level defaults to 0, stats padded to 3 slots). The setup step's own
// draft densely pre-fills EVERY crystal slot (including still-locked ones) with default
// level-1/allStats-hpMp-attMatt data the moment any single crystal is touched (see
// updateCrystal's comment in LegionArtifactsSetupStep.tsx) — that's fine as scratch draft
// state, but a locked crystal has no real in-game data, so storage must not persist it as
// if it were unlocked. Force locked indices back to an explicit "no data" entry here,
// at the actual persistence boundary.
//
// The reverse transition (locked -> unlocked, e.g. raising Artifact Level on a later visit)
// needs the same treatment in the other direction: a crystal that was previously stored as
// locked (all-null stats) has no real picks yet, so newly unlocking it should backfill the
// same level-1/default-3-lines state every crystal starts with in-game, not carry the
// all-null placeholder through as if the player had actually cleared it.
export function toStoredLegionCrystals(
  crystals: LegionCrystalDraft[] | undefined,
  artifactLevel: number,
): StoredLegionCrystal[] | undefined {
  if (!crystals) return undefined;
  return crystals.map((c, index) => {
    if (!isCrystalUnlocked(index, artifactLevel)) return { level: 0, stats: [null, null, null] };
    const hasRealStats = c?.stats?.some((s) => s !== null && s !== undefined) ?? false;
    return {
      level: sanitizeCrystalLevel(c?.level),
      stats: hasRealStats
        ? [c?.stats?.[0] ?? null, c?.stats?.[1] ?? null, c?.stats?.[2] ?? null]
        : [...DEFAULT_CRYSTAL_STATS],
    };
  });
}

/**
 * Raw (uncapped) summed level per stat across every UNLOCKED crystal it's assigned to.
 * `artifactLevel` is required: the setup step densely fills all 9 array slots (including
 * still-locked ones) with the level-1 default the moment any single crystal is edited (see
 * `updateCrystal`'s comment), so a locked crystal's placeholder entry must be excluded here
 * or it'd silently count toward the totals before the player has even unlocked it.
 */
export function computeRawStatLevels(
  crystals: LegionCrystalDraft[] | undefined,
  artifactLevel: number,
): Partial<Record<LegionArtifactStatId, number>> {
  const totals: Partial<Record<LegionArtifactStatId, number>> = {};
  (crystals ?? []).forEach((crystal, index) => {
    if (!crystal || !isCrystalUnlocked(index, artifactLevel)) return;
    const level = sanitizeCrystalLevel(crystal.level);
    for (const statId of crystal.stats ?? []) {
      if (!statId) continue;
      totals[statId] = (totals[statId] ?? 0) + level;
    }
  });
  return totals;
}

/** Effective (capped) level for a stat, 0-10 — extra points beyond 10 are wasted. */
export function effectiveStatLevel(rawLevel: number | undefined): number {
  return Math.min(MAX_STAT_TOTAL_LEVEL, Math.max(0, rawLevel ?? 0));
}

/** Numeric bonus value at a stat's effective level (before unit formatting). Rounded to 2
 *  decimals, not 1 — Skill Cooldown Bypass Chance's 0.75/level step produces real values
 *  like 2.25 and 6.75 that a 1-decimal round would corrupt (2.25 -> 2.3). */
export function statBonusValue(statId: LegionArtifactStatId, effectiveLevel: number): number {
  const def = STAT_BY_ID.get(statId);
  if (!def || effectiveLevel <= 0) return 0;
  const sum = def.levelSteps.slice(0, effectiveLevel).reduce((total, step) => total + step, 0);
  return Math.round(sum * 100) / 100;
}

export function hasAnyCrystalProgress(crystals: LegionCrystalDraft[] | undefined): boolean {
  return (crystals ?? []).some((c) => c && (c.level ?? 0) > 0);
}

export const EMPTY_CRYSTAL: LegionCrystalDraft = { level: MIN_CRYSTAL_LEVEL, stats: [...DEFAULT_CRYSTAL_STATS] };

/**
 * A crystal newly unlocked by raising the Artifact Level can still be holding a stored
 * "no data" placeholder (level 0, all-null stats) from before it was reachable — e.g. this
 * world's Legion Artifact data already existed from an earlier character that stopped short
 * of this crystal's threshold. `crystals[i] ?? EMPTY_CRYSTAL` only catches a missing array
 * slot, not one that's present but still shaped like that placeholder, so it must be resolved
 * to the real level-1/default-3-lines state here — the same place every read of a crystal's
 * data goes through (setup editing and read-only display alike) — rather than showing the
 * stored nulls as empty.
 */
export function effectiveCrystal(crystal: LegionCrystalDraft | undefined, unlocked: boolean): LegionCrystalDraft {
  if (!crystal) return EMPTY_CRYSTAL;
  if (!unlocked) return crystal;
  const hasRealData = (crystal.level ?? 0) > 0 || (crystal.stats ?? []).some((s) => s !== null && s !== undefined);
  return hasRealData ? crystal : EMPTY_CRYSTAL;
}

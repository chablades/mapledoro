/*
  Extra MapleScouter-flow questionnaire inputs that don't exist in Full setup.

  - Wild Hunter Legion rank: an account-level (per-world) effect, hard-locked and
    DERIVED from the highest Wild Hunter in that world's roster. Not user-editable
    and not stored per-character — it persists per-world in `scouterLegionByWorld`
    (see charactersStore). The setup step only displays the derived value.
  - Inner Ability line: a per-character pick, stored in the character's `scouter`
    blob (StoredScouterData), NOT in StoredCharacterStats.
*/

import { LEGION_ARTIFACT_FINAL_ATK_MAX, type StoredCharacterRecord, type StoredScouterData, type StoredScouterLegion, type WhLegionRank } from "../../model/charactersStore";
import type { StatsStepDraft } from "./statsStepDraft";

// ── Wild Hunter legion rank ───────────────────────────────────────────────────
// The Wild Hunter legion attacker grants a damage bonus to the whole account based
// on the WH character's legion grade. Grade follows the standard legion level
// brackets, so we derive it from the WH's level. MapleScouter's API takes a raw
// level, so map grade → bracket-min level at send time (B→60, A→100, S→140,
// SS→200, SSS→250; see WH_RANK_BY_LEVEL).

const WH_RANK_BY_LEVEL: ReadonlyArray<readonly [number, WhLegionRank]> = [
  [250, "SSS"],
  [200, "SS"],
  [140, "S"],
  [100, "A"],
  [60, "B"],
];

const WILD_HUNTER_JOB_NAME = "Wild Hunter";

/** Maps a character level to its legion grade, or null below grade B (level 60). */
function whRankForLevel(level: number): WhLegionRank | null {
  for (const [min, rank] of WH_RANK_BY_LEVEL) {
    if (level >= min) return rank;
  }
  return null;
}

/** The Wild Hunter the rank is derived from (highest-level one that reaches grade B). */
export interface WhAutofillSource {
  name: string;
  level: number;
  rank: WhLegionRank;
}

/** Highest-level Wild Hunter in the roster (with its grade), or null if none qualifies. */
export function whAutofillSourceFromRoster(roster: readonly StoredCharacterRecord[]): WhAutofillSource | null {
  const top = roster
    .filter((c) => c.jobName === WILD_HUNTER_JOB_NAME)
    .reduce<StoredCharacterRecord | null>((best, c) => (best && best.level >= c.level ? best : c), null);
  if (!top) return null;
  const rank = whRankForLevel(top.level);
  return rank ? { name: top.characterName, level: top.level, rank } : null;
}

/** Highest legion grade among any Wild Hunter in the roster, or null if none. */
export function whRankFromRoster(roster: readonly StoredCharacterRecord[]): WhLegionRank | null {
  return whAutofillSourceFromRoster(roster)?.rank ?? null;
}

// Manual-entry buttons, shown ONLY when no Wild Hunter is in the world's roster. The
// question asks for the WH's level (what people know); each bracket maps to a grade
// (lv200 = lv201 = SS), so the buttons are the brackets. Stored value = grade.
export const WH_RANK_OPTIONS: { value: string; label: string; sublabel?: string; optOut?: boolean }[] = [
  { value: "B", label: "Lv 60–99", sublabel: "B" },
  { value: "A", label: "Lv 100–139", sublabel: "A" },
  { value: "S", label: "Lv 140–199", sublabel: "S" },
  { value: "SS", label: "Lv 200–249", sublabel: "SS" },
  { value: "SSS", label: "Lv 250+", sublabel: "SSS" },
  { value: "none", label: "No Wild Hunter", optOut: true },
];

// ── Inner Ability line ─────────────────────────────────────────────────────────
// The only Inner Ability lines MapleScouter cares about are the two legendary
// utility lines; everything else is captured by the stat window. Three-way pick.

export const IA_LINE_OPTIONS: { value: string; label: string; optOut?: boolean }[] = [
  { value: "passive", label: "Passive Skills +1" },
  { value: "multiTarget", label: "Multi-target +1 enemy" },
  { value: "neither", label: "Neither", optOut: true },
];

// ── Legion artifacts (Maple Union) ───────────────────────────────────────────────
// Two account-level (per-world) artifact effects MapleScouter wants, neither derivable:
//  - "+1 targets hit on multi-target skills & EXP acquired" — a yes/no effect.
//  - "Damage of Final Attack Skills" — a percent (caps at LEGION_ARTIFACT_FINAL_ATK_MAX).
// Both persist per-world on StoredScouterLegion alongside the WH rank.

export const LEGION_ARTIFACT_FINAL_ATK_LIMIT = LEGION_ARTIFACT_FINAL_ATK_MAX;

/** Parses the final-attack-damage percent (1–LIMIT), or undefined if blank/invalid. */
function parseFinalAttackDmg(raw: string | undefined): number | undefined {
  const n = Number(raw?.trim());
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.min(Math.floor(n), LEGION_ARTIFACT_FINAL_ATK_LIMIT);
}

type LegionArtifactFields = Pick<StoredScouterLegion, "artifactExtraTarget" | "artifactFinalAttackDmg">;

/**
 * Resolves the per-world legion artifact fields for a finish: the draft entry wins
 * (including clearing — an empty numeric field or "No" toggle removes the value),
 * otherwise the existing stored value is preserved. Returns only set fields.
 */
export function resolveLegionArtifacts(
  sq: StatsStepDraft["scouterQuestions"],
  existing: LegionArtifactFields | undefined,
): LegionArtifactFields {
  const extraTarget = sq?.artifactExtraTarget ?? existing?.artifactExtraTarget;
  const finalAtk = sq?.artifactFinalAttackDmg !== undefined
    ? parseFinalAttackDmg(sq.artifactFinalAttackDmg)
    : existing?.artifactFinalAttackDmg;
  return {
    ...(extraTarget ? { artifactExtraTarget: true } : {}),
    ...(finalAtk !== undefined ? { artifactFinalAttackDmg: finalAtk } : {}),
  };
}

// ── Conversion ─────────────────────────────────────────────────────────────────

/** Parses the weapon ATT/MATT field into a positive integer, or undefined if blank/invalid. */
function parseWeaponAtt(raw: string | undefined): number | undefined {
  const n = Number(raw?.trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

/** Pulls the per-character scouter inputs (Inner Ability line + weapon ATT) out of the stats draft. */
export function convertScouterQuestionsDraftToStored(
  draft: StatsStepDraft,
): Pick<StoredScouterData, "innerAbilityLine" | "weaponAtt"> | null {
  const line = draft.scouterQuestions?.innerAbilityLine;
  const innerAbilityLine = line === "passive" || line === "multiTarget" ? line : undefined;
  const weaponAtt = parseWeaponAtt(draft.weaponAtt);
  if (innerAbilityLine === undefined && weaponAtt === undefined) return null;
  return {
    ...(innerAbilityLine !== undefined ? { innerAbilityLine } : {}),
    ...(weaponAtt !== undefined ? { weaponAtt } : {}),
  };
}

// Resolves which "Combat-Orders-family" tier a character's Mastery%/Final Damage% baseline
// should use. Character Info setup never captures a truly unbuffed character — every non-legacy
// class's buff guide requires (Decent) Combat Orders active before screenshotting stats (see
// classSkillData.ts's buffSkills), and DCO alone bumps a class's always-on Mastery/Final-Damage
// skills up one level past their normal cap. Passive Skills+1 IA (a Legendary Inner Ability line)
// has the same per-skill effect and stacks with DCO if the player also has it.
//
// Confirmed 2026-07-18 that simply re-evaluating each pinned skill's own formula one or two
// levels past its normal cap (see gen-stat-baselines.mjs) exactly reproduces this — no per-class
// curve or "KMS vs non-KMS" rule needed; earlier sessions treated this as an unexplained,
// class-specific quirk before realizing it's just each skill's own formula shape.
import type { StoredInnerAbility, StoredScouterData } from "../../model/charactersStore";
import { IA_PASSIVE_PLUS_ONE_LINE } from "./innerAbilityData";

/** 0 = pure unbuffed baseline (never actually reflected by Character Info data — kept only as
 *  the drift-guarded reference point). 1 = Decent Combat Orders alone, OR Passive Skills+1 IA
 *  alone (confirmed interchangeable when used singly). 2 = both stacked, OR the single
 *  higher-tier "Combat Orders" buff alone (same numeric effect either way). */
export type ComboOrdersTier = 0 | 1 | 2;

function hasPassiveSkillsPlusOneIA(
  innerAbility: StoredInnerAbility | undefined,
  scouterLine: StoredScouterData["innerAbilityLine"] | undefined,
): boolean {
  const preset = innerAbility?.presets[innerAbility.activePreset];
  if (preset?.lines.some((l) => l.value === IA_PASSIVE_PLUS_ONE_LINE)) return true;
  return scouterLine === "passive";
}

/** Paladin's buff guide requires the single higher-tier "Combat Orders" (every other class
 *  requires only "Decent Combat Orders") — that alone already reaches tier 2. Whether Passive
 *  Skills+1 IA stacks a further tier on top of full Combat Orders for her is untested (no real
 *  character data exists for that combination); treated as a no-op rather than guessing a tier 3
 *  value with zero evidence. */
export function resolveComboOrdersTier(
  classId: string | undefined,
  innerAbility: StoredInnerAbility | undefined,
  scouterLine: StoredScouterData["innerAbilityLine"] | undefined,
): ComboOrdersTier {
  if (classId === "paladin") return 2;
  return hasPassiveSkillsPlusOneIA(innerAbility, scouterLine) ? 2 : 1;
}

// Resolves which "Combat-Orders-family" tier a character's Mastery%/Final Damage% baseline
// should use. Character Info setup never captures a truly unbuffed character. Every non-legacy
// class's buff guide requires Decent Combat Orders, or full Combat Orders, active before
// screenshotting stats (see classSkillData.ts's buffSkills), and DCO alone bumps a class's
// always-on Mastery and Final Damage skills one level past their normal cap. Passive Skills+1 IA,
// a Legendary Inner Ability line, has the same per-skill effect and stacks with DCO.
//
// Re-evaluating each pinned skill's own formula one or two levels past its normal cap (see
// gen-stat-baselines.mjs) reproduces this exactly. No per-class curve or KMS-versus-non-KMS rule
// is needed: it follows from each skill's formula shape, not a class-specific quirk.
import type { StoredInnerAbility, StoredScouterData } from "../../model/charactersStore";
import { IA_PASSIVE_PLUS_ONE_LINE } from "./innerAbilityData";

/** 0 is the pure unbuffed baseline, never reflected by Character Info data and kept only as a
 *  drift-guarded reference point. 1 is Decent Combat Orders alone or Passive Skills+1 IA alone,
 *  which are interchangeable when used singly. 2 is both stacked, or the single higher-tier
 *  Combat Orders buff alone, with the same numeric effect either way. */
export type ComboOrdersTier = 0 | 1 | 2;

function hasPassiveSkillsPlusOneIA(
  innerAbility: StoredInnerAbility | undefined,
  scouterLine: StoredScouterData["innerAbilityLine"] | undefined,
): boolean {
  const preset = innerAbility?.presets[innerAbility.activePreset];
  if (preset?.lines.some((l) => l.value === IA_PASSIVE_PLUS_ONE_LINE)) return true;
  return scouterLine === "passive";
}

/** Paladin's buff guide requires the single higher-tier Combat Orders, where every other class
 *  requires only Decent Combat Orders, and that alone reaches tier 2. Whether Passive Skills+1 IA
 *  stacks a further tier on top of full Combat Orders for Paladin is untested, since no character
 *  data exists for that combination. It is treated as a no-op rather than guessing a tier 3
 *  value with no evidence. */
export function resolveComboOrdersTier(
  classId: string | undefined,
  innerAbility: StoredInnerAbility | undefined,
  scouterLine: StoredScouterData["innerAbilityLine"] | undefined,
): ComboOrdersTier {
  if (classId === "paladin") return 2;
  return hasPassiveSkillsPlusOneIA(innerAbility, scouterLine) ? 2 : 1;
}

/*
  Draft read-back for the HEXA Matrix setup step.
  Pulled out of HexaMatrixSetupStep.tsx (a component file) so Fast Refresh can
  preserve component state there — react-doctor's only-export-components rule
  flags non-component exports living in a component file.
*/

import type { HexaClassDef, HexaSkillLevels } from "../../../tools/hexa-skills/hexa-classes";
import type { HexaStatNode } from "./hexaStatData";
import { readCharacterToolData } from "../../../tools/characterToolStorage";

/** Reads a character's already-saved HEXA Skills + HEXA Stat tool data and folds it
 *  into the step's own draft shape (skill levels flat, HEXA Stat nodes under a
 *  `hexaStat` key), so the step's mount-time backfill can seed an edit session from
 *  real data instead of landing blank. Returns null when nothing is saved yet. */
export function readSavedHexaValue(classDef: HexaClassDef | null, characterName: string | undefined): string | null {
  if (!classDef || !characterName) return null;
  const savedSkills = readCharacterToolData<{ levels?: HexaSkillLevels }>(characterName, "hexaSkills");
  const savedStat = readCharacterToolData<{ nodes?: HexaStatNode[] }>(characterName, "hexaStat");
  if (!savedSkills?.levels && !savedStat?.nodes) return null;
  return JSON.stringify({ ...(savedSkills?.levels ?? {}), hexaStat: savedStat?.nodes });
}

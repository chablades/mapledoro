/*
  Maps Nexon's jobName strings to stable internal class IDs.
  Derived at module load from CLASS_SKILL_DATA — no manual maintenance needed.

  validateNexonJobMapping() can be called once at app startup in dev to surface
  issues early (duplicate nexonJobName entries, empty IDs, etc.).
  Suggested call site: src/features/characters/tabs/useCharacterSetupController.ts on mount.
*/

import { CLASS_SKILL_DATA } from "./classSkillData";

const NEXON_JOB_NAME_TO_CLASS_ID: Record<string, string> = Object.fromEntries(
  CLASS_SKILL_DATA.map((c) => [c.nexonJobName, c.id]),
);

const NEXON_JOB_NAME_TO_DISPLAY_NAME: Record<string, string> = Object.fromEntries(
  CLASS_SKILL_DATA
    .filter((c) => c.displayName !== undefined)
    .map((c) => [c.nexonJobName, c.displayName as string]),
);

export function resolveClassId(nexonJobName: string): string | undefined {
  return NEXON_JOB_NAME_TO_CLASS_ID[nexonJobName];
}

/** Returns the player-facing display name for a class, falling back to Nexon's jobName if no override exists. */
export function resolveDisplayJobName(nexonJobName: string): string {
  return NEXON_JOB_NAME_TO_DISPLAY_NAME[nexonJobName] ?? nexonJobName;
}

export function validateNexonJobMapping(): void {
  if (process.env.NODE_ENV !== "development") return;

  const seen = new Set<string>();
  for (const entry of CLASS_SKILL_DATA) {
    if (!entry.id) {
      console.warn(`[nexonJobMapping] Class entry has empty id:`, entry);
    }
    if (!entry.nexonJobName) {
      console.warn(`[nexonJobMapping] Class "${entry.id}" has empty nexonJobName`);
    }
    if (seen.has(entry.nexonJobName)) {
      console.warn(
        `[nexonJobMapping] Duplicate nexonJobName "${entry.nexonJobName}" — only the first entry will be used`,
      );
    }
    seen.add(entry.nexonJobName);
  }
}

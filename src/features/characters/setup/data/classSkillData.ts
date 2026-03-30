/*
  Class-specific skill data for the stats setup step.
  Each entry defines the buff skills a player must activate before screenshotting
  their stats, and which stat fields are relevant for that class.

  HOW TO ADD A CLASS:
  Fill in the Google Sheet, then translate each row into a ClassSkillData entry here.
  - id: stable snake_case identifier (never change this once set)
  - nexonJobName: exact string returned by Nexon's API in the `jobName` field
  - buffSkills: ordered list of skills to activate, each referencing a maplestory.io skill ID
  - requiredStats: stat field IDs the user needs to fill out (from statFields.ts)
*/

import type { StatFieldId } from "./statFields";

export interface BuffSkill {
  skillId: number;
  skillName: string;
  jobAdvancement: number;
}

export interface ClassSkillData {
  id: string;
  nexonJobName: string;
  buffSkills: BuffSkill[];
  requiredStats: StatFieldId[];
}

export const CLASS_SKILL_DATA: ClassSkillData[] = [
  // Add class entries here after filling in the Google Sheet.
  // Example (remove when adding real data):
  //
  // {
  //   id: "dark_knight",
  //   nexonJobName: "Dark Knight",
  //   buffSkills: [
  //     { skillId: 1234, skillName: "Beholder's Might", jobAdvancement: 3 },
  //     { skillId: 5678, skillName: "Maple Warrior", jobAdvancement: 4 },
  //   ],
  //   requiredStats: ["str", "luk", "attackPower", "damage", "bossDamage", "ignoreDefense", "criticalRate", "criticalDamage"],
  // },
];

export function getClassDataByNexonJobName(jobName: string): ClassSkillData | undefined {
  return CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
}

export function getClassDataById(id: string): ClassSkillData | undefined {
  return CLASS_SKILL_DATA.find((c) => c.id === id);
}

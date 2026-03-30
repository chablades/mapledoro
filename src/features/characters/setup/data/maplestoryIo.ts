/*
  maplestory.io API helpers for fetching skill icons.
  Region and version are set here — update once confirmed.

  Skill icon URL format: /api/{region}/{version}/skill/{skillId}/icon
*/

// TODO: Confirm the correct region and version to use.
// Check https://maplestory.io/api to see available regions and versions.
export const MAPLESTORY_IO_BASE_URL = "https://maplestory.io";
export const MAPLESTORY_IO_REGION = "GMS" as const;
export const MAPLESTORY_IO_VERSION = "TODO" as const;

export function getSkillIconUrl(skillId: number): string {
  return `${MAPLESTORY_IO_BASE_URL}/api/${MAPLESTORY_IO_REGION}/${MAPLESTORY_IO_VERSION}/skill/${skillId}/icon`;
}

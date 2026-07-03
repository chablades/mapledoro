// Builds image URLs served by the self-hosted MapleResource API (haku.network).
// IDs are looked up by hand from the committed manifests in `manifests/v<version>/`;
// see CLAUDE.md "Image Policy". Override the host with NEXT_PUBLIC_RESOURCE_BASE.

export type ResourceType = "erda-skill" | "familiar" | "hexa-skill" | "item" | "mob" | "skill" | "v-matrix";

const RESOURCE_BASE = process.env.NEXT_PUBLIC_RESOURCE_BASE ?? "https://haku.network";

export function resourceImageUrl(type: ResourceType, id: string, asset: string): string {
  return `${RESOURCE_BASE}/api/img/${type}/${id}/${asset}`;
}

// Boss Maple Guide icon (haku.network `ui/boss` namespace). IDs are looked up by hand
// from `manifests/v<version>/boss.json` and hardcoded at the call site.
export function bossIconUrl(id: string): string {
  return `${RESOURCE_BASE}/api/img/ui/boss/${id}/icon.png`;
}

// Familiar badge icon (haku.network `ui/familiar` namespace). IDs come from
// `manifests/v<version>/…` ui/familiar extraction; see BADGE_ID_MAP in familiarsData.ts.
export function familiarBadgeUrl(id: number): string {
  return `${RESOURCE_BASE}/api/img/ui/familiar/${id}/icon.png`;
}

// Legion Artifact crystal icon (haku.network `legion-artifact` namespace, no `ui/`
// prefix). `id` = crystal index, matching LEGION_CRYSTALS order in legionArtifactData.ts
// (0=Orange Mushroom … 8=Papulatus). `grade` = crystal level - 1 (0-4 for level 1-5).
// `disabled` is the un-leveled/locked look; `icon2` is an alt variant not yet used.
export function legionCrystalIconUrl(
  id: number,
  grade: number,
  asset: "icon" | "icon2" | "disabled" = "icon",
): string {
  return `${RESOURCE_BASE}/api/img/legion-artifact/${id}/${grade}/${asset}.png`;
}

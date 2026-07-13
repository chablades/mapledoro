// Builds image URLs served by the self-hosted MapleResource API (haku.network).
// IDs are looked up by hand from the committed manifests in `manifests/v<version>/`;
// see CLAUDE.md "Image Policy". Override the host with NEXT_PUBLIC_RESOURCE_BASE.

export type ResourceType = "erda-skill" | "familiar" | "hexa-skill" | "item" | "mob" | "skill";

const RESOURCE_BASE = process.env.NEXT_PUBLIC_RESOURCE_BASE ?? "https://haku.network";

export function resourceImageUrl(type: ResourceType, id: string, asset: string): string {
  return `${RESOURCE_BASE}/api/img/${type}/${id}/${asset}`;
}

// World map area mark (haku.network `ui/mark` namespace). IDs are looked up by hand
// from `manifests/v<version>/ui-mark.json` and hardcoded at the call site.
export function markIconUrl(id: string): string {
  return `${RESOURCE_BASE}/api/img/ui/mark/${id}/icon.png`;
}

// Boss Maple Guide icon (haku.network `ui/boss` namespace). IDs are looked up by hand
// from `manifests/v<version>/boss.json` and hardcoded at the call site.
export function bossIconUrl(id: string): string {
  return `${RESOURCE_BASE}/api/img/ui/boss/${id}/icon.png`;
}

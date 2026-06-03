// Builds image URLs served by the self-hosted MapleResource API (haku.network).
// IDs are looked up by hand from the committed manifests in `manifests/v<version>/`;
// see CLAUDE.md "Image Policy". Override the host with NEXT_PUBLIC_RESOURCE_BASE.

export type ResourceType = "familiar" | "hexa-skill" | "item" | "mob" | "skill";

const RESOURCE_BASE = process.env.NEXT_PUBLIC_RESOURCE_BASE ?? "https://haku.network";

export function resourceImageUrl(type: ResourceType, id: string, asset: string): string {
  return `${RESOURCE_BASE}/api/img/${type}/${id}/${asset}`;
}

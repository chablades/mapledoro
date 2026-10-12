// Builds image URLs served by the self-hosted MapleResource API (haku.network).
// IDs are looked up by hand from the committed manifests in `manifests/v<version>/`;
// see CLAUDE.md "Image Policy". Override the host with NEXT_PUBLIC_RESOURCE_BASE.

export type ResourceType = "erda-skill" | "familiar" | "hexa-skill" | "item" | "mob" | "skill";

// Exported for the root layout's <link rel="preconnect">, which needs only the
// origin: the browser derives that from the href itself, so this is passed
// through as-is rather than parsed (a malformed override should keep degrading
// to broken images, not throw at module load and take the app down).
export const RESOURCE_BASE = process.env.NEXT_PUBLIC_RESOURCE_BASE ?? "https://haku.network";

export function resourceImageUrl(type: ResourceType, id: string, asset: string): string {
  return `${RESOURCE_BASE}/api/img/${type}/${id}/${asset}`;
}

// World map area mark (haku.network `ui/mark` namespace). IDs are looked up by hand
// from `manifests/v<version>/ui-mark.json` and hardcoded at the call site.
export function markIconUrl(id: string): string {
  return `${RESOURCE_BASE}/api/img/ui/mark/${id}/icon.png`;
}

// Map art base (haku.network `map` namespace). TEMPORARY (MapGuessr testing): points at the copy
// bundled under public/map-guesser-test/ until the namespace is live on haku.network, which holds
// every world map screen but only the test puzzles' minimaps. Restore when testing is done:
// const MAP_ART_BASE = `${RESOURCE_BASE}/api/img/map`;
const MAP_ART_BASE = "/map-guesser-test";

// Field map minimap. Map ids are 9-digit, zero-padded on disk.
export function mapMinimapUrl(mapId: number): string {
  return `${MAP_ART_BASE}/${String(mapId).padStart(9, "0")}/minimap.png`;
}

// World map screen art, keyed by screen name ("WorldMap010").
export function worldMapUrl(screenId: string): string {
  return `${MAP_ART_BASE}/worldmap/${screenId}/base.png`;
}

// BGM track (haku.network `bgm` namespace), keyed "{group}/{track}" as in map/bgm manifests.
// Track names carry spaces and apostrophes, so each segment is encoded.
export function bgmTrackUrl(key: string): string {
  return `${RESOURCE_BASE}/api/bgm/${key.split("/").map(encodeURIComponent).join("/")}/track.mp3`;
}

// Boss Maple Guide icon (haku.network `ui/boss` namespace). IDs are looked up by hand
// from `manifests/v<version>/boss.json` and hardcoded at the call site.
export function bossIconUrl(id: string): string {
  return `${RESOURCE_BASE}/api/img/ui/boss/${id}/icon.png`;
}

// Builds image URLs served by the self-hosted MapleResource API (haku.network).
// IDs are looked up by hand from the committed manifests in `manifests/v<version>/`;
// see CLAUDE.md "Image Policy". Override the host with NEXT_PUBLIC_RESOURCE_BASE.

export type ResourceType = "erda-skill" | "familiar" | "hexa-skill" | "item" | "mob" | "skill" | "v-matrix";

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

// Boss Maple Guide icon (haku.network `ui/boss` namespace). IDs are looked up by hand
// from `manifests/v<version>/ui-boss.json` (named `boss.json` pre-v269) and hardcoded at
// the call site.
export function bossIconUrl(id: string): string {
  return `${RESOURCE_BASE}/api/img/ui/boss/${id}/icon.png`;
}

// Full illustrated boss splash/cover art (`ui/boss` namespace, `mob.png`) -- only present
// for entries whose manifest record has `hasSplash: true`.
export function bossSplashUrl(id: string): string {
  return `${RESOURCE_BASE}/api/img/ui/boss/${id}/mob.png`;
}

// Same boss sprite as bossIconUrl, but with that difficulty's ribbon/frame baked in. Easy
// through Extreme are real WZ assets under `ui/boss`; Destiny/Champion (tiers above Extreme)
// have no in-game badge, so they're hand-composited mapledoro-only art living in the `misc/boss`
// namespace instead (see `misc-boss.json`'s `_meta.note`).
const MISC_BOSS_DIFFICULTIES = new Set(["destiny", "champion"]);
export function bossDifficultyIconUrl(id: string, difficulty: string): string {
  const lower = difficulty.toLowerCase();
  const namespace = MISC_BOSS_DIFFICULTIES.has(lower) ? "misc/boss" : "ui/boss";
  return `${RESOURCE_BASE}/api/img/${namespace}/${id}/${lower}.png`;
}

// Background music track (haku.network `bgm` namespace, an mp3 rather than an image).
// The key is `{group}/{trackName}` from `manifests/v<version>/bgm.json` -- track names
// are NOT unique across groups, so both halves are required. Segments are encoded
// because track names contain spaces, apostrophes and `!`.
export function bgmTrackUrl(group: string, track: string): string {
  return `${RESOURCE_BASE}/api/bgm/${encodeURIComponent(group)}/${encodeURIComponent(track)}/track.mp3`;
}

// Familiar badge icon (haku.network `ui/familiar` namespace). IDs come from
// `manifests/v<version>/…` ui/familiar extraction; see BADGE_ID_MAP in familiarsData.ts.
export function familiarBadgeUrl(id: number): string {
  return `${RESOURCE_BASE}/api/img/ui/familiar/${id}/icon.png`;
}

// World/server icon (haku.network `misc` namespace, no `ui/` prefix). IDs are looked
// up by hand from `manifests/v<version>/misc-world.json` and hardcoded at the call site.
export function worldIconUrl(id: string): string {
  return `${RESOURCE_BASE}/api/img/misc/world/${id}/icon.png`;
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

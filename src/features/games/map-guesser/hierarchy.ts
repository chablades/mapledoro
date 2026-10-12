/*
  MapGuessr's world: the client's own world map screens (Maple World → Victoria
  Island → ...), generated from the WZ by scripts/generate-map-guesser-data.mjs.

  A map's path is its chain of screens from the world down to the screen it sits
  on, then the spot it sits at, then the map itself. Scoring compares guess and
  target paths level by level.
*/

import { WORLD_SCREENS } from "./world-data.generated";

export interface WorldSpot {
  /** Position in the screen art's image pixels. */
  x: number;
  y: number;
  label: string;
  /** Child screen this spot zooms into, if any. */
  child?: string;
  /** Guessable maps placed at this spot, as [mapId, name]. */
  maps: [number, string][];
}

export interface WorldScreen {
  id: string;
  label: string;
  /** Null for a world (root screen). */
  parent: string | null;
  /** Art size in image pixels. */
  w: number;
  h: number;
  spots: WorldSpot[];
}

interface MapLocation {
  name: string;
  screen: string;
  spot: number;
}

const SCREENS = new Map(WORLD_SCREENS.map((s) => [s.id, s]));

const LOCATIONS = new Map<number, MapLocation>();
for (const screen of WORLD_SCREENS) {
  screen.spots.forEach((spot, i) => {
    for (const [mapId, name] of spot.maps) LOCATIONS.set(mapId, { name, screen: screen.id, spot: i });
  });
}

export const WORLDS = WORLD_SCREENS.filter((s) => s.parent === null);

/** Every guessable map as [mapId, name]. */
export const ALL_MAPS: [number, string][] = WORLD_SCREENS.flatMap((s) => s.spots.flatMap((sp) => sp.maps));

export function getScreen(id: string): WorldScreen | undefined {
  return SCREENS.get(id);
}

export function childScreens(id: string): WorldScreen[] {
  return WORLD_SCREENS.filter((s) => s.parent === id);
}

/** Screen ids from the world down to `id`. */
export function screenChain(id: string): string[] {
  const chain: string[] = [];
  for (let cur = SCREENS.get(id); cur; cur = cur.parent ? SCREENS.get(cur.parent) : undefined) {
    chain.unshift(cur.id);
  }
  return chain;
}

export function mapName(mapId: number): string {
  return LOCATIONS.get(mapId)?.name ?? String(mapId);
}

export function mapLocation(mapId: number): MapLocation | undefined {
  return LOCATIONS.get(mapId);
}

/** One step of a map's path, with the label shown to players. */
export interface PathLevel {
  key: string;
  label: string;
}

/** World → ... → screen → spot → map. */
export function pathForMapId(mapId: number): PathLevel[] | null {
  const loc = LOCATIONS.get(mapId);
  if (!loc) return null;
  const screens = screenChain(loc.screen).map((id) => ({ key: id, label: SCREENS.get(id)!.label }));
  const spot = SCREENS.get(loc.screen)!.spots[loc.spot];
  return [
    ...screens,
    { key: `${loc.screen}#${loc.spot}`, label: spot.label },
    { key: String(mapId), label: loc.name },
  ];
}

/**
 * Where `mapId` shows up on `screenId`: its own spot when it sits on that screen,
 * else the spot that zooms toward it. Null when the screen has no marker for it.
 */
export function positionOn(screenId: string, mapId: number): { x: number; y: number } | null {
  const loc = LOCATIONS.get(mapId);
  const screen = SCREENS.get(screenId);
  if (!loc || !screen) return null;
  if (loc.screen === screenId) return screen.spots[loc.spot];
  const chain = screenChain(loc.screen);
  const next = chain[chain.indexOf(screenId) + 1];
  return (next && screen.spots.find((s) => s.child === next)) || null;
}

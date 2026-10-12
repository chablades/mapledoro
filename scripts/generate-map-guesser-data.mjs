/*
  Generates MapGuessr's world map data and obfuscated daily-puzzle payload.

  Usage: node scripts/generate-map-guesser-data.mjs

  Sources (dumped by mapledoro-image's MapExtractor):
  - manifests/v270/map.json — field map id -> name, street, bgm, minimapFrom. Only maps
    with a minimap image have an entry.
  - manifests/v270/map-worldmaps.json — the client's world map screens: parent screen,
    art size/origin, clickable spots (position + map ids), and links to child screens
    with their display names.

  World tree: every screen whose parent chain reaches one of ROOTS. Root screens have
  no name in the WZ, so ROOTS labels them by hand; every other screen is named by a
  MapLink tooltip, else by the titled spot on its parent that leads into it, else (for
  the few screens the client never links to) by its most common street name. Screens
  with nothing to guess are dropped, and so are untranslated KMS leftovers (Hangul names).

  Each named map is placed at its DEEPEST listing (parent screens roll up their
  children's maps, e.g. Maple World's "Victoria Island" spot lists all 384 Victoria
  maps). A spot whose maps mostly fall inside one child screen becomes a drill-in spot.
  MapLinks to screens that aren't children (Cernium <-> Burning Cernium) become `links`.

  Puzzle pool: placed maps with their own minimap that no other map borrows (so the
  image identifies exactly one map), minus "Hidden Street" quest maps. PUZZLE_COUNT are
  drawn in a seeded order; don't change SEED or the filters, or the daily order reshuffles.

  Output:
  - src/features/games/map-guesser/world-data.generated.ts — screens with spots and
    their guessable [mapId, name] pairs.
  - src/features/games/map-guesser/puzzle-data.generated.ts — base64(XOR(json)) of
    [mapId, street, bgm] tuples in daily order, so the answer isn't readable in the bundle.
*/

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUZZLE_COUNT = 365;
const SEED = 0x270;
const XOR_KEY = "mapledoro-map-guesser";

// Root screens offered as worlds, in tab order. Other parentless screens (event and
// overseas maps) are left out.
const ROOTS = [
  ["WorldMap", "Maple World"],
  ["GWorldMap", "Grandis"],
  ["WorldMap082", "Arcane River"],
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const maps = JSON.parse(readFileSync(join(ROOT, "manifests/v270/map.json"), "utf8")).entries;
const HANGUL = /[ㄱ-힝]/;
const isGuessable = (m) => maps[m]?.name && !HANGUL.test(maps[m].name) && !HANGUL.test(maps[m].street ?? "");
const worldmaps = JSON.parse(readFileSync(join(ROOT, "manifests/v270/map-worldmaps.json"), "utf8")).entries;

// ── World tree ──────────────────────────────────────────────────────────────

const rootLabels = new Map(ROOTS);
const children = new Map();
for (const [id, e] of Object.entries(worldmaps)) {
  if (e.parent) children.set(e.parent, [...(children.get(e.parent) ?? []), id]);
}

// Breadth-first from the roots: parents always precede children, roots in tab order.
const screens = [];
const depth = new Map();
for (const [rootId] of ROOTS) {
  if (!worldmaps[rootId]) throw new Error(`root screen ${rootId} missing from map-worldmaps.json`);
  depth.set(rootId, 0);
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    screens.push(id);
    for (const child of (children.get(id) ?? []).sort()) {
      depth.set(child, depth.get(id) + 1);
      queue.push(child);
    }
  }
}

// Each named map at its deepest listing; ties keep the first in tree order.
const placement = new Map(); // mapId -> { screen, spot }
for (const id of screens) {
  worldmaps[id].spots.forEach((spot, i) => {
    for (const mapId of spot.maps) {
      if (!isGuessable(mapId)) continue;
      const prev = placement.get(mapId);
      if (!prev || depth.get(id) > depth.get(prev.screen)) placement.set(mapId, { screen: id, spot: i });
    }
  });
}

// All maps listed anywhere in a screen's subtree, for matching spots to child screens.
const subtreeMaps = new Map();
for (const id of [...screens].reverse()) {
  const set = new Set(worldmaps[id].spots.flatMap((s) => s.maps));
  for (const child of children.get(id) ?? []) for (const m of subtreeMaps.get(child)) set.add(m);
  subtreeMaps.set(id, set);
}

function drillChild(screenId, spot) {
  let best = null;
  let bestOverlap = 0;
  for (const child of children.get(screenId) ?? []) {
    const sub = subtreeMaps.get(child);
    const overlap = spot.maps.filter((m) => sub.has(m)).length;
    if (overlap > bestOverlap) [best, bestOverlap] = [child, overlap];
  }
  return bestOverlap * 2 >= spot.maps.length ? best : null;
}

const labels = new Map(rootLabels);
for (const id of screens) {
  for (const link of worldmaps[id].links) {
    if (link.title && !labels.has(link.map)) labels.set(link.map, link.title);
  }
}
const spotChildren = new Map(); // screenId -> (spot index -> child id)
for (const id of screens) {
  const byIndex = new Map();
  worldmaps[id].spots.forEach((spot, i) => {
    const child = drillChild(id, spot);
    if (!child) return;
    byIndex.set(i, child);
    if (!labels.has(child) && spot.title) labels.set(child, spot.title);
  });
  spotChildren.set(id, byIndex);
}
for (const id of screens) {
  if (labels.has(id)) continue;
  const placed = [...placement.entries()].filter(([, p]) => p.screen === id).map(([m]) => m);
  const street = mostCommonStreet(placed.length ? placed : [...subtreeMaps.get(id)].filter(isGuessable));
  if (street) labels.set(id, street);
}

function mostCommonStreet(mapIds) {
  const counts = new Map();
  for (const m of mapIds) {
    const street = maps[m].street;
    if (street && street !== "Hidden Street") counts.set(street, (counts.get(street) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

const out = screens.map((id) => {
  const e = worldmaps[id];
  const spots = e.spots
    .map((spot, i) => {
      const child = spotChildren.get(id).get(i);
      const placed = spot.maps.filter((m) => placement.get(m)?.screen === id && placement.get(m).spot === i);
      if (!child && placed.length === 0) return null;
      const label = spot.title ?? (child ? labels.get(child) : mostCommonStreet(placed) ?? maps[placed[0]].name);
      return {
        x: e.origin[0] + spot.x,
        y: e.origin[1] + spot.y,
        label,
        ...(child ? { child } : {}),
        maps: placed.map((m) => [Number(m), maps[m].name]),
      };
    })
    .filter(Boolean);
  return { id, label: labels.get(id), parent: depth.get(id) === 0 ? null : e.parent, w: e.width, h: e.height, spots };
});

// Drop screens with nothing to guess anywhere beneath them (empty or untranslated-only),
// and unnamed ones: a screen the client never links to that only holds Hidden Street maps.
const hasContent = new Map();
for (const screen of [...out].reverse()) {
  const content =
    screen.spots.some((sp) => sp.maps.length) || out.some((c) => c.parent === screen.id && hasContent.get(c.id));
  if (content && !labels.has(screen.id)) console.warn(`WARNING: dropping unnamed screen ${screen.id}`);
  hasContent.set(screen.id, content && labels.has(screen.id));
}
const kept = out.filter((screen) => hasContent.get(screen.id));
for (const screen of kept) {
  const siblings = worldmaps[screen.id].links
    .map((l) => l.map)
    .filter((id) => hasContent.get(id) && worldmaps[id].parent !== screen.id && id !== screen.id);
  if (siblings.length) screen.links = [...new Set(siblings)];
  screen.spots = screen.spots
    .map(({ child, ...sp }) => (child && hasContent.get(child) ? { ...sp, child } : sp))
    .filter((sp) => sp.child || sp.maps.length);
}

// ── Puzzle pool ─────────────────────────────────────────────────────────────

const borrowed = new Set(Object.values(maps).map((e) => e.minimapFrom).filter(Boolean));
const keptIds = new Set(kept.map((screen) => screen.id));
const pool = [...placement.entries()]
  .filter(([, p]) => keptIds.has(p.screen))
  .map(([m]) => m)
  .filter((m) => !maps[m].minimapFrom && !borrowed.has(m) && maps[m].street !== "Hidden Street")
  .sort();
shuffle(pool, mulberry32(SEED));
pool.length = Math.min(pool.length, PUZZLE_COUNT);

// ── Emit ────────────────────────────────────────────────────────────────────

const worldPath = join(ROOT, "src/features/games/map-guesser/world-data.generated.ts");
writeFileSync(
  worldPath,
  `// AUTO-GENERATED by scripts/generate-map-guesser-data.mjs — do not edit.\n` +
    `// World map screens (art at /api/img/map/worldmap/{id}/base.png) with their spots in\n` +
    `// image pixels and the guessable [mapId, name] pairs placed at each spot.\n` +
    `import type { WorldScreen } from "./hierarchy";\n\n` +
    `export const WORLD_SCREENS: WorldScreen[] = ${JSON.stringify(kept)};\n`,
);

const payload = JSON.stringify(pool.map((m) => [Number(m), maps[m].street ?? null, maps[m].bgm ?? null]));
const bytes = Buffer.from(payload, "utf8");
for (let i = 0; i < bytes.length; i++) bytes[i] ^= XOR_KEY.charCodeAt(i % XOR_KEY.length);
const puzzlePath = join(ROOT, "src/features/games/map-guesser/puzzle-data.generated.ts");
writeFileSync(
  puzzlePath,
  `// AUTO-GENERATED by scripts/generate-map-guesser-data.mjs — do not edit.\n` +
    `// base64(XOR(json)) payload of [mapId, street, bgm] tuples in daily order;\n` +
    `// decoded by puzzles.ts. Obfuscated so the answer isn't trivially readable\n` +
    `// from the bundle or devtools.\n` +
    `export const MAP_GUESSER_PUZZLE_DATA =\n  "${bytes.toString("base64")}";\n`,
);

const guessable = kept.reduce((n, s) => n + s.spots.reduce((k, sp) => k + sp.maps.length, 0), 0);
console.log(`wrote ${kept.length} screens (${guessable} guessable maps) to ${worldPath}`);
console.log(`wrote ${pool.length} puzzles to ${puzzlePath}`);

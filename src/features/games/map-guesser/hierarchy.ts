/*
  Curated MapleStory world hierarchy for MapGuessr.

  Levels: World → Continent → Region → Field map (exact mapId).
  WZ only gives streetName/mapName; continents are curated from world-map UI.
  Stub pool — replace/expand when the map API lands.
*/

export type HierarchyLevel = "world" | "continent" | "region" | "map";

export interface HierarchyNode {
  id: string;
  label: string;
  level: HierarchyLevel;
  parentId: string | null;
  /** Present only on field maps. */
  mapId?: number;
  children: string[];
}

/** Path from world down to the leaf map: [world, continent, region, map]. */
export type MapPath = [string, string, string, string];

const LEVEL_LABELS: Record<HierarchyLevel, string> = {
  world: "World",
  continent: "Continent",
  region: "Region",
  map: "Map",
};

export function levelLabel(level: HierarchyLevel): string {
  return LEVEL_LABELS[level];
}

function n(
  id: string,
  label: string,
  level: HierarchyLevel,
  parentId: string | null,
  children: string[],
  mapId?: number,
): HierarchyNode {
  return { id, label, level, parentId, children, ...(mapId !== undefined ? { mapId } : {}) };
}

/**
 * Stub tree covering the color-feedback examples (Henesys vs Kerning vs Pantheon)
 * plus a thin Arcane River branch so all three worlds exist in the browser.
 */
export const HIERARCHY: Record<string, HierarchyNode> = {
  "maple-world": n("maple-world", "Maple World", "world", null, ["victoria", "ossyria"]),
  grandis: n("grandis", "Grandis", "world", null, ["eastern-grandis"]),
  "arcane-river": n("arcane-river", "Arcane River", "world", null, ["vanishing-journey"]),

  victoria: n("victoria", "Victoria Island", "continent", "maple-world", [
    "henesys",
    "kerning",
    "ellinia",
  ]),
  ossyria: n("ossyria", "Ossyria", "continent", "maple-world", ["orbis"]),

  "eastern-grandis": n("eastern-grandis", "Eastern Grandis", "continent", "grandis", [
    "pantheon",
  ]),

  "vanishing-journey": n(
    "vanishing-journey",
    "Vanishing Journey",
    "continent",
    "arcane-river",
    ["vj-lake"],
  ),

  henesys: n("henesys", "Henesys", "region", "victoria", [
    "100000000",
    "100010000",
    "100020000",
  ]),
  kerning: n("kerning", "Kerning City", "region", "victoria", ["103000000", "103010000"]),
  ellinia: n("ellinia", "Ellinia", "region", "victoria", ["101000000"]),
  orbis: n("orbis", "Orbis", "region", "ossyria", ["200000000"]),
  pantheon: n("pantheon", "Pantheon", "region", "eastern-grandis", ["400000000", "400010000"]),
  "vj-lake": n("vj-lake", "Lake of Oblivion", "region", "vanishing-journey", ["450001000"]),

  "100000000": n("100000000", "Henesys", "map", "henesys", [], 100000000),
  "100010000": n("100010000", "The Hill North of Henesys", "map", "henesys", [], 100010000),
  "100020000": n("100020000", "Henesys Hunting Ground I", "map", "henesys", [], 100020000),
  "103000000": n("103000000", "Kerning City", "map", "kerning", [], 103000000),
  "103010000": n("103010000", "Kerning City Subway", "map", "kerning", [], 103010000),
  "101000000": n("101000000", "Ellinia", "map", "ellinia", [], 101000000),
  "200000000": n("200000000", "Orbis", "map", "orbis", [], 200000000),
  "400000000": n("400000000", "Pantheon", "map", "pantheon", [], 400000000),
  "400010000": n("400010000", "Great Temple Interior", "map", "pantheon", [], 400010000),
  "450001000": n("450001000", "Lake of Oblivion", "map", "vj-lake", [], 450001000),
};

export const WORLD_IDS = ["maple-world", "grandis", "arcane-river"] as const;

export function getNode(id: string): HierarchyNode | undefined {
  return HIERARCHY[id];
}

export function getChildren(id: string): HierarchyNode[] {
  const node = HIERARCHY[id];
  if (!node) return [];
  return node.children.map((cid) => HIERARCHY[cid]).filter(Boolean);
}

/** Walk parents from a map node up to the world; returns path leaf→root flipped to root→leaf. */
export function pathForMapId(mapId: number): MapPath | null {
  const leaf = HIERARCHY[String(mapId)];
  if (!leaf || leaf.level !== "map") return null;
  const chain: string[] = [leaf.id];
  let cur: HierarchyNode | undefined = leaf;
  while (cur?.parentId) {
    chain.push(cur.parentId);
    cur = HIERARCHY[cur.parentId];
  }
  chain.reverse();
  if (chain.length !== 4) return null;
  return chain as MapPath;
}

export function displayNameForMapId(mapId: number): string {
  const leaf = HIERARCHY[String(mapId)];
  if (!leaf) return String(mapId);
  const region = leaf.parentId ? HIERARCHY[leaf.parentId] : undefined;
  if (region) return `${region.label} : ${leaf.label}`;
  return leaf.label;
}

/** All guessable field mapIds in the stub tree. */
export function allMapIds(): number[] {
  return Object.values(HIERARCHY)
    .filter((n) => n.level === "map" && n.mapId !== undefined)
    .map((n) => n.mapId as number);
}

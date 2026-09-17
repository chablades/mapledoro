/**
 * Erda Link tree layout for the SHINE classes (Erel Light, Sia Astelle).
 *
 * Both classes share one tree shape: the same slots in the same places, differing only in
 * which stone sits in a few of them (STR vs INT, Sentinel Rise vs Shine Boost, and so on).
 * Each slot therefore carries a node key per class ("IGNORE DEFENSE 3", "M1"), which is what
 * `erda-link-order.ts` is keyed by: every key there must be declared here.
 *
 * Positions are lattice coordinates; the canvas scales them. Edges follow the in-game tree.
 * Ultimate stones (M1/M2), boost stones and shinestones unlock on conditions rather than
 * adjacency, so they float unconnected.
 *
 * Icons: `erda-skill` ids (manifests/v271/erda-skill.json), rendered through
 * `erdaLinkIconUrl`, which picks the in-game `iconDisabled.png` for a stone that isn't
 * activated yet and `icon.png` once it is. Rush stones mostly only exist under Erel's folder
 * (18112); the stat art is class-agnostic so Sia borrows Erel's except for its own
 * LUK/INT/Magic ATT/Summon Duration stones (18212). A manifest entry doesn't guarantee an icon
 * on the host, so each id here was checked to resolve. Fragment of Distorted Time shares
 * Fruits of Mastery's art in game. Shinestones draw the `ui/erdalink/runestone` tier art by
 * level (`erdaLinkShinestoneUrl`); the core and the locked slot have no icon.
 */

import { erdaLinkRunestoneUrl, resourceImageUrl } from "../../../lib/mapleResource";
import type { ErdaLinkClassKey } from "./erda-link-order";

export type ErdaLinkNodeKind =
  /** Stat stone, one level. */
  | "rush"
  /** Big stat stone unlocked by a condition, one level. */
  | "boost"
  /** Levelled skill stone, up to 30. */
  | "skill"
  /** Half of a split skill stone (two stones sum to the skill's level), up to 15. */
  | "split"
  /** Shinestone slot, up to 20 (the guide covers the first four). */
  | "shinestone"
  /** The Erda Link core: drawn for the tree's shape, not a stone. */
  | "core"
  /** Empty locked slot under the core, with no stone yet: it anchors the core-to-DEX connector
   *  but is not drawn. */
  | "lock";

export interface ErdaLinkSlot {
  col: number;
  row: number;
  kind: ErdaLinkNodeKind;
  key: Record<ErdaLinkClassKey, string>;
  /** Display name per class; `label` covers stones whose stat depends on the class. */
  label: Record<ErdaLinkClassKey, string>;
  /** `erda-skill` id per class ("18112/rush/1"), or null for slots with no art on the host. */
  icon: Record<ErdaLinkClassKey, string | null>;
}

export const ERDA_LINK_MAX_LEVEL: Record<ErdaLinkNodeKind, number> = {
  rush: 1,
  boost: 1,
  skill: 30,
  split: 15,
  shinestone: 20,
  core: 0,
  lock: 0,
};

const EREL = "18112";
const SIA = "18212";

function erda(outerId: string, path: string): string {
  return `${outerId}/${path}`;
}

// Origin and Ascent are the one type the host serves no `iconDisabled.png` for.
const NO_DISABLED_ART = /\/origin\//;

export function erdaLinkHasDisabledArt(icon: string): boolean {
  return !NO_DISABLED_ART.test(icon);
}

// Every `iconDisabled.png` the tree uses is grey in the file itself except this one (Fruits
// of Mastery / Fragment of Distorted Time), which the tracker greys in CSS instead.
const COLOURED_DISABLED_ART = "18112/boost/300";

export function erdaLinkDisabledArtNeedsTint(icon: string): boolean {
  return icon === COLOURED_DISABLED_ART;
}

export interface ArtOffset {
  x: number;
  y: number;
}

// Art that doesn't fill its 32px canvas, so it sits off-centre when the box centres the canvas:
// Sacred Power (both states) has a transparent bottom row, and Sirius Boost's disabled art is
// a 31px-wide canvas missing its left column. Offsets are in source pixels, half the missing
// span, to bring the visible art back to centre.
const NO_OFFSET: ArtOffset = { x: 0, y: 0 };
const ART_OFFSET: Record<string, { active?: ArtOffset; disabled?: ArtOffset }> = {
  "18112/boost/303": { active: { x: 0, y: 0.5 }, disabled: { x: 0, y: 0.5 } },
  "18212/skill/101": { disabled: { x: 0.5, y: 0 } },
};

/** How far to nudge the icon, in source pixels, to centre the visible art. */
export function erdaLinkIconOffset(icon: string, active: boolean): ArtOffset {
  const entry = ART_OFFSET[icon];
  return (active ? entry?.active : entry?.disabled) ?? NO_OFFSET;
}

/** Shinestone slot art by level: locked, then the tiers at 1, 10 and 15. */
export function erdaLinkShinestoneUrl(level: number): string {
  if (level >= 15) return erdaLinkRunestoneUrl(3);
  if (level >= 10) return erdaLinkRunestoneUrl(2);
  if (level >= 1) return erdaLinkRunestoneUrl(1);
  return erdaLinkRunestoneUrl(0);
}

export function erdaLinkIconUrl(icon: string, active: boolean): string {
  const asset = active || !erdaLinkHasDisabledArt(icon) ? "icon.png" : "iconDisabled.png";
  return resourceImageUrl("erda-skill", icon, asset);
}

type Pair<T> = T | { erel: T; sia: T };
function pair<T>(v: Pair<T>): { erel: T; sia: T } {
  return typeof v === "object" && v !== null && "erel" in v ? v : { erel: v as T, sia: v as T };
}

function slot(
  col: number,
  row: number,
  kind: ErdaLinkNodeKind,
  key: Pair<string>,
  label: Pair<string>,
  icon: Pair<string | null>,
): ErdaLinkSlot {
  return { col, row, kind, key: pair(key), label: pair(label), icon: pair(icon) };
}

// Rush-stone art, shared by every stone of that stat.
const RUSH = {
  normalEnemy: erda(EREL, "rush/1"),
  exp: erda(EREL, "rush/2"),
  meso: erda(EREL, "rush/6"),
  drop: erda(EREL, "rush/8"),
  allStats: erda(EREL, "rush/14"),
  damage: erda(EREL, "rush/16"),
  // The manifest also lists rush/24 (the 1% variant) but the host has no icon for it, so
  // every Ignore Defense stone shares the 2% stone's art.
  ied: erda(EREL, "rush/23"),
  critDamage: erda(EREL, "rush/27"),
  bossDamage: erda(EREL, "rush/32"),
  // Sia's own Buff Duration entries (18212/rush/35, /42) have no icon on the host either.
  buffDuration: erda(EREL, "rush/33"),
  critRate: erda(EREL, "rush/34"),
  abnormal: erda(EREL, "rush/37"),
  summonDuration: erda(SIA, "rush/34"),
  mainStat: { erel: erda(EREL, "rush/13"), sia: erda(SIA, "rush/13") },
  secondaryStat: { erel: erda(EREL, "rush/12"), sia: erda(SIA, "rush/12") },
  attack: { erel: erda(EREL, "rush/46"), sia: erda(SIA, "rush/46") },
};

const MAIN_STAT = { erel: "STR", sia: "INT" };
const ATTACK = { erel: "Attack Power", sia: "Magic ATT" };

// One entry per slot, grouped by area. Column 0 is the far left; row 0 the top.
export const ERDA_LINK_SLOTS: readonly ErdaLinkSlot[] = [
  // ── Hub ──
  slot(8, 6, "core", "CORE", "Erda Link", null),
  slot(7, 5, "skill", "ORIGIN", { erel: "Fall of Melin", sia: "Celestial Design" }, { erel: erda(EREL, "origin/10000"), sia: erda(SIA, "origin/10000") }),
  slot(9, 5, "skill", "ASCENT", { erel: "Radiant Spear", sia: "Starlit Cosmos" }, { erel: erda(EREL, "origin/10001"), sia: erda(SIA, "origin/10001") }),
  slot(8, 4, "skill", "SOL HECATE", "Sol Hecate", erda(EREL, "skill/108")),
  slot(6, 6, "skill", "SOL JANUS", "Sol Janus", erda(EREL, "skill/100")),
  slot(10, 6, "skill", "TREE OF STARS", "SHINE Tree of Stars", erda(EREL, "skill/111")),
  slot(8, 8, "lock", "LOCK", "Empty slot", null),
  slot(6, 9, "skill", "M1", { erel: "SHINE Spear of Lugh", sia: "SHINE Ray" }, { erel: erda(EREL, "ultimate/500"), sia: erda(SIA, "ultimate/500") }),
  slot(12, 9, "skill", "M2", { erel: "SHINE Fury of Roan / Sting of Roan", sia: "SHINE Boom" }, { erel: erda(EREL, "ultimate/501"), sia: erda(SIA, "ultimate/501") }),

  // ── Left branch (drop / meso / EXP, plus the third skill stone) ──
  slot(5, 6, "rush", "NORMAL ENEMY DAMAGE 1", "Normal Enemy Damage", RUSH.normalEnemy),
  slot(4, 5, "rush", "EXP OBTAINED 1", "EXP Obtained", RUSH.exp),
  slot(4, 6, "rush", "EXP OBTAINED 2", "EXP Obtained", RUSH.exp),
  slot(4, 7, "rush", "EXP OBTAINED 3", "EXP Obtained", RUSH.exp),
  slot(2, 6, "rush", "EXP OBTAINED 4", "EXP Obtained", RUSH.exp),
  slot(2, 5, "rush", "ITEM DROP RATE 1", "Item Drop Rate", RUSH.drop),
  slot(1, 5, "rush", "NORMAL ENEMY DAMAGE 2", "Normal Enemy Damage", RUSH.normalEnemy),
  slot(0, 5, "rush", "ITEM DROP RATE 2", "Item Drop Rate", RUSH.drop),
  slot(2, 4, "rush", "MESO DROP 1", "Mesos Obtained", RUSH.meso),
  slot(1, 4, "rush", "MESO DROP 2", "Mesos Obtained", RUSH.meso),
  slot(1, 3, "rush", "NORMAL ENEMY DAMAGE 3", "Normal Enemy Damage", RUSH.normalEnemy),
  slot(3, 4, "rush", "NORMAL ENEMY DAMAGE 4", "Normal Enemy Damage", RUSH.normalEnemy),
  slot(2, 3, "rush", "ITEM DROP RATE 4", "Item Drop Rate", RUSH.drop),
  slot(1, 2, "rush", "ITEM DROP RATE 3", "Item Drop Rate", RUSH.drop),
  slot(5, 1, "rush", "NORMAL ENEMY DAMAGE 5", "Normal Enemy Damage", RUSH.normalEnemy),
  slot(3, 3, "skill", { erel: "ETERNAL LIGHT", sia: "SIRIUS BOOST" }, { erel: "Eternal Light", sia: "Stellar XI - Sirius Boost" }, { erel: erda(EREL, "skill/101"), sia: erda(SIA, "skill/101") }),
  slot(4, 3, "boost", "FRUITS OF MASTERY", "Fruits of Mastery", erda(EREL, "boost/300")),

  // ── Top-middle (above Sol Hecate) ──
  slot(8, 3, "rush", "BUFF DURATION 2", "Buff Duration", RUSH.buffDuration),
  slot(7, 2, "rush", { erel: "CRITICAL RATE 1", sia: "SUMMON DURATION 1" }, { erel: "Critical Rate", sia: "Summon Duration" }, { erel: RUSH.critRate, sia: RUSH.summonDuration }),
  slot(8, 2, "rush", "BUFF DURATION 1", "Buff Duration", RUSH.buffDuration),
  slot(9, 2, "rush", { erel: "CRITICAL RATE 2", sia: "SUMMON DURATION 2" }, { erel: "Critical Rate", sia: "Summon Duration" }, { erel: RUSH.critRate, sia: RUSH.summonDuration }),
  slot(8, 1, "split", { erel: "DESTRUCTION OF ROAN 1", sia: "SAVIOR'S CIRCLE 1" }, { erel: "Destruction of Roan (1)", sia: "Savior's Circle Boost (1)" }, { erel: erda(EREL, "skill/106"), sia: erda(SIA, "skill/106") }),

  // ── Top-right ──
  slot(11, 1, "rush", { erel: "CRITICAL RATE 4", sia: "SUMMON DURATION 4" }, { erel: "Critical Rate", sia: "Summon Duration" }, { erel: RUSH.critRate, sia: RUSH.summonDuration }),
  slot(11, 0, "rush", { erel: "ABNORMAL STATUS DAMAGE BOOST 1", sia: "SUMMON DURATION 3" }, { erel: "Abnormal Status Damage", sia: "Summon Duration" }, { erel: RUSH.abnormal, sia: RUSH.summonDuration }),
  slot(12, 0, "rush", "BUFF DURATION 3", "Buff Duration", RUSH.buffDuration),
  slot(13, 0, "rush", { erel: "SUMMON DURATION 1", sia: "BUFF DURATION 4" }, { erel: "Buff Duration", sia: "Buff Duration" }, RUSH.buffDuration),
  slot(12, 1, "rush", { erel: "ABNORMAL STATUS DAMAGE BOOST 2", sia: "SUMMON DURATION 5" }, { erel: "Abnormal Status Damage", sia: "Summon Duration" }, { erel: RUSH.abnormal, sia: RUSH.summonDuration }),
  slot(13, 1, "rush", { erel: "CRITICAL RATE 3", sia: "BUFF DURATION 5" }, { erel: "Critical Rate", sia: "Buff Duration" }, { erel: RUSH.critRate, sia: RUSH.buffDuration }),
  slot(14, 1, "split", { erel: "DESTRUCTION OF ROAN 2", sia: "SAVIOR'S CIRCLE 2" }, { erel: "Destruction of Roan (2)", sia: "Savior's Circle Boost (2)" }, { erel: erda(EREL, "skill/106"), sia: erda(SIA, "skill/106") }),
  slot(11, 2, "rush", { erel: "BUFF DURATION 5", sia: "ABNORMAL STATUS DAMAGE BOOST 1" }, { erel: "Buff Duration", sia: "Abnormal Status Damage" }, { erel: RUSH.buffDuration, sia: RUSH.abnormal }),
  slot(12, 2, "rush", "BUFF DURATION 6", "Buff Duration", RUSH.buffDuration),
  slot(13, 2, "rush", { erel: "ABNORMAL STATUS DAMAGE BOOST 3", sia: "ABNORMAL STATUS DAMAGE BOOST 2" }, "Abnormal Status Damage", RUSH.abnormal),
  slot(14, 2, "boost", { erel: "STR 4", sia: "INT 4" }, { erel: "STR +1000", sia: "INT +1000" }, RUSH.mainStat),
  slot(12, 3, "boost", "BOSS DAMAGE 1", "Boss Damage +10%", RUSH.bossDamage),

  // ── Right branch (IED / crit damage / boss) ──
  slot(11, 6, "rush", "IGNORE DEFENSE 1", "Ignore Defense +2%", RUSH.ied),
  slot(12, 5, "rush", "IGNORE DEFENSE 2", "Ignore Defense", RUSH.ied),
  slot(12, 6, "rush", "IGNORE DEFENSE 3", "Ignore Defense", RUSH.ied),
  slot(12, 7, "rush", "IGNORE DEFENSE 4", "Ignore Defense", RUSH.ied),
  slot(14, 6, "split", { erel: "ETERNAL GUARDIAN 1", sia: "SADALSUUD 1" }, { erel: "Eternal Guardian (1)", sia: "Stellar XII - Sadalsuud Boost (1)" }, { erel: erda(EREL, "skill/104"), sia: erda(SIA, "skill/104") }),
  slot(14, 7, "rush", "CRITICAL DAMAGE 1", "Critical Damage", RUSH.critDamage),
  slot(15, 7, "rush", "IGNORE DEFENSE 5", "Ignore Defense", RUSH.ied),
  slot(16.5, 7, "rush", "BOSS DAMAGE 2", "Boss Damage", RUSH.bossDamage),
  slot(13, 8, "rush", "CRITICAL DAMAGE 2", "Critical Damage", RUSH.critDamage),
  slot(14, 8, "rush", "CRITICAL DAMAGE 3", "Critical Damage", RUSH.critDamage),
  slot(15, 8, "rush", "IGNORE DEFENSE 6", "Ignore Defense", RUSH.ied),
  slot(13, 9, "split", { erel: "ETERNAL GUARDIAN 2", sia: "SADALSUUD 2" }, { erel: "Eternal Guardian (2)", sia: "Stellar XII - Sadalsuud Boost (2)" }, { erel: erda(EREL, "skill/104"), sia: erda(SIA, "skill/104") }),
  slot(14, 9, "rush", "CRITICAL DAMAGE 4", "Critical Damage", RUSH.critDamage),
  slot(15, 9, "rush", "BOSS DAMAGE 3", "Boss Damage", RUSH.bossDamage),
  slot(15, 10, "rush", "BOSS DAMAGE 4", "Boss Damage", RUSH.bossDamage),
  slot(16.5, 11, "boost", "FRAGMENT OF DISTORTED TIME", "Fragment of Distorted Time", erda(EREL, "boost/300")),

  // ── Bottom branch (stats / attack / damage, plus the split skill stone) ──
  slot(8, 9, "rush", { erel: "DEX 1", sia: "LUK 1" }, { erel: "DEX +200", sia: "LUK +200" }, RUSH.secondaryStat),
  slot(7, 10, "rush", { erel: "STR 1", sia: "INT 1" }, MAIN_STAT, RUSH.mainStat),
  slot(8, 10, "rush", "ALL STATS 1", "All Stats", RUSH.allStats),
  slot(9, 10, "rush", { erel: "STR 2", sia: "INT 2" }, MAIN_STAT, RUSH.mainStat),
  slot(8, 11, "split", { erel: "SENTINEL RISE 1", sia: "SHINE BOOST 1" }, { erel: "Sentinel Rise (1)", sia: "Shine Boost (1)" }, { erel: erda(EREL, "skill/102"), sia: erda(SIA, "skill/102") }),
  slot(5, 11, "rush", { erel: "STR 3", sia: "INT 3" }, MAIN_STAT, RUSH.mainStat),
  slot(5, 10, "rush", "DAMAGE PERCENTILE 1", "Damage", RUSH.damage),
  slot(5, 12, "rush", "DAMAGE PERCENTILE 2", "Damage", RUSH.damage),
  slot(4, 10, "rush", "ALL STATS 2", "All Stats", RUSH.allStats),
  slot(4, 12, "rush", "ALL STATS 3", "All Stats", RUSH.allStats),
  slot(4, 11, "rush", "DAMAGE PERCENTILE 3", "Damage", RUSH.damage),
  slot(3, 10, "rush", { erel: "WEAPON ATT 1", sia: "MAGIC ATT 1" }, ATTACK, RUSH.attack),
  slot(3, 12, "rush", { erel: "WEAPON ATT 2", sia: "MAGIC ATT 2" }, ATTACK, RUSH.attack),
  slot(3, 11, "rush", "DAMAGE PERCENTILE 4", "Damage", RUSH.damage),
  slot(2, 11, "split", { erel: "SENTINEL RISE 2", sia: "SHINE BOOST 2" }, { erel: "Sentinel Rise (2)", sia: "Shine Boost (2)" }, { erel: erda(EREL, "skill/102"), sia: erda(SIA, "skill/102") }),
  slot(2, 10, "boost", { erel: "WEAPON ATT 3", sia: "MAGIC ATT 3" }, { erel: "Attack Power +20", sia: "Magic ATT +20" }, RUSH.attack),
  slot(4, 9, "boost", "SACRED POWER", "Sacred Power +10", erda(EREL, "boost/303")),

  // ── Shinestones (a row of their own under the tree) ──
  slot(10, 12, "shinestone", "SHINESTONE 1", "Shinestone 1", null),
  slot(11, 12, "shinestone", "SHINESTONE 2", "Shinestone 2", null),
  slot(12, 12, "shinestone", "SHINESTONE 3", "Shinestone 3", null),
  slot(13, 12, "shinestone", "SHINESTONE 4", "Shinestone 4", null),
  slot(14, 12, "shinestone", "SHINESTONE 5", "Shinestone 5", null),
  slot(15, 12, "shinestone", "SHINESTONE 6", "Shinestone 6", null),
];

/**
 * Connectors, as pairs of Erel keys (the Sia key is whatever sits in the same slot).
 * Grouped by area; a stone listed against several neighbours is a
 * junction bar. Ultimate, boost and shinestone slots have none.
 */
export const ERDA_LINK_EDGES: readonly (readonly [string, string])[] = [
  // Hub
  ["ORIGIN", "CORE"],
  ["ASCENT", "CORE"],
  ["SOL HECATE", "CORE"],
  ["SOL JANUS", "CORE"],
  ["TREE OF STARS", "CORE"],
  ["LOCK", "CORE"],
  // Left branch
  ["NORMAL ENEMY DAMAGE 1", "SOL JANUS"],
  ["EXP OBTAINED 2", "NORMAL ENEMY DAMAGE 1"],
  ["EXP OBTAINED 1", "EXP OBTAINED 2"],
  ["EXP OBTAINED 3", "EXP OBTAINED 2"],
  ["EXP OBTAINED 4", "EXP OBTAINED 2"],
  ["ITEM DROP RATE 1", "EXP OBTAINED 4"],
  ["NORMAL ENEMY DAMAGE 2", "EXP OBTAINED 4"],
  ["ITEM DROP RATE 2", "NORMAL ENEMY DAMAGE 2"],
  ["MESO DROP 1", "ITEM DROP RATE 1"],
  ["MESO DROP 2", "NORMAL ENEMY DAMAGE 2"],
  ["NORMAL ENEMY DAMAGE 4", "MESO DROP 1"],
  ["ETERNAL LIGHT", "NORMAL ENEMY DAMAGE 4"],
  ["ITEM DROP RATE 4", "MESO DROP 1"],
  ["NORMAL ENEMY DAMAGE 3", "MESO DROP 2"],
  ["NORMAL ENEMY DAMAGE 3", "ITEM DROP RATE 4"],
  ["ITEM DROP RATE 3", "NORMAL ENEMY DAMAGE 3"],
  // Top-middle
  ["BUFF DURATION 2", "SOL HECATE"],
  ["CRITICAL RATE 1", "BUFF DURATION 2"],
  ["BUFF DURATION 1", "BUFF DURATION 2"],
  ["CRITICAL RATE 2", "BUFF DURATION 2"],
  ["DESTRUCTION OF ROAN 1", "CRITICAL RATE 1"],
  ["DESTRUCTION OF ROAN 1", "BUFF DURATION 1"],
  ["DESTRUCTION OF ROAN 1", "CRITICAL RATE 2"],
  // Top-right
  ["CRITICAL RATE 4", "DESTRUCTION OF ROAN 1"],
  ["ABNORMAL STATUS DAMAGE BOOST 1", "CRITICAL RATE 4"],
  ["BUFF DURATION 5", "CRITICAL RATE 4"],
  ["BUFF DURATION 3", "ABNORMAL STATUS DAMAGE BOOST 1"],
  ["SUMMON DURATION 1", "BUFF DURATION 3"],
  ["ABNORMAL STATUS DAMAGE BOOST 2", "BUFF DURATION 3"],
  ["CRITICAL RATE 3", "ABNORMAL STATUS DAMAGE BOOST 2"],
  ["DESTRUCTION OF ROAN 2", "CRITICAL RATE 3"],
  ["BUFF DURATION 6", "ABNORMAL STATUS DAMAGE BOOST 2"],
  ["BUFF DURATION 6", "BUFF DURATION 5"],
  ["ABNORMAL STATUS DAMAGE BOOST 3", "BUFF DURATION 6"],
  // Right branch
  ["IGNORE DEFENSE 1", "TREE OF STARS"],
  ["IGNORE DEFENSE 3", "IGNORE DEFENSE 1"],
  ["IGNORE DEFENSE 2", "IGNORE DEFENSE 3"],
  ["IGNORE DEFENSE 4", "IGNORE DEFENSE 3"],
  ["ETERNAL GUARDIAN 1", "IGNORE DEFENSE 3"],
  ["IGNORE DEFENSE 5", "ETERNAL GUARDIAN 1"],
  ["CRITICAL DAMAGE 1", "ETERNAL GUARDIAN 1"],
  ["BOSS DAMAGE 2", "IGNORE DEFENSE 5"],
  ["IGNORE DEFENSE 6", "IGNORE DEFENSE 5"],
  ["BOSS DAMAGE 3", "IGNORE DEFENSE 6"],
  ["BOSS DAMAGE 4", "BOSS DAMAGE 3"],
  ["CRITICAL DAMAGE 4", "BOSS DAMAGE 3"],
  ["CRITICAL DAMAGE 3", "CRITICAL DAMAGE 4"],
  ["CRITICAL DAMAGE 1", "CRITICAL DAMAGE 3"],
  ["CRITICAL DAMAGE 2", "CRITICAL DAMAGE 3"],
  ["ETERNAL GUARDIAN 2", "CRITICAL DAMAGE 2"],
  // Bottom branch
  ["DEX 1", "LOCK"],
  ["STR 1", "DEX 1"],
  ["ALL STATS 1", "DEX 1"],
  ["STR 2", "DEX 1"],
  ["SENTINEL RISE 1", "STR 1"],
  ["SENTINEL RISE 1", "ALL STATS 1"],
  ["SENTINEL RISE 1", "STR 2"],
  ["STR 3", "SENTINEL RISE 1"],
  ["DAMAGE PERCENTILE 1", "STR 3"],
  ["DAMAGE PERCENTILE 2", "STR 3"],
  ["ALL STATS 2", "DAMAGE PERCENTILE 1"],
  ["ALL STATS 3", "DAMAGE PERCENTILE 2"],
  ["DAMAGE PERCENTILE 3", "ALL STATS 2"],
  ["DAMAGE PERCENTILE 3", "ALL STATS 3"],
  ["WEAPON ATT 1", "ALL STATS 2"],
  ["WEAPON ATT 2", "ALL STATS 3"],
  ["DAMAGE PERCENTILE 4", "DAMAGE PERCENTILE 3"],
  ["SENTINEL RISE 2", "DAMAGE PERCENTILE 4"],
];

/**
 * Which stones fill each slot of the HEXA tracker's level shape (`HexaSkillLevels`), which the
 * character overview and the Scouter read. Order matches the class's entry in
 * `hexa-classes.ts`: mastery = the two ultimate stones, enhancement = the four skill stones
 * (a split pair sums to the skill's level), common = Sol Janus, Sol Hecate, Tree of Stars.
 */
export const ERDA_LINK_HEXA_SLOTS: Record<
  ErdaLinkClassKey,
  { origin: string; ascent: string; mastery: string[][]; enhancement: string[][]; common: string[][] }
> = {
  erel: {
    origin: "ORIGIN",
    ascent: "ASCENT",
    mastery: [["M1"], ["M2"]],
    enhancement: [["ETERNAL LIGHT"], ["SENTINEL RISE 1", "SENTINEL RISE 2"], ["ETERNAL GUARDIAN 1", "ETERNAL GUARDIAN 2"], ["DESTRUCTION OF ROAN 1", "DESTRUCTION OF ROAN 2"]],
    common: [["SOL JANUS"], ["SOL HECATE"], ["TREE OF STARS"]],
  },
  sia: {
    origin: "ORIGIN",
    ascent: "ASCENT",
    mastery: [["M1"], ["M2"]],
    enhancement: [["SHINE BOOST 1", "SHINE BOOST 2"], ["SIRIUS BOOST"], ["SADALSUUD 1", "SADALSUUD 2"], ["SAVIOR'S CIRCLE 1", "SAVIOR'S CIRCLE 2"]],
    common: [["SOL JANUS"], ["SOL HECATE"], ["TREE OF STARS"]],
  },
};

/** Which Erda Link data a HEXA class name maps to, or null for non-SHINE classes. */
export function erdaLinkClassKey(className: string | null): ErdaLinkClassKey | null {
  if (className === "Erel Light") return "erel";
  if (className === "Sia Astelle") return "sia";
  return null;
}

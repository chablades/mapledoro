/*
  Special skill rings (the Oz rings and their relatives) and the extra skill ring slot.

  In game only one special skill ring fits in the 4 ring slots. A Lv. 4+ Ring of Restraint or
  Continuous Ring then unlocks one more, the skill ring slot (the cog on that ring's tile):
  Restraint's takes a passive ring, Continuous's an active one. Both rules are in the two rings'
  own item text (manifests/v272/item.json). Active rings have a skill you use (Restraint, Weapon
  Jump, Roro's rings, the old Oz rings); passive ones trigger on their own (Continuous).

  Item ids from manifests/v272/item.json (Character/Ring).
*/

export type SkillRingKind = "active" | "passive";

// Ring of Restraint, Challenger Ring of Restraint / Continuous Ring, Challenger Continuous Ring.
const SKILL_SLOT_BY_HOST: Partial<Record<string, SkillRingKind>> = {
  "01113098": "passive", "01113344": "passive",
  "01113329": "active", "01113345": "active",
};

const PASSIVE_RINGS = new Set<string>([
  "01113329", // Continuous Ring
  "01113345", // Challenger Continuous Ring
  "01113362", // Libae's Prototype C Ring
  "01113355", // Infinite Red Beryl Ring
]);

const ACTIVE_RINGS = new Set<string>([
  "01113098", "01113344", // Ring of Restraint, Challenger Ring of Restraint
  "01113113", "01113114", "01113115", "01113116", // Weapon Jump S/D/I/L Ring
  "01113346", "01113347", "01113348", "01113349", // Challenger Weapon Jump S/D/I/L Ring
  "01113357", "01113358", "01113359", // Roro's Experience / Hunting / Thunder Ring
  "01113356", // Finite Red Beryl Ring (Restraint's zone; the Infinite one is Continuous-like)
  "01113361", "01113363", "01113364", "01113365", "01113366", // Libae's Prototype R, W-S/D/I/L Ring
  // The older Oz rings, Ultimatum Ring through Tower Boost Ring.
  "01113099", "01113100", "01113101", "01113102", "01113103", "01113104", "01113105",
  "01113106", "01113107", "01113108", "01113109", "01113110", "01113111", "01113112",
  "01113117", "01113118", "01113119", "01113120", "01113121", "01113122", "01113123",
  "01113124", "01113125", "01113126", "01113127", "01113128",
]);

/** The Oz Rings step's levels, keyed like StoredOzRings.levels. */
export type OzRingLevels = Partial<Record<string, number>>;

// Which Oz Rings step level an equipped ring shows. The Challenger versions and every Weapon
// Jump letter share their ring's one level; rings the step doesn't cover show none.
const OZ_LEVEL_KEY: Partial<Record<string, string>> = {
  "01113098": "restraint", "01113344": "restraint",
  "01113329": "continuous", "01113345": "continuous",
  "01113113": "weaponJump", "01113114": "weaponJump", "01113115": "weaponJump", "01113116": "weaponJump",
  "01113346": "weaponJump", "01113347": "weaponJump", "01113348": "weaponJump", "01113349": "weaponJump",
};

/** The level to show on an equipped Oz Ring, from the Oz Rings step; null when unset or 0. */
export function equippedOzLevel(id: string | undefined, levels: OzRingLevels | undefined): number | null {
  const key = id ? OZ_LEVEL_KEY[id] : undefined;
  const level = key ? levels?.[key] : undefined;
  return level && level > 0 ? level : null;
}

export function isSpecialSkillRing(id: string | undefined): boolean {
  return !!id && (ACTIVE_RINGS.has(id) || PASSIVE_RINGS.has(id));
}

/** The kind of ring a host ring's skill ring slot takes, or null if it doesn't unlock one. */
export function skillSlotKind(hostId: string | undefined): SkillRingKind | null {
  return (hostId && SKILL_SLOT_BY_HOST[hostId]) || null;
}

export function fitsSkillSlot(kind: SkillRingKind, id: string): boolean {
  return kind === "active" ? ACTIVE_RINGS.has(id) : PASSIVE_RINGS.has(id);
}

const RING_KEYS = ["ring1", "ring2", "ring3", "ring4"] as const;
type RingKey = (typeof RING_KEYS)[number];
type RingGrid = Partial<Record<RingKey | "skillRing", { id: string } | null | undefined>>;

/** The ring slot whose ring unlocks the skill ring slot: the first Restraint or Continuous. */
export function skillRingHost(grid: RingGrid): RingKey | null {
  return RING_KEYS.find((key) => skillSlotKind(grid[key]?.id) !== null) ?? null;
}

/** The kind of ring this grid's skill ring slot takes, or null when no ring unlocks it. */
export function gridSkillSlotKind(grid: RingGrid): SkillRingKind | null {
  const host = skillRingHost(grid);
  return host ? skillSlotKind(grid[host]?.id) : null;
}

/** Whether the grid's skill ring still has a slot that takes it, after a ring changed. */
export function skillRingFits(grid: RingGrid): boolean {
  const ring = grid.skillRing;
  if (!ring) return true;
  const kind = gridSkillSlotKind(grid);
  return kind !== null && fitsSkillSlot(kind, ring.id);
}

/** Whether another of the 4 ring slots already holds a special skill ring, which then can't go
 *  in this one. */
export function specialRingElsewhere(grid: RingGrid, slot: RingKey): boolean {
  return RING_KEYS.some((key) => key !== slot && isSpecialSkillRing(grid[key]?.id));
}

export function isRingKey(slot: string): slot is RingKey {
  return (RING_KEYS as readonly string[]).includes(slot);
}

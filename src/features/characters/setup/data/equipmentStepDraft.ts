/*
  Draft types and serialization for the equipment setup step.
  Pulled out of EquipmentSetupStep.tsx (a component file) so Fast Refresh can
  preserve component state there — react-doctor's only-export-components rule
  flags non-component exports living in a component file.
*/

import type { StoredCharacterEquipment, StoredEquipmentItem, StoredEquipmentPreset } from "../../model/charactersStore";
import type { SymbolState } from "../../../tools/symbols/useSymbolState";

export type SlotKey =
  | "ring1" | "ring2" | "ring3" | "ring4"
  | "face" | "eye" | "earring" | "pendant1" | "pendant2" | "belt" | "pocket"
  | "hat" | "cape" | "top" | "glove" | "bottom" | "shoe" | "shoulder" | "medal"
  | "weapon" | "secondary" | "emblem" | "android" | "heart" | "badge" | "title"
  | "totem1" | "totem2" | "totem3"
  | "pet1" | "pet2" | "pet3" | "petEquip1" | "petEquip2" | "petEquip3";

// Title, totems, pets, pet equips, and symbols are shared across presets; the grid slots swap per preset.
export type SharedSlotKey = "title" | "totem1" | "totem2" | "totem3" | "pet1" | "pet2" | "pet3" | "petEquip1" | "petEquip2" | "petEquip3";

export interface EquipmentItem {
  id: string;
  name: string;
}

export type SlotMap = Partial<Record<SlotKey, EquipmentItem | null>>;

const SHARED_SLOTS: ReadonlySet<SlotKey> = new Set<SlotKey>(["title", "totem1", "totem2", "totem3", "pet1", "pet2", "pet3", "petEquip1", "petEquip2", "petEquip3"]);
export const isSharedSlot = (slot: SlotKey): slot is SharedSlotKey => SHARED_SLOTS.has(slot);

export function sameItem(a: EquipmentItem | null | undefined, b: EquipmentItem | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.id === b.id && a.name === b.name;
}

export interface EquipmentDraft extends Partial<Record<SharedSlotKey, EquipmentItem | null>> {
  /** Three equipment-grid presets. Presets 1-2 are sparse — a slot key is only present
   *  once explicitly touched in that preset; untouched slots mirror preset 0 live (see
   *  activeGrid in EquipmentSetupStep.tsx), matching in-game behavior where each slot
   *  mirrors independently rather than a whole preset diverging at once. */
  presets?: SlotMap[];
  /** Which preset (0-2) is being edited / is primary. */
  activePreset?: number;
  /** Symbol levels keyed by region name; folded into the calculator's tools.symbols on
   *  finish. String, not number — blank until touched, matching Oz Rings; the
   *  controller converts to real numbers when building tools.symbols. */
  symbolLevels?: Record<string, string>;
  /** Scouter-only weapon ATT/MATT, asked inline when picking a weapon in preset 1 (see
   *  WeaponAttStepView) — not equipment data, folded into `scouter.weaponAtt` on finish. */
  weaponAtt?: string;
}

export function parseEquipmentStepDraft(raw: string): EquipmentDraft {
  try { return JSON.parse(raw) as EquipmentDraft; } catch { return {}; }
}

export function serializeEquipmentStepDraft(draft: EquipmentDraft): string {
  return JSON.stringify(draft);
}

function toDraftItem(item: StoredEquipmentItem | null): EquipmentItem | null {
  if (!item) return null;
  return { id: item.id ?? "", name: item.name };
}

function storedPresetToDraft(preset: StoredEquipmentPreset): SlotMap {
  return {
    ring1: toDraftItem(preset.rings[0]), ring2: toDraftItem(preset.rings[1]),
    ring3: toDraftItem(preset.rings[2]), ring4: toDraftItem(preset.rings[3]),
    face: toDraftItem(preset.face), eye: toDraftItem(preset.eye), earring: toDraftItem(preset.earring),
    pendant1: toDraftItem(preset.pendants[0]), pendant2: toDraftItem(preset.pendants[1]),
    belt: toDraftItem(preset.belt), pocket: toDraftItem(preset.pocket),
    hat: toDraftItem(preset.hat), cape: toDraftItem(preset.cape), top: toDraftItem(preset.top),
    glove: toDraftItem(preset.glove), bottom: toDraftItem(preset.bottom), shoe: toDraftItem(preset.shoe),
    shoulder: toDraftItem(preset.shoulder), medal: toDraftItem(preset.medal),
    weapon: toDraftItem(preset.weapon), secondary: toDraftItem(preset.secondary), emblem: toDraftItem(preset.emblem),
    android: toDraftItem(preset.android), heart: toDraftItem(preset.heart), badge: toDraftItem(preset.badge),
  };
}

/** Presets 1-2 are stored dense (every slot resolved, see draftPresetToStored's own
 *  fallback-to-base merge in useCharacterSetupController.ts), but the draft/activeGrid
 *  model needs them sparse — only a slot actually diverged from preset 0 should appear,
 *  so untouched slots keep mirroring preset 0 live. Diffs the stored preset against the
 *  stored base and keeps only the slots that differ. */
function storedPresetOverlayToDraft(preset: StoredEquipmentPreset, base: StoredEquipmentPreset): SlotMap {
  const full = storedPresetToDraft(preset);
  const baseFull = storedPresetToDraft(base);
  const overlay: SlotMap = {};
  for (const key of Object.keys(full) as (keyof SlotMap)[]) {
    if (!sameItem(full[key], baseFull[key])) overlay[key] = full[key];
  }
  return overlay;
}

/** Reverse of parseEquipmentStepDraft/applyEquipmentDraftToRoster — rebuilds this
 *  step's draft shape from a character's already-saved equipment/symbols/weapon ATT,
 *  so the mount-time backfill in EquipmentSetupStep.tsx (matching V Matrix/HEXA
 *  Matrix/Familiars' own pattern) can seed an edit session from real data instead of
 *  landing blank. Without this, editing an already-equipped character's gear started
 *  blank, and finishing without re-picking every slot wholesale-replaced the stored
 *  equipment with whatever partial state was typed (applyEquipmentDraftToRoster does a
 *  full replace, not a merge). */
export function storedEquipmentToDraft(
  equipment: StoredCharacterEquipment,
  symbols: Record<string, SymbolState> | undefined,
  weaponAtt: number | undefined,
): EquipmentDraft {
  return {
    presets: [
      storedPresetToDraft(equipment.presets[0]),
      storedPresetOverlayToDraft(equipment.presets[1], equipment.presets[0]),
      storedPresetOverlayToDraft(equipment.presets[2], equipment.presets[0]),
    ],
    activePreset: 0,
    title: toDraftItem(equipment.title),
    totem1: toDraftItem(equipment.totems[0]), totem2: toDraftItem(equipment.totems[1]), totem3: toDraftItem(equipment.totems[2]),
    pet1: toDraftItem(equipment.pets[0]), pet2: toDraftItem(equipment.pets[1]), pet3: toDraftItem(equipment.pets[2]),
    petEquip1: toDraftItem(equipment.petEquips[0]), petEquip2: toDraftItem(equipment.petEquips[1]), petEquip3: toDraftItem(equipment.petEquips[2]),
    ...(symbols ? { symbolLevels: Object.fromEntries(Object.entries(symbols).map(([name, s]) => [name, String(s.level)])) } : {}),
    ...(weaponAtt !== undefined ? { weaponAtt: String(weaponAtt) } : {}),
  };
}

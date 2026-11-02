// Which preset is equipped in game, set from a profile's preset switchers. Setup never asks and
// saves preset 1 by default, so these are the only way that value becomes accurate. Pure, so the
// directory (which saves the result) and the viewer (which only shows it) share them.

import type { StoredCharacterRecord, StoredFamiliarSlot, StoredFamiliarsData, StoredInnerAbility } from "./charactersStore";
import { deriveWeaponHandFromWeapon } from "../setup/data/classBranch";
import type { HexaStatEntry, HexaStatNode, HexaStatSlot } from "../setup/data/hexaStatData";
import { deriveInnerAbilityLine, innerAbilityHasData } from "../setup/data/innerAbilityData";
import { deriveHasRuinForceShield, deriveIsLiberatedFromWeapon } from "../setup/data/statsStepDraft";

function emptyHexaStatNodeShell(): HexaStatNode {
  const emptyEntry = (): HexaStatEntry => ({ type: "", level: 0 });
  const emptySlot = (): HexaStatSlot => ({ main: emptyEntry(), alt: [emptyEntry(), emptyEntry()] });
  return { presets: [emptySlot(), emptySlot()], activePreset: 0 };
}

function emptyStoredFamiliarsData(): StoredFamiliarsData {
  const emptySlot = (): StoredFamiliarSlot => ({ familiarId: null, mobId: "", name: "", tier: "", line1: "", line2: "" });
  return {
    presets: Array.from({ length: 5 }, () => ({ familiars: Array.from({ length: 3 }, emptySlot), badges: Array<string>(8).fill("") })),
    activePreset: 0,
  };
}

/** Null when the character never collected the field, leaving nothing to mark active. */
export function withStatsActivePreset(
  record: StoredCharacterRecord, field: "hyperStat" | "innerAbility", presetIndex: number,
): StoredCharacterRecord | null {
  const current = record.stats?.[field];
  if (!current) return null;
  const updated = { ...current, activePreset: presetIndex };
  // Switching the active Inner Ability preset can change the scouter-facing line (Passive or
  // Multi Target +1), so recompute it here or it goes stale against whichever preset is now
  // active. Only ever sets a derived answer, never clearing one back to unset, matching the other
  // derive-over-manual call sites.
  let innerAbilityLine: "passive" | "multiTarget" | "neither" | undefined;
  if (field === "innerAbility") {
    const updatedIA = updated as StoredInnerAbility;
    if (innerAbilityHasData(updatedIA)) innerAbilityLine = deriveInnerAbilityLine(updatedIA) ?? "neither";
  }
  return {
    ...record,
    stats: { ...record.stats, [field]: updated },
    scouter: innerAbilityLine ? { ...record.scouter, innerAbilityLine } : record.scouter,
  };
}

/** Which equipment preset (0-2) is equipped. */
export function withEquipmentActivePreset(record: StoredCharacterRecord, presetIndex: number): StoredCharacterRecord {
  const updated = { ...record.equipment, activePreset: presetIndex };
  return {
    ...record,
    equipment: updated,
    // Whichever preset is now active is definitive, so re-derive against it rather than only
    // flipping true. Switching presets can genuinely gain or lose Genesis Liberation, weapon hand
    // or Ruin Force Shield.
    isLiberated: deriveIsLiberatedFromWeapon(updated) ?? record.isLiberated,
    weaponHand: deriveWeaponHandFromWeapon(updated) ?? record.weaponHand,
    hasRuinForceShield: deriveHasRuinForceShield(updated) ?? record.hasRuinForceShield,
  };
}

/** Which of a HEXA Stat node's 2 presets is equipped. Each node has its own activePreset.
 *
 *  HEXA Stat and Familiars below are collected by optional standalone flows never bundled into
 *  required setup, so a character can exist with no saved data for either. Both build an empty
 *  shell on demand, so setting the active preset works before the step has been visited (it
 *  would otherwise no-op and hide the profile's "Set active" button, which is gated on the same
 *  saved data). */
export function withHexaStatActivePreset(record: StoredCharacterRecord, nodeIndex: number, presetIndex: number): StoredCharacterRecord {
  const saved = (record.tools?.hexaStat as { nodes?: HexaStatNode[] } | undefined) ?? { nodes: [] };
  const nodes = [...(saved.nodes ?? [])];
  while (nodes.length <= nodeIndex) nodes.push(emptyHexaStatNodeShell());
  nodes[nodeIndex] = { ...nodes[nodeIndex], activePreset: presetIndex };
  return { ...record, tools: { ...record.tools, hexaStat: { ...saved, nodes } } };
}

/** Which familiars preset (0-4) is equipped. */
export function withFamiliarsActivePreset(record: StoredCharacterRecord, presetIndex: number): StoredCharacterRecord {
  const familiars = record.familiars ?? emptyStoredFamiliarsData();
  return { ...record, familiars: { ...familiars, activePreset: presetIndex } };
}

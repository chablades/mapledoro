import { useState } from "react";
import {
  readCharactersStore,
  selectCharactersList,
  mergeImportedCharacterRecord,
  type ImportSectionId,
  type StoredCharacterRecord,
  type StoredLegionArtifact,
  type StoredScouterLegion,
  type WorldExportPayload,
} from "../model/charactersStore";
import { toCharacterKey } from "../model/characterKeys";
import { MAX_CHAMPIONS, MAX_CHARACTERS_PER_WORLD } from "./useCharacterSetupController";
import type { ProfileRole } from "./paneModels";

type Choice = "mine" | "imported";

interface ConflictEntry {
  existing: StoredCharacterRecord;
  imported: StoredCharacterRecord;
  // Existing's role on whichever world it currently sits on, not the import's target
  // world, which can differ. Importing a world file while the same IGN is Main somewhere
  // else entirely is the case to watch.
  currentRoles: ProfileRole[];
}

interface ResidentEntry {
  character: StoredCharacterRecord;
  currentRoles: ProfileRole[];
}

// One resolution per conflicting character: "mine"/"imported" from the bulk default
// buttons, or a full per-section choice map once someone customizes that one character
// via the same ImportConflictDialog the single-character flow already uses.
type ConflictResolution = Choice | Record<ImportSectionId, Choice>;

function isSectionChoiceMap(value: ConflictResolution): value is Record<ImportSectionId, Choice> {
  return typeof value === "object";
}

// Main is a single world-level slot. Unlike a data section, one character's role choice can
// silently bump another character's role, including someone never shown a choice, such as an
// untouched resident who is currently Main but not mentioned in the file. This detects that
// clash before commit instead of letting importWorldBulk's unconditional overwrite happen
// invisibly.
//
// Only a kept conflict's current Main status counts as a real clash. A conflict resolved as
// "Use imported" or customized is deliberately giving up whatever role it currently holds,
// which is what usesFileRole means, so finding it as currently Main is the expected outcome
// of that choice rather than a conflict. Residents have no choice mechanism, since they
// either stay untouched or get removed, so their current Main status is always kept.
function resolveMainConflict(
  keptConflicts: ConflictEntry[],
  worldResidents: ResidentEntry[],
  effectiveMainCharacterKey: string | null,
  removedSet: Set<string>,
  rosterByKey: Map<string, StoredCharacterRecord>,
): { currentMainName: string; fileMainName: string } | null {
  const currentMainConflictEntry = keptConflicts.find((entry) => entry.currentRoles.includes("main"));
  const currentMainResidentEntry = worldResidents.find((r) => r.currentRoles.includes("main"));
  let currentMainKey: string | null = null;
  if (currentMainConflictEntry) {
    currentMainKey = toCharacterKey(currentMainConflictEntry.existing);
  } else if (currentMainResidentEntry) {
    currentMainKey = toCharacterKey(currentMainResidentEntry.character);
  }
  if (
    !currentMainKey ||
    !effectiveMainCharacterKey ||
    currentMainKey === effectiveMainCharacterKey ||
    removedSet.has(currentMainKey)
  ) {
    return null;
  }
  return {
    currentMainName: rosterByKey.get(currentMainKey)?.characterName ?? currentMainKey,
    fileMainName: rosterByKey.get(effectiveMainCharacterKey)?.characterName ?? effectiveMainCharacterKey,
  };
}

// Collapses a per-section map back into a plain bulk Choice when every section actually
// agrees. Customize's "Keep all existing" and "Use all imported" buttons produce a map
// uniform in exactly this way, and without this it reads as "Customized" even though the
// outcome is identical to clicking the row's own Keep or Use pill.
function collapseUniformChoiceMap(choices: Record<ImportSectionId, Choice>): ConflictResolution {
  const values = Object.values(choices);
  const first = values[0];
  return values.every((v) => v === first) ? first : choices;
}

// Resolves the Main and Champion assignment that will actually be committed, honoring each
// conflicting character's own data choice. "Keep existing" keeps their current role untouched,
// dropping the file's assignment for that key, while "Use imported" or customized takes the
// file's assignment. A key gets the file's role only if it is not a kept conflict and will
// really exist post-import. A deselected new character, or one whose role was dropped via
// "Make Mule", can't hold a role.
function resolveEffectiveRoles({
  payload,
  conflicts,
  worldResidents,
  resolvedCharacters,
  droppedNewCharacterRoleKeys,
  removedSet,
  usesFileRole,
}: {
  payload: WorldExportPayload;
  conflicts: ConflictEntry[];
  worldResidents: ResidentEntry[];
  resolvedCharacters: StoredCharacterRecord[];
  droppedNewCharacterRoleKeys: Set<string>;
  removedSet: Set<string>;
  usesFileRole: (key: string) => boolean;
}): {
  effectiveMainCharacterKey: string | null;
  effectiveChampionCharacterKeys: string[];
  keptConflicts: ConflictEntry[];
} {
  const keptConflicts = conflicts.filter((entry) => !usesFileRole(toCharacterKey(entry.existing)));
  const keptConflictKeys = new Set(keptConflicts.map((entry) => toCharacterKey(entry.existing)));
  const resolvedCharacterKeys = new Set(resolvedCharacters.map(toCharacterKey));
  const fileRoleApplies = (key: string) =>
    !keptConflictKeys.has(key) && resolvedCharacterKeys.has(key) && !droppedNewCharacterRoleKeys.has(key);
  const effectiveMainCharacterKey =
    payload.mainCharacterKey && fileRoleApplies(payload.mainCharacterKey) ? payload.mainCharacterKey : null;
  // importWorldBulk's champion merge replaces with this list when non-empty and otherwise
  // keeps what's already stored. It is not a union, so the current champion status of a kept
  // conflict, or of a kept and not-removed resident, has to be folded into this list
  // explicitly, or it gets dropped whenever the file assigns anyone else as champion.
  const keptCurrentChampionKeys: string[] = [];
  for (const entry of keptConflicts) {
    if (entry.currentRoles.includes("champion")) keptCurrentChampionKeys.push(toCharacterKey(entry.existing));
  }
  const keptResidentChampionKeys: string[] = [];
  for (const r of worldResidents) {
    const key = toCharacterKey(r.character);
    if (r.currentRoles.includes("champion") && !removedSet.has(key)) keptResidentChampionKeys.push(key);
  }
  const effectiveChampionCharacterKeys = Array.from(
    new Set([
      ...payload.championCharacterKeys.filter(fileRoleApplies),
      ...keptCurrentChampionKeys,
      ...keptResidentChampionKeys,
    ]),
  );
  return { effectiveMainCharacterKey, effectiveChampionCharacterKeys, keptConflicts };
}

// Owns all mutable resolution state for WorldImportConflictView (bulk/per-character data
// choices, role overrides, new-character/resident selection) plus every value derived
// from it (resolved character list, projected world count, cap/role-conflict checks).
// Extracted out of the component itself purely to keep that component under the
// react-doctor giant-component line threshold. This hook has exactly one call site.
export function useWorldImportConflictState(
  payload: WorldExportPayload,
  conflicts: ConflictEntry[],
  newCharacters: StoredCharacterRecord[],
  worldResidents: ResidentEntry[],
) {
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>(() => {
    const initial: Record<string, ConflictResolution> = {};
    for (const entry of conflicts) initial[toCharacterKey(entry.existing)] = "mine";
    return initial;
  });
  const [keepMyWorldData, setKeepMyWorldData] = useState(true);
  const [customizingKey, setCustomizingKey] = useState<string | null>(null);
  // Explicit per-conflict role overrides set via Customize's role row. Absent means the
  // default, where the role follows the data resolution: "mine" keeps the current role, and
  // "imported" or customized applies the file's role. Present means the player chose
  // independently of their data choice, such as keeping existing data while still taking
  // the file's role, or the reverse.
  const [roleOverrides, setRoleOverrides] = useState<Record<string, boolean>>({});
  // Every new character starts checked. Unchecking is how someone stays under the per-world
  // cap (MAX_CHARACTERS_PER_WORLD) when the file would otherwise push them over it. Conflicts
  // never add a net-new slot, since they replace or keep an existing IGN, so they can't be
  // the cause of going over.
  const [selectedNewCharacterKeys, setSelectedNewCharacterKeys] = useState<Set<string>>(
    () => new Set(newCharacters.map(toCharacterKey)),
  );
  // Existing residents default to kept, meaning checked. This stores the deselected set
  // rather than the selected one: keeping everyone is the common case and residents is
  // usually large, up to MAX_CHARACTERS_PER_WORLD, so tracking exceptions is easier to
  // reason about than tracking the whole default-true set.
  const [deselectedResidentKeys, setDeselectedResidentKeys] = useState<Set<string>>(() => new Set());
  // A new character can be added without taking the file's Main or Champion assignment for
  // them, say when they would push the Champion count over cap. A Champion conflict shouldn't
  // force dropping the character entirely when they would fit fine as a plain mule. Keyed
  // independently of selectedNewCharacterKeys, since adding them and giving them a role are
  // separate decisions.
  const [droppedNewCharacterRoleKeys, setDroppedNewCharacterRoleKeys] = useState<Set<string>>(() => new Set());

  function applyBulkChoiceToAll(choice: Choice) {
    const next: Record<string, ConflictResolution> = {};
    for (const entry of conflicts) next[toCharacterKey(entry.existing)] = choice;
    setResolutions(next);
    setKeepMyWorldData(choice === "mine");
    // Clears any explicit per-character role override set during a previous Customize visit.
    // A bulk choice is a full reset, so a stale override shouldn't keep pinning one
    // character's role against what the bulk buttons now say.
    setRoleOverrides({});
  }

  // Conflicts resolved as "imported" or customized land on payload.worldID, which is what
  // entry.imported's own worldID already is. "mine" keeps entry.existing wherever it lives,
  // which can be a different world entirely. So this is not the current count plus selected
  // new characters, it is the real post-import membership.
  const resolvedConflicts: StoredCharacterRecord[] = conflicts.map((entry) => {
    const key = toCharacterKey(entry.existing);
    const resolution = resolutions[key] ?? "mine";
    if (isSectionChoiceMap(resolution)) {
      return mergeImportedCharacterRecord(entry.existing, entry.imported, resolution);
    }
    return resolution === "imported" ? entry.imported : entry.existing;
  });
  const selectedNewCharacters = newCharacters.filter((c) => selectedNewCharacterKeys.has(toCharacterKey(c)));
  const resolvedCharacters = [...selectedNewCharacters, ...resolvedConflicts];
  const removedResidentKeys = Array.from(deselectedResidentKeys);

  // Same "upsert by key, then drop removed" merge importWorldBulk itself performs (see
  // useCharacterSetupController.ts), mirrored here purely to preview the resulting
  // per-world count before committing. Every resolved character's worldID already reflects
  // where it will end up: payload.worldID for imported or customized conflicts and new
  // characters, and wherever it already was for "keep mine" conflicts.
  const removedSet = new Set(removedResidentKeys);
  const rosterByKey = new Map<string, StoredCharacterRecord>();
  for (const character of selectCharactersList(readCharactersStore())) {
    const key = toCharacterKey(character);
    if (!removedSet.has(key)) rosterByKey.set(key, character);
  }
  for (const character of resolvedCharacters) rosterByKey.set(toCharacterKey(character), character);
  const projectedWorldCount = Array.from(rosterByKey.values()).filter((c) => c.worldID === payload.worldID).length;
  const isOverCap = projectedWorldCount > MAX_CHARACTERS_PER_WORLD;

  function toggleNewCharacter(key: string) {
    setSelectedNewCharacterKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleResident(key: string) {
    setDeselectedResidentKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleNewCharacterRole(key: string) {
    setDroppedNewCharacterRoleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // A conflicting character resolved as "mine", meaning Keep existing, keeps their current
  // role untouched along with their data. The file's role assignment for that key is dropped
  // rather than applied, so Keep existing means keep everything about them, not only their
  // stats and equipment. New characters have no current role to preserve, so the file's
  // assignment always applies to them.
  //
  // roleOverrides, set via Customize's role row, decouples role from data entirely, letting
  // someone keep existing data while taking the file's role, or the reverse. It overrides the
  // data-resolution default when present.
  function usesFileRole(key: string): boolean {
    if (key in roleOverrides) return roleOverrides[key];
    return (resolutions[key] ?? "mine") !== "mine";
  }
  const { effectiveMainCharacterKey, effectiveChampionCharacterKeys, keptConflicts } = resolveEffectiveRoles({
    payload,
    conflicts,
    worldResidents,
    resolvedCharacters,
    droppedNewCharacterRoleKeys,
    removedSet,
    usesFileRole,
  });

  // Champion overflow gets the same surface-before-commit treatment. See resolveMainConflict's
  // own comment for why this can't be left to importWorldBulk's silent MAX_CHAMPIONS
  // truncation.
  const mainConflict = resolveMainConflict(keptConflicts, worldResidents, effectiveMainCharacterKey, removedSet, rosterByKey);
  const championOverflowCount = Math.max(0, effectiveChampionCharacterKeys.length - MAX_CHAMPIONS);

  const customizingEntry = customizingKey !== null ? conflicts.find((e) => toCharacterKey(e.existing) === customizingKey) : undefined;

  function buildLegionDataForCommit(): { legionArtifact?: StoredLegionArtifact; scouterLegion?: StoredScouterLegion } | null {
    return keepMyWorldData ? null : { legionArtifact: payload.legionArtifact, scouterLegion: payload.scouterLegion };
  }

  return {
    resolutions,
    setResolutions,
    keepMyWorldData,
    setKeepMyWorldData,
    setCustomizingKey,
    setRoleOverrides,
    selectedNewCharacterKeys,
    deselectedResidentKeys,
    droppedNewCharacterRoleKeys,
    applyBulkChoiceToAll,
    resolvedCharacters,
    removedResidentKeys,
    projectedWorldCount,
    isOverCap,
    toggleNewCharacter,
    toggleResident,
    toggleNewCharacterRole,
    usesFileRole,
    effectiveMainCharacterKey,
    effectiveChampionCharacterKeys,
    mainConflict,
    championOverflowCount,
    customizingEntry,
    buildLegionDataForCommit,
  };
}

export { collapseUniformChoiceMap };
export type { Choice, ConflictResolution, ConflictEntry, ResidentEntry };

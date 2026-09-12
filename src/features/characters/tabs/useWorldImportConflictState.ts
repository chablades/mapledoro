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
  // Existing's role on whichever world it's CURRENTLY on -- not the import's target
  // world, which can differ (e.g. importing a world file while the same IGN is Main
  // somewhere else entirely).
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

// Main is a single world-level slot -- unlike a data section, one character's role
// choice can silently bump ANOTHER character's role, including someone never even shown
// a choice (an untouched resident who's currently Main but not mentioned in the file at
// all). Detects that clash before commit instead of letting importWorldBulk's own
// unconditional overwrite happen invisibly.
//
// Only a KEPT conflict's current Main status counts as a real clash -- a conflict
// resolved "Use imported"/customized is deliberately giving up whatever role they
// currently hold (that's what usesFileRole means), so finding them as "currently Main"
// is not a conflict, it's the expected outcome of their own choice. Residents have no
// choice mechanism at all (they either stay untouched or get removed), so their current
// Main status is always effectively "kept."
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
// agrees -- Customize's own "Keep all existing"/"Use all imported" buttons produce a map
// that's uniform in exactly this way, and without this it reads as "Customized" even
// though nothing about the outcome differs from clicking the row's own Keep/Use pill.
function collapseUniformChoiceMap(choices: Record<ImportSectionId, Choice>): ConflictResolution {
  const values = Object.values(choices);
  const first = values[0];
  return values.every((v) => v === first) ? first : choices;
}

// Resolves the ACTUAL Main/Champion assignment that will be committed, honoring each
// conflicting character's own data choice -- "Keep existing" also keeps their current
// role untouched (the file's assignment for that key is dropped), while "Use imported"/
// customized takes the file's assignment. A key only actually gets the file's role if
// it's not a kept conflict AND is really going to exist post-import (a deselected new
// character, or one with its role explicitly dropped via "Make Mule", can't hold a role
// for a character that isn't being added, or isn't being added WITH that role).
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
  // importWorldBulk's champion merge is "replace with this list if non-empty, else keep
  // whatever's already stored" -- not a union -- so a kept conflict's (or a kept, not-
  // removed resident's) real current champion status has to be folded into THIS list
  // explicitly, or it would be silently dropped whenever the file assigns anyone else as
  // champion.
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
// react-doctor giant-component line threshold -- this hook has exactly one call site.
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
  // Explicit per-conflict role overrides set via Customize's role row -- absent means the
  // default (role follows the data resolution: "mine" keeps the current role, "imported"/
  // customized applies the file's role), present means the user explicitly chose
  // independent of their data choice (e.g. keep existing data but still take the file's
  // role, or the reverse).
  const [roleOverrides, setRoleOverrides] = useState<Record<string, boolean>>({});
  // Every new character starts checked -- unchecking is how someone stays under the
  // per-world cap (MAX_CHARACTERS_PER_WORLD) when the file would otherwise push them over
  // it, since conflicts never add a NET-NEW slot (they replace/keep an existing IGN) and
  // can't be the cause of going over.
  const [selectedNewCharacterKeys, setSelectedNewCharacterKeys] = useState<Set<string>>(
    () => new Set(newCharacters.map(toCharacterKey)),
  );
  // Existing residents default to KEPT (checked) -- storing the deselected set rather
  // than the selected one, since "keep everyone" is the common case and residents is
  // usually large (up to MAX_CHARACTERS_PER_WORLD), so tracking exceptions is cheaper
  // to reason about than tracking the whole default-true set.
  const [deselectedResidentKeys, setDeselectedResidentKeys] = useState<Set<string>>(() => new Set());
  // A new character can be added WITHOUT taking the file's Main/Champion assignment for
  // them -- e.g. they'd push Champion count over cap, but there's no reason a Champion
  // conflict should force dropping the character entirely when they'd otherwise fit fine
  // as a plain mule. Keyed independently of selectedNewCharacterKeys since "add them" and
  // "give them this role" are separate decisions.
  const [droppedNewCharacterRoleKeys, setDroppedNewCharacterRoleKeys] = useState<Set<string>>(() => new Set());

  function applyBulkChoiceToAll(choice: Choice) {
    const next: Record<string, ConflictResolution> = {};
    for (const entry of conflicts) next[toCharacterKey(entry.existing)] = choice;
    setResolutions(next);
    setKeepMyWorldData(choice === "mine");
    // Clears any explicit per-character role override set via a previous Customize visit
    // -- a bulk choice is a full reset, so a stale override from before shouldn't keep
    // pinning that one character's role against what the bulk buttons now say.
    setRoleOverrides({});
  }

  // Conflicts resolved "imported"/customized land ON payload.worldID (that's what
  // entry.imported's own worldID already is); "mine" keeps entry.existing wherever it
  // already lives, which can be a different world entirely -- so this is NOT simply
  // "current count + selected new characters", it's the real post-import membership.
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
  // per-world count before committing -- every resolved character's worldID already
  // reflects where it will actually end up (payload.worldID for imported/customized
  // conflicts and new characters, wherever it already was for "keep mine" conflicts).
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

  // A conflicting character resolved "mine" (Keep existing) keeps their real current
  // role untouched, same as their data -- the file's role assignment for that specific
  // key is dropped rather than applied, so "Keep existing" actually means keep
  // everything about them, not just their stats/equipment/etc. New characters have no
  // current role to preserve, so the file's assignment always applies to them.
  // roleOverrides (set via Customize's own role row) lets someone decouple role from
  // data entirely -- e.g. keep existing data but still take the file's role, or the
  // reverse -- overriding the data-resolution default when present.
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

  // Champion overflow gets the same "surface before commit" treatment -- see
  // resolveMainConflict's own comment for why this can't just be left to
  // importWorldBulk's silent MAX_CHAMPIONS truncation.
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

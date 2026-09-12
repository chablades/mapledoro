import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoRefresh } from "./useAutoRefresh";
import {
  CHARACTER_NAME_INPUT_FILTER_REGEX,
  MAX_QUERY_LENGTH,
  MAX_CHARACTERS_PER_WORLD,
  type SetupMode,
} from "../model/constants";
import { findRosterCharacterByName, normalizeCharacterName, toCharacterKey } from "../model/characterKeys";
import { readStoredWorldFilter, resolveWorldFilter, rosterWorldIds } from "../model/directoryWorldFilter";
import {
  appendExpHistoryEntry,
  createStoredCharacterRecord,
  hasStoredCompletedRequiredSetup,
  mergeImportedCharacterRecord,
  readCharactersStore,
  selectCharacterById,
  type CharactersStore,
  type StoredCharacterEquipment,
  type StoredEquipmentPreset,
  type StoredLegionCrystal,
  type StoredInnerAbility,
  type StoredFamiliarsData,
  type StoredFamiliarSlot,
  type StoredVMatrixData,
  type WhLegionRank,
  selectCharactersList,
  linkSkillsDraftToStored,
  writeScouterLegionForWorld,
  writeLegionArtifactForWorld,
  writeCharactersStore,
} from "../model/charactersStore";
import { findClassById, type HexaSkillLevels } from "../../tools/hexa-skills/hexa-classes";
import { getClassDataByNexonJobName } from "../setup/data/classSkillData";
import { deriveWeaponHandFromWeapon } from "../setup/data/classBranch";
import { hexaStatHasData, type HexaStatNode, type HexaStatEntry, type HexaStatSlot } from "../setup/data/hexaStatData";
import { deriveInnerAbilityLine, innerAbilityHasData } from "../setup/data/innerAbilityData";
import { propagateLinkSkillFloors, syncLinkSkillToSiblings } from "../setup/data/linkSkillsData";
import { ARCANE_AREAS, ALL_SACRED_AREAS, SACRED_AREAS, SACRED_MAX_LEVEL, type SymbolArea, type SymbolType } from "../../tools/symbols/symbol-data";
import type { SymbolState } from "../../tools/symbols/useSymbolState";
import {
  pruneAndReadSetupDrafts,
  makeDraftCharacterKey,
  readLastSetupDraft,
  readSetupDraftByCharacter,
  readSetupDraftByKey,
  removeSetupDraftForCharacter,
  type SetupDraft,
  writeSetupDraft,
} from "../model/setupDraftStorage";
import type { ImportSectionId, OverviewSectionId, StoredCharacterRecord, StoredCharacterStats, StoredLegionArtifact, StoredScouterLegion } from "../model/charactersStore";
import {
  convertStatsStepDraftToStored, deriveHasRuinForceShield, deriveIsLiberatedFromWeapon, marriageDraftToStored,
  parseStatsStepDraft, serializeStatsStepDraft, storedStatsToStatsStepDraft,
} from "../setup/data/statsStepDraft";
import { serializeEquipmentStepDraft, storedEquipmentToDraft } from "../setup/data/equipmentStepDraft";
import { mapImportToDrafts, type MapleScouterImportResult } from "../setup/data/maplescouterImportData";
import { convertOzRingsDraftToStored, parseOzRingsDraft, serializeOzRingsDraft, storedOzRingsToOzRingsDraft } from "../setup/data/ozRingData";
import { convertBuffsDraftToStored, parseBuffsDraft } from "../setup/data/buffsData";
import {
  convertScouterQuestionsDraftToStored,
  resolveLegionArtifacts,
  whRankFromRoster,
  type LegionArtifactsDraft,
} from "../setup/data/scouterQuestionsData";
import {
  DEFAULT_CRYSTAL_STATS,
  deriveLegionArtifactFields,
  isCrystalUnlocked,
  LEGION_CRYSTALS,
  MIN_CRYSTAL_LEVEL,
  parseLegionArtifactBoardDraft,
  toStoredLegionCrystals,
  type LegionArtifactBoardDraft,
} from "../setup/data/legionArtifactData";
import type { NormalizedCharacterData } from "../model/types";
import {
  clampFlowStepIndex,
  computeEffectiveFlowStart,
  flowIncludesStep,
  getFirstInvalidStepIndex,
  getFlowStepByIndex,
  getFlowStepCount,
  getRequiredSetupFlowId,
  getSetupFlowLabel,
  isStepSkippedForClass,
  type SetupFlowId,
} from "../setup/flows";
import type { SetupDraftSummary } from "./paneModels";
import { getClassSetupOverrides, validateNexonJobMapping } from "../setup/data/nexonJobMapping";
import type { SetupStepInputById } from "../setup/types";
import { useCharacterLookup } from "./useCharacterLookup";
import {
  CHARACTERS_TRANSITION_MS,
  useSetupFlowTransitions,
} from "./useSetupFlowTransitions";

export const MAX_CHAMPIONS = 5;
export { MAX_CHARACTERS_PER_WORLD };

// Role chosen on ImportModeScreen's role picker for a freshly-imported character.
export type RosterRole = "mule" | "main" | "champion";

function tryParseJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return null; }
}

type EquipmentDraftItem = { id?: string; name: string } | null;
/** One preset's grid slots (the part that swaps between equipment presets). */
interface EquipmentDraftPreset {
  ring1?: EquipmentDraftItem; ring2?: EquipmentDraftItem; ring3?: EquipmentDraftItem; ring4?: EquipmentDraftItem;
  face?: EquipmentDraftItem; eye?: EquipmentDraftItem; earring?: EquipmentDraftItem;
  pendant1?: EquipmentDraftItem; pendant2?: EquipmentDraftItem;
  belt?: EquipmentDraftItem; pocket?: EquipmentDraftItem;
  hat?: EquipmentDraftItem; cape?: EquipmentDraftItem; top?: EquipmentDraftItem;
  glove?: EquipmentDraftItem; bottom?: EquipmentDraftItem; shoe?: EquipmentDraftItem;
  shoulder?: EquipmentDraftItem; medal?: EquipmentDraftItem;
  weapon?: EquipmentDraftItem; secondary?: EquipmentDraftItem; emblem?: EquipmentDraftItem;
  android?: EquipmentDraftItem; heart?: EquipmentDraftItem; badge?: EquipmentDraftItem;
}
interface EquipmentDraft {
  /** Presets 1-2 are sparse per-slot overrides on top of preset 0. See draftPresetToStored,
   *  which merges each slot individually rather than choosing one whole preset or the
   *  other. */
  presets?: EquipmentDraftPreset[];
  activePreset?: number;
  // Shared across presets:
  title?: EquipmentDraftItem;
  totem1?: EquipmentDraftItem; totem2?: EquipmentDraftItem; totem3?: EquipmentDraftItem;
  pet1?: EquipmentDraftItem; pet2?: EquipmentDraftItem; pet3?: EquipmentDraftItem;
  petEquip1?: EquipmentDraftItem; petEquip2?: EquipmentDraftItem; petEquip3?: EquipmentDraftItem;
  /** Symbol levels keyed by region name, folded into tools.symbols (the calculator store).
   *  String rather than number, since the setup step's draft keeps it blank until typed,
   *  matching Oz Rings. Converted to real numbers below. */
  symbolLevels?: Record<string, string>;
}

function draftItem(v: EquipmentDraftItem) {
  if (!v?.name) return null;
  return v.id !== undefined ? { id: v.id, name: v.name } : { name: v.name };
}

// Merges each slot individually. A slot present in `overrides` (this preset's own
// explicit picks) wins, otherwise it falls through to `base` (preset 0), so an
// untouched slot keeps mirroring preset 0 even when other slots in the same preset
// have been customized. Same per-slot model as EquipmentSetupStep.tsx's activeGrid;
// matches in-game behavior where each equipment slot mirrors independently rather
// than a whole preset diverging at once.
function draftPresetToStored(
  overrides: EquipmentDraftPreset | undefined,
  base: EquipmentDraftPreset | undefined,
): StoredEquipmentPreset {
  const o = overrides ?? {};
  const b = base ?? {};
  const field = (key: keyof EquipmentDraftPreset) => draftItem((o[key] !== undefined ? o[key] : b[key]) ?? null);
  return {
    rings: [field("ring1"), field("ring2"), field("ring3"), field("ring4")],
    face: field("face"), eye: field("eye"), earring: field("earring"),
    pendants: [field("pendant1"), field("pendant2")],
    belt: field("belt"), pocket: field("pocket"),
    hat: field("hat"), cape: field("cape"), top: field("top"),
    glove: field("glove"), bottom: field("bottom"), shoe: field("shoe"),
    shoulder: field("shoulder"), medal: field("medal"),
    weapon: field("weapon"), secondary: field("secondary"), emblem: field("emblem"),
    android: field("android"), heart: field("heart"), badge: field("badge"),
  };
}

function parseEquipmentDraft(json: string): StoredCharacterEquipment | null {
  try {
    const d = tryParseJson(json) as EquipmentDraft | null;
    if (!d || typeof d !== "object") return null;
    const base = d.presets?.[0];
    const presetAt = (i: number) => draftPresetToStored(d.presets?.[i], base);
    return {
      presets: [presetAt(0), presetAt(1), presetAt(2)],
      // Always saved as preset 1, regardless of which tab was last open while editing.
      // The tab switcher isn't an explicit "this is my active loadout" choice, so trusting
      // it would silently save whatever preset the user happened to edit last.
      activePreset: 0,
      title: draftItem(d.title ?? null),
      totems: [draftItem(d.totem1 ?? null), draftItem(d.totem2 ?? null), draftItem(d.totem3 ?? null)],
      pets: [draftItem(d.pet1 ?? null), draftItem(d.pet2 ?? null), draftItem(d.pet3 ?? null)],
      petEquips: [draftItem(d.petEquip1 ?? null), draftItem(d.petEquip2 ?? null), draftItem(d.petEquip3 ?? null)],
    };
  } catch {
    return null;
  }
}

// ── Symbols: fold equipment-step levels into the calculator's tools.symbols ───

interface SavedSymbols { type: SymbolType; symbols: Record<string, SymbolState> }

function findSymbolArea(name: string): { area: SymbolArea; type: SymbolType } | null {
  const arcane = ARCANE_AREAS.find((a) => a.name === name);
  if (arcane) return { area: arcane, type: "arcane" };
  const sacred = ALL_SACRED_AREAS.find((a) => a.name === name);
  if (sacred) return { area: sacred, type: "sacred" };
  return null;
}

function extractSymbolLevels(json: string): Record<string, string> | null {
  const d = tryParseJson(json) as EquipmentDraft | null;
  if (!d || typeof d !== "object" || !d.symbolLevels) return null;
  return d.symbolLevels;
}

/** Merge per region: set level, preserving existing calculator fields. */
function buildSymbolsToolData(existing: SavedSymbols | null, levels: Record<string, string>): SavedSymbols {
  const symbols: Record<string, SymbolState> = { ...existing?.symbols };
  for (const [name, raw] of Object.entries(levels)) {
    const level = Number(raw) || 0;
    const found = findSymbolArea(name);
    if (!found) continue;
    const prev = symbols[name];
    // Skip only when there's nothing to update yet (an untouched area shouldn't create a
    // fresh 0-level calculator entry). An existing entry must still update down to 0, or
    // clearing/zeroing a level in the equipment step silently no-ops.
    if (!prev && level < 1) continue;
    symbols[name] = prev
      ? { ...prev, level }
      : { level, current: 0, daily: found.area.daily, weeklyEnabled: found.type === "arcane" };
  }
  return { type: existing?.type ?? "arcane", symbols };
}

function readExistingSymbols(character: NormalizedCharacterData): SavedSymbols | null {
  const existing = selectCharacterById(readCharactersStore(), toCharacterKey(character));
  const saved = existing?.tools?.symbols;
  return saved && typeof saved === "object" ? (saved as SavedSymbols) : null;
}

function buildSymbolsToolDataForRecord(character: NormalizedCharacterData, equipmentJson: string): SavedSymbols | null {
  const levels = extractSymbolLevels(equipmentJson);
  if (!levels) return null;
  return buildSymbolsToolData(readExistingSymbols(character), levels);
}

function applyStatsDraftToRoster(
  character: NormalizedCharacterData | null,
  rawDraft: string,
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  if (!character) return;
  const store = readCharactersStore();
  const existing = selectCharacterById(store, toCharacterKey(character));
  if (!existing) return;
  const statsDraft = parseStatsStepDraft(rawDraft);
  const { stats, isLiberated, weaponHand, hasRuinForceShield, soul } =
    convertStatsStepDraftToStored(statsDraft, character.level);
  preserveExistingActivePresets(stats, existing);
  // Same derive-over-manual-answer rule as buildFullSetupRecord/applyMapleScouterFlow:
  // a Genesis/Destiny weapon already on file is definitive, and this step's own Inner
  // Ability card, if edited, fully determines the scouter-facing line. Since this question
  // also shows a real manual ask (see InnerAbilityLineQuestion) whenever the card has no
  // data yet, fall back to that manual answer instead of discarding it.
  const scouterQ = convertScouterQuestionsDraftToStored(statsDraft);
  const innerAbilityLine = innerAbilityHasData(stats.innerAbility)
    ? (deriveInnerAbilityLine(stats.innerAbility) ?? "neither")
    : scouterQ?.innerAbilityLine;
  upsertFn({
    ...existing,
    stats: { ...existing.stats, ...stats },
    isLiberated: deriveIsLiberatedFromWeapon(existing.equipment) ?? isLiberated,
    weaponHand: deriveWeaponHandFromWeapon(existing.equipment) ?? weaponHand,
    hasRuinForceShield: deriveHasRuinForceShield(existing.equipment) ?? hasRuinForceShield,
    soul,
    scouter: innerAbilityLine
      ? { ...existing.scouter, innerAbilityLine }
      : existing.scouter,
  });
}

// Propagates a floor raise from a just-upserted character's link skills to same-world
// siblings whose stored value is now too low, for example a second tracked magician raising
// Empirical Knowledge's floor above what the first one saved.
//
// Folds `justUpserted` into `roster` rather than re-reading readCharactersStore(), because
// the localStorage write for a same-tick upsertFn call happens later, in the
// writeCharactersStore effect keyed off characterRoster state (see upsertRosterCharacter
// above), so a disk read here would still see the pre-finish record. That is also why
// linkSkills must fold into buildFullSetupRecord's and applyMapleScouterFlow's single
// upsertFn call rather than a separate step that reads existing data from disk first: for a
// new character nothing is on disk yet, so an `if (!existing) return` guard would no-op the
// whole linkSkills write.
function propagateLinkSkillFloorsAfterUpsert(
  justUpserted: StoredCharacterRecord,
  roster: StoredCharacterRecord[],
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  const key = toCharacterKey(justUpserted);
  const existingIndex = roster.findIndex((c) => toCharacterKey(c) === key);
  const effectiveRoster = existingIndex === -1
    ? [...roster, justUpserted]
    : roster.map((c, i) => (i === existingIndex ? justUpserted : c));
  propagateLinkSkillFloors(effectiveRoster, justUpserted.worldID, upsertFn);
}

// Same propagation as propagateLinkSkillFloorsAfterUpsert, but mutates `roster` in place
// instead of taking an upsertFn. For callers such as handleRefreshed that are already inside
// a setCharacterRoster functional updater owning the array being built, routing through
// upsertRosterCharacter is not in scope at that call site and is not needed, since the
// functional update is itself the commit.
function applyLinkSkillFloorsInPlace(roster: StoredCharacterRecord[], worldId: number): void {
  propagateLinkSkillFloors(roster, worldId, (raised) => {
    const i = roster.findIndex((c) => toCharacterKey(c) === toCharacterKey(raised));
    if (i !== -1) roster[i] = raised;
  });
}

// Shared by full and quick setup (finalizeQuickOrFullSetupRecord) and maplescouter_setup
// (finishSetupFlow) after their own upsert. `link_skills` present in this run's step data
// means someone looked at the pre-filled value and deliberately kept or changed it. In game
// a link skill's mastery reads as one identical number across every character sharing it, so
// that saved value becomes every same-world sibling's synced truth (syncLinkSkillToSiblings,
// clamped at the level-proven floor). Absent, as in Quick Setup or a redo that skipped the
// step, nobody made a deliberate choice, so a stale sibling is only raised and never pulled
// down to a number nobody chose (propagateLinkSkillFloorsAfterUpsert, raise-only).
function syncOrPropagateLinkSkills(
  linkSkillsStepValue: string | undefined,
  justUpserted: StoredCharacterRecord,
  roster: StoredCharacterRecord[],
  upsertFn: (c: StoredCharacterRecord) => void,
): void {
  if (linkSkillsStepValue) {
    syncLinkSkillToSiblings(justUpserted, roster, upsertFn);
  } else {
    propagateLinkSkillFloorsAfterUpsert(justUpserted, roster, upsertFn);
  }
}

const WH_LEGION_RANK_SET = new Set<string>(["B", "A", "S", "SS", "SSS"]);

// Resolves the world's WH Legion rank: roster-derived wins, then the manual pick, then
// whatever was stored. `manual` is undefined when this session never touched the question, in
// which case the existing value must be preserved, since writeScouterLegionForWorld replaces
// the whole per-world blob and dropping it would erase the rank on every unrelated finish.
// It is "none" when someone explicitly picked "No Wild Hunter" or cleared a previous bracket
// pick. "none" is checked explicitly rather than falling through to the WH_LEGION_RANK_SET
// check below, which would resolve it to undefined and make it indistinguishable from never
// having answered, leaving anyone without a Wild Hunter unable to satisfy a completeness
// check.
function resolveWhLegionRank(
  derived: WhLegionRank | null,
  manual: string | undefined,
  existing: WhLegionRank | "none" | undefined,
): WhLegionRank | "none" | undefined {
  if (derived) return derived;
  if (manual === undefined) return existing;
  if (manual === "none") return "none";
  return WH_LEGION_RANK_SET.has(manual) ? (manual as WhLegionRank) : undefined;
}

/**
 * Re-derives the world's WH Legion rank from its roster and persists it if it changed.
 * `applyScouterLegionForWorld` runs only when a Full or MapleScouter setup finishes, missing
 * three roster changes that should also keep this in sync: a character added via quick setup,
 * which has no Stats questionnaire; an existing Wild Hunter leveling into a new bracket via
 * auto-refresh; and a deletion. `excludeKey` covers the last of those, keeping a just-removed
 * Wild Hunter from counting toward its own re-derivation, without which deleting the
 * highest-ranked one would leave the rank stuck instead of recomputing to the next highest.
 *
 * A roster with no Wild Hunter never touches storage, since that would erase a legitimate
 * manual pick for one who simply is not tracked locally. The same holds after a delete: the
 * real character may still exist in game, so its rank is not cleared to "none".
 */
function syncWhLegionRankForWorld(worldId: number, base?: StoredCharacterRecord, excludeKey?: string): void {
  const store = readCharactersStore();
  const worldRoster = selectCharactersList(store)
    .filter((c) => c.worldID === worldId && (!excludeKey || toCharacterKey(c) !== excludeKey));
  const legionRoster = base && !worldRoster.some((c) => toCharacterKey(c) === toCharacterKey(base))
    ? [...worldRoster, base]
    : worldRoster;
  const derived = whRankFromRoster(legionRoster);
  if (!derived) return;
  const existingLegion = store.scouterLegionByWorld[String(worldId)];
  if (existingLegion?.wildHunterRank === derived) return;
  writeScouterLegionForWorld(worldId, { ...existingLegion, wildHunterRank: derived });
}

/** Guard wrapper for the auto-refresh callsite, kept separate so the null-check narrows
 *  normally. The record is assigned only from inside a setState closure at the callsite,
 *  which defeats TypeScript's control-flow narrowing there. */
function syncWhLegionRankAfterRefresh(record: StoredCharacterRecord | null): void {
  if (record) syncWhLegionRankForWorld(record.worldID, record);
}

/** Builds the finished quick/full setup record and upserts it, resyncing the world's
 *  WH Legion rank for quick setup (full setup already does this internally via
 *  buildFullSetupRecord → applyScouterLegionForWorld). Split out of finishSetupFlow
 *  purely to stay under the cognitive-complexity cap. */
function finalizeQuickOrFullSetupRecord(
  isFullSetupFlow: boolean,
  confirmedCharacter: NormalizedCharacterData,
  setupStepTestByStep: SetupStepInputById,
  characterRoster: StoredCharacterRecord[],
  upsertRosterCharacter: (c: StoredCharacterRecord) => void,
): void {
  let storedRecord: StoredCharacterRecord;
  if (isFullSetupFlow) {
    storedRecord = buildFullSetupRecord(confirmedCharacter, setupStepTestByStep);
  } else {
    const gender = normalizeGenderValue(setupStepTestByStep.gender);
    const marriage = marriageDraftToStored(setupStepTestByStep.marriage ?? "");
    // Quick Setup only collects gender and marriage, so merge those two fields onto
    // whatever's already on record for this character instead of building a bare record
    // and replacing it wholesale, which would silently wipe stats/equipment/hexa/v-matrix/
    // familiars/tools that a prior Full Setup (or standalone tool flow) already saved.
    const existing = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
    storedRecord = existing
      ? { ...existing, gender, marriage, expHistory: appendExpHistoryEntry(existing.expHistory, confirmedCharacter.level, confirmedCharacter.exp) }
      : createStoredCharacterRecord({ character: confirmedCharacter, gender, marriage });
  }
  upsertRosterCharacter(storedRecord);
  if (!isFullSetupFlow) {
    syncWhLegionRankForWorld(confirmedCharacter.worldID, storedRecord);
    // full_setup already seeds this via buildFullSetupRecord → applyScouterLegionForWorld;
    // Quick Setup never touches Legion data at all otherwise, but the data is account-level
    // (per-world) and safe to assume regardless of entry path. See the helper's own comment.
    ensureLegionArtifactDefaultForWorld(confirmedCharacter.worldID);
  }
  // See syncOrPropagateLinkSkills's own comment for the sync-vs-raise-only split.
  syncOrPropagateLinkSkills(setupStepTestByStep.link_skills, storedRecord, characterRoster, upsertRosterCharacter);
}

// A freshly unlocked Legion Artifact starts at Artifact Level 1, not 0, since namu.wiki's
// level table numbers from 1 like character level. It already has its first 3 crystals
// (Orange Mushroom, Slime, Horny Mushroom) at Crystal Level 1 with these 3 default lines,
// per namu.wiki: "미변경 시 기본 할당 옵션은
// '올스탯 증가', '최대 HP/MP 증가', '공격력/마력 증가'이다" ("if unchanged, the default
// assigned options are All Stat, Max HP/MP, ATT/Magic ATT"), and Crystal Grade 1 costs 0
// AP, so it is automatic rather than a player action. No setup flow asks for a real Artifact
// Level or crystal config, making this the one piece of Legion Artifact data safe to assume
// for every player whatever their progress.
//
// Seeded lazily, once per world, the first time any setup flow finishes for a character on a
// world with no real Legion Artifact data yet. Not just full_setup, since the data is
// per-world and independent of which flow touched it. Never overwrites real data.
function ensureLegionArtifactDefaultForWorld(worldId: number): void {
  const store = readCharactersStore();
  if (store.legionArtifactByWorld[String(worldId)]) return;
  const crystals: StoredLegionCrystal[] = LEGION_CRYSTALS.map((_, index) =>
    isCrystalUnlocked(index, 1)
      ? { level: MIN_CRYSTAL_LEVEL, stats: [...DEFAULT_CRYSTAL_STATS] }
      : { level: 0, stats: [null, null, null] },
  );
  writeLegionArtifactForWorld(worldId, { artifactLevel: 1, crystals });
}

/**
 * Resolves and persists this world's Legion data (WH rank, Maple Union artifacts) from a
 * Stats-draft WH-rank pick and an optional Legion Artifacts draft. Shared between
 * maplescouter_setup, which collects artifacts inline in the Stats questionnaire, and
 * full_setup, which gives them their own step. Both show the WH Legion rank question in
 * Stats, so this write cannot live in one flow alone.
 */
function applyScouterLegionForWorld(
  store: CharactersStore,
  character: NormalizedCharacterData,
  base: StoredCharacterRecord,
  whLegionDraft: string | undefined,
  legionArtifactsDraft: LegionArtifactsDraft | undefined,
  board?: LegionArtifactBoardDraft,
): void {
  // Wild Hunter Legion rank is account-level (per-world): derive it from the highest
  // Wild Hunter in this world's roster (incl. the character being set up, in case it
  // IS the WH) when present; otherwise the user's manual pick, then the existing
  // stored value. Persisted world-scoped, not per-character.
  const worldRoster = selectCharactersList(store).filter((c) => c.worldID === character.worldID);
  const legionRoster = worldRoster.some((c) => toCharacterKey(c) === toCharacterKey(base))
    ? worldRoster
    : [...worldRoster, base];
  const existingLegion = store.scouterLegionByWorld[String(character.worldID)];
  const wildHunterRank = resolveWhLegionRank(whRankFromRoster(legionRoster), whLegionDraft, existingLegion?.wildHunterRank);
  // Maple Union artifacts are also per-world and not derivable, so they live on the same
  // per-world blob next to the WH rank. For full_setup the caller has already derived them
  // from `board` before this function runs.
  const artifacts = resolveLegionArtifacts(legionArtifactsDraft, existingLegion);
  writeScouterLegionForWorld(character.worldID, {
    ...(wildHunterRank ? { wildHunterRank } : {}),
    ...artifacts,
  });

  // The full 9-crystal board, full_setup only, is real Legion Artifact data rather than a
  // scouter input, so it lives in its own per-world store. Preserve what is already stored
  // when this session did not touch it, such as a second character on the same world
  // finishing full_setup without revisiting Legion Artifacts.
  if (board) {
    const existingArtifact = store.legionArtifactByWorld[String(character.worldID)];
    // board.artifactLevel is a string that can be empty without being undefined, when the
    // level input was cleared mid-edit (see clampArtifactLevelInput). A truthy check rather
    // than !== undefined is required so a blank field reads as untouched and falls back to
    // existingArtifact, instead of Number("") collapsing to 0.
    const artifactLevel = board.artifactLevel ? Number(board.artifactLevel) : existingArtifact?.artifactLevel;
    const crystals = toStoredLegionCrystals(board.crystals, artifactLevel ?? 0) ?? existingArtifact?.crystals;
    writeLegionArtifactForWorld(character.worldID, {
      ...(artifactLevel !== undefined ? { artifactLevel } : {}),
      ...(crystals ? { crystals } : {}),
    });
  }
  ensureLegionArtifactDefaultForWorld(character.worldID);
}

/**
 * Builds and merges the MapleScouter flow's data into the roster in one upsert, returning
 * true if it created a new record. `upsertFn` writes via React state, so a record cannot be
 * created and read back within a tick. Start from the existing record if there is one,
 * otherwise a fresh base, since MapleScouter is a first-time entry mode that collects no
 * gender or marriage, then apply stats and oz rings before the single write.
 */
function applyMapleScouterFlow(
  character: NormalizedCharacterData | null,
  stepData: import("../setup/types").SetupStepInputById,
  upsertFn: (c: StoredCharacterRecord) => void,
): boolean {
  if (!character) return false;
  const store = readCharactersStore();
  const existing = selectCharacterById(store, toCharacterKey(character));
  const created = !existing;
  // MapleScouter setup has no gender or marriage step (see the doc comment above), so do not
  // read them from stepData here. That draft state is shared and can still hold a value left
  // over from an abandoned Quick or Full Setup attempt on this character.
  const base = existing ?? createStoredCharacterRecord({ character });

  const statsDraft = parseStatsStepDraft(stepData.stats ?? "");
  applyScouterLegionForWorld(store, character, base, statsDraft.scouterQuestions?.whLegion, statsDraft.scouterQuestions);

  const { stats, isLiberated, weaponHand, hasRuinForceShield, soul } =
    convertStatsStepDraftToStored(statsDraft, character.level);
  preserveExistingActivePresets(stats, existing);
  const ozRingsDraft = parseOzRingsDraft(stepData.oz_rings ?? "");
  const ozRings = convertOzRingsDraftToStored(ozRingsDraft);
  const buffs = convertBuffsDraftToStored(parseBuffsDraft(stepData.buffs ?? ""));
  const scouterQ = convertScouterQuestionsDraftToStored(statsDraft);
  // maplescouter_setup has no Inner Ability substep, so this is the only place that can
  // derive it, from whatever the character's Stats bookmark or full_setup already recorded.
  // Same rule as buildFullSetupRecord and applyStatsDraftToRoster. Overrides the direct-ask
  // answer only when the active preset's lines are known.
  const innerAbilityLine = innerAbilityHasData(base.stats.innerAbility)
    ? (deriveInnerAbilityLine(base.stats.innerAbility) ?? "neither")
    : scouterQ?.innerAbilityLine;
  const scouterPatch = ozRings || buffs || innerAbilityLine
    ? {
        ...base.scouter,
        ...(ozRings ? { ozRings } : {}),
        ...(buffs ? { buffs } : {}),
        ...(innerAbilityLine !== undefined ? { innerAbilityLine } : {}),
      }
    : base.scouter;
  // The scouter flow reuses the full-setup HEXA Matrix step (skill-levels substep only),
  // persisting to the same tool homes as full setup. HEXA Stat isn't collected here, but
  // we still build it so any value the step autofilled from existing data is preserved.
  const hexaSkillsToolData = buildHexaSkillsToolData(character.jobName, stepData.hexa_matrix ?? "");
  const hexaStatToolData = buildHexaStatToolData(stepData.hexa_matrix ?? "");
  preserveExistingHexaStatActivePresets(hexaStatToolData, existing);
  const tools = {
    ...base.tools,
    ...(hexaSkillsToolData ? { hexaSkills: hexaSkillsToolData } : null),
    ...(hexaStatToolData ? { hexaStat: hexaStatToolData } : null),
  };
  // Falls back to base.linkSkills (already existing?.linkSkills or undefined for a fresh
  // record) when this run's Link Skills step produced no draft data, same rule as the
  // other fields here.
  const linkSkills = stepData.link_skills ? linkSkillsDraftToStored(stepData.link_skills) : base.linkSkills;
  upsertFn({
    ...base,
    stats: { ...base.stats, ...stats },
    // Same rule as the other finalize paths, where a Genesis or Destiny weapon on file is
    // definitive. This flow has no Equipment step, so that is the only source.
    isLiberated: deriveIsLiberatedFromWeapon(base.equipment) ?? isLiberated,
    weaponHand: deriveWeaponHandFromWeapon(base.equipment) ?? weaponHand,
    hasRuinForceShield: deriveHasRuinForceShield(base.equipment) ?? hasRuinForceShield,
    soul,
    scouter: scouterPatch,
    tools,
    linkSkills,
    expHistory: appendExpHistoryEntry(base.expHistory, character.level, character.exp),
  });
  if (created) removeSetupDraftForCharacter(character);
  return created;
}

// "Lv. 11 Sacred Symbols", the Buffs step's maxedSacredSymbol tile, is about the 6 boss
// regions' Sacred Symbols specifically. Grand Sacred is excluded because it grants EXP, meso
// and drop rather than a boss bonus. full_setup already has this data from the Equipment
// step's Symbols substep, so it is derived here rather than from a separate manual toggle.
function deriveMaxedSacredSymbol(symbolsData: SavedSymbols | null): boolean {
  if (!symbolsData) return false;
  return SACRED_AREAS.every((a) => (symbolsData.symbols[a.name]?.level ?? 0) >= SACRED_MAX_LEVEL);
}

// Hyper Stat and Inner Ability activePreset always convert to 0 from the draft (see
// draftHyperStatToStored and convertInnerAbilityDraftToStored), because the preset tab
// switcher used while editing lines is not an explicit "make this active in game" choice and
// cannot be trusted even for a new character. For an already set-up character the profile's
// "Set preset X as active" button is the only authoritative way to change it, so re-running
// this step, such as from a bookmark's confined edit pencil, must not reset it to preset 1
// just because Finish was pressed. Restores whichever preset was active before this edit.
function preserveExistingActivePresets(
  stats: Partial<StoredCharacterStats>,
  existing: StoredCharacterRecord | null,
): void {
  if (!existing) return;
  if (stats.hyperStat) stats.hyperStat.activePreset = existing.stats.hyperStat?.activePreset ?? 0;
  if (stats.innerAbility) stats.innerAbility.activePreset = existing.stats.innerAbility?.activePreset ?? 0;
}

// Same rule as preserveExistingActivePresets above, where the profile's Set-active correction
// is the only authoritative source, applied to Equipment, Familiars and HEXA Stat presets.
// parseEquipmentDraft, buildFamiliarsDataForRecord and buildHexaStatToolData all hardcode a
// fresh activePreset, 0 or 0 per node, since a setup draft never carries one, so every write
// of these fields must restore it afterward or discard a profile correction.
function preserveExistingEquipmentActivePreset(
  equipment: StoredCharacterEquipment | null,
  existing: StoredCharacterRecord | null,
): void {
  if (equipment && existing?.equipment) equipment.activePreset = existing.equipment.activePreset;
}

function preserveExistingFamiliarsActivePreset(
  familiars: StoredFamiliarsData | null,
  existing: StoredCharacterRecord | null,
): void {
  if (familiars && existing?.familiars) familiars.activePreset = existing.familiars.activePreset;
}

function preserveExistingHexaStatActivePresets(
  hexaStatToolData: { nodes: HexaStatNode[] } | null,
  existing: StoredCharacterRecord | null,
): void {
  const existingNodes = (existing?.tools?.hexaStat as { nodes?: HexaStatNode[] } | undefined)?.nodes;
  if (!hexaStatToolData || !existingNodes) return;
  hexaStatToolData.nodes = hexaStatToolData.nodes.map((n, i) => ({ ...n, activePreset: existingNodes[i]?.activePreset ?? n.activePreset }));
}

function buildFullSetupRecord(
  character: NormalizedCharacterData,
  stepData: import("../setup/types").SetupStepInputById,
): StoredCharacterRecord {
  const base = createStoredCharacterRecord({
    character,
    gender: normalizeGenderValue(stepData.gender),
    marriage: marriageDraftToStored(stepData.marriage ?? ""),
  });
  const statsDraft = parseStatsStepDraft(stepData.stats ?? "");
  const legionBoard = parseLegionArtifactBoardDraft(stepData.legion_artifacts ?? "");
  const store = readCharactersStore();
  const existing = selectCharacterById(store, toCharacterKey(character));
  applyScouterLegionForWorld(
    store,
    character,
    base,
    statsDraft.scouterQuestions?.whLegion,
    // Per-field merge rather than a whole-object fallback. deriveLegionArtifactFields can
    // return just one of the two fields, for example when only Bonus EXP was assigned to a
    // crystal this session, and a `??` on the whole object would let that partial result win
    // over a real manual answer for the other field, reintroducing the silent-discard bug
    // this fallback exists to fix. Spreading the manual answer first, then overlaying only
    // the fields the board proved, keeps each field's fallback chain independent:
    // board-derived if that stat was ever assigned, then this session's manual answer, then
    // whatever was already stored.
    { ...statsDraft.scouterQuestions, ...deriveLegionArtifactFields(legionBoard) },
    legionBoard,
  );

  const { stats, isLiberated, weaponHand, hasRuinForceShield, soul } =
    convertStatsStepDraftToStored(statsDraft, character.level);
  preserveExistingActivePresets(stats, existing);
  const ozRingsDraft = parseOzRingsDraft(stepData.oz_rings ?? "");
  const hexaSkillsToolData = buildHexaSkillsToolData(character.jobName, stepData.hexa_matrix ?? "");
  const hexaStatToolData = buildHexaStatToolData(stepData.hexa_matrix ?? "");
  preserveExistingHexaStatActivePresets(hexaStatToolData, existing);
  const vMatrixData = buildVMatrixDataForRecord(stepData.v_matrix ?? "");
  // Falls back to existing.linkSkills, not base.linkSkills which is always undefined on a
  // fresh record, when this run's Link Skills step produced no draft data. Same rule as
  // equipment, familiars and vMatrix below, so a full-setup redo that skipped the step does
  // not wipe a previously saved value.
  const linkSkillsData = stepData.link_skills ? linkSkillsDraftToStored(stepData.link_skills) : null;
  const familiarsData = buildFamiliarsDataForRecord(stepData.familiars ?? "");
  preserveExistingFamiliarsActivePreset(familiarsData, existing);
  const equipmentData = stepData.equipment ? parseEquipmentDraft(stepData.equipment) : null;
  preserveExistingEquipmentActivePreset(equipmentData, existing);
  const symbolsData = stepData.equipment ? buildSymbolsToolDataForRecord(character, stepData.equipment) : null;
  // Spread existing.tools first, not just base.tools which is a fresh record's empty tools,
  // so tool data this flow never touches (liberation, astra, symbols, exp-calculator,
  // mystic-frontier) survives a full-setup redo instead of being dropped. hexaSkills,
  // hexaStat and symbols then overlay only when this run produced them.
  const tools = {
    ...existing?.tools,
    ...base.tools,
    ...(hexaSkillsToolData ? { hexaSkills: hexaSkillsToolData } : null),
    ...(hexaStatToolData ? { hexaStat: hexaStatToolData } : null),
    ...(symbolsData ? { symbols: symbolsData } : null),
  };

  const ozRings = convertOzRingsDraftToStored(ozRingsDraft);
  const buffsConverted = convertBuffsDraftToStored(parseBuffsDraft(stepData.buffs ?? ""));
  // Based on the existing stored buffs rather than buffsConverted alone. Buffs backfills on
  // mount (see BuffsSetupStep's own effect), so a step that was visited and finished already
  // has the full state in buffsConverted. But if Buffs was never visited this session,
  // leaving buffsConverted null, and the character's Sacred Symbols happen to be maxed,
  // forcing maxedSacredSymbol true without this base would replace the whole `buffs` object
  // with that one flag and drop everything else already saved.
  const buffs = deriveMaxedSacredSymbol(symbolsData)
    ? { ...existing?.scouter?.buffs, ...buffsConverted, maxedSacredSymbol: true as const }
    : buffsConverted;
  // Same derive-over-manual-answer rule as applyStatsDraftToRoster and applyMapleScouterFlow.
  // Real Inner Ability card data wins when it exists, otherwise fall back to this session's
  // manual Quick Questions answer (see InnerAbilityLineQuestion) rather than discarding it.
  const innerAbilityLine = innerAbilityHasData(stats.innerAbility)
    ? (deriveInnerAbilityLine(stats.innerAbility) ?? "neither")
    : convertScouterQuestionsDraftToStored(statsDraft)?.innerAbilityLine;
  const scouterPatch = {
    ...(ozRings ? { ozRings } : {}),
    ...(buffs ? { buffs } : {}),
    ...(innerAbilityLine ? { innerAbilityLine } : {}),
  };

  // equipment, familiars and vMatrix fall back to `existing` rather than `base`, which is
  // always a fresh blank record here, when this run's steps produced no draft data. That
  // covers a full-setup redo that skipped them and a step skipped by level or legacy gating.
  // Falling back to the blank base would wipe them. Same merge-against-existing rule the
  // scouter and expHistory fields below follow.
  const knownEquipment = equipmentData ?? existing?.equipment ?? base.equipment;
  return {
    ...base,
    stats: { ...base.stats, ...stats },
    equipment: knownEquipment,
    // A known Genesis or Destiny weapon, whether from this run's Equipment step or a prior
    // one, is definitive proof either way and takes priority over the manual checkbox answer.
    // Same rule as applyStatsDraftToRoster and applyEquipmentDraftToRoster.
    isLiberated: deriveIsLiberatedFromWeapon(knownEquipment) ?? isLiberated,
    weaponHand: deriveWeaponHandFromWeapon(knownEquipment) ?? weaponHand,
    hasRuinForceShield: deriveHasRuinForceShield(knownEquipment) ?? hasRuinForceShield,
    soul, tools,
    familiars: familiarsData ?? existing?.familiars ?? base.familiars,
    vMatrix: vMatrixData ?? existing?.vMatrix ?? base.vMatrix,
    linkSkills: linkSkillsData ?? existing?.linkSkills ?? base.linkSkills,
    expHistory: existing ? appendExpHistoryEntry(existing.expHistory, character.level, character.exp) : base.expHistory,
    // Merged against the existing record's scouter rather than `base`, which is always a
    // fresh blank object here (see the equipment comment above for why that matters).
    // scouterPatch holds only whichever of ozRings, buffs and innerAbilityLine were
    // recomputed this run, so replacing scouter outright would drop the others whenever a
    // full-setup redo skipped Oz Rings or Buffs.
    scouter: { ...existing?.scouter, ...scouterPatch },
  };
}

function applyEquipmentDraftToRoster(
  character: NormalizedCharacterData | null,
  equipmentJson: string,
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  if (!character || !equipmentJson) return;
  const equipment = parseEquipmentDraft(equipmentJson);
  if (!equipment) return;
  const store = readCharactersStore();
  const existing = selectCharacterById(store, toCharacterKey(character));
  if (!existing) return;
  preserveExistingEquipmentActivePreset(equipment, existing);
  const symbolsData = buildSymbolsToolDataForRecord(character, equipmentJson);
  // Same resync buildFullSetupRecord does on a full Setup finish (see its own
  // deriveMaxedSacredSymbol comment). Without it, editing Symbols from the Equipment
  // bookmark's pencil, outside Setup entirely, could cross the Lv. 11 Sacred Symbols
  // threshold and leave this flag stale until the next full Setup run touched it.
  // Positive-only, never clearing back to unset, matching buildFullSetupRecord's behavior
  // for the same flag.
  const scouterBuffs = symbolsData && deriveMaxedSacredSymbol(symbolsData)
    ? { ...existing.scouter?.buffs, maxedSacredSymbol: true as const }
    : existing.scouter?.buffs;
  upsertFn({
    ...existing,
    equipment,
    // Genesis Liberation's Final Damage bonus lives on the weapon item itself, so a newly
    // picked weapon proves losing it as definitively as gaining it. Re-derive from whichever
    // preset is active rather than only ever setting true.
    isLiberated: deriveIsLiberatedFromWeapon(equipment) ?? existing.isLiberated,
    weaponHand: deriveWeaponHandFromWeapon(equipment) ?? existing.weaponHand,
    hasRuinForceShield: deriveHasRuinForceShield(equipment) ?? existing.hasRuinForceShield,
    tools: symbolsData ? { ...existing.tools, symbols: symbolsData } : existing.tools,
    scouter: scouterBuffs !== existing.scouter?.buffs
      ? { ...existing.scouter, buffs: scouterBuffs }
      : existing.scouter,
  });
}

function applyStandaloneToolDrafts(
  character: NormalizedCharacterData | null,
  stepData: import("../setup/types").SetupStepInputById,
  upsertFn: (c: StoredCharacterRecord) => void,
  flowId: SetupFlowId,
) {
  if (!character) return;
  // Gate each field on whether the flow being finished includes that step. Otherwise leftover
  // draft data from a different, abandoned flow leaks in, such as Equipment typed during Full
  // Setup before backing out to finish Quick Setup.
  if (stepData.equipment && flowIncludesStep(flowId, "equipment")) {
    applyEquipmentDraftToRoster(character, stepData.equipment, upsertFn);
  }
  if (stepData.hexa_matrix && flowIncludesStep(flowId, "hexa_matrix")) {
    applyHexaDraftToRoster(character, stepData.hexa_matrix, upsertFn);
  }
  if (stepData.v_matrix && flowIncludesStep(flowId, "v_matrix")) {
    applyVMatrixDraftToRoster(character, stepData.v_matrix, upsertFn);
  }
  if (stepData.familiars && flowIncludesStep(flowId, "familiars")) {
    applyFamiliarsDraftToRoster(character, stepData.familiars, upsertFn);
  }
  // Unlike the fields above, an empty draft is a legitimate final value here, since clearing
  // gender or marriage back to "not set" is a real choice from the Biography blocks. So these
  // two are gated only on the flow owning the field, not on the draft string being truthy.
  // quick_setup and full_setup already persist both via finalizeQuickOrFullSetupRecord, so
  // this fires only for the standalone single-step flows the Biography blocks use.
  if (flowId === "gender_flow") {
    applyGenderDraftToRoster(character, stepData.gender, upsertFn);
  }
  if (flowId === "marriage_flow") {
    applyMarriageDraftToRoster(character, stepData.marriage, upsertFn);
  }
}

function applyGenderDraftToRoster(
  character: NormalizedCharacterData,
  genderRaw: string | undefined,
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  const gender = normalizeGenderValue(genderRaw);
  const store = readCharactersStore();
  const existing = selectCharacterById(store, toCharacterKey(character));
  upsertFn(existing ? { ...existing, gender } : createStoredCharacterRecord({ character, gender }));
}

function applyMarriageDraftToRoster(
  character: NormalizedCharacterData,
  marriageRaw: string | undefined,
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  const marriage = marriageDraftToStored(marriageRaw ?? "");
  const store = readCharactersStore();
  const existing = selectCharacterById(store, toCharacterKey(character));
  upsertFn(existing ? { ...existing, marriage } : createStoredCharacterRecord({ character, marriage }));
}

// The setup step's draft never carries an activePreset, since its preset tab is local React
// state and is not serialized. Always save preset 1, the same policy as the other three
// preset-based systems, rather than trusting whichever tab was last open.
function buildFamiliarsDataForRecord(familiarsJson: string): StoredFamiliarsData | null {
  const parsed = tryParseJson(familiarsJson);
  if (!parsed || typeof parsed !== "object") return null;
  return { ...(parsed as Omit<StoredFamiliarsData, "activePreset">), activePreset: 0 };
}

function applyFamiliarsDraftToRoster(
  character: NormalizedCharacterData | null,
  familiarsJson: string,
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  if (!character) return;
  const data = buildFamiliarsDataForRecord(familiarsJson);
  if (!data) return;
  const store = readCharactersStore();
  const existing = selectCharacterById(store, toCharacterKey(character));
  if (!existing) return;
  preserveExistingFamiliarsActivePreset(data, existing);
  upsertFn({ ...existing, familiars: data });
}

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

function applyHexaDraftToRoster(
  character: NormalizedCharacterData | null,
  hexaJson: string,
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  if (!character) return;
  const hexaSkillsData = buildHexaSkillsToolData(character.jobName, hexaJson);
  const hexaStatData = buildHexaStatToolData(hexaJson);
  if (!hexaSkillsData && !hexaStatData) return;
  const store = readCharactersStore();
  const existing = selectCharacterById(store, toCharacterKey(character));
  if (!existing) return;
  preserveExistingHexaStatActivePresets(hexaStatData, existing);
  // Preserve any calculator-only fields (e.g. desiredLevels) already in tools.hexaSkills.
  const existingHexaSkills = existing.tools?.hexaSkills as Record<string, unknown> | undefined;
  upsertFn({
    ...existing,
    tools: {
      ...existing.tools,
      ...(hexaSkillsData ? { hexaSkills: { ...existingHexaSkills, ...hexaSkillsData } } : null),
      ...(hexaStatData ? { hexaStat: hexaStatData } : null),
    },
  });
}

function buildVMatrixDataForRecord(vMatrixJson: string): StoredVMatrixData | null {
  const parsed = tryParseJson(vMatrixJson);
  if (!parsed || typeof parsed !== "object") return null;
  const levels: Record<string, number> = {};
  for (const [name, level] of Object.entries(parsed as Record<string, unknown>)) {
    const n = Math.round(Number(level));
    if (Number.isFinite(n) && n > 0) levels[name] = n;
  }
  return Object.keys(levels).length > 0 ? { levels } : null;
}

function applyVMatrixDraftToRoster(
  character: NormalizedCharacterData | null,
  vMatrixJson: string,
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  if (!character) return;
  const vMatrixData = buildVMatrixDataForRecord(vMatrixJson);
  if (!vMatrixData) return;
  const existing = selectCharacterById(readCharactersStore(), toCharacterKey(character));
  if (!existing) return;
  upsertFn({ ...existing, vMatrix: vMatrixData });
}

// The setup step's own draft keeps skill levels as strings (blank until touched); the
// calculator/profile side need real numbers, so convert here at the storage boundary.
function toNumericHexaSkillLevels(raw: Record<string, unknown>): HexaSkillLevels {
  const toNum = (v: unknown) => Number(v) || 0;
  const toNumArr = (v: unknown) => (Array.isArray(v) ? v.map(toNum) : []);
  return {
    origin: Math.max(1, toNum(raw.origin) || 1),
    ascent: toNum(raw.ascent),
    mastery: toNumArr(raw.mastery),
    enhancement: toNumArr(raw.enhancement),
    common: toNumArr(raw.common),
  };
}

// 6th-job HEXA Skills data (origin, mastery, enhancement, common, ascent), persisted to
// tools.hexaSkills. HEXA Stat is stripped out and lives in its own key, see below.
function buildHexaSkillsToolData(jobName: string, hexaJson: string): { className: string; levels: HexaSkillLevels } | null {
  try {
    const parsed = JSON.parse(hexaJson) as Record<string, unknown>;
    const classData = getClassDataByNexonJobName(jobName);
    const hexaClassId = classData?.id === "sia_astelle" ? "sia" : classData?.id;
    const classDef = hexaClassId ? findClassById(hexaClassId) : null;
    if (parsed && typeof parsed === "object" && classDef) {
      return { className: classDef.className, levels: toNumericHexaSkillLevels(parsed) };
    }
  } catch { /* ignore */ }
  return null;
}

// HEXA Stat is its own progression system, stored separately from the HEXA Skills calculator
// under tools.hexaStat. Only persisted when at least one node has data.
function buildHexaStatToolData(hexaJson: string): { nodes: HexaStatNode[] } | null {
  try {
    const parsed = JSON.parse(hexaJson) as { hexaStat?: unknown };
    const nodes = parsed?.hexaStat;
    if (Array.isArray(nodes) && hexaStatHasData(nodes as HexaStatNode[])) {
      // Always saved as preset 0 per node. The preset toggle used while editing is not an
      // explicit "this is what is live in game" choice, so trusting it would save whichever
      // one happened to be open. Correcting a node's real active preset happens on the
      // profile page instead, via setHexaStatActivePreset below.
      return { nodes: (nodes as HexaStatNode[]).map((n) => ({ ...n, activePreset: 0 })) };
    }
  } catch { /* ignore */ }
  return null;
}

function normalizeCompletedFlowIds(flowIds: SetupFlowId[]) {
  return Array.from(new Set(flowIds));
}

function normalizeGenderValue(value: string | undefined | null): "male" | "female" | null {
  const raw = (value ?? "").toLowerCase();
  if (raw === "male") return "male";
  if (raw === "female") return "female";
  return null;
}


/**
 * Stale (past `expiresAt`) mains and champions to auto-refresh in the background, scoped
 * to the world the directory is showing. `worldId` null is the explicit "All worlds"
 * view, which sweeps every world.
 *
 * Scoped rather than account-wide because the lookup API's per-IP minute cap is small
 * and shared with the visitor's own searches: spending it on worlds that aren't on
 * screen only delays the characters they are actually looking at.
 */
function collectStaleWorldCharacters(
  worldId: number | null,
  mainKeyByWorld: Record<string, string>,
  championKeysByWorld: Record<string, string[]>,
  byKey: Map<string, StoredCharacterRecord>,
): StoredCharacterRecord[] {
  const now = Date.now();
  const inScope = (world: string) => worldId === null || world === String(worldId);
  const seen = new Set<string>();
  const stale: StoredCharacterRecord[] = [];
  const consider = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const character = byKey.get(key);
    if (character && now > character.expiresAt) stale.push(character);
  };
  for (const [world, key] of Object.entries(mainKeyByWorld)) {
    if (inScope(world)) consider(key);
  }
  for (const [world, keys] of Object.entries(championKeysByWorld)) {
    if (!inScope(world)) continue;
    for (const key of keys) consider(key);
  }
  return stale;
}

// Helpers for world-scoped main/champion key maps
function getMainKeyForWorld(
  mainCharacterKeyByWorld: Record<string, string>,
  worldId: number,
): string | null {
  return mainCharacterKeyByWorld[String(worldId)] ?? null;
}

function getChampionKeysForWorld(
  championCharacterKeysByWorld: Record<string, string[]>,
  worldId: number,
): string[] {
  return championCharacterKeysByWorld[String(worldId)] ?? [];
}

function setMainKeyForWorld(
  prev: Record<string, string>,
  worldId: number,
  key: string | null,
): Record<string, string> {
  const next = { ...prev };
  if (key === null) {
    delete next[String(worldId)];
  } else {
    next[String(worldId)] = key;
  }
  return next;
}

function setChampionKeysForWorld(
  prev: Record<string, string[]>,
  worldId: number,
  keys: string[],
): Record<string, string[]> {
  return { ...prev, [String(worldId)]: keys };
}

interface InitialRouteIntent {
  characterName?: string;
  action?: string;
}

/** Seeds every step draft that risks starting blank and silently wiping data on Finish (see
 *  applyConfirmedProfileView and finishSetupFlow) from the character's stored data. Equipment,
 *  V Matrix, HEXA Matrix and Familiars each backfill only from their own step component's
 *  mount effect, which needs that component to render. If a session skips past one, or a
 *  stale draft from an abandoned flow is still in memory, Finish's `<field>Data ??
 *  base.<field>` fallback can overwrite real data with blank or stale values. Runs both on
 *  first landing on a profile and after every Finish, so drafts resync to the just-saved
 *  state rather than staying stale for the session. */
// Mirrors readSavedHexaValue in hexaMatrixDraft.ts, but derives the draft from the passed-in
// storedCharacter rather than its own localStorage read. The after-Finish call site passes
// lastUpsertedCharacterRef.current because the roster's localStorage write is still pending in
// a separate effect at that point. Reading localStorage here instead would re-seed hexa_matrix
// with the pre-Finish value, leaving the profile's HEXA edit pencil on a stale level right
// after saving a new one.
function hexaValueFromStoredCharacter(hexaClassDef: ReturnType<typeof findClassById>, storedCharacter: StoredCharacterRecord | null): string {
  if (!hexaClassDef || !storedCharacter) return "";
  const savedSkills = storedCharacter.tools?.hexaSkills as { levels?: HexaSkillLevels } | undefined;
  const savedStat = storedCharacter.tools?.hexaStat as { nodes?: HexaStatNode[] } | undefined;
  if (!savedSkills?.levels && !savedStat?.nodes) return "";
  return JSON.stringify({ ...savedSkills?.levels, hexaStat: savedStat?.nodes });
}

function buildSeededStepTestByStep(jobName: string, storedCharacter: StoredCharacterRecord | null): SetupStepInputById {
  const savedMarriage = storedCharacter?.marriage;
  let marriageValue = "";
  if (savedMarriage?.isMarried === true) marriageValue = savedMarriage.partnerName ? `yes|${savedMarriage.partnerName}` : "yes";
  else if (savedMarriage?.isMarried === false) marriageValue = "no";
  const equipmentSymbols = storedCharacter?.tools?.symbols as { symbols?: Record<string, SymbolState> } | undefined;
  const classData = getClassDataByNexonJobName(jobName);
  const hexaClassDef = classData?.id ? findClassById(classData.id) : null;
  return {
    gender: storedCharacter?.gender ?? "",
    marriage: marriageValue,
    // Seeded from the character's saved stats rather than blank. The Stats step's finish
    // path merges its draft onto the existing record wholesale (see applyStatsDraftToRoster),
    // so starting blank meant finishing without retyping every field wiped whatever was not
    // retyped.
    stats: storedCharacter
      ? serializeStatsStepDraft(storedStatsToStatsStepDraft({
          ...storedCharacter,
          innerAbilityLine: storedCharacter.scouter?.innerAbilityLine,
        }))
      : "",
    equipment: storedCharacter
      ? serializeEquipmentStepDraft(storedEquipmentToDraft(storedCharacter.equipment, equipmentSymbols?.symbols))
      : "",
    v_matrix: storedCharacter?.vMatrix?.levels && Object.keys(storedCharacter.vMatrix.levels).length > 0
      ? JSON.stringify(Object.fromEntries(Object.entries(storedCharacter.vMatrix.levels).map(([k, v]) => [k, String(v)])))
      : "",
    hexa_matrix: hexaValueFromStoredCharacter(hexaClassDef, storedCharacter),
    familiars: storedCharacter?.familiars ? JSON.stringify(storedCharacter.familiars) : "",
    // Seeded like every other step above. Without this, reopening Oz Rings on a character
    // that had already answered it started blank even though the stored ring levels were
    // intact.
    oz_rings: storedCharacter ? serializeOzRingsDraft(storedOzRingsToOzRingsDraft(storedCharacter.scouter?.ozRings)) : "",
  };
}

export function useCharacterSetupController(initialRouteIntent?: InitialRouteIntent) {
  // Frozen at mount via the lazy useState initializer (only evaluated once): once the
  // URL-sync effect in CharacterSetupFlow.tsx starts mirroring in-app navigation back into
  // the address bar, the caller's initialRouteIntent prop changes right along with it.
  // Reading it live here would make handleDraftHydration's identity change too, which would
  // re-fire the one-time hydration effect below on every navigation and stomp the state that
  // navigation just set (e.g. going back to the directory would immediately get overridden
  // back to the profile).
  const [frozenRouteIntent] = useState(() => initialRouteIntent);
  const initialCharacterName = frozenRouteIntent?.characterName;
  const initialAction = frozenRouteIntent?.action;
  const immediateUiLockRef = useRef(false);
  const [query, setQuery] = useState("");
  const [foundCharacter, setFoundCharacter] = useState<NormalizedCharacterData | null>(null);
  // True when foundCharacter is a stale draft snapshot shown because a resume's
  // refresh attempt failed (character not found / lookup error), not a live result.
  const [isStaleFallbackPreview, setIsStaleFallbackPreview] = useState(false);
  const [previewCardReady, setPreviewCardReady] = useState(false);
  const [previewContentReady, setPreviewContentReady] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>("intro");
  const [confirmedCharacter, setConfirmedCharacter] = useState<NormalizedCharacterData | null>(
    null,
  );
  const [previewImageLoaded, setPreviewImageLoaded] = useState(false);
  const [confirmedImageLoaded, setConfirmedImageLoaded] = useState(false);
  const [setupFlowStarted, setSetupFlowStarted] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<SetupFlowId>(() => getRequiredSetupFlowId());
  const [completedFlowIds, setCompletedFlowIds] = useState<SetupFlowId[]>([]);
  const [showFlowOverview, setShowFlowOverview] = useState(false);
  const [showCharacterDirectory, setShowCharacterDirectory] = useState(false);
  const [isSwitchingToDirectory, setIsSwitchingToDirectory] = useState(false);
  const [isSwitchingToProfile, setIsSwitchingToProfile] = useState(false);
  const [isFinishingSetup, setIsFinishingSetup] = useState(false);
  const [isDeleteTransitioning, setIsDeleteTransitioning] = useState(false);
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [fastDirectoryRevealOnce, setFastDirectoryRevealOnce] = useState(false);
  const [characterRoster, setCharacterRoster] = useState<StoredCharacterRecord[]>([]);
  const characterRosterRef = useRef(characterRoster);
  useEffect(() => { characterRosterRef.current = characterRoster; });
  // Last-seen in-memory `character.tools` reference per character key, so the persistence
  // effect below can tell "unchanged since our last pass" apart from "this tick's
  // setCharacterRoster actually changed it". Without that, one roster character's auto-refresh
  // finishing re-persists EVERY character's tools from memory, clobbering another character's
  // unrelated out-of-band write (e.g. a Scouter refresh) with memory's now-stale copy. See the
  // tools merge below for the read side.
  const lastSeenToolsRef = useRef<Record<string, StoredCharacterRecord["tools"]>>({});
  const [autoRefreshQueue, setAutoRefreshQueue] = useState<StoredCharacterRecord[]>([]);

  // Dev-only: surfaces malformed CLASS_SKILL_DATA entries (empty id/nexonJobName,
  // duplicate nexonJobName) as console warnings; no-op in production.
  useEffect(() => {
    validateNexonJobMapping();
  }, []);

  // World-scoped main and champion keys
  const [mainCharacterKeyByWorld, setMainCharacterKeyByWorld] = useState<Record<string, string>>({});
  const [championCharacterKeysByWorld, setChampionCharacterKeysByWorld] = useState<Record<string, string[]>>({});

  // Which profile bookmark to return to after finishing an optional flow started from it,
  // such as a Biography block or any bookmark's edit pencil. The profile-overview screen
  // unmounts while a flow is active (see PreviewSetupPane's contentKey), so its own local
  // active-bookmark state cannot survive the round trip. Keyed to the character it was
  // captured for so it never leaks into a later visit to a different character's profile;
  // currentCharacterKey and restorableBookmarkId below are what reach the screen.
  // subView also remembers a bookmark's internal sub-view, such as Stats' Hyper Stat and
  // Ability toggle, so editing from one of those returns to it rather than the default.
  const [lastActiveBookmark, setLastActiveBookmark] = useState<{ characterKey: string; bookmarkId: string; subView?: string } | null>(null);

  const [setupStepIndex, setSetupStepIndex] = useState(0);
  const [setupStepDirection, setSetupStepDirection] = useState<"forward" | "backward">("forward");
  // Substep to force-open a step on, such as jumping straight to Stats' Inner Ability
  // substep. Only set by jumpToSubstep below, and cleared by every other navigation action
  // so it never overrides normal Prev and Next substep placement.
  // substepJumpNonce forces a remount even when jumping to the same target substep
  // twice in a row (the step component may have since navigated away internally).
  const [setupTargetSubstep, setSetupTargetSubstep] = useState<number | null>(null);
  // Paired with setupTargetSubstep, reset to false everywhere that clears it back to null.
  // See startOptionalSetupFlow for where it is set true.
  const [setupConfineToSubstep, setSetupConfineToSubstep] = useState(false);
  const [substepJumpNonce, setSubstepJumpNonce] = useState(0);
  // Tracks whichever substep the mounted step (Stats, Equipment, HEXA Matrix) is showing,
  // reported up via each step's onSubstepChange as it navigates internally, and 0 for step
  // types without substeps. Persisted alongside setupStepIndex so a page reload restores the
  // exact substep the player left off on rather than falling back to substep 0.
  const [setupSubstepIndex, setSetupSubstepIndex] = useState(0);
  // Last-known Next-button validity per step id (see SetupStepFrame's onValidityChange), for
  // the few steps that gate Next on something. Keyed by step id and not reset on navigation,
  // because a step's draft data, and so its validity, is shared across flows and outlives
  // leaving that step. Resetting on navigate let you dodge the gate by backing out of an
  // invalid step and switching flows instead of fixing it. Cleared only where
  // setupStepTestByStep itself resets, on switching character drafts or abandoning setup.
  const [stepValidityById, setStepValidityById] = useState<Record<string, boolean>>({});
  const [setupStepTestByStep, setSetupStepTestByStep] = useState<SetupStepInputById>({});
  const [draftSummaries, setDraftSummaries] = useState<SetupDraftSummary[]>([]);
  const [hasCompletedRequiredSetupEver, setHasCompletedRequiredSetupEver] = useState(false);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const hasHydratedSetupDraftRef = useRef(false);
  const lookup = useCharacterLookup({
    query,
    onFoundCharacterChange: setFoundCharacter,
  });

  const handleRefreshed = useCallback((fresh: NormalizedCharacterData) => {
    const key = toCharacterKey(fresh);
    const existing = characterRosterRef.current.find((c) => toCharacterKey(c) === key);
    if (!existing) return;
    // Refreshing brings back only rank, level and exp-shaped data from Nexon (see
    // NormalizedCharacterData). Everything else on the record, including marriage, the
    // liberation, weapon-hand, Ruin Force Shield and soul flags, and scouter, familiars and
    // V Matrix data, has to be carried over from `existing`, or createStoredCharacterRecord
    // defaults it back to null and wipes it on every auto-refresh.
    const updated: StoredCharacterRecord = {
      ...createStoredCharacterRecord({
        character: fresh,
        gender: existing.gender,
        marriage: existing.marriage,
        isLiberated: existing.isLiberated,
        weaponHand: existing.weaponHand,
        hasRuinForceShield: existing.hasRuinForceShield,
        soul: existing.soul,
        stats: existing.stats,
        equipment: existing.equipment,
        tools: existing.tools,
        expHistory: appendExpHistoryEntry(existing.expHistory, fresh.level, fresh.exp),
        addedAt: existing.meta.addedAt,
      }),
      scouter: existing.scouter,
      familiars: existing.familiars,
      vMatrix: existing.vMatrix,
      linkSkills: existing.linkSkills,
    };
    setCharacterRoster((prev) => {
      const existingIndex = prev.findIndex((c) => toCharacterKey(c) === key);
      if (existingIndex === -1) return prev;
      const next = [...prev];
      next[existingIndex] = updated;
      // A level-up crossing 70, 120 or 210 can raise this character's own floor, and for a
      // magician or thief a same-world sibling's floor too, by being the character that
      // pushed Empirical Knowledge's total higher. Checked on every refresh rather than only
      // on setup finishes, since a level-up is exactly the case where a sibling fact changes
      // without anyone visiting Link Skills. Applied in place rather than through
      // upsertRosterCharacter, which is not in scope yet at this point in the file, since
      // this functional update already owns the array being mutated.
      applyLinkSkillFloorsInPlace(next, updated.worldID);
      return next;
    });
    // A Wild Hunter leveling into a new legion bracket should update the world's derived
    // rank the same way finishing a setup for it would. The refreshed record is passed
    // explicitly as `base` because the roster in localStorage still holds this character's
    // pre-refresh level, the persistence effect for `characterRoster` not having run yet.
    syncWhLegionRankAfterRefresh(updated);
  }, []);

  const { refreshingKeys, refreshSingle } = useAutoRefresh({
    queue: autoRefreshQueue,
    onRefreshed: handleRefreshed,
  });

  /**
   * Re-point the background refresh at a newly-selected world. Replacing the queue also
   * abandons whatever the previous world had left to sweep, which is the intent: the
   * per-IP lookup budget should follow what's on screen. Stale characters left behind
   * get picked up the next time that world is selected.
   */
  const queueWorldRefresh = useCallback((worldId: number | null) => {
    const byKey = new Map(
      characterRosterRef.current.map((c) => [toCharacterKey(c), c] as const),
    );
    setAutoRefreshQueue(
      collectStaleWorldCharacters(
        worldId,
        mainCharacterKeyByWorld,
        championCharacterKeysByWorld,
        byKey,
      ),
    );
  }, [mainCharacterKeyByWorld, championCharacterKeysByWorld]);

  const transitions = useSetupFlowTransitions();
  const {
    setSetupPanelVisible,
    setSuppressLayoutTransition,
    queueTransitionTimer,
  } = transitions;
  const requiredFlowId = getRequiredSetupFlowId();
  const isUiLocked =
    transitions.isConfirmFadeOut ||
    transitions.isModeTransitioning ||
    transitions.isBackTransitioning ||
    isSwitchingToDirectory ||
    isSwitchingToProfile ||
    isFinishingSetup ||
    isDeleteTransitioning;

  // Convenience: get main/champion keys for the confirmed character's world
  const confirmedWorldId = confirmedCharacter?.worldID ?? null;
  const mainCharacterKey = confirmedWorldId !== null
    ? getMainKeyForWorld(mainCharacterKeyByWorld, confirmedWorldId)
    : null;
  const championCharacterKeys = confirmedWorldId !== null
    ? getChampionKeysForWorld(championCharacterKeysByWorld, confirmedWorldId)
    : [];

  const isResumableDraft = useCallback(
    (draft: SetupDraft | null) =>
      Boolean(draft?.confirmedCharacter) &&
      !draft?.completedFlowIds?.includes(requiredFlowId),
    [requiredFlowId],
  );

  const refreshDraftSummaries = useCallback(() => {
    const now = Date.now();
    setDraftSummaries(
      // react-doctor-disable-next-line js-combine-iterations -- pruneAndReadSetupDrafts is capped at MAX_SETUP_DRAFTS (5), extra pass is negligible per the rule's own FP criteria
      pruneAndReadSetupDrafts()
        .filter((draft) => isResumableDraft(draft))
        .map((draft) => ({
          characterKey: draft.characterKey,
          characterName: draft.confirmedCharacter?.characterName ?? draft.query,
          jobName: draft.confirmedCharacter?.jobName ?? "",
          imgUrl: draft.confirmedCharacter?.characterImgURL ?? "",
          flowId: draft.activeFlowId,
          flowLabel: getSetupFlowLabel(draft.activeFlowId),
          started: draft.setupStepIndex >= 1 || Object.keys(draft.setupStepTestByStep).length > 0,
          stepIndex: draft.setupStepIndex,
          stepCount: getFlowStepCount(draft.activeFlowId),
          savedAt: draft.savedAt,
          expired: draft.confirmedCharacter ? now > draft.confirmedCharacter.expiresAt : false,
        })),
    );
  }, [isResumableDraft]);

  // Tracks the freshest record passed to upsertRosterCharacter this tick. The localStorage
  // write happens later, in the writeCharactersStore effect below, keyed off the
  // characterRoster state this schedules rather than written synchronously, so anything
  // needing the just-upserted data immediately afterward (see finishSetupFlow's resync) would
  // otherwise read stale storage.
  const lastUpsertedCharacterRef = useRef<StoredCharacterRecord | null>(null);
  const upsertRosterCharacter = useCallback((character: StoredCharacterRecord) => {
    lastUpsertedCharacterRef.current = character;
    const key = toCharacterKey(character);
    setCharacterRoster((prev) => {
      const existingIndex = prev.findIndex((entry) => toCharacterKey(entry) === key);
      if (existingIndex === -1) return [...prev, character];
      const next = [...prev];
      next[existingIndex] = character;
      return next;
    });
    // Set as main only when this is the world's first character, not merely when no main is
    // set. The looser check also fired for a mule added after the main was removed, promoting
    // whichever character happened to come next. A world that already has characters never
    // gets an automatic main, leaving setMainCharacter as the only way to assign one.
    const worldIsEmpty = !characterRoster.some(
      (entry) => entry.worldID === character.worldID && toCharacterKey(entry) !== key,
    );
    if (!worldIsEmpty) return;
    setMainCharacterKeyByWorld((prev) => {
      const worldKey = String(character.worldID);
      if (prev[worldKey]) return prev;
      return { ...prev, [worldKey]: key };
    });
  }, [characterRoster]);

  // Profile-page correction for which Hyper Stat or Inner Ability preset is equipped in game.
  // Setup never asks and saves preset 1 by default, so this is the only way that value
  // becomes accurate. No-ops when the character never collected the field, leaving nothing to
  // mark active.
  const setStatsActivePreset = useCallback((field: "hyperStat" | "innerAbility", presetIndex: number) => {
    if (!confirmedCharacter) return;
    const existing = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
    const current = existing?.stats?.[field];
    if (!existing || !current) return;
    const updated = { ...current, activePreset: presetIndex };
    // Switching the active Inner Ability preset can change the scouter-facing line (Passive
    // or Multi Target +1), so recompute it here or it goes stale against whichever preset is
    // now active. Only ever sets a derived answer, never clearing one back to unset, matching
    // the other derive-over-manual call sites.
    let innerAbilityLine: "passive" | "multiTarget" | "neither" | undefined;
    if (field === "innerAbility") {
      const updatedIA = updated as StoredInnerAbility;
      if (innerAbilityHasData(updatedIA)) innerAbilityLine = deriveInnerAbilityLine(updatedIA) ?? "neither";
    }
    upsertRosterCharacter({
      ...existing,
      stats: { ...existing.stats, [field]: updated },
      scouter: innerAbilityLine ? { ...existing.scouter, innerAbilityLine } : existing.scouter,
    });
  }, [confirmedCharacter, upsertRosterCharacter]);

  // Same profile-page correction as setStatsActivePreset above, for which equipment
  // preset (0-2) is actually equipped in-game.
  const setEquipmentActivePreset = useCallback((presetIndex: number) => {
    if (!confirmedCharacter) return;
    const existing = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
    if (!existing) return;
    const updated = { ...existing.equipment, activePreset: presetIndex };
    upsertRosterCharacter({
      ...existing,
      equipment: updated,
      // Whichever preset is now active is definitive, so re-derive against it rather than
      // only flipping true. Switching presets can genuinely gain or lose Genesis Liberation,
      // weapon hand or Ruin Force Shield.
      isLiberated: deriveIsLiberatedFromWeapon(updated) ?? existing.isLiberated,
      weaponHand: deriveWeaponHandFromWeapon(updated) ?? existing.weaponHand,
      hasRuinForceShield: deriveHasRuinForceShield(updated) ?? existing.hasRuinForceShield,
    });
  }, [confirmedCharacter, upsertRosterCharacter]);

  // Same profile-page correction as setStatsActivePreset and setEquipmentActivePreset above,
  // for which of a HEXA Stat node's 2 presets is equipped in game. Each node has its own
  // activePreset. No-ops when the character has no saved HEXA Stat data or has not reached
  // that node's index.
  //
  // Unlike those two, HEXA Stat and Familiars below are collected by optional standalone
  // flows that are never bundled into required setup, so a character can exist with no saved
  // data for either. That made this a no-op, and hid the profile's "Set active" button, which
  // is gated on the same saved data. Both now build an empty shell on demand, so setting the
  // active preset works before the step has been visited.
  const setHexaStatActivePreset = useCallback((nodeIndex: number, presetIndex: number) => {
    if (!confirmedCharacter) return;
    const existing = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
    if (!existing) return;
    const saved = (existing.tools?.hexaStat as { nodes?: HexaStatNode[] } | undefined) ?? { nodes: [] };
    const nodes = [...(saved.nodes ?? [])];
    while (nodes.length <= nodeIndex) nodes.push(emptyHexaStatNodeShell());
    nodes[nodeIndex] = { ...nodes[nodeIndex], activePreset: presetIndex };
    upsertRosterCharacter({ ...existing, tools: { ...existing.tools, hexaStat: { ...saved, nodes } } });
  }, [confirmedCharacter, upsertRosterCharacter]);

  // Same profile-page correction as setStatsActivePreset/setEquipmentActivePreset above, for
  // which familiars preset (0-4) is actually equipped in-game.
  const setFamiliarsActivePreset = useCallback((presetIndex: number) => {
    if (!confirmedCharacter) return;
    const existing = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
    if (!existing) return;
    const familiars = existing.familiars ?? emptyStoredFamiliarsData();
    upsertRosterCharacter({ ...existing, familiars: { ...familiars, activePreset: presetIndex } });
  }, [confirmedCharacter, upsertRosterCharacter]);

  // Persists the Overview bookmark's per-character customized section list (order +
  // visibility). `null` clears back to the tier default rather than saving an empty array.
  const setOverviewLayout = useCallback((layout: OverviewSectionId[] | null) => {
    if (!confirmedCharacter) return;
    const existing = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
    if (!existing) return;
    upsertRosterCharacter({ ...existing, overviewLayout: layout ?? undefined });
  }, [confirmedCharacter, upsertRosterCharacter]);

  const applyDraftFlowState = useCallback(
    (
      draft: SetupDraft,
      completedFlowIds: SetupFlowId[],
      options?: {
        includeSetupMode?: boolean;
        includeStartedFlags?: boolean;
        includeVisibility?: boolean;
      },
    ) => {
      setCompletedFlowIds(completedFlowIds);
      setActiveFlowId(draft.activeFlowId);
      setSetupStepIndex(draft.setupStepIndex);
      setSetupStepDirection(draft.setupStepDirection);
      setSetupSubstepIndex(draft.setupSubstepIndex ?? 0);
      // Seeds the freshly mounted step's initial substep (see the targetSubstep fallback in
      // Stats, Equipment and HexaMatrixSetupStep). Safe to always set here, since normal
      // navigation clears it back to null (see setSetupStepWithDirection), so it cannot
      // linger and force a stale substep after the player has moved elsewhere in the step.
      setSetupTargetSubstep(draft.setupSubstepIndex ?? null);
      // A draft resume is always normal full navigation, never a bookmark's confined
      // single-substep edit.
      setSetupConfineToSubstep(false);
      setSetupStepTestByStep(draft.setupStepTestByStep ?? {});
      // Restored from the draft rather than wiped. The draft's step data can still be
      // invalid, and forgetting that here is what let people resume past it.
      setStepValidityById(draft.stepValidityById ?? {});
      setConfirmedCharacter(draft.confirmedCharacter);

      if (options?.includeSetupMode) setSetupMode(draft.setupMode);
      if (options?.includeStartedFlags) setSetupFlowStarted(draft.setupFlowStarted);
      if (options?.includeVisibility) {
        setShowFlowOverview(Boolean(draft.showFlowOverview));
        setShowCharacterDirectory(Boolean(draft.showCharacterDirectory));
      }
    },
    [],
  );

  // Shared by switchToCharacterProfile (mid-session, animated) and the initial hydration
  // route-intent resolution below (first paint, no animation needed since there's nothing
  // on screen yet to transition from).
  const applyConfirmedProfileView = useCallback(
    (character: StoredCharacterRecord) => {
      setIsAddingCharacter(false);
      const store = readCharactersStore();
      const storedCharacter = selectCharacterById(store, toCharacterKey(character));
      setConfirmedCharacter(character);
      // Every fresh arrival at a profile, whether from the directory, search or first paint,
      // lands on Overview. The remembered bookmark applies only to returning from a flow
      // started mid-session on this same open profile, not to a later separate visit.
      setLastActiveBookmark(null);
      setSetupMode("search");
      setSetupFlowStarted(true);
      setShowCharacterDirectory(false);
      setActiveFlowId(requiredFlowId);
      setCompletedFlowIds([requiredFlowId]);
      setShowFlowOverview(false);
      setSetupStepIndex(0);
      setSetupStepDirection("forward");
      setSetupStepTestByStep(buildSeededStepTestByStep(character.jobName, storedCharacter));
      setStepValidityById({});
    },
    [requiredFlowId],
  );

  // Shared by openAddCharacterSearch (mid-session, animated) and the initial hydration
  // route-intent resolution below.
  const applyAddCharacterView = useCallback(() => {
    setIsAddingCharacter(true);
    setShowCharacterDirectory(false);
    setShowFlowOverview(false);
    setSetupMode("search");
    setSetupFlowStarted(false);
    setFoundCharacter(null);
    setConfirmedCharacter(null);
    setQuery("");
    lookup.resetSearchStateMessage();
  }, [lookup]);

  const showCompletedDirectoryState = useCallback(
    (
      store: ReturnType<typeof readCharactersStore>,
      roster: StoredCharacterRecord[],
    ) => {
      setCharacterRoster(roster);
      setMainCharacterKeyByWorld(store.mainCharacterIdByWorld);
      setChampionCharacterKeysByWorld(store.championCharacterIdsByWorld);
      setSetupMode("search");
      setSetupFlowStarted(true);
      setShowFlowOverview(true);
      setShowCharacterDirectory(true);
      setSetupPanelVisible(true);
      setSuppressLayoutTransition(false);
      setHasCompletedRequiredSetupEver(true);
    },
    [setSetupPanelVisible, setSuppressLayoutTransition],
  );

  const restoreCompletedFlowState = useCallback(
    (draft: SetupDraft, nextCompletedFlowIds: SetupFlowId[]) => {
      applyDraftFlowState(draft, nextCompletedFlowIds);
      setSetupMode("search");
      setSetupFlowStarted(true);
      setShowFlowOverview(true);
      setShowCharacterDirectory(true);
      setIsAddingCharacter(false);
      setSetupPanelVisible(true);
      setSuppressLayoutTransition(false);
      setHasCompletedRequiredSetupEver(true);
    },
    [applyDraftFlowState, setSetupPanelVisible, setSuppressLayoutTransition],
  );

  const hydrateDraftCommonState = useCallback(
    (
      draft: SetupDraft,
      store: ReturnType<typeof readCharactersStore>,
      storedRoster: StoredCharacterRecord[],
      accountHasCompletedRequiredFlow: boolean,
    ) => {
      const nextCompletedFlowIds = normalizeCompletedFlowIds(draft.completedFlowIds ?? []);
      const hasCompletedRequiredFlow = nextCompletedFlowIds.includes(requiredFlowId);

      if (hasCompletedRequiredFlow && draft.confirmedCharacter) {
        removeSetupDraftForCharacter(draft.confirmedCharacter);
      }

      setHasCompletedRequiredSetupEver(
        accountHasCompletedRequiredFlow || hasCompletedRequiredFlow,
      );

      setQuery(draft.query);
      setCharacterRoster(storedRoster);
      setMainCharacterKeyByWorld(store.mainCharacterIdByWorld);
      setChampionCharacterKeysByWorld(store.championCharacterIdsByWorld);

      return { nextCompletedFlowIds, hasCompletedRequiredFlow };
    },
    [requiredFlowId],
  );

  const handleDraftHydration = useCallback(
    (
      draft: SetupDraft | null,
      store: ReturnType<typeof readCharactersStore>,
      storedRoster: StoredCharacterRecord[],
      accountHasCompletedRequiredFlow: boolean,
    ) => {
      // Route intent, meaning ?character= or ?action=add from a fresh navigation, resolves
      // straight to its target here before first paint, rather than restoring the last
      // session's draft and directory state and correcting course afterward. Restoring then
      // redirecting is what caused a visible flash of the wrong screen on a deep-linked
      // reload.
      if (initialCharacterName) {
        const key = normalizeCharacterName(initialCharacterName);
        const character = storedRoster.find((c) => toCharacterKey(c) === key);
        if (character) {
          setCharacterRoster(storedRoster);
          setMainCharacterKeyByWorld(store.mainCharacterIdByWorld);
          setChampionCharacterKeysByWorld(store.championCharacterIdsByWorld);
          setHasCompletedRequiredSetupEver(true);
          applyConfirmedProfileView(character);
          setSetupPanelVisible(true);
          return;
        }
      } else if (initialAction === "add" && accountHasCompletedRequiredFlow) {
        // A first-time user with no characters yet falls through rather than being forced
        // into search mode. The homepage's empty-state "Add Character" link should land on
        // the intro screen's Import or Search choice, the same as visiting /characters
        // fresh, instead of skipping past it the way a returning user's action should.
        setCharacterRoster(storedRoster);
        setMainCharacterKeyByWorld(store.mainCharacterIdByWorld);
        setChampionCharacterKeysByWorld(store.championCharacterIdsByWorld);
        setHasCompletedRequiredSetupEver(true);
        applyAddCharacterView();
        return;
      }

      if (!draft) {
        if (accountHasCompletedRequiredFlow) {
          showCompletedDirectoryState(store, storedRoster);
        } else {
          setHasCompletedRequiredSetupEver(false);
        }
        return;
      }

      const { nextCompletedFlowIds, hasCompletedRequiredFlow } =
        hydrateDraftCommonState(draft, store, storedRoster, accountHasCompletedRequiredFlow);

      if (hasCompletedRequiredFlow || accountHasCompletedRequiredFlow) {
        restoreCompletedFlowState(draft, nextCompletedFlowIds);
      } else {
        applyDraftFlowState(draft, nextCompletedFlowIds);
      }
    },
    // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on `initialCharacterName`/`initialAction` (derived once from `frozenRouteIntent`, itself frozen at mount via useState's lazy initializer and never updated after), not the source object
    [
      applyAddCharacterView,
      applyConfirmedProfileView,
      applyDraftFlowState,
      hydrateDraftCommonState,
      initialAction,
      initialCharacterName,
      restoreCompletedFlowState,
      setSetupPanelVisible,
      showCompletedDirectoryState,
    ],
  );

  useEffect(() => {
    if (!foundCharacter) {
      const resetTimer = window.setTimeout(() => {
        setPreviewCardReady(false);
        setPreviewContentReady(false);
        setPreviewImageLoaded(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }
    const prepTimer = window.setTimeout(() => {
      setPreviewImageLoaded(false);
    }, 0);
    const cardTimer = setTimeout(() => setPreviewCardReady(true), CHARACTERS_TRANSITION_MS.slow);
    const contentTimer = setTimeout(
      () => setPreviewContentReady(true),
      CHARACTERS_TRANSITION_MS.slow + CHARACTERS_TRANSITION_MS.fast,
    );
    return () => {
      clearTimeout(prepTimer);
      clearTimeout(cardTimer);
      clearTimeout(contentTimer);
    };
  }, [foundCharacter]);

  useEffect(() => {
    // Meant to run exactly once per mount. handleDraftHydration, and its dependency
    // applyAddCharacterView, transitively depend on `lookup`, which useCharacterLookup
    // returns as a fresh object every render. Without this guard the effect's own deps would
    // churn every render and re-run hydration, stomping whatever state the user had
    // navigated to, wiping the search query on every keystroke or snapping back to the
    // initial route intent's screen instead of wherever they just clicked.
    if (hasHydratedSetupDraftRef.current) return;

    const draft = readLastSetupDraft();
    const store = readCharactersStore();
    const storedRoster = selectCharactersList(store);
    const accountHasCompletedRequiredFlow = hasStoredCompletedRequiredSetup(store);

    const hydrateTimer = window.setTimeout(() => {
      handleDraftHydration(draft, store, storedRoster, accountHasCompletedRequiredFlow);
      // handleDraftHydration's branches, such as showCompletedDirectoryState, reset this to
      // false, so it is set afterward to win for this batch. Suppresses the search and
      // preview pane width transition for this first resolved paint only. Without it the
      // pane animates from its collapsed pre-hydration width up to its final width, and
      // content that wraps at narrow widths, such as the HEXA skill icon row, reflows
      // mid-transition. Cleared a beat later so normal transitions keep animating.
      setSuppressLayoutTransition(true);
      hasHydratedSetupDraftRef.current = true;
      setIsDraftHydrated(true);
      refreshDraftSummaries();
      queueTransitionTimer(() => {
        setSuppressLayoutTransition(false);
      }, CHARACTERS_TRANSITION_MS.standard);

      // Queue stale mains and champions for background auto-refresh, but only for the world
      // the directory is about to land on. Resolved exactly as the directory pane resolves
      // its own filter, so the two always agree on which world that is.
      const landingWorldId = resolveWorldFilter(
        readStoredWorldFilter(),
        rosterWorldIds(storedRoster),
      );
      const stale = collectStaleWorldCharacters(
        landingWorldId,
        store.mainCharacterIdByWorld,
        store.championCharacterIdsByWorld,
        new Map(Object.entries(store.charactersById)),
      );
      if (stale.length > 0) setAutoRefreshQueue(stale);
    }, 0);
    return () => clearTimeout(hydrateTimer);
  }, [handleDraftHydration, queueTransitionTimer, refreshDraftSummaries, setSuppressLayoutTransition]);

  // Keep the resumable-draft list fresh each time the search-entry screen is shown
  // (covers add-character, back navigation, and post-finish returns). The setState
  // runs inside a timer to stay clear of the no-set-state-in-effect rule, mirroring
  // the hydrate effect above.
  useEffect(() => {
    if (!hasHydratedSetupDraftRef.current) return;
    if (setupMode !== "search" || setupFlowStarted) return;
    const id = window.setTimeout(() => refreshDraftSummaries(), 0);
    return () => clearTimeout(id);
  }, [setupMode, setupFlowStarted, refreshDraftSummaries]);

  // Persist store whenever roster or world-scoped keys change
  useEffect(() => {
    if (!hasHydratedSetupDraftRef.current) return;
    if (typeof window === "undefined") return;

    const existingStore = readCharactersStore();
    // The pre-hydration race, where the roster is momentarily empty before load, is handled
    // by the hasHydratedSetupDraftRef guard above. By this point hydration has run, so an
    // empty roster is intentional, such as the user removing their last character, and must
    // be persisted. Otherwise that final character would survive in storage and reappear.
    const now = Date.now();
    // characterRoster is already StoredCharacterRecord[]. Gender and marriage change only
    // when the roster itself changes, via a setup flow's Finish calling upsertRosterCharacter,
    // not live as the draft is typed. With multiple setup flows, a value typed into one flow
    // should not count until that flow's own Finish commits it (see
    // finalizeQuickOrFullSetupRecord and applyMapleScouterFlow). Also updates meta.updatedAt
    // when the character data changed since the last save.
    const nextCharactersById = characterRoster.reduce<Record<string, StoredCharacterRecord>>(
      (acc, character) => {
        const id = toCharacterKey(character);
        const existingRecord = existingStore.charactersById[id];
        // The same reference as last pass means nothing in-band changed this character's
        // tools this tick, so trust disk as-is rather than re-merging, and an unrelated
        // roster update cannot drag it back to a stale memory copy over a newer out-of-band
        // write. Only a character whose tools reference changed, from an in-band write or
        // its first pass, goes through the disk and memory merge below.
        const toolsUnchangedSinceLastPass = lastSeenToolsRef.current[id] === character.tools;
        lastSeenToolsRef.current[id] = character.tools;
        const mergedTools = toolsUnchangedSinceLastPass && existingRecord
          ? existingRecord.tools
          // Two independent paths write `tools`. Out-of-band writes go through
          // characterToolStorage.ts's writeCharacterToolData for symbols, liberation, hexa
          // skills, scouterResult and the rest, edited from their own tool pages, patching
          // disk directly and never syncing back into characterRoster. In-band writes come
          // from a setup-flow finish, such as HEXA Matrix inside MapleScouter or Full Setup,
          // which builds a fresh tools object and pushes it into characterRoster before this
          // effect runs, this effect being what flushes it to disk. Picking either side
          // outright breaks the other: disk alone discards the setup-flow finish in flight in
          // `character.tools`, and memory alone discards an out-of-band write. Spread disk
          // first so a key only an out-of-band write has survives, then overlay memory so a
          // key the current character object carries wins.
          : { ...existingRecord?.tools, ...character.tools };
        acc[id] = {
          ...character,
          tools: mergedTools,
          // `character`, the in-memory state from characterRoster, is authoritative for these
          // two. Every upsert path either sets them explicitly, as
          // applyGenderDraftToRoster, applyMarriageDraftToRoster and quick and full setup do,
          // or carries them forward by spread, as handleRefreshed and every other upsert do.
          // Falling back to existingRecord, the pre-write value on disk, needed `??`, which
          // cannot tell an untouched field from one explicitly cleared to null, so an
          // intentional clear from the Bio bookmark's Gender or Partner pencil was reverted
          // on the next persist.
          meta: {
            addedAt: character.meta.addedAt,
            updatedAt:
              existingRecord && existingRecord.fetchedAt === character.fetchedAt
                ? character.meta.updatedAt
                : now,
          },
        };
        return acc;
      },
      {},
    );

    // Filter world-scoped keys to only valid characters
    const nextMainCharacterIdByWorld: Record<string, string> = {};
    for (const [worldId, key] of Object.entries(mainCharacterKeyByWorld)) {
      if (nextCharactersById[key]) nextMainCharacterIdByWorld[worldId] = key;
    }
    const nextChampionCharacterIdsByWorld: Record<string, string[]> = {};
    for (const [worldId, keys] of Object.entries(championCharacterKeysByWorld)) {
      const validKeys = keys.filter((id) => Boolean(nextCharactersById[id]));
      if (validKeys.length > 0) nextChampionCharacterIdsByWorld[worldId] = validKeys;
    }

    // Re-read the world-scoped fields immediately before writing rather than reusing the
    // earlier existingStore read. This effect fires on every setup-flow keystroke in any step
    // and any open tab, and the roster rebuild above takes real time, leaving a window where
    // a concurrent writeLegionArtifactForWorld call from another tab could land in between
    // and be clobbered by this pass-through write. Link skills no longer need this, since
    // they live on each character's own record and ride through nextCharactersById above,
    // rather than in a world-scoped map that could race a separate writer.
    const freshWorldFields = readCharactersStore();
    const nextStore = {
      version: existingStore.version,
      order: characterRoster.map((character) => toCharacterKey(character)),
      mainCharacterIdByWorld: nextMainCharacterIdByWorld,
      championCharacterIdsByWorld: nextChampionCharacterIdsByWorld,
      charactersById: nextCharactersById,
      scouterLegionByWorld: freshWorldFields.scouterLegionByWorld,
      legionArtifactByWorld: freshWorldFields.legionArtifactByWorld,
      updatedAt: now,
    };

    writeCharactersStore(nextStore);
  }, [
    championCharacterKeysByWorld,
    characterRoster,
    mainCharacterKeyByWorld,
  ]);

  // Persist draft
  useEffect(() => {
    if (!hasHydratedSetupDraftRef.current) return;
    if (typeof window === "undefined") return;
    if (!confirmedCharacter) return;

    const hasCompletedRequiredFlow = completedFlowIds.includes(requiredFlowId);
    if (hasCompletedRequiredFlow) {
      removeSetupDraftForCharacter(confirmedCharacter);
      return;
    }

    const characterKey = makeDraftCharacterKey(confirmedCharacter);
    const draft: SetupDraft = {
      version: 1,
      characterKey,
      query,
      setupMode,
      setupFlowStarted,
      autoResumeOnLoad: setupFlowStarted,
      activeFlowId,
      completedFlowIds,
      showFlowOverview,
      showCharacterDirectory,
      setupStepIndex: clampFlowStepIndex(activeFlowId, setupStepIndex),
      setupStepDirection,
      setupSubstepIndex,
      setupStepTestByStep,
      stepValidityById,
      confirmedCharacter,
      savedAt: Date.now(),
    };

    writeSetupDraft(draft);
  }, [
    activeFlowId,
    championCharacterKeysByWorld,
    characterRoster,
    completedFlowIds,
    confirmedCharacter,
    mainCharacterKeyByWorld,
    query,
    requiredFlowId,
    setupFlowStarted,
    setupMode,
    setupStepDirection,
    setupStepIndex,
    setupSubstepIndex,
    setupStepTestByStep,
    stepValidityById,
    showCharacterDirectory,
    showFlowOverview,
  ]);

  useEffect(() => {
    immediateUiLockRef.current = isUiLocked;
  // react-doctor-disable-next-line exhaustive-deps -- deliberately depends on the derived `isUiLocked` boolean, not the 7 raw fields it's computed from, since any change to those fields changes isUiLocked too
  }, [isUiLocked]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [setupFlowStarted, setupMode, setupStepIndex, showFlowOverview]);

  const beginSetupFlowTransition = useCallback(
    (args: {
      character: NormalizedCharacterData;
      source: "found-character" | "resume";
      flowId: SetupFlowId;
      completedFlowIds: SetupFlowId[];
      showFlowOverview: boolean;
      showCharacterDirectory: boolean;
      stepIndex: number;
      stepDirection: "forward" | "backward";
      substepIndex: number;
      stepData: SetupStepInputById;
      stepValidityById: Record<string, boolean>;
    }) => {
      transitions.beginSetupFlowTransition(args, {
        setSetupMode,
        setFoundCharacter,
        setConfirmedCharacter,
        setSetupFlowStarted,
        setActiveFlowId,
        setCompletedFlowIds,
        setShowFlowOverview,
        setShowCharacterDirectory,
        setSetupStepIndex,
        setSetupStepDirection,
        setSetupTargetSubstep,
        setSetupConfineToSubstep,
        setSetupSubstepIndex,
        setSetupStepTestByStep,
        setStepValidityById,
      });
    },
    [transitions],
  );

  const runBackToIntroTransition = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsAddingCharacter(false);
    if (confirmedCharacter) {
      const draft = readSetupDraftByCharacter(confirmedCharacter);
      if (draft) writeSetupDraft({ ...draft, autoResumeOnLoad: false, setupFlowStarted: false, savedAt: Date.now() });
    }
    transitions.runBackToIntroTransition({
          resetSearchStateMessage: lookup.resetSearchStateMessage,
      setSetupMode,
      setFoundCharacter,
      setConfirmedCharacter,
      setSetupFlowStarted,
      setActiveFlowId,
      setCompletedFlowIds,
      setShowFlowOverview,
      setShowCharacterDirectory,
      setSetupStepIndex,
      setSetupStepDirection,
      setSetupTargetSubstep,
      setSetupConfineToSubstep,
      setSetupSubstepIndex,
      setSetupStepTestByStep,
      setStepValidityById,
    });
  }, [confirmedCharacter, lookup, transitions]);

  const runTransitionToMode = useCallback(
    (nextMode: SetupMode) => {
      if (immediateUiLockRef.current) return;
      immediateUiLockRef.current = true;
      // Deliberately does not reset isAddingCharacter. Switching between search and import is
      // not leaving the add-character flow, just picking a different screen within it. The
      // "instead" links on Search and Import call this mid-flow, with isAddingCharacter true
      // after arriving via the directory's add tile, and need that flag to survive, or
      // Import's Back button falls through to runBackToIntroTransition rather than
      // backFromAddCharacter. FirstTimeSetupScreen's own buttons are the only other caller
      // and are unaffected, since isAddingCharacter is already false wherever that screen is
      // reachable.
      transitions.runTransitionToMode(nextMode, {
        resetSearchStateMessage: lookup.resetSearchStateMessage,
        setSetupMode,
        setFoundCharacter,
        setConfirmedCharacter,
        setSetupFlowStarted,
        setActiveFlowId,
        setCompletedFlowIds,
        setShowFlowOverview,
        setShowCharacterDirectory,
        setSetupStepIndex,
        setSetupStepDirection,
        setSetupTargetSubstep,
        setSetupConfineToSubstep,
        setSetupSubstepIndex,
        setSetupStepTestByStep,
        setStepValidityById,
      });
    },
    [lookup, transitions],
  );

  const backFromSetupFlowToAddCharacter = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    if (confirmedCharacter) {
      const draft = readSetupDraftByCharacter(confirmedCharacter);
      if (draft) writeSetupDraft({ ...draft, autoResumeOnLoad: false, setupFlowStarted: false, savedAt: Date.now() });
    }
    transitions.runBackTransition(() => {
      setIsAddingCharacter(true);
      setSetupFlowStarted(false);
      setShowFlowOverview(false);
      setShowCharacterDirectory(false);
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setSetupStepIndex(0);
      setSetupStepDirection("forward");
      setSetupStepTestByStep({});
      setStepValidityById({});
      lookup.resetSearchStateMessage();
    });
  }, [confirmedCharacter, lookup, transitions]);

  const backToCharactersDirectory = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsSwitchingToDirectory(true);

    transitions.runBackTransition(
      () => {
        setFastDirectoryRevealOnce(true);
        setIsAddingCharacter(false);
        setSetupMode("search");
        setSetupFlowStarted(true);
        transitions.setSetupPanelVisible(true);
        setShowFlowOverview(true);
        setShowCharacterDirectory(true);
        setSetupStepIndex(0);
        setSetupStepDirection("backward");
      },
      { enableSearchFadeIn: false },
    );

    transitions.queueTransitionTimer(() => {
      setIsSwitchingToDirectory(false);
    }, CHARACTERS_TRANSITION_MS.slow);
  }, [transitions]);

  const setSetupStepWithDirection = useCallback(
    (nextStep: number, forceDirection?: "forward" | "backward") => {
      // Any normal navigation, whether Prev, Next or a step-level jump, supersedes a prior
      // substep-jump target. Only jumpToSubstep below may set one.
      setSetupTargetSubstep(null);
      setSetupConfineToSubstep(false);
      const direction = forceDirection ?? (nextStep > setupStepIndex ? "forward" : "backward");
      const jobName = confirmedCharacter?.jobName ?? "";
      const { gender, skipMarriage } = getClassSetupOverrides(jobName);
      const stepCount = getFlowStepCount(activeFlowId);
      let target = Math.max(0, Math.min(stepCount, nextStep));
      const characterLevel = confirmedCharacter?.level;
      while (target >= 1 && target <= stepCount && isStepSkippedForClass(activeFlowId, target, gender, skipMarriage, characterLevel, jobName)) {
        target += direction === "forward" ? 1 : -1;
      }
      target = Math.max(0, Math.min(stepCount, target));
      if (target === setupStepIndex) return;
      // Same rule as the Next button's disabled state (SetupStepFrame's nextDisabled).
      // Jumping forward past the earliest invalid or incomplete step, in this flow's order
      // since a step's validity can outlive leaving it, is blocked the way advancing normally
      // is. Backward jumps, and jumping onto the broken step itself, are always allowed.
      if (target > setupStepIndex) {
        const firstInvalid = getFirstInvalidStepIndex(activeFlowId, stepValidityById, gender, skipMarriage, setupStepTestByStep.stats ?? "", characterLevel, jobName);
        if (firstInvalid !== null && target > firstInvalid) return;
      }
      setSetupStepDirection(direction);
      setSetupStepIndex(target);
      // Backing out of an optional flow to the profile overview, step 0, abandons whatever
      // was not Finished. For a character that already has a stored record there is no
      // resume-later feature for that abandoned edit, unlike a new character's Quick or Full
      // Setup onboarding draft, so discard it by reseeding from the stored truth rather than
      // leaving a stale draft in memory for the session, which previously only a page reload
      // cleared. A character with no stored record yet, still mid-onboarding, is left alone,
      // since that is exactly what the separate setupDraftStorage system preserves.
      if (target === 0 && confirmedCharacter) {
        const storedCharacter = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
        if (storedCharacter) {
          setSetupStepTestByStep(buildSeededStepTestByStep(confirmedCharacter.jobName, storedCharacter));
        }
      }
    },
    [activeFlowId, confirmedCharacter, setupStepIndex, stepValidityById, setupStepTestByStep],
  );

  // Jumps directly into a specific substep of a step, such as Stats' Inner Ability. The
  // target step index is trusted to be a visible, non-skipped step, since the jump menu only
  // offers substeps for steps it is already showing. substepJumpNonce always changes so the
  // target step remounts even when re-targeting the same substep it is showing but has since
  // navigated away from internally.
  const jumpToSubstep = useCallback((nextStep: number, substepIndex: number) => {
    const jobName = confirmedCharacter?.jobName ?? "";
    const { gender, skipMarriage } = getClassSetupOverrides(jobName);
    const characterLevel = confirmedCharacter?.level;
    const stepCount = getFlowStepCount(activeFlowId);
    const target = Math.max(0, Math.min(stepCount, nextStep));
    const firstInvalid = getFirstInvalidStepIndex(activeFlowId, stepValidityById, gender, skipMarriage, setupStepTestByStep.stats ?? "", characterLevel, jobName);
    if (firstInvalid !== null && target > firstInvalid) return;
    setSetupStepDirection("forward");
    setSetupStepIndex(target);
    setSetupTargetSubstep(substepIndex);
    // The step-jump menu is general free-roam navigation, never a confined bookmark edit.
    setSetupConfineToSubstep(false);
    setSubstepJumpNonce((n) => n + 1);
  }, [activeFlowId, confirmedCharacter, stepValidityById, setupStepTestByStep]);

  // SetupStepFrame reports the mounted step's Next-button validity here (see its
  // onValidityChange prop), bound to the active step id in SetupFlowScreen since the frame
  // itself only knows a plain valid or invalid boolean.
  const reportStepValidity = useCallback((stepId: string, valid: boolean) => {
    setStepValidityById((prev) => (prev[stepId] === valid ? prev : { ...prev, [stepId]: valid }));
  }, []);

  // Stats, Equipment and HEXA Matrix report their current substep here (see each component's
  // onSubstepChange) so it can be persisted for resume. See setupSubstepIndex above.
  const reportCurrentSubstep = useCallback((substepIndex: number) => {
    setSetupSubstepIndex((prev) => (prev === substepIndex ? prev : substepIndex));
  }, []);

  const resumeDraft = useCallback(async (characterKey: string) => {
    if (immediateUiLockRef.current) return;
    const draft = readSetupDraftByKey(characterKey);
    if (!draft || !isResumableDraft(draft) || !draft.confirmedCharacter) return;
    const snapshot = draft.confirmedCharacter;

    setIsAddingCharacter(false);
    setSetupMode("search");
    setIsStaleFallbackPreview(false);

    // The snapshot's base data is past its reset window, so re-fetch live through the normal
    // search and preview path instead of resuming on stale stats. Confirming the refreshed
    // result preserves the draft's entered step data (see confirmFoundCharacter). If the
    // refresh fails, fall back to the stale snapshot so the draft is not a dead end.
    if (Date.now() > snapshot.expiresAt) {
      setSetupFlowStarted(false);
      setConfirmedCharacter(null);
      transitions.setSetupPanelVisible(false);
      setQuery(snapshot.characterName);
      const found = await lookup.runLookup(snapshot.characterName);
      if (!found) {
        setIsStaleFallbackPreview(true);
        setFoundCharacter(snapshot);
      }
      return;
    }

    setQuery("");
    immediateUiLockRef.current = true;
    beginSetupFlowTransition({
      character: snapshot,
      source: "resume",
      flowId: draft.activeFlowId,
      completedFlowIds: normalizeCompletedFlowIds(draft.completedFlowIds ?? []),
      showFlowOverview: Boolean(
        draft.completedFlowIds?.includes(requiredFlowId) || draft.showFlowOverview,
      ),
      showCharacterDirectory: Boolean(draft.showCharacterDirectory),
      stepIndex: clampFlowStepIndex(
        draft.activeFlowId,
        draft.completedFlowIds?.includes(requiredFlowId) ? 0 : draft.setupStepIndex,
      ),
      stepDirection: draft.setupStepDirection,
      substepIndex: draft.completedFlowIds?.includes(requiredFlowId) ? 0 : (draft.setupSubstepIndex ?? 0),
      stepData: draft.setupStepTestByStep ?? {},
      stepValidityById: draft.stepValidityById ?? {},
    });

    writeSetupDraft({
      ...draft,
      setupFlowStarted: true,
      autoResumeOnLoad: true,
      savedAt: draft.savedAt,
    });
  }, [beginSetupFlowTransition, isResumableDraft, lookup, requiredFlowId, transitions]);

  const clearDraft = useCallback((characterKey: string) => {
    const draft = readSetupDraftByKey(characterKey);
    if (draft?.confirmedCharacter) removeSetupDraftForCharacter(draft.confirmedCharacter);
    refreshDraftSummaries();
  }, [refreshDraftSummaries]);

  // True when the searched character has a started, resumable draft, so the preview offers
  // Resume or Start fresh. A draft still at step 0, with no flow chosen, has no real progress
  // and confirms normally instead of prompting. Derived from draftSummaries rather than a
  // fresh localStorage read, so clearing the draft from the dropdown flips this off
  // immediately and the preview drops back to confirm.
  const foundCharacterHasResumableDraft = useMemo(() => {
    if (!foundCharacter) return false;
    const key = toCharacterKey(foundCharacter);
    return draftSummaries.some((summary) => summary.characterKey === key && summary.started);
  }, [foundCharacter, draftSummaries]);

  const resumeFoundCharacterDraft = useCallback(() => {
    if (immediateUiLockRef.current) return;
    if (!foundCharacter) return;
    const draft = readSetupDraftByCharacter(foundCharacter);
    if (!draft || !isResumableDraft(draft)) return;
    immediateUiLockRef.current = true;
    // Resume on the freshly-searched character (live base data), restoring the
    // draft's flow, position, and entered step data.
    beginSetupFlowTransition({
      character: foundCharacter,
      source: "resume",
      flowId: draft.activeFlowId,
      completedFlowIds: normalizeCompletedFlowIds(draft.completedFlowIds ?? []),
      showFlowOverview: Boolean(
        draft.completedFlowIds?.includes(requiredFlowId) || draft.showFlowOverview,
      ),
      showCharacterDirectory: Boolean(draft.showCharacterDirectory),
      stepIndex: clampFlowStepIndex(
        draft.activeFlowId,
        draft.completedFlowIds?.includes(requiredFlowId) ? 0 : draft.setupStepIndex,
      ),
      stepDirection: draft.setupStepDirection,
      substepIndex: draft.completedFlowIds?.includes(requiredFlowId) ? 0 : (draft.setupSubstepIndex ?? 0),
      stepData: draft.setupStepTestByStep ?? {},
      stepValidityById: draft.stepValidityById ?? {},
    });
  }, [beginSetupFlowTransition, foundCharacter, isResumableDraft, requiredFlowId]);

  const confirmFoundCharacter = useCallback(() => {
    if (immediateUiLockRef.current) return;
    if (!foundCharacter) return;

    const foundKey = toCharacterKey(foundCharacter);
    const alreadyAdded = characterRoster.some((entry) => toCharacterKey(entry) === foundKey);
    if (alreadyAdded) {
      lookup.setStatusTone("error");
      lookup.setStatusMessage(`${foundCharacter.characterName} is already added.`);
      return;
    }

    const existingCharacterDraft = readSetupDraftByCharacter(foundCharacter);
    immediateUiLockRef.current = true;

    beginSetupFlowTransition({
      character: foundCharacter,
      source: "found-character",
      flowId: requiredFlowId,
      completedFlowIds: normalizeCompletedFlowIds(
        existingCharacterDraft?.completedFlowIds ?? [],
      ),
      // A fresh confirm from search always lands on the intro step, never mid-flow, since
      // resuming is the Resume button's job. Restoring the draft's step index here meant
      // re-confirming a character whose draft had advanced skipped the intro entirely.
      // Entered stepData is still preserved below, so nothing typed is lost.
      showFlowOverview: false,
      showCharacterDirectory: false,
      stepIndex: 0,
      stepDirection: "forward",
      substepIndex: 0,
      stepData: existingCharacterDraft?.setupStepTestByStep ?? {},
      stepValidityById: existingCharacterDraft?.stepValidityById ?? {},
    });
  }, [
    beginSetupFlowTransition,
    characterRoster,
    foundCharacter,
    requiredFlowId,
    lookup,
  ]);

  const startFreshSetup = useCallback(() => {
    if (immediateUiLockRef.current) return;
    if (!foundCharacter) return;
    // Discard the saved draft so the confirm below starts from a clean slate
    // (confirmFoundCharacter reads the existing draft to seed step data).
    removeSetupDraftForCharacter(foundCharacter);
    confirmFoundCharacter();
  }, [confirmFoundCharacter, foundCharacter]);

  const finishSetupFlow = useCallback((overrideFlowId?: SetupFlowId, overrideStepData?: Record<string, string>) => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsFinishingSetup(true);

    transitions.queueTransitionTimer(() => {
      // Reset so the post-commit resync below can tell whether this finish upserted
      // anything, rather than reusing a leftover reference from an earlier finish.
      lastUpsertedCharacterRef.current = null;
      const effectiveFlowId = typeof overrideFlowId === "string" ? overrideFlowId : activeFlowId;
      // overrideStepData lets a caller such as skipSetupEntirely force specific field values
      // instead of whatever sits in the ambient draft. Passing it as an argument, rather than
      // writing setupStepTestByStep and calling finishSetupFlow straight after, avoids
      // relying on a state update landing before this closure reads it, which is not
      // guaranteed.
      const effectiveStepData: SetupStepInputById = overrideStepData
        ? { ...setupStepTestByStep, ...overrideStepData }
        : setupStepTestByStep;
      const isQuickSetupFlow = effectiveFlowId === requiredFlowId;
      const isFullSetupFlow = effectiveFlowId === "full_setup";
      if ((isQuickSetupFlow || isFullSetupFlow) && confirmedCharacter) {
        finalizeQuickOrFullSetupRecord(isFullSetupFlow, confirmedCharacter, effectiveStepData, characterRoster, upsertRosterCharacter);
        setHasCompletedRequiredSetupEver(true);
        removeSetupDraftForCharacter(confirmedCharacter);
      }

      if (effectiveFlowId === "stats_flow") {
        applyStatsDraftToRoster(confirmedCharacter, effectiveStepData.stats ?? "", upsertRosterCharacter);
      }

      if (effectiveFlowId === "maplescouter_setup"
        && applyMapleScouterFlow(confirmedCharacter, effectiveStepData, upsertRosterCharacter)) {
        setHasCompletedRequiredSetupEver(true);
        // full_setup and quick_setup run their own sync and propagation inside
        // finalizeQuickOrFullSetupRecord above, where storedRecord is built.
        // maplescouter_setup's upsert happens inside applyMapleScouterFlow instead, so it
        // needs its own call here. Uses lastUpsertedCharacterRef rather than a stale disk
        // read, per propagateLinkSkillFloorsAfterUpsert's comment; syncOrPropagateLinkSkills
        // explains the sync versus raise-only split.
        if (lastUpsertedCharacterRef.current) {
          syncOrPropagateLinkSkills(effectiveStepData.link_skills, lastUpsertedCharacterRef.current, characterRoster, upsertRosterCharacter);
        }
      }

      // maplescouter_setup, like full_setup, handles every step it owns (stats, oz_rings,
      // buffs, hexa_matrix) inside applyMapleScouterFlow's single upsert above. Running
      // applyStandaloneToolDrafts afterward re-processed hexa_matrix against a stale
      // readCharactersStore() snapshot, the first upsert's write not having reached storage
      // this tick (see upsertRosterCharacter), reverting stats, isLiberated, weaponHand and
      // scouter answers to their pre-finish values while only hexa_matrix appeared to save.
      const isMapleScouterFlow = effectiveFlowId === "maplescouter_setup";
      if (confirmedCharacter && !isFullSetupFlow && !isMapleScouterFlow) {
        applyStandaloneToolDrafts(confirmedCharacter, effectiveStepData, upsertRosterCharacter, effectiveFlowId);
      }

      // Resyncs every step draft to the just-committed state. Without it, a stale or
      // stepped-past draft for a different step, such as a stat typed into an abandoned
      // MapleScouter Setup attempt and never cleared, stays in memory and outlives this
      // Finish, resurfacing the next time another flow touches that step. Previously only a
      // page reload fixed it, being the only other place this seeding ran.
      if (confirmedCharacter) {
        // Uses the just-upserted record via lastUpsertedCharacterRef rather than a fresh
        // readCharactersStore() read. The localStorage write happens in a separate effect
        // keyed off the characterRoster state upsertRosterCharacter just scheduled, which has
        // not run yet in this synchronous tick, so reading storage here would see pre-finish
        // data and seed the resync with stale values despite everything above committing
        // correctly.
        const freshStored = lastUpsertedCharacterRef.current
          ?? selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
        setSetupStepTestByStep(buildSeededStepTestByStep(confirmedCharacter.jobName, freshStored ?? null));
      }

      setIsAddingCharacter(false);

      const updatedCompleted = Array.from(new Set([
        ...completedFlowIds,
        effectiveFlowId,
        // Full and MapleScouter are entry modes, so finishing either also satisfies the
        // required quick flow and the completed profile pane shows instead of looping back
        // to the setup intro.
        ...(effectiveFlowId === "full_setup" || effectiveFlowId === "maplescouter_setup" ? [requiredFlowId] : []),
      ]));
      setCompletedFlowIds(updatedCompleted);
      setShowFlowOverview(false);
      setShowCharacterDirectory(false);
      setActiveFlowId(requiredFlowId);
      setSetupStepIndex(0);
      setSetupStepDirection("forward");

      setIsFinishingSetup(false);
      immediateUiLockRef.current = false;
    }, CHARACTERS_TRANSITION_MS.standard);
  }, [
    activeFlowId,
    characterRoster,
    completedFlowIds,
    confirmedCharacter,
    requiredFlowId,
    setupStepTestByStep,
    transitions,
    upsertRosterCharacter,
  ]);

  const switchToCharacterProfile = useCallback(
    (character: StoredCharacterRecord) => {
      if (immediateUiLockRef.current) return;
      immediateUiLockRef.current = true;
      setIsSwitchingToProfile(true);
      transitions.queueTransitionTimer(() => {
        applyConfirmedProfileView(character);
        transitions.setSetupPanelVisible(true);
        transitions.playSearchFadeIn();
        setIsSwitchingToProfile(false);
        immediateUiLockRef.current = false;
      }, CHARACTERS_TRANSITION_MS.fast);
    },
    [applyConfirmedProfileView, transitions],
  );

  const setMainCharacter = useCallback((character: StoredCharacterRecord) => {
    setMainCharacterKeyByWorld((prev) =>
      setMainKeyForWorld(prev, character.worldID, toCharacterKey(character)),
    );
  }, []);

  const removeMainCharacter = useCallback((character: StoredCharacterRecord) => {
    setMainCharacterKeyByWorld((prev) => {
      if (getMainKeyForWorld(prev, character.worldID) !== toCharacterKey(character)) return prev;
      return setMainKeyForWorld(prev, character.worldID, null);
    });
  }, []);

  const toggleChampionCharacter = useCallback((character: StoredCharacterRecord) => {
    const key = toCharacterKey(character);
    const worldId = character.worldID;
    setChampionCharacterKeysByWorld((prev) => {
      const cur = getChampionKeysForWorld(prev, worldId);
      if (cur.includes(key)) return setChampionKeysForWorld(prev, worldId, cur.filter((k) => k !== key));
      if (cur.length >= MAX_CHAMPIONS) return prev;
      return setChampionKeysForWorld(prev, worldId, [...cur, key]);
    });
  }, []);

  const toggleCharacterDirectory = useCallback(() => {
    if (immediateUiLockRef.current) return;
    if (!showCharacterDirectory) {
      immediateUiLockRef.current = true;
      setFastDirectoryRevealOnce(false);
      setIsSwitchingToDirectory(true);
      setSetupStepDirection("forward");
      transitions.queueTransitionTimer(() => {
        setShowFlowOverview(true);
        setShowCharacterDirectory(true);
      }, CHARACTERS_TRANSITION_MS.fast);
      transitions.queueTransitionTimer(() => {
        setIsSwitchingToDirectory(false);
        immediateUiLockRef.current = false;
      }, CHARACTERS_TRANSITION_MS.searchFadeIn);
      return;
    }
    setSetupStepDirection("backward");
    setIsSwitchingToDirectory(false);
    setFastDirectoryRevealOnce(false);
    setShowFlowOverview(false);
    setShowCharacterDirectory(false);
  }, [showCharacterDirectory, transitions]);

  const removeCurrentCharacter = useCallback(() => {
    if (!confirmedCharacter) return;
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;

    const removedCharacter = confirmedCharacter;
    const removedKey = toCharacterKey(removedCharacter);
    const removedWorldId = removedCharacter.worldID;
    const remainingRoster = characterRoster.filter(
      (entry) => toCharacterKey(entry) !== removedKey,
    );
    const isLastCharacter = remainingRoster.length === 0;
    // Re-derive the world's WH Legion rank excluding the character being removed, so
    // deleting the world's highest-ranked Wild Hunter correctly falls to the next-
    // highest one still in the roster instead of leaving the stale rank stuck.
    syncWhLegionRankForWorld(removedWorldId, undefined, removedKey);

    // Clean up world-scoped champion keys
    const nextChampionKeysByWorld = { ...championCharacterKeysByWorld };
    const worldChampKeys = getChampionKeysForWorld(championCharacterKeysByWorld, removedWorldId);
    const remainingWorldChampKeys = worldChampKeys.filter((k) => k !== removedKey);
    if (remainingWorldChampKeys.length > 0) {
      nextChampionKeysByWorld[String(removedWorldId)] = remainingWorldChampKeys;
    } else {
      delete nextChampionKeysByWorld[String(removedWorldId)];
    }

    // Clean up world-scoped main key if it was the removed character
    const nextMainKeysByWorld = { ...mainCharacterKeyByWorld };
    if (nextMainKeysByWorld[String(removedWorldId)] === removedKey) {
      delete nextMainKeysByWorld[String(removedWorldId)];
    }

    removeSetupDraftForCharacter(removedCharacter);
    // isDeleteTransitioning drives the profile binder's own "closing" animation (see
    // CharacterProfileOverviewScreen's profile-binder-closing class) instead of the fade
    // every other isSwitchingToDirectory transition gets, so the deletion reads as the
    // binder itself closing rather than a generic cross-fade plus a separate text notice.
    setIsDeleteTransitioning(true);
    setIsSwitchingToDirectory(true);
    setSetupStepDirection("forward");

    transitions.queueTransitionTimer(() => {
      setCharacterRoster(remainingRoster);
      setChampionCharacterKeysByWorld(nextChampionKeysByWorld);
      setMainCharacterKeyByWorld(nextMainKeysByWorld);
      setConfirmedCharacter(null);
      setFoundCharacter(null);
      setQuery("");
      setIsAddingCharacter(false);
      lookup.resetSearchStateMessage();
      setHasCompletedRequiredSetupEver(!isLastCharacter);
      if (isLastCharacter) {
        // Removing the final character returns to the first-time "add a character" state
        // rather than an empty directory view, which has nothing to show and leaves a
        // dangling "back to directory" affordance.
        setSetupMode("intro");
        setSetupFlowStarted(false);
        setShowFlowOverview(false);
        setShowCharacterDirectory(false);
        transitions.setSetupPanelVisible(false);
        // Keep isSwitchingToDirectory true so the first-time card stays blanked until the
        // closing animation has played. The next timer below clears it.
      } else {
        setSetupMode("search");
        setSetupFlowStarted(true);
        setShowFlowOverview(true);
        setShowCharacterDirectory(true);
        transitions.setSetupPanelVisible(true);
      }
      setSetupStepIndex(0);
      setSetupStepDirection("forward");
      // Waits for the slowed closing animation (`--characters-slow`, see the CSS `.deleting`
      // modifier) rather than the usual `--characters-standard`, so the state swap does not
      // land while the binder is still visibly closing.
    }, CHARACTERS_TRANSITION_MS.slow);

    transitions.queueTransitionTimer(() => {
      setIsDeleteTransitioning(false);
      setIsSwitchingToDirectory(false);
      if (isLastCharacter) {
        // Now that the closing animation has played, ease the first-time setup screen
        // in instead of snapping it on.
        transitions.playSearchFadeIn();
      }
      immediateUiLockRef.current = false;
    }, CHARACTERS_TRANSITION_MS.slow + 30);
  }, [
    championCharacterKeysByWorld,
    characterRoster,
    confirmedCharacter,
    mainCharacterKeyByWorld,
    lookup,
    transitions,
  ]);

  const openAddCharacterSearch = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    transitions.runBackTransition(applyAddCharacterView);
  }, [applyAddCharacterView, transitions]);

  // Direct-add path, for an imported IGN not yet in the roster. `role` comes from
  // ImportModeScreen's role picker, and "champion" is only passed when the caller has
  // confirmed a free slot exists. ImportModeScreen checks first and routes to
  // importCharacterAsChampionSwap when slots are full.
  const importCharacter = useCallback((record: StoredCharacterRecord, role: RosterRole) => {
    upsertRosterCharacter(record);
    // Same reasoning as finalizeQuickOrFullSetupRecord's own propagation call: floors
    // only need class/level, which an imported record always has regardless of whether
    // its own Link Skills field was ever exported/filled in, so a same-world sibling's
    // stored value can still go stale the moment this import lands.
    propagateLinkSkillFloorsAfterUpsert(record, characterRoster, upsertRosterCharacter);
    // Import is as valid an entry path as search-based setup, per
    // ensureLegionArtifactDefaultForWorld's own comment about entry paths.
    ensureLegionArtifactDefaultForWorld(record.worldID);
    if (role === "main") setMainCharacter(record);
    if (role === "champion") toggleChampionCharacter(record);
    switchToCharacterProfile(record);
  }, [characterRoster, setMainCharacter, switchToCharacterProfile, toggleChampionCharacter, upsertRosterCharacter]);

  // Champion-slot-full path. Adds the imported character as a champion while removing
  // `swapOutKey` from the champion list in the same store update, rather than two separate
  // toggle calls, which would briefly leave the world over MAX_CHAMPIONS or, if the add lost
  // a race with the remove, one champion short.
  const importCharacterAsChampionSwap = useCallback((record: StoredCharacterRecord, swapOutKey: string) => {
    upsertRosterCharacter(record);
    propagateLinkSkillFloorsAfterUpsert(record, characterRoster, upsertRosterCharacter);
    ensureLegionArtifactDefaultForWorld(record.worldID);
    setChampionCharacterKeysByWorld((prev) => {
      const worldId = record.worldID;
      const cur = getChampionKeysForWorld(prev, worldId).filter((k) => k !== swapOutKey);
      return setChampionKeysForWorld(prev, worldId, [...cur, toCharacterKey(record)]);
    });
    switchToCharacterProfile(record);
  }, [characterRoster, switchToCharacterProfile, upsertRosterCharacter]);

  // Conflict-resolved path, for an imported IGN that already exists. Applies the per-section
  // choices from the conflict dialog before upserting. Never touches main or champion status,
  // since upsertRosterCharacter only auto-assigns main for a world's first character, which
  // this cannot be.
  const importCharacterMerged = useCallback((
    existing: StoredCharacterRecord,
    imported: StoredCharacterRecord,
    choices: Record<ImportSectionId, "mine" | "imported">,
  ) => {
    const merged = mergeImportedCharacterRecord(existing, imported, choices);
    upsertRosterCharacter(merged);
    propagateLinkSkillFloorsAfterUpsert(merged, characterRoster, upsertRosterCharacter);
    ensureLegionArtifactDefaultForWorld(merged.worldID);
    switchToCharacterProfile(merged);
  }, [characterRoster, switchToCharacterProfile, upsertRosterCharacter]);

  // World-import bulk apply. `resolvedCharacters` is already the caller's final answer per
  // character, new adds plus conflicts merged via mergeImportedCharacterRecord, so this
  // commits them in one setCharacterRoster update, the same pattern applyLinkSkillFloorsInPlace
  // and handleRefreshed use. Looping upsertRosterCharacter would be wrong rather than merely
  // slow: it reads characterRoster from this closure to decide whether the world is empty and
  // a main should be auto-assigned, so every call in the loop would see the same pre-import
  // snapshot and misfire that auto-assign for every character in a new world. Applying roleKeys
  // afterward would overwrite those guesses, but building the roster in one shot avoids relying
  // on that to paper over wrong intermediate states.
  // Link Skill floor propagation runs once, after every character in the world is in the roster
  // array, so a floor raised by the last character can still reach the first. Propagating per
  // upsert would miss that depending on file order.
  const importWorldBulk = useCallback((
    resolvedCharacters: StoredCharacterRecord[],
    roleKeys: { mainCharacterKey: string | null; championCharacterKeys: string[] },
    worldId: number,
    legionData: { legionArtifact?: StoredLegionArtifact; scouterLegion?: StoredScouterLegion } | null,
    // Existing residents unchecked on the conflict-resolution screen to free room under
    // MAX_CHARACTERS_PER_WORLD. Removed in the same roster update as the upserts below rather
    // than a separate pass, so there is never an intermediate state still over cap or briefly
    // missing a character mid-import.
    removedKeys: string[] = [],
  ) => {
    setCharacterRoster((prev) => {
      const removedSet = new Set(removedKeys);
      const byKey = new Map<string, StoredCharacterRecord>();
      for (const character of prev) {
        const key = toCharacterKey(character);
        if (!removedSet.has(key)) byKey.set(key, character);
      }
      for (const character of resolvedCharacters) byKey.set(toCharacterKey(character), character);
      const next = Array.from(byKey.values());
      for (const character of resolvedCharacters) applyLinkSkillFloorsInPlace(next, character.worldID);
      return next;
    });

    const worldKey = String(worldId);
    // Role keys can point at an untouched resident, kept rather than imported or customized
    // this pass, and resolvedCharacters covers only what this import actively upserted. So
    // validKeys has to be the real post-import roster for the world rather than that subset,
    // or an untouched resident's role assignment is rejected as invalid even though they are
    // staying exactly where they are.
    const removedSet = new Set(removedKeys);
    const validKeys = new Set<string>();
    for (const character of characterRoster) {
      const key = toCharacterKey(character);
      if (character.worldID === worldId && !removedSet.has(key)) validKeys.add(key);
    }
    for (const character of resolvedCharacters) validKeys.add(toCharacterKey(character));
    setMainCharacterKeyByWorld((prev) => {
      const base = removedSet.has(prev[worldKey])
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== worldKey))
        : prev;
      if (roleKeys.mainCharacterKey === null || !validKeys.has(roleKeys.mainCharacterKey)) return base;
      return { ...base, [worldKey]: roleKeys.mainCharacterKey };
    });
    setChampionCharacterKeysByWorld((prev) => {
      const survivingChampions = (prev[worldKey] ?? []).filter((key) => !removedSet.has(key));
      const validChampions = roleKeys.championCharacterKeys.filter((key) => validKeys.has(key));
      const merged = validChampions.length > 0 ? validChampions : survivingChampions;
      if (merged.length === 0) {
        if (!(worldKey in prev)) return prev;
        const next = { ...prev };
        delete next[worldKey];
        return next;
      }
      return { ...prev, [worldKey]: merged.slice(0, MAX_CHAMPIONS) };
    });

    if (legionData) {
      if (legionData.legionArtifact) writeLegionArtifactForWorld(worldId, legionData.legionArtifact);
      if (legionData.scouterLegion) writeScouterLegionForWorld(worldId, legionData.scouterLegion);
    }
    // Existence-checked, so this is a no-op whenever legionData above wrote real data or the
    // world already had some. Same entry-path reasoning as every other import callback here.
    ensureLegionArtifactDefaultForWorld(worldId);

    backToCharactersDirectory();
  }, [backToCharactersDirectory, characterRoster]);

  const backFromAddCharacter = useCallback(() => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsSwitchingToDirectory(true);
    const targetShowFlowOverview = true;
    const targetShowCharacterDirectory = true;
    const targetStepIndex = 0;
    const targetStepDirection: "forward" | "backward" = "backward";

    transitions.runBackTransition(
      () => {
        setFastDirectoryRevealOnce(true);
        setIsAddingCharacter(false);
        setFoundCharacter(null);
        setSetupFlowStarted(true);
        // Reachable with setupMode still "import", via Directory, Search, "Import a character
        // instead", Import screen, Back, not only the plain search-add path which is already
        // "search". Reset unconditionally rather than branching: a no-op for search, the fix
        // for import.
        setSetupMode("search");
        transitions.setSetupPanelVisible(true);
        setShowFlowOverview(targetShowFlowOverview);
        setShowCharacterDirectory(targetShowCharacterDirectory);
        setSetupStepDirection(targetStepDirection);
        setSetupStepIndex(targetStepIndex);
      },
      { enableSearchFadeIn: false },
    );

    transitions.queueTransitionTimer(() => {
      setIsSwitchingToDirectory(false);
    }, CHARACTERS_TRANSITION_MS.slow);

    if (confirmedCharacter && !completedFlowIds.includes(requiredFlowId)) {
      const characterKey = makeDraftCharacterKey(confirmedCharacter);
      const existingDraft = readSetupDraftByCharacter(confirmedCharacter);
      writeSetupDraft({
        version: 1,
        characterKey,
        query,
        setupMode: "search",
        setupFlowStarted: true,
        autoResumeOnLoad: true,
        activeFlowId,
        completedFlowIds,
        showFlowOverview: targetShowFlowOverview,
        showCharacterDirectory: targetShowCharacterDirectory,
        setupStepIndex: targetStepIndex,
        setupStepDirection: targetStepDirection,
        setupSubstepIndex: 0,
        setupStepTestByStep,
        stepValidityById,
        confirmedCharacter,
        savedAt: existingDraft?.savedAt ?? 0,
      });
    }
  }, [
    activeFlowId,
    completedFlowIds,
    confirmedCharacter,
    query,
    requiredFlowId,
    stepValidityById,
    setupStepTestByStep,
    transitions,
  ]);

  const handleQueryInput = useCallback((rawValue: string) => {
    const sanitized = rawValue
      .replace(CHARACTER_NAME_INPUT_FILTER_REGEX, "")
      .slice(0, MAX_QUERY_LENGTH);
    setQuery(sanitized);
  }, []);

  const handleSearchSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const duplicateByName = findRosterCharacterByName(characterRoster, lookup.trimmedQuery);
      if (duplicateByName) {
        lookup.setStatusTone("error");
        lookup.setStatusMessage(`${duplicateByName.characterName} is already added.`);
        setFoundCharacter(null);
        return;
      }
      setSetupFlowStarted(false);
      transitions.setSetupPanelVisible(false);
      setConfirmedCharacter(null);
      setIsStaleFallbackPreview(false);

      const found = await lookup.runLookup(lookup.trimmedQuery);
      if (!found) {
        const draft = readSetupDraftByKey(lookup.trimmedQuery);
        if (draft && isResumableDraft(draft) && draft.confirmedCharacter) {
          setIsStaleFallbackPreview(true);
          setFoundCharacter(draft.confirmedCharacter);
        }
      }
    },
    [characterRoster, isResumableDraft, lookup, transitions],
  );

  const activeSetupStep = getFlowStepByIndex(activeFlowId, setupStepIndex);
  const activeSetupStepValue = activeSetupStep
    ? setupStepTestByStep[activeSetupStep.id] ?? ""
    : "";
  // The Stats step's own draft, independent of which step is active, needed for its
  // live-computed Character Info substep gate (see getFirstInvalidStepIndex).
  const statsRawValue = setupStepTestByStep.stats ?? "";
  // The Equipment and Legion Artifacts drafts, independent of which step is active. The
  // Stats step's Quick Questions derive Genesis Liberation, Weapon Hand, Ruin Force Shield
  // and Legion Artifacts from whichever of these is most current, and an in-session edit to
  // either step, not yet Finished, should win over what is still in storage from before this
  // session, rather than staying locked to a stale answer until a Finish and reopen round
  // trip.
  const equipmentRawValue = setupStepTestByStep.equipment ?? "";
  const legionArtifactsRawValue = setupStepTestByStep.legion_artifacts ?? "";
  const currentCharacterKey = confirmedCharacter ? toCharacterKey(confirmedCharacter) : null;
  const restorableBookmarkId = lastActiveBookmark && lastActiveBookmark.characterKey === currentCharacterKey
    ? lastActiveBookmark.bookmarkId
    : null;
  const restorableBookmarkSubView = restorableBookmarkId ? lastActiveBookmark?.subView ?? null : null;
  const isCurrentMainCharacter = Boolean(
    currentCharacterKey && mainCharacterKey && currentCharacterKey === mainCharacterKey,
  );
  const isCurrentChampionCharacter = Boolean(
    currentCharacterKey && championCharacterKeys.includes(currentCharacterKey),
  );
  const canSetCurrentChampion =
    isCurrentChampionCharacter || championCharacterKeys.length < MAX_CHAMPIONS;
  // Sourced from the roster, meaning what is actually saved, rather than the live draft. A
  // value typed into an in-progress step should not show here until its flow's Finish
  // commits it.
  const currentRosterCharacter = currentCharacterKey
    ? characterRoster.find((c) => toCharacterKey(c) === currentCharacterKey) ?? null
    : null;
  const currentCharacterGender = currentRosterCharacter?.gender ?? null;
  const currentCharacterMarriage = {
    married: currentRosterCharacter?.marriage?.isMarried ?? null,
    partnerName: currentRosterCharacter?.marriage?.partnerName ?? null,
  };

  // Derive sorted world IDs from roster
  const worldIds = rosterWorldIds(characterRoster);

  const state = {
    refreshingKeys,
    query,
    foundCharacter,
    isStaleFallbackPreview,
    previewCardReady,
    previewContentReady,
    setupMode,
    confirmedCharacter,
    previewImageLoaded,
    confirmedImageLoaded,
    setupFlowStarted,
    activeFlowId,
    completedFlowIds,
    showFlowOverview,
    showCharacterDirectory,
    isSwitchingToDirectory,
    isSwitchingToProfile,
    isFinishingSetup,
    isDeleteTransitioning,
    isAddingCharacter,
    fastDirectoryRevealOnce,
    characterRoster,
    mainCharacterKeyByWorld,
    championCharacterKeysByWorld,
    worldIds,
    lastActiveBookmarkId: restorableBookmarkId,
    lastActiveBookmarkSubView: restorableBookmarkSubView,
    setupStepIndex,
    setupStepDirection,
    setupTargetSubstep,
    setupConfineToSubstep,
    substepJumpNonce,
    stepValidityById,
    draftSummaries,
    foundCharacterHasResumableDraft,
    hasCompletedRequiredSetupEver,
    isDraftHydrated,
    isUiLocked,
    activeSetupStepValue,
    statsRawValue,
    equipmentRawValue,
    legionArtifactsRawValue,
    isCurrentMainCharacter,
    isCurrentChampionCharacter,
    canSetCurrentChampion,
    currentCharacterGender,
    currentCharacterMarried: currentCharacterMarriage.married,
    currentCharacterPartnerName: currentCharacterMarriage.partnerName,
    requiredFlowId,
    queryInvalid: lookup.queryInvalid,
    isSearching: lookup.isSearching,
    statusMessage: lookup.statusMessage,
    statusTone: lookup.statusTone,
    degradedCode: lookup.degradedCode,
  };

  return {
    state,
    transitions,
    actions: {
      setPreviewImageLoaded,
      setConfirmedImageLoaded,
      updateActiveStepValue: (value: string) => {
        if (!activeSetupStep) return;
        setSetupStepTestByStep((prev) => ({
          ...prev,
          [activeSetupStep.id]: value,
        }));
      },
      // Applies a parsed MapleScouter export by seeding the other steps' drafts with its
      // values, the inverse of buildSeededStepTestByStep. Every later step then renders those
      // values for the player to review before Finish. The account-level parts, Wild Hunter
      // Legion rank and Legion Artifact, ride in the stats draft's scouterQuestions block,
      // which the normal finish path persists per-world. Passing the stored record lets the
      // stats draft start from the character's saved stats, so an import overwrites only what
      // the export covers (see mapImportToDrafts).
      applyMapleScouterImport: (result: MapleScouterImportResult) => {
        const existing = confirmedCharacter
          ? selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter))
          : null;
        const { stepDrafts } = mapImportToDrafts(result, existing);
        if (Object.keys(stepDrafts).length > 0) {
          setSetupStepTestByStep((prev) => ({ ...prev, ...stepDrafts }));
        }
      },
      setSetupStepWithDirection,
      jumpToSubstep,
      onValidityChange: reportStepValidity,
      reportCurrentSubstep,
      runBackToIntroTransition,
      runTransitionToMode,
      backFromSetupFlowToAddCharacter,
      backToCharactersDirectory,
      resumeDraft,
      clearDraft,
      confirmFoundCharacter,
      resumeFoundCharacterDraft,
      startFreshSetup,
      finishSetupFlow,
      setMainCharacter,
      removeMainCharacter,
      toggleChampionCharacter,
      setStatsActivePreset,
      setEquipmentActivePreset,
      setHexaStatActivePreset,
      setFamiliarsActivePreset,
      setOverviewLayout,
      switchToCharacterProfile,
      toggleCharacterDirectory,
      removeCurrentCharacter,
      openAddCharacterSearch,
      backFromAddCharacter,
      queueWorldRefresh,
      importCharacter,
      importCharacterAsChampionSwap,
      importCharacterMerged,
      importWorldBulk,
      refreshSingle,
      handleQueryInput,
      handleSearchSubmit,
      rememberActiveBookmark: (bookmarkId: string, subView?: string) => {
        if (!currentCharacterKey) return;
        setLastActiveBookmark({ characterKey: currentCharacterKey, bookmarkId, subView });
      },
      // Called once by the screen right after it consumes lastActiveBookmark, so it doesn't
      // linger and get re-read on a later, unrelated bookmark switch.
      clearRestoredBookmark: () => setLastActiveBookmark(null),
      startOptionalSetupFlow: (flowId: SetupFlowId, targetSubstep?: number, confineToSubstep?: boolean) => {
        if (immediateUiLockRef.current) return;
        // Re-seeds from the freshest stored record before entering the flow, mirroring the
        // resync that runs after Finish (see its comment below) from the opposite end.
        // Without this, re-running an optional flow, such as Full Setup from the profile's
        // Setup bookmark or a bookmark's confined pencil edit, reused whatever
        // setupStepTestByStep held from the previous run. That is stale enough to miss any
        // profile-page correction made since, such as HEXA Stat, Equipment, Familiars or
        // Hyper Stat's "Set preset X as active", so finishing without touching that field
        // reverted the correction to preset 1.
        if (confirmedCharacter) {
          const freshStored = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
          setSetupStepTestByStep(buildSeededStepTestByStep(confirmedCharacter.jobName, freshStored ?? null));
        }
        const overrides = confirmedCharacter
          ? getClassSetupOverrides(confirmedCharacter.jobName)
          : null;
        const { startStep, autoFillGender } = overrides
          ? computeEffectiveFlowStart(flowId, overrides.gender, overrides.skipMarriage, confirmedCharacter?.level, confirmedCharacter?.jobName)
          : { startStep: 1, autoFillGender: null };
        const stepCount = getFlowStepCount(flowId);
        if (autoFillGender) {
          setSetupStepTestByStep((prev) => ({ ...prev, gender: autoFillGender }));
        }
        if (startStep > stepCount) {
          // All steps skipped, so finish immediately with this flow
          setActiveFlowId(flowId);
          finishSetupFlow(flowId);
          return;
        }
        setActiveFlowId(flowId);
        setSetupStepIndex(startStep);
        setSetupStepDirection("forward");
        // Seeds the freshly mounted step's initial substep, the same mechanism used to resume
        // a draft mid-substep (see applyDraftFlowState above). Lets a bookmark such as Stats'
        // Hyper Stat or Inner Ability sub-views open the edit flow on the substep they are
        // showing instead of restarting at substep 0.
        setSetupTargetSubstep(targetSubstep ?? null);
        setSetupConfineToSubstep(Boolean(confineToSubstep));
        setShowFlowOverview(false);
        setShowCharacterDirectory(false);
      },
      skipSetupEntirely: () => {
        if (immediateUiLockRef.current) return;
        // Same as quick_setup's "all steps skipped" auto-finish (see startOptionalSetupFlow
        // above, e.g. Zero), but user-triggered for any class. Skip must always produce a
        // bare record: gender/marriage are forced blank (never whatever the ambient draft
        // happens to hold from an abandoned Quick/Full Setup attempt on this character), with
        // a class's fixedGender (e.g. Mihile, Angelic Buster) auto-filled since that's derived
        // from class data, not user input.
        const overrides = confirmedCharacter ? getClassSetupOverrides(confirmedCharacter.jobName) : null;
        const fixedGender = overrides?.gender && overrides.gender !== "none" ? overrides.gender : null;
        setActiveFlowId(requiredFlowId);
        finishSetupFlow(requiredFlowId, { gender: fixedGender ?? "", marriage: "" });
      },
    },
  };
}

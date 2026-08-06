import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoRefresh } from "./useAutoRefresh";
import {
  CHARACTER_NAME_INPUT_FILTER_REGEX,
  MAX_QUERY_LENGTH,
  MAX_CHARACTERS_PER_WORLD,
  type SetupMode,
} from "../model/constants";
import { findRosterCharacterByName, normalizeCharacterName, toCharacterKey } from "../model/characterKeys";
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
  /** Presets 1-2 are sparse per-slot overrides on top of preset 0 — see
   *  draftPresetToStored, which merges each slot individually rather than choosing one
   *  whole preset or the other. */
  presets?: EquipmentDraftPreset[];
  activePreset?: number;
  // Shared across presets:
  title?: EquipmentDraftItem;
  totem1?: EquipmentDraftItem; totem2?: EquipmentDraftItem; totem3?: EquipmentDraftItem;
  pet1?: EquipmentDraftItem; pet2?: EquipmentDraftItem; pet3?: EquipmentDraftItem;
  petEquip1?: EquipmentDraftItem; petEquip2?: EquipmentDraftItem; petEquip3?: EquipmentDraftItem;
  /** Symbol levels keyed by region name; folded into tools.symbols (the calculator
   *  store). String, not number — the setup step's draft keeps it blank until typed
   *  (matching Oz Rings); converted to real numbers below. */
  symbolLevels?: Record<string, string>;
}

function draftItem(v: EquipmentDraftItem) {
  if (!v?.name) return null;
  return v.id !== undefined ? { id: v.id, name: v.name } : { name: v.name };
}

// Merges each slot individually — a slot present in `overrides` (this preset's own
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
      // Always saved as preset 1, regardless of which tab was last open while editing —
      // the tab switcher isn't an explicit "this is my active loadout" choice, so trusting
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
  const symbols: Record<string, SymbolState> = { ...(existing?.symbols ?? {}) };
  for (const [name, raw] of Object.entries(levels)) {
    const level = Number(raw) || 0;
    const found = findSymbolArea(name);
    if (!found) continue;
    const prev = symbols[name];
    // Skip only when there's nothing to update yet (an untouched area shouldn't create a
    // fresh 0-level calculator entry) — an existing entry must still update down to 0, or
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
  // Ability card (if edited) fully determines the scouter-facing line — but now that
  // this question also shows a real manual ask (see InnerAbilityLineQuestion) whenever
  // the card has no data yet, fall back to that manual answer instead of discarding it.
  const scouterQ = convertScouterQuestionsDraftToStored(statsDraft);
  const innerAbilityLine = innerAbilityHasData(stats.innerAbility)
    ? (deriveInnerAbilityLine(stats.innerAbility) ?? "neither")
    : scouterQ?.innerAbilityLine;
  const weaponAtt = scouterQ?.weaponAtt;
  upsertFn({
    ...existing,
    stats: { ...existing.stats, ...stats },
    isLiberated: deriveIsLiberatedFromWeapon(existing.equipment) ?? isLiberated,
    weaponHand: deriveWeaponHandFromWeapon(existing.equipment) ?? weaponHand,
    hasRuinForceShield: deriveHasRuinForceShield(existing.equipment) ?? hasRuinForceShield,
    soul,
    scouter: innerAbilityLine || weaponAtt !== undefined
      ? { ...existing.scouter, ...(innerAbilityLine ? { innerAbilityLine } : {}), ...(weaponAtt !== undefined ? { weaponAtt } : {}) }
      : existing.scouter,
  });
}

// Propagates any resulting floor-raise from a just-upserted character's link skills to
// same-world siblings whose own stored value is now stale (e.g. this character being the
// 2nd tracked magician just raised Empirical Knowledge's true floor for a 1st-set-up
// sibling who's still sitting at their own, now-too-low, saved number).
//
// Takes `justUpserted` and folds it into `roster` itself rather than re-reading
// readCharactersStore() -- the actual localStorage write for a same-tick upsertFn call
// only happens later, in the writeCharactersStore effect keyed off characterRoster state
// (see upsertRosterCharacter's own comment above), so a disk re-read here would still see
// the PRE-finish record. This is also why linkSkills must be folded directly into
// buildFullSetupRecord's/applyMapleScouterFlow's one atomic upsertFn call rather than
// upserted as a separate step afterward that reads "existing" from disk first: for a
// brand-new character, that separate read would find nothing on disk yet (this same
// character's own upsertFn call hasn't flushed), so an `if (!existing) return` guard
// would silently no-op the whole linkSkills write.
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
// instead of taking an upsertFn -- for callers (handleRefreshed) already inside a
// setCharacterRoster functional updater that owns the array being built, where routing
// through upsertRosterCharacter isn't an option (not yet in scope at that call site) and
// isn't needed anyway (this functional update already IS the commit).
function applyLinkSkillFloorsInPlace(roster: StoredCharacterRecord[], worldId: number): void {
  propagateLinkSkillFloors(roster, worldId, (raised) => {
    const i = roster.findIndex((c) => toCharacterKey(c) === toCharacterKey(raised));
    if (i !== -1) roster[i] = raised;
  });
}

// Shared by both full_setup/quick_setup (finalizeQuickOrFullSetupRecord) and
// maplescouter_setup (finishSetupFlow) after their own atomic upsert: `link_skills`
// genuinely present in this run's step data means a human just looked at the pre-filled
// value and deliberately kept or changed it -- mastery reads as one identical number
// across every character sharing a skill in-game (live-tested), so that saved value
// becomes every same-world sibling's new synced truth too (syncLinkSkillToSiblings,
// clamped at the level-proven floor). No `link_skills` this run (Quick Setup never has
// that step; a redo that didn't revisit it) means nobody made a deliberate choice to
// sync from, so only a stale sibling gets raised, never overwritten down to a number
// nobody actually chose (propagateLinkSkillFloorsAfterUpsert, raise-only).
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

// Resolves the world's WH Legion rank: roster-derived wins, else the manual pick,
// else whatever was already stored. `manual` is undefined when this session never
// touched the question (preserve the existing value — writeScouterLegionForWorld
// replaces the whole per-world blob, so dropping this would silently erase it on
// every unrelated finish) vs. "none" when the user explicitly picked "No Wild
// Hunter" or cleared their previous bracket pick (an explicit, deliberate clear).
// "none" used to fall through to the WH_LEGION_RANK_SET check below and resolve to
// undefined -- indistinguishable from never having answered at all, so anyone with
// no Wild Hunter could never satisfy a completeness check that requires an answer.
// Checked explicitly now so it round-trips as its own value.
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
 * Re-derives the world's WH Legion rank from its current roster and persists it if
 * it changed. `applyScouterLegionForWorld` only runs when a Full/MapleScouter setup
 * finishes, so it misses roster changes that should also keep this in sync: a new
 * character added via quick setup (no Stats questionnaire at all), an existing Wild
 * Hunter leveling into a new bracket via auto-refresh, and a character being deleted
 * from the roster (`excludeKey`, so a just-removed Wild Hunter can't still count toward
 * its own re-derivation — without it, deleting the world's HIGHEST-ranked Wild Hunter
 * would leave the rank stuck rather than recomputing down to the next-highest one still
 * in the roster). A no-WH-in-roster result never touches storage — that would erase a
 * legitimate manual pick for a Wild Hunter who just isn't in this local roster (this
 * applies identically after a delete: the real in-game Wild Hunter may still exist even
 * though it's no longer tracked locally, so its rank isn't actively cleared to "none").
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

/** Guard wrapper for the auto-refresh callsite — kept separate so the null-check
 *  narrows normally (the record is only ever assigned from inside a setState
 *  closure at the callsite, which defeats TS's control-flow narrowing there). */
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
    // Quick Setup only ever collects gender + marriage — merge those two fields onto
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
    // (per-world) and safe to assume regardless of entry path — see the helper's own comment.
    ensureLegionArtifactDefaultForWorld(confirmedCharacter.worldID);
  }
  // See syncOrPropagateLinkSkills's own comment for the sync-vs-raise-only split.
  syncOrPropagateLinkSkills(setupStepTestByStep.link_skills, storedRecord, characterRoster, upsertRosterCharacter);
}

// A freshly-unlocked Legion Artifact starts at Artifact Level 1 (not 0 — namu.wiki's own
// level table starts numbering at 1, same convention as character level), already with its
// first 3 crystals (Orange Mushroom/Slime/Horny Mushroom) unlocked at Crystal Level 1 and
// these exact 3 default lines — confirmed via namu.wiki: "미변경 시 기본 할당 옵션은
// '올스탯 증가', '최대 HP/MP 증가', '공격력/마력 증가'이다" ("if unchanged, the default
// assigned options are All Stat, Max HP/MP, ATT/Magic ATT"), and Crystal Grade 1 costs 0
// AP (i.e. automatic, not a player action). None of our setup flows ask for a real
// Artifact Level or crystal config, so this is the one piece of Legion Artifact data safe to
// assume for literally every player, regardless of how far they've actually progressed.
//
// Seeded lazily, once per world, the first time ANY setup flow finishes for a character on
// a world that doesn't have real Legion Artifact data yet — not just full_setup, since the
// data is account-level (per-world) and independent of which flow happened to touch it.
// Never overwrites real data (existence check only).
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
 * Resolves + persists this world's Legion data (WH rank, Maple Union artifacts) from a
 * Stats-draft WH-rank pick and an (optional) Legion Artifacts draft. Shared between
 * maplescouter_setup (artifacts collected inline in the Stats questionnaire) and
 * full_setup (artifacts collected on their own dedicated step) — both now show the WH
 * Legion rank question in Stats, so this write can't live in just one flow anymore.
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
  // Maple Union artifacts are also account-level (per-world), not derivable — keep them
  // on the same per-world blob next to the WH rank. (For full_setup these are already
  // derived from `board` by the caller before this function runs.)
  const artifacts = resolveLegionArtifacts(legionArtifactsDraft, existingLegion);
  writeScouterLegionForWorld(character.worldID, {
    ...(wildHunterRank ? { wildHunterRank } : {}),
    ...artifacts,
  });

  // The full 9-crystal board (full_setup only) is real Legion Artifact data, not a
  // scouter input — lives on its own per-world store. Preserve whatever's already
  // stored when this session didn't touch it (e.g. a second character on the same
  // world finishing full_setup without revisiting Legion Artifacts).
  if (board) {
    const existingArtifact = store.legionArtifactByWorld[String(character.worldID)];
    // board.artifactLevel is a string that can be "" (level input cleared mid-edit, see
    // clampArtifactLevelInput's own comment) without being undefined — a truthy check (not
    // !== undefined) is required so a blank field is treated the same as "didn't touch it"
    // and falls back to existingArtifact, instead of Number("") silently collapsing to 0.
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
 * Builds/merges the MapleScouter flow's data into the roster in ONE upsert;
 * returns true if it created a new record. `upsertFn` writes via React state, so
 * we can't create-then-read within a tick — start from the existing record if
 * present, otherwise a fresh base (MapleScouter is a first-time entry mode and
 * collects no gender/marriage), and apply stats + oz rings before the single write.
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
  // MapleScouter setup has no gender/marriage step (see doc comment above) — don't read
  // stepData.gender/marriage here, since that field is shared draft state that can still be
  // holding a value left over from an abandoned Quick/Full Setup attempt on this character.
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
  // maplescouter_setup has no Inner Ability substep of its own, so this is the only place
  // that can derive it — from whatever this character's Stats bookmark/full_setup already
  // recorded, same rule as buildFullSetupRecord/applyStatsDraftToRoster. Only overrides the
  // direct-ask answer when the active preset's lines are actually known.
  const innerAbilityLine = innerAbilityHasData(base.stats.innerAbility)
    ? (deriveInnerAbilityLine(base.stats.innerAbility) ?? "neither")
    : scouterQ?.innerAbilityLine;
  const scouterPatch = ozRings || buffs || scouterQ || innerAbilityLine
    ? {
        ...base.scouter,
        ...(ozRings ? { ozRings } : {}),
        ...(buffs ? { buffs } : {}),
        ...(scouterQ?.weaponAtt !== undefined ? { weaponAtt: scouterQ.weaponAtt } : {}),
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
    // Same Genesis/Destiny-weapon-is-definitive rule as the other finalize paths — this
    // flow has no Equipment step, so the only source is whatever's already on file.
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

// "Lv. 11 Sacred Symbols" (the Buffs step's maxedSacredSymbol tile) is about the 6 boss
// regions' Sacred Symbols specifically (Grand Sacred grants EXP/meso/drop, not a boss
// bonus, so it's excluded) — full_setup already has this data from the Equipment step's
// Symbols substep, so it's derived here rather than trusting a separate manual toggle.
function deriveMaxedSacredSymbol(symbolsData: SavedSymbols | null): boolean {
  if (!symbolsData) return false;
  return SACRED_AREAS.every((a) => (symbolsData.symbols[a.name]?.level ?? 0) >= SACRED_MAX_LEVEL);
}

// Hyper Stat/Inner Ability's activePreset always converts to 0 from the draft (see
// draftHyperStatToStored/convertInnerAbilityDraftToStored) — the preset tab switcher
// used while editing lines isn't an explicit "make this active in-game" choice, so it
// can't be trusted for a brand-new character either. But for an already-set-up
// character, the profile's dedicated "Set preset X as active" button is the only
// authoritative way to change it — re-running this step (e.g. a bookmark's confined
// edit pencil) must never silently reset it back to preset 1 just because Finish was
// pressed. Restores whichever preset was actually active before this edit.
function preserveExistingActivePresets(
  stats: Partial<StoredCharacterStats>,
  existing: StoredCharacterRecord | null,
): void {
  if (!existing) return;
  if (stats.hyperStat) stats.hyperStat.activePreset = existing.stats.hyperStat?.activePreset ?? 0;
  if (stats.innerAbility) stats.innerAbility.activePreset = existing.stats.innerAbility?.activePreset ?? 0;
}

// Same "the profile's Set-active correction is the only authoritative source" rule as
// preserveExistingActivePresets above, for Equipment/Familiars/HEXA Stat's own presets --
// parseEquipmentDraft/buildFamiliarsDataForRecord/buildHexaStatToolData all hardcode a
// fresh activePreset (0, or 0 per node) since a setup draft never carries one, so every
// write of these fields must restore it afterward or silently discard a profile correction.
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
    // Per-field merge, not whole-object fallback: deriveLegionArtifactFields can return
    // just ONE of the two fields (e.g. only Bonus EXP was ever assigned to a crystal this
    // session) -- a `??` on the whole object would let that partial result silently win
    // over a real manual answer for the OTHER field, reintroducing the same silent-
    // discard bug this fallback was meant to fix. Spreading the manual answer first, then
    // overlaying only whichever field(s) the board actually proved, keeps each field's
    // own fallback chain independent: board-derived (if that stat's ever been assigned)
    // -> this session's manual answer -> whatever was already stored.
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
  // Falls back to existing.linkSkills (not base.linkSkills, always undefined on a fresh
  // record) when this run's Link Skills step produced no draft data -- same rule as
  // equipment/familiars/vMatrix below, so a full-setup redo that didn't revisit the step
  // doesn't wipe a previously saved value.
  const linkSkillsData = stepData.link_skills ? linkSkillsDraftToStored(stepData.link_skills) : null;
  const familiarsData = buildFamiliarsDataForRecord(stepData.familiars ?? "");
  preserveExistingFamiliarsActivePreset(familiarsData, existing);
  const equipmentData = stepData.equipment ? parseEquipmentDraft(stepData.equipment) : null;
  preserveExistingEquipmentActivePreset(equipmentData, existing);
  const symbolsData = stepData.equipment ? buildSymbolsToolDataForRecord(character, stepData.equipment) : null;
  // Spread existing.tools first (not just base.tools, which is a fresh blank record's
  // empty tools) so tool data this flow never touches -- liberation, astra, symbols,
  // exp-calculator, mystic-frontier -- survives a full-setup redo instead of being
  // dropped. hexaSkills/hexaStat/symbols then overlay only when this run produced them.
  const tools = {
    ...existing?.tools,
    ...base.tools,
    ...(hexaSkillsToolData ? { hexaSkills: hexaSkillsToolData } : null),
    ...(hexaStatToolData ? { hexaStat: hexaStatToolData } : null),
    ...(symbolsData ? { symbols: symbolsData } : null),
  };

  const ozRings = convertOzRingsDraftToStored(ozRingsDraft);
  const buffsConverted = convertBuffsDraftToStored(parseBuffsDraft(stepData.buffs ?? ""));
  // Based on the EXISTING stored buffs, not just buffsConverted — Buffs now backfills
  // on mount (see BuffsSetupStep's own effect), so a visited-and-finished step's
  // buffsConverted already reflects the full true state. But if Buffs wasn't visited
  // this session at all (buffsConverted null) and this character's Sacred Symbols
  // just happen to be maxed, forcing maxedSacredSymbol:true here without this base
  // would still replace the whole `buffs` object with just that one flag, dropping
  // everything else already saved.
  const buffs = deriveMaxedSacredSymbol(symbolsData)
    ? { ...existing?.scouter?.buffs, ...(buffsConverted ?? {}), maxedSacredSymbol: true as const }
    : buffsConverted;
  // Same derive-over-manual-answer rule as applyStatsDraftToRoster/applyMapleScouterFlow:
  // real Inner Ability card data wins when it exists; otherwise fall back to this
  // session's manual Quick Questions answer (see InnerAbilityLineQuestion) instead of
  // discarding it.
  const innerAbilityLine = innerAbilityHasData(stats.innerAbility)
    ? (deriveInnerAbilityLine(stats.innerAbility) ?? "neither")
    : convertScouterQuestionsDraftToStored(statsDraft)?.innerAbilityLine;
  // Weapon ATT is asked in Character Info (Stats), same as maplescouter_setup/stats_flow
  // — no longer asked inline in the Equipment step's weapon picker (that field always
  // wrote against whichever weapon sat in preset 0, wrongly assuming that's the
  // character's real bossing preset — there's no way to know that during full_setup,
  // since the active preset is only ever set later).
  const weaponAtt = convertScouterQuestionsDraftToStored(statsDraft)?.weaponAtt;
  const scouterPatch = {
    ...(ozRings ? { ozRings } : {}),
    ...(buffs ? { buffs } : {}),
    ...(weaponAtt !== undefined ? { weaponAtt } : {}),
    ...(innerAbilityLine ? { innerAbilityLine } : {}),
  };

  // equipment/familiars/vMatrix fall back to `existing` (not `base`, which is always a
  // fresh blank record here) when this run's steps produced no draft data -- e.g. a
  // full-setup redo that didn't revisit them, or a step skipped by level/legacy gating.
  // Falling back to the blank base instead would silently wipe them. This is the same
  // merge-against-existing rule the scouter/expHistory fields below already follow.
  const knownEquipment = equipmentData ?? existing?.equipment ?? base.equipment;
  return {
    ...base,
    stats: { ...base.stats, ...stats },
    equipment: knownEquipment,
    // A Genesis/Destiny weapon already known (this run's Equipment step, or a prior
    // run's) is definitive proof either way — takes priority over the manual checkbox
    // answer, same rule as applyStatsDraftToRoster/applyEquipmentDraftToRoster.
    isLiberated: deriveIsLiberatedFromWeapon(knownEquipment) ?? isLiberated,
    weaponHand: deriveWeaponHandFromWeapon(knownEquipment) ?? weaponHand,
    hasRuinForceShield: deriveHasRuinForceShield(knownEquipment) ?? hasRuinForceShield,
    soul, tools,
    familiars: familiarsData ?? existing?.familiars ?? base.familiars,
    vMatrix: vMatrixData ?? existing?.vMatrix ?? base.vMatrix,
    linkSkills: linkSkillsData ?? existing?.linkSkills ?? base.linkSkills,
    expHistory: existing ? appendExpHistoryEntry(existing.expHistory, character.level, character.exp) : base.expHistory,
    // Merged against the EXISTING record's scouter (not `base`, which is always a
    // fresh blank object here — see the equipment/familiars/vMatrix comment above for
    // why that matters): scouterPatch only holds whichever of ozRings/buffs/weaponAtt/
    // innerAbilityLine actually got recomputed THIS run. Replacing scouter outright
    // (the old behavior) silently dropped the other three whenever a redo of full
    // setup didn't happen to revisit Oz Rings/Buffs/Equipment this time.
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
  // Same resync buildFullSetupRecord already does for a full Setup finish (see its own
  // deriveMaxedSacredSymbol comment) — without it, editing Symbols from the Equipment
  // bookmark's pencil (outside Setup entirely) could cross the Lv. 11 Sacred Symbols
  // threshold and leave this buff flag stale until the next full Setup run happens to
  // touch it. Positive-only (never clears back to unset), matching buildFullSetupRecord's
  // own established behavior for this same flag.
  const scouterBuffs = symbolsData && deriveMaxedSacredSymbol(symbolsData)
    ? { ...existing.scouter?.buffs, maxedSacredSymbol: true as const }
    : existing.scouter?.buffs;
  upsertFn({
    ...existing,
    equipment,
    // Genesis Liberation's Final Damage bonus lives on the weapon item itself, so a
    // newly-picked weapon is just as definitive proof of losing it as gaining it —
    // re-derive from whichever preset is active rather than only ever setting true.
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
  // Gate each field by whether the flow actually being finished includes that step —
  // otherwise leftover draft data from a different, abandoned flow (e.g. Equipment typed
  // in during Full Setup, then backing out to finish Quick Setup) silently leaks in.
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
  // Unlike the fields above, an empty draft is a legitimate final value here (clearing
  // gender/marriage back to "not set" is a real, intentional choice from the Biography
  // blocks), so these two aren't gated on the draft string being truthy — only on the
  // flow actually being the one that owns the field. quick_setup/full_setup already
  // persist both via finalizeQuickOrFullSetupRecord, so this only fires for the
  // standalone single-step flows the Biography blocks use.
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

// The setup step's own draft never carries an activePreset at all (its preset tab is
// local React state, not serialized) — always save preset 1, same policy as the other
// three preset-based systems, rather than trusting whichever tab was last open.
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

// 6th-job HEXA Skills data (origin/mastery/enhancement/common/ascent), persisted to
// tools.hexaSkills. HEXA Stat is stripped out — it lives in its own key (see below).
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

// HEXA Stat is its own progression system — stored separately from the HEXA Skills
// calculator under tools.hexaStat. Only persisted when at least one node has data.
function buildHexaStatToolData(hexaJson: string): { nodes: HexaStatNode[] } | null {
  try {
    const parsed = JSON.parse(hexaJson) as { hexaStat?: unknown };
    const nodes = parsed?.hexaStat;
    if (Array.isArray(nodes) && hexaStatHasData(nodes as HexaStatNode[])) {
      // Always saved as preset 0 per node — the preset toggle used while editing isn't an
      // explicit "this is what's live in-game" choice, so trusting it would silently save
      // whichever one was last open while editing. Correcting a node's real active preset
      // happens on the profile page instead, via setHexaStatActivePreset below.
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

/** Seeds every step draft that has its own "starts blank, silently wipes on Finish"
 *  risk (see applyConfirmedProfileView/finishSetupFlow) from the character's actual
 *  stored data. Equipment/V Matrix/HEXA Matrix/Familiars each only backfill via their
 *  own step component's mount-time effect, which only fires once that component
 *  actually renders — if a session jumps/skips past one of them, or a stale draft
 *  from an earlier abandoned flow lingers in memory, Finish's `<field>Data ??
 *  base.<field>` fallback can write over real data with blank/stale values. Used
 *  both when first landing on a profile AND right after any Finish, so the in-memory
 *  drafts always resync to the just-saved truth instead of leaving other steps' untouched drafts
 *  stale for the rest of the session. */
// Mirrors hexaMatrixDraft.ts's readSavedHexaValue, but derives the draft from the passed-in
// storedCharacter directly instead of an independent readCharacterToolData/localStorage read.
// The right-after-Finish seeding call site passes lastUpsertedCharacterRef.current specifically
// because the roster's actual localStorage write is still pending in a separate effect at that
// point (see the "Resyncs every step draft" comment below) — an independent localStorage read
// here would silently re-seed hexa_matrix with the pre-Finish value, so the profile's HEXA edit
// pencil always showed a stale level right after saving a new one.
function hexaValueFromStoredCharacter(hexaClassDef: ReturnType<typeof findClassById>, storedCharacter: StoredCharacterRecord | null): string {
  if (!hexaClassDef || !storedCharacter) return "";
  const savedSkills = storedCharacter.tools?.hexaSkills as { levels?: HexaSkillLevels } | undefined;
  const savedStat = storedCharacter.tools?.hexaStat as { nodes?: HexaStatNode[] } | undefined;
  if (!savedSkills?.levels && !savedStat?.nodes) return "";
  return JSON.stringify({ ...(savedSkills?.levels ?? {}), hexaStat: savedStat?.nodes });
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
    // Seeded from the character's already-saved stats (not blank) — the Stats
    // step's finish path merges its draft onto the existing record wholesale
    // (see applyStatsDraftToRoster), so starting blank meant finishing without
    // retyping every field silently wiped whatever wasn't retyped.
    stats: storedCharacter
      ? serializeStatsStepDraft(storedStatsToStatsStepDraft({
          ...storedCharacter,
          weaponAtt: storedCharacter.scouter?.weaponAtt,
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
    // Never seeded before (a real gap, not intentional — every other step above is):
    // reopening Oz Rings on a character that already answered it always started blank,
    // even though the stored ring levels were intact (its own useEffect only backfills
    // the Totalling Ring's off-stats from stats.str/dex/int/luk, not the ring levels
    // themselves).
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
  const [autoRefreshQueue, setAutoRefreshQueue] = useState<StoredCharacterRecord[]>([]);

  // Dev-only: surfaces malformed CLASS_SKILL_DATA entries (empty id/nexonJobName,
  // duplicate nexonJobName) as console warnings; no-op in production.
  useEffect(() => {
    validateNexonJobMapping();
  }, []);

  // World-scoped main and champion keys
  const [mainCharacterKeyByWorld, setMainCharacterKeyByWorld] = useState<Record<string, string>>({});
  const [championCharacterKeysByWorld, setChampionCharacterKeysByWorld] = useState<Record<string, string[]>>({});

  // Which profile bookmark to return to after finishing an optional flow started from
  // it (e.g. a Biography block, or any bookmark's edit pencil) — the profile-overview
  // screen unmounts while a flow is active (see PreviewSetupPane's contentKey), so its
  // own local "active bookmark" state can't survive the round trip on its own. Keyed to
  // the character it was captured for so it never leaks into a later, unrelated visit
  // to a different character's profile (see currentCharacterKey / restorableBookmarkId
  // below, which is what actually gets exposed to the screen).
  // subView additionally remembers a bookmark's own internal sub-view (e.g. Stats'
  // Hyper Stat/Ability toggle), so editing from one of those lands back on it too
  // instead of the bookmark's default sub-view once the round trip above completes.
  const [lastActiveBookmark, setLastActiveBookmark] = useState<{ characterKey: string; bookmarkId: string; subView?: string } | null>(null);

  const [setupStepIndex, setSetupStepIndex] = useState(0);
  const [setupStepDirection, setSetupStepDirection] = useState<"forward" | "backward">("forward");
  // Substep to force-open a step on (e.g. jumping straight to Stats' Inner Ability
  // substep) — only set by jumpToSubstep below, and cleared by every other
  // navigation action so it never overrides normal Prev/Next substep placement.
  // substepJumpNonce forces a remount even when jumping to the same target substep
  // twice in a row (the step component may have since navigated away internally).
  const [setupTargetSubstep, setSetupTargetSubstep] = useState<number | null>(null);
  // Paired with setupTargetSubstep, reset to false everywhere that clears it back to
  // null — see startOptionalSetupFlow for where it's actually set true.
  const [setupConfineToSubstep, setSetupConfineToSubstep] = useState(false);
  const [substepJumpNonce, setSubstepJumpNonce] = useState(0);
  // Live-tracks whichever substep the currently-mounted step (Stats/Equipment/HEXA
  // Matrix) is actually showing, reported up via each step's onSubstepChange as it
  // navigates internally (0 for step types without substeps). Persisted alongside
  // setupStepIndex so a full page reload can restore into the exact substep the player
  // left off on, instead of always falling back to substep 0.
  const [setupSubstepIndex, setSetupSubstepIndex] = useState(0);
  // Last-known Next-button validity per step id (see SetupStepFrame's onValidityChange),
  // for the ~5 steps that actually gate Next on something. Keyed by step id (not
  // reset on navigation) because a step's draft data — and thus its validity — is
  // shared across flows and outlives leaving that step; a naive "reset on navigate"
  // version let you dodge the gate by backing out to an invalid step and switching
  // flows instead of fixing it. Cleared only where setupStepTestByStep itself resets
  // (switching to a different character's draft, or abandoning setup entirely).
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
    // Refreshing only ever brings back fresh rank/level/exp-shaped data from Nexon (see
    // NormalizedCharacterData) -- everything else on the record (marriage, liberation/
    // weapon-hand/Ruin Force Shield/soul flags, scouter/familiars/V Matrix data) has to be
    // explicitly carried over from `existing` or createStoredCharacterRecord defaults it
    // back to null/undefined, silently wiping it on every auto-refresh.
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
      // A level-up crossing 70/120/210 can raise this character's OWN floor, and (for a
      // magician/thief) a same-world sibling's floor too -- e.g. this character just being
      // the one that pushed Empirical Knowledge's true total higher. Checked on every
      // refresh, not just setup finishes, since a level-up is exactly the kind of
      // "sibling fact changed without anyone visiting Link Skills" case propagation needs
      // to catch. Applied in-place here (rather than via upsertRosterCharacter, which
      // isn't in scope yet at handleRefreshed's position in this file) since this
      // functional update already owns the array being mutated.
      applyLinkSkillFloorsInPlace(next, updated.worldID);
      return next;
    });
    // A Wild Hunter leveling into a new legion bracket over time should update the
    // world's derived rank the same way finishing a setup for it would. Pass the
    // refreshed record explicitly as `base` — the roster in localStorage still has
    // this character's PRE-refresh level at this point, since the persistence effect
    // for `characterRoster` hasn't run yet.
    syncWhLegionRankAfterRefresh(updated);
  }, []);

  const { refreshingKeys, refreshSingle } = useAutoRefresh({
    queue: autoRefreshQueue,
    onRefreshed: handleRefreshed,
  });

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

  // Tracks the freshest record passed to upsertRosterCharacter this tick — the actual
  // localStorage write only happens later, in the writeCharactersStore effect below
  // (keyed off the characterRoster state this schedules, not a synchronous write), so
  // anything that needs the just-upserted data immediately after calling this (see
  // finishSetupFlow's resync) would otherwise read stale storage.
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
    // Set as main for their world only if this is the world's first-ever character -- not
    // just "no main is currently set," which used to also fire for e.g. a 2nd/3rd mule added
    // after the main was removed, silently promoting whichever character happened to be added
    // next. A world with any other characters already in it never gets an automatic main;
    // Set Main (setMainCharacter) stays the only way to assign one from that point on.
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

  // Profile-page correction for which Hyper Stat/Inner Ability preset is actually
  // equipped in-game — these are saved as preset 1 by default at setup time (never asked),
  // so this is the only way that value ever becomes accurate. No-ops if the character
  // never collected that field at all (nothing to mark active).
  const setStatsActivePreset = useCallback((field: "hyperStat" | "innerAbility", presetIndex: number) => {
    if (!confirmedCharacter) return;
    const existing = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
    const current = existing?.stats?.[field];
    if (!existing || !current) return;
    const updated = { ...current, activePreset: presetIndex };
    // Switching to a different active Inner Ability preset can change the scouter-facing
    // line (Passive/Multi Target +1) — recompute it here too, or it goes stale relative to
    // whatever preset is now actually active. Only ever sets a real derived answer, never
    // clears one back to unset (matches the other derive-over-manual call sites).
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
      // Whichever preset is now active is the definitive one — re-derive against it
      // rather than only ever flipping true, since switching presets can genuinely
      // gain or lose Genesis Liberation/weapon hand/Ruin Force Shield.
      isLiberated: deriveIsLiberatedFromWeapon(updated) ?? existing.isLiberated,
      weaponHand: deriveWeaponHandFromWeapon(updated) ?? existing.weaponHand,
      hasRuinForceShield: deriveHasRuinForceShield(updated) ?? existing.hasRuinForceShield,
    });
  }, [confirmedCharacter, upsertRosterCharacter]);

  // Same profile-page correction as setStatsActivePreset/setEquipmentActivePreset above, for
  // which of a single HEXA Stat node's 2 presets is actually equipped in-game — each node has
  // its own independent activePreset. No-ops if the character has no saved HEXA Stat data at
  // all, or hasn't reached that node's index yet.
  // Unlike setStatsActivePreset/setEquipmentActivePreset above, HEXA Stat and Familiars
  // (below) are collected by optional, standalone flows never bundled into the character's
  // required setup — a character can exist in the roster with no saved data for either at
  // all, which used to make this a silent no-op (and the profile's "Set active" button
  // never showing at all, since it's gated on the same saved data existing). Both now build
  // an empty shell on demand instead, so setting the active preset works even before the
  // step has ever been visited.
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
      // Seeds the freshly-mounted step's initial substep (see targetSubstep ?? ...
      // fallback in each of Stats/Equipment/HexaMatrixSetupStep) — safe to always set
      // here since any subsequent normal navigation already clears it right back to
      // null (see setSetupStepWithDirection), so it can't linger and force a stale
      // substep after the player has since navigated elsewhere within the step.
      setSetupTargetSubstep(draft.setupSubstepIndex ?? null);
      // A draft resume is always normal full navigation, never a bookmark's confined
      // single-substep edit.
      setSetupConfineToSubstep(false);
      setSetupStepTestByStep(draft.setupStepTestByStep ?? {});
      // Restored from the draft (not wiped) — the draft's own step data can still be
      // invalid, and forgetting that here is exactly what let people resume past it.
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
      // Every fresh arrival at a profile (from the directory, search, or first paint)
      // should land on Overview — the remembered bookmark only applies to returning
      // from a flow started mid-session on this same still-open profile, not to a
      // later, separate visit to it.
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
      // Route intent (?character=/?action=add from a fresh navigation) resolves straight to
      // its target here, before first paint, instead of restoring the last session's draft/
      // directory state and correcting course afterward — that two-step "restore, then
      // redirect" is what caused a visible flash of the wrong screen on a deep-linked reload.
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
        // A true first-time user (no characters yet) falls through instead of forcing
        // search mode here -- the homepage's empty-state "Add Character" link should land
        // on the intro screen's Import/Search choice, same as visiting /characters fresh,
        // not skip straight past it the way a returning user's "add another" action should.
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
    // Meant to run exactly once per mount. handleDraftHydration (and its dependency
    // applyAddCharacterView) transitively depends on `lookup`, which useCharacterLookup
    // returns as a fresh object every render — so without this guard, this effect's own
    // [handleDraftHydration, refreshDraftSummaries] deps would churn on every render and
    // re-run hydration, stomping whatever state the user had navigated to since (e.g.
    // wiping the search query on every keystroke, or snapping back to the initial route
    // intent's screen instead of wherever the user just clicked).
    if (hasHydratedSetupDraftRef.current) return;

    const draft = readLastSetupDraft();
    const store = readCharactersStore();
    const storedRoster = selectCharactersList(store);
    const accountHasCompletedRequiredFlow = hasStoredCompletedRequiredSetup(store);

    const hydrateTimer = window.setTimeout(() => {
      handleDraftHydration(draft, store, storedRoster, accountHasCompletedRequiredFlow);
      // handleDraftHydration's branches (showCompletedDirectoryState etc.) reset this to
      // false; set it after so it wins for this batch. Suppresses the search-pane/preview-
      // pane width transition for this first resolved paint only — without it, the pane
      // visibly animates from its collapsed pre-hydration width up to its final width, and
      // content that wraps at narrow widths (e.g. the HEXA skill icon row) visibly reflows
      // mid-transition. Cleared a beat later so normal in-session transitions keep animating.
      setSuppressLayoutTransition(true);
      hasHydratedSetupDraftRef.current = true;
      setIsDraftHydrated(true);
      refreshDraftSummaries();
      queueTransitionTimer(() => {
        setSuppressLayoutTransition(false);
      }, CHARACTERS_TRANSITION_MS.standard);

      // Compute stale main+champions for background auto-refresh
      const now = Date.now();
      const seen = new Set<string>();
      const stale: StoredCharacterRecord[] = [];
      for (const mainKey of Object.values(store.mainCharacterIdByWorld)) {
        const char = store.charactersById[mainKey];
        if (char && now > char.expiresAt) { seen.add(mainKey); stale.push(char); }
      }
      for (const champKeys of Object.values(store.championCharacterIdsByWorld)) {
        for (const key of champKeys) {
          if (seen.has(key)) continue;
          const char = store.charactersById[key];
          if (char && now > char.expiresAt) { seen.add(key); stale.push(char); }
        }
      }
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
    // The pre-hydration race (roster momentarily empty before load) is already handled by
    // the hasHydratedSetupDraftRef guard above. By this point hydration has run, so an empty
    // roster is intentional — e.g. the user removed their last character — and must be
    // persisted; otherwise that final character would survive in storage and reappear.
    const now = Date.now();
    // characterRoster is already StoredCharacterRecord[]. Gender/marriage only change when
    // the roster itself changes (a setup flow's Finish calling upsertRosterCharacter), not
    // live as the draft is typed — now that there are multiple setup flows, a value typed
    // into one flow shouldn't count until that flow's own Finish actually commits it (see
    // finalizeQuickOrFullSetupRecord / applyMapleScouterFlow). Also update meta.updatedAt if
    // the character data changed since last save.
    const nextCharactersById = characterRoster.reduce<Record<string, StoredCharacterRecord>>(
      (acc, character) => {
        const id = toCharacterKey(character);
        const existingRecord = existingStore.charactersById[id];
        acc[id] = {
          ...character,
          // Two independent paths write `tools`: out-of-band, via characterToolStorage.ts's
          // writeCharacterToolData (symbols, liberation, hexa skills, scouterResult, etc.,
          // edited from their own tool pages -- patches disk directly, never syncs back into
          // characterRoster), and in-band, via a setup-flow finish (e.g. HEXA Matrix inside
          // MapleScouter/Full Setup), which builds a fresh tools object and pushes it into
          // characterRoster BEFORE this very effect runs -- this effect is what's supposed to
          // flush that fresh value to disk. Picking one side outright breaks the other: an
          // outright `existingRecord.tools` (disk) discards the setup-flow finish that's
          // mid-flight in `character.tools` right now; an outright `character.tools` (memory)
          // is what caused the original out-of-band-write regression this comment used to
          // describe. Spread disk first so a key only an out-of-band write has survives, then
          // overlay memory so a key the current character object actually carries wins.
          tools: { ...existingRecord?.tools, ...character.tools },
          // `character` (from characterRoster, the in-memory state) is always the
          // authoritative value for these two -- every upsert path already either sets them
          // explicitly (applyGenderDraftToRoster/applyMarriageDraftToRoster, quick/full setup)
          // or carries them forward itself via spread (handleRefreshed passes existing.gender/
          // existing.marriage through explicitly; every other upsert spreads ...existing).
          // Falling back to existingRecord here (the pre-write value still on disk) used `??`,
          // which can't tell "never touched this field" apart from "explicitly cleared to
          // null" -- an intentional clear from the Bio bookmark's Gender/Partner pencil got
          // silently reverted on the very next persist, since it looked identical to the
          // untouched case.
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
    // earlier existingStore read: this effect fires on every setup-flow keystroke (any step,
    // any open tab), and the roster rebuild above takes real time, leaving a window where a
    // concurrent writeLegionArtifactForWorld call (e.g. from another tab) could land in
    // between and get silently clobbered by this pass-through write. Link skills no longer
    // need this treatment -- they live on each character's own record now (rides through
    // nextCharactersById above via the ...character spread), not a world-scoped map that
    // could race a separate writer.
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
      // Does NOT reset isAddingCharacter -- a mode switch (search <-> import) isn't leaving
      // the add-character flow, just picking a different screen within it. Search/Import's
      // own "instead" links call this while mid-flow (isAddingCharacter true, arrived via
      // the directory's + tile) and need that flag to survive, or Import's Back button would
      // wrongly fall through to runBackToIntroTransition (first-time-setup) instead of
      // backFromAddCharacter (directory) afterward. FirstTimeSetupScreen's own Search/Import
      // buttons are the only other caller and are unaffected either way, since
      // isAddingCharacter is already false whenever that screen is reachable.
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
      // Any normal navigation (Prev/Next/step-level jump) supersedes a prior
      // substep-jump target — only jumpToSubstep below is allowed to set one.
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
      // Same rule as the Next button's own disabled state (SetupStepFrame's
      // nextDisabled) — jumping forward past the earliest invalid/incomplete step (in
      // THIS flow's order, since a stepId's validity can outlive leaving it) is
      // blocked the same way advancing normally already is. Backward, and jumping onto
      // the broken step itself, are always allowed.
      if (target > setupStepIndex) {
        const firstInvalid = getFirstInvalidStepIndex(activeFlowId, stepValidityById, gender, skipMarriage, setupStepTestByStep.stats ?? "", characterLevel, jobName);
        if (firstInvalid !== null && target > firstInvalid) return;
      }
      setSetupStepDirection(direction);
      setSetupStepIndex(target);
      // Backing out of an optional flow to the profile overview (step 0) abandons
      // whatever wasn't Finished — for an ALREADY-CONFIRMED character (storedCharacter
      // exists), there's no "resume this later" feature for that abandoned edit the
      // way brand-new characters' Quick/Full Setup onboarding drafts have, so discard
      // it here by reseeding straight from the stored truth instead of leaving a stale
      // draft sitting in memory for the rest of the session (only a full page reload
      // used to clear it). A character with no stored record yet (still mid-onboarding,
      // never confirmed) is left alone — that's exactly the case the separate
      // setupDraftStorage resumable-draft system exists to preserve.
      if (target === 0 && confirmedCharacter) {
        const storedCharacter = selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
        if (storedCharacter) {
          setSetupStepTestByStep(buildSeededStepTestByStep(confirmedCharacter.jobName, storedCharacter));
        }
      }
    },
    [activeFlowId, confirmedCharacter, setupStepIndex, stepValidityById, setupStepTestByStep],
  );

  // Jumps directly into a specific substep of a step (e.g. Stats' Inner Ability) —
  // the target step index is trusted to already be a visible, non-skipped step (the
  // jump menu only offers substeps for steps it's already showing). substepJumpNonce
  // always changes so the target step component remounts even when re-targeting the
  // same substep it's already showing but has since navigated away from internally.
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

  // SetupStepFrame reports whichever step id is currently mounted's own Next-button
  // validity here (see its onValidityChange prop) — bound to the active step id in
  // SetupFlowScreen, since the frame itself only knows a plain valid/invalid boolean.
  const reportStepValidity = useCallback((stepId: string, valid: boolean) => {
    setStepValidityById((prev) => (prev[stepId] === valid ? prev : { ...prev, [stepId]: valid }));
  }, []);

  // Stats/Equipment/HEXA Matrix report their own current substep here (see each
  // component's onSubstepChange), so it can be persisted for resume — see
  // setupSubstepIndex above.
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

    // The snapshot's base data is past its reset window — re-fetch live via the normal
    // search→preview path instead of resuming on stale stats. Confirming the refreshed
    // result preserves the draft's entered step data (see confirmFoundCharacter). If the
    // refresh fails, fall back to the stale snapshot so the draft isn't a dead end.
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

  // The searched character has a started, resumable draft — the preview offers
  // Resume / Start fresh. A stepIndex-0 draft (flow not yet chosen) has no real
  // progress, so it confirms normally instead of prompting. Derived from
  // draftSummaries (not a fresh localStorage read) so clearing the draft from the
  // dropdown immediately flips this off and the preview drops back to confirm.
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
      // A fresh confirm from search always lands on the intro (first step), never
      // mid-flow — resuming is the job of the explicit Resume button. Previously this
      // restored the draft's step index, so re-confirming a character whose draft had
      // advanced would skip the intro entirely. Entered stepData is still preserved
      // (passed below) so nothing the user typed is lost.
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
      // Reset so the post-commit resync below can tell whether THIS finish actually
      // upserted anything, rather than reusing a leftover reference from an earlier,
      // unrelated finish this session.
      lastUpsertedCharacterRef.current = null;
      const effectiveFlowId = typeof overrideFlowId === "string" ? overrideFlowId : activeFlowId;
      // overrideStepData lets a caller (e.g. skipSetupEntirely) force specific field
      // values instead of whatever's sitting in the ambient draft — passing it as an
      // argument (rather than writing setupStepTestByStep and calling finishSetupFlow
      // right after) avoids relying on a state update landing before this closure reads
      // it, which isn't guaranteed.
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
        // full_setup/quick_setup already run their own sync/propagation inside
        // finalizeQuickOrFullSetupRecord above (right where storedRecord is built) --
        // maplescouter_setup's own atomic upsert happens inside applyMapleScouterFlow
        // instead, so it needs its own call here. Uses lastUpsertedCharacterRef (not a
        // stale disk read) -- see propagateLinkSkillFloorsAfterUpsert's own comment for
        // why; see syncOrPropagateLinkSkills's own comment for the sync-vs-raise split.
        if (lastUpsertedCharacterRef.current) {
          syncOrPropagateLinkSkills(effectiveStepData.link_skills, lastUpsertedCharacterRef.current, characterRoster, upsertRosterCharacter);
        }
      }

      // maplescouter_setup, like full_setup, already handles every step it owns (stats,
      // oz_rings, buffs, hexa_matrix) inside applyMapleScouterFlow's own single upsert above.
      // Running applyStandaloneToolDrafts afterward re-processed hexa_matrix a second time
      // against a STALE readCharactersStore() snapshot (the first upsert's write hasn't
      // reached storage yet this tick — see upsertRosterCharacter's own comment), silently
      // reverting stats/isLiberated/weaponHand/scouter answers back to their pre-finish
      // values while only hexa_matrix appeared to actually save.
      const isMapleScouterFlow = effectiveFlowId === "maplescouter_setup";
      if (confirmedCharacter && !isFullSetupFlow && !isMapleScouterFlow) {
        applyStandaloneToolDrafts(confirmedCharacter, effectiveStepData, upsertRosterCharacter, effectiveFlowId);
      }

      // Resyncs every step draft to the just-committed truth — without this, a stale
      // or stepped-past draft for a DIFFERENT step (e.g. a random Weapon ATT typed
      // into an abandoned MapleScouter Setup attempt, never cleared) keeps sitting in
      // memory and can outlive this Finish, surfacing again the next time some other
      // flow touches that same step this session (only a full page reload used to fix
      // it, since that's the only other place this same seeding ran).
      if (confirmedCharacter) {
        // Uses the just-upserted record directly (lastUpsertedCharacterRef), NOT a
        // fresh readCharactersStore() read — the actual localStorage write happens in
        // a separate effect keyed off the characterRoster state upsertRosterCharacter
        // just scheduled, which hasn't run yet in this same synchronous tick. Reading
        // storage here would see the PRE-finish data, seeding the resync with stale
        // values despite everything above having just committed correctly.
        const freshStored = lastUpsertedCharacterRef.current
          ?? selectCharacterById(readCharactersStore(), toCharacterKey(confirmedCharacter));
        setSetupStepTestByStep(buildSeededStepTestByStep(confirmedCharacter.jobName, freshStored ?? null));
      }

      setIsAddingCharacter(false);

      const updatedCompleted = Array.from(new Set([
        ...completedFlowIds,
        effectiveFlowId,
        // Full and MapleScouter are entry modes — finishing either also satisfies
        // the required (quick) flow, so the completed profile pane shows instead of
        // looping back to the setup intro.
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
        // Removed the final character — return to the first-time "add a character" state
        // instead of an empty directory view (which has nothing to show and bounces the
        // user back and forth with a dangling "back to directory" affordance).
        setSetupMode("intro");
        setSetupFlowStarted(false);
        setShowFlowOverview(false);
        setShowCharacterDirectory(false);
        transitions.setSetupPanelVisible(false);
        // Keep isSwitchingToDirectory true here so the first-time card stays blanked
        // until the closing animation has fully played -- the next timer below clears it.
      } else {
        setSetupMode("search");
        setSetupFlowStarted(true);
        setShowFlowOverview(true);
        setShowCharacterDirectory(true);
        transitions.setSetupPanelVisible(true);
      }
      setSetupStepIndex(0);
      setSetupStepDirection("forward");
      // Waits for the slowed-down closing animation (--characters-slow, see the CSS'
      // .deleting modifier) instead of the usual --characters-standard, so the state swap
      // doesn't land while the binder is still visibly closing.
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

  // Direct-add path: the imported IGN isn't in the roster yet. `role` is chosen on
  // ImportModeScreen's own role picker -- "champion" is only ever passed here when the
  // caller has already confirmed a free slot exists (ImportModeScreen checks first and
  // routes to importCharacterAsChampionSwap instead when slots are full).
  const importCharacter = useCallback((record: StoredCharacterRecord, role: RosterRole) => {
    upsertRosterCharacter(record);
    // Same reasoning as finalizeQuickOrFullSetupRecord's own propagation call: floors
    // only need class/level, which an imported record always has regardless of whether
    // its own Link Skills field was ever exported/filled in, so a same-world sibling's
    // stored value can still go stale the moment this import lands.
    propagateLinkSkillFloorsAfterUpsert(record, characterRoster, upsertRosterCharacter);
    // Import is as valid an entry path as search-based setup -- see
    // ensureLegionArtifactDefaultForWorld's own comment ("regardless of entry path").
    ensureLegionArtifactDefaultForWorld(record.worldID);
    if (role === "main") setMainCharacter(record);
    if (role === "champion") toggleChampionCharacter(record);
    switchToCharacterProfile(record);
  }, [characterRoster, setMainCharacter, switchToCharacterProfile, toggleChampionCharacter, upsertRosterCharacter]);

  // Champion-slot-full path: adds the imported character as a champion while removing
  // `swapOutKey` from the champion list in the same store update, rather than two separate
  // toggle calls -- avoids a moment where the world briefly has 6 champions (over MAX_CHAMPIONS)
  // or, if the add happened to lose a race with the remove, silently drops back to 4.
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

  // Conflict-resolved path: the imported IGN already exists -- apply the user's
  // per-section choices from the conflict dialog before upserting. Never touches
  // main/champion status itself: upsertRosterCharacter only auto-assigns main for a
  // world's first-ever character, which this can't be since the IGN already exists.
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

  // World-import bulk apply: `resolvedCharacters` is already the caller's final answer
  // per character (straight new adds plus any conflicts already merged via
  // mergeImportedCharacterRecord) -- this just commits all of them in ONE setCharacterRoster
  // update, same "already building the array" pattern as applyLinkSkillFloorsInPlace/
  // handleRefreshed use, rather than N sequential upsertRosterCharacter calls. Looping
  // upsertRosterCharacter here would be wrong, not just slow: it reads characterRoster from
  // this closure to decide "is this world empty -> auto-assign main", and every call in a
  // tight loop would see the SAME stale pre-import snapshot, misfiring that auto-assign for
  // every character in a brand-new world. Applying roleKeys afterward overwrites whatever
  // upsertRosterCharacter would have guessed anyway, but building the roster in one shot
  // avoids relying on that overwrite to paper over N-1 wrong intermediate states.
  // Link Skill floor propagation intentionally runs once, after every character in the
  // world is already in the roster array (effectiveRoster), so a floor raised by character
  // #40 can still reach character #3 -- propagating one-at-a-time per upsert would miss
  // that depending on file order.
  const importWorldBulk = useCallback((
    resolvedCharacters: StoredCharacterRecord[],
    roleKeys: { mainCharacterKey: string | null; championCharacterKeys: string[] },
    worldId: number,
    legionData: { legionArtifact?: StoredLegionArtifact; scouterLegion?: StoredScouterLegion } | null,
    // Existing residents the user explicitly unchecked on the conflict-resolution screen
    // to free up room under MAX_CHARACTERS_PER_WORLD -- removed in the SAME roster update
    // as the upserts below, not a separate pass, so there's never an intermediate state
    // that's still over cap or briefly missing a character mid-import.
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
    // Role keys can point at an untouched resident (kept, not imported/customized this
    // pass) -- resolvedCharacters alone only covers what THIS import actively upserted,
    // so validKeys has to be the real post-import roster on this world, not just that
    // subset, or an untouched resident's role assignment gets silently rejected as
    // "invalid" even though they're staying right where they are.
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
    // Existence-checked, so this is a no-op whenever legionData above already wrote real
    // data (or the world already had some) -- same "regardless of entry path" reasoning as
    // every other import callback here.
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
        // Reachable with setupMode still "import" (Directory -> Search -> "Import a
        // character instead" -> Import screen -> Back), not just the plain search-add
        // path (already "search") -- reset unconditionally rather than branching, a
        // no-op for search, the fix for import.
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
  // The Stats step's own draft, independent of which step is currently active — needed
  // for its live-computed Character-Info substep gate (see getFirstInvalidStepIndex).
  const statsRawValue = setupStepTestByStep.stats ?? "";
  // Equipment/Legion Artifacts' own drafts, independent of which step is currently
  // active — the Stats step's Quick Questions derives Genesis Liberation/Weapon Hand/
  // Ruin Force Shield/Legion Artifacts from whichever of these is most current, and a
  // live in-session edit to either step (not yet Finished) should win over whatever's
  // still sitting in storage from before this session, so it can't stay stuck locked to
  // a stale answer until a full Finish-then-reopen round trip.
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
  // Sourced from the roster (what's actually saved), not the live draft — a value typed
  // into an in-progress step shouldn't show here until its flow's Finish actually commits it.
  const currentRosterCharacter = currentCharacterKey
    ? characterRoster.find((c) => toCharacterKey(c) === currentCharacterKey) ?? null
    : null;
  const currentCharacterGender = currentRosterCharacter?.gender ?? null;
  const currentCharacterMarriage = {
    married: currentRosterCharacter?.marriage?.isMarried ?? null,
    partnerName: currentRosterCharacter?.marriage?.partnerName ?? null,
  };

  // Derive sorted world IDs from roster
  const worldIds = Array.from(
    new Set(characterRoster.map((c) => c.worldID)),
  ).sort((a, b) => a - b);

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
        // Re-seeds from the freshest stored record before entering the flow — mirrors the
        // resync that already runs right after Finish (see its own comment below), just on
        // the opposite end. Without this, re-running an optional flow (e.g. Full Setup again
        // from the profile's Setup bookmark, or a bookmark's confined pencil edit) reused
        // whatever setupStepTestByStep last held from the PREVIOUS run — stale enough to
        // still be missing any profile-page-only correction made since (e.g. HEXA Stat/
        // Equipment/Familiars/Hyper Stat's "Set preset X as active" button), so finishing
        // without touching that field silently reverted the correction back to preset 1.
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
          // All steps skipped — finish immediately with this flow
          setActiveFlowId(flowId);
          finishSetupFlow(flowId);
          return;
        }
        setActiveFlowId(flowId);
        setSetupStepIndex(startStep);
        setSetupStepDirection("forward");
        // Seeds the freshly-mounted step's initial substep — same mechanism used to
        // resume a draft mid-substep (see applyDraftFlowState above). Lets a bookmark
        // like Stats' Hyper Stat/Inner Ability sub-views open the edit flow straight on
        // the substep they're showing instead of always restarting at substep 0.
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoRefresh } from "./useAutoRefresh";
import {
  CHARACTER_NAME_INPUT_FILTER_REGEX,
  MAX_QUERY_LENGTH,
  type SetupMode,
} from "../model/constants";
import { findRosterCharacterByName, toCharacterKey } from "../model/characterKeys";
import {
  createStoredCharacterRecord,
  hasStoredCompletedRequiredSetup,
  readCharactersStore,
  selectCharacterById,
  type CharactersStore,
  type StoredCharacterEquipment,
  type StoredEquipmentPreset,
  type StoredLegionCrystal,
  type StoredIATier,
  type StoredInnerAbility,
  type StoredInnerAbilityPreset,
  type StoredInnerAbilityLine,
  type WhLegionRank,
  selectCharactersList,
  writeLinkSkillsForWorld,
  writeScouterLegionForWorld,
  writeCharactersStore,
} from "../model/charactersStore";
import { findClassById } from "../../tools/hexa-skills/hexa-classes";
import { getClassDataByNexonJobName } from "../setup/data/classSkillData";
import { hexaStatHasData, type HexaStatNode } from "../setup/data/hexaStatData";
import { IA_PASSIVE_PLUS_ONE_LINE, IA_MULTI_TARGET_PLUS_ONE_LINE } from "../setup/data/innerAbilityData";
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
import type { StoredCharacterRecord } from "../model/charactersStore";
import { convertStatsStepDraftToStored, marriageDraftToStored, parseStatsStepDraft } from "../setup/data/statsStepDraft";
import { convertOzRingsDraftToStored, parseOzRingsDraft } from "../setup/data/ozRingData";
import { convertBuffsDraftToStored, parseBuffsDraft } from "../setup/data/buffsData";
import {
  convertScouterQuestionsDraftToStored,
  resolveLegionArtifacts,
  whRankFromRoster,
  type LegionArtifactsDraft,
} from "../setup/data/scouterQuestionsData";
import {
  computeRawStatLevels,
  effectiveStatLevel,
  hasAnyCrystalProgress,
  parseLegionArtifactBoardDraft,
  sanitizeCrystalLevel,
  statBonusValue,
  type LegionArtifactBoardDraft,
  type LegionCrystalDraft,
} from "../setup/data/legionArtifactData";
import type { NormalizedCharacterData } from "../model/types";
import {
  clampFlowStepIndex,
  computeEffectiveFlowStart,
  getFlowStepByIndex,
  getFlowStepCount,
  getRequiredSetupFlowId,
  getSetupFlowLabel,
  isStepSkippedForClass,
  type SetupFlowId,
} from "../setup/flows";
import type { SetupDraftSummary } from "./paneModels";
import { getClassSetupOverrides } from "../setup/data/nexonJobMapping";
import type { SetupStepInputById } from "../setup/types";
import { LOOKUP_MESSAGES } from "./messages";
import { useCharacterLookup } from "./useCharacterLookup";
import {
  CHARACTERS_TRANSITION_MS,
  useSetupFlowTransitions,
} from "./useSetupFlowTransitions";

export const MAX_CHAMPIONS = 4;

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
interface EquipmentDraftIALine {
  tier?: StoredIATier;
  value?: string;
}
interface EquipmentDraftIAPreset {
  lines?: EquipmentDraftIALine[];
}
interface EquipmentDraftIA {
  activePreset?: number;
  presets?: EquipmentDraftIAPreset[];
}
interface EquipmentDraft {
  presets?: EquipmentDraftPreset[];
  activePreset?: number;
  /** Preset indices that were edited; un-diverged presets are saved as copies of preset 1. */
  diverged?: number[];
  // Shared across presets:
  title?: EquipmentDraftItem;
  totem1?: EquipmentDraftItem; totem2?: EquipmentDraftItem; totem3?: EquipmentDraftItem;
  pet1?: EquipmentDraftItem; pet2?: EquipmentDraftItem; pet3?: EquipmentDraftItem;
  petEquip1?: EquipmentDraftItem; petEquip2?: EquipmentDraftItem; petEquip3?: EquipmentDraftItem;
  innerAbility?: EquipmentDraftIA;
  /** Symbol levels keyed by region name; folded into tools.symbols (the calculator store). */
  symbolLevels?: Record<string, number>;
}

const IA_TIERS = new Set<string>(["rare", "epic", "unique", "legendary"]);

function draftIATier(v: unknown): StoredIATier {
  return typeof v === "string" && IA_TIERS.has(v) ? (v as StoredIATier) : "";
}

function draftIALine(l: EquipmentDraftIALine | undefined): StoredInnerAbilityLine {
  return { tier: draftIATier(l?.tier), value: typeof l?.value === "string" ? l.value : "" };
}

function draftIAPreset(p: EquipmentDraftIAPreset | undefined): StoredInnerAbilityPreset {
  const lines = p?.lines ?? [];
  return { lines: [draftIALine(lines[0]), draftIALine(lines[1]), draftIALine(lines[2])] };
}

function draftInnerAbility(ia: EquipmentDraftIA | undefined): StoredInnerAbility {
  const presets = ia?.presets ?? [];
  return {
    activePreset: typeof ia?.activePreset === "number" ? ia.activePreset : 0,
    presets: [draftIAPreset(presets[0]), draftIAPreset(presets[1]), draftIAPreset(presets[2])],
  };
}

function draftItem(v: EquipmentDraftItem) {
  if (!v?.name) return null;
  return v.id !== undefined ? { id: v.id, name: v.name } : { name: v.name };
}

function draftPresetToStored(p: EquipmentDraftPreset | undefined): StoredEquipmentPreset {
  const d = p ?? {};
  return {
    rings: [draftItem(d.ring1 ?? null), draftItem(d.ring2 ?? null), draftItem(d.ring3 ?? null), draftItem(d.ring4 ?? null)],
    face: draftItem(d.face ?? null), eye: draftItem(d.eye ?? null), earring: draftItem(d.earring ?? null),
    pendants: [draftItem(d.pendant1 ?? null), draftItem(d.pendant2 ?? null)],
    belt: draftItem(d.belt ?? null), pocket: draftItem(d.pocket ?? null),
    hat: draftItem(d.hat ?? null), cape: draftItem(d.cape ?? null), top: draftItem(d.top ?? null),
    glove: draftItem(d.glove ?? null), bottom: draftItem(d.bottom ?? null), shoe: draftItem(d.shoe ?? null),
    shoulder: draftItem(d.shoulder ?? null), medal: draftItem(d.medal ?? null),
    weapon: draftItem(d.weapon ?? null), secondary: draftItem(d.secondary ?? null), emblem: draftItem(d.emblem ?? null),
    android: draftItem(d.android ?? null), heart: draftItem(d.heart ?? null), badge: draftItem(d.badge ?? null),
  };
}

function parseEquipmentDraft(json: string): StoredCharacterEquipment | null {
  try {
    const d = tryParseJson(json) as EquipmentDraft | null;
    if (!d || typeof d !== "object") return null;
    // Un-diverged presets (those mirroring preset 1 in the UI) are saved as copies of preset 1.
    const diverged = new Set<number>(Array.isArray(d.diverged) ? d.diverged : []);
    const presetAt = (i: number) => draftPresetToStored(d.presets?.[i === 0 || diverged.has(i) ? i : 0]);
    return {
      presets: [presetAt(0), presetAt(1), presetAt(2)],
      activePreset: typeof d.activePreset === "number" ? d.activePreset : 0,
      title: draftItem(d.title ?? null),
      totems: [draftItem(d.totem1 ?? null), draftItem(d.totem2 ?? null), draftItem(d.totem3 ?? null)],
      pets: [draftItem(d.pet1 ?? null), draftItem(d.pet2 ?? null), draftItem(d.pet3 ?? null)],
      petEquips: [draftItem(d.petEquip1 ?? null), draftItem(d.petEquip2 ?? null), draftItem(d.petEquip3 ?? null)],
      innerAbility: draftInnerAbility(d.innerAbility),
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

function extractSymbolLevels(json: string): Record<string, number> | null {
  const d = tryParseJson(json) as EquipmentDraft | null;
  if (!d || typeof d !== "object" || !d.symbolLevels) return null;
  return d.symbolLevels;
}

/** Merge per region: set level + enabled, preserving existing calculator fields. */
function buildSymbolsToolData(existing: SavedSymbols | null, levels: Record<string, number>): SavedSymbols {
  const symbols: Record<string, SymbolState> = { ...(existing?.symbols ?? {}) };
  for (const [name, level] of Object.entries(levels)) {
    if (!Number.isFinite(level) || level < 1) continue;
    const found = findSymbolArea(name);
    if (!found) continue;
    const prev = symbols[name];
    symbols[name] = prev
      ? { ...prev, level, enabled: true }
      : { level, current: 0, daily: found.area.daily, weeklyEnabled: found.type === "arcane", enabled: true };
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
  const { stats, isLiberated, weaponHand, hasRuinForceShield, soul } = convertStatsStepDraftToStored(parseStatsStepDraft(rawDraft), character.level);
  upsertFn({ ...existing, stats: { ...existing.stats, ...stats }, isLiberated, weaponHand, hasRuinForceShield, soul });
}

const WH_LEGION_RANK_SET = new Set<string>(["B", "A", "S", "SS", "SSS"]);

// Resolves the world's WH Legion rank: roster-derived wins, else the manual pick.
// A blank manual pick just means "no Wild Hunter" and replaces whatever was stored
// before — there's no separate "clear" affordance, since a blank answer already IS
// the "none" answer (same reasoning as the soul/Inner-Ability-line questions).
function resolveWhLegionRank(
  derived: WhLegionRank | null,
  manual: string | undefined,
): WhLegionRank | undefined {
  if (derived) return derived;
  if (manual && WH_LEGION_RANK_SET.has(manual)) return manual as WhLegionRank;
  return undefined;
}

// The draft shape allows optional/sparse fields (mid-edit); storage wants every crystal
// fully filled in (level defaults to 0, stats padded to 3 slots).
function toStoredLegionCrystals(crystals: LegionCrystalDraft[] | undefined): StoredLegionCrystal[] | undefined {
  if (!crystals) return undefined;
  return crystals.map((c) => ({
    level: sanitizeCrystalLevel(c?.level),
    stats: [c?.stats?.[0] ?? null, c?.stats?.[1] ?? null, c?.stats?.[2] ?? null],
  }));
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
  const wildHunterRank = resolveWhLegionRank(whRankFromRoster(legionRoster), whLegionDraft);
  // Maple Union artifacts are also account-level (per-world), not derivable — keep them
  // on the same per-world blob next to the WH rank. (For full_setup these are already
  // derived from `board` by the caller before this function runs.)
  const artifacts = resolveLegionArtifacts(legionArtifactsDraft, existingLegion);
  // The full 9-crystal board (full_setup only) is also per-world; preserve whatever's
  // already stored when this session didn't touch it (e.g. a second character on the
  // same world finishing full_setup without revisiting Legion Artifacts).
  const artifactLevel = board?.artifactLevel ?? existingLegion?.artifactLevel;
  const crystals = toStoredLegionCrystals(board?.crystals) ?? existingLegion?.crystals;
  writeScouterLegionForWorld(character.worldID, {
    ...(wildHunterRank ? { wildHunterRank } : {}),
    ...artifacts,
    ...(artifactLevel !== undefined ? { artifactLevel } : {}),
    ...(crystals ? { crystals } : {}),
  });
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
  const base = existing ?? createStoredCharacterRecord({
    character,
    gender: normalizeGenderValue(stepData.gender),
    marriage: marriageDraftToStored(stepData.marriage ?? ""),
  });

  const statsDraft = parseStatsStepDraft(stepData.stats ?? "");
  applyScouterLegionForWorld(store, character, base, statsDraft.scouterQuestions?.whLegion, statsDraft.scouterQuestions);

  const { stats, isLiberated, weaponHand, hasRuinForceShield, soul } =
    convertStatsStepDraftToStored(statsDraft, character.level);
  const ozRings = convertOzRingsDraftToStored(parseOzRingsDraft(stepData.oz_rings ?? ""));
  const buffs = convertBuffsDraftToStored(parseBuffsDraft(stepData.buffs ?? ""));
  const scouterQ = convertScouterQuestionsDraftToStored(statsDraft);
  const scouterPatch = ozRings || buffs || scouterQ
    ? { ...base.scouter, ...(ozRings ? { ozRings } : {}), ...(buffs ? { buffs } : {}), ...(scouterQ ?? {}) }
    : base.scouter;
  // The scouter flow reuses the full-setup Hexa Matrix step (skill-levels substep only),
  // persisting to the same tool homes as full setup. HEXA Stat isn't collected here, but
  // we still build it so any value the step autofilled from existing data is preserved.
  const hexaSkillsToolData = buildHexaSkillsToolData(character.jobName, stepData.hexa_matrix ?? "");
  const hexaStatToolData = buildHexaStatToolData(stepData.hexa_matrix ?? "");
  const tools = {
    ...base.tools,
    ...(hexaSkillsToolData ? { hexaSkills: hexaSkillsToolData } : null),
    ...(hexaStatToolData ? { hexaStat: hexaStatToolData } : null),
  };
  upsertFn({
    ...base,
    stats: { ...base.stats, ...stats },
    isLiberated, weaponHand, hasRuinForceShield, soul,
    scouter: scouterPatch,
    tools,
  });
  if (created) removeSetupDraftForCharacter(character);
  return created;
}

// The only two legendary Inner Ability lines MapleScouter cares about — full_setup
// derives its scouter-facing answer from the Equipment IA card's active preset instead
// of asking the question again (maplescouter_setup, which has no Equipment step, still
// asks directly; see ScouterQuestionsSection's showArtifactsAndIA in StatsSetupStep).
function deriveInnerAbilityLineFromEquipment(
  equipment: StoredCharacterEquipment | null,
): "passive" | "multiTarget" | undefined {
  const preset = equipment?.innerAbility.presets[equipment.innerAbility.activePreset];
  const values = preset?.lines.map((l) => l.value) ?? [];
  if (values.includes(IA_PASSIVE_PLUS_ONE_LINE)) return "passive";
  if (values.includes(IA_MULTI_TARGET_PLUS_ONE_LINE)) return "multiTarget";
  return undefined;
}

// "Lv. 11 Sacred Symbols" (the Buffs step's maxedSacredSymbol tile) is about the 6 boss
// regions' Sacred Symbols specifically (Grand Sacred grants EXP/meso/drop, not a boss
// bonus, so it's excluded) — full_setup already has this data from the Equipment step's
// Symbols substep, so it's derived here rather than trusting a separate manual toggle.
function deriveMaxedSacredSymbol(symbolsData: SavedSymbols | null): boolean {
  if (!symbolsData) return false;
  return SACRED_AREAS.every((a) => (symbolsData.symbols[a.name]?.level ?? 0) >= SACRED_MAX_LEVEL);
}

// The scouter API only needs 2 of the 16 Legion Artifact stats — derive them from the
// full board full_setup collects instead of storing a separately-entered value. Only
// derives (and thus only overrides whatever's already stored for this world) when this
// session's board actually has crystal progress — an empty/untouched board must NOT
// wipe a value a different character already set here via maplescouter_setup.
function deriveLegionArtifactFields(board: LegionArtifactBoardDraft): LegionArtifactsDraft | undefined {
  if (!hasAnyCrystalProgress(board.crystals)) return undefined;
  const rawLevels = computeRawStatLevels(board.crystals, board.artifactLevel ?? 0);
  return {
    artifactExtraTarget: effectiveStatLevel(rawLevels.multiTargetExp) >= 1,
    artifactFinalAttackDmg: String(statBonusValue("finalAttackDamage", effectiveStatLevel(rawLevels.finalAttackDamage))),
  };
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
  applyScouterLegionForWorld(
    store,
    character,
    base,
    statsDraft.scouterQuestions?.whLegion,
    deriveLegionArtifactFields(legionBoard),
    legionBoard,
  );

  const { stats, isLiberated, weaponHand, hasRuinForceShield, soul } =
    convertStatsStepDraftToStored(statsDraft, character.level);
  const hexaSkillsToolData = buildHexaSkillsToolData(character.jobName, stepData.hexa_matrix ?? "");
  const hexaStatToolData = buildHexaStatToolData(stepData.hexa_matrix ?? "");
  const vMatrixToolData = buildVMatrixToolDataForRecord(stepData.v_matrix ?? "");
  const familiarsData = stepData.familiars ? tryParseJson(stepData.familiars) : null;
  const equipmentData = stepData.equipment ? parseEquipmentDraft(stepData.equipment) : null;
  const symbolsData = stepData.equipment ? buildSymbolsToolDataForRecord(character, stepData.equipment) : null;
  const tools = {
    ...base.tools,
    ...(hexaSkillsToolData ? { hexaSkills: hexaSkillsToolData } : null),
    ...(hexaStatToolData ? { hexaStat: hexaStatToolData } : null),
    ...(vMatrixToolData ? { vMatrix: vMatrixToolData } : null),
    ...(familiarsData ? { familiars: familiarsData } : null),
    ...(symbolsData ? { symbols: symbolsData } : null),
  };

  const ozRings = convertOzRingsDraftToStored(parseOzRingsDraft(stepData.oz_rings ?? ""));
  const buffsConverted = convertBuffsDraftToStored(parseBuffsDraft(stepData.buffs ?? ""));
  const buffs = deriveMaxedSacredSymbol(symbolsData)
    ? { ...(buffsConverted ?? {}), maxedSacredSymbol: true as const }
    : buffsConverted;
  const scouterQ = convertScouterQuestionsDraftToStored(statsDraft);
  const innerAbilityLine = deriveInnerAbilityLineFromEquipment(equipmentData);
  const scouterPatch = {
    ...(ozRings ? { ozRings } : {}),
    ...(buffs ? { buffs } : {}),
    ...(scouterQ ?? {}),
    ...(innerAbilityLine ? { innerAbilityLine } : {}),
  };

  return {
    ...base,
    stats: { ...base.stats, ...stats },
    equipment: equipmentData ?? base.equipment,
    isLiberated, weaponHand, hasRuinForceShield, soul, tools,
    ...(Object.keys(scouterPatch).length > 0 ? { scouter: scouterPatch } : {}),
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
  const symbolsData = buildSymbolsToolDataForRecord(character, equipmentJson);
  upsertFn({
    ...existing,
    equipment,
    tools: symbolsData ? { ...existing.tools, symbols: symbolsData } : existing.tools,
  });
}

function applyStandaloneToolDrafts(
  character: NormalizedCharacterData | null,
  stepData: import("../setup/types").SetupStepInputById,
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  if (!character) return;
  if (stepData.equipment) applyEquipmentDraftToRoster(character, stepData.equipment, upsertFn);
  if (stepData.hexa_matrix) applyHexaDraftToRoster(character, stepData.hexa_matrix, upsertFn);
  if (stepData.v_matrix) applyVMatrixDraftToRoster(character, stepData.v_matrix, upsertFn);
  if (stepData.familiars) applyFamiliarsDraftToRoster(character, stepData.familiars, upsertFn);
}

function applyFamiliarsDraftToRoster(
  character: NormalizedCharacterData | null,
  familiarsJson: string,
  upsertFn: (c: StoredCharacterRecord) => void,
) {
  if (!character || !familiarsJson) return;
  const data = tryParseJson(familiarsJson);
  if (!data || typeof data !== "object") return;
  const store = readCharactersStore();
  const existing = selectCharacterById(store, toCharacterKey(character));
  if (!existing) return;
  upsertFn({ ...existing, tools: { ...existing.tools, familiars: data } });
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

function buildVMatrixToolDataForRecord(vMatrixJson: string): { levels: Record<string, number> } | null {
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
  const vMatrixData = buildVMatrixToolDataForRecord(vMatrixJson);
  if (!vMatrixData) return;
  const existing = selectCharacterById(readCharactersStore(), toCharacterKey(character));
  if (!existing) return;
  upsertFn({ ...existing, tools: { ...existing.tools, vMatrix: vMatrixData } });
}

// 6th-job HEXA Skills data (origin/mastery/enhancement/common/ascent), persisted to
// tools.hexaSkills. HEXA Stat is stripped out — it lives in its own key (see below).
function buildHexaSkillsToolData(jobName: string, hexaJson: string): { className: string; levels: unknown } | null {
  try {
    const parsed = JSON.parse(hexaJson) as Record<string, unknown>;
    const classData = getClassDataByNexonJobName(jobName);
    const hexaClassId = classData?.id === "sia_astelle" ? "sia" : classData?.id;
    const classDef = hexaClassId ? findClassById(hexaClassId) : null;
    if (parsed && typeof parsed === "object" && classDef) {
      const levels = { ...parsed };
      delete levels.hexaStat;
      return { className: classDef.className, levels };
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
      return { nodes: nodes as HexaStatNode[] };
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

function getCurrentCharacterGender(
  setupStepTestByStep: SetupStepInputById,
): "male" | "female" | null {
  const currentCharacterGenderRaw = (setupStepTestByStep.gender ?? "").toLowerCase();
  if (currentCharacterGenderRaw === "male" || currentCharacterGenderRaw === "female") {
    return currentCharacterGenderRaw;
  }
  return null;
}

function getCurrentCharacterMarriage(
  setupStepTestByStep: SetupStepInputById,
): { married: boolean | null; partnerName: string | null } {
  const result = marriageDraftToStored(setupStepTestByStep.marriage ?? "");
  return { married: result?.isMarried ?? null, partnerName: result?.partnerName ?? null };
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

export function useCharacterSetupController() {
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
  const [deleteNoticeCharacterName, setDeleteNoticeCharacterName] = useState<string | null>(null);
  const [showDeleteNotice, setShowDeleteNotice] = useState(false);
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [fastDirectoryRevealOnce, setFastDirectoryRevealOnce] = useState(false);
  const [characterRoster, setCharacterRoster] = useState<StoredCharacterRecord[]>([]);
  const [autoRefreshQueue, setAutoRefreshQueue] = useState<StoredCharacterRecord[]>([]);

  // World-scoped main and champion keys
  const [mainCharacterKeyByWorld, setMainCharacterKeyByWorld] = useState<Record<string, string>>({});
  const [championCharacterKeysByWorld, setChampionCharacterKeysByWorld] = useState<Record<string, string[]>>({});

  const [setupStepIndex, setSetupStepIndex] = useState(0);
  const [setupStepDirection, setSetupStepDirection] = useState<"forward" | "backward">("forward");
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
    setCharacterRoster((prev) => {
      const existingIndex = prev.findIndex((c) => toCharacterKey(c) === key);
      if (existingIndex === -1) return prev;
      const existing = prev[existingIndex];
      const updated = createStoredCharacterRecord({
        character: fresh,
        gender: existing.gender,
        stats: existing.stats,
        equipment: existing.equipment,
        tools: existing.tools,
        addedAt: existing.meta.addedAt,
      });
      const next = [...prev];
      next[existingIndex] = updated;
      return next;
    });
  }, []);

  const { refreshingKeys, refreshSingle } = useAutoRefresh({
    queue: autoRefreshQueue,
    onRefreshed: handleRefreshed,
  });

  const transitions = useSetupFlowTransitions();
  const {
    setSetupPanelVisible,
    setSuppressLayoutTransition,
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

  const upsertRosterCharacter = useCallback((character: StoredCharacterRecord) => {
    setCharacterRoster((prev) => {
      const key = toCharacterKey(character);
      const existingIndex = prev.findIndex((entry) => toCharacterKey(entry) === key);
      if (existingIndex === -1) return [...prev, character];
      const next = [...prev];
      next[existingIndex] = character;
      return next;
    });
    // Set as main for their world only if no main exists yet for that world
    setMainCharacterKeyByWorld((prev) => {
      const worldKey = String(character.worldID);
      if (prev[worldKey]) return prev;
      return { ...prev, [worldKey]: toCharacterKey(character) };
    });
  }, []);

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
      setSetupStepTestByStep(draft.setupStepTestByStep ?? {});
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
    [
      applyDraftFlowState,
      hydrateDraftCommonState,
      restoreCompletedFlowState,
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
    const draft = readLastSetupDraft();
    const store = readCharactersStore();
    const storedRoster = selectCharactersList(store);
    const accountHasCompletedRequiredFlow = hasStoredCompletedRequiredSetup(store);

    const hydrateTimer = window.setTimeout(() => {
      handleDraftHydration(draft, store, storedRoster, accountHasCompletedRequiredFlow);
      hasHydratedSetupDraftRef.current = true;
      setIsDraftHydrated(true);
      refreshDraftSummaries();

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
  }, [handleDraftHydration, refreshDraftSummaries]);

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
    const currentCharacterKey = confirmedCharacter ? toCharacterKey(confirmedCharacter) : null;
    // characterRoster is already StoredCharacterRecord[], just sync gender from setup steps
    // and update meta.updatedAt if the character data changed since last save.
    const nextCharactersById = characterRoster.reduce<Record<string, StoredCharacterRecord>>(
      (acc, character) => {
        const id = toCharacterKey(character);
        const existingRecord = existingStore.charactersById[id];
        const isCurrentCharacter = currentCharacterKey === id;
        const gender = isCurrentCharacter
          ? normalizeGenderValue(setupStepTestByStep.gender)
          : (character.gender ?? existingRecord?.gender ?? null);
        const existingMarriage = character.marriage ?? existingRecord?.marriage ?? null;
        const marriage = isCurrentCharacter
          ? marriageDraftToStored(setupStepTestByStep.marriage ?? "")
          : existingMarriage;
        acc[id] = {
          ...character,
          gender,
          marriage,
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

    const nextStore = {
      version: existingStore.version,
      order: characterRoster.map((character) => toCharacterKey(character)),
      mainCharacterIdByWorld: nextMainCharacterIdByWorld,
      championCharacterIdsByWorld: nextChampionCharacterIdsByWorld,
      charactersById: nextCharactersById,
      linkSkillsByWorld: existingStore.linkSkillsByWorld,
      scouterLegionByWorld: existingStore.scouterLegionByWorld,
      updatedAt: now,
    };

    writeCharactersStore(nextStore);
  }, [
    championCharacterKeysByWorld,
    characterRoster,
    confirmedCharacter,
    mainCharacterKeyByWorld,
    setupStepTestByStep,
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
      setupStepTestByStep,
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
    setupStepTestByStep,
    showCharacterDirectory,
    showFlowOverview,
  ]);

  useEffect(() => {
    immediateUiLockRef.current = isUiLocked;
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
      stepData: SetupStepInputById;
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
        setSetupStepTestByStep,
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
      setSetupStepTestByStep,
    });
  }, [confirmedCharacter, lookup, transitions]);

  const runTransitionToMode = useCallback(
    (nextMode: SetupMode) => {
      if (immediateUiLockRef.current) return;
      immediateUiLockRef.current = true;
      setIsAddingCharacter(false);
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
        setSetupStepTestByStep,
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
      lookup.resetSearchStateMessage();
    });
  }, [confirmedCharacter, lookup, transitions]);

  const backToCharactersDirectory = useCallback(() => {
    setIsAddingCharacter(false);
    setSetupMode("search");
    setSetupFlowStarted(true);
    transitions.setSetupPanelVisible(true);
    setShowFlowOverview(true);
    setShowCharacterDirectory(true);
    setSetupStepIndex(0);
    setSetupStepDirection("backward");
  }, [transitions]);

  const setSetupStepWithDirection = useCallback(
    (nextStep: number) => {
      const direction = nextStep > setupStepIndex ? "forward" : "backward";
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
      setSetupStepDirection(direction);
      setSetupStepIndex(target);
    },
    [activeFlowId, confirmedCharacter, setupStepIndex],
  );

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
      stepData: draft.setupStepTestByStep ?? {},
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
      stepData: draft.setupStepTestByStep ?? {},
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
      stepData: existingCharacterDraft?.setupStepTestByStep ?? {},
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

  const finishSetupFlow = useCallback((overrideFlowId?: SetupFlowId) => {
    if (immediateUiLockRef.current) return;
    immediateUiLockRef.current = true;
    setIsFinishingSetup(true);

    transitions.queueTransitionTimer(() => {
      const effectiveFlowId = typeof overrideFlowId === "string" ? overrideFlowId : activeFlowId;
      const isQuickSetupFlow = effectiveFlowId === requiredFlowId;
      const isFullSetupFlow = effectiveFlowId === "full_setup";
      if ((isQuickSetupFlow || isFullSetupFlow) && confirmedCharacter) {
        const storedRecord = isFullSetupFlow
          ? buildFullSetupRecord(confirmedCharacter, setupStepTestByStep)
          : createStoredCharacterRecord({
              character: confirmedCharacter,
              gender: normalizeGenderValue(setupStepTestByStep.gender),
              marriage: marriageDraftToStored(setupStepTestByStep.marriage ?? ""),
            });
        upsertRosterCharacter(storedRecord);
        setHasCompletedRequiredSetupEver(true);
        removeSetupDraftForCharacter(confirmedCharacter);
      }

      if (effectiveFlowId === "stats_flow") {
        applyStatsDraftToRoster(confirmedCharacter, setupStepTestByStep.stats ?? "", upsertRosterCharacter);
      }

      if (effectiveFlowId === "maplescouter_setup"
        && applyMapleScouterFlow(confirmedCharacter, setupStepTestByStep, upsertRosterCharacter)) {
        setHasCompletedRequiredSetupEver(true);
      }

      const linkSkillsValue = setupStepTestByStep.link_skills;
      if (linkSkillsValue && confirmedCharacter) {
        writeLinkSkillsForWorld(confirmedCharacter.worldID, linkSkillsValue);
      }

      if (confirmedCharacter && !isFullSetupFlow) {
        applyStandaloneToolDrafts(confirmedCharacter, setupStepTestByStep, upsertRosterCharacter);
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

      if (isQuickSetupFlow || isFullSetupFlow) {
        lookup.setStatusTone("neutral");
        lookup.setStatusMessage(LOOKUP_MESSAGES.setupSaved);
      }

      setIsFinishingSetup(false);
      immediateUiLockRef.current = false;
    }, CHARACTERS_TRANSITION_MS.standard);
  }, [
    activeFlowId,
    completedFlowIds,
    confirmedCharacter,
    requiredFlowId,
    setupStepTestByStep,
    lookup,
    transitions,
    upsertRosterCharacter,
  ]);

  const switchToCharacterProfile = useCallback(
    (character: StoredCharacterRecord) => {
      if (immediateUiLockRef.current) return;
      immediateUiLockRef.current = true;
      setIsSwitchingToProfile(true);
      transitions.queueTransitionTimer(() => {
        setIsAddingCharacter(false);
        const store = readCharactersStore();
        const storedCharacter = selectCharacterById(store, toCharacterKey(character));
        setConfirmedCharacter(character);
        setSetupMode("search");
        setSetupFlowStarted(true);
        setShowCharacterDirectory(false);
        setSetupStepDirection("backward");
        setActiveFlowId(requiredFlowId);
        setCompletedFlowIds([requiredFlowId]);
        setShowFlowOverview(false);
        setSetupStepIndex(0);
        setSetupStepDirection("forward");
        const savedMarriage = storedCharacter?.marriage;
        let marriageValue = "";
        if (savedMarriage?.isMarried === true) marriageValue = savedMarriage.partnerName ? `yes|${savedMarriage.partnerName}` : "yes";
        else if (savedMarriage?.isMarried === false) marriageValue = "no";
        setSetupStepTestByStep({
          gender: storedCharacter?.gender ?? "",
          marriage: marriageValue,
          stats: "",
          equipment: "",
        });
        transitions.setSetupPanelVisible(true);
        setIsSwitchingToProfile(false);
        immediateUiLockRef.current = false;
      }, CHARACTERS_TRANSITION_MS.fast);
    },
    [requiredFlowId, transitions],
  );

  const setMainCharacter = useCallback(
    (character: StoredCharacterRecord) => {
      setMainCharacterKeyByWorld((prev) =>
        setMainKeyForWorld(prev, character.worldID, toCharacterKey(character)),
      );
      switchToCharacterProfile(character);
    },
    [switchToCharacterProfile],
  );

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
    setIsDeleteTransitioning(true);
    // Fade the current view out first (the brief empty beat) for both cases — multi-char
    // then reveals the directory; last-char cross-fades into the first-time setup screen.
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
        // Keep isSwitchingToDirectory true here so the first-time card stays
        // blanked (faded out) under the delete notice — same "blank for a beat"
        // window the multi-char delete shows before its directory reveals. The
        // final cleanup timer clears it and fades the first-time screen in.
      } else {
        setSetupMode("search");
        setSetupFlowStarted(true);
        setShowFlowOverview(true);
        setShowCharacterDirectory(true);
        transitions.setSetupPanelVisible(true);
      }
      setSetupStepIndex(0);
      setSetupStepDirection("forward");
      setDeleteNoticeCharacterName(removedCharacter.characterName);
    }, CHARACTERS_TRANSITION_MS.standard);

    transitions.queueTransitionTimer(() => {
      setShowDeleteNotice(true);
    }, CHARACTERS_TRANSITION_MS.standard + 30);

    transitions.queueTransitionTimer(() => {
      setShowDeleteNotice(false);
    }, CHARACTERS_TRANSITION_MS.standard + 30 + CHARACTERS_TRANSITION_MS.deleteNoticeVisible);

    transitions.queueTransitionTimer(() => {
      setDeleteNoticeCharacterName(null);
      setIsDeleteTransitioning(false);
      setIsSwitchingToDirectory(false);
      if (isLastCharacter) {
        // Now that the blank beat has elapsed, ease the first-time setup screen
        // in instead of snapping it on.
        transitions.playSearchFadeIn();
      }
      immediateUiLockRef.current = false;
    }, CHARACTERS_TRANSITION_MS.standard + CHARACTERS_TRANSITION_MS.deleteNoticeTotal);
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
    transitions.runBackTransition(() => {
      setIsAddingCharacter(true);
      setShowCharacterDirectory(false);
      setShowFlowOverview(false);
      setSetupMode("search");
      setSetupFlowStarted(false);
      setFoundCharacter(null);
      setConfirmedCharacter(null);
      setQuery("");
      lookup.resetSearchStateMessage();
    });
  }, [lookup, transitions]);

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
        setupStepTestByStep,
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
  const currentCharacterKey = confirmedCharacter ? toCharacterKey(confirmedCharacter) : null;
  const isCurrentMainCharacter = Boolean(
    currentCharacterKey && mainCharacterKey && currentCharacterKey === mainCharacterKey,
  );
  const isCurrentChampionCharacter = Boolean(
    currentCharacterKey && championCharacterKeys.includes(currentCharacterKey),
  );
  const canSetCurrentChampion =
    isCurrentChampionCharacter || championCharacterKeys.length < MAX_CHAMPIONS;
  const currentCharacterGender = getCurrentCharacterGender(setupStepTestByStep);
  const currentCharacterMarriage = getCurrentCharacterMarriage(setupStepTestByStep);

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
    deleteNoticeCharacterName,
    showDeleteNotice,
    isAddingCharacter,
    fastDirectoryRevealOnce,
    characterRoster,
    mainCharacterKeyByWorld,
    championCharacterKeysByWorld,
    worldIds,
    setupStepIndex,
    setupStepDirection,
    draftSummaries,
    foundCharacterHasResumableDraft,
    hasCompletedRequiredSetupEver,
    isDraftHydrated,
    isUiLocked,
    activeSetupStepValue,
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
      toggleChampionCharacter,
      switchToCharacterProfile,
      toggleCharacterDirectory,
      removeCurrentCharacter,
      openAddCharacterSearch,
      backFromAddCharacter,
      refreshSingle,
      handleQueryInput,
      handleSearchSubmit,
      startOptionalSetupFlow: (flowId: SetupFlowId) => {
        if (immediateUiLockRef.current) return;
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
        setShowFlowOverview(false);
        setShowCharacterDirectory(false);
      },
    },
  };
}

/*
  Draft types and serialization for the stats setup step.
  The step value in SetupStepInputById is a string, so we JSON.stringify/parse
  the structured draft in and out of that slot.

*/

import type { CharacterMarriage, CharacterSoul, StoredCharacterStats, StoredHyperStat, StoredInnerAbility, StoredTripleStatField } from "../../model/charactersStore";
import type { EquipmentLike } from "./equipmentStepDraft";
import { HYPER_STAT_CATEGORIES, HYPER_STAT_PRESET_COUNT, parseStoredHyperStatLevel } from "./hyperStatData";
import { convertInnerAbilityDraftToStored, type IADraft } from "./innerAbilityData";
import { CLASS_SKILL_DATA, getRequiredStatsForClass } from "./classSkillData";
import { TRIPLE_STAT_FIELDS, type StatFieldId, type TripleStatFieldId } from "./statFields";

export interface TripleStatDraft {
  base: string;
  percent: string;
  percentUnapplied: string;
}

export interface CooldownReductionDraft {
  seconds: string;
  percent: string;
}

export interface HyperStatDraft {
  /** One raw-level map per preset (length HYPER_STAT_PRESET_COUNT). */
  presets: Record<string, string>[];
  activePreset: number;
}

/** Coerces any stored/legacy value into a well-formed HyperStatDraft. */
export function normalizeHyperStatDraft(raw: unknown): HyperStatDraft {
  const presets: Record<string, string>[] = Array.from({ length: HYPER_STAT_PRESET_COUNT }, () => ({}));
  let activePreset = 0;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.presets)) {
      obj.presets.forEach((p, i) => {
        if (i < presets.length && p && typeof p === "object") presets[i] = { ...(p as Record<string, string>) };
      });
      if (typeof obj.activePreset === "number" && obj.activePreset >= 0 && obj.activePreset < presets.length) {
        activePreset = obj.activePreset;
      }
    } else {
      // Legacy single-allocation shape (flat category→level map) → preset 1.
      presets[0] = { ...(obj as Record<string, string>) };
    }
  }
  return { presets, activePreset };
}

export interface StatsStepDraft {
  // Triple stat fields (base / % / % not applied)
  str?: TripleStatDraft;
  dex?: TripleStatDraft;
  int?: TripleStatDraft;
  luk?: TripleStatDraft;
  hp?: TripleStatDraft;
  attackPower?: TripleStatDraft;
  magicAtt?: TripleStatDraft;

  // Single stat fields
  damage?: string;
  bossDamage?: string;
  ignoreDefense?: string;
  criticalRate?: string;
  criticalDamage?: string;
  buffDuration?: string;
  cooldownReduction?: CooldownReductionDraft;
  cooldownSkip?: string;
  ignoreElementalResistance?: string;
  additionalStatusDamage?: string;
  summonDuration?: string;
  arcanePower?: string;
  sacredPower?: string;

  // Profile-pencil-only fields (stats_flow): never asked in the guided Setup flows,
  // see StatsSetupStep's showAllStats. mp is a raw number (labeled per-class via
  // ClassSkillData.resourceLabel), normalEnemyDamage a plain percentage like bossDamage.
  mp?: string;
  normalEnemyDamage?: string;

  // Hyper Stat allocation (Full setup only): 3 swappable presets, each a map of
  // HyperStatCategoryId → raw level string as typed in the substep.
  hyperStat?: HyperStatDraft;

  // Inner Ability (Full setup only): 3 swappable presets, each with 3 independently-
  // tiered lines. A Character Info fact (found in the in-game Stats window), so it
  // lives here rather than on the Equipment step. Committed to
  // StoredCharacterEquipment.innerAbility on finish (see useCharacterSetupController).
  innerAbility?: IADraft;

  // Character build options
  setupOptions?: {
    isLiberated?: boolean;
    weaponHand?: "1h" | "2h";
    hasRuinForceShield?: boolean;
    soulType?: "mugong" | "ephenia" | "none";
    soulLevel?: 1 | 2;
  };

  // MapleScouter-only answers (render only in the scouter flow).
  // - innerAbilityLine ("passive" | "multiTarget" | "neither"): per-character, stored
  //   in the `scouter` blob.
  // - whLegion ("none" | WhLegionRank): the MANUAL Wild Hunter Legion rank, used only
  //   when no WH is in the world's roster (otherwise it's derived & locked). Committed
  //   per-world to scouterLegionByWorld on finish, not to the character record.
  // - artifactExtraTarget / artifactFinalAttackDmg: Maple Union artifacts, also account-
  //   level (per-world) → committed to scouterLegionByWorld, not the character record.
  scouterQuestions?: {
    innerAbilityLine?: string;
    whLegion?: string;
    artifactExtraTarget?: boolean;
    artifactFinalAttackDmg?: string;
  };
}

/** Minimum character level to unlock Genesis Liberation. */
export const GENESIS_LIBERATION_LEVEL = 255;

// Both are per-class weapon names, such as "Genesis Sword" and "Destiny Sword", obtainable
// only by completing the Genesis Liberation questline. Destiny is the weapon's pre-upgrade
// form and Genesis its fully-grown one. Equipping either is definitive proof of liberation,
// unlike most setup questions, which are self-reports.
const LIBERATION_WEAPON_NAME_PREFIXES = ["Genesis ", "Destiny "];

/** The active preset's weapon name, if it's a Genesis or Destiny liberation weapon. Lets the
 *  UI name the weapon it detected instead of saying "your weapon". */
export function getLiberationWeaponName(equipment: EquipmentLike | null | undefined): string | undefined {
  const weaponName = equipment?.presets?.[equipment.activePreset]?.weapon?.name;
  if (!weaponName) return undefined;
  return LIBERATION_WEAPON_NAME_PREFIXES.some((prefix) => weaponName.startsWith(prefix)) ? weaponName : undefined;
}

/** True or false whenever the active preset has a weapon on file. Genesis Liberation's Final
 *  Damage bonus lives on the weapon item itself rather than a character-wide flag, so a
 *  non-Genesis weapon there is as definitive a proof of not liberated as a Genesis or Destiny
 *  one is of liberated. Undefined only when there's no weapon there yet, meaning the Equipment
 *  step was never entered for this preset, which is ambiguous rather than proof either way. */
export function deriveIsLiberatedFromWeapon(equipment: EquipmentLike | null | undefined): boolean | undefined {
  const weaponName = equipment?.presets?.[equipment.activePreset]?.weapon?.name;
  if (!weaponName) return undefined;
  return LIBERATION_WEAPON_NAME_PREFIXES.some((prefix) => weaponName.startsWith(prefix));
}

/** True or false whenever the active preset's secondary slot has an item on file, undefined
 *  when it's empty. Empty is ambiguous: never equipped there, or the Equipment step never
 *  entered. An empty secondary is also a normal, common state for most classes. */
export function deriveHasRuinForceShield(equipment: EquipmentLike | null | undefined): boolean | undefined {
  const secondary = equipment?.presets?.[equipment.activePreset]?.secondary;
  if (!secondary) return undefined;
  return secondary.name === "Ruin Force Shield";
}

/** Minimum character level to unlock Arcane Symbols / Arcane Force. */
export const ARCANE_POWER_LEVEL = 200;

/** Minimum character level to unlock Sacred Symbols / Sacred Power. */
export const SACRED_POWER_LEVEL = 260;

// A character below the unlock level, or still on a pre-advancement legacy job, can never
// have this symbol type. An undefined level counts as eligible so an unresolved lookup
// doesn't wrongly hide the field.
export function isArcaneEligible(characterLevel: number | undefined, isLegacy: boolean | undefined): boolean {
  if (isLegacy) return false;
  return characterLevel === undefined || characterLevel >= ARCANE_POWER_LEVEL;
}

export function isSacredEligible(characterLevel: number | undefined, isLegacy: boolean | undefined): boolean {
  if (isLegacy) return false;
  return characterLevel === undefined || characterLevel >= SACRED_POWER_LEVEL;
}

/** Minimum character level to unlock Hyper Stats. */
export const HYPER_STAT_LEVEL = 140;

export function isHyperStatEligible(characterLevel: number | undefined): boolean {
  return characterLevel === undefined || characterLevel >= HYPER_STAT_LEVEL;
}

export function serializeStatsStepDraft(draft: StatsStepDraft): string {
  return JSON.stringify(draft);
}

export function parseStatsStepDraft(value: string): StatsStepDraft {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as StatsStepDraft;
    }
    return {};
  } catch {
    return {};
  }
}

function emptyTriple(): StoredTripleStatField {
  return { base: "", percent: "", percentUnapplied: "" };
}

function draftTripleToStored(draft: TripleStatDraft | undefined): StoredTripleStatField {
  if (!draft) return emptyTriple();
  return {
    base: draft.base ?? "",
    percent: draft.percent ?? "",
    percentUnapplied: draft.percentUnapplied ?? "",
  };
}

/** Converts each preset to stored levels, keeping only valid 1–15 entries. */
function draftHyperStatToStored(draft: HyperStatDraft | undefined): StoredHyperStat {
  const hyper = normalizeHyperStatDraft(draft);
  const presets = hyper.presets.map((p) => {
    const out: Record<string, number> = {};
    for (const { id } of HYPER_STAT_CATEGORIES) {
      const level = parseStoredHyperStatLevel(p[id]);
      if (level !== null) out[id] = level;
    }
    return out;
  });
  // Always saved as preset 1. The tab switcher used to view and edit each preset isn't an
  // explicit "this is my active loadout" choice, so trusting it would save whatever preset
  // happened to be open last while editing.
  return { presets, activePreset: 0 };
}

export function convertStatsStepDraftToStored(
  draft: StatsStepDraft,
  characterLevel?: number,
): {
  stats: Partial<StoredCharacterStats>;
  isLiberated: boolean | null;
  weaponHand: "1h" | "2h" | null;
  hasRuinForceShield: boolean | null;
  soul: CharacterSoul | null;
} {
  const opts = draft.setupOptions ?? {};
  const levelRaw = opts.soulLevel;
  const soulType = opts.soulType ?? null;
  const soul: CharacterSoul | null = soulType !== null
    ? { type: soulType, soulLevel: levelRaw === 1 || levelRaw === 2 ? levelRaw : null }
    : null;
  const isBelowLiberationLevel = characterLevel !== undefined && characterLevel < GENESIS_LIBERATION_LEVEL;
  return {
    isLiberated: opts.isLiberated ?? (isBelowLiberationLevel ? false : null),
    weaponHand: opts.weaponHand ?? null,
    hasRuinForceShield: opts.hasRuinForceShield ?? null,
    soul,
    stats: {
      str: draftTripleToStored(draft.str),
      dex: draftTripleToStored(draft.dex),
      int: draftTripleToStored(draft.int),
      luk: draftTripleToStored(draft.luk),
      hp: draftTripleToStored(draft.hp),
      attackPower: draftTripleToStored(draft.attackPower),
      magicAtt: draftTripleToStored(draft.magicAtt),
      damage: draft.damage ?? "",
      bossDamage: draft.bossDamage ?? "",
      ignoreDefense: draft.ignoreDefense ?? "",
      criticalRate: draft.criticalRate ?? "",
      criticalDamage: draft.criticalDamage ?? "",
      buffDuration: draft.buffDuration ?? "",
      cooldownReduction: {
        seconds: draft.cooldownReduction?.seconds ?? "",
        percent: draft.cooldownReduction?.percent ?? "",
      },
      cooldownSkip: draft.cooldownSkip ?? "",
      ignoreElementalResistance: draft.ignoreElementalResistance ?? "",
      additionalStatusDamage: draft.additionalStatusDamage ?? "",
      summonDuration: draft.summonDuration ?? "",
      arcanePower: draft.arcanePower ?? "",
      sacredPower: draft.sacredPower ?? "",
      mp: draft.mp ?? "",
      normalEnemyDamage: draft.normalEnemyDamage ?? "",
      hyperStat: draftHyperStatToStored(draft.hyperStat),
      innerAbility: convertInnerAbilityDraftToStored(draft.innerAbility),
    },
  };
}

function storedTripleToDraft(t: StoredTripleStatField): TripleStatDraft {
  return { base: t.base, percent: t.percent, percentUnapplied: t.percentUnapplied };
}

function storedHyperStatToDraft(stored: StoredHyperStat | undefined): HyperStatDraft {
  if (!stored) return { presets: [{}, {}, {}], activePreset: 0 };
  return {
    presets: stored.presets.map((p) => Object.fromEntries(Object.entries(p).map(([id, level]) => [id, String(level)]))),
    activePreset: stored.activePreset,
  };
}

function storedInnerAbilityToDraft(stored: StoredInnerAbility | undefined): IADraft {
  if (!stored) return {};
  return {
    activePreset: stored.activePreset,
    presets: stored.presets.map((p) => ({
      lines: p.lines.map((l) => ({ tier: l.tier, value: l.value })),
    })),
  };
}

/**
 * Reverse of convertStatsStepDraftToStored. Rebuilds a StatsStepDraft from a
 * character's already-saved stats. Without this, opening the Stats step for an
 * already-set-up character (e.g. the profile bookmark's edit pencil) starts from a
 * blank draft; since convertStatsStepDraftToStored always emits a fully-populated
 * `Partial<StoredCharacterStats>` (blank defaults for anything not in the draft) and
 * the finish path merges that wholesale onto the existing record, finishing without
 * retyping every field silently blanks whatever wasn't retyped. Seed the draft from
 * this before starting an edit session on a character that already has data.
 */
export function storedStatsToStatsStepDraft(record: {
  stats: StoredCharacterStats;
  isLiberated: boolean | null;
  weaponHand: "1h" | "2h" | null;
  hasRuinForceShield: boolean | null;
  soul: CharacterSoul | null;
  /** MapleScouter-only, stored in the `scouter` blob (StoredScouterData.innerAbilityLine).
   *  Without seeding it here, reopening MapleScouter Setup on a character that already
   *  answered this always shows it unanswered, even though the stored value is intact. */
  innerAbilityLine?: string;
}): StatsStepDraft {
  const { stats, isLiberated, weaponHand, hasRuinForceShield, soul, innerAbilityLine } = record;
  return {
    str: storedTripleToDraft(stats.str),
    dex: storedTripleToDraft(stats.dex),
    int: storedTripleToDraft(stats.int),
    luk: storedTripleToDraft(stats.luk),
    hp: storedTripleToDraft(stats.hp),
    attackPower: storedTripleToDraft(stats.attackPower),
    magicAtt: storedTripleToDraft(stats.magicAtt),
    damage: stats.damage,
    bossDamage: stats.bossDamage,
    ignoreDefense: stats.ignoreDefense,
    criticalRate: stats.criticalRate,
    criticalDamage: stats.criticalDamage,
    buffDuration: stats.buffDuration,
    cooldownReduction: { seconds: stats.cooldownReduction.seconds, percent: stats.cooldownReduction.percent },
    cooldownSkip: stats.cooldownSkip,
    ignoreElementalResistance: stats.ignoreElementalResistance,
    additionalStatusDamage: stats.additionalStatusDamage,
    summonDuration: stats.summonDuration,
    arcanePower: stats.arcanePower,
    sacredPower: stats.sacredPower,
    mp: stats.mp,
    normalEnemyDamage: stats.normalEnemyDamage,
    hyperStat: storedHyperStatToDraft(stats.hyperStat),
    innerAbility: storedInnerAbilityToDraft(stats.innerAbility),
    scouterQuestions: innerAbilityLine !== undefined ? { innerAbilityLine } : undefined,
    setupOptions: {
      isLiberated: isLiberated ?? undefined,
      weaponHand: weaponHand ?? undefined,
      hasRuinForceShield: hasRuinForceShield ?? undefined,
      soulType: soul?.type ?? undefined,
      soulLevel: soul?.soulLevel ?? undefined,
    },
  };
}

export function marriageDraftToStored(marriageRaw: string): CharacterMarriage | null {
  if (!marriageRaw || marriageRaw === "") return null;
  if (marriageRaw === "no") return { isMarried: false, partnerName: null };
  if (marriageRaw.startsWith("yes")) {
    const sep = marriageRaw.indexOf("|");
    const partnerName = sep >= 0 ? marriageRaw.slice(sep + 1).trim() || null : null;
    return { isMarried: true, partnerName };
  }
  return null;
}

// ── Character-Info substep validity ─────────────────────────────────────────
// Pulled out of StatsSetupStep so the setup controller can ask "is the Stats step's
// data actually valid?" directly against the persisted draft, without needing that
// component mounted. See isStatsWindowSubstepValid below for why this matters:
// MapleScouter's per-substep validity used to be a self-reported cache that only
// refreshed when its own component happened to remount, which went stale the moment
// the shared draft changed under another flow. This makes it a live, stateless check
// instead, so there's no cache to go stale.

export const TRIPLE_IDS = new Set<string>(TRIPLE_STAT_FIELDS.map((f) => f.id));
export const MAIN_STAT_IDS = new Set<string>(["str", "dex", "int", "luk"]);
export const COMBAT_LEFT: StatFieldId[] = [
  "ignoreDefense", "cooldownReduction", "cooldownSkip", "additionalStatusDamage",
];
export const COMBAT_RIGHT: StatFieldId[] = [
  "damage", "bossDamage", "criticalRate", "criticalDamage", "buffDuration", "ignoreElementalResistance", "summonDuration",
];

// Sanity thresholds mirroring MapleScouter's own input validation. Catches the Total versus
// Base main-stat mix-up before the player reaches MapleScouter's Korean-only error popups.
// These are MapleScouter's sanity bounds, not real game caps, so they warn instead of
// blocking input.
export const MAIN_STAT_BASE_VALUE_WARN_AT = 10000;
export const MAIN_STAT_PERCENT_UNAPPLIED_WARN_AT = 40000;

function isTripleStatFilled(t: TripleStatDraft | undefined, id: TripleStatFieldId): boolean {
  if (!t?.base?.trim() || !t?.percent?.trim()) return false;
  const isAttack = id === "attackPower" || id === "magicAtt";
  return isAttack || Boolean(t.percentUnapplied?.trim());
}

// Same thresholds as the warning bubbles. A value that is clearly the wrong kind of number,
// Total instead of Base for instance, shouldn't be submittable, not merely flagged. A blank
// or untouched field is always sane, since Number("") is 0 rather than a violation, so this
// rejects only a value that was typed in and is clearly wrong.
function isTripleStatSane(t: TripleStatDraft | undefined, isMainStat: boolean): boolean {
  if (!isMainStat || !t) return true;
  if (Number(t.base) >= MAIN_STAT_BASE_VALUE_WARN_AT) return false;
  return Number(t.percentUnapplied) < MAIN_STAT_PERCENT_UNAPPLIED_WARN_AT;
}

function isCombatFieldFilled(draft: StatsStepDraft, id: StatFieldId): boolean {
  if (id === "cooldownReduction") {
    const cd = draft.cooldownReduction;
    return Boolean(cd?.seconds?.trim() && cd?.percent?.trim());
  }
  const raw = (draft as Record<string, unknown>)[id];
  return typeof raw === "string" && raw.trim().length > 0;
}

// Applies in EVERY flow, including full_setup: a blank/incomplete field is always
// fine (full_setup stays otherwise optional), but a value that's clearly the wrong
// kind of number (Total instead of Base, etc.) should never be saved, in any flow.
export function isStatsSubstepSane(
  draft: StatsStepDraft,
  tripleIds: TripleStatFieldId[],
  primaryStat: TripleStatFieldId | undefined,
): boolean {
  return tripleIds.every((id) => isTripleStatSane(draft[id], id === primaryStat));
}

// MapleScouter's calculation needs a real number for every stat, including 0. A blank field
// is ambiguous, never entered or genuinely 0, so every stat shown must be typed in
// explicitly. Scouter only, since full_setup relies on isStatsSubstepSane alone.
export function isStatsSubstepComplete(
  draft: StatsStepDraft,
  tripleIds: TripleStatFieldId[],
  primaryStat: TripleStatFieldId | undefined,
  showArcanePower: boolean,
  showSacredPower: boolean,
): boolean {
  const tripleFilled = tripleIds.every((id) => isTripleStatFilled(draft[id], id));
  const combatFilled = [...COMBAT_LEFT, ...COMBAT_RIGHT].every((id) => isCombatFieldFilled(draft, id));
  const symbolsFilled = (!showArcanePower || Boolean(draft.arcanePower?.trim())) && (!showSacredPower || Boolean(draft.sacredPower?.trim()));
  return tripleFilled && combatFilled && symbolsFilled
    && isStatsSubstepSane(draft, tripleIds, primaryStat);
}

// full_setup and stats_flow stay optional overall, since an untouched substep must remain
// skippable (see isStatsSubstepSane). But players were starting to fill this in, missing one
// field, and finishing setup confused about why MapleScouter couldn't calculate. So the
// substep is treated like MapleScouter's own must-be-complete rule once any field here holds
// a real value: the same per-field checks as isStatsSubstepComplete, requiring at least one
// hit rather than requiring blank fields to stay valid. A fully blank substep returns false,
// with nothing to be partial about, and stays skippable.
export function isStatsSubstepAnyFieldFilled(
  draft: StatsStepDraft,
  tripleIds: TripleStatFieldId[],
  showArcanePower: boolean,
  showSacredPower: boolean,
): boolean {
  const tripleTouched = tripleIds.some((id) => {
    const t = draft[id];
    return Boolean(t?.base?.trim() || t?.percent?.trim() || t?.percentUnapplied?.trim());
  });
  const combatTouched = [...COMBAT_LEFT, ...COMBAT_RIGHT].some((id) => isCombatFieldFilled(draft, id));
  const symbolsTouched = (showArcanePower && Boolean(draft.arcanePower?.trim()))
    || (showSacredPower && Boolean(draft.sacredPower?.trim()));
  return tripleTouched || combatTouched || symbolsTouched;
}

/** Whether the Stats step's Character Info substep, meaning the main stat, combat and symbol
 *  fields, is valid. Computed fresh from the raw stored draft string, not cached.
 *
 *  `forceComplete`, MapleScouter only, means every field must be filled in regardless of
 *  whether the substep has been touched, via isStatsSubstepComplete, which already ands in
 *  the sanity check below. Full Setup forces that same completeness only once the player has
 *  started filling this substep in this session, controlled by `checkAnyFieldFilled`. See
 *  isStatsSubstepAnyFieldFilled's doc comment for why.
 *
 *  The standalone Stats tab (stats_flow) always opens pre-seeded from the character's saved
 *  stats (see buildSeededStepTestByStep) and has no reliable just-typed-this signal to gate
 *  on, so it stays sanity-only however full the draft already is. An untouched substep, and
 *  stats_flow, require only that filled-in values be sane, not that blank fields be filled.
 *  That is the floor every flow shares: forceComplete and any-field-filled can add stricter
 *  requirements on top, never loosen it. */
export function isStatsWindowSubstepValid(
  rawValue: string,
  jobName: string | undefined,
  characterLevel: number | undefined,
  forceComplete: boolean,
  checkAnyFieldFilled: boolean,
): boolean {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  const draft = parseStatsStepDraft(rawValue);
  const tripleIds = classData
    ? getRequiredStatsForClass(classData).filter((id): id is TripleStatFieldId => TRIPLE_IDS.has(id))
    : [];
  const primaryStat = classData?.requiredStats.find((s): s is TripleStatFieldId => MAIN_STAT_IDS.has(s));
  const showArcanePower = isArcaneEligible(characterLevel, classData?.isLegacy);
  const showSacredPower = isSacredEligible(characterLevel, classData?.isLegacy);
  const requireComplete = forceComplete
    || (checkAnyFieldFilled && isStatsSubstepAnyFieldFilled(draft, tripleIds, showArcanePower, showSacredPower));
  if (!requireComplete) {
    return isStatsSubstepSane(draft, tripleIds, primaryStat);
  }
  return isStatsSubstepComplete(draft, tripleIds, primaryStat, showArcanePower, showSacredPower);
}

/*
  Draft types and serialization for the stats setup step.
  The step value in SetupStepInputById is a string, so we JSON.stringify/parse
  the structured draft in and out of that slot.

*/

import type { CharacterMarriage, CharacterSoul, StoredCharacterStats, StoredHyperStat, StoredInnerAbility, StoredTripleStatField } from "../../model/charactersStore";
import { HYPER_STAT_CATEGORIES, HYPER_STAT_PRESET_COUNT, parseStoredHyperStatLevel } from "./hyperStatData";
import { convertInnerAbilityDraftToStored, type IADraft } from "./innerAbilityData";
import { CLASS_SKILL_DATA, getRequiredStatsForClass, type ClassSkillData } from "./classSkillData";
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
    epheniaLevel?: 1 | 2;
  };

  // MapleScouter-only: the weapon's ATT/MATT value (the "+X" shown when hovering the
  // weapon in the equipment window). Scouter needs the raw number; not captured by Full
  // setup. Committed to the `scouter` blob (StoredScouterData.weaponAtt).
  weaponAtt?: string;

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

/** Minimum character level to unlock Arcane Symbols / Arcane Force. */
export const ARCANE_POWER_LEVEL = 200;

/** Minimum character level to unlock Sacred Symbols / Sacred Power. */
export const SACRED_POWER_LEVEL = 260;

// A character below the unlock level (or still on a pre-advancement legacy job) can
// never have this symbol type at all — "undefined level = assume eligible" so an
// unknown level (e.g. a lookup that hasn't resolved yet) doesn't wrongly hide the field.
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
  // Always saved as preset 1 — the tab switcher used to view/edit each preset isn't an
  // explicit "this is my active loadout" choice, so trusting it would silently save
  // whatever preset was last open while editing.
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
  const epheniaRaw = opts.epheniaLevel;
  const soulType = opts.soulType ?? null;
  const soul: CharacterSoul | null = soulType !== null
    ? { type: soulType, epheniaLevel: epheniaRaw === 1 || epheniaRaw === 2 ? epheniaRaw : null }
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
 * Reverse of convertStatsStepDraftToStored — rebuilds a StatsStepDraft from a
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
  /** full_setup asks this inline in the Equipment step's weapon picker, not Stats —
   *  but maplescouter_setup (and the standalone stats_flow) ask it directly in Stats,
   *  since maplescouter_setup has no Equipment step. Without seeding it here too,
   *  weaponAtt already entered via a previous full_setup pass gets asked again. */
  weaponAtt?: number;
  /** MapleScouter-only, stored in the `scouter` blob (StoredScouterData.innerAbilityLine).
   *  Without seeding it here, reopening MapleScouter Setup on a character that already
   *  answered this always shows it unanswered, even though the stored value is intact. */
  innerAbilityLine?: string;
}): StatsStepDraft {
  const { stats, isLiberated, weaponHand, hasRuinForceShield, soul, weaponAtt, innerAbilityLine } = record;
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
    weaponAtt: weaponAtt !== undefined ? String(weaponAtt) : undefined,
    scouterQuestions: innerAbilityLine !== undefined ? { innerAbilityLine } : undefined,
    setupOptions: {
      isLiberated: isLiberated ?? undefined,
      weaponHand: weaponHand ?? undefined,
      hasRuinForceShield: hasRuinForceShield ?? undefined,
      soulType: soul?.type ?? undefined,
      epheniaLevel: soul?.epheniaLevel ?? undefined,
    },
  };
}

// ── Weapon ATT/MATT ──────────────────────────────────────────────────────────
// Shared between StatsSetupStep (maplescouter_setup, which has no Equipment step to
// ask this in) and EquipmentSetupStep (full_setup, asked inline in the weapon picker).

/** Value above which a Weapon ATT/MATT entry is almost certainly the Total stat, not
 *  the weapon's own +X — MapleScouter itself flags this same mix-up. */
export const WEAPON_ATT_WARN_AT = 1150;

export function isWeaponAttSane(weaponAtt: string | undefined): boolean {
  const trimmed = weaponAtt?.trim();
  if (!trimmed) return true;
  return Number(trimmed) <= WEAPON_ATT_WARN_AT;
}

/** "Weapon ATT" vs "Weapon Magic ATT", based on whether the class's required stats
 *  include Magic ATT but not Attack Power. */
export function deriveWeaponAttLabel(classData: ClassSkillData | undefined): { usesMagicWeapon: boolean; label: string } {
  const required = classData?.requiredStats ?? [];
  const usesMagicWeapon = required.includes("magicAtt") && !required.includes("attackPower");
  return { usesMagicWeapon, label: usesMagicWeapon ? "Weapon Magic ATT" : "Weapon ATT" };
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
// the shared draft changed under a DIFFERENT flow — this makes it a live, stateless
// check instead, so there's no cache to go stale.

export const TRIPLE_IDS = new Set<string>(TRIPLE_STAT_FIELDS.map((f) => f.id));
export const MAIN_STAT_IDS = new Set<string>(["str", "dex", "int", "luk"]);
export const COMBAT_LEFT: StatFieldId[] = [
  "ignoreDefense", "cooldownReduction", "cooldownSkip", "additionalStatusDamage",
];
export const COMBAT_RIGHT: StatFieldId[] = [
  "damage", "bossDamage", "criticalRate", "criticalDamage", "buffDuration", "ignoreElementalResistance", "summonDuration",
];

// Sanity thresholds mirroring MapleScouter's own input validation — catches the most
// common mix-ups (Total vs. Base, character Magic ATT vs. weapon Magic ATT) before the
// user ever hits MapleScouter's own (Korean-only) error popups. These are MapleScouter's
// sanity bounds, not real game caps, so they warn instead of hard-blocking input.
export const MAIN_STAT_BASE_VALUE_WARN_AT = 10000;
export const MAIN_STAT_PERCENT_UNAPPLIED_WARN_AT = 40000;

function isTripleStatFilled(t: TripleStatDraft | undefined, id: TripleStatFieldId): boolean {
  if (!t?.base?.trim() || !t?.percent?.trim()) return false;
  const isAttack = id === "attackPower" || id === "magicAtt";
  return isAttack || Boolean(t.percentUnapplied?.trim());
}

// Same thresholds as the warning bubbles — a value that's clearly the wrong kind of
// number (Total instead of Base, etc.) shouldn't be submittable, not just flagged.
// A blank/untouched field is always sane (Number("") is 0, not a violation) — this
// only rejects a value that's actually been typed in and is clearly wrong.
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
  showWeaponAtt: boolean,
): boolean {
  const triplesSane = tripleIds.every((id) => isTripleStatSane(draft[id], id === primaryStat));
  const weaponAttSane = !showWeaponAtt || isWeaponAttSane(draft.weaponAtt);
  return triplesSane && weaponAttSane;
}

// MapleScouter's calculation needs a real number for every stat, including 0 — a blank
// field is ambiguous (never entered vs. genuinely 0), so every stat shown must be
// explicitly typed in. Scouter-only; full_setup relies on isStatsSubstepSane alone.
export function isStatsSubstepComplete(
  draft: StatsStepDraft,
  tripleIds: TripleStatFieldId[],
  requireWeaponAtt: boolean,
  primaryStat: TripleStatFieldId | undefined,
  showArcanePower: boolean,
  showSacredPower: boolean,
): boolean {
  const tripleFilled = tripleIds.every((id) => isTripleStatFilled(draft[id], id));
  const combatFilled = [...COMBAT_LEFT, ...COMBAT_RIGHT].every((id) => isCombatFieldFilled(draft, id));
  const symbolsFilled = (!showArcanePower || Boolean(draft.arcanePower?.trim())) && (!showSacredPower || Boolean(draft.sacredPower?.trim()));
  const weaponAttFilled = !requireWeaponAtt || Boolean(draft.weaponAtt?.trim());
  return tripleFilled && combatFilled && symbolsFilled && weaponAttFilled
    && isStatsSubstepSane(draft, tripleIds, primaryStat, requireWeaponAtt);
}

/** Whether the Stats step's Character-Info substep (the main stat/combat/symbol/weapon-
 *  ATT fields) is valid, computed fresh from the raw stored draft string — not cached.
 *
 *  `requireComplete` is the ONLY thing that varies by flow: MapleScouter needs every
 *  field explicitly filled in (isStatsSubstepComplete, which already ANDs in the sanity
 *  check below), while every other flow that touches Stats (Full Setup, the standalone
 *  Stats flow) only requires values that ARE filled in to be sane, not blank fields to be
 *  filled. Sanity is therefore a floor every flow shares — a subset flow (MapleScouter)
 *  can only add stricter requirements on top of it, never loosen it, and its own extra
 *  strictness never applies back to a flow that didn't ask for it. */
export function isStatsWindowSubstepValid(
  rawValue: string,
  jobName: string | undefined,
  characterLevel: number | undefined,
  requireComplete: boolean,
): boolean {
  const classData = CLASS_SKILL_DATA.find((c) => c.nexonJobName === jobName);
  const draft = parseStatsStepDraft(rawValue);
  const tripleIds = classData
    ? getRequiredStatsForClass(classData).filter((id): id is TripleStatFieldId => TRIPLE_IDS.has(id))
    : [];
  const primaryStat = classData?.requiredStats.find((s): s is TripleStatFieldId => MAIN_STAT_IDS.has(s));
  if (!requireComplete) {
    return isStatsSubstepSane(draft, tripleIds, primaryStat, false);
  }
  const showArcanePower = isArcaneEligible(characterLevel, classData?.isLegacy);
  const showSacredPower = isSacredEligible(characterLevel, classData?.isLegacy);
  return isStatsSubstepComplete(draft, tripleIds, true, primaryStat, showArcanePower, showSacredPower);
}

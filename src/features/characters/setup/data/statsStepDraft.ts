/*
  Draft types and serialization for the stats setup step.
  The step value in SetupStepInputById is a string, so we JSON.stringify/parse
  the structured draft in and out of that slot.

*/

import type { CharacterMarriage, CharacterSoul, StoredCharacterStats, StoredHyperStat, StoredTripleStatField } from "../../model/charactersStore";
import { HYPER_STAT_CATEGORIES, HYPER_STAT_PRESET_COUNT, parseStoredHyperStatLevel } from "./hyperStatData";
import { convertInnerAbilityDraftToStored, type IADraft } from "./innerAbilityData";
import type { ClassSkillData } from "./classSkillData";

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
      hyperStat: draftHyperStatToStored(draft.hyperStat),
      innerAbility: convertInnerAbilityDraftToStored(draft.innerAbility),
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

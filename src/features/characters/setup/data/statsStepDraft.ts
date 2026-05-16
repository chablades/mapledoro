/*
  Draft types and serialization for the stats setup step.
  The step value in SetupStepInputById is a string, so we JSON.stringify/parse
  the structured draft in and out of that slot.

*/

import type { CharacterMarriage, CharacterSoul, StoredCharacterStats, StoredTripleStatField } from "../../model/charactersStore";

export interface TripleStatDraft {
  base: string;
  percent: string;
  percentUnapplied: string;
}

export interface CooldownReductionDraft {
  seconds: string;
  percent: string;
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

  // Character build options
  setupOptions?: {
    isLiberated?: boolean;
    weaponHand?: "1h" | "2h";
    hasRuinForceShield?: boolean;
    soulType?: "mugong" | "ephinea" | "none";
    ephineaLevel?: 1 | 2;
  };
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

export function convertStatsStepDraftToStored(
  draft: StatsStepDraft,
): { stats: Partial<StoredCharacterStats>; isLiberated: boolean | null; weaponHand: "1h" | "2h" | null; hasRuinForceShield: boolean | null; soul: CharacterSoul | null } {
  const opts = draft.setupOptions ?? {};
  const ephineaRaw = opts.ephineaLevel;
  const soulType = opts.soulType ?? null;
  const soul: CharacterSoul | null = soulType !== null
    ? { type: soulType, ephineaLevel: ephineaRaw === 1 || ephineaRaw === 2 ? ephineaRaw : null }
    : null;
  return {
    isLiberated: opts.isLiberated ?? null,
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

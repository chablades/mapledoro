"use client";

import { useState } from "react";
import type { HexaClassDef } from "../../tools/hexa-skills/hexa-classes";
import type { LinkSkillId, StoredCharacterRecord, WhLegionRank } from "../model/charactersStore";
import { readCharactersStore } from "../model/charactersStore";
import {
  emptyBuffsDraft, storedBuffsToDraft, convertBuffsDraftToStored, type BuffsDraft,
} from "../setup/data/buffsData";
import {
  storedOzRingsToOzRingsDraft, convertOzRingsDraftToStored, type OzRingId, type OzRingsDraft,
} from "../setup/data/ozRingData";
import {
  buildScouterPayload, type OzRingOverrides, type ScouterSimulatorOverrides, type SimulatorHexaCoreField, type SimulatorInfoOverrides, type SimulatorInputOverrides,
} from "./scouterApi";
import { hexaCoreFields } from "./hexaSimulatorFields";
import { LINK_SKILL_TO_SCOUTER_KEY } from "./scouterLinkSkills";

export type SimulatorTab = "buffs" | "hexa" | "ozRings" | "input" | "linkSkills" | "extras";

/** The Info tab's editable state, with every field resolved to a concrete value seeded from the
 *  character's real saved answers or their "none" and "neither" equivalents, never undefined, so
 *  the radio and checkbox controls always have a definite selection. `buildOverrides` diffs this
 *  against `initialInfo` and emits only the fields that changed. */
export interface InfoDraft {
  soulType: "mugong" | "ephenia" | "none";
  soulLevel: 1 | 2;
  isLiberated: boolean;
  weaponHand: "1h" | "2h";
  hasRuinForceShield: boolean;
  innerAbilityLine: "passive" | "multiTarget" | "neither";
  artifactExtraTarget: boolean;
  artifactFinalAttackDmg: number;
  wildHunterRank: WhLegionRank | "none";
}

const SIMULATOR_LINK_SKILL_IDS = Object.keys(LINK_SKILL_TO_SCOUTER_KEY) as LinkSkillId[];

const EMPTY_INPUT: Record<keyof SimulatorInputOverrides, number> = {
  mainStat: 0, mainStatPer: 0, mainStatAbs: 0, mainStat9Level: 0,
  subStat: 0, subStatPer: 0, subStatAbs: 0, subStat9Level: 0,
  ssubStat: 0, ssubStatPer: 0, ssubStatAbs: 0, ssubStat9Level: 0,
  allStatPer: 0, criRate: 0, buffDuration: 0, coolTimeReduce: 0,
  atk: 0, atkPer: 0, bossDmg: 0, criDmg: 0, ignoreGuard: 0, resetCoolDown: 0,
};

export interface ScouterSimulatorDraft {
  tab: SimulatorTab;
  setTab: (tab: SimulatorTab) => void;
  level: number;
  setLevel: (level: number) => void;
  arcaneForce: number;
  setArcaneForce: (v: number) => void;
  authenticForce: number;
  setAuthenticForce: (v: number) => void;
  finalDmgPercent: number;
  setFinalDmgPercent: (v: number) => void;
  hexaCores: Record<SimulatorHexaCoreField, number>;
  setHexaCore: (field: SimulatorHexaCoreField, value: number) => void;
  buffsDraft: BuffsDraft;
  setBuffsDraft: (draft: BuffsDraft) => void;
  ozRingsDraft: OzRingsDraft;
  setOzRingsDraft: (draft: OzRingsDraft) => void;
  input: Record<keyof SimulatorInputOverrides, number>;
  setInputField: (key: keyof SimulatorInputOverrides, value: number) => void;
  linkSkills: Record<LinkSkillId, number>;
  setLinkSkill: (id: LinkSkillId, value: number) => void;
  info: InfoDraft;
  setInfoField: <K extends keyof InfoDraft>(key: K, value: InfoDraft[K]) => void;
  /** False once every field is back to its real starting value. Apply can then skip the request
   *  entirely, since there would be nothing to simulate. */
  hasChanges: boolean;
  /** Per-group resets back to the character's real values: one per tab, plus the persistent
   *  Level, Arc. Force and Sac. Power row, which belongs to no tab. Each touches only its own
   *  group. */
  resetLevelRow: () => void;
  resetBuffs: () => void;
  resetHexa: () => void;
  resetOzRings: () => void;
  resetInput: () => void;
  resetLinkSkills: () => void;
  resetInfo: () => void;
  /** Assembles every draft field into the payload buildDirectScouterPayload expects. */
  buildOverrides: () => ScouterSimulatorOverrides;
}

/** The character's real Info-tab answers, as a fully-resolved InfoDraft. A missing weapon
 *  soul / IA line / Wild Hunter answer seeds to its explicit "none"/"neither" so the radios
 *  render with a definite (if empty-meaning) selection rather than nothing checked. */
function realInfoDraft(character: StoredCharacterRecord): InfoDraft {
  const soul = character.soul;
  const legion = readCharactersStore().scouterLegionByWorld[String(character.worldID)];
  return {
    soulType: soul?.type === "mugong" || soul?.type === "ephenia" ? soul.type : "none",
    soulLevel: soul?.soulLevel === 2 ? 2 : 1,
    isLiberated: character.isLiberated === true,
    weaponHand: character.weaponHand === "1h" ? "1h" : "2h",
    hasRuinForceShield: character.hasRuinForceShield === true,
    innerAbilityLine: character.scouter?.innerAbilityLine ?? "neither",
    artifactExtraTarget: legion?.artifactExtraTarget === true,
    artifactFinalAttackDmg: legion?.artifactFinalAttackDmg ?? 0,
    wildHunterRank: legion?.wildHunterRank ?? "none",
  };
}

/** Overlays a previously-applied simulation's infoOverrides onto the real InfoDraft, so
 *  reopening the popup starts from what was simulated rather than the character's real
 *  answers. */
function overriddenSoulType(info: SimulatorInfoOverrides, fallback: InfoDraft["soulType"]): InfoDraft["soulType"] {
  const t = info.soul?.type;
  if (t === "mugong" || t === "ephenia" || t === "none") return t;
  return fallback;
}

function overriddenSoulLevel(info: SimulatorInfoOverrides, fallback: 1 | 2): 1 | 2 {
  if (!info.soul) return fallback;
  return info.soul.soulLevel === 2 ? 2 : 1;
}

function infoDraftFromOverrides(character: StoredCharacterRecord, info: SimulatorInfoOverrides | undefined): InfoDraft {
  const real = realInfoDraft(character);
  if (!info) return real;
  return {
    soulType: overriddenSoulType(info, real.soulType),
    soulLevel: overriddenSoulLevel(info, real.soulLevel),
    isLiberated: info.isLiberated ?? real.isLiberated,
    weaponHand: info.weaponHand ?? real.weaponHand,
    hasRuinForceShield: info.hasRuinForceShield ?? real.hasRuinForceShield,
    innerAbilityLine: info.innerAbilityLine ?? real.innerAbilityLine,
    artifactExtraTarget: info.artifactExtraTarget ?? real.artifactExtraTarget,
    artifactFinalAttackDmg: info.artifactFinalAttackDmg ?? real.artifactFinalAttackDmg,
    wildHunterRank: info.wildHunterRank ?? real.wildHunterRank,
  };
}

/** Diffs an InfoDraft against the character's real answers, emitting only the fields that
 *  changed. An all-unchanged draft returns undefined, so `hasChanges` stays false. */
function infoOverridesFromDraft(draft: InfoDraft, real: InfoDraft): SimulatorInfoOverrides | undefined {
  const out: SimulatorInfoOverrides = {};
  if (draft.soulType !== real.soulType || (draft.soulType !== "none" && draft.soulLevel !== real.soulLevel)) {
    out.soul = draft.soulType === "none"
      ? { type: "none", soulLevel: null }
      : { type: draft.soulType, soulLevel: draft.soulLevel };
  }
  if (draft.isLiberated !== real.isLiberated) out.isLiberated = draft.isLiberated;
  if (draft.weaponHand !== real.weaponHand) out.weaponHand = draft.weaponHand;
  if (draft.hasRuinForceShield !== real.hasRuinForceShield) out.hasRuinForceShield = draft.hasRuinForceShield;
  if (draft.innerAbilityLine !== real.innerAbilityLine) out.innerAbilityLine = draft.innerAbilityLine;
  if (draft.artifactExtraTarget !== real.artifactExtraTarget) out.artifactExtraTarget = draft.artifactExtraTarget;
  if (draft.artifactFinalAttackDmg !== real.artifactFinalAttackDmg) out.artifactFinalAttackDmg = draft.artifactFinalAttackDmg;
  if (draft.wildHunterRank !== real.wildHunterRank) out.wildHunterRank = draft.wildHunterRank;
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Builds the OzRingsDraft a previously-applied simulation's ringOverrides represents, so
 *  reopening the popup can start from what was typed in rather than the character's real
 *  rings. */
function ozRingOverridesToDraft(character: StoredCharacterRecord, overrides: OzRingOverrides | undefined): OzRingsDraft {
  const real = storedOzRingsToOzRingsDraft(character.scouter?.ozRings);
  if (!overrides) return real;
  const levels: Partial<Record<OzRingId, string>> = { ...real.levels };
  for (const [ring, level] of Object.entries(overrides.levels ?? {})) {
    if (level !== undefined) levels[ring as OzRingId] = String(level);
  }
  return { levels };
}

/** Owns every field the Scouter Simulator popup lets a player edit. One hook rather than
 *  ScouterSimulatorDialog declaring 9 separate useState calls itself, so that component stays
 *  focused on class-derived lookups and rendering. Every field is pre-filled from the
 *  character's real current values, matching maplescouter.com's own simulator UI, so maxing
 *  HEXA means bumping a few numbers up rather than re-typing everything from blank. The
 *  exception is when a simulation is already active (previousOverrides), where fields start
 *  from what was last typed in, so reopening the popup doesn't discard it. */
export function useScouterSimulatorDraft(
  character: StoredCharacterRecord,
  hexaClassDef: HexaClassDef | null,
  previousOverrides: ScouterSimulatorOverrides | null,
): ScouterSimulatorDraft {
  const [realUserStat] = useState(() => buildScouterPayload(character, { scouterLegionByWorld: readCharactersStore().scouterLegionByWorld }));

  const [tab, setTab] = useState<SimulatorTab>("buffs");
  const [initialLevel] = useState(character.level);
  const [level, setLevel] = useState(previousOverrides?.level ?? initialLevel);
  // Typing the boss's own requirement here is how a player "closes" that gap; there's no
  // separate on/off shortcut (see computeBossClear's own comment on why that's not needed).
  const [initialArcaneForce] = useState(Number(character.stats.arcanePower) || 0);
  const [arcaneForce, setArcaneForce] = useState(previousOverrides?.arcaneForceOverride ?? initialArcaneForce);
  const [initialAuthenticForce] = useState(Number(character.stats.sacredPower) || 0);
  const [authenticForce, setAuthenticForce] = useState(previousOverrides?.authenticForceOverride ?? initialAuthenticForce);
  const [finalDmgPercent, setFinalDmgPercent] = useState(() => Number(previousOverrides?.finalDmgPercent ?? 0));
  const [initialHexaCores] = useState<Record<SimulatorHexaCoreField, number>>(() => {
    const out = {} as Record<SimulatorHexaCoreField, number>;
    for (const { field } of hexaCoreFields(hexaClassDef)) {
      out[field] = realUserStat ? Number(realUserStat.hexa[field]) : 0;
    }
    return out;
  });
  const [hexaCores, setHexaCores] = useState<Record<SimulatorHexaCoreField, number>>(() => {
    if (!previousOverrides?.hexaCoreOverrides) return initialHexaCores;
    const out = { ...initialHexaCores };
    for (const { field } of hexaCoreFields(hexaClassDef)) {
      const override = previousOverrides.hexaCoreOverrides[field];
      if (override !== undefined) out[field] = Number(override);
    }
    return out;
  });
  const [initialLinkSkills] = useState<Record<LinkSkillId, number>>(() => {
    const out = {} as Record<LinkSkillId, number>;
    for (const id of SIMULATOR_LINK_SKILL_IDS) {
      const scouterKey = LINK_SKILL_TO_SCOUTER_KEY[id];
      out[id] = realUserStat && scouterKey ? Number(realUserStat.linkSkill[scouterKey]) : 0;
    }
    return out;
  });
  const [linkSkills, setLinkSkills] = useState<Record<LinkSkillId, number>>(() => {
    if (!previousOverrides?.linkSkillOverrides) return initialLinkSkills;
    const out = { ...initialLinkSkills };
    for (const id of SIMULATOR_LINK_SKILL_IDS) {
      const override = previousOverrides.linkSkillOverrides[id];
      if (override !== undefined) out[id] = Number(override);
    }
    return out;
  });
  const [initialBuffsDraft] = useState<BuffsDraft>(() => storedBuffsToDraft(character.scouter?.buffs) ?? emptyBuffsDraft());
  const [buffsDraft, setBuffsDraft] = useState(() =>
    previousOverrides?.dopingOverrides ? storedBuffsToDraft(previousOverrides.dopingOverrides) : initialBuffsDraft);
  const [initialOzRingsDraft] = useState<OzRingsDraft>(() => storedOzRingsToOzRingsDraft(character.scouter?.ozRings));
  const [ozRingsDraft, setOzRingsDraft] = useState(() => ozRingOverridesToDraft(character, previousOverrides?.ringOverrides));
  const [input, setInput] = useState<Record<keyof SimulatorInputOverrides, number>>(() => {
    if (!previousOverrides?.input) return EMPTY_INPUT;
    const out = { ...EMPTY_INPUT };
    for (const [key, value] of Object.entries(previousOverrides.input)) {
      out[key as keyof SimulatorInputOverrides] = Number(value);
    }
    return out;
  });
  const [initialInfo] = useState<InfoDraft>(() => realInfoDraft(character));
  const [info, setInfo] = useState<InfoDraft>(() => infoDraftFromOverrides(character, previousOverrides?.infoOverrides));

  const setHexaCore = (field: SimulatorHexaCoreField, value: number) => {
    setHexaCores((prev) => ({ ...prev, [field]: value }));
  };
  const setInputField = (key: keyof SimulatorInputOverrides, value: number) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };
  const setLinkSkill = (id: LinkSkillId, value: number) => {
    setLinkSkills((prev) => ({ ...prev, [id]: value }));
  };
  const setInfoField = <K extends keyof InfoDraft>(key: K, value: InfoDraft[K]) => {
    setInfo((prev) => ({ ...prev, [key]: value }));
  };

  const resetLevelRow = () => {
    setLevel(initialLevel);
    setArcaneForce(initialArcaneForce);
    setAuthenticForce(initialAuthenticForce);
  };
  const resetBuffs = () => setBuffsDraft(initialBuffsDraft);
  const resetHexa = () => setHexaCores(initialHexaCores);
  const resetOzRings = () => setOzRingsDraft(initialOzRingsDraft);
  const resetInput = () => {
    setFinalDmgPercent(0);
    setInput(EMPTY_INPUT);
  };
  const resetLinkSkills = () => setLinkSkills(initialLinkSkills);
  const resetInfo = () => setInfo(initialInfo);

  // Per-tab "has this group been touched at all" flags. finalDmgPercent and input have no
  // real baseline to seed from, so "unchanged" for them is simply their 0/empty default.
  const hexaChanged = JSON.stringify(hexaCores) !== JSON.stringify(initialHexaCores);
  const buffsChanged = JSON.stringify(buffsDraft) !== JSON.stringify(initialBuffsDraft);
  const ozRingsChanged = JSON.stringify(ozRingsDraft) !== JSON.stringify(initialOzRingsDraft);
  const linkSkillsChanged = JSON.stringify(linkSkills) !== JSON.stringify(initialLinkSkills);
  const inputChanged = finalDmgPercent !== 0 || Object.values(input).some((v) => v !== 0);
  const infoOverrides = infoOverridesFromDraft(info, initialInfo);
  // Level, Arcane Force and Sacred Power are local-only and never reach the API, and are
  // deliberately not part of localOnly. That flag signals "something changed, but only
  // client-side computable things", which the dialog uses to skip the network request.
  const localOnly = !hexaChanged && !buffsChanged && !ozRingsChanged && !linkSkillsChanged
    && !inputChanged && infoOverrides === undefined;
  const levelRowChanged = level !== initialLevel || arcaneForce !== initialArcaneForce || authenticForce !== initialAuthenticForce;

  // False once every field is back to, or still at, its real starting value. Lets the
  // dialog skip an Apply that would be a no-op.
  const hasChanges = !localOnly || levelRowChanged;

  const buildOverrides = (): ScouterSimulatorOverrides => {
    const inputOverrides: SimulatorInputOverrides = Object.fromEntries(
      Object.entries(input).map(([key, v]) => [key, String(v)]),
    ) as unknown as SimulatorInputOverrides;
    // Each tab group is emitted only when actually touched. An omitted group is identical
    // to one whose every value matches the character's real stats (both produce the same
    // payload), but omitting it keeps the cache hash clean and lets isLocalOnlyOverride
    // (useScouterSimulator.ts) recognize a Level-only what-if and skip the API call.
    return {
      level,
      arcaneForceOverride: arcaneForce,
      authenticForceOverride: authenticForce,
      finalDmgPercent: inputChanged ? finalDmgPercent.toFixed(5) : undefined,
      hexaCoreOverrides: hexaChanged
        ? Object.fromEntries(
            hexaCoreFields(hexaClassDef).map(({ field }) => [field, String(hexaCores[field])]),
          ) as Partial<Record<SimulatorHexaCoreField, string>>
        : undefined,
      dopingOverrides: buffsChanged ? (convertBuffsDraftToStored(buffsDraft) ?? undefined) : undefined,
      ringOverrides: ozRingsChanged
        ? { levels: convertOzRingsDraftToStored(ozRingsDraft)?.levels }
        : undefined,
      input: inputChanged ? inputOverrides : undefined,
      linkSkillOverrides: linkSkillsChanged
        ? Object.fromEntries(
            SIMULATOR_LINK_SKILL_IDS.map((id) => [id, String(linkSkills[id])]),
          ) as Partial<Record<LinkSkillId, string>>
        : undefined,
      infoOverrides,
    };
  };

  return {
    tab, setTab,
    level, setLevel,
    arcaneForce, setArcaneForce,
    authenticForce, setAuthenticForce,
    finalDmgPercent, setFinalDmgPercent,
    hexaCores, setHexaCore,
    buffsDraft, setBuffsDraft,
    ozRingsDraft, setOzRingsDraft,
    linkSkills, setLinkSkill,
    input, setInputField,
    info, setInfoField,
    hasChanges,
    resetLevelRow, resetBuffs, resetHexa, resetOzRings, resetInput, resetLinkSkills, resetInfo,
    buildOverrides,
  };
}

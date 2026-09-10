"use client";

import { useState } from "react";
import type { HexaClassDef } from "../../tools/hexa-skills/hexa-classes";
import type { LinkSkillId, StoredCharacterRecord } from "../model/charactersStore";
import { readCharactersStore } from "../model/charactersStore";
import {
  emptyBuffsDraft, storedBuffsToDraft, convertBuffsDraftToStored, type BuffsDraft,
} from "../setup/data/buffsData";
import {
  storedOzRingsToOzRingsDraft, convertOzRingsDraftToStored, type OzRingId, type OzRingsDraft,
} from "../setup/data/ozRingData";
import {
  buildScouterPayload, type OzRingOverrides, type ScouterSimulatorOverrides, type SimulatorHexaCoreField, type SimulatorInputOverrides,
} from "./scouterApi";
import { hexaCoreFields } from "./hexaSimulatorFields";
import { LINK_SKILL_TO_SCOUTER_KEY } from "./scouterLinkSkills";

export type SimulatorTab = "buffs" | "hexa" | "ozRings" | "input" | "linkSkills";

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
  /** False once every field is back to its real starting value -- Apply can skip the request
   *  entirely in that case, since there'd be nothing to simulate. */
  hasChanges: boolean;
  /** Per-group resets back to the character's real values -- one per tab, plus the persistent
   *  Level/Arc. Force/Sac. Power row (not part of any tab). Each touches only its own group. */
  resetLevelRow: () => void;
  resetBuffs: () => void;
  resetHexa: () => void;
  resetOzRings: () => void;
  resetInput: () => void;
  resetLinkSkills: () => void;
  /** Assembles every draft field into the payload buildDirectScouterPayload expects. */
  buildOverrides: () => ScouterSimulatorOverrides;
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

/** Owns every field the Scouter Simulator popup lets a player edit -- one hook rather than
 *  ScouterSimulatorDialog declaring 9 separate useState calls itself, so that component can
 *  stay focused on class-derived lookups and rendering. Every field is pre-filled from the
 *  character's real current values (matches maplescouter.com's own simulator UI) so "max HEXA"
 *  is just bumping a few numbers up rather than re-typing everything from blank -- unless a
 *  simulation is already active (previousOverrides), in which case fields start from what was
 *  last typed in instead, so reopening the popup doesn't silently discard it. */
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

  const setHexaCore = (field: SimulatorHexaCoreField, value: number) => {
    setHexaCores((prev) => ({ ...prev, [field]: value }));
  };
  const setInputField = (key: keyof SimulatorInputOverrides, value: number) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };
  const setLinkSkill = (id: LinkSkillId, value: number) => {
    setLinkSkills((prev) => ({ ...prev, [id]: value }));
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

  // True once every field is back to (or still at) its real starting value -- finalDmgPercent
  // and input have no real baseline to seed from, so they're "unchanged" simply at their 0/
  // empty default. Lets the dialog skip sending an Apply request that would be a no-op.
  const hasChanges =
    level !== initialLevel ||
    arcaneForce !== initialArcaneForce ||
    authenticForce !== initialAuthenticForce ||
    finalDmgPercent !== 0 ||
    JSON.stringify(hexaCores) !== JSON.stringify(initialHexaCores) ||
    JSON.stringify(buffsDraft) !== JSON.stringify(initialBuffsDraft) ||
    JSON.stringify(ozRingsDraft) !== JSON.stringify(initialOzRingsDraft) ||
    JSON.stringify(linkSkills) !== JSON.stringify(initialLinkSkills) ||
    Object.values(input).some((v) => v !== 0);

  const buildOverrides = (): ScouterSimulatorOverrides => {
    const inputOverrides: SimulatorInputOverrides = Object.fromEntries(
      Object.entries(input).map(([key, v]) => [key, String(v)]),
    ) as unknown as SimulatorInputOverrides;
    return {
      level,
      arcaneForceOverride: arcaneForce,
      authenticForceOverride: authenticForce,
      finalDmgPercent: finalDmgPercent.toFixed(5),
      hexaCoreOverrides: Object.fromEntries(
        hexaCoreFields(hexaClassDef).map(({ field }) => [field, String(hexaCores[field])]),
      ) as Partial<Record<SimulatorHexaCoreField, string>>,
      dopingOverrides: convertBuffsDraftToStored(buffsDraft) ?? undefined,
      ringOverrides: {
        levels: convertOzRingsDraftToStored(ozRingsDraft)?.levels,
      },
      input: inputOverrides,
      linkSkillOverrides: Object.fromEntries(
        SIMULATOR_LINK_SKILL_IDS.map((id) => [id, String(linkSkills[id])]),
      ) as Partial<Record<LinkSkillId, string>>,
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
    hasChanges,
    resetLevelRow, resetBuffs, resetHexa, resetOzRings, resetInput, resetLinkSkills,
    buildOverrides,
  };
}

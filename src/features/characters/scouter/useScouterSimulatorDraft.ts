"use client";

import { useState } from "react";
import type { HexaClassDef } from "../../tools/hexa-skills/hexa-classes";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { readCharactersStore } from "../model/charactersStore";
import {
  emptyBuffsDraft, storedBuffsToDraft, convertBuffsDraftToStored, type BuffsDraft,
} from "../setup/data/buffsData";
import {
  emptyOzRingsDraft, storedOzRingsToOzRingsDraft, convertOzRingsDraftToStored, type OzRingsDraft,
} from "../setup/data/ozRingData";
import {
  buildScouterPayload, type ScouterSimulatorOverrides, type SimulatorHexaCoreField, type SimulatorInputOverrides,
} from "./scouterApi";
import { hexaCoreFields } from "./hexaSimulatorFields";

export type SimulatorTab = "buffs" | "hexa" | "ozRings" | "input";

const EMPTY_INPUT: Record<keyof SimulatorInputOverrides, number> = {
  mainStat: 0, mainStatPer: 0, mainStatAbs: 0, mainStat9Level: 0,
  subStat: 0, subStatPer: 0, subStatAbs: 0, subStat9Level: 0,
  allStatPer: 0, criRate: 0, buffDuration: 0, coolTimeReduce: 0,
  atk: 0, atkPer: 0, bossDmg: 0, criDmg: 0, ignoreGuard: 0, resetCoolDown: 0, weaponAtk: 0,
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
  /** Assembles every draft field into the payload buildSimulatorPayload expects. */
  buildOverrides: () => ScouterSimulatorOverrides;
}

/** Owns every field the Scouter Simulator popup lets a player edit -- one hook rather than
 *  ScouterSimulatorDialog declaring 9 separate useState calls itself, so that component can
 *  stay focused on class-derived lookups and rendering. Every field is pre-filled from the
 *  character's real current values (matches maplescouter.com's own simulator UI, confirmed
 *  live this session) so "max HEXA" is just bumping a few numbers up rather than re-typing
 *  everything from blank. */
export function useScouterSimulatorDraft(character: StoredCharacterRecord, hexaClassDef: HexaClassDef | null): ScouterSimulatorDraft {
  const [realUserStat] = useState(() => buildScouterPayload(character, { scouterLegionByWorld: readCharactersStore().scouterLegionByWorld }));

  const [tab, setTab] = useState<SimulatorTab>("buffs");
  const [level, setLevel] = useState(character.level);
  // Typing the boss's own requirement here is how a player "closes" that gap; there's no
  // separate on/off shortcut (see computeBossClear's own comment on why that's not needed).
  const [arcaneForce, setArcaneForce] = useState(Number(character.stats.arcanePower) || 0);
  const [authenticForce, setAuthenticForce] = useState(Number(character.stats.sacredPower) || 0);
  const [finalDmgPercent, setFinalDmgPercent] = useState(0);
  const [hexaCores, setHexaCores] = useState<Record<SimulatorHexaCoreField, number>>(() => {
    const out = {} as Record<SimulatorHexaCoreField, number>;
    for (const { field } of hexaCoreFields(hexaClassDef)) {
      out[field] = realUserStat ? Number(realUserStat.hexa[field]) : 0;
    }
    return out;
  });
  const [buffsDraft, setBuffsDraft] = useState<BuffsDraft>(() => storedBuffsToDraft(character.scouter?.buffs) ?? emptyBuffsDraft());
  const [ozRingsDraft, setOzRingsDraft] = useState<OzRingsDraft>(() => storedOzRingsToOzRingsDraft(character.scouter?.ozRings) ?? emptyOzRingsDraft());
  const [input, setInput] = useState<Record<keyof SimulatorInputOverrides, number>>(EMPTY_INPUT);

  const setHexaCore = (field: SimulatorHexaCoreField, value: number) => {
    setHexaCores((prev) => ({ ...prev, [field]: value }));
  };
  const setInputField = (key: keyof SimulatorInputOverrides, value: number) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };

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
        useContinuousAsMainRing: ozRingsDraft.ringMode === "continuous",
      },
      input: inputOverrides,
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
    input, setInputField,
    buildOverrides,
  };
}

"use client";

import { useState, useCallback } from "react";
import { useMounted } from "../../../lib/useMounted";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import { useApplyCharacterQueryParam } from "../useApplyCharacterQueryParam";
import { readCharacterToolData, writeCharacterToolData } from "../characterToolStorage";
import { utcDateStr } from "../date";
import {
  type AstraBoss,
  type AstraMission,
  ASTRA_BOSSES,
  ASTRA_MISSIONS,
  ASTRA_DAILY_QUESTS,
  MAX_TRACES_CAPACITY,
} from "./astra-data";

// -- Types --------------------------------------------------------------------

export interface AstraBossSelection {
  difficultyIdx: number | null;
  partySize: number;
  clearedThisWeek: boolean;
  vouchersKept: number;
}

interface AstraSavedState {
  missionIdx: number;
  currentTraces: number;
  currentFragments: number;
  startDate: string;
  dailyQuestId: string;
  daysPerWeek: number;
  futureQuestDate: string;
  futureQuestId: string;
  bosses: Record<string, AstraBossSelection>;
}

// -- Helpers ------------------------------------------------------------------


export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function getAstraSelection(
  selections: Record<string, AstraBossSelection>,
  bossName: string,
): AstraBossSelection {
  return selections[bossName] ?? { difficultyIdx: null, partySize: 1, clearedThisWeek: false, vouchersKept: 0 };
}

// -- Calculation --------------------------------------------------------------

interface AstraBossBreakdown {
  bossName: string;
  tracesPerWeek: number;
  voucherFragmentsPerWeek: number;
}

interface AstraMissionResult {
  mission: AstraMission;
  completionDate: string;
  weeksFromStart: number;
}

export interface AstraCalcResult {
  weeklyTraces: number;
  weeklyVoucherFragments: number;
  dailyFragments: number;
  weeklyDailyFragments: number;
  totalWeeklyFragments: number;
  totalTracesNeeded: number;
  totalFragmentsNeeded: number;
  completionDate: string;
  weeksToComplete: number;
  breakdown: AstraBossBreakdown[];
  missionResults: AstraMissionResult[];
}

function accumulateBossIncome(
  bosses: AstraBoss[],
  selections: Record<string, AstraBossSelection>,
) {
  let weeklyTraces = 0;
  let weeklyVoucherFragments = 0;
  // Income from bosses not yet cleared this week — still earnable right now,
  // before the next reset.
  let immediateTraces = 0;
  let immediateVoucherFragments = 0;
  const breakdown: AstraBossBreakdown[] = [];

  for (const boss of bosses) {
    const sel = getAstraSelection(selections, boss.name);
    if (sel.difficultyIdx === null) {
      breakdown.push({ bossName: boss.name, tracesPerWeek: 0, voucherFragmentsPerWeek: 0 });
      continue;
    }
    const diff = boss.difficulties[sel.difficultyIdx];
    if (!diff) {
      breakdown.push({ bossName: boss.name, tracesPerWeek: 0, voucherFragmentsPerWeek: 0 });
      continue;
    }
    const tracesPerClear = Math.floor(diff.traces / sel.partySize);
    weeklyTraces += tracesPerClear;

    const voucherFrags = diff.hasVoucher ? sel.vouchersKept * (diff.voucherValue ?? 0) : 0;
    weeklyVoucherFragments += voucherFrags;

    if (!sel.clearedThisWeek) {
      immediateTraces += tracesPerClear;
      immediateVoucherFragments += voucherFrags;
    }
    breakdown.push({ bossName: boss.name, tracesPerWeek: tracesPerClear, voucherFragmentsPerWeek: voucherFrags });
  }

  return { weeklyTraces, weeklyVoucherFragments, immediateTraces, immediateVoucherFragments, breakdown };
}

function resolveDailyFragRate(
  dailyQuestId: string,
  futureQuestId: string,
): { baseDailyFrags: number; futureDailyFrags: number } {
  const dailyQuest = ASTRA_DAILY_QUESTS.find((q) => q.id === dailyQuestId);
  const baseDailyFrags = dailyQuest?.fragments ?? 0;
  const futureQuest = futureQuestId ? ASTRA_DAILY_QUESTS.find((q) => q.id === futureQuestId) : null;
  return { baseDailyFrags, futureDailyFrags: futureQuest?.fragments ?? baseDailyFrags };
}

interface SimParams {
  startDate: string;
  startTraces: number;
  startFragments: number;
  missionIdx: number;
  weeklyTraces: number;
  weeklyVoucherFragments: number;
  immediateTraces: number;
  immediateVoucherFragments: number;
  dailyQuestId: string;
  daysPerWeek: number;
  futureQuestDate: string;
  futureQuestId: string;
}

type SimResult = { completionDate: string; weeksToComplete: number; missionResults: AstraMissionResult[] };

const NEVER: SimResult = { completionDate: "Never", weeksToComplete: Infinity, missionResults: [] };

function checkEarlyCompletion(
  remaining: AstraMission[],
  startTraces: number,
  startFragments: number,
  startDate: string,
  weeklyTraces: number,
): SimResult | null {
  let totalTracesNeeded = 0;
  let totalFragsNeeded = 0;
  for (const m of remaining) {
    totalTracesNeeded += m.tracesRequired;
    totalFragsNeeded += m.fragmentsRequired;
  }

  if (totalTracesNeeded <= startTraces && totalFragsNeeded <= startFragments) {
    return {
      completionDate: startDate,
      weeksToComplete: 0,
      missionResults: remaining.map((m) => ({ mission: m, completionDate: startDate, weeksFromStart: 0 })),
    };
  }

  if (weeklyTraces <= 0 && totalTracesNeeded > startTraces) return NEVER;

  return null;
}

function simulateAstra(p: SimParams): SimResult {
  const remaining = ASTRA_MISSIONS.slice(p.missionIdx);

  // Boss income from bosses not yet cleared this week is earnable immediately,
  // so fold it into the starting balances before any reset.
  const startTraces = Math.min(p.startTraces + p.immediateTraces, MAX_TRACES_CAPACITY);
  const startFragments = p.startFragments + p.immediateVoucherFragments;

  const earlyResult = checkEarlyCompletion(remaining, startTraces, startFragments, p.startDate, p.weeklyTraces);
  if (earlyResult) return earlyResult;

  const { baseDailyFrags, futureDailyFrags } = resolveDailyFragRate(p.dailyQuestId, p.futureQuestId);
  const upgradeDate = p.futureQuestDate ? new Date(p.futureQuestDate + "T00:00:00Z") : null;

  const start = new Date(p.startDate + "T00:00:00Z");
  const daysToThu = (4 - start.getUTCDay() + 7) % 7 || 7;
  const thuDate = new Date(start);
  thuDate.setUTCDate(thuDate.getUTCDate() + daysToThu);

  const maxDate = new Date(start);
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 10);

  let traces = startTraces;
  let fragments = startFragments;
  let mIdx = 0;
  let weekCount = 0;
  let prevDate = new Date(start);
  const missionResults: AstraMissionResult[] = [];

  while (mIdx < remaining.length) {
    if (thuDate.getTime() > maxDate.getTime()) return { ...NEVER, missionResults };

    traces = Math.min(traces + p.weeklyTraces, MAX_TRACES_CAPACITY);

    const daysSince = Math.round((thuDate.getTime() - prevDate.getTime()) / 86400000);
    const dailyRate = (upgradeDate && thuDate >= upgradeDate) ? futureDailyFrags : baseDailyFrags;
    fragments += p.weeklyVoucherFragments + Math.round(dailyRate * p.daysPerWeek * daysSince / 7);

    weekCount++;
    prevDate = new Date(thuDate);

    while (mIdx < remaining.length && traces >= remaining[mIdx].tracesRequired && fragments >= remaining[mIdx].fragmentsRequired) {
      traces -= remaining[mIdx].tracesRequired;
      fragments -= remaining[mIdx].fragmentsRequired;
      missionResults.push({ mission: remaining[mIdx], completionDate: utcDateStr(thuDate), weeksFromStart: weekCount });
      mIdx++;
    }

    thuDate.setUTCDate(thuDate.getUTCDate() + 7);
  }

  const final = missionResults[missionResults.length - 1];
  return {
    completionDate: final?.completionDate ?? "Never",
    weeksToComplete: final?.weeksFromStart ?? Infinity,
    missionResults,
  };
}

function calculateAstra(
  missionIdx: number,
  currentTraces: number,
  currentFragments: number,
  startDate: string,
  selections: Record<string, AstraBossSelection>,
  dailyQuestId: string,
  daysPerWeek: number,
  futureQuestDate: string,
  futureQuestId: string,
): AstraCalcResult {
  const { weeklyTraces, weeklyVoucherFragments, immediateTraces, immediateVoucherFragments, breakdown } =
    accumulateBossIncome(ASTRA_BOSSES, selections);

  const dailyQuest = ASTRA_DAILY_QUESTS.find((q) => q.id === dailyQuestId);
  const dailyFragments = dailyQuest?.fragments ?? 0;
  const weeklyDailyFragments = dailyFragments * daysPerWeek;
  const totalWeeklyFragments = weeklyVoucherFragments + weeklyDailyFragments;

  const remaining = ASTRA_MISSIONS.slice(missionIdx);
  let totalTracesNeeded = 0;
  let totalFragmentsNeeded = 0;
  for (const m of remaining) {
    totalTracesNeeded += m.tracesRequired;
    totalFragmentsNeeded += m.fragmentsRequired;
  }
  totalTracesNeeded = Math.max(0, totalTracesNeeded - currentTraces);
  totalFragmentsNeeded = Math.max(0, totalFragmentsNeeded - currentFragments);

  const { completionDate, weeksToComplete, missionResults } = simulateAstra({
    startDate, startTraces: currentTraces, startFragments: currentFragments, missionIdx,
    weeklyTraces, weeklyVoucherFragments, immediateTraces, immediateVoucherFragments,
    dailyQuestId, daysPerWeek, futureQuestDate, futureQuestId,
  });

  return {
    weeklyTraces, weeklyVoucherFragments, dailyFragments, weeklyDailyFragments, totalWeeklyFragments,
    totalTracesNeeded, totalFragmentsNeeded, completionDate, weeksToComplete,
    breakdown, missionResults,
  };
}

// -- Form State ---------------------------------------------------------------

interface AstraFormState {
  missionIdx: number;
  currentTraces: number;
  currentFragments: number;
  startDate: string;
  dailyQuestId: string;
  daysPerWeek: number;
  futureQuestDate: string;
  futureQuestId: string;
  selections: Record<string, AstraBossSelection>;
}

function defaultAstraForm(): AstraFormState {
  return {
    missionIdx: 0,
    currentTraces: 0,
    currentFragments: 0,
    startDate: utcDateStr(),
    dailyQuestId: "tallahart",
    daysPerWeek: 7,
    futureQuestDate: "",
    futureQuestId: "",
    selections: {},
  };
}

function savedToForm(saved: AstraSavedState): AstraFormState {
  return {
    missionIdx: saved.missionIdx,
    currentTraces: saved.currentTraces,
    currentFragments: saved.currentFragments,
    startDate: saved.startDate,
    dailyQuestId: saved.dailyQuestId,
    daysPerWeek: saved.daysPerWeek,
    futureQuestDate: saved.futureQuestDate,
    futureQuestId: saved.futureQuestId,
    selections: saved.bosses,
  };
}

function formToSaved(form: AstraFormState): AstraSavedState {
  return {
    missionIdx: form.missionIdx,
    currentTraces: form.currentTraces,
    currentFragments: form.currentFragments,
    startDate: form.startDate,
    dailyQuestId: form.dailyQuestId,
    daysPerWeek: form.daysPerWeek,
    futureQuestDate: form.futureQuestDate,
    futureQuestId: form.futureQuestId,
    bosses: form.selections,
  };
}

// -- Hook ---------------------------------------------------------------------

export function useAstraState() {
  const mounted = useMounted();

  const characters: StoredCharacterRecord[] = mounted
    ? selectCharactersList(readCharactersStore())
    : [];
  const [selectedCharName, setSelectedCharName] = useState<string | null>(null);
  const [form, setForm] = useState<AstraFormState>(defaultAstraForm);

  const {
    missionIdx, currentTraces, currentFragments, startDate,
    dailyQuestId, daysPerWeek, futureQuestDate, futureQuestId, selections,
  } = form;

  const updateForm = useCallback(
    (updater: (prev: AstraFormState) => AstraFormState) => {
      setForm((prev) => {
        const next = updater(prev);
        if (selectedCharName) {
          writeCharacterToolData(selectedCharName, "astra", formToSaved(next));
        }
        return next;
      });
    },
    [selectedCharName],
  );

  const setMissionIdx = useCallback((v: number) => updateForm((f) => ({ ...f, missionIdx: v })), [updateForm]);
  const setCurrentTraces = useCallback((v: number) => updateForm((f) => ({ ...f, currentTraces: Math.min(v, MAX_TRACES_CAPACITY) })), [updateForm]);
  const setCurrentFragments = useCallback((v: number) => updateForm((f) => ({ ...f, currentFragments: v })), [updateForm]);
  const setStartDate = useCallback((v: string) => updateForm((f) => ({ ...f, startDate: v })), [updateForm]);
  const setDailyQuestId = useCallback((v: string) => updateForm((f) => ({ ...f, dailyQuestId: v })), [updateForm]);
  const setDaysPerWeek = useCallback((v: number) => updateForm((f) => ({ ...f, daysPerWeek: v })), [updateForm]);
  const setFutureQuestDate = useCallback((v: string) => updateForm((f) => ({ ...f, futureQuestDate: v })), [updateForm]);
  const setFutureQuestId = useCallback((v: string) => updateForm((f) => ({ ...f, futureQuestId: v })), [updateForm]);

  const handleCharChange = useCallback(
    (charName: string | null) => {
      if (selectedCharName) {
        writeCharacterToolData(selectedCharName, "astra", formToSaved(form));
      }
      if (charName) {
        const saved = readCharacterToolData<AstraSavedState>(charName, "astra");
        setForm(saved ? savedToForm(saved) : defaultAstraForm());
      } else {
        setForm(defaultAstraForm());
      }
      setSelectedCharName(charName);
    },
    [selectedCharName, form],
  );

  useApplyCharacterQueryParam({ mounted, characters, handleCharChange });

  const setDifficulty = useCallback(
    (bossName: string, diffIdx: number | null) => {
      updateForm((f) => ({
        ...f,
        selections: {
          ...f.selections,
          [bossName]: { ...getAstraSelection(f.selections, bossName), difficultyIdx: diffIdx, vouchersKept: 0 },
        },
      }));
    },
    [updateForm],
  );

  const setPartySize = useCallback(
    (bossName: string, size: number) => {
      updateForm((f) => ({
        ...f,
        selections: {
          ...f.selections,
          [bossName]: { ...getAstraSelection(f.selections, bossName), partySize: size },
        },
      }));
    },
    [updateForm],
  );

  const setCleared = useCallback(
    (bossName: string, cleared: boolean) => {
      updateForm((f) => ({
        ...f,
        selections: {
          ...f.selections,
          [bossName]: { ...getAstraSelection(f.selections, bossName), clearedThisWeek: cleared },
        },
      }));
    },
    [updateForm],
  );

  const setVouchersKept = useCallback(
    (bossName: string, count: number) => {
      updateForm((f) => ({
        ...f,
        selections: {
          ...f.selections,
          [bossName]: { ...getAstraSelection(f.selections, bossName), vouchersKept: count },
        },
      }));
    },
    [updateForm],
  );

  const resetBosses = useCallback(() => {
    updateForm((f) => {
      const next: Record<string, AstraBossSelection> = { ...f.selections };
      for (const boss of ASTRA_BOSSES) {
        next[boss.name] = { difficultyIdx: null, partySize: 1, clearedThisWeek: false, vouchersKept: 0 };
      }
      return { ...f, selections: next };
    });
  }, [updateForm]);

  const result = calculateAstra(
    missionIdx, currentTraces, currentFragments, startDate,
    selections, dailyQuestId, daysPerWeek, futureQuestDate, futureQuestId,
  );

  let tracesCompleted = 0;
  let fragmentsCompleted = 0;
  for (let i = 0; i < missionIdx; i++) {
    tracesCompleted += ASTRA_MISSIONS[i].tracesRequired;
    fragmentsCompleted += ASTRA_MISSIONS[i].fragmentsRequired;
  }
  tracesCompleted += currentTraces;
  fragmentsCompleted += currentFragments;

  return {
    mounted,
    characters,
    selectedCharName,
    handleCharChange,
    missionIdx,
    currentTraces,
    currentFragments,
    startDate,
    dailyQuestId,
    daysPerWeek,
    futureQuestDate,
    futureQuestId,
    selections,
    setMissionIdx,
    setCurrentTraces,
    setCurrentFragments,
    setStartDate,
    setDailyQuestId,
    setDaysPerWeek,
    setFutureQuestDate,
    setFutureQuestId,
    setDifficulty,
    setPartySize,
    setCleared,
    setVouchersKept,
    resetBosses,
    result,
    tracesCompleted,
    fragmentsCompleted,
  };
}

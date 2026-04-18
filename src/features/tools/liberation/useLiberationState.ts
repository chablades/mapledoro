"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import {
  type LiberationType,
  type LiberationBoss,
  type LiberationQuest,
  GENESIS_BOSSES,
  GENESIS_QUESTS,
  GENESIS_TOTAL,
  DESTINY_BOSSES,
  DESTINY_QUESTS,
  DESTINY_TOTAL,
  getTracesPerClear,
} from "./liberation-data";

// -- Types --------------------------------------------------------------------

export interface BossSelection {
  difficultyIdx: number | null;
  partySize: number;
  clearedThisWeek: boolean;
}

interface SavedState {
  type: LiberationType;
  currentQuestIdx: number;
  currentTraces: number;
  genesisPass: boolean;
  startDate: string;
  bosses: Record<string, BossSelection>;
}

// -- Storage ------------------------------------------------------------------

const STORAGE_KEY = "liberation-v1";

function storageKeyFor(charName: string | null): string {
  return charName ? `${STORAGE_KEY}-${charName}` : STORAGE_KEY;
}

function loadStateFrom(key: string): SavedState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStateTo(key: string, state: SavedState) {
  localStorage.setItem(key, JSON.stringify(state));
}

// -- Helpers ------------------------------------------------------------------

function todayStr(): string {
  return formatIsoDate(new Date());
}

export function makeBossKey(type: LiberationType, bossName: string): string {
  return `${type}:${bossName}`;
}

function defaultSelections(): Record<string, BossSelection> {
  return {};
}

export function getSelection(
  selections: Record<string, BossSelection>,
  type: LiberationType,
  bossName: string,
): BossSelection {
  return (
    selections[makeBossKey(type, bossName)] ?? {
      difficultyIdx: null,
      partySize: 1,
      clearedThisWeek: false,
    }
  );
}

function formatIsoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// -- Calculation --------------------------------------------------------------

export interface CalcResult {
  weeklyTraces: number;
  monthlyTraces: number;
  effectiveWeekly: number;
  totalRemaining: number;
  weeksToComplete: number;
  completionDate: string;
  breakdown: { bossName: string; traces: number; reset: string }[];
}

function accumulateTraces(
  bosses: LiberationBoss[],
  selections: Record<string, BossSelection>,
  type: LiberationType,
  genesisPass: boolean,
) {
  let weeklyTraces = 0;
  let monthlyTraces = 0;
  let clearedWeeklyTraces = 0;
  const breakdown: CalcResult["breakdown"] = [];

  for (const boss of bosses) {
    const sel = getSelection(selections, type, boss.name);
    if (sel.difficultyIdx === null) continue;
    const diff = boss.difficulties[sel.difficultyIdx];
    if (!diff) continue;
    const traces = getTracesPerClear(diff.traces, sel.partySize, genesisPass, type);
    breakdown.push({ bossName: boss.name, traces, reset: boss.reset });
    if (boss.reset === "monthly") {
      monthlyTraces += traces;
    } else {
      weeklyTraces += traces;
      if (sel.clearedThisWeek) clearedWeeklyTraces += traces;
    }
  }

  return { weeklyTraces, monthlyTraces, clearedWeeklyTraces, breakdown };
}

// Weekly boss reset is Thursday 00:00 UTC; the last day of each reset cycle
// in UTC is Wednesday. Liberation completes on the day the final traces arrive:
// a Wednesday (weekly clears) or the 1st of a month (Black Mage monthly clear).
function simulateCompletion(
  startDate: string,
  weeklyTraces: number,
  monthlyTraces: number,
  clearedWeeklyTraces: number,
  totalRemaining: number,
): { completionDate: string; weeksToComplete: number } {
  if (totalRemaining <= 0) {
    return { completionDate: startDate, weeksToComplete: 0 };
  }
  if (weeklyTraces <= 0 && monthlyTraces <= 0) {
    return { completionDate: "Never", weeksToComplete: Infinity };
  }

  const start = new Date(startDate + "T00:00:00Z");

  const nextWed = new Date(start);
  const daysToWed = (3 - start.getUTCDay() + 7) % 7;
  nextWed.setUTCDate(nextWed.getUTCDate() + daysToWed);

  const next1st = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  if (next1st.getTime() < start.getTime()) {
    next1st.setUTCMonth(next1st.getUTCMonth() + 1);
  }

  const firstWeekWeekly = Math.max(0, weeklyTraces - clearedWeeklyTraces);
  const maxDate = new Date(start);
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 10);

  let remaining = totalRemaining;
  let wedCount = 0;
  let lastEventDate = new Date(start);

  while (remaining > 0) {
    const wedFirst = nextWed.getTime() <= next1st.getTime();
    const eventDate = new Date(wedFirst ? nextWed : next1st);
    if (eventDate.getTime() > maxDate.getTime()) {
      return { completionDate: "Never", weeksToComplete: Infinity };
    }
    if (wedFirst) {
      const gained = wedCount === 0 ? firstWeekWeekly : weeklyTraces;
      remaining -= gained;
      nextWed.setUTCDate(nextWed.getUTCDate() + 7);
      wedCount++;
    } else {
      remaining -= monthlyTraces;
      next1st.setUTCMonth(next1st.getUTCMonth() + 1);
    }
    lastEventDate = eventDate;
  }

  const diffDays = Math.round((lastEventDate.getTime() - start.getTime()) / 86400000);
  const weeksToComplete = Math.max(0, Math.ceil(diffDays / 7));
  return { completionDate: formatIsoDate(lastEventDate), weeksToComplete };
}

function calculate(
  type: LiberationType,
  bosses: LiberationBoss[],
  quests: LiberationQuest[],
  selections: Record<string, BossSelection>,
  questIdx: number,
  currentTraces: number,
  genesisPass: boolean,
  startDate: string,
): CalcResult {
  const { weeklyTraces, monthlyTraces, clearedWeeklyTraces, breakdown } =
    accumulateTraces(bosses, selections, type, genesisPass);

  let totalRemaining = 0;
  for (let i = questIdx; i < quests.length; i++) {
    totalRemaining += quests[i].required;
  }
  totalRemaining = Math.max(0, totalRemaining - currentTraces);

  const effectiveWeekly = weeklyTraces + monthlyTraces / 4.33;
  const { completionDate, weeksToComplete } = simulateCompletion(
    startDate,
    weeklyTraces,
    monthlyTraces,
    clearedWeeklyTraces,
    totalRemaining,
  );

  return {
    weeklyTraces,
    monthlyTraces,
    effectiveWeekly,
    totalRemaining,
    weeksToComplete,
    completionDate,
    breakdown,
  };
}

// -- Form State ---------------------------------------------------------------

interface FormState {
  type: LiberationType;
  questIdx: number;
  currentTraces: number;
  genesisPass: boolean;
  startDate: string;
  selections: Record<string, BossSelection>;
}

function defaultFormState(): FormState {
  return {
    type: "genesis",
    questIdx: 0,
    currentTraces: 0,
    genesisPass: false,
    startDate: todayStr(),
    selections: defaultSelections(),
  };
}

function savedToForm(saved: SavedState): FormState {
  return {
    type: saved.type,
    questIdx: saved.currentQuestIdx,
    currentTraces: saved.currentTraces,
    genesisPass: saved.genesisPass,
    startDate: saved.startDate,
    selections: saved.bosses,
  };
}

function formToSaved(form: FormState): SavedState {
  return {
    type: form.type,
    currentQuestIdx: form.questIdx,
    currentTraces: form.currentTraces,
    genesisPass: form.genesisPass,
    startDate: form.startDate,
    bosses: form.selections,
  };
}

function initFormState(): FormState {
  const saved = loadStateFrom(STORAGE_KEY);
  if (saved) return savedToForm(saved);
  return defaultFormState();
}

// -- Hook ---------------------------------------------------------------------

export function useLiberationState() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  // Character sync
  const characters: StoredCharacterRecord[] = mounted
    ? selectCharactersList(readCharactersStore())
    : [];
  const [selectedCharName, setSelectedCharName] = useState<string | null>(null);
  const currentStorageKey = storageKeyFor(selectedCharName);

  const [form, setForm] = useState<FormState>(initFormState);

  const { type, questIdx, currentTraces, genesisPass, startDate, selections } = form;

  const setQuestIdx = useCallback((v: number) => setForm((f) => ({ ...f, questIdx: v })), []);
  const setCurrentTraces = useCallback((v: number) => setForm((f) => ({ ...f, currentTraces: v })), []);
  const setGenesisPass = useCallback((updater: (prev: boolean) => boolean) => setForm((f) => ({ ...f, genesisPass: updater(f.genesisPass) })), []);
  const setStartDate = useCallback((v: string) => setForm((f) => ({ ...f, startDate: v })), []);
  const setSelections = useCallback((updater: (prev: Record<string, BossSelection>) => Record<string, BossSelection>) => setForm((f) => ({ ...f, selections: updater(f.selections) })), []);

  // Persist to current character's storage key
  useEffect(() => {
    saveStateTo(currentStorageKey, formToSaved(form));
  }, [currentStorageKey, form]);

  const handleCharChange = (charName: string | null) => {
    saveStateTo(currentStorageKey, formToSaved(form));
    const newKey = storageKeyFor(charName);
    const saved = loadStateFrom(newKey);
    setForm(saved ? savedToForm(saved) : defaultFormState());
    setSelectedCharName(charName);
  };

  const bosses = type === "genesis" ? GENESIS_BOSSES : DESTINY_BOSSES;
  const quests = type === "genesis" ? GENESIS_QUESTS : DESTINY_QUESTS;
  const totalNeeded = type === "genesis" ? GENESIS_TOTAL : DESTINY_TOTAL;

  const setDifficulty = useCallback(
    (bossName: string, diffIdx: number | null) => {
      setSelections((prev) => ({
        ...prev,
        [makeBossKey(type, bossName)]: {
          ...getSelection(prev, type, bossName),
          difficultyIdx: diffIdx,
        },
      }));
    },
    [type, setSelections],
  );

  const setPartySize = useCallback(
    (bossName: string, size: number) => {
      setSelections((prev) => ({
        ...prev,
        [makeBossKey(type, bossName)]: {
          ...getSelection(prev, type, bossName),
          partySize: size,
        },
      }));
    },
    [type, setSelections],
  );

  const setCleared = useCallback(
    (bossName: string, cleared: boolean) => {
      setSelections((prev) => ({
        ...prev,
        [makeBossKey(type, bossName)]: {
          ...getSelection(prev, type, bossName),
          clearedThisWeek: cleared,
        },
      }));
    },
    [type, setSelections],
  );

  const resetBosses = useCallback(() => {
    setSelections((prev) => {
      const next = { ...prev };
      for (const boss of type === "genesis" ? GENESIS_BOSSES : DESTINY_BOSSES) {
        next[makeBossKey(type, boss.name)] = {
          difficultyIdx: null,
          partySize: 1,
          clearedThisWeek: false,
        };
      }
      return next;
    });
  }, [type, setSelections]);

  const switchType = useCallback(
    (t: LiberationType) => {
      setForm((f) => ({
        ...f,
        type: t,
        questIdx: Math.min(f.questIdx, (t === "genesis" ? GENESIS_QUESTS : DESTINY_QUESTS).length - 1),
        currentTraces: 0,
      }));
    },
    [],
  );

  // Calculate
  const result = calculate(
    type,
    bosses,
    quests,
    selections,
    questIdx,
    currentTraces,
    genesisPass,
    startDate,
  );

  let tracesCompleted = 0;
  for (let i = 0; i < questIdx; i++) tracesCompleted += quests[i].required;
  tracesCompleted += currentTraces;
  const progressPct = Math.min(100, (tracesCompleted / totalNeeded) * 100);

  return {
    characters,
    selectedCharName,
    handleCharChange,
    type,
    questIdx,
    currentTraces,
    genesisPass,
    startDate,
    selections,
    setQuestIdx,
    setCurrentTraces,
    setGenesisPass,
    setStartDate,
    setDifficulty,
    setPartySize,
    setCleared,
    resetBosses,
    switchType,
    bosses,
    quests,
    totalNeeded,
    result,
    tracesCompleted,
    progressPct,
  };
}

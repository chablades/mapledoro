"use client";

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import {
  ARCANE_SYMBOL_QUESTS,
  SACRED_SYMBOL_QUESTS,
  DAILY_BOSSES,
  DAILY_ACTIVITIES,
  DAILY_CONTENT,
} from "./dailies-data";

// -- Types --------------------------------------------------------------------

export interface SelectedTasks {
  arcane: string[];
  sacred: string[];
  bosses: string[];
  activities: string[];
  content: string[];
}

export interface CharDailyState {
  lastResetDay: string;
  arcane: Record<string, boolean>;
  sacred: Record<string, boolean>;
  bosses: Record<string, boolean>;
  activities: Record<string, boolean>;
  counters: Record<string, number>;
  selected: SelectedTasks;
  collapsed?: boolean;
}

interface SavedState {
  version: 1;
  characters: Record<string, CharDailyState>;
}

// -- Storage ------------------------------------------------------------------

function utcDateStr(d: Date = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptySelected(): SelectedTasks {
  return { arcane: [], sacred: [], bosses: [], activities: [], content: [] };
}

function defaultCharState(): CharDailyState {
  return {
    lastResetDay: utcDateStr(),
    arcane: {},
    sacred: {},
    bosses: {},
    activities: {},
    counters: {},
    selected: emptySelected(),
  };
}

function normalizeCharState(cs: CharDailyState): CharDailyState {
  const sel = cs.selected as Partial<SelectedTasks> | undefined;
  const needsSelected = !sel || !Array.isArray(sel.arcane) || !Array.isArray(sel.activities);
  const needsActivities = !cs.activities;
  if (!needsSelected && !needsActivities) return cs;
  return {
    ...cs,
    activities: cs.activities ?? {},
    selected: {
      arcane: sel?.arcane ?? [],
      sacred: sel?.sacred ?? [],
      bosses: sel?.bosses ?? [],
      activities: sel?.activities ?? [],
      content: sel?.content ?? [],
    },
  };
}

function resetTasks(state: CharDailyState): CharDailyState {
  return {
    ...state,
    lastResetDay: utcDateStr(),
    arcane: {},
    sacred: {},
    bosses: {},
    activities: {},
    counters: {},
  };
}

function applyDailyReset(state: SavedState): SavedState {
  const today = utcDateStr();
  let changed = false;
  const characters: Record<string, CharDailyState> = {};
  for (const [key, cs] of Object.entries(state.characters)) {
    const normalized = normalizeCharState(cs);
    if (normalized.lastResetDay !== today) {
      characters[key] = resetTasks(normalized);
      changed = true;
    } else {
      if (normalized !== cs) changed = true;
      characters[key] = normalized;
    }
  }
  return changed ? { ...state, characters } : state;
}

function loadState(): SavedState {
  if (typeof window === "undefined") return { version: 1, characters: {} };
  const parsed = readGlobalTool<SavedState>("dailies");
  if (!parsed || !parsed.characters) return { version: 1, characters: {} };
  return applyDailyReset(parsed);
}

function saveState(state: SavedState) {
  writeGlobalTool("dailies", state);
}

// -- Progress helpers ---------------------------------------------------------

function countBooleanSection(
  tasks: { id: string }[],
  selected: string[],
  values: Record<string, boolean>,
): { done: number; total: number } {
  const sel = new Set(selected);
  let done = 0;
  let total = 0;
  for (const t of tasks) {
    if (!sel.has(t.id)) continue;
    total++;
    if (values[t.id]) done++;
  }
  return { done, total };
}

function countCounterSection(
  tasks: { id: string; max: number }[],
  selected: string[],
  counters: Record<string, number>,
): { done: number; total: number } {
  const sel = new Set(selected);
  let done = 0;
  let total = 0;
  for (const t of tasks) {
    if (!sel.has(t.id)) continue;
    total += 1;
    if ((counters[t.id] ?? 0) > 0) done += 1;
  }
  return { done, total };
}

export function computeProgress(cs: CharDailyState): { done: number; total: number } {
  const parts = [
    countBooleanSection(ARCANE_SYMBOL_QUESTS, cs.selected.arcane, cs.arcane),
    countBooleanSection(SACRED_SYMBOL_QUESTS, cs.selected.sacred, cs.sacred),
    countBooleanSection(DAILY_BOSSES, cs.selected.bosses, cs.bosses),
    countBooleanSection(DAILY_ACTIVITIES, cs.selected.activities, cs.activities),
    countCounterSection(DAILY_CONTENT, cs.selected.content, cs.counters),
  ];
  return parts.reduce(
    (acc, p) => ({ done: acc.done + p.done, total: acc.total + p.total }),
    { done: 0, total: 0 },
  );
}

function fillTruthy(ids: string[]): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const id of ids) out[id] = true;
  return out;
}

function sumOthersCounter(
  counterId: string,
  charName: string,
  worldID: number,
  characters: StoredCharacterRecord[],
  saved: Record<string, CharDailyState>,
): number {
  let total = 0;
  for (const other of characters) {
    if (other.worldID !== worldID || other.characterName === charName) continue;
    total += saved[other.characterName]?.counters?.[counterId] ?? 0;
  }
  return total;
}

function applyCheckAll(
  cs: CharDailyState,
  char: StoredCharacterRecord | undefined,
  charName: string,
  characters: StoredCharacterRecord[],
  saved: Record<string, CharDailyState>,
): CharDailyState {
  const counters: Record<string, number> = { ...cs.counters };
  const selectedContent = new Set(cs.selected.content);
  for (const c of DAILY_CONTENT) {
    if (!selectedContent.has(c.id)) continue;
    const othersTotal = char ? sumOthersCounter(c.id, charName, char.worldID, characters, saved) : 0;
    counters[c.id] = Math.max(0, Math.min(c.max, c.max - othersTotal));
  }
  return {
    ...cs,
    arcane: fillTruthy(cs.selected.arcane),
    sacred: fillTruthy(cs.selected.sacred),
    bosses: fillTruthy(cs.selected.bosses),
    activities: fillTruthy(cs.selected.activities),
    counters,
  };
}

export function hasAnySelected(cs: CharDailyState): boolean {
  const s = cs.selected;
  return (
    s.arcane.length +
      s.sacred.length +
      s.bosses.length +
      s.activities.length +
      s.content.length >
    0
  );
}

// -- Hook ---------------------------------------------------------------------

export type TaskSection = "arcane" | "sacred" | "bosses" | "activities";

export function useDailiesState() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const characters: StoredCharacterRecord[] = useMemo(
    () => (mounted ? selectCharactersList(readCharactersStore()) : []),
    [mounted],
  );

  const [state, setState] = useState<SavedState>(() => {
    if (typeof window === "undefined") return { version: 1, characters: {} };
    return loadState();
  });

  useEffect(() => {
    if (!mounted) return undefined;
    const id = setInterval(() => {
      setState((prev) => {
        const next = applyDailyReset(prev);
        saveState(next);
        return next;
      });
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [mounted]);

  const getCharState = useCallback(
    (charName: string): CharDailyState => state.characters[charName] ?? defaultCharState(),
    [state.characters],
  );

  const updateCharState = useCallback(
    (charName: string, updater: (cs: CharDailyState) => CharDailyState) => {
      setState((prev) => {
        const cur = prev.characters[charName] ?? defaultCharState();
        const next = {
          ...prev,
          characters: { ...prev.characters, [charName]: updater(cur) },
        };
        saveState(next);
        return next;
      });
    },
    [],
  );

  const toggleTask = useCallback(
    (charName: string, section: TaskSection, id: string) => {
      updateCharState(charName, (cs) => ({
        ...cs,
        [section]: { ...cs[section], [id]: !cs[section][id] },
      }));
    },
    [updateCharState],
  );

  const worldCounterTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const char of characters) {
      const cs = state.characters[char.characterName];
      if (!cs?.counters) continue;
      for (const [counterId, val] of Object.entries(cs.counters)) {
        const key = `${char.worldID}:${counterId}`;
        map.set(key, (map.get(key) ?? 0) + val);
      }
    }
    return map;
  }, [characters, state.characters]);

  const getWorldCounterTotal = useCallback(
    (worldID: number, counterId: string) =>
      worldCounterTotals.get(`${worldID}:${counterId}`) ?? 0,
    [worldCounterTotals],
  );

  const setCounter = useCallback(
    (charName: string, id: string, value: number, max: number) => {
      const char = characters.find((c) => c.characterName === charName);
      setState((prev) => {
        const cs = prev.characters[charName] ?? defaultCharState();
        let clamped = Math.max(0, Math.min(max, value));
        if (char) {
          let othersTotal = 0;
          for (const c of characters) {
            if (c.worldID !== char.worldID || c.characterName === charName) continue;
            const ccs = prev.characters[c.characterName];
            othersTotal += ccs?.counters?.[id] ?? 0;
          }
          const remaining = Math.max(0, max - othersTotal);
          clamped = Math.min(remaining, clamped);
        }
        const next = {
          ...prev,
          characters: {
            ...prev.characters,
            [charName]: { ...cs, counters: { ...cs.counters, [id]: clamped } },
          },
        };
        saveState(next);
        return next;
      });
    },
    [characters],
  );

  const resetCharacter = useCallback(
    (charName: string) => {
      updateCharState(charName, resetTasks);
    },
    [updateCharState],
  );

  const toggleCollapsed = useCallback(
    (charName: string) => {
      updateCharState(charName, (cs) => ({ ...cs, collapsed: !cs.collapsed }));
    },
    [updateCharState],
  );

  const setSelected = useCallback(
    (charName: string, selected: SelectedTasks) => {
      updateCharState(charName, (cs) => ({ ...cs, selected }));
    },
    [updateCharState],
  );

  const checkAll = useCallback(
    (charName: string) => {
      const char = characters.find((c) => c.characterName === charName);
      setState((prev) => {
        const cs = prev.characters[charName] ?? defaultCharState();
        const next = {
          ...prev,
          characters: {
            ...prev.characters,
            [charName]: applyCheckAll(cs, char, charName, characters, prev.characters),
          },
        };
        saveState(next);
        return next;
      });
    },
    [characters],
  );

  return {
    mounted,
    characters,
    getCharState,
    getWorldCounterTotal,
    toggleTask,
    setCounter,
    resetCharacter,
    toggleCollapsed,
    setSelected,
    checkAll,
  };
}

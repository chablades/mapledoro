"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMounted } from "../../../lib/useMounted";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import { utcDateStr } from "../date";
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
}

/** One manually-added tracker character: a name plus its daily state. Display
 *  info (avatar, level, job, world) is looked up live from the character store
 *  by name when a matching import exists. */
export interface DailyCharacter {
  name: string;
  state: CharDailyState;
}

interface SavedState {
  version: 2;
  characters: DailyCharacter[];
}

export type DailyDialogState =
  | null
  | { type: "add-name" }
  | { type: "add-tasks"; name: string }
  | { type: "edit"; index: number };

// -- Helpers ------------------------------------------------------------------

function emptySelected(): SelectedTasks {
  return { arcane: [], sacred: [], bosses: [], activities: [], content: [] };
}

export function cloneSelectedTasks(selected: SelectedTasks): SelectedTasks {
  return {
    arcane: [...selected.arcane],
    sacred: [...selected.sacred],
    bosses: [...selected.bosses],
    activities: [...selected.activities],
    content: [...selected.content],
  };
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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

/** Coerce any stored/legacy shape into a full, well-formed CharDailyState. */
function normalizeCharState(input: unknown): CharDailyState {
  const cs = isObject(input) ? input : {};
  const sel = isObject(cs.selected) ? cs.selected : {};
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const boolMap = (v: unknown): Record<string, boolean> =>
    isObject(v) ? (v as Record<string, boolean>) : {};
  return {
    lastResetDay: typeof cs.lastResetDay === "string" ? cs.lastResetDay : utcDateStr(),
    arcane: boolMap(cs.arcane),
    sacred: boolMap(cs.sacred),
    bosses: boolMap(cs.bosses),
    activities: boolMap(cs.activities),
    counters: isObject(cs.counters) ? (cs.counters as Record<string, number>) : {},
    selected: {
      arcane: strArr(sel.arcane),
      sacred: strArr(sel.sacred),
      bosses: strArr(sel.bosses),
      activities: strArr(sel.activities),
      content: strArr(sel.content),
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

/**
 * Read + migrate the stored value. v1 kept an unordered `Record<name, state>`;
 * v2 is an ordered `DailyCharacter[]` (manually added, drag-reorderable).
 */
function migrate(parsed: unknown): SavedState {
  if (!isObject(parsed)) return { version: 2, characters: [] };
  const raw = parsed.characters;
  if (Array.isArray(raw)) {
    const characters = raw.flatMap((c): DailyCharacter[] =>
      isObject(c) && typeof c.name === "string"
        ? [{ name: c.name, state: normalizeCharState(c.state) }]
        : [],
    );
    return { version: 2, characters };
  }
  if (isObject(raw)) {
    const characters = Object.entries(raw).map(([name, state]) => ({
      name,
      state: normalizeCharState(state),
    }));
    return { version: 2, characters };
  }
  return { version: 2, characters: [] };
}

function applyDailyReset(state: SavedState): SavedState {
  const today = utcDateStr();
  let changed = false;
  const characters = state.characters.map((c) => {
    if (c.state.lastResetDay !== today) {
      changed = true;
      return { name: c.name, state: resetTasks(c.state) };
    }
    return c;
  });
  return changed ? { version: 2, characters } : state;
}

function loadState(): SavedState {
  if (typeof window === "undefined") return { version: 2, characters: [] };
  return applyDailyReset(migrate(readGlobalTool<unknown>("dailies")));
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

/**
 * Monster Park / Maple Tour are capped per world (across characters sharing a
 * world), not per character. Imported characters key by their real world id;
 * manually-typed ones (no store match) get a private per-character bucket.
 */
function worldKeyOf(name: string, storeByName: Map<string, StoredCharacterRecord>): string {
  const wid = storeByName.get(name.toLowerCase())?.worldID;
  return wid === undefined ? `c:${name.toLowerCase()}` : `w:${wid}`;
}

function sumOthersCounter(
  characters: DailyCharacter[],
  index: number,
  worldKey: string,
  counterId: string,
  storeByName: Map<string, StoredCharacterRecord>,
): number {
  let total = 0;
  characters.forEach((c, i) => {
    if (i === index) return;
    if (worldKeyOf(c.name, storeByName) !== worldKey) return;
    total += c.state.counters[counterId] ?? 0;
  });
  return total;
}

function applyCheckAll(
  cs: CharDailyState,
  index: number,
  characters: DailyCharacter[],
  storeByName: Map<string, StoredCharacterRecord>,
): CharDailyState {
  const worldKey = worldKeyOf(characters[index].name, storeByName);
  const counters: Record<string, number> = { ...cs.counters };
  const selectedContent = new Set(cs.selected.content);
  for (const c of DAILY_CONTENT) {
    if (!selectedContent.has(c.id)) continue;
    const worldMax = c.worldMax ?? c.max;
    const others = sumOthersCounter(characters, index, worldKey, c.id, storeByName);
    counters[c.id] = Math.max(0, Math.min(c.max, worldMax - others));
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

function clearAllTasks(cs: CharDailyState): CharDailyState {
  return { ...cs, arcane: {}, sacred: {}, bosses: {}, activities: {}, counters: {} };
}

// -- Hook ---------------------------------------------------------------------

export type TaskSection = "arcane" | "sacred" | "bosses" | "activities";

export function useDailiesState() {
  const mounted = useMounted();

  const storeChars: StoredCharacterRecord[] = useMemo(
    () => (mounted ? selectCharactersList(readCharactersStore()) : []),
    [mounted],
  );
  const storeByName = useMemo(() => {
    const m = new Map<string, StoredCharacterRecord>();
    for (const c of storeChars) m.set(c.characterName.toLowerCase(), c);
    return m;
  }, [storeChars]);

  const [state, setState] = useState<SavedState>(() => {
    if (typeof window === "undefined") return { version: 2, characters: [] };
    return loadState();
  });

  // Dialog + name-picker + task-draft state.
  const [dialog, setDialog] = useState<DailyDialogState>(null);
  const [nameMode, setNameMode] = useState<"type" | "select">("type");
  const [typedName, setTypedName] = useState("");
  const [selectedStoreChar, setSelectedStoreChar] = useState<StoredCharacterRecord | null>(null);
  const [draft, setDraft] = useState<SelectedTasks>(emptySelected);

  // Daily reset (00:00 UTC) while the page stays open.
  useEffect(() => {
    if (!mounted) return undefined;
    const id = setInterval(() => {
      setState((prev) => {
        const next = applyDailyReset(prev);
        if (next !== prev) saveState(next);
        return next;
      });
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [mounted]);

  const commit = useCallback(
    (updater: (prev: DailyCharacter[]) => DailyCharacter[]) => {
      setState((prev) => {
        const next: SavedState = { version: 2, characters: updater(prev.characters) };
        saveState(next);
        return next;
      });
    },
    [],
  );

  const updateCharAt = useCallback(
    (index: number, updater: (cs: CharDailyState) => CharDailyState) => {
      commit((prev) =>
        prev.map((c, i) => (i === index ? { ...c, state: updater(c.state) } : c)),
      );
    },
    [commit],
  );

  // -- Derived --
  const usedNames = useMemo(
    () => new Set(state.characters.map((c) => c.name.toLowerCase())),
    [state.characters],
  );
  const availableStoreChars = useMemo(
    () => storeChars.filter((c) => !usedNames.has(c.characterName.toLowerCase())),
    [storeChars, usedNames],
  );

  const getStoreChar = useCallback(
    (name: string) => storeByName.get(name.toLowerCase()) ?? null,
    [storeByName],
  );

  const worldCounterTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of state.characters) {
      const wkey = worldKeyOf(c.name, storeByName);
      for (const [counterId, val] of Object.entries(c.state.counters)) {
        const key = `${wkey}:${counterId}`;
        map.set(key, (map.get(key) ?? 0) + val);
      }
    }
    return map;
  }, [state.characters, storeByName]);

  const getWorldCounterTotal = useCallback(
    (name: string, counterId: string) =>
      worldCounterTotals.get(`${worldKeyOf(name, storeByName)}:${counterId}`) ?? 0,
    [worldCounterTotals, storeByName],
  );

  const pendingName =
    nameMode === "type" ? typedName.trim() : (selectedStoreChar?.characterName ?? "");

  // -- Dialog handlers --
  const openAdd = useCallback(() => {
    setNameMode("type");
    setTypedName("");
    setSelectedStoreChar(null);
    setDialog({ type: "add-name" });
  }, []);

  const proceedToTasks = useCallback(() => {
    if (!pendingName) return;
    setDraft(emptySelected());
    setDialog({ type: "add-tasks", name: pendingName });
  }, [pendingName]);

  const confirmAdd = useCallback(() => {
    if (dialog?.type !== "add-tasks") return;
    const name = dialog.name;
    commit((prev) => [...prev, { name, state: { ...defaultCharState(), selected: draft } }]);
    setDialog(null);
  }, [dialog, draft, commit]);

  const openEdit = useCallback(
    (index: number) => {
      setDraft(cloneSelectedTasks(state.characters[index].state.selected));
      setDialog({ type: "edit", index });
    },
    [state.characters],
  );

  const confirmEdit = useCallback(() => {
    if (dialog?.type !== "edit") return;
    updateCharAt(dialog.index, (cs) => ({ ...cs, selected: draft }));
    setDialog(null);
  }, [dialog, draft, updateCharAt]);

  const deleteCharacter = useCallback(
    (index: number) => commit((prev) => prev.filter((_, i) => i !== index)),
    [commit],
  );

  const reorderCharacters = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      commit((prev) => {
        if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [commit],
  );

  // -- Task handlers --
  const toggleTask = useCallback(
    (index: number, section: TaskSection, id: string) => {
      updateCharAt(index, (cs) => ({
        ...cs,
        [section]: { ...cs[section], [id]: !cs[section][id] },
      }));
    },
    [updateCharAt],
  );

  const setCounter = useCallback(
    (index: number, id: string, value: number, charMax: number, worldMax: number) => {
      commit((prev) => {
        const target = prev[index];
        if (!target) return prev;
        const worldKey = worldKeyOf(target.name, storeByName);
        const others = sumOthersCounter(prev, index, worldKey, id, storeByName);
        const remaining = Math.max(0, worldMax - others);
        const clamped = Math.min(remaining, Math.max(0, Math.min(charMax, value)));
        return prev.map((c, i) =>
          i === index
            ? { ...c, state: { ...c.state, counters: { ...c.state.counters, [id]: clamped } } }
            : c,
        );
      });
    },
    [commit, storeByName],
  );

  const setAllTasks = useCallback(
    (index: number, done: boolean) => {
      commit((prev) => {
        const target = prev[index];
        if (!target) return prev;
        const nextState = done
          ? applyCheckAll(target.state, index, prev, storeByName)
          : clearAllTasks(target.state);
        return prev.map((c, i) => (i === index ? { ...c, state: nextState } : c));
      });
    },
    [commit, storeByName],
  );

  const closeDialog = useCallback(() => setDialog(null), []);
  const goBackToAddName = useCallback(() => setDialog({ type: "add-name" }), []);

  return {
    mounted,
    characters: state.characters,
    getStoreChar,
    getWorldCounterTotal,
    availableStoreChars,
    dialog,
    nameMode,
    setNameMode,
    typedName,
    setTypedName,
    selectedStoreChar,
    setSelectedStoreChar,
    pendingName,
    draft,
    setDraft,
    openAdd,
    proceedToTasks,
    confirmAdd,
    openEdit,
    confirmEdit,
    deleteCharacter,
    reorderCharacters,
    toggleTask,
    setCounter,
    setAllTasks,
    closeDialog,
    goBackToAddName,
  };
}

import { useState, useMemo, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import {
  computeExpectedCosts,
  type StarForceOpts,
  type MvpTier,
} from "../star-force/star-force-data";
import { EVENT_ITEMS_BY_ID } from "./event-items";

// -- Types --------------------------------------------------------------------

export interface PlannerEntry {
  id: string;
  characterName: string;
  itemId: string;
  currentStar: number;
  targetStar: number;
  replacementCost: number;
  safeguard: boolean;
}

interface SavedState {
  costDiscount: boolean;
  boomReduction: boolean;
  starCatch: boolean;
  mvp: MvpTier;
  entries: PlannerEntry[];
}

export interface EntryCost {
  cost: number;
  booms: number;
}

// -- Storage ------------------------------------------------------------------

const STORAGE_KEY = "event-planner-v1";

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(state: SavedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultState(): SavedState {
  return {
    costDiscount: false,
    boomReduction: false,
    starCatch: true,
    mvp: "none",
    entries: [],
  };
}

// -- Cost Calculation ---------------------------------------------------------

function computeEntryCost(entry: PlannerEntry, settings: SavedState): EntryCost {
  const item = EVENT_ITEMS_BY_ID.get(entry.itemId);
  if (!item || entry.currentStar >= entry.targetStar) return { cost: 0, booms: 0 };

  const opts: StarForceOpts = {
    level: item.level,
    startStar: entry.currentStar,
    targetStar: entry.targetStar,
    replacementCost: entry.replacementCost,
    costDiscount: settings.costDiscount,
    boomReduction: settings.boomReduction,
    starCatch: settings.starCatch,
    safeguard: entry.safeguard,
    mvp: settings.mvp,
  };

  const results = computeExpectedCosts(opts);
  return {
    cost: results.reduce((s, r) => s + r.expectedCost, 0),
    booms: results.reduce((s, r) => s + r.expectedBooms, 0),
  };
}

// -- Hook ---------------------------------------------------------------------

export function useEventPlannerState() {
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
    if (typeof window === "undefined") return defaultState();
    return loadState() ?? defaultState();
  });

  useEffect(() => {
    persistState(state);
  }, [state]);

  // Settings callbacks
  const setCostDiscount = useCallback(
    (v: boolean) => setState((s) => ({ ...s, costDiscount: v })),
    [],
  );
  const setBoomReduction = useCallback(
    (v: boolean) => setState((s) => ({ ...s, boomReduction: v })),
    [],
  );
  const setStarCatch = useCallback(
    (v: boolean) => setState((s) => ({ ...s, starCatch: v })),
    [],
  );
  const setMvp = useCallback(
    (v: MvpTier) => setState((s) => ({ ...s, mvp: v })),
    [],
  );

  // Entry management
  const addEntry = useCallback(
    (entry: Omit<PlannerEntry, "id">) => {
      setState((s) => ({
        ...s,
        entries: [...s.entries, { ...entry, id: crypto.randomUUID() }],
      }));
    },
    [],
  );

  const removeEntry = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.id !== id),
    }));
  }, []);

  const toggleSafeguard = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, safeguard: !e.safeguard } : e,
      ),
    }));
  }, []);

  const clearEntries = useCallback(() => {
    setState((s) => ({ ...s, entries: [] }));
  }, []);

  // Cost computation
  const entryCosts = useMemo(
    () => state.entries.map((e) => computeEntryCost(e, state)),
    [state],
  );

  const grandTotal = useMemo(
    () =>
      entryCosts.reduce(
        (acc, c) => ({ cost: acc.cost + c.cost, booms: acc.booms + c.booms }),
        { cost: 0, booms: 0 },
      ),
    [entryCosts],
  );

  return {
    mounted,
    characters,
    state,
    setCostDiscount,
    setBoomReduction,
    setStarCatch,
    setMvp,
    addEntry,
    removeEntry,
    toggleSafeguard,
    clearEntries,
    entryCosts,
    grandTotal,
  };
}

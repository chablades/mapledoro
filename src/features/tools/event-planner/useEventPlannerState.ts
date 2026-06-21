import { useState, useMemo, useEffect, useCallback } from "react";
import { useMounted } from "../../../lib/useMounted";
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
import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import { EVENT_ITEMS_BY_ID } from "./event-items";

// -- Types --------------------------------------------------------------------

export interface PlannerEntry {
  id: string;
  characterName: string;
  itemId: string;
  currentStar: number;
  targetStar: number;
  replacementCost: number;
  starCatch: boolean;
  safeguard: boolean;
  boomTier: number; // experimental enhancement mode (1 = baseline)
}

// Events and MVP are global (they apply to every entry); star catch, safeguard,
// and boom tier are per-entry, captured from the add form.
interface SavedState {
  costDiscount: boolean;
  boomReduction: boolean;
  mvp: MvpTier;
  entries: PlannerEntry[];
}

// Saves predating per-entry options stored star catch / boom tier globally and
// their entries lack those fields.
type LegacyEntry = Omit<PlannerEntry, "starCatch" | "boomTier"> &
  Partial<Pick<PlannerEntry, "starCatch" | "boomTier">>;
type LegacySavedState = Partial<Omit<SavedState, "entries">> & {
  starCatch?: boolean;
  boomTier?: number;
  entries?: LegacyEntry[];
};

export interface EntryCost {
  cost: number;
  booms: number;
}

// -- Storage ------------------------------------------------------------------

function defaultState(): SavedState {
  return {
    costDiscount: false,
    boomReduction: false,
    mvp: "none",
    entries: [],
  };
}

// -- Cost Calculation ---------------------------------------------------------

function computeEntryCost(entry: PlannerEntry, settings: SavedState): EntryCost {
  const item = EVENT_ITEMS_BY_ID.get(entry.itemId);
  if (!item || entry.currentStar >= entry.targetStar) return { cost: 0, booms: 0 };

  // The 30% events stack with Enhancement Mode, but an entry's safeguard is
  // ignored when its tier is above baseline (we can't assume that one stacks),
  // matching the star force workspace.
  const tierActive = entry.boomTier > 1;

  const opts: StarForceOpts = {
    level: item.level,
    startStar: entry.currentStar,
    targetStar: entry.targetStar,
    replacementCost: entry.replacementCost,
    costDiscount: settings.costDiscount,
    boomReduction: settings.boomReduction,
    starCatch: entry.starCatch,
    safeguard: !tierActive && entry.safeguard,
    mvp: settings.mvp,
    boomTier: entry.boomTier,
  };

  const results = computeExpectedCosts(opts);
  return {
    cost: results.reduce((s, r) => s + r.expectedCost, 0),
    booms: results.reduce((s, r) => s + r.expectedBooms, 0),
  };
}

// -- Hook ---------------------------------------------------------------------

export function useEventPlannerState() {
  const mounted = useMounted();

  const characters: StoredCharacterRecord[] = useMemo(
    () => (mounted ? selectCharactersList(readCharactersStore()) : []),
    [mounted],
  );

  const [state, setState] = useState<SavedState>(() => {
    if (typeof window === "undefined") return defaultState();
    const saved = readGlobalTool<LegacySavedState>("eventPlanner");
    const defaults = defaultState();
    return {
      costDiscount: saved?.costDiscount ?? defaults.costDiscount,
      boomReduction: saved?.boomReduction ?? defaults.boomReduction,
      mvp: saved?.mvp ?? defaults.mvp,
      // Older saves stored star catch / boom tier globally — fold them into
      // each entry; entries that already carry their own values win.
      entries: (saved?.entries ?? []).map((e) => ({
        starCatch: saved?.starCatch ?? true,
        boomTier: saved?.boomTier ?? 1,
        ...e,
      })),
    };
  });

  useEffect(() => {
    writeGlobalTool("eventPlanner", state);
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
    setMvp,
    addEntry,
    removeEntry,
    clearEntries,
    entryCosts,
    grandTotal,
  };
}

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import { useApplyCharacterQueryParam } from "../useApplyCharacterQueryParam";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import { readCharacterToolData, writeCharacterToolData } from "../characterToolStorage";
import {
  type SymbolType,
  type SymbolArea,
  ARCANE_AREAS,
  SACRED_AREAS,
  ARCANE_GROWTH,
  SACRED_GROWTH,
  ARCANE_MAX_LEVEL,
  SACRED_MAX_LEVEL,
  symbolsRemaining,
  symbolsConsumed,
  daysToMax,
  symbolsForLevel,
} from "./symbol-data";

// -- Types --------------------------------------------------------------------

export interface SymbolState {
  level: number;
  current: number;
  daily: number;
  weeklyEnabled: boolean;
  enabled: boolean;
}

interface SavedState {
  type: SymbolType;
  symbols: Record<string, SymbolState>;
}

export interface PerSymbolData {
  area: SymbolArea;
  state: SymbolState;
  remaining: number;
  days: number;
  consumed: number;
  levelMax: number;
  isMaxed: boolean;
  isTracked: boolean;
}

export interface SymbolStats {
  perSymbol: PerSymbolData[];
  tracked: PerSymbolData[];
  totalConsumed: number;
  totalSymbolsNeeded: number;
  totalForOneArea: number;
  maxDaysVal: number;
  overallPct: number;
  allMaxed: boolean;
  anyInfinite: boolean;
  noneTracked: boolean;
}

// -- Constants ----------------------------------------------------------------

export const WEEKLY_SYMBOLS = 120;

// -- Helpers ------------------------------------------------------------------

function defaultSymbolState(area: SymbolArea, symbolType: SymbolType): SymbolState {
  return {
    level: 1,
    current: 0,
    daily: area.daily,
    weeklyEnabled: symbolType === "arcane",
    enabled: symbolType === "arcane",
  };
}

function getSymbolState(
  symbols: Record<string, SymbolState>,
  area: SymbolArea,
  symbolType: SymbolType,
): SymbolState {
  return symbols[area.name] ?? defaultSymbolState(area, symbolType);
}

export function effectiveWeekly(symbolType: SymbolType, weeklyEnabled: boolean): number {
  return symbolType === "arcane" && weeklyEnabled ? WEEKLY_SYMBOLS : 0;
}

function computeSymbolStats(
  areas: SymbolArea[],
  symbols: Record<string, SymbolState>,
  growth: number[],
  type: SymbolType,
  maxLevel: number,
): SymbolStats {
  let totalConsumed = 0;
  let totalSymbolsNeeded = 0;
  let maxDaysVal = 0;
  const totalForOneArea = growth.reduce((a, b) => a + b, 0);
  const perSymbol: PerSymbolData[] = [];

  for (const area of areas) {
    const s = getSymbolState(symbols, area, type);
    const isTracked = type === "arcane" || s.enabled;
    const weekly = effectiveWeekly(type, s.weeklyEnabled);
    const remaining = symbolsRemaining(growth, s.level, s.current);
    const days = daysToMax(remaining, s.daily, weekly);
    const consumed = symbolsConsumed(growth, s.level, s.current, maxLevel);
    const isMaxed = s.level >= maxLevel;

    if (isTracked) {
      totalConsumed += consumed;
      totalSymbolsNeeded += totalForOneArea;
      if (days !== Infinity && days > maxDaysVal) maxDaysVal = days;
    }

    perSymbol.push({
      area, state: s, remaining, days, consumed,
      levelMax: symbolsForLevel(growth, s.level),
      isMaxed, isTracked,
    });
  }

  const tracked = perSymbol.filter((p) => p.isTracked);
  const overallPct = totalSymbolsNeeded > 0
    ? Math.min(100, (totalConsumed / totalSymbolsNeeded) * 100)
    : 0;

  return {
    perSymbol, tracked, totalConsumed, totalSymbolsNeeded, totalForOneArea, maxDaysVal, overallPct,
    allMaxed: tracked.length > 0 && tracked.every((p) => p.isMaxed),
    anyInfinite: tracked.some((p) => p.days === Infinity && !p.isMaxed),
    noneTracked: tracked.length === 0,
  };
}

// -- Hook ---------------------------------------------------------------------

interface FormState {
  type: SymbolType;
  symbols: Record<string, SymbolState>;
}

function defaultFormState(): FormState {
  return { type: "arcane", symbols: {} };
}

export function useSymbolState() {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const characters: StoredCharacterRecord[] = useMemo(
    () => (mounted ? selectCharactersList(readCharactersStore()) : []),
    [mounted],
  );
  const [selectedCharName, setSelectedCharName] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(defaultFormState);
  const { type, symbols } = form;

  const areas = type === "arcane" ? ARCANE_AREAS : SACRED_AREAS;
  const growth = type === "arcane" ? ARCANE_GROWTH : SACRED_GROWTH;
  const maxLevel = type === "arcane" ? ARCANE_MAX_LEVEL : SACRED_MAX_LEVEL;

  useEffect(() => {
    if (selectedCharName) {
      writeCharacterToolData(selectedCharName, "symbols", { type, symbols });
    }
  }, [selectedCharName, type, symbols]);

  const handleCharChange = useCallback(
    (charName: string | null) => {
      if (selectedCharName) {
        writeCharacterToolData(selectedCharName, "symbols", { type, symbols });
      }

      if (charName) {
        const saved = readCharacterToolData<SavedState>(charName, "symbols");
        if (saved) {
          setForm({ type: saved.type, symbols: saved.symbols });
        } else {
          const char = characters.find((c) => c.characterName === charName);
          if (char && char.level >= 260) {
            const sacredSymbols: Record<string, SymbolState> = {};
            for (const area of SACRED_AREAS) {
              sacredSymbols[area.name] = {
                ...defaultSymbolState(area, "sacred"),
                enabled: char.level >= area.requiredLevel,
              };
            }
            setForm({ type: "sacred", symbols: sacredSymbols });
          } else {
            setForm(defaultFormState);
          }
        }
      } else {
        setForm(defaultFormState);
      }

      setSelectedCharName(charName);
    },
    [selectedCharName, type, symbols, characters],
  );

  useApplyCharacterQueryParam({ mounted, characters, handleCharChange });

  const switchType = useCallback((t: SymbolType) => {
    setForm((f) => ({ ...f, type: t }));
  }, []);

  const updateSymbol = useCallback(
    (areaName: string, patch: Partial<SymbolState>) => {
      setForm((f) => {
        const currentType = f.type;
        const currentAreas = currentType === "arcane" ? ARCANE_AREAS : SACRED_AREAS;
        const area = currentAreas.find((a) => a.name === areaName)!;
        return {
          ...f,
          symbols: {
            ...f.symbols,
            [areaName]: { ...getSymbolState(f.symbols, area, currentType), ...patch },
          },
        };
      });
    },
    [],
  );

  const resetAll = useCallback(() => {
    setForm((f) => {
      const currentAreas = f.type === "arcane" ? ARCANE_AREAS : SACRED_AREAS;
      const next = { ...f.symbols };
      for (const area of currentAreas) {
        next[area.name] = defaultSymbolState(area, f.type);
      }
      return { ...f, symbols: next };
    });
  }, []);

  const stats = computeSymbolStats(areas, symbols, growth, type, maxLevel);

  return {
    mounted,
    characters,
    selectedCharName,
    handleCharChange,
    type,
    symbols,
    areas,
    growth,
    maxLevel,
    switchType,
    updateSymbol,
    resetAll,
    stats,
  };
}

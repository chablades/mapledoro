import { useState, useCallback, useMemo } from "react";
import { useMounted } from "../../../lib/useMounted";
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
  ALL_SACRED_AREAS,
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
}

interface SavedState {
  type: SymbolType;
  symbols: Record<string, SymbolState>;
}

interface PerSymbolData {
  area: SymbolArea;
  state: SymbolState;
  remaining: number;
  days: number;
  consumed: number;
  levelMax: number;
  isMaxed: boolean;
  isUnlocked: boolean;
}

export interface SymbolStats {
  perSymbol: PerSymbolData[];
  unlocked: PerSymbolData[];
  totalConsumed: number;
  totalSymbolsNeeded: number;
  totalForOneArea: number;
  maxDaysVal: number;
  overallPct: number;
  allMaxed: boolean;
  anyInfinite: boolean;
  noneUnlocked: boolean;
}

// -- Constants ----------------------------------------------------------------

const WEEKLY_SYMBOLS = 120;

// -- Helpers ------------------------------------------------------------------

function defaultSymbolState(area: SymbolArea, symbolType: SymbolType): SymbolState {
  return {
    level: 1,
    current: 0,
    daily: area.daily,
    weeklyEnabled: symbolType === "arcane",
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

/**
 * A symbol is unlocked when the selected character has reached the area's
 * required level. With no character selected there is no level to check
 * against, so every symbol is treated as unlocked and the tool stays usable
 * standalone.
 */
function isAreaUnlocked(area: SymbolArea, charLevel: number | null): boolean {
  return charLevel === null || charLevel >= area.requiredLevel;
}

function computeSymbolStats(
  areas: SymbolArea[],
  symbols: Record<string, SymbolState>,
  growth: number[],
  type: SymbolType,
  maxLevel: number,
  charLevel: number | null,
): SymbolStats {
  let totalConsumed = 0;
  let totalSymbolsNeeded = 0;
  let maxDaysVal = 0;
  const totalForOneArea = growth.reduce((a, b) => a + b, 0);
  const perSymbol: PerSymbolData[] = [];

  for (const area of areas) {
    const s = getSymbolState(symbols, area, type);
    const isUnlocked = isAreaUnlocked(area, charLevel);
    const weekly = effectiveWeekly(type, s.weeklyEnabled);
    const remaining = symbolsRemaining(growth, s.level, s.current);
    const days = daysToMax(remaining, s.daily, weekly);
    const consumed = symbolsConsumed(growth, s.level, s.current, maxLevel);
    const isMaxed = s.level >= maxLevel;

    if (isUnlocked) {
      totalConsumed += consumed;
      totalSymbolsNeeded += totalForOneArea;
      if (days !== Infinity && days > maxDaysVal) maxDaysVal = days;
    }

    perSymbol.push({
      area, state: s, remaining, days, consumed,
      levelMax: symbolsForLevel(growth, s.level),
      isMaxed, isUnlocked,
    });
  }

  const unlocked = perSymbol.filter((p) => p.isUnlocked);
  const overallPct = totalSymbolsNeeded > 0
    ? Math.min(100, (totalConsumed / totalSymbolsNeeded) * 100)
    : 0;

  return {
    perSymbol, unlocked, totalConsumed, totalSymbolsNeeded, totalForOneArea, maxDaysVal, overallPct,
    allMaxed: unlocked.length > 0 && unlocked.every((p) => p.isMaxed),
    anyInfinite: unlocked.some((p) => p.days === Infinity && !p.isMaxed),
    noneUnlocked: unlocked.length === 0,
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
  const mounted = useMounted();

  const characters: StoredCharacterRecord[] = useMemo(
    () => (mounted ? selectCharactersList(readCharactersStore()) : []),
    [mounted],
  );
  const [selectedCharName, setSelectedCharName] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(defaultFormState);
  const { type, symbols } = form;

  const areas = type === "arcane" ? ARCANE_AREAS : ALL_SACRED_AREAS;
  const growth = type === "arcane" ? ARCANE_GROWTH : SACRED_GROWTH;
  const maxLevel = type === "arcane" ? ARCANE_MAX_LEVEL : SACRED_MAX_LEVEL;

  const updateForm = useCallback(
    (updater: (prev: FormState) => FormState) => {
      setForm((prev) => {
        const next = updater(prev);
        if (selectedCharName) {
          writeCharacterToolData(selectedCharName, "symbols", { type: next.type, symbols: next.symbols });
        }
        return next;
      });
    },
    [selectedCharName],
  );

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
          // A character already in Grandis lands on the Sacred tab; everyone
          // else starts on Arcane.
          const char = characters.find((c) => c.characterName === charName);
          const inGrandis = char !== undefined && char.level >= SACRED_AREAS[0].requiredLevel;
          setForm({ type: inGrandis ? "sacred" : "arcane", symbols: {} });
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
    updateForm((f) => ({ ...f, type: t }));
  }, [updateForm]);

  const updateSymbol = useCallback(
    (areaName: string, patch: Partial<SymbolState>) => {
      updateForm((f) => {
        const currentType = f.type;
        const currentAreas = currentType === "arcane" ? ARCANE_AREAS : ALL_SACRED_AREAS;
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
    [updateForm],
  );

  const resetAll = useCallback(() => {
    updateForm((f) => {
      const currentAreas = f.type === "arcane" ? ARCANE_AREAS : ALL_SACRED_AREAS;
      const next = { ...f.symbols };
      for (const area of currentAreas) {
        next[area.name] = defaultSymbolState(area, f.type);
      }
      return { ...f, symbols: next };
    });
  }, [updateForm]);

  const charLevel = selectedCharName
    ? characters.find((c) => c.characterName === selectedCharName)?.level ?? null
    : null;

  const stats = computeSymbolStats(areas, symbols, growth, type, maxLevel, charLevel);

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

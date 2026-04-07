"use client";

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import {
  ORIGIN_COSTS,
  ENHANCEMENT_COSTS,
  MASTERY_COSTS,
  COMMON_COSTS,
  getCostRange,
  type LevelCost,
} from "./hexa-costs";
import {
  findClassByName,
  COMMON_SKILLS,
  type HexaClassDef,
} from "./hexa-classes";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SkillLevels {
  origin: number;
  mastery: number[];
  enhancement: number[];
  common: number[];
  ascent: number;
}

interface SavedState {
  className: string | null;
  levels: SkillLevels;
  desiredLevels?: SkillLevels;
}

export interface SkillCostSummary {
  solErda: number;
  fragments: number;
}

export interface SectionCost {
  perSkill: SkillCostSummary[];
  total: SkillCostSummary;
}

export interface TotalCosts {
  origin: SectionCost;
  mastery: SectionCost;
  enhancement: SectionCost;
  common: SectionCost;
  ascent: SectionCost;
  grand: SkillCostSummary;
  maxGrand: SkillCostSummary;
  maxCommon: SkillCostSummary;
  progressPct: number;
}

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "hexa-skills-v1";

function storageKeyFor(charName: string | null): string {
  return charName ? `${STORAGE_KEY}-${charName}` : STORAGE_KEY;
}

function loadState(key: string): SavedState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(key: string, state: SavedState) {
  localStorage.setItem(key, JSON.stringify(state));
}

// ── Defaults ─────────────────────────────────────────────────────────────────

function defaultLevels(): SkillLevels {
  return {
    origin: 1,
    mastery: [0, 0, 0, 0],
    enhancement: [0, 0, 0, 0],
    common: COMMON_SKILLS.map(() => 0),
    ascent: 0,
  };
}

function defaultDesiredLevels(): SkillLevels {
  return {
    origin: 30,
    mastery: [30, 30, 30, 30],
    enhancement: [30, 30, 30, 30],
    common: COMMON_SKILLS.map(() => 30),
    ascent: 30,
  };
}

function defaultState(): SavedState {
  return { className: null, levels: defaultLevels(), desiredLevels: defaultDesiredLevels() };
}

function clampLevel(v: number): number {
  return Math.max(0, Math.min(30, Math.round(v) || 0));
}

/** Ensure saved arrays match the expected lengths for the given class. */
function normalizeLevels(levels: SkillLevels, classDef: HexaClassDef | null, fill = 0): SkillLevels {
  const masteryLen = classDef ? classDef.mastery.length : 4;
  const enhanceLen = classDef ? classDef.enhancement.length : 4;
  const commonLen = COMMON_SKILLS.length;

  const padArray = (arr: number[], len: number): number[] => {
    const result = arr.slice(0, len).map(clampLevel);
    while (result.length < len) result.push(fill);
    return result;
  };

  return {
    origin: Math.max(1, clampLevel(levels.origin)),
    mastery: padArray(levels.mastery, masteryLen),
    enhancement: padArray(levels.enhancement, enhanceLen),
    common: padArray(levels.common, commonLen),
    ascent: clampLevel(levels.ascent),
  };
}

// ── Cost Calculation ─────────────────────────────────────────────────────────

function sectionCost(levels: number[], desired: number[], costTable: readonly LevelCost[]): SectionCost {
  const perSkill = levels.map((lv, i) => getCostRange(costTable, lv, desired[i]));
  const total = perSkill.reduce(
    (acc, c) => ({ solErda: acc.solErda + c.solErda, fragments: acc.fragments + c.fragments }),
    { solErda: 0, fragments: 0 },
  );
  return { perSkill, total };
}

function singleCost(level: number, desired: number, costTable: readonly LevelCost[]): SectionCost {
  const cost = getCostRange(costTable, level, desired);
  return { perSkill: [cost], total: cost };
}

function calcTotalCosts(levels: SkillLevels, desired: SkillLevels, classDef: HexaClassDef | null): TotalCosts {
  const origin = singleCost(levels.origin, desired.origin, ORIGIN_COSTS);
  const mastery = sectionCost(levels.mastery, desired.mastery, MASTERY_COSTS);
  const enhancement = sectionCost(levels.enhancement, desired.enhancement, ENHANCEMENT_COSTS);
  const common = sectionCost(levels.common, desired.common, COMMON_COSTS);
  const ascent = classDef?.ascent
    ? singleCost(levels.ascent, desired.ascent, ORIGIN_COSTS)
    : { perSkill: [], total: { solErda: 0, fragments: 0 } };

  const sections = [origin, mastery, enhancement, common, ascent];
  const grand = sections.reduce(
    (acc, s) => ({
      solErda: acc.solErda + s.total.solErda,
      fragments: acc.fragments + s.total.fragments,
    }),
    { solErda: 0, fragments: 0 },
  );

  // Max costs (from baseline to desired levels)
  const baseLevels = normalizeLevels(defaultLevels(), classDef);
  const maxOrigin = singleCost(baseLevels.origin, desired.origin, ORIGIN_COSTS);
  const maxMastery = sectionCost(baseLevels.mastery, desired.mastery, MASTERY_COSTS);
  const maxEnhancement = sectionCost(baseLevels.enhancement, desired.enhancement, ENHANCEMENT_COSTS);
  const maxCommon = sectionCost(baseLevels.common, desired.common, COMMON_COSTS);
  const maxAscent = classDef?.ascent
    ? singleCost(baseLevels.ascent, desired.ascent, ORIGIN_COSTS)
    : { perSkill: [], total: { solErda: 0, fragments: 0 } };

  const maxSections = [maxOrigin, maxMastery, maxEnhancement, maxCommon, maxAscent];
  const maxGrand = maxSections.reduce(
    (acc, s) => ({
      solErda: acc.solErda + s.total.solErda,
      fragments: acc.fragments + s.total.fragments,
    }),
    { solErda: 0, fragments: 0 },
  );

  const spent = {
    solErda: maxGrand.solErda - grand.solErda,
    fragments: maxGrand.fragments - grand.fragments,
  };

  const progressPct =
    maxGrand.fragments > 0
      ? Math.min(100, (spent.fragments / maxGrand.fragments) * 100)
      : 0;

  return { origin, mastery, enhancement, common, ascent, grand, maxGrand, maxCommon: maxCommon.total, progressPct };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHexaSkillsState() {
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
  const currentStorageKey = storageKeyFor(selectedCharName);

  const [state, setState] = useState<SavedState>(() => {
    if (typeof window === "undefined") return defaultState();
    return loadState(STORAGE_KEY) ?? defaultState();
  });

  const classDef = state.className ? findClassByName(state.className) : null;
  const levels = normalizeLevels(state.levels, classDef);
  const desiredLevels = normalizeLevels(state.desiredLevels ?? defaultDesiredLevels(), classDef, 30);

  // Persist on change
  useEffect(() => {
    saveState(currentStorageKey, state);
  }, [currentStorageKey, state]);

  // Character switching
  const handleCharChange = useCallback(
    (charName: string | null) => {
      saveState(currentStorageKey, state);
      const newKey = storageKeyFor(charName);
      const saved = loadState(newKey);

      if (saved) {
        setState(saved);
      } else {
        // Auto-fill class from character
        const char = charName
          ? characters.find((c) => c.characterName === charName)
          : null;
        let autoClass: string | null = null;
        if (char && findClassByName(char.jobName)) {
          autoClass = char.jobName;
        }
        setState({ className: autoClass, levels: defaultLevels(), desiredLevels: defaultDesiredLevels() });
      }

      setSelectedCharName(charName);
    },
    [currentStorageKey, state, characters],
  );

  // Class switching
  const setClassName = useCallback((name: string | null) => {
    setState((prev) => {
      const newClassDef = name ? findClassByName(name) : null;
      const keepLevels = prev.className === name;
      return {
        className: name,
        levels: normalizeLevels(keepLevels ? prev.levels : defaultLevels(), newClassDef),
        desiredLevels: normalizeLevels(
          keepLevels ? (prev.desiredLevels ?? defaultDesiredLevels()) : defaultDesiredLevels(),
          newClassDef,
          30,
        ),
      };
    });
  }, []);

  // Level setters
  const setOriginLevel = useCallback((v: number) => {
    setState((prev) => ({ ...prev, levels: { ...prev.levels, origin: Math.max(1, clampLevel(v)) } }));
  }, []);

  const setAscentLevel = useCallback((v: number) => {
    setState((prev) => ({ ...prev, levels: { ...prev.levels, ascent: clampLevel(v) } }));
  }, []);

  const setMasteryLevel = useCallback((idx: number, v: number) => {
    setState((prev) => {
      const mastery = [...prev.levels.mastery];
      mastery[idx] = clampLevel(v);
      return { ...prev, levels: { ...prev.levels, mastery } };
    });
  }, []);

  const setEnhancementLevel = useCallback((idx: number, v: number) => {
    setState((prev) => {
      const enhancement = [...prev.levels.enhancement];
      enhancement[idx] = clampLevel(v);
      return { ...prev, levels: { ...prev.levels, enhancement } };
    });
  }, []);

  const setCommonLevel = useCallback((idx: number, v: number) => {
    setState((prev) => {
      const common = [...prev.levels.common];
      common[idx] = clampLevel(v);
      return { ...prev, levels: { ...prev.levels, common } };
    });
  }, []);

  // Desired level setters
  const setDesiredOriginLevel = useCallback((v: number) => {
    setState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      return { ...prev, desiredLevels: { ...dl, origin: Math.max(1, clampLevel(v)) } };
    });
  }, []);

  const setDesiredAscentLevel = useCallback((v: number) => {
    setState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      return { ...prev, desiredLevels: { ...dl, ascent: clampLevel(v) } };
    });
  }, []);

  const setDesiredMasteryLevel = useCallback((idx: number, v: number) => {
    setState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      const mastery = [...dl.mastery];
      mastery[idx] = clampLevel(v);
      return { ...prev, desiredLevels: { ...dl, mastery } };
    });
  }, []);

  const setDesiredEnhancementLevel = useCallback((idx: number, v: number) => {
    setState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      const enhancement = [...dl.enhancement];
      enhancement[idx] = clampLevel(v);
      return { ...prev, desiredLevels: { ...dl, enhancement } };
    });
  }, []);

  const setDesiredCommonLevel = useCallback((idx: number, v: number) => {
    setState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      const common = [...dl.common];
      common[idx] = clampLevel(v);
      return { ...prev, desiredLevels: { ...dl, common } };
    });
  }, []);

  const resetAll = useCallback(() => {
    setState((prev) => ({ ...prev, levels: defaultLevels() }));
  }, []);

  const costs = calcTotalCosts(levels, desiredLevels, classDef);

  return {
    mounted,
    characters,
    selectedCharName,
    handleCharChange,
    className: state.className,
    classDef,
    setClassName,
    levels,
    desiredLevels,
    setOriginLevel,
    setAscentLevel,
    setMasteryLevel,
    setEnhancementLevel,
    setCommonLevel,
    setDesiredOriginLevel,
    setDesiredAscentLevel,
    setDesiredMasteryLevel,
    setDesiredEnhancementLevel,
    setDesiredCommonLevel,
    resetAll,
    costs,
  };
}

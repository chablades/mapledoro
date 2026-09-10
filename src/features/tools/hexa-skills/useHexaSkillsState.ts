"use client";

import { useCallback, useMemo } from "react";
import { type StoredCharacterRecord } from "../../characters/model/charactersStore";
import { usePerCharacterToolState } from "../usePerCharacterToolState";
import { readCharacterToolData } from "../characterToolStorage";
import {
  hexaStatSlotLevelSum,
  HEXA_STAT_NODE_MAX_LEVEL,
  type HexaStatNode,
} from "../../characters/setup/data/hexaStatData";
import {
  ORIGIN_COSTS,
  ENHANCEMENT_COSTS,
  MASTERY_COSTS,
  COMMON_COSTS,
  COMMON_COST_TABLES,
  getCostRange,
  type LevelCost,
} from "./hexa-costs";
import {
  findClassByName,
  COMMON_SKILLS,
  HEXA_STAT_SKILLS,
  commonSkillsFor,
  type HexaClassDef,
  type HexaSkillLevels,
} from "./hexa-classes";
import { applyGuideSteps, type GuideStep } from "./hexa-fd";

// ── Types ────────────────────────────────────────────────────────────────────

export type SkillLevels = HexaSkillLevels;

interface SavedState {
  className: string | null;
  levels: SkillLevels;
  desiredLevels?: SkillLevels;
  /** Per HEXA Stat node, ticked by hand for a character whose HEXA Stat isn't filled in.
   *  Completion read from the character's own HEXA Stat data wins over this. */
  hexaStatDone?: boolean[];
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

function clampLevel(v: number): number {
  return Math.max(0, Math.min(30, Math.round(v) || 0));
}

/** Ensure saved arrays match the expected lengths for the given class. */
function normalizeLevels(levels: SkillLevels, classDef: HexaClassDef | null, fill = 0): SkillLevels {
  const masteryLen = classDef ? classDef.mastery.length : 4;
  const enhanceLen = classDef ? classDef.enhancement.length : 4;
  const commonLen = commonSkillsFor(classDef?.className ?? null).length;

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

/** `tableAt` is per index, since the Common section's 3rd node has its own cost table. */
function sectionCost(levels: number[], desired: number[], tableAt: (i: number) => readonly LevelCost[]): SectionCost {
  const perSkill = levels.map((lv, i) => getCostRange(tableAt(i), lv, desired[i]));
  const total = perSkill.reduce(
    (acc, c) => ({ solErda: acc.solErda + c.solErda, fragments: acc.fragments + c.fragments }),
    { solErda: 0, fragments: 0 },
  );
  return { perSkill, total };
}

const commonCostTable = (i: number): readonly LevelCost[] => COMMON_COST_TABLES[i] ?? COMMON_COSTS;

function singleCost(level: number, desired: number, costTable: readonly LevelCost[]): SectionCost {
  const cost = getCostRange(costTable, level, desired);
  return { perSkill: [cost], total: cost };
}

function calcTotalCosts(levels: SkillLevels, desired: SkillLevels, classDef: HexaClassDef | null): TotalCosts {
  const origin = singleCost(levels.origin, desired.origin, ORIGIN_COSTS);
  const mastery = sectionCost(levels.mastery, desired.mastery, () => MASTERY_COSTS);
  const enhancement = sectionCost(levels.enhancement, desired.enhancement, () => ENHANCEMENT_COSTS);
  const common = sectionCost(levels.common, desired.common, commonCostTable);
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
  const maxMastery = sectionCost(baseLevels.mastery, desired.mastery, () => MASTERY_COSTS);
  const maxEnhancement = sectionCost(baseLevels.enhancement, desired.enhancement, () => ENHANCEMENT_COSTS);
  const maxCommon = sectionCost(baseLevels.common, desired.common, commonCostTable);
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

/**
 * Which HEXA Stat nodes the character has already finished, read from their own HEXA Stat
 * data (tool key "hexaStat", filled in by MapleScouter Setup). A node is done once one of
 * its presets has spent all 20 level-ups; the two presets are alternative line splits of the
 * same node, so the further-along one is what counts.
 */
function hexaStatDoneFromCharacter(charName: string | null): boolean[] {
  const saved = charName ? readCharacterToolData<{ nodes?: HexaStatNode[] }>(charName, "hexaStat") : null;
  const nodes = saved?.nodes;
  return HEXA_STAT_SKILLS.map((_, i) => {
    const presets = nodes?.[i]?.presets;
    if (!presets) return false;
    return presets.some((preset) => hexaStatSlotLevelSum(preset) >= HEXA_STAT_NODE_MAX_LEVEL);
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function parseHexaSkills(
  saved: SavedState | null,
  char: StoredCharacterRecord | undefined,
): SavedState {
  if (saved) return saved;
  // Seed the class from the character's job when we recognise it.
  const autoClass = char && findClassByName(char.jobName) ? char.jobName : null;
  return { className: autoClass, levels: defaultLevels(), desiredLevels: defaultDesiredLevels() };
}

function serializeHexaSkills(state: SavedState): SavedState {
  return state;
}

export function useHexaSkillsState() {
  const {
    mounted,
    characters,
    selectedCharName,
    handleCharChange,
    state,
    update: updateState,
  } = usePerCharacterToolState({
    toolKey: "hexaSkills",
    parse: parseHexaSkills,
    serialize: serializeHexaSkills,
  });

  const classDef = state.className ? findClassByName(state.className) : null;
  const levels = normalizeLevels(state.levels, classDef);
  const desiredLevels = normalizeLevels(state.desiredLevels ?? defaultDesiredLevels(), classDef, 30);

  // Read once per character rather than per render, the same way this hook already loads the
  // character list: a full store parse on every keystroke isn't worth it, and reselecting the
  // character picks up a HEXA Stat edit made elsewhere. `mounted` gates it, since localStorage
  // is empty during SSR.
  const hexaStatFromCharacter = useMemo(
    () => (mounted ? hexaStatDoneFromCharacter(selectedCharName) : HEXA_STAT_SKILLS.map(() => false)),
    [mounted, selectedCharName],
  );
  const savedHexaStatDone = state.hexaStatDone;
  const hexaStatDone = useMemo(
    () => HEXA_STAT_SKILLS.map((_, i) => hexaStatFromCharacter[i] || (savedHexaStatDone?.[i] ?? false)),
    [hexaStatFromCharacter, savedHexaStatDone],
  );

  const setHexaStatDone = useCallback((idx: number, done: boolean) => {
    updateState((prev) => {
      const next = HEXA_STAT_SKILLS.map((_, i) => prev.hexaStatDone?.[i] ?? false);
      next[idx] = done;
      return { ...prev, hexaStatDone: next };
    });
  }, [updateState]);

  // Class switching
  const setClassName = useCallback((name: string | null) => {
    updateState((prev) => {
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
  }, [updateState]);

  // Level setters
  const setOriginLevel = useCallback((v: number) => {
    updateState((prev) => ({ ...prev, levels: { ...prev.levels, origin: Math.max(1, clampLevel(v)) } }));
  }, [updateState]);

  const setAscentLevel = useCallback((v: number) => {
    updateState((prev) => ({ ...prev, levels: { ...prev.levels, ascent: clampLevel(v) } }));
  }, [updateState]);

  const setMasteryLevel = useCallback((idx: number, v: number) => {
    updateState((prev) => {
      const mastery = [...prev.levels.mastery];
      mastery[idx] = clampLevel(v);
      return { ...prev, levels: { ...prev.levels, mastery } };
    });
  }, [updateState]);

  const setEnhancementLevel = useCallback((idx: number, v: number) => {
    updateState((prev) => {
      const enhancement = [...prev.levels.enhancement];
      enhancement[idx] = clampLevel(v);
      return { ...prev, levels: { ...prev.levels, enhancement } };
    });
  }, [updateState]);

  const setCommonLevel = useCallback((idx: number, v: number) => {
    updateState((prev) => {
      const common = [...prev.levels.common];
      common[idx] = clampLevel(v);
      return { ...prev, levels: { ...prev.levels, common } };
    });
  }, [updateState]);

  // Desired level setters
  const setDesiredOriginLevel = useCallback((v: number) => {
    updateState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      return { ...prev, desiredLevels: { ...dl, origin: Math.max(1, clampLevel(v)) } };
    });
  }, [updateState]);

  const setDesiredAscentLevel = useCallback((v: number) => {
    updateState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      return { ...prev, desiredLevels: { ...dl, ascent: clampLevel(v) } };
    });
  }, [updateState]);

  const setDesiredMasteryLevel = useCallback((idx: number, v: number) => {
    updateState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      const mastery = [...dl.mastery];
      mastery[idx] = clampLevel(v);
      return { ...prev, desiredLevels: { ...dl, mastery } };
    });
  }, [updateState]);

  const setDesiredEnhancementLevel = useCallback((idx: number, v: number) => {
    updateState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      const enhancement = [...dl.enhancement];
      enhancement[idx] = clampLevel(v);
      return { ...prev, desiredLevels: { ...dl, enhancement } };
    });
  }, [updateState]);

  const setDesiredCommonLevel = useCallback((idx: number, v: number) => {
    updateState((prev) => {
      const dl = prev.desiredLevels ?? defaultDesiredLevels();
      const common = [...dl.common];
      common[idx] = clampLevel(v);
      return { ...prev, desiredLevels: { ...dl, common } };
    });
  }, [updateState]);

  const resetAll = useCallback(() => {
    updateState((prev) => ({ ...prev, levels: defaultLevels() }));
  }, [updateState]);

  /** Mark leveling-guide steps as done in game: raise each node to the step's target level. */
  const applyGuide = useCallback((steps: GuideStep[]) => {
    updateState((prev) => ({
      ...prev,
      levels: applyGuideSteps(normalizeLevels(prev.levels, prev.className ? findClassByName(prev.className) : null), steps),
    }));
  }, [updateState]);

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
    applyGuide,
    costs,
    hexaStatDone,
    /** Nodes whose completion came from the character's HEXA Stat data, so the manual tick
     *  is redundant and the tracker shows it as locked rather than editable. */
    hexaStatFromCharacter,
    setHexaStatDone,
  };
}

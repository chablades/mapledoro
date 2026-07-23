"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CharacterDropdown } from "../../../components/CharacterSyncPanel";
import HoverTooltip from "../../../components/HoverTooltip";
import { ErdaSkillIcon, ItemIcon, MarkIcon, MobSprite, SkillIcon } from "../../../components/ResourceImage";
import { SegmentedToggle } from "../../../components/SegmentedToggle";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import { useMounted } from "../../../lib/useMounted";
import { formatExpCompact, formatMesoFull } from "../format";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { Field, Toggle, ToolNumberInput } from "../shared-ui";
import { toolStyles } from "../tool-styles";
import { dataTableTh } from "../shared-styles";
import {
  CHECK_BUFF_GROUPS,
  DAILY_EXP_CONTENT,
  DEFAULT_BUFF_STATE,
  EPIC_DUNGEON_OPTIONS,
  GROWTH_POTION_OPTIONS,
  INPUT_BUFFS,
  LEVEL_INPUT_BUFFS,
  MAX_EXP_LEVEL,
  MIN_EXP_LEVEL,
  MONSTER_PARK_OPTIONS,
  RESOURCE_TABLES,
  ROLL_OF_THE_DICE_JOBS,
  SELECT_BUFFS,
  WEEKLY_EXP_CONTENT,
  bestMonsterParkForLevel,
  calculateAllInOne,
  calculateMonsterExp,
  expForLevel,
  percentOfLevel,
  type AllInOneInput,
  type BuffState,
  type CheckBuff,
  type EpicDungeonRow,
  type IconRef,
  type InputBuff,
  type LevelResourceRow,
  type MonsterExpInput,
  type MonsterExpResult,
  type ResourceTable,
} from "./exp-calculator-data";
import { EXP_MONSTERS, type ExpMonster } from "./exp-monsters";
import {
  readCharactersStore,
  selectCharactersList,
  selectMainCharacter,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import { worldServerType } from "../boss-crystals/boss-crystals-types";
import { readCharacterToolData, writeCharacterToolData } from "../characterToolStorage";

type ExpTab = "buffs" | "all-in-one" | "resources";
type AllInOneNumberKey =
  | "startLevel"
  | "startPercent"
  | "targetLevel"
  | "monsterParkRuns"
  | "customDailyExp"
  | "customHourlyExp"
  | "customHoursPerDay"
  | "mpeRuns"
  | "epicDungeonMultiplier"
  | "strawberryTickets"
  | "mechaberryTickets"
  | "expressBoosters"
  | "expTickets"
  | "advancedExpTickets"
  | "punchKingScore"
  | "doubleUpPoints"
  | "luxeSaunaHours"
  | "arcaneRiverBonus"
  | "grandisBonus"
  | "monsterParkBonus"
  | "epicDungeonExpMultiplier";

const TAB_OPTIONS: ExpTab[] = ["buffs", "all-in-one", "resources"];
const TAB_LABELS: Record<ExpTab, string> = {
  buffs: "Farming Calculator",
  "all-in-one": "Daily / Weekly Calculator",
  resources: "Resources",
};

const FARMING_TOOL_KEY = "expFarming";

const DEFAULT_MONSTER: MonsterExpInput = {
  playerLevel: 260,
  targetLevel: 270,
  currentPercent: 0,
  monsterLevel: 260,
  monsterBaseExp: 680638,
  hourlyKillCount: 18000,
};

/** Farming Calculator state saved per-character. Level/percent come from the character record and
 *  monster level/EXP come from the selected monster, so none of those are saved: only the monster's
 *  key, which is enough to reproduce the hourly rate on the next visit. */
interface SavedExpState {
  buffs: BuffState;
  targetLevel: number;
  hourlyKillCount: number;
  monsterKey: string | null;
}

function toSavedExpState(
  buffs: BuffState,
  monster: MonsterExpInput,
  selectedMonster: ExpMonster | null,
): SavedExpState {
  return {
    buffs,
    targetLevel: monster.targetLevel,
    hourlyKillCount: monster.hourlyKillCount,
    monsterKey: selectedMonster?.key ?? null,
  };
}

/** Roll of the Dice is pirate-only, so a non-pirate can never carry a stored value for it. */
function applyJobBuffRules(buffs: BuffState, jobName: string): BuffState {
  if (ROLL_OF_THE_DICE_JOBS.has(jobName)) return buffs;
  return { ...buffs, selects: { ...buffs.selects, "roll-of-the-dice": 0 } };
}

function characterPercent(character: StoredCharacterRecord): number {
  return roundToThree(Math.min(99.999, Math.max(0, percentOfLevel(character.level, character.exp))));
}

/** Buffs + monster inputs for a character, from their saved state merged over the defaults. */
function loadCharacterState(character: StoredCharacterRecord, monster: MonsterExpInput) {
  const saved = mergeSavedExpState(
    readCharacterToolData<Partial<SavedExpState>>(character.characterName, FARMING_TOOL_KEY),
  );
  const selectedMonster = EXP_MONSTERS.find((option) => option.key === saved.monsterKey) ?? null;
  return {
    buffs: applyJobBuffRules(saved.buffs, character.jobName),
    selectedMonster,
    monster: {
      ...monster,
      playerLevel: character.level,
      currentPercent: characterPercent(character),
      targetLevel: saved.targetLevel,
      hourlyKillCount: saved.hourlyKillCount,
      monsterLevel: selectedMonster?.level ?? monster.monsterLevel,
      monsterBaseExp: selectedMonster?.exp ?? monster.monsterBaseExp,
    },
  };
}

/** Opens on the main character when there is one, so the tool is useful without touching the dropdown. */
function initialFarmingState() {
  const main = selectMainCharacter(readCharactersStore());
  if (!main) {
    return { charName: null, buffs: DEFAULT_BUFF_STATE, monster: DEFAULT_MONSTER, selectedMonster: null };
  }
  const { buffs, monster, selectedMonster } = loadCharacterState(main, DEFAULT_MONSTER);
  return { charName: main.characterName, buffs, monster, selectedMonster };
}

/** Saved buffs can predate buff ids added since, so fill gaps from the defaults. */
function mergeSavedExpState(saved: Partial<SavedExpState> | null): SavedExpState {
  return {
    buffs: {
      exclusive: { ...saved?.buffs?.exclusive },
      additive: { ...saved?.buffs?.additive },
      selects: { ...DEFAULT_BUFF_STATE.selects, ...saved?.buffs?.selects },
      inputs: { ...DEFAULT_BUFF_STATE.inputs, ...saved?.buffs?.inputs },
    },
    targetLevel: saved?.targetLevel ?? DEFAULT_MONSTER.targetLevel,
    hourlyKillCount: saved?.hourlyKillCount ?? DEFAULT_MONSTER.hourlyKillCount,
    monsterKey: saved?.monsterKey ?? null,
  };
}

function defaultAllInOneInput(): AllInOneInput {
  const startDate = localDateInputValue(new Date());
  const endDate = localDateInputValue(addDays(new Date(), 27));
  return {
    startLevel: 260,
    startPercent: 0,
    targetLevel: 270,
    startDate,
    endDate,
    burningType: "",
    dailyIds: [],
    monsterParkId: "",
    monsterParkRuns: 0,
    customDailyMode: "flat",
    customDailyExp: 0,
    customHourlyExp: 0,
    customHoursPerDay: 0,
    weeklyRuns: Object.fromEntries(WEEKLY_EXP_CONTENT.map((weekly) => [weekly.id, 0])),
    mpeRuns: 0,
    epicDungeonId: "",
    epicDungeonMultiplier: 1,
    strawberryTickets: 0,
    mechaberryTickets: 0,
    expressBoosters: 0,
    expTickets: 0,
    advancedExpTickets: 0,
    punchKingScore: 0,
    doubleUpPoints: 0,
    luxeSaunaHours: 0,
    potions: Object.fromEntries(GROWTH_POTION_OPTIONS.map((potion) => [potion.id, 0])),
    arcaneRiverBonus: 0,
    grandisBonus: 0,
    monsterParkBonus: 0,
    epicDungeonExpMultiplier: 1,
  };
}

const DAILY_WEEKLY_TOOL_KEY = "expDailyWeekly";

/** Daily / Weekly plan saved per-character: the Daily Content, Weekly Content, Monster Park, and
 *  Epic Dungeon panels plus target level, burning, and the date window. Current level and percent
 *  come from the character record; event tickets and growth potions stay in memory by design. */
type SavedAllInOne = Pick<
  AllInOneInput,
  | "targetLevel"
  | "startDate"
  | "endDate"
  | "burningType"
  | "dailyIds"
  | "customDailyMode"
  | "customDailyExp"
  | "customHourlyExp"
  | "customHoursPerDay"
  | "arcaneRiverBonus"
  | "grandisBonus"
  | "weeklyRuns"
  | "monsterParkId"
  | "monsterParkRuns"
  | "monsterParkBonus"
  | "mpeRuns"
  | "epicDungeonId"
  | "epicDungeonMultiplier"
  | "epicDungeonExpMultiplier"
>;

function toSavedAllInOne(input: AllInOneInput): SavedAllInOne {
  return {
    targetLevel: input.targetLevel,
    startDate: input.startDate,
    endDate: input.endDate,
    burningType: input.burningType,
    dailyIds: input.dailyIds,
    customDailyMode: input.customDailyMode,
    customDailyExp: input.customDailyExp,
    customHourlyExp: input.customHourlyExp,
    customHoursPerDay: input.customHoursPerDay,
    arcaneRiverBonus: input.arcaneRiverBonus,
    grandisBonus: input.grandisBonus,
    weeklyRuns: input.weeklyRuns,
    monsterParkId: input.monsterParkId,
    monsterParkRuns: input.monsterParkRuns,
    monsterParkBonus: input.monsterParkBonus,
    mpeRuns: input.mpeRuns,
    epicDungeonId: input.epicDungeonId,
    epicDungeonMultiplier: input.epicDungeonMultiplier,
    epicDungeonExpMultiplier: input.epicDungeonExpMultiplier,
  };
}

function mergeSavedAllInOne(saved: Partial<SavedAllInOne> | null): AllInOneInput {
  const defaults = defaultAllInOneInput();
  if (!saved) return defaults;
  const merged: AllInOneInput = {
    ...defaults,
    ...saved,
    dailyIds: saved.dailyIds ?? defaults.dailyIds,
    weeklyRuns: { ...defaults.weeklyRuns, ...saved.weeklyRuns },
  };
  // A saved window that already ended would silently project EXP over dead dates.
  const expired = !saved.endDate || saved.endDate < localDateInputValue(new Date());
  if (expired) {
    merged.startDate = defaults.startDate;
    merged.endDate = defaults.endDate;
  }
  return merged;
}

function loadCharacterAllInOne(character: StoredCharacterRecord): AllInOneInput {
  const saved = mergeSavedAllInOne(
    readCharacterToolData<Partial<SavedAllInOne>>(character.characterName, DAILY_WEEKLY_TOOL_KEY),
  );
  return { ...saved, startLevel: character.level, startPercent: characterPercent(character) };
}

/** `importedHourlyExp` is the Farming tab's hourly rate handed over by the import link. It seeds
 *  the Custom Daily panel into hourly mode; the rest of the plan still comes from the save. */
function initialAllInOneState(importedHourlyExp: number | null) {
  const main = selectMainCharacter(readCharactersStore());
  const base = main ? loadCharacterAllInOne(main) : defaultAllInOneInput();
  const input: AllInOneInput =
    importedHourlyExp === null
      ? base
      : { ...base, customDailyMode: "hourly", customHourlyExp: Math.floor(importedHourlyExp) };
  return { charName: main?.characterName ?? null, input };
}

const EXCLUSIVE_BUFF_SECTIONS = CHECK_BUFF_GROUPS.filter((group) => group.mode === "exclusive").reduce<
  { title: string; buffs: { groupId: string; buff: CheckBuff }[] }[]
>((sections, group) => {
  const entries = group.buffs.map((buff) => ({ groupId: group.id, buff }));
  const existing = sections.find((section) => section.title === group.section);
  if (existing) existing.buffs.push(...entries);
  else sections.push({ title: group.section, buffs: entries });
  return sections;
}, []);

const ADDITIVE_GROUP = CHECK_BUFF_GROUPS.find((group) => group.mode === "multi");

const INPUT_BUFF_PANELS = [
  { title: "Skill Levels", buffs: LEVEL_INPUT_BUFFS },
  { title: "Others", buffs: INPUT_BUFFS },
];

/** Select buffs rendered as compact icon + level tiles (char-flow symbol input style)
 *  instead of dropdowns. The stored value stays the option value; the tile input maps
 *  level (option index) to value. */
const TILE_SELECT_IDS = new Set(["elven", "evan-link", "roro", "tallahart", "geardock", "champion-renown"]);

/** The two EXP node options rendered as exclusive toggle tiles; both write the
 *  shared "exp-node" select value. */
const EXP_NODE_TILES: { label: string; detail: string; short: string; value: number; icon: IconRef }[] = [
  { label: "Mapae Nodestone", detail: "+33% EXP averaged", short: "+33%", value: 33, icon: { type: "item", id: "02638846" } },
  { label: "Roro Nodestone", detail: "+10% EXP averaged", short: "+10%", value: 10, icon: { type: "item", id: "02831071" } },
];

const DAILY_REGIONS = [...new Set(DAILY_EXP_CONTENT.map((daily) => daily.region))];

const iconRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };

// Sol Erda (manifests/v270/item.json), the Epic Dungeon reward currency.
const SOL_ERDA_ICON: IconRef = { type: "item", id: "05066300" };

// Monster Park entry ticket (manifests/v270/item.json).
const MONSTER_PARK_ICON: IconRef = { type: "item", id: "05252030" };

// The Express Booster Flame, listed as Intensifying Flame in manifests/v270/mob.json.
const EXPRESS_BOOSTER_ICON: IconRef = { type: "mob", id: "9834700" };

/** The level past which no Burning type grants extra levels. */
const BURNING_MAX_LEVEL = 270;

function expPanelStyle(styles: ReturnType<typeof toolStyles>): React.CSSProperties {
  return { ...styles.sectionPanel, borderRadius: "14px" };
}

/** Surfaces nested inside a panel. `timerBg` separates them from the panel's own `panel` fill,
 *  and the radius stays under the panel's 14px so the corners nest instead of fighting. */
function innerCardStyle(theme: AppTheme): React.CSSProperties {
  return { background: theme.timerBg, border: `1px solid ${theme.border}`, borderRadius: 12 };
}

function fullWidthControl(base: React.CSSProperties): React.CSSProperties {
  return { ...base, width: "100%", height: 35 };
}

function disabledControl(base: React.CSSProperties): React.CSSProperties {
  return { ...base, opacity: 0.65, cursor: "not-allowed" };
}

/** Button reset, so `tool-header-back` can carry the look of the back link. `margin-left: auto` on
 *  a fit-width block is what pushes it to the panel's right edge. */
function importLinkStyle(theme: AppTheme): React.CSSProperties {
  return {
    display: "block",
    width: "fit-content",
    marginLeft: "auto",
    marginTop: 14,
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    fontSize: "0.75rem",
    fontWeight: 800,
    textAlign: "right",
    cursor: "pointer",
    color: theme.accentText,
  };
}

export default function ExpCalculatorWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const [tab, setTab] = useState<ExpTab>("buffs");
  const [importedHourlyExp, setImportedHourlyExp] = useState<number | null>(null);
  const panelStyle = expPanelStyle(toolStyles(theme));

  // Each tab unmounts when it isn't showing, so the import is a one-shot handoff: the Farming tab
  // stashes its hourly rate here, the Daily / Weekly tab seeds itself from it on mount, and leaving
  // that tab spends it. Without spending it, a later visit would re-seed and stomp the plan again.
  const importHourlyExp = (hourlyExp: number) => {
    setImportedHourlyExp(hourlyExp);
    setTab("all-in-one");
  };
  const changeTab = (next: ExpTab) => {
    if (tab === "all-in-one") setImportedHourlyExp(null);
    setTab(next);
  };

  if (!mounted) return null;

  return (
    <div className="page-content">
      <style>{`
        .exp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
        .exp-coupon-grid { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
        /* The dungeon name plus its Sol Erda icon needs the room; the reward dropdown only ever
           holds "0x" - "9x", so it gives that room back. */
        .exp-epic-grid { grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.5fr); }
        .exp-epic-grid-solo { grid-template-columns: minmax(0, 1fr); }
        .exp-duo-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; }
        .exp-tile-row { display: flex; flex-wrap: wrap; gap: 10px; }
        .exp-select-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 12px; }
        .exp-results { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
        .exp-overview-grid { display: grid; grid-template-columns: minmax(240px, 1.1fr) minmax(260px, 1fr); gap: 14px; }
        .exp-table { min-width: 680px; }
        .exp-buff-card { min-height: 48px; }
        .exp-monster-dropdown { scrollbar-width: thin; scrollbar-color: ${theme.muted} transparent; }
        .exp-monster-dropdown::-webkit-scrollbar { width: 8px; }
        .exp-monster-dropdown::-webkit-scrollbar-track { background: transparent; }
        .exp-monster-dropdown::-webkit-scrollbar-thumb { background: ${theme.muted}; border-radius: 4px; }
        .exp-monster-search::placeholder { color: ${theme.muted}; opacity: 1; }
        /* The ring belongs on the bordered trigger, not the borderless input inside it. */
        .exp-monster-trigger:focus-within { outline: 2px solid; outline-offset: 2px; }
        .exp-monster-search:focus-visible { outline: none; }
        @media (max-width: 900px) {
          .exp-duo-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 760px) {
          .exp-grid { grid-template-columns: 1fr; }
          .exp-select-grid { grid-template-columns: 1fr; }
          .exp-overview-grid { grid-template-columns: 1fr; }
          .segmented-toggle-track { flex-wrap: wrap; }
        }
      `}</style>
      <div className="tool-container" style={{ maxWidth: 1000 }}>
        <ToolHeader
          theme={theme}
          title="EXP Calculator"
          description="Calculate GMS EXP buffs, monster EXP, level progress, and event resource values using the current level 200-300 EXP table."
        />

        <SegmentedToggle
          theme={theme}
          options={TAB_OPTIONS}
          labels={TAB_LABELS}
          value={tab}
          ariaLabel="Calculator"
          onChange={changeTab}
          sectionPanel={panelStyle}
        />

        {/* One entrance on the content that actually swapped, not one per panel; keyed
            so switching tabs remounts the wrapper and replays the site-wide fade. */}
        <div key={tab} className="fade-in">
          {tab === "buffs" && <BuffsTab theme={theme} onImportHourlyExp={importHourlyExp} />}
          {tab === "all-in-one" && <AllInOneTab theme={theme} importedHourlyExp={importedHourlyExp} />}
          {tab === "resources" && <ResourcesTab theme={theme} />}
        </div>
      </div>
    </div>
  );
}

function BuffsTab({ theme, onImportHourlyExp }: { theme: AppTheme; onImportHourlyExp: (hourlyExp: number) => void }) {
  const styles = toolStyles(theme);
  const inputStyle = fullWidthControl(styles.inputStyle);
  const characterDropdownInputStyle: React.CSSProperties = { ...styles.inputStyle, width: "100%" };
  const selectStyle = fullWidthControl(styles.selectStyle);
  const labelStyle = styles.labelStyle;
  const panelStyle = expPanelStyle(styles);
  const [initial] = useState(initialFarmingState);
  const [monster, setMonster] = useState<MonsterExpInput>(initial.monster);
  const [selectedCharName, setSelectedCharName] = useState<string | null>(initial.charName);
  const [selectedMonster, setSelectedMonster] = useState<ExpMonster | null>(initial.selectedMonster);
  const [buffs, setBuffs] = useState<BuffState>(initial.buffs);
  const result = useMemo(() => calculateMonsterExp(monster, buffs), [monster, buffs]);
  const characters = useMemo(() => selectCharactersList(readCharactersStore()), []);
  const selectedCharacter = characters.find((character) => character.characterName === selectedCharName);
  const showRollOfTheDice = !selectedCharacter || ROLL_OF_THE_DICE_JOBS.has(selectedCharacter.jobName);
  const visibleSelectBuffs = showRollOfTheDice
    ? SELECT_BUFFS
    : SELECT_BUFFS.filter((buff) => buff.id !== "roll-of-the-dice");
  const tileSelectBuffs = SELECT_BUFFS.filter((buff) => TILE_SELECT_IDS.has(buff.id));
  const dropdownSelectBuffs = visibleSelectBuffs.filter(
    (buff) => !TILE_SELECT_IDS.has(buff.id) && buff.id !== "exp-node",
  );
  /** Persists to the selected character as part of the state update; manual level stays in memory. */
  const updateBuffs = (updater: (state: BuffState) => BuffState) => {
    setBuffs((state) => {
      const next = updater(state);
      if (selectedCharName) {
        writeCharacterToolData(selectedCharName, FARMING_TOOL_KEY, toSavedExpState(next, monster, selectedMonster));
      }
      return next;
    });
  };
  /** Only for the persisted monster fields (target level, hourly kill count). */
  const updateSavedMonsterField = (field: "targetLevel" | "hourlyKillCount", value: number) => {
    setMonster((state) => {
      const next = { ...state, [field]: value };
      if (selectedCharName) {
        writeCharacterToolData(selectedCharName, FARMING_TOOL_KEY, toSavedExpState(buffs, next, selectedMonster));
      }
      return next;
    });
  };
  const updateExclusiveBuff = (groupId: string, buffId: string) => {
    updateBuffs((state) => ({ ...state, exclusive: { ...state.exclusive, [groupId]: buffId } }));
  };
  const updateSelectBuff = (id: string, value: number) => {
    updateBuffs((state) => ({ ...state, selects: { ...state.selects, [id]: value } }));
  };
  const toggleExpNode = (value: number) => {
    updateSelectBuff("exp-node", (buffs.selects["exp-node"] ?? 0) === value ? 0 : value);
  };
  const updateInputBuff = (buff: InputBuff, raw: number) => {
    const value = Math.min(buff.max, Math.max(0, raw));
    updateBuffs((state) => ({ ...state, inputs: { ...state.inputs, [buff.id]: value } }));
  };
  const updateCharacter = (name: string | null) => {
    if (selectedCharName) {
      writeCharacterToolData(selectedCharName, FARMING_TOOL_KEY, toSavedExpState(buffs, monster, selectedMonster));
    }
    setSelectedCharName(name);
    const selected = characters.find((character) => character.characterName === name);
    if (!selected) {
      setBuffs(DEFAULT_BUFF_STATE);
      setMonster((state) => ({
        ...state,
        targetLevel: DEFAULT_MONSTER.targetLevel,
        hourlyKillCount: DEFAULT_MONSTER.hourlyKillCount,
      }));
      return;
    }
    const loaded = loadCharacterState(selected, monster);
    setBuffs(loaded.buffs);
    setMonster(loaded.monster);
    setSelectedMonster(loaded.selectedMonster);
    writeCharacterToolData(
      selected.characterName,
      FARMING_TOOL_KEY,
      toSavedExpState(loaded.buffs, loaded.monster, loaded.selectedMonster),
    );
  };
  const updateSelectedMonster = (option: ExpMonster) => {
    setSelectedMonster(option);
    setMonster((state) => {
      const next = { ...state, monsterLevel: option.level, monsterBaseExp: option.exp };
      if (selectedCharName) {
        writeCharacterToolData(selectedCharName, FARMING_TOOL_KEY, toSavedExpState(buffs, next, option));
      }
      return next;
    });
  };

  return (
    <>
      <div className="exp-duo-grid">
        <div style={panelStyle}>
          <Field label="Character" style={labelStyle}>
            <CharacterDropdown
              theme={theme}
              characters={characters}
              selectedCharName={selectedCharName}
              onCharChange={updateCharacter}
              inputStyle={characterDropdownInputStyle}
              nullOption={{ label: "Manual Level", subtitle: "No character selected" }}
              triggerStyle={{ maxWidth: "none", minWidth: 0, width: "100%" }}
            />
          </Field>
          <div className="exp-grid" style={{ marginTop: 12 }}>
            <NumberField label="Character Level" min={MIN_EXP_LEVEL} max={MAX_EXP_LEVEL - 1} value={monster.playerLevel} labelStyle={labelStyle} inputStyle={inputStyle} disabled={selectedCharName !== null} onChange={(value) => setMonster((state) => ({ ...state, playerLevel: value }))} />
            <NumberField label="Current EXP %" min={0} max={99.999} decimal value={monster.currentPercent} labelStyle={labelStyle} inputStyle={inputStyle} disabled={selectedCharName !== null} onChange={(value) => setMonster((state) => ({ ...state, currentPercent: value }))} />
            <NumberField label="Target Level" min={MIN_EXP_LEVEL + 1} max={MAX_EXP_LEVEL} value={monster.targetLevel} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateSavedMonsterField("targetLevel", value)} />
            <NumberField label="Hourly Kill Count" min={0} value={monster.hourlyKillCount} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateSavedMonsterField("hourlyKillCount", value)} />
          </div>
        </div>

        <div style={panelStyle}>
          <Field label="Monster" style={labelStyle}>
            <MonsterSelector
              theme={theme}
              selected={selectedMonster}
              playerLevel={monster.playerLevel}
              inputStyle={inputStyle}
              onSelect={updateSelectedMonster}
            />
          </Field>
          <div className="exp-grid" style={{ marginTop: 12 }}>
            <NumberField label="Monster Level" min={1} max={MAX_EXP_LEVEL} value={monster.monsterLevel} labelStyle={labelStyle} inputStyle={inputStyle} disabled onChange={() => undefined} />
            <NumberField label="Monster Base EXP" min={0} value={monster.monsterBaseExp} labelStyle={labelStyle} inputStyle={inputStyle} disabled onChange={() => undefined} />
          </div>
        </div>
      </div>

      <div className="exp-duo-grid">
        {EXCLUSIVE_BUFF_SECTIONS.map((section) => (
          <div key={section.title} style={panelStyle}>
            <SectionTitle theme={theme} label={section.title} />
            <div className={section.title === "Use Coupon" ? "exp-grid exp-coupon-grid" : "exp-grid"}>
              {section.buffs.map(({ groupId, buff }) => {
                const selected = buffs.exclusive[groupId] === buff.id;
                return (
                  <button
                    type="button"
                    key={buff.id}
                    className="exp-buff-card panel-card"
                    onClick={() => updateExclusiveBuff(groupId, selected ? "none" : buff.id)}
                    style={buffButtonStyle(theme, selected)}
                  >
                    <BuffIcon icon={buff.icon} label={buff.label} />
                    <span>{buff.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {ADDITIVE_GROUP && (
        <div style={panelStyle}>
          <SectionTitle theme={theme} label={ADDITIVE_GROUP.section} />
          <div className="exp-tile-row">
            {ADDITIVE_GROUP.buffs.map((buff) => {
              const selected = Boolean(buffs.additive[buff.id]);
              return (
                <HoverTooltip key={buff.id} theme={theme} label={buff.label}>
                  <button
                    type="button"
                    aria-label={buff.label}
                    aria-pressed={selected}
                    onClick={() => updateBuffs((state) => toggleAdditiveBuff(state, buff, !selected))}
                    style={dailyTileStyle(theme, selected)}
                  >
                    <BuffIcon icon={buff.icon} label={buff.label} />
                  </button>
                </HoverTooltip>
              );
            })}
          </div>
        </div>
      )}

      <div style={panelStyle}>
        <SectionTitle theme={theme} label="Selectable Buffs" />
        <div className="exp-tile-row">
          {tileSelectBuffs.map((buff) => (
            <SelectLevelTile
              key={buff.id}
              theme={theme}
              buff={buff}
              value={buffs.selects[buff.id] ?? 0}
              inputStyle={styles.inputStyle}
              onChange={(value) => updateSelectBuff(buff.id, value)}
            />
          ))}
          {EXP_NODE_TILES.map((tile) => (
            <ExpNodeTile
              key={tile.value}
              theme={theme}
              tile={tile}
              selected={(buffs.selects["exp-node"] ?? 0) === tile.value}
              onToggle={() => toggleExpNode(tile.value)}
            />
          ))}
        </div>
        <div className="exp-select-grid" style={{ marginTop: 14 }}>
          {dropdownSelectBuffs.map((buff) => (
            <Field key={buff.id} label={buff.label} style={labelStyle}>
              <div style={iconRowStyle}>
                <BuffIcon icon={buff.icon} label={buff.label} />
                <select
                  className="tool-select"
                  value={buffs.selects[buff.id] ?? 0}
                  onChange={(e) => updateSelectBuff(buff.id, Number(e.target.value))}
                  style={selectStyle}
                >
                  {buff.options.map((option) => (
                    <option key={`${buff.id}-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          ))}
        </div>
      </div>

      <div className="exp-duo-grid">
        {INPUT_BUFF_PANELS.map((panel) => (
          <div key={panel.title} style={panelStyle}>
            <SectionTitle theme={theme} label={panel.title} />
            <div className="exp-grid">
              {panel.buffs.map((buff) => (
                <Field key={buff.id} label={buff.label} style={labelStyle}>
                  <div style={iconRowStyle}>
                    <BuffIcon icon={buff.icon} label={buff.label} />
                    <ToolNumberInput
                      min={0}
                      max={buff.max}
                      step={buff.step ?? 1}
                      value={buffs.inputs[buff.id] ?? 0}
                      onKeyDown={replaceZeroOnDigit}
                      onCommit={(value) => updateInputBuff(buff, value)}
                      style={inputStyle}
                    />
                  </div>
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ExpOverviewPanel
        theme={theme}
        monster={monster}
        selectedMonster={selectedMonster}
        result={result}
        onImportHourlyExp={onImportHourlyExp}
      />
    </>
  );
}

function MonsterSelector({
  theme,
  selected,
  playerLevel,
  inputStyle,
  onSelect,
}: {
  theme: AppTheme;
  selected: ExpMonster | null;
  playerLevel: number;
  inputStyle: React.CSSProperties;
  onSelect: (monster: ExpMonster) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const listId = useId();

  const positionMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    // Scroll fires far faster than we can paint, and positionMenu both reads layout and
    // re-renders the list, so coalesce to one measurement per frame.
    let frame = 0;
    const reposition = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        positionMenu();
      });
    };
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", reposition, { capture: true, passive: true });
    window.addEventListener("resize", reposition, { passive: true });
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return EXP_MONSTERS.filter((monster) => monster.search.includes(q)).slice(0, 80);
    // Unsearched, the useful monsters are the ones near the player's level, not the first 60 by id.
    return [...EXP_MONSTERS]
      .sort((a, b) => Math.abs(a.level - playerLevel) - Math.abs(b.level - playerLevel))
      .slice(0, 60);
  }, [search, playerLevel]);

  // Keeps the arrow-key highlight inside the scroll viewport. No state, so no re-render.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const choose = (monster: ExpMonster) => {
    onSelect(monster);
    setSearch(monster.name);
    setOpen(false);
  };

  const openMenu = (clearSearch = false) => {
    if (clearSearch) setSearch("");
    setActiveIndex(0);
    positionMenu();
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openMenu();
      if (filtered.length === 0) return;
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + delta + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter" && open && filtered[activeIndex]) {
      e.preventDefault();
      choose(filtered[activeIndex]);
      return;
    }
    if (e.key === "Tab") setOpen(false);
  };

  const menu = open && menuPos && typeof document !== "undefined" && createPortal(
    <div
      ref={menuRef}
      id={listId}
      role="listbox"
      aria-label="Monster results"
      className="panel-card exp-monster-dropdown"
      style={{
        position: "fixed",
        top: menuPos.top,
        left: menuPos.left,
        width: menuPos.width,
        zIndex: 95,
        maxHeight: 340,
        overflowY: "auto",
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        boxShadow: dropdownShadow(theme),
        padding: 4,
      }}
    >
      {filtered.length === 0 && <DropdownMessage theme={theme} text="No monsters found." />}
      {filtered.map((monster, index) => {
        const active = index === activeIndex;
        return (
          <button
            key={monster.key}
            type="button"
            role="option"
            id={`${listId}-${index}`}
            aria-selected={active}
            data-active={active}
            tabIndex={-1}
            // Keeps focus (and the combobox's activedescendant) on the input through the click.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(monster)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 9px",
              border: "none",
              background: active ? theme.accentSoft : "transparent",
              color: active ? theme.accentText : theme.text,
              cursor: "pointer",
              textAlign: "left",
              borderRadius: 8,
            }}
          >
            {/* Decorative: the option's accessible name already comes from the text beside it. */}
            <MobSprite id={monster.id} size={32} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 800 }}>{monster.name}</span>
              <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: theme.muted }}>
                Lv. {monster.level} | {monster.area}
              </span>
            </span>
          </button>
        );
      })}
    </div>,
    document.body,
  );

  return (
    <div style={{ position: "relative" }}>
      <div ref={triggerRef} className="tool-input exp-monster-trigger" style={{ ...inputStyle, height: 46, display: "flex", alignItems: "center", gap: 8 }}>
        {selected && <MobSprite id={selected.id} size={30} alt={selected.name} />}
        <input
          className="exp-monster-search"
          role="combobox"
          aria-label="Monster"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          value={open ? search : selected?.name ?? search}
          placeholder="Search monster name"
          onFocus={() => openMenu(!open)}
          // Picking an option keeps focus in the input, so a later click has no focus event to reopen on.
          onClick={() => { if (!open) openMenu(true); }}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setSearch(e.target.value);
            openMenu();
          }}
          style={{
            border: "none",
            background: "transparent",
            color: theme.text,
            width: "100%",
            fontFamily: "var(--font-body)",
            fontWeight: 700,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            color: theme.muted,
            fontSize: "0.75rem",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
          }}
        >
          ▼
        </span>
      </div>
      {menu}
    </div>
  );
}

/** A black drop shadow does nothing on a near-black panel, so deepen it in dark mode. */
function dropdownShadow(theme: AppTheme): string {
  return theme.colorMode === "dark" ? "0 12px 28px rgba(0,0,0,0.55)" : "0 8px 24px rgba(0,0,0,0.18)";
}

function DropdownMessage({ theme, text }: { theme: AppTheme; text: string }) {
  return <div style={{ padding: "9px 10px", color: theme.muted, fontSize: "0.82rem", fontWeight: 700 }}>{text}</div>;
}

function ExpOverviewPanel({
  theme,
  monster,
  selectedMonster,
  result,
  onImportHourlyExp,
}: {
  theme: AppTheme;
  monster: MonsterExpInput;
  selectedMonster: ExpMonster | null;
  result: MonsterExpResult;
  onImportHourlyExp: (hourlyExp: number) => void;
}) {
  const panelStyle = expPanelStyle(toolStyles(theme));
  const visualCardStyle: React.CSSProperties = {
    ...innerCardStyle(theme),
    padding: "14px",
    display: "grid",
    gridTemplateColumns: "96px 1fr",
    gap: 14,
    alignItems: "center",
    minWidth: 0,
  };
  return (
    <div style={panelStyle}>
      <SectionTitle theme={theme} label="Overview" />
      <div className="exp-overview-grid">
        <div style={visualCardStyle}>
          <div style={{ width: 96, minHeight: 104, display: "grid", placeItems: "center" }}>
            {selectedMonster ? <MobSprite id={selectedMonster.id} size={96} alt={selectedMonster.name} /> : <span style={{ color: theme.muted, fontSize: "0.75rem", fontWeight: 800 }}>Mob</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: theme.text, fontSize: "0.9rem", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedMonster?.name ?? "Select a monster"}
            </div>
            <div style={{ color: theme.muted, fontSize: "0.75rem", fontWeight: 800, marginTop: 3 }}>
              Lv. {monster.monsterLevel} | Base {formatMesoFull(monster.monsterBaseExp)} EXP
            </div>
            <div style={{ color: theme.text, fontSize: "1.15rem", fontWeight: 800, marginTop: 8 }}>
              {formatExpCompact(result.normalExp)}
            </div>
            <div className="tool-field-label" style={{ color: theme.muted, marginTop: 2 }}>
              Final kill EXP
            </div>
          </div>
        </div>
        <div className="exp-results">
          <MiniMetric theme={theme} label="Hours to Target Level" value={formatHours(result.hoursToTarget)} />
          <MiniMetric theme={theme} label="Hourly EXP" value={formatExpCompact(result.hourlyExp)} />
          <MiniMetric theme={theme} label="Total Multiplier" value={`${result.buffMultiplier.toFixed(3)}x`} />
          <MiniMetric theme={theme} label="Level Bonus" value={`${result.monsterLevelBonus.toFixed(2)}x`} />
        </div>
      </div>
      {/* Switches tabs and seeds state rather than navigating, so it's a button wearing the
          back-link's clothes. Hidden at 0 hourly EXP, where there is nothing to carry over. */}
      {result.hourlyExp > 0 && (
        <button
          type="button"
          className="tool-header-back"
          onClick={() => onImportHourlyExp(result.hourlyExp)}
          style={importLinkStyle(theme)}
        >
          Import Into Daily/Weekly Calculator →
        </button>
      )}
      {/* Booster and clockwork proc panels are intentionally hidden while the EXP source modeling is refined.
      <div className="exp-results" style={{ marginTop: 14 }}>
        <VisualMetric
          theme={theme}
          icon={<MobSprite id="9834331" size={38} alt="Booster Flame" />}
          label="VIP / HEXA Booster"
          value={formatExpCompact(result.vipBoosterExp)}
          detail={`${formatPercent(percentOfLevel(monster.playerLevel, result.vipBoosterExp))}% EXP gained per proc`}
        />
        <VisualMetric
          theme={theme}
          icon={<ItemIcon id="02639929" size={34} alt="Gilded Clockwork" />}
          label="Gilded Clockwork"
          value={formatExpCompact(result.goldClockworkExp)}
          detail={`${formatPercent(percentOfLevel(monster.playerLevel, result.goldClockworkExp))}% EXP gained per proc`}
        />
      </div>
      */}
    </div>
  );
}

function MiniMetric({ theme, label, value }: { theme: AppTheme; label: string; value: string }) {
  return (
    <div style={{ ...innerCardStyle(theme), padding: "0.85rem" }}>
      <div className="tool-field-label" style={{ color: theme.muted, marginBottom: 5 }}>{label}</div>
      <div style={{ color: theme.text, fontSize: "1.15rem", fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
    </div>
  );
}

function AllInOneTab({ theme, importedHourlyExp }: { theme: AppTheme; importedHourlyExp: number | null }) {
  const styles = toolStyles(theme);
  const inputStyle = fullWidthControl(styles.inputStyle);
  const selectStyle = fullWidthControl(styles.selectStyle);
  const characterDropdownInputStyle: React.CSSProperties = { ...styles.inputStyle, width: "100%" };
  const labelStyle = styles.labelStyle;
  const panelStyle = expPanelStyle(styles);
  const [initial] = useState(() => initialAllInOneState(importedHourlyExp));
  const [input, setInput] = useState<AllInOneInput>(initial.input);
  const [selectedCharName, setSelectedCharName] = useState<string | null>(initial.charName);
  const characters = useMemo(() => selectCharactersList(readCharactersStore()), []);
  const selectedChar = characters.find((character) => character.characterName === selectedCharName);
  const heroicWorld = selectedChar ? worldServerType(selectedChar.worldID) === "heroic" : false;
  // Every Burning type stops accelerating levels at 270 (see `nextLevelAfterGain`), so past that
  // the dropdown is a dead control.
  const burningSpent = input.startLevel >= BURNING_MAX_LEVEL;
  // Neither override is written back to state: both depend on the character, and clobbering the
  // stored pick would lose it for a character the option still applies to.
  const effectiveInput = useMemo(
    () => ({
      ...input,
      ...(heroicWorld && { epicDungeonMultiplier: 1 }),
      ...(burningSpent && { burningType: "" as const }),
    }),
    [input, heroicWorld, burningSpent],
  );
  const result = useMemo(() => calculateAllInOne(effectiveInput), [effectiveInput]);
  const eligibleParks = MONSTER_PARK_OPTIONS.filter((park) => park.minLevel <= input.startLevel);
  const bestPark = bestMonsterParkForLevel(input.startLevel);
  /** Persists to the selected character as part of the state update; manual level stays in memory. */
  const updateInput = (updater: (state: AllInOneInput) => AllInOneInput) => {
    setInput((state) => {
      const next = updater(state);
      if (selectedCharName) {
        writeCharacterToolData(selectedCharName, DAILY_WEEKLY_TOOL_KEY, toSavedAllInOne(next));
      }
      return next;
    });
  };
  const updateNumber = (key: AllInOneNumberKey, value: number) => {
    updateInput((state) => ({ ...state, [key]: value }));
  };
  const toggleDaily = (id: string) => {
    updateInput((state) => ({
      ...state,
      dailyIds: state.dailyIds.includes(id) ? state.dailyIds.filter((dailyId) => dailyId !== id) : [...state.dailyIds, id],
    }));
  };
  const updateWeeklyRun = (id: string, runs: number) => {
    updateInput((state) => ({ ...state, weeklyRuns: { ...state.weeklyRuns, [id]: runs } }));
  };
  const updatePotion = (id: string, qty: number) => {
    updateInput((state) => ({ ...state, potions: { ...state.potions, [id]: qty } }));
  };
  const updateCharacter = (name: string | null) => {
    if (selectedCharName) {
      writeCharacterToolData(selectedCharName, DAILY_WEEKLY_TOOL_KEY, toSavedAllInOne(input));
    }
    setSelectedCharName(name);
    const selected = characters.find((character) => character.characterName === name);
    setInput(selected ? loadCharacterAllInOne(selected) : defaultAllInOneInput());
  };

  return (
    <>
      <div style={panelStyle}>
        <Field label="Character" style={labelStyle}>
          <CharacterDropdown
            theme={theme}
            characters={characters}
            selectedCharName={selectedCharName}
            onCharChange={updateCharacter}
            inputStyle={characterDropdownInputStyle}
            nullOption={{ label: "Manual Level", subtitle: "No character selected" }}
            triggerStyle={{ maxWidth: "none", minWidth: 0, width: "100%" }}
          />
        </Field>
        <div className="exp-grid" style={{ marginTop: 12 }}>
          <NumberField label="Current Level" min={MIN_EXP_LEVEL} max={MAX_EXP_LEVEL - 1} value={input.startLevel} labelStyle={labelStyle} inputStyle={inputStyle} disabled={selectedCharName !== null} onChange={(value) => updateNumber("startLevel", value)} />
          <NumberField label="Current EXP %" min={0} max={99.999} decimal value={input.startPercent} labelStyle={labelStyle} inputStyle={inputStyle} disabled={selectedCharName !== null} onChange={(value) => updateNumber("startPercent", value)} />
          <NumberField label="Target Level" min={MIN_EXP_LEVEL + 1} max={MAX_EXP_LEVEL} value={input.targetLevel} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("targetLevel", value)} />
          <Field label="Burning" style={labelStyle}>
            <select
              className="tool-select"
              value={burningSpent ? "" : input.burningType}
              disabled={burningSpent}
              onChange={(e) => updateInput((state) => ({ ...state, burningType: e.target.value as AllInOneInput["burningType"] }))}
              style={burningSpent ? disabledControl(selectStyle) : selectStyle}
            >
              <option value="">{burningSpent ? "None (past Lv. 270)" : "None"}</option>
              <option value="hyper">Hyper Burning</option>
              <option value="hyperMax">Hyper Burning MAX</option>
              <option value="hyperMaxBeyond">Hyper Burning MAX + Beyond</option>
            </select>
          </Field>
          <DateField label="Start Date" value={input.startDate} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateInput((state) => ({ ...state, startDate: value }))} />
          <DateField label="End Date" value={input.endDate} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateInput((state) => ({ ...state, endDate: value }))} />
        </div>
      </div>

      <div style={panelStyle}>
        <SectionTitle theme={theme} label="Daily Content" />
        {DAILY_REGIONS.map((region) => (
          <div key={region} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            {/* Wide enough for "Arcane River" on one line, with `nowrap` as the backstop: the
                fixed width is what keeps the icon columns aligned across the three regions. */}
            <span className="tool-field-label" style={{ color: theme.muted, width: 104, flexShrink: 0, whiteSpace: "nowrap" }}>{region}</span>
            {/* Deliberately not level-gated: the plan can carry the character past a daily's
                unlock level, and the simulation already skips it until they get there. */}
            {DAILY_EXP_CONTENT.filter((daily) => daily.region === region).map((daily) => {
              const selected = input.dailyIds.includes(daily.id);
              return (
                <HoverTooltip
                  key={daily.id}
                  theme={theme}
                  label={<TileTooltipLabel theme={theme} title={daily.label} detail={`Lv. ${daily.minLevel}`} />}
                >
                  <button
                    type="button"
                    aria-label={`${daily.label} (Lv. ${daily.minLevel})`}
                    aria-pressed={selected}
                    onClick={() => toggleDaily(daily.id)}
                    style={dailyTileStyle(theme, selected)}
                  >
                    <BuffIcon icon={daily.icon} label={daily.label} />
                  </button>
                </HoverTooltip>
              );
            })}
          </div>
        ))}
        <div className="exp-grid" style={{ marginTop: 12 }}>
          <NumberField label="Arcane River Daily Bonus %" min={0} max={100} value={input.arcaneRiverBonus} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("arcaneRiverBonus", value)} />
          <NumberField label="Grandis Daily Bonus %" min={0} max={100} value={input.grandisBonus} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("grandisBonus", value)} />
        </div>
        <div className="exp-grid" style={{ marginTop: 12 }}>
          <Field label="Custom Daily" style={labelStyle}>
            <select
              className="tool-select"
              value={input.customDailyMode}
              onChange={(e) => updateInput((state) => ({ ...state, customDailyMode: e.target.value as AllInOneInput["customDailyMode"] }))}
              style={selectStyle}
            >
              <option value="flat">Flat EXP / Day</option>
              <option value="hourly">Farming Rate</option>
            </select>
          </Field>
          {input.customDailyMode === "flat" ? (
            <NumberField label="Custom Daily EXP" min={0} value={input.customDailyExp} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("customDailyExp", value)} />
          ) : (
            <>
              <NumberField label="Hourly EXP" min={0} value={input.customHourlyExp} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("customHourlyExp", value)} />
              <NumberField label="Hours Farmed / Day" min={0} max={24} step="0.5" value={input.customHoursPerDay} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("customHoursPerDay", value)} />
            </>
          )}
        </div>
      </div>

      <div style={panelStyle}>
        <SectionTitle theme={theme} label="Weekly Content" />
        <div className="exp-tile-row">
          {WEEKLY_EXP_CONTENT.map((weekly) => (
            <IconLevelTile
              key={weekly.id}
              theme={theme}
              icon={weekly.icon}
              ariaLabel={`${weekly.label} runs`}
              tooltip={<TileTooltipLabel theme={theme} title={weekly.label} detail={`Lv. ${weekly.minLevel} · runs / week`} />}
              value={input.weeklyRuns[weekly.id] ?? 0}
              max={3}
              inputStyle={styles.inputStyle}
              onChange={(runs) => updateWeeklyRun(weekly.id, runs)}
            />
          ))}
        </div>
      </div>

      <div className="exp-duo-grid">
        <div style={panelStyle}>
          <SectionTitle theme={theme} label="Monster Park" />
          <div className="exp-grid">
            <Field label="Dungeon" style={labelStyle}>
              <div style={iconRowStyle}>
                <BuffIcon icon={MONSTER_PARK_ICON} label="Monster Park" />
                {/* An unset pick shows the dungeon it resolves to rather than a sentinel option.
                    It stays unset until the player actually changes it, so a plan that levels them
                    into a better dungeon still upgrades on its own. */}
                <select className="tool-select" value={input.monsterParkId || bestPark?.id || ""} onChange={(e) => updateInput((state) => ({ ...state, monsterParkId: e.target.value }))} style={selectStyle}>
                  {eligibleParks.map((park) => <option key={park.id} value={park.id}>{park.label}</option>)}
                </select>
              </div>
            </Field>
            <NumberField label="Runs / Day" min={0} max={7} value={input.monsterParkRuns} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("monsterParkRuns", value)} />
            <NumberField label="Bonus EXP %" min={0} max={100} value={input.monsterParkBonus} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("monsterParkBonus", value)} />
            <Field label="Monster Park Extreme" style={labelStyle}>
              <Toggle theme={theme} label="1 clear / week" checked={input.mpeRuns > 0} onChange={(checked) => updateNumber("mpeRuns", checked ? 1 : 0)} style={{ height: 35, width: "100%" }} />
            </Field>
          </div>
        </div>

        <div style={panelStyle}>
          <SectionTitle theme={theme} label="Epic Dungeon" />
          {/* Heroic worlds have no reward multiplier to buy, so the dropdown drops out. The two
              remaining fields each get their own row: side by side, the long label and the
              stepper's buttons crowd the dungeon dropdown. */}
          <div className={heroicWorld ? "exp-grid exp-epic-grid-solo" : "exp-grid exp-epic-grid"}>
            <Field label="Epic Dungeon" style={labelStyle}>
              <div style={iconRowStyle}>
                <BuffIcon icon={SOL_ERDA_ICON} label="Epic Dungeon" />
                <select className="tool-select" value={input.epicDungeonId} onChange={(e) => updateInput((state) => ({ ...state, epicDungeonId: e.target.value }))} style={selectStyle}>
                  <option value="">No Epic Dungeon</option>
                  {EPIC_DUNGEON_OPTIONS.map((dungeon) => <option key={dungeon.id} value={dungeon.id}>{dungeon.label} (Lv. {dungeon.minLevel})</option>)}
                </select>
              </div>
            </Field>
            {!heroicWorld && (
              <Field label="Reward" style={labelStyle}>
                <select className="tool-select" value={input.epicDungeonMultiplier} onChange={(e) => updateNumber("epicDungeonMultiplier", Number(e.target.value))} style={selectStyle}>
                  <option value={0}>0x</option>
                  <option value={1}>1x</option>
                  <option value={5}>5x</option>
                  <option value={9}>9x</option>
                </select>
              </Field>
            )}
            <NumberField label="Bonus Multiplier (1-4x)" min={1} max={4} step="0.5" value={input.epicDungeonExpMultiplier} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("epicDungeonExpMultiplier", value)} />
          </div>
        </div>
      </div>

      <div className="exp-duo-grid">
        <div style={panelStyle}>
          <SectionTitle theme={theme} label="Events and Tickets" />
          <div className="exp-grid">
            <NumberField label="Strawberry Farm Tickets" icon={{ type: "item", id: "02637501" }} min={0} value={input.strawberryTickets} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("strawberryTickets", value)} />
            <NumberField label="Mechaberry Farm Tickets" icon={{ type: "item", id: "02831285" }} min={0} value={input.mechaberryTickets} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("mechaberryTickets", value)} />
            <NumberField label="Punch King Score / Week" icon={{ type: "item", id: "02637502" }} min={0} max={2050} value={input.punchKingScore} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("punchKingScore", value)} />
            <NumberField label="Express Boosters (Lv. 260+)" icon={EXPRESS_BOOSTER_ICON} min={0} value={input.expressBoosters} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("expressBoosters", value)} />
            <NumberField label="Double Up Points / Week" icon={{ type: "item", id: "04310359" }} min={0} value={input.doubleUpPoints} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("doubleUpPoints", value)} />
            <NumberField label="Luxe Sauna / MVP Resort Hrs" icon={{ type: "mark", id: "mvpResort" }} min={0} decimal value={input.luxeSaunaHours} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("luxeSaunaHours", value)} />
            <NumberField label="EXP Tickets" icon={{ type: "item", id: "02637353" }} min={0} value={input.expTickets} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("expTickets", value)} />
            <NumberField label="Advanced EXP Tickets" icon={{ type: "item", id: "02638500" }} min={0} value={input.advancedExpTickets} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updateNumber("advancedExpTickets", value)} />
          </div>
        </div>

        <div style={panelStyle}>
          <SectionTitle theme={theme} label="Growth Potions" />
          <div className="exp-grid">
            {GROWTH_POTION_OPTIONS.map((potion) => (
              <NumberField key={potion.id} label={`${potion.label} (Lv ${potion.minLevel}-${potion.maxLevel})`} icon={potion.icon} min={0} max={1000} value={input.potions[potion.id] ?? 0} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => updatePotion(potion.id, value)} />
            ))}
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <SectionTitle theme={theme} label="Results" />
        <div className="exp-overview-grid">
          <div style={{ ...innerCardStyle(theme), padding: 14, minWidth: 0 }}>
            <div className="tool-field-label" style={{ color: theme.muted }}>Final Level</div>
            <div style={{ color: theme.text, fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.1, marginTop: 4 }}>
              Lv. {result.level}
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: theme.muted, marginLeft: 8 }}>{formatPercent(result.percent)}%</span>
            </div>
            <div style={{ color: theme.text, fontSize: "0.9rem", fontWeight: 800, marginTop: 10 }}>
              +{formatExpCompact(result.totalExp)} EXP
            </div>
            <div style={{ color: theme.muted, fontSize: "0.75rem", fontWeight: 700, marginTop: 2 }}>
              {formatMesoFull(result.totalExp)} gained from all selected sources
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <ResultRow theme={theme} label={`Target Lv. ${input.targetLevel}`} value={result.reachedTarget ? "Reached" : `${formatExpCompact(result.remainingToTarget)} left`} />
            <ResultRow theme={theme} label="End Date (pre-tickets)" value={`Lv. ${result.endDateLevel} (${formatPercent(result.endDatePercent)}%)`} />
            <ResultRow theme={theme} label="Duration" value={`${result.daysSimulated} days · ${result.weeklyResets} weekly reset${result.weeklyResets === 1 ? "" : "s"}`} />
            <ResultRow theme={theme} label="Projected to Target" value={formatProjectedDays(result.projectedDaysToTarget)} />
          </div>
        </div>
        {result.milestones.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
            {/* Milestone levels strictly increase within a simulation, so level is a unique key. */}
            {result.milestones.slice(0, 24).map((milestone) => (
              <span key={milestone.level} style={milestoneChipStyle(theme)}>
                Lv. {milestone.level} · {formatDate(milestone.date)}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ResultRow({ theme, label, value }: { theme: AppTheme; label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "7px 0", borderBottom: `1px solid ${theme.border}` }}>
      <span className="tool-field-label" style={{ color: theme.muted }}>{label}</span>
      <span style={{ color: theme.text, fontSize: "0.82rem", fontWeight: 800, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ResourcesTab({ theme }: { theme: AppTheme }) {
  const styles = toolStyles(theme);
  const selectStyle = fullWidthControl(styles.selectStyle);
  const panelStyle = expPanelStyle(styles);
  const [tableId, setTableId] = useState(RESOURCE_TABLES[0]?.id ?? "");
  const selected = RESOURCE_TABLES.find((table) => table.id === tableId) ?? RESOURCE_TABLES[0];

  return (
    <div style={panelStyle}>
      <div>
        <Field label="Resource Table" style={styles.labelStyle}>
          <select className="tool-select" value={selected.id} onChange={(e) => setTableId(e.target.value)} style={selectStyle}>
            {RESOURCE_TABLES.map((table) => (
              <option key={table.id} value={table.id}>
                {table.label}
              </option>
            ))}
          </select>
        </Field>
        <div
          style={{
            color: theme.muted,
            fontSize: "0.82rem",
            fontWeight: 700,
            lineHeight: 1.45,
            marginTop: 8,
            overflowWrap: "anywhere",
          }}
        >
          {selected.description}
        </div>
      </div>
      <ResourceTableView theme={theme} table={selected} />
    </div>
  );
}

function ResourceTableView({ theme, table }: { theme: AppTheme; table: ResourceTable }) {
  const thStyle: React.CSSProperties = { ...dataTableTh(theme), textAlign: "right", background: theme.timerBg };
  const tdStyle: React.CSSProperties = { padding: "8px 12px", color: theme.text, fontSize: "0.82rem", fontWeight: 700, textAlign: "right" };
  const levelTdStyle: React.CSSProperties = { ...tdStyle, textAlign: "left", color: theme.accentText, fontWeight: 800 };
  const maxUnits = table.maxUnits;
  const unitsPerHour = table.unitsPerHour;
  // The wrapper is `timerBg`, so the zebra stripe is the lighter `panel` fill.
  const rowStyle = (index: number): React.CSSProperties => ({ background: index % 2 === 1 ? theme.panel : "transparent" });

  return (
    <div style={{ ...innerCardStyle(theme), marginTop: "1rem", overflowX: "auto" }}>
      <table className="exp-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: "left" }}>Level</th>
            {table.kind === "epic" ? (
              <>
                <th style={thStyle}>Base EXP</th>
                <th style={thStyle} title="EXP when the weekly chest rolls the 5x reward tier">5x Reward</th>
                <th style={thStyle} title="EXP when the weekly chest rolls the 9x reward tier">9x Reward</th>
              </>
            ) : (
              <>
                <th style={thStyle}>EXP / Unit</th>
                {maxUnits !== undefined && <th style={thStyle} title={`Total EXP for a full ${maxUnits.toLocaleString()}-unit run`}>{table.maxUnitsLabel ?? "Full Run"}</th>}
                {unitsPerHour !== undefined ? (
                  <>
                    <th style={thStyle} title="Share of this level earned per hour">% / Hour</th>
                    <th style={thStyle} title="Hours needed to gain one full level">Hours / Level</th>
                  </>
                ) : (
                  <>
                    {!table.hidePercentOfLevel && <th style={thStyle} title="Share of this level earned per unit">% of Level</th>}
                    <th style={thStyle} title="Units needed to gain one full level">Units / Level</th>
                  </>
                )}
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {table.kind === "epic"
            ? (table.rows as EpicDungeonRow[]).map((row, index) => (
                <tr key={row.level} style={rowStyle(index)}>
                  <td style={levelTdStyle}>Lv. {row.level}</td>
                  <td style={tdStyle}>{formatMesoFull(row.baseExp)}</td>
                  <td style={tdStyle}>{formatMesoFull(row.fiveXExp)}</td>
                  <td style={tdStyle}>{formatMesoFull(row.nineXExp)}</td>
                </tr>
              ))
            : (table.rows as LevelResourceRow[]).map((row, index) => (
                <tr key={row.level} style={rowStyle(index)}>
                  <td style={levelTdStyle}>Lv. {row.level}</td>
                  <td style={tdStyle}>{formatMesoFull(row.exp)}</td>
                  {maxUnits !== undefined && <td style={tdStyle}>{formatMesoFull(row.exp * maxUnits)}</td>}
                  {!table.hidePercentOfLevel && <td style={tdStyle}>{percentOfLevel(row.level, row.exp * (unitsPerHour ?? 1)).toFixed(4)}%</td>}
                  {unitsPerHour !== undefined ? (
                    <td style={tdStyle}>{(expForLevel(row.level) / Math.max(1, row.exp * unitsPerHour)).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  ) : (
                    <td style={tdStyle}>{Math.ceil(expForLevel(row.level) / Math.max(1, row.exp)).toLocaleString()}</td>
                  )}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionTitle({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <h2 className="tool-panel-title" style={{ color: theme.text }}>
      {label}
    </h2>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  decimal = false,
  icon,
  disabled = false,
  labelStyle,
  inputStyle,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  step?: string;
  decimal?: boolean;
  icon?: IconRef;
  disabled?: boolean;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  onChange: (value: number) => void;
}) {
  // A type="number" input reports a half-typed decimal ("0.") as an empty value, and React
  // re-syncs the box from `value` after every change, so the point is wiped as soon as it is
  // typed and 0.x is unreachable. Decimal fields are text inputs holding the raw keystrokes
  // until they parse; `draft` is null whenever `value` is the source of truth.
  const [draft, setDraft] = useState<string | null>(null);
  const safeValue = Number.isFinite(value) ? value : 0;
  const commonProps = {
    className: "tool-input",
    disabled,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      if (!disabled) e.currentTarget.select();
    },
    style: {
      ...inputStyle,
      opacity: disabled ? 0.65 : inputStyle.opacity,
      cursor: disabled ? "not-allowed" : inputStyle.cursor,
    },
  };
  const input = decimal ? (
    <input
      {...commonProps}
      type="text"
      inputMode="decimal"
      value={draft ?? String(safeValue)}
      onChange={(e) => {
        if (disabled) return;
        const raw = sanitizeDecimal(e.target.value);
        setDraft(raw);
        const parsed = Number(raw);
        if (raw !== "" && Number.isFinite(parsed)) onChange(clampMax(parsed, max));
      }}
      onBlur={() => {
        if (disabled) return;
        const next = Math.max(min, clampMax(Number(draft ?? safeValue) || 0, max));
        setDraft(null);
        onChange(next);
      }}
    />
  ) : (
    <ToolNumberInput
      disabled={disabled}
      value={safeValue}
      min={min}
      max={max}
      step={step}
      onKeyDown={replaceZeroOnDigit}
      onCommit={onChange}
      style={commonProps.style}
    />
  );
  return (
    <Field label={label} style={labelStyle}>
      {icon ? (
        <div style={iconRowStyle}>
          <BuffIcon icon={icon} label={label} />
          {input}
        </div>
      ) : (
        input
      )}
    </Field>
  );
}

function DateField({
  label,
  value,
  labelStyle,
  inputStyle,
  onChange,
}: {
  label: string;
  value: string;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} style={labelStyle}>
      <input
        className="tool-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </Field>
  );
}

function BuffIcon({ icon, label }: { icon?: IconRef; label: string }) {
  if (!icon) return null;
  if (icon.type === "erda-skill") return <ErdaSkillIcon id={icon.id} size={32} alt={label} />;
  if (icon.type === "mark") return <MarkIcon id={icon.id} size={32} alt={label} />;
  if (icon.type === "skill") return <SkillIcon id={icon.id} size={32} alt={label} />;
  if (icon.type === "mob") return <MobSprite id={icon.id} size={32} alt={label} />;
  return <ItemIcon id={icon.id} shadow={icon.shadow} size={32} alt={label} />;
}

/** Vertical icon + level tile, matching the char-flow symbol level inputs. */
function levelTileStyle(theme: AppTheme, active: boolean): React.CSSProperties {
  return {
    width: 74,
    flexShrink: 0,
    border: `1px solid ${active ? theme.accent : theme.border}`,
    background: active ? theme.accentSoft : theme.panel,
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "8px 9px",
  };
}

function tileIconStyle(active: boolean): React.CSSProperties {
  return { opacity: active ? 1 : 0.35, filter: active ? "none" : "grayscale(1)", lineHeight: 0 };
}

function TileTooltipLabel({ theme, title, detail }: { theme: AppTheme; title: string; detail?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span>{title}</span>
      {detail && <span style={{ opacity: 0.7, color: theme.muted }}>{detail}</span>}
    </div>
  );
}

/** Presentational icon + numeric-stepper tile shared by select-buff levels and weekly run counts. */
function IconLevelTile({
  theme,
  icon,
  tooltip,
  ariaLabel,
  value,
  max,
  inputStyle,
  onChange,
}: {
  theme: AppTheme;
  icon?: IconRef;
  tooltip: React.ReactNode;
  ariaLabel: string;
  value: number;
  max: number;
  inputStyle: React.CSSProperties;
  onChange: (value: number) => void;
}) {
  const active = value > 0;
  return (
    <div style={levelTileStyle(theme, active)}>
      <HoverTooltip theme={theme} label={tooltip}>
        <div style={tileIconStyle(active)}>
          <BuffIcon icon={icon} label={ariaLabel} />
        </div>
      </HoverTooltip>
      <ToolNumberInput
        className="tool-input no-spinner"
        min={0}
        max={max}
        integer
        aria-label={ariaLabel}
        value={value}
        onKeyDown={replaceZeroOnDigit}
        onCommit={onChange}
        style={{ ...inputStyle, width: 56, textAlign: "center", padding: "4px 6px" }}
      />
    </div>
  );
}

function SelectLevelTile({
  theme,
  buff,
  value,
  inputStyle,
  onChange,
}: {
  theme: AppTheme;
  buff: (typeof SELECT_BUFFS)[number];
  value: number;
  inputStyle: React.CSSProperties;
  onChange: (value: number) => void;
}) {
  const maxLevel = buff.options.length - 1;
  const level = Math.max(0, buff.options.findIndex((option) => option.value === value));
  return (
    <IconLevelTile
      theme={theme}
      icon={buff.icon}
      ariaLabel={`${buff.label} level`}
      tooltip={<TileTooltipLabel theme={theme} title={buff.label} detail={level > 0 ? buff.options[level].label : undefined} />}
      value={level}
      max={maxLevel}
      inputStyle={inputStyle}
      onChange={(nextLevel) => onChange(buff.options[nextLevel].value)}
    />
  );
}

function ExpNodeTile({
  theme,
  tile,
  selected,
  onToggle,
}: {
  theme: AppTheme;
  tile: (typeof EXP_NODE_TILES)[number];
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <HoverTooltip theme={theme} label={<TileTooltipLabel theme={theme} title={tile.label} detail={tile.detail} />}>
      <button
        type="button"
        aria-label={tile.label}
        aria-pressed={selected}
        onClick={onToggle}
        style={{ ...levelTileStyle(theme, selected), font: "inherit", cursor: "pointer" }}
      >
        <div style={tileIconStyle(selected)}>
          <BuffIcon icon={tile.icon} label={tile.label} />
        </div>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, padding: "4px 0", color: selected ? theme.accentText : theme.muted }}>
          {tile.short}
        </span>
      </button>
    </HoverTooltip>
  );
}

function dailyTileStyle(theme: AppTheme, selected: boolean): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    display: "grid",
    placeItems: "center",
    padding: 0,
    border: `1px solid ${selected ? theme.accent : theme.border}`,
    background: selected ? theme.accentSoft : theme.panel,
    borderRadius: 8,
    cursor: "pointer",
    opacity: selected ? 1 : 0.55,
  };
}

function milestoneChipStyle(theme: AppTheme): React.CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    borderRadius: 999,
    padding: "3px 10px",
    fontSize: "0.75rem",
    fontWeight: 700,
  };
}

function buffButtonStyle(theme: AppTheme, selected: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    border: `1px solid ${selected ? theme.accent : theme.border}`,
    background: selected ? theme.accentSoft : theme.panel,
    color: selected ? theme.accentText : theme.text,
    borderRadius: 8,
    padding: "9px 10px",
    fontSize: "0.75rem",
    fontWeight: 800,
    textAlign: "left",
    cursor: "pointer",
  };
}

function toggleAdditiveBuff(state: BuffState, buff: CheckBuff, checked: boolean): BuffState {
  const additive = { ...state.additive, [buff.id]: checked };
  if (checked) for (const excluded of buff.excludes ?? []) additive[excluded] = false;
  return { ...state, additive };
}

function formatPercent(value: number): string {
  return value.toFixed(3);
}

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "N/A";
  if (hours < 1) return `${Math.ceil(hours * 60)} min`;
  return `${hours.toFixed(2)} hr`;
}

function formatProjectedDays(days: number | null): string {
  if (days === null) return "N/A";
  if (days === 0) return "Reached";
  return `${days.toLocaleString()} day${days === 1 ? "" : "s"}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function localDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function roundToThree(value: number): number {
  return Math.floor(value * 1000) / 1000;
}

function clampMax(value: number, max: number | undefined): number {
  return max === undefined ? value : Math.min(max, value);
}

/** Keeps only what can grow into a number: digits and a single leading decimal point. */
function sanitizeDecimal(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length === 0 ? whole : `${whole}.${rest.join("")}`;
}

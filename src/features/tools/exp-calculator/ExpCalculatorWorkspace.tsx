"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CharacterDropdown } from "../../../components/CharacterSyncPanel";
import { ErdaSkillIcon, ItemIcon, MobSprite, SkillIcon } from "../../../components/ResourceImage";
import { SegmentedToggle } from "../../../components/SegmentedToggle";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import { useMounted } from "../../../lib/useMounted";
import { formatExpCompact, formatMesoFull } from "../format";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { Field } from "../shared-ui";
import { toolStyles } from "../tool-styles";
import {
  CHECK_BUFF_GROUPS,
  DEFAULT_BUFF_STATE,
  INPUT_BUFFS,
  LEVEL_INPUT_BUFFS,
  MAX_EXP_LEVEL,
  MIN_EXP_LEVEL,
  RESOURCE_TABLES,
  SELECT_BUFFS,
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
} from "../../characters/model/charactersStore";

type ExpTab = "buffs" | "all-in-one" | "resources";

const TAB_OPTIONS: ExpTab[] = ["buffs", "all-in-one", "resources"];
const TAB_LABELS: Record<ExpTab, string> = {
  buffs: "Farming Calculator",
  "all-in-one": "Daily / Weekly Calculator",
  resources: "Resources",
};

const DEFAULT_MONSTER: MonsterExpInput = {
  playerLevel: 260,
  currentPercent: 0,
  monsterLevel: 260,
  monsterBaseExp: 680638,
  hourlyKillCount: 18000,
};

const ALL_IN_ONE_RESOURCES = RESOURCE_TABLES.flatMap((table) =>
  table.allInOne ? [{ id: table.id, ...table.allInOne }] : [],
);

const DEFAULT_ALL_IN_ONE: AllInOneInput = {
  startLevel: 260,
  startPercent: 0,
  targetLevel: 270,
  resources: Object.fromEntries(ALL_IN_ONE_RESOURCES.map((resource) => [resource.id, 0])),
  customExp: 0,
};

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
  { title: "Custom Additive Inputs", buffs: INPUT_BUFFS },
];

const iconRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };

function expPanelStyle(styles: ReturnType<typeof toolStyles>): React.CSSProperties {
  return { ...styles.sectionPanel, borderRadius: "14px" };
}

function fullWidthControl(base: React.CSSProperties): React.CSSProperties {
  return { ...base, width: "100%", height: 35 };
}

export default function ExpCalculatorWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();
  const [tab, setTab] = useState<ExpTab>("buffs");
  const panelStyle = expPanelStyle(toolStyles(theme));

  if (!mounted) return null;

  return (
    <div className="page-content">
      <style>{`
        .exp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
        .exp-select-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 12px; }
        .exp-results { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
        .exp-overview-grid { display: grid; grid-template-columns: minmax(240px, 1.1fr) minmax(260px, 1fr); gap: 14px; }
        .exp-table { min-width: 680px; }
        .exp-buff-card { min-height: 48px; }
        .exp-monster-dropdown { scrollbar-width: thin; scrollbar-color: rgba(127,127,127,0.45) transparent; }
        .exp-monster-dropdown::-webkit-scrollbar { width: 8px; }
        .exp-monster-dropdown::-webkit-scrollbar-track { background: transparent; }
        .exp-monster-dropdown::-webkit-scrollbar-thumb { background: rgba(127,127,127,0.45); border-radius: 4px; }
        @media (max-width: 760px) {
          .exp-grid { grid-template-columns: 1fr; }
          .exp-select-grid { grid-template-columns: 1fr; }
          .exp-overview-grid { grid-template-columns: 1fr; }
          .segmented-toggle-track { overflow-x: auto; }
        }
      `}</style>
      <div className="tool-container">
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
          onChange={setTab}
          sectionPanel={panelStyle}
        />

        {tab === "buffs" && <BuffsTab theme={theme} />}
        {tab === "all-in-one" && <AllInOneTab theme={theme} />}
        {tab === "resources" && <ResourcesTab theme={theme} />}
      </div>
    </div>
  );
}

function BuffsTab({ theme }: { theme: AppTheme }) {
  const styles = toolStyles(theme);
  const inputStyle = fullWidthControl(styles.inputStyle);
  const characterDropdownInputStyle: React.CSSProperties = { ...styles.inputStyle, width: "100%" };
  const selectStyle = fullWidthControl(styles.selectStyle);
  const labelStyle = styles.labelStyle;
  const panelStyle = expPanelStyle(styles);
  const [monster, setMonster] = useState<MonsterExpInput>(DEFAULT_MONSTER);
  const [selectedCharName, setSelectedCharName] = useState<string | null>(null);
  const [selectedMonster, setSelectedMonster] = useState<ExpMonster | null>(null);
  const [buffs, setBuffs] = useState<BuffState>(DEFAULT_BUFF_STATE);
  const result = useMemo(() => calculateMonsterExp(monster, buffs), [monster, buffs]);
  const characters = useMemo(() => selectCharactersList(readCharactersStore()), []);
  const updateExclusiveBuff = (groupId: string, buffId: string) => {
    setBuffs((state) => ({ ...state, exclusive: { ...state.exclusive, [groupId]: buffId } }));
  };
  const updateInputBuff = (buff: InputBuff, raw: number) => {
    const value = Math.min(buff.max, Math.max(0, raw));
    setBuffs((state) => ({ ...state, inputs: { ...state.inputs, [buff.id]: value } }));
  };
  const updateCharacter = (name: string | null) => {
    setSelectedCharName(name);
    const selected = characters.find((character) => character.characterName === name);
    if (!selected) return;
    setMonster((state) => ({
      ...state,
      playerLevel: selected.level,
      currentPercent: roundToThree(Math.min(99.999, Math.max(0, percentOfLevel(selected.level, selected.exp)))),
    }));
  };
  const updateSelectedMonster = (option: ExpMonster) => {
    setSelectedMonster(option);
    setMonster((state) => ({
      ...state,
      monsterLevel: option.level,
      monsterBaseExp: option.exp,
    }));
  };

  return (
    <>
      <div className="fade-in" style={panelStyle}>
        <SectionTitle theme={theme} label="Character" />
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
          <NumberField label="Current EXP %" min={0} max={99.999} step="0.001" value={monster.currentPercent} labelStyle={labelStyle} inputStyle={inputStyle} disabled={selectedCharName !== null} onChange={(value) => setMonster((state) => ({ ...state, currentPercent: value }))} />
          <NumberField label="Hourly Kill Count" min={0} value={monster.hourlyKillCount} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => setMonster((state) => ({ ...state, hourlyKillCount: value }))} />
        </div>
      </div>

      <div className="fade-in" style={panelStyle}>
        <SectionTitle theme={theme} label="Monster" />
        <MonsterSelector
          theme={theme}
          selected={selectedMonster}
          inputStyle={inputStyle}
          onSelect={updateSelectedMonster}
        />
        <div className="exp-grid" style={{ marginTop: 12 }}>
          <NumberField label="Monster Level" min={1} max={MAX_EXP_LEVEL} value={monster.monsterLevel} labelStyle={labelStyle} inputStyle={inputStyle} disabled onChange={() => undefined} />
          <NumberField label="Monster Base EXP" min={0} value={monster.monsterBaseExp} labelStyle={labelStyle} inputStyle={inputStyle} disabled onChange={() => undefined} />
        </div>
      </div>

      {EXCLUSIVE_BUFF_SECTIONS.map((section) => (
        <div key={section.title} className="fade-in" style={panelStyle}>
          <SectionTitle theme={theme} label={section.title} />
          <div className="exp-grid">
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

      {ADDITIVE_GROUP && (
        <div className="fade-in" style={panelStyle}>
          <SectionTitle theme={theme} label={ADDITIVE_GROUP.section} />
          <div className="exp-grid">
            {ADDITIVE_GROUP.buffs.map((buff) => (
              <label key={buff.id} className="exp-buff-card panel-card" style={buffButtonStyle(theme, Boolean(buffs.additive[buff.id]))}>
                <input
                  type="checkbox"
                  checked={Boolean(buffs.additive[buff.id])}
                  onChange={(e) => setBuffs((state) => toggleAdditiveBuff(state, buff, e.target.checked))}
                />
                <BuffIcon icon={buff.icon} label={buff.label} />
                <span>{buff.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="fade-in" style={panelStyle}>
        <SectionTitle theme={theme} label="Selectable Buffs" />
        <div className="exp-select-grid">
          {SELECT_BUFFS.map((buff) => (
            <Field key={buff.id} label={buff.label} style={labelStyle}>
              <div style={iconRowStyle}>
                <BuffIcon icon={buff.icon} label={buff.label} />
                <select
                  className="tool-select"
                  value={buffs.selects[buff.id] ?? 0}
                  onChange={(e) => setBuffs((state) => ({ ...state, selects: { ...state.selects, [buff.id]: Number(e.target.value) } }))}
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

      {INPUT_BUFF_PANELS.map((panel) => (
        <div key={panel.title} className="fade-in" style={panelStyle}>
          <SectionTitle theme={theme} label={panel.title} />
          <div className="exp-grid">
            {panel.buffs.map((buff) => (
              <Field key={buff.id} label={buff.label} style={labelStyle}>
                <div style={iconRowStyle}>
                  <BuffIcon icon={buff.icon} label={buff.label} />
                  <input
                    className="tool-input"
                    type="number"
                    min={0}
                    max={buff.max}
                    step={buff.step ?? 1}
                    value={buffs.inputs[buff.id] ?? 0}
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={replaceZeroOnDigit}
                    onChange={(e) => updateInputBuff(buff, Number(e.target.value) || 0)}
                    style={inputStyle}
                  />
                </div>
              </Field>
            ))}
          </div>
        </div>
      ))}

      <ExpOverviewPanel theme={theme} monster={monster} selectedMonster={selectedMonster} result={result} />
    </>
  );
}

function MonsterSelector({
  theme,
  selected,
  inputStyle,
  onSelect,
}: {
  theme: AppTheme;
  selected: ExpMonster | null;
  inputStyle: React.CSSProperties;
  onSelect: (monster: ExpMonster) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const positionMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    const reposition = () => positionMenu();
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EXP_MONSTERS.slice(0, 60);
    return EXP_MONSTERS.filter((monster) => monster.search.includes(q)).slice(0, 80);
  }, [search]);

  const choose = (monster: ExpMonster) => {
    onSelect(monster);
    setSearch(monster.name);
    setOpen(false);
  };

  const openMenu = (clearSearch = false) => {
    if (clearSearch) setSearch("");
    positionMenu();
    setOpen(true);
  };

  const menu = open && menuPos && typeof document !== "undefined" && createPortal(
    <div
      ref={menuRef}
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
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        padding: 4,
      }}
    >
      {filtered.length === 0 && <DropdownMessage theme={theme} text="No monsters found." />}
      {filtered.map((monster) => (
        <button
          key={monster.key}
          type="button"
          onClick={() => choose(monster)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 9px",
            border: "none",
            background: "transparent",
            color: theme.text,
            cursor: "pointer",
            textAlign: "left",
            borderRadius: 8,
          }}
        >
          <MobSprite id={monster.id} size={32} alt={monster.name} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 800 }}>{monster.name}</span>
            <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: theme.muted }}>
              Lv. {monster.level} | {monster.area}
            </span>
          </span>
        </button>
      ))}
    </div>,
    document.body,
  );

  return (
    <div style={{ position: "relative" }}>
      <div ref={triggerRef} className="tool-input" style={{ ...inputStyle, height: 46, display: "flex", alignItems: "center", gap: 8 }}>
        {selected && <MobSprite id={selected.id} size={30} alt={selected.name} />}
        <input
          value={open ? search : selected?.name ?? search}
          placeholder="Search monster name"
          onFocus={() => openMenu(!open)}
          onChange={(e) => {
            setSearch(e.target.value);
            openMenu();
          }}
          style={{
            border: "none",
            background: "transparent",
            outline: "none",
            color: theme.text,
            width: "100%",
            fontFamily: "var(--font-body)",
            fontWeight: 700,
          }}
        />
        <span
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

function DropdownMessage({ theme, text }: { theme: AppTheme; text: string }) {
  return <div style={{ padding: "9px 10px", color: theme.muted, fontSize: "0.8rem", fontWeight: 700 }}>{text}</div>;
}

function ExpOverviewPanel({
  theme,
  monster,
  selectedMonster,
  result,
}: {
  theme: AppTheme;
  monster: MonsterExpInput;
  selectedMonster: ExpMonster | null;
  result: MonsterExpResult;
}) {
  const panelStyle = expPanelStyle(toolStyles(theme));
  const visualCardStyle: React.CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    padding: "14px",
    display: "grid",
    gridTemplateColumns: "96px 1fr",
    gap: 14,
    alignItems: "center",
    minWidth: 0,
  };
  return (
    <div className="fade-in" style={panelStyle}>
      <SectionTitle theme={theme} label="Overview" />
      <div className="exp-overview-grid">
        <div style={visualCardStyle}>
          <div style={{ width: 96, minHeight: 104, display: "grid", placeItems: "center" }}>
            {selectedMonster ? <MobSprite id={selectedMonster.id} size={96} alt={selectedMonster.name} /> : <span style={{ color: theme.muted, fontSize: "0.72rem", fontWeight: 800 }}>Mob</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: theme.text, fontSize: "0.95rem", fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedMonster?.name ?? "Select a monster"}
            </div>
            <div style={{ color: theme.muted, fontSize: "0.76rem", fontWeight: 800, marginTop: 3 }}>
              Lv. {monster.monsterLevel} | Base {formatMesoFull(monster.monsterBaseExp)} EXP
            </div>
            <div style={{ color: theme.text, fontSize: "1.1rem", fontWeight: 900, marginTop: 8 }}>
              {formatExpCompact(result.normalExp)}
            </div>
            <div className="tool-field-label" style={{ color: theme.muted, marginTop: 2 }}>
              Final kill EXP
            </div>
          </div>
        </div>
        <div className="exp-results">
          <MiniMetric theme={theme} label="Hours to Next Level" value={formatHours(result.hoursToNextLevel)} />
          <MiniMetric theme={theme} label="Hourly EXP" value={formatExpCompact(result.hourlyExp)} />
          <MiniMetric theme={theme} label="Total Multiplier" value={`${result.buffMultiplier.toFixed(3)}x`} />
          <MiniMetric theme={theme} label="Level Bonus" value={`${result.monsterLevelBonus.toFixed(2)}x`} />
        </div>
      </div>
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
    <div className="panel-card" style={{ background: theme.panel, border: `1px solid ${theme.border}`, padding: "0.85rem" }}>
      <div className="tool-field-label" style={{ color: theme.muted, marginBottom: 5 }}>{label}</div>
      <div style={{ color: theme.text, fontSize: "1.08rem", fontWeight: 900, lineHeight: 1.15 }}>{value}</div>
    </div>
  );
}

function AllInOneTab({ theme }: { theme: AppTheme }) {
  const styles = toolStyles(theme);
  const inputStyle = fullWidthControl(styles.inputStyle);
  const labelStyle = styles.labelStyle;
  const panelStyle = expPanelStyle(styles);
  const [input, setInput] = useState<AllInOneInput>(DEFAULT_ALL_IN_ONE);
  const result = useMemo(() => calculateAllInOne(input), [input]);

  return (
    <>
      <div className="fade-in" style={panelStyle}>
        <SectionTitle theme={theme} label="Starting Point" />
        <div className="exp-grid">
          <NumberField label="Current Level" min={MIN_EXP_LEVEL} max={MAX_EXP_LEVEL - 1} value={input.startLevel} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => setInput((state) => ({ ...state, startLevel: value }))} />
          <NumberField label="Current EXP %" min={0} max={99.999} step="0.001" value={input.startPercent} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => setInput((state) => ({ ...state, startPercent: value }))} />
          <NumberField label="Target Level" min={MIN_EXP_LEVEL + 1} max={MAX_EXP_LEVEL} value={input.targetLevel} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => setInput((state) => ({ ...state, targetLevel: value }))} />
          <NumberField label="Custom EXP" min={0} value={input.customExp} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => setInput((state) => ({ ...state, customExp: value }))} />
        </div>
      </div>

      <div className="fade-in" style={panelStyle}>
        <SectionTitle theme={theme} label="Resource Quantities" />
        <div className="exp-grid">
          {ALL_IN_ONE_RESOURCES.map((resource) => (
            <NumberField key={resource.id} label={resource.label} min={0} max={resource.max} value={input.resources[resource.id] ?? 0} labelStyle={labelStyle} inputStyle={inputStyle} onChange={(value) => setInput((state) => ({ ...state, resources: { ...state.resources, [resource.id]: value } }))} />
          ))}
        </div>
      </div>

      <div className="exp-results fade-in">
        <MetricCard theme={theme} label="Resource EXP" value={formatExpCompact(result.totalExp)} detail={formatMesoFull(result.totalExp)} />
        <MetricCard theme={theme} label="After Resources" value={`Lv. ${result.level}`} detail={`${result.percent.toFixed(4)}%`} />
        <MetricCard theme={theme} label="Target Remaining" value={formatExpCompact(result.remainingToTarget)} detail={`To Lv. ${input.targetLevel}`} />
      </div>
    </>
  );
}

function ResourcesTab({ theme }: { theme: AppTheme }) {
  const styles = toolStyles(theme);
  const selectStyle = fullWidthControl(styles.selectStyle);
  const panelStyle = expPanelStyle(styles);
  const [tableId, setTableId] = useState(RESOURCE_TABLES[0]?.id ?? "");
  const selected = RESOURCE_TABLES.find((table) => table.id === tableId) ?? RESOURCE_TABLES[0];

  return (
    <div className="fade-in" style={panelStyle}>
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
            fontSize: "0.8rem",
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
  const thStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: `2px solid ${theme.border}`, color: theme.muted, fontSize: "0.75rem", fontWeight: 800, textAlign: "right", textTransform: "uppercase" };
  const tdStyle: React.CSSProperties = { padding: "8px 10px", borderBottom: `1px solid ${theme.border}`, color: theme.text, fontSize: "0.8rem", fontWeight: 700, textAlign: "right" };
  const maxUnits = table.allInOne?.max;

  return (
    <div className="panel-card" style={{ marginTop: "1rem", background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, overflowX: "auto" }}>
      <table className="exp-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: "left" }}>Level</th>
            {table.kind === "epic" ? (
              <>
                <th style={thStyle}>Base EXP</th>
                <th style={thStyle}>5x EXP</th>
                <th style={thStyle}>9x EXP</th>
              </>
            ) : (
              <>
                <th style={thStyle}>EXP</th>
                {maxUnits !== undefined && <th style={thStyle}>{maxUnits} Points</th>}
                <th style={thStyle}>% TNL</th>
                <th style={thStyle}>To Level</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {table.kind === "epic"
            ? (table.rows as EpicDungeonRow[]).map((row) => (
                <tr key={row.level}>
                  <td style={{ ...tdStyle, textAlign: "left", color: theme.accent }}>Lv. {row.level}</td>
                  <td style={tdStyle}>{formatMesoFull(row.baseExp)}</td>
                  <td style={tdStyle}>{formatMesoFull(row.fiveXExp)}</td>
                  <td style={tdStyle}>{formatMesoFull(row.nineXExp)}</td>
                </tr>
              ))
            : (table.rows as LevelResourceRow[]).map((row) => (
                <tr key={row.level}>
                  <td style={{ ...tdStyle, textAlign: "left", color: theme.accent }}>Lv. {row.level}</td>
                  <td style={tdStyle}>{formatMesoFull(row.exp)}</td>
                  {maxUnits !== undefined && <td style={tdStyle}>{formatMesoFull(row.exp * maxUnits)}</td>}
                  <td style={tdStyle}>{percentOfLevel(row.level, row.exp).toFixed(6)}%</td>
                  <td style={tdStyle}>{Math.ceil(expForLevel(row.level) / Math.max(1, row.exp)).toLocaleString()}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionTitle({ theme, label }: { theme: AppTheme; label: string }) {
  return (
    <div className="tool-field-label" style={{ color: theme.muted, marginBottom: "12px", fontSize: "0.78rem" }}>
      {label}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
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
  disabled?: boolean;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} style={labelStyle}>
      <input
        className="tool-input"
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onFocus={(e) => {
          if (!disabled) e.currentTarget.select();
        }}
        onKeyDown={replaceZeroOnDigit}
        onChange={(e) => {
          if (!disabled) onChange(Number(e.target.value) || 0);
        }}
        style={{
          ...inputStyle,
          background: disabled ? inputStyle.background ?? "rgba(120, 120, 120, 0.12)" : inputStyle.background,
          opacity: disabled ? 0.65 : inputStyle.opacity,
          cursor: disabled ? "not-allowed" : inputStyle.cursor,
        }}
      />
    </Field>
  );
}

function MetricCard({ theme, label, value, detail }: { theme: AppTheme; label: string; value: string; detail: string }) {
  return (
    <div className="panel-card" style={{ background: theme.panel, border: `1px solid ${theme.border}`, padding: "1rem" }}>
      <div className="tool-field-label" style={{ color: theme.muted, marginBottom: "6px" }}>
        {label}
      </div>
      <div style={{ color: theme.text, fontSize: "1.25rem", fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
      <div style={{ color: theme.muted, fontSize: "0.75rem", fontWeight: 700, marginTop: "4px" }}>{detail}</div>
    </div>
  );
}

function BuffIcon({ icon, label }: { icon?: IconRef; label: string }) {
  if (!icon) return null;
  if (icon.type === "erda-skill") return <ErdaSkillIcon id={icon.id} size={32} alt={label} />;
  if (icon.type === "skill") return <SkillIcon id={icon.id} size={32} alt={label} />;
  return <ItemIcon id={icon.id} shadow={icon.shadow} size={32} alt={label} />;
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
    fontSize: "0.78rem",
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

function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "N/A";
  if (hours < 1) return `${Math.ceil(hours * 60)} min`;
  return `${hours.toFixed(2)} hr`;
}

function roundToThree(value: number): number {
  return Math.floor(value * 1000) / 1000;
}

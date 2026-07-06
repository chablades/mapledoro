"use client";

import { useState, useEffect, useRef } from "react";
import { numericKeyDown, clampNumber } from "../../../../lib/inputUtils";
import { useKeyboardListNav } from "../../../../lib/useKeyboardListNav";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import HoverTooltip from "../../../../components/HoverTooltip";
import type { SetupStepDefinition } from "../steps";
import type { SetupFlowId } from "../flows";
import type { HexaClassDef, HexaSkillDef, HexaSkillLevels } from "../../../../features/tools/hexa-skills/hexa-classes";
import { findClassById, COMMON_SKILLS } from "../../../../features/tools/hexa-skills/hexa-classes";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import { getClassDataByNexonJobName } from "../data/classSkillData";
import type { HexaStatEntry, HexaStatSlot, HexaStatNode } from "../data/hexaStatData";
import { HEXA_STAT_OPTIONS, getHexaStatBonus, getMainStatLabel, getAttackLabel } from "../data/hexaStatData";
import { readCharacterToolData } from "../../../../features/tools/characterToolStorage";
import SetupStepFrame from "./SetupStepFrame";
import { HexaSkillIcon } from "../../../../components/ResourceImage";

interface HexaMatrixSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  flowId?: SetupFlowId;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  direction?: "forward" | "backward";
  characterRoster?: import("../../model/charactersStore").StoredCharacterRecord[];
  confirmedWorldId?: number;
  worldLinkSkills?: string;
  characterLevel?: number;
  confirmedCharacterName?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

const MAX_LEVEL = 30;
// TODO: update with actual Hexa Stat entry max level once confirmed
const MAX_STAT_ENTRY_LEVEL = 10;

// Each HEXA Stat node holds two presets in-game: an active and a stored "saved" config.
const PRESET_LABELS = ["Active", "Stored"] as const;

// hexa-skill ids from manifests/v268/hexa-skill.json (section: "hexaStat")
const HEXA_STAT_DEFS: HexaSkillDef[] = [
  { iconId: "50000000", name: "Hexa Stat I" },
  { iconId: "50000001", name: "Hexa Stat II" },
  { iconId: "50000002", name: "Hexa Stat III" },
];

const sectionBtnStyle: React.CSSProperties = {
  background: "none", border: "none", padding: 0, font: "inherit",
  fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase",
  cursor: "pointer",
};

const levelRowInputStyle = (theme: AppTheme): React.CSSProperties => ({
  width: "2.2rem",
  border: `1px solid ${theme.border}`,
  borderRadius: "6px",
  background: theme.bg,
  color: theme.text,
  fontFamily: "inherit",
  fontSize: "0.82rem",
  fontWeight: 700,
  padding: "0.25rem 0.35rem",
  textAlign: "center",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  transition: "outline-color 0.15s ease",
});

const hexaTileStyle = (theme: AppTheme, filled: boolean): React.CSSProperties => ({
  width: 60, flexShrink: 0,
  border: `1px solid ${filled ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: filled ? `${theme.accent}15` : theme.bg,
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "6px 4px", boxSizing: "border-box",
});

const hexaTileInputStyle = (theme: AppTheme): React.CSSProperties => ({
  width: 44, textAlign: "center",
  border: `1px solid ${theme.border}`, borderRadius: 6,
  background: theme.bg, color: theme.text,
  fontFamily: "inherit", fontWeight: 700, fontSize: "0.78rem",
  padding: "0.2rem", boxSizing: "border-box",
  outline: "2px solid transparent", outlineOffset: "2px",
  transition: "outline-color 0.15s ease",
});

const statDropdownMenuStyle = (theme: AppTheme): React.CSSProperties => ({
  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 310,
  borderRadius: "8px", overflow: "hidden",
  border: `1px solid ${theme.accent}`, background: theme.panel,
  boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
});

const statDropdownClearRowStyle = (theme: AppTheme): React.CSSProperties => ({
  display: "block", width: "100%", padding: "0.3rem 0.6rem",
  background: "transparent", border: "none", borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit",
  fontSize: "0.75rem", fontWeight: 600, color: theme.muted, textAlign: "left",
});

function statDropdownOptionBackground(theme: AppTheme, isSelected: boolean, isHighlighted: boolean): string {
  if (isSelected) return `${theme.accent}33`;
  if (isHighlighted) return `${theme.accent}22`;
  return "transparent";
}

const statDropdownOptionStyle = (theme: AppTheme, isSelected: boolean, isDisabled: boolean, isHighlighted: boolean): React.CSSProperties => ({
  display: "block", width: "100%", textAlign: "left",
  padding: "0.35rem 0.6rem", border: "none",
  borderBottom: `1px solid ${theme.border}`,
  background: statDropdownOptionBackground(theme, isSelected, isHighlighted),
  color: isDisabled ? theme.muted : theme.text,
  fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 700,
  cursor: isDisabled ? "default" : "pointer",
  opacity: isDisabled ? 0.4 : 1,
});

const presetToggleButtonStyle = (theme: AppTheme, isActive: boolean): React.CSSProperties => ({
  border: "none", borderRadius: "6px", cursor: "pointer",
  padding: "0.25rem 0.7rem", fontFamily: "inherit",
  fontSize: "0.78rem", fontWeight: 700,
  color: isActive ? "#fff" : theme.muted,
  background: isActive ? theme.accent : "transparent",
});

function emptyEntry(): HexaStatEntry { return { type: "", level: 0 }; }
function emptySlot(): HexaStatSlot { return { main: emptyEntry(), alt: [emptyEntry(), emptyEntry()] }; }
function emptyNode(): HexaStatNode { return { presets: [emptySlot(), emptySlot()], activePreset: 0 }; }

function isSlotEmpty(slot: HexaStatSlot): boolean {
  return !slot.main.type && !slot.alt[0].type && !slot.alt[1].type &&
    slot.main.level === 0 && slot.alt[0].level === 0 && slot.alt[1].level === 0;
}

function isNodeEmpty(node: HexaStatNode): boolean {
  return isSlotEmpty(node.presets[0]) && isSlotEmpty(node.presets[1]);
}

// Node 0 is always accessible (HEXA Matrix implies 6th job). Nodes 1 and 2 have character level gates.
function isNodeUnlocked(index: number, characterLevel: number): boolean {
  if (index === 1) return characterLevel >= 265;
  if (index === 2) return characterLevel >= 270;
  return true;
}

function lockHint(index: number): string {
  return index === 1 ? "Lv. 265" : "Lv. 270";
}

// Returns stat types that must be disabled for the main stat dropdown of the given slot.
// Rule 1: types already primary on another node. Rule 2: types already chosen as alts in this node.
function getMainDisabledTypes(
  hexaStat: [HexaStatSlot, HexaStatSlot, HexaStatSlot],
  slotIndex: number
): Set<string> {
  const slot = hexaStat[slotIndex];
  const disabled = new Set<string>();
  hexaStat.forEach((s, i) => { if (i !== slotIndex && s.main.type) disabled.add(s.main.type); });
  if (slot.alt[0].type) disabled.add(slot.alt[0].type);
  if (slot.alt[1].type) disabled.add(slot.alt[1].type);
  return disabled;
}

// Returns stat types that must be disabled for an alt stat dropdown.
// Rule 2: main + sibling alt in this node. Rule 3: types that already appear as alt on 2 other positions.
function getAltDisabledTypes(
  hexaStat: [HexaStatSlot, HexaStatSlot, HexaStatSlot],
  slotIndex: number,
  altIndex: number
): Set<string> {
  const slot = hexaStat[slotIndex];
  const siblingAlt = slot.alt[altIndex === 0 ? 1 : 0];
  const disabled = new Set<string>();
  if (slot.main.type) disabled.add(slot.main.type);
  if (siblingAlt.type) disabled.add(siblingAlt.type);
  // Count alt appearances excluding the current position
  const counts: Record<string, number> = {};
  hexaStat.forEach((s, si) => s.alt.forEach((a, ai) => {
    if ((si !== slotIndex || ai !== altIndex) && a.type) counts[a.type] = (counts[a.type] ?? 0) + 1;
  }));
  Object.entries(counts).forEach(([type, n]) => { if (n >= 2) disabled.add(type); });
  return disabled;
}

function parseEntry(raw: unknown): HexaStatEntry {
  if (!raw || typeof raw !== "object") return emptyEntry();
  const r = raw as Partial<HexaStatEntry>;
  return {
    type: typeof r.type === "string" ? r.type : "",
    level: Math.max(0, Math.min(MAX_STAT_ENTRY_LEVEL, Math.round(Number(r.level)) || 0)),
  };
}

function parseSlot(raw: unknown): HexaStatSlot {
  if (!raw || typeof raw !== "object") return emptySlot();
  const r = raw as Partial<HexaStatSlot>;
  const altRaw = Array.isArray(r.alt) ? r.alt : [];
  return { main: parseEntry(r.main), alt: [parseEntry(altRaw[0]), parseEntry(altRaw[1])] };
}

function parseNode(raw: unknown): HexaStatNode {
  if (!raw || typeof raw !== "object") return emptyNode();
  const r = raw as Partial<HexaStatNode> & Partial<HexaStatSlot>;
  // New shape: { presets, activePreset }
  if (Array.isArray(r.presets)) {
    return {
      presets: [parseSlot(r.presets[0]), parseSlot(r.presets[1])],
      activePreset: r.activePreset === 1 ? 1 : 0,
    };
  }
  // Legacy shape: a bare HexaStatSlot ({ main, alt }) → migrate into the active preset.
  return { presets: [parseSlot(raw), emptySlot()], activePreset: 0 };
}

// The step's working draft carries both systems in one JSON value: the 6th-job
// skill levels (persisted to tools.hexaSkills) plus the HEXA Stat nodes (persisted
// separately to tools.hexaStat). The controller splits them on save.
type HexaDraft = HexaSkillLevels & { hexaStat: [HexaStatNode, HexaStatNode, HexaStatNode] };

function emptyLevels(classDef: HexaClassDef): HexaDraft {
  return {
    origin: 1,
    mastery: classDef.mastery.map(() => 0),
    enhancement: classDef.enhancement.map(() => 0),
    common: COMMON_SKILLS.map(() => 0),
    ascent: 0,
    hexaStat: [emptyNode(), emptyNode(), emptyNode()],
  };
}

function parseDraft(raw: string, classDef: HexaClassDef): HexaDraft {
  const empty = emptyLevels(classDef);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<HexaDraft>;
    if (!parsed || typeof parsed !== "object") return empty;
    const pad = (arr: unknown, len: number): number[] => {
      const a = Array.isArray(arr) ? arr : [];
      const result = a.slice(0, len).map((v) => clampNumber(Number(v), MAX_LEVEL));
      while (result.length < len) result.push(0);
      return result;
    };
    const rawSlots = Array.isArray(parsed.hexaStat) ? parsed.hexaStat : [];
    return {
      origin: Math.max(1, clampNumber(Number(parsed.origin) || 1, MAX_LEVEL)),
      mastery: pad(parsed.mastery, classDef.mastery.length),
      enhancement: pad(parsed.enhancement, classDef.enhancement.length),
      common: pad(parsed.common, COMMON_SKILLS.length),
      ascent: clampNumber(Number(parsed.ascent) || 0, MAX_LEVEL),
      hexaStat: [parseNode(rawSlots[0]), parseNode(rawSlots[1]), parseNode(rawSlots[2])],
    };
  } catch { return empty; }
}

function SkillIcon({ skill, size = 28 }: { skill: HexaSkillDef; size?: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const src = skill.iconUrl ?? (skill.iconId !== "" ? resourceImageUrl("hexa-skill", skill.iconId, "icon.png") : null);
  return (
    <>
      <div ref={wrapperRef} style={{ flexShrink: 0 }}>
        <Image src={src ?? ""} alt={skill.name} width={size} height={size} unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "block";
          }}
          style={{ borderRadius: "5px", display: "block" }}
        />
      </div>
      <div ref={fallbackRef} style={{ display: "none", width: size, height: size, borderRadius: "5px", flexShrink: 0 }} />
    </>
  );
}

function LevelInput({ value, onChange, theme, min = 0, max = MAX_LEVEL, label }: { value: number; onChange: (v: number) => void; theme: AppTheme; min?: number; max?: number; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={value === 0 ? "" : String(value)}
        placeholder={String(min)}
        onChange={(e) => onChange(clampNumber(Number(e.target.value) || 0, max, min))}
        onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
        onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
        onKeyDown={numericKeyDown}
        style={levelRowInputStyle(theme)}
      />
      <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>/ {max}</span>
    </div>
  );
}

function SectionLabel({ label, theme, onMaxAll, onClear }: { label: string; theme: AppTheme; onMaxAll?: () => void; onClear?: () => void }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      marginBottom: "0.45rem", paddingBottom: "0.25rem", borderBottom: `1px solid ${theme.border}`,
    }}>
      <p style={{
        margin: 0,
        fontSize: "0.75rem",
        fontWeight: 800,
        color: theme.muted,
        letterSpacing: "0.05em",
        textTransform: "uppercase" as const,
      }}>
        {label}
      </p>
      {(onMaxAll || onClear) && (
        <div style={{ display: "flex", gap: "1rem" }}>
          {onClear && (
            <button type="button" onClick={onClear} style={{ ...sectionBtnStyle, color: theme.muted }}>
              Clear
            </button>
          )}
          {onMaxAll && (
            <button type="button" onClick={onMaxAll} style={{ ...sectionBtnStyle, color: theme.accent }}>
              Max All
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Condensed icon tile: icon + level input, full skill name(s) shown via tooltip on hover/tap. */
function HexaTile({ skill, level, onUpdate, theme, min = 0, max = MAX_LEVEL }: {
  skill: HexaSkillDef;
  level: number;
  onUpdate: (v: number) => void;
  theme: AppTheme;
  min?: number;
  max?: number;
}) {
  const filled = level > 0;
  return (
    <HoverTooltip label={skill.name} theme={theme} style={hexaTileStyle(theme, filled)}>
      <div style={{ opacity: filled ? 1 : 0.5, filter: filled ? "none" : "grayscale(1)", lineHeight: 0 }}>
        <SkillIcon skill={skill} size={28} />
      </div>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${skill.name} level`}
        value={level === 0 ? "" : String(level)}
        placeholder={String(min)}
        onChange={(e) => onUpdate(clampNumber(Number(e.target.value) || 0, max, min))}
        onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
        onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
        onKeyDown={numericKeyDown}
        style={hexaTileInputStyle(theme)}
      />
    </HoverTooltip>
  );
}

function StatDropdown({ value, options, onChange, theme, isError, disabledTypes }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  theme: AppTheme;
  isError?: boolean;
  disabledTypes: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: options,
    resetKey: open,
    isDisabled: (o) => disabledTypes.has(o.value),
    onSelect: (o) => { onChange(o.value); setOpen(false); },
  });

  const selected = options.find((o) => o.value === value);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); return; }
    if ((e.key === "Backspace" || e.key === "Delete") && selected) {
      e.preventDefault();
      onChange("");
      setOpen(false);
      return;
    }
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); }
      return;
    }
    navKeyDown(e);
  }
  const triggerStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem",
    flex: 1, minWidth: 0, width: "100%",
    border: `1px solid ${isError ? "#ef4444" : theme.border}`,
    borderRadius: "6px", background: theme.bg,
    color: selected ? theme.text : theme.muted,
    fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 700,
    padding: "0.25rem 0.5rem", cursor: "pointer",
    outline: "2px solid transparent", outlineOffset: "2px",
    transition: "outline-color 0.15s ease",
  };

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        onKeyDown={handleTriggerKeyDown}
        onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
        onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
        style={triggerStyle}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.label ?? "Select stat…"}
        </span>
        <span style={{ fontSize: "0.75rem", flexShrink: 0, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div style={statDropdownMenuStyle(theme)}>
          {selected && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              style={statDropdownClearRowStyle(theme)}
            >
              — Clear —
            </button>
          )}
          {options.map((o, i) => {
            const isDisabled = disabledTypes.has(o.value);
            const isSelected = o.value === value;
            const isHighlighted = i === highlightedIndex;
            return (
              <button
                key={o.value}
                ref={itemRef(i)}
                type="button"
                disabled={isDisabled}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={statDropdownOptionStyle(theme, isSelected, isDisabled, isHighlighted)}
                onMouseEnter={(e) => { if (!isDisabled && !isSelected) e.currentTarget.style.background = `${theme.accent}22`; }}
                onMouseLeave={(e) => { if (!isDisabled && !isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatProgressBar({ level, theme }: { level: number; theme: AppTheme }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {Array.from({ length: MAX_STAT_ENTRY_LEVEL }, (_, i) => (
        <div key={i} style={{
          flex: 1,
          height: "3px",
          borderRadius: "2px",
          background: i < level ? theme.accent : theme.border,
          transition: "background 0.1s ease",
        }} />
      ))}
    </div>
  );
}

function HexaStatRow({ entry, onUpdate, theme, isPrimary, classId, mainStatLabel, attackLabel, isError, disabledTypes }: {
  entry: HexaStatEntry;
  onUpdate: (e: HexaStatEntry) => void;
  theme: AppTheme;
  isPrimary: boolean;
  classId: string;
  mainStatLabel: string;
  attackLabel: string;
  isError?: boolean;
  disabledTypes: Set<string>;
}) {
  const bonus = getHexaStatBonus(entry.type, entry.level, isPrimary, classId);
  // Reserve the bonus column's width to the widest value any stat type could show at
  // MAX_STAT_ENTRY_LEVEL, unconditionally, so neither picking a stat nor typing a level
  // ever grows the text and shrinks the dropdown beside it.
  const maxBonusWidth = HEXA_STAT_OPTIONS.reduce((max, o) => {
    const b = getHexaStatBonus(o.value, MAX_STAT_ENTRY_LEVEL, isPrimary, classId);
    return Math.max(max, b.length);
  }, 0);
  const statOptions = HEXA_STAT_OPTIONS.map((o) => {
    const dynamicLabels: Record<string, string> = { mainStat: mainStatLabel, attackPower: attackLabel };
    return { value: o.value, label: dynamicLabels[o.value] ?? o.label };
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <StatDropdown
            value={entry.type}
            options={statOptions}
            onChange={(val) => onUpdate({ ...entry, type: val })}
            theme={theme}
            isError={isError}
            disabledTypes={disabledTypes}
          />
          <span style={{
            fontSize: "0.8rem", fontWeight: 700, color: theme.accent, flexShrink: 0,
            width: `${maxBonusWidth}ch`, textAlign: "right", fontVariantNumeric: "tabular-nums",
          }}>
            {bonus}
          </span>
        </div>
        <LevelInput value={entry.level} onChange={(v) => onUpdate({ ...entry, level: v })} theme={theme} max={MAX_STAT_ENTRY_LEVEL} label="Stat level" />
      </div>
      <StatProgressBar level={entry.level} theme={theme} />
    </div>
  );
}

// Loads any previously-saved hexa data for this character into the step's draft value,
// or null when there's nothing to prefill. Kept out of the component to hold its
// cognitive complexity down.
function readSavedHexaValue(classDef: HexaClassDef | null, characterName: string | undefined): string | null {
  if (!classDef || !characterName) return null;
  const savedSkills = readCharacterToolData<{ levels?: HexaSkillLevels }>(characterName, "hexaSkills");
  const savedStat = readCharacterToolData<{ nodes?: HexaStatNode[] }>(characterName, "hexaStat");
  if (!savedSkills?.levels && !savedStat?.nodes) return null;
  return JSON.stringify({ ...(savedSkills?.levels ?? {}), hexaStat: savedStat?.nodes });
}

// Substep 0: the hexa skill-level grid (origin/ascent, mastery, enhancement, common).
// Extracted so the main step component stays under the cognitive-complexity cap; it's
// also the only substep the MapleScouter flow renders (skill levels, no HEXA Stat).
function HexaSkillLevelsSubstep({
  theme, classDef, step, levels, update, stepNumber, totalSteps,
  substepIndex, substepCount, animStyle, showHexaStat, onBack, onContinue, onNext, onFinish,
}: {
  theme: AppTheme;
  classDef: HexaClassDef;
  step: SetupStepDefinition;
  levels: HexaDraft;
  update: (patch: Partial<HexaDraft>) => void;
  stepNumber: number;
  totalSteps: number;
  substepIndex: number;
  substepCount: number;
  animStyle: React.CSSProperties;
  showHexaStat: boolean;
  onBack: () => void;
  onContinue: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const isShine = classDef.group === "SHINE";
  const stepLabel = isShine ? "Erda Link" : step.label;
  return (
    <div key={0} style={animStyle}>
      <SetupStepFrame theme={theme} stepLabel={stepLabel} stepNumber={stepNumber} totalSteps={totalSteps}
        substepIndex={substepIndex} substepCount={substepCount}
        description={isShine ? "Enter your Erda Link skill levels." : "Enter your HEXA skill levels."}
        onBack={onBack}
        onNext={showHexaStat ? onContinue : onNext}
        onFinish={onFinish}
        nextLabel={showHexaStat ? "Continue" : undefined}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div>
            <SectionLabel label="Origin & Ascent" theme={theme}
              onMaxAll={() => update({ origin: MAX_LEVEL, ...(classDef.ascent ? { ascent: MAX_LEVEL } : {}) })}
              onClear={() => update({ origin: 0, ...(classDef.ascent ? { ascent: 0 } : {}) })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              <HexaTile skill={classDef.origin} level={levels.origin}
                onUpdate={(v) => update({ origin: v })} theme={theme} min={1} />
              {classDef.ascent && (
                <HexaTile skill={classDef.ascent} level={levels.ascent}
                  onUpdate={(v) => update({ ascent: v })} theme={theme} />
              )}
            </div>
          </div>

          <div>
            <SectionLabel label="Mastery" theme={theme}
              onMaxAll={() => update({ mastery: classDef.mastery.map(() => MAX_LEVEL) })}
              onClear={() => update({ mastery: classDef.mastery.map(() => 0) })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {classDef.mastery.map((node, i) => (
                <HexaTile key={`mastery-${i}`} skill={{ iconId: node.iconId, iconUrl: node.iconUrl, name: node.skills.join("\n") }}
                  level={levels.mastery[i] ?? 0}
                  onUpdate={(v) => {
                    const next = [...levels.mastery];
                    next[i] = v;
                    update({ mastery: next });
                  }}
                  theme={theme}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel label="Enhancement" theme={theme}
              onMaxAll={() => update({ enhancement: classDef.enhancement.map(() => MAX_LEVEL) })}
              onClear={() => update({ enhancement: classDef.enhancement.map(() => 0) })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {classDef.enhancement.map((skill, i) => (
                <HexaTile key={`enhancement-${skill.name}`} skill={skill} level={levels.enhancement[i] ?? 0}
                  onUpdate={(v) => {
                    const next = [...levels.enhancement];
                    next[i] = v;
                    update({ enhancement: next });
                  }}
                  theme={theme}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel label="Common" theme={theme}
              onMaxAll={() => update({ common: COMMON_SKILLS.map(() => MAX_LEVEL) })}
              onClear={() => update({ common: COMMON_SKILLS.map(() => 0) })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {COMMON_SKILLS.map((skill, i) => (
                <HexaTile key={skill.name} skill={skill} level={levels.common[i] ?? 0}
                  onUpdate={(v) => {
                    const next = [...levels.common];
                    next[i] = v;
                    update({ common: next });
                  }}
                  theme={theme}
                />
              ))}
            </div>
          </div>

        </div>
      </SetupStepFrame>
    </div>
  );
}

export default function HexaMatrixSetupStep({
  theme, step, flowId, stepNumber, totalSteps, jobName = "", direction = "forward",
  confirmedCharacterName, characterLevel, value, onChange, onBack, onNext, onFinish,
}: HexaMatrixSetupStepProps) {
  // MapleScouter only needs hexa skill levels, so the HEXA Stat substep is gated out
  // of that flow (mirrors how Stats gates its hyper-stat substep). Two substeps
  // everywhere else: skill levels, then HEXA Stat.
  const showHexaStat = flowId !== "maplescouter_setup";
  const substepCount = showHexaStat ? 2 : 1;
  const classData = getClassDataByNexonJobName(jobName);
  const classDef = classData?.id ? findClassById(classData.id) : null;
  const initialValueRef = useRef(value);

  const [substep, setSubstep] = useState(() => direction === "backward" && showHexaStat ? 1 : 0);
  const [substepDirection, setSubstepDirection] = useState<"forward" | "backward">("forward");
  const [hasSubstepSwitched, setHasSubstepSwitched] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);

  useEffect(() => {
    if (initialValueRef.current) return;
    const saved = readSavedHexaValue(classDef, confirmedCharacterName);
    if (saved) onChange(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!classDef) {
    return (
      <SetupStepFrame theme={theme} stepLabel={step.label} stepNumber={stepNumber} totalSteps={totalSteps}
        description="HEXA Matrix data is not available for this class yet."
        onBack={onBack} onNext={onNext} onFinish={onFinish}
      >
        <p style={{ margin: 0, fontSize: "0.85rem", color: theme.muted, fontWeight: 700 }}>
          No data available for {jobName || "this class"}.
        </p>
      </SetupStepFrame>
    );
  }

  function goToSubstep(next: number) {
    setHasSubstepSwitched(true);
    setSubstepDirection(next > substep ? "forward" : "backward");
    setSubstep(next);
  }

  const substepAnimStyle: React.CSSProperties = hasSubstepSwitched ? {
    animationName: substepDirection === "forward" ? "setupStepSlideForward" : "setupStepSlideBackward",
    animationDuration: "var(--characters-standard)",
    animationTimingFunction: "ease",
    animationFillMode: "both",
  } : {};

  const levels = parseDraft(value, classDef);
  const hexaStat = levels.hexaStat;

  function update(patch: Partial<HexaDraft>) {
    onChange(JSON.stringify({ ...levels, ...patch }));
  }

  if (substep === 0) {
    return (
      <HexaSkillLevelsSubstep
        theme={theme} classDef={classDef} step={step} levels={levels} update={update}
        stepNumber={stepNumber} totalSteps={totalSteps}
        substepIndex={substep} substepCount={substepCount} animStyle={substepAnimStyle}
        showHexaStat={showHexaStat}
        onBack={onBack} onContinue={() => goToSubstep(1)} onNext={onNext} onFinish={onFinish}
      />
    );
  }

  const charLevel = characterLevel ?? Infinity;
  const activeNode = hexaStat[activeSlot];
  const activePreset = activeNode.activePreset;
  const slot = activeNode.presets[activePreset];
  // Cross-node uniqueness compares against each node's currently-active preset.
  const activeSlots: [HexaStatSlot, HexaStatSlot, HexaStatSlot] = [
    hexaStat[0].presets[hexaStat[0].activePreset],
    hexaStat[1].presets[hexaStat[1].activePreset],
    hexaStat[2].presets[hexaStat[2].activePreset],
  ];
  const mainDisabled = getMainDisabledTypes(activeSlots, activeSlot);
  const altDisabled: [Set<string>, Set<string>] = [
    getAltDisabledTypes(activeSlots, activeSlot, 0),
    getAltDisabledTypes(activeSlots, activeSlot, 1),
  ];
  const mainError = !!slot.main.type && mainDisabled.has(slot.main.type);
  const altErrors: [boolean, boolean] = [
    !!slot.alt[0].type && altDisabled[0].has(slot.alt[0].type),
    !!slot.alt[1].type && altDisabled[1].has(slot.alt[1].type),
  ];
  const primaryStat = classData?.requiredStats[0] ?? "";
  const mainStatLabel = getMainStatLabel(classData?.id ?? "", primaryStat);
  const attackLabel = getAttackLabel(primaryStat);

  function setSlot(s: HexaStatSlot) {
    const next: [HexaStatNode, HexaStatNode, HexaStatNode] = [hexaStat[0], hexaStat[1], hexaStat[2]];
    const presets: [HexaStatSlot, HexaStatSlot] = [...next[activeSlot].presets];
    presets[activePreset] = s;
    next[activeSlot] = { ...next[activeSlot], presets };
    update({ hexaStat: next });
  }

  function setActivePreset(p: number) {
    const next: [HexaStatNode, HexaStatNode, HexaStatNode] = [hexaStat[0], hexaStat[1], hexaStat[2]];
    next[activeSlot] = { ...next[activeSlot], activePreset: p };
    update({ hexaStat: next });
  }

  return (
    <div key={1} style={substepAnimStyle}>
      <SetupStepFrame theme={theme} stepLabel="HEXA Stat" stepNumber={stepNumber} totalSteps={totalSteps}
        substepIndex={substep} substepCount={substepCount}
        description="Set your HEXA Stat nodes."
        onBack={() => goToSubstep(0)} onNext={onNext} onFinish={onFinish}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
            {HEXA_STAT_DEFS.map((def, i) => {
              const locked = !isNodeUnlocked(i, charLevel);
              const hint = locked ? lockHint(i) : null;
              const isActive = activeSlot === i && !locked;
              const iconDisabled = locked || isNodeEmpty(hexaStat[i]);
              const tabStyle: React.CSSProperties = {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                border: `2px solid ${isActive ? theme.accent : theme.border}`,
                borderRadius: "8px",
                padding: "3px",
                background: "transparent",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.5 : 1,
                transition: "border-color 0.15s ease, opacity 0.15s ease",
              };
              return (
                <div key={i}
                  onClick={locked ? undefined : () => setActiveSlot(i)}
                  role={locked ? undefined : "button"}
                  tabIndex={locked ? undefined : 0}
                  onKeyDown={locked ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") setActiveSlot(i); }}
                  style={tabStyle}
                >
                  <HexaSkillIcon id={def.iconId} size={36} disabled={iconDisabled} />
                  {hint && (
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted, lineHeight: 1 }}>
                      {hint}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{
              fontSize: "0.75rem", fontWeight: 800, color: theme.muted,
              letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              Preset
            </span>
            <div style={{
              display: "flex", gap: "3px", padding: "3px",
              border: `1px solid ${theme.border}`, borderRadius: "9px",
            }}>
              {PRESET_LABELS.map((label, p) => {
                const isActive = activePreset === p;
                return (
                  <button key={label} type="button" onClick={() => setActivePreset(p)} style={presetToggleButtonStyle(theme, isActive)}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SectionLabel label="Main Stat" theme={theme} />
            <HexaStatRow entry={slot.main} theme={theme} isPrimary={true} isError={mainError}
              disabledTypes={mainDisabled}
              classId={classData?.id ?? ""} mainStatLabel={mainStatLabel} attackLabel={attackLabel}
              onUpdate={(e) => setSlot({ ...slot, main: e })} />
          </div>

          <div>
            <SectionLabel label="Alternative Stats" theme={theme} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {slot.alt.map((entry, i) => (
                <HexaStatRow key={i} entry={entry} theme={theme} isPrimary={false} isError={altErrors[i]}
                  disabledTypes={altDisabled[i]}
                  classId={classData?.id ?? ""} mainStatLabel={mainStatLabel} attackLabel={attackLabel}
                  onUpdate={(e) => {
                    const newAlt: [HexaStatEntry, HexaStatEntry] = [slot.alt[0], slot.alt[1]];
                    newAlt[i] = e;
                    setSlot({ ...slot, alt: newAlt });
                  }}
                />
              ))}
            </div>
          </div>

        </div>
      </SetupStepFrame>
    </div>
  );
}

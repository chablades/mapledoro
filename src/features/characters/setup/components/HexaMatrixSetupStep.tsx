"use client";

import { useState, useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { numericKeyDown, clampNumber, sanitizeDigitsInput, isStrayClick } from "../../../../lib/inputUtils";
import { joinWithAnd } from "../../../../lib/textUtils";
import { useKeyboardListNav } from "../../../../lib/useKeyboardListNav";
import { searchAndRank } from "../../../../lib/searchMatch";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import type { SetupStepDefinition } from "../steps";
import type { SetupFlowId } from "../flows";
import type { HexaClassDef, HexaSkillDef, HexaSkillLevels } from "../../../../features/tools/hexa-skills/hexa-classes";
import { findClassById, COMMON_SKILLS } from "../../../../features/tools/hexa-skills/hexa-classes";
import { resourceImageUrl } from "../../../../lib/mapleResource";
import { getClassDataByNexonJobName } from "../data/classSkillData";
import type { HexaStatEntry, HexaStatSlot, HexaStatNode } from "../data/hexaStatData";
import { HEXA_STAT_OPTIONS, HEXA_STAT_NODE_MAX_LEVEL, getHexaStatBonus, getMainStatLabel, getAttackLabel, hexaStatSlotLevelSum } from "../data/hexaStatData";
import { readCharacterToolData } from "../../../../features/tools/characterToolStorage";
import SetupStepFrame from "./SetupStepFrame";
import { HexaSkillIcon } from "../../../../components/ResourceImage";
import { CopyFromPreset } from "./CopyFromPreset";
import { LeveledIconTile } from "./LeveledIconTile";

interface HexaMatrixSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  flowId?: SetupFlowId;
  stepNumber: number;
  totalSteps: number;
  jobName?: string;
  direction?: "forward" | "backward";
  targetSubstep?: number | null;
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
  onSubstepChange?: (substepIndex: number) => void;
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
const MAX_STAT_ENTRY_LEVEL = 10;

// Each HEXA Stat node holds two presets in-game: an active and a stored "saved" config.
const PRESET_LABELS = ["Active", "Stored"] as const;
const NODE_LABELS = ["I", "II", "III"] as const;
// Reading order for a slot's 3 stat lines, matching the in-game window (Main → Alt 1 → Alt 2).
const HEXA_STAT_FIELD_ORDER = ["main", "alt0", "alt1"] as const;
type HexaStatField = (typeof HEXA_STAT_FIELD_ORDER)[number];

// hexa-skill ids from the "hexaStat" section of the hexa-skill manifest
const HEXA_STAT_DEFS: HexaSkillDef[] = [
  { iconId: "50000000", name: "HEXA Stat I" },
  { iconId: "50000001", name: "HEXA Stat II" },
  { iconId: "50000002", name: "HEXA Stat III" },
];

// Padding + matching negative margin grows the actual clickable box toward a 44px
// touch target without shifting surrounding layout — the button still occupies its
// original space, it just responds to taps/clicks a bit outside its visible text.
const sectionBtnStyle: React.CSSProperties = {
  background: "none", border: "none", font: "inherit",
  fontSize: "0.75rem", fontWeight: 800,
  padding: "15px 6px", margin: "-15px -6px",
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

const statDropdownMenuStyle = (theme: AppTheme, openUpward: boolean): React.CSSProperties => ({
  position: "absolute", left: 0, right: 0, zIndex: 310,
  ...(openUpward ? { bottom: "calc(100% + 4px)" } : { top: "calc(100% + 4px)" }),
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

const statDropdownSearchInputStyle = (theme: AppTheme): React.CSSProperties => ({
  width: "100%", boxSizing: "border-box", borderRadius: 6,
  fontFamily: "inherit", fontSize: "0.78rem", fontWeight: 600,
  padding: "0.3rem 0.5rem", outline: "none", border: `1px solid ${theme.border}`,
  background: theme.bg, color: theme.text,
});

function statDropdownOptionBackground(theme: AppTheme, isSelected: boolean, isHighlighted: boolean): string {
  if (isSelected) return `${theme.accent}33`;
  if (isHighlighted) return `${theme.accent}22`;
  return "transparent";
}

const statDropdownOptionStyle = (theme: AppTheme, isSelected: boolean, isHighlighted: boolean): React.CSSProperties => ({
  display: "block", width: "100%", textAlign: "left",
  padding: "0.35rem 0.6rem", border: "none",
  borderBottom: `1px solid ${theme.border}`,
  background: statDropdownOptionBackground(theme, isSelected, isHighlighted),
  color: theme.text,
  fontFamily: "inherit", fontSize: "0.82rem", fontWeight: 700,
  cursor: "pointer",
});

const presetToggleButtonStyle = (theme: AppTheme, isActive: boolean): React.CSSProperties => ({
  border: "none", borderRadius: "7px", cursor: "pointer",
  padding: "0.4rem 0.7rem", minHeight: 32, fontFamily: "inherit",
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

// Builds one condensed sentence naming every node with an over-limit preset, instead
// of enumerating each (node, preset) pair individually (gets unreadable fast once more
// than one node is affected). Groups by node — "both presets" when both are over,
// otherwise names the one that is — and collapses to a single line if every node is
// affected on both presets (worst case: nothing left to name, so just say "every node").
function buildOverLimitMessage(hexaStat: [HexaStatNode, HexaStatNode, HexaStatNode]): string {
  const perNode = hexaStat.map((node) => node.presets.map((p) => hexaStatSlotLevelSum(p) > HEXA_STAT_NODE_MAX_LEVEL));
  const affectedIndices = perNode.reduce<number[]>((acc, presets, i) => (presets.some(Boolean) ? [...acc, i] : acc), []);
  if (affectedIndices.length === 0) return "";

  if (affectedIndices.length === 3 && affectedIndices.every((i) => perNode[i].every(Boolean))) {
    return "Every HEXA Stat node has more than 20 total levels assigned across both presets. Fix them to continue.";
  }

  const labels = affectedIndices.map((i) => {
    const [activeOver, storedOver] = perNode[i];
    let suffix = `${PRESET_LABELS[0]} preset`;
    if (activeOver && storedOver) suffix = "both presets";
    else if (storedOver) suffix = `${PRESET_LABELS[1]} preset`;
    return `HEXA Stat ${NODE_LABELS[i]} (${suffix})`;
  });
  const verb = labels.length > 1 ? "have" : "has";
  const pronoun = labels.length > 1 ? "them" : "it";
  return `${joinWithAnd(labels)} ${verb} more than 20 total levels assigned. Fix ${pronoun} to continue.`;
}

// Node 0 is always accessible (HEXA Matrix implies 6th job). Nodes 1 and 2 have character level gates.
function isNodeUnlocked(index: number, characterLevel: number): boolean {
  if (index === 1) return characterLevel >= 265;
  if (index === 2) return characterLevel >= 270;
  return true;
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

// Skill levels are strings in the draft (blank until touched, matching Oz Rings) even
// though the final stored HexaSkillLevels shape (and the standalone HEXA Skills
// calculator that also reads it) stays numeric — the controller converts at save time.
// Origin is the one exception: every character has it from level 1 on, so it's never
// really "unset" the way ascent/mastery/enhancement/common are; clampLevelInput's `min`
// keeps it from ever going blank.
interface HexaSkillLevelsDraft {
  origin: string;
  ascent: string;
  mastery: string[];
  enhancement: string[];
  common: string[];
}

// Clamps while preserving the string (blank stays blank unless min > 0, in which case
// blank snaps to the min — see the origin note above).
function clampLevelInput(raw: string, max: number, min = 0): string {
  const digits = sanitizeDigitsInput(raw);
  if (digits === "") return min > 0 ? String(min) : "";
  return String(Math.max(min, Math.min(max, Number(digits))));
}

// The step's working draft carries both systems in one JSON value: the 6th-job
// skill levels (persisted to tools.hexaSkills) plus the HEXA Stat nodes (persisted
// separately to tools.hexaStat). The controller splits them on save.
type HexaDraft = HexaSkillLevelsDraft & { hexaStat: [HexaStatNode, HexaStatNode, HexaStatNode] };

function emptyLevels(classDef: HexaClassDef): HexaDraft {
  return {
    origin: "1",
    mastery: classDef.mastery.map(() => ""),
    enhancement: classDef.enhancement.map(() => ""),
    common: COMMON_SKILLS.map(() => ""),
    ascent: "",
    hexaStat: [emptyNode(), emptyNode(), emptyNode()],
  };
}

function parseDraft(raw: string, classDef: HexaClassDef): HexaDraft {
  const empty = emptyLevels(classDef);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return empty;
    // Normalizes to strings regardless of whether the source is a number (a prefill
    // from real saved tool data) or already a string (a prior draft) — both land here.
    const padBlank = (arr: unknown, len: number): string[] => {
      const a = Array.isArray(arr) ? arr : [];
      const result = a.slice(0, len).map((v) => clampLevelInput(String(v ?? ""), MAX_LEVEL));
      while (result.length < len) result.push("");
      return result;
    };
    const rawSlots = Array.isArray(parsed.hexaStat) ? (parsed.hexaStat as unknown[]) : [];
    return {
      origin: clampLevelInput(String(parsed.origin ?? ""), MAX_LEVEL, 1),
      mastery: padBlank(parsed.mastery, classDef.mastery.length),
      enhancement: padBlank(parsed.enhancement, classDef.enhancement.length),
      common: padBlank(parsed.common, COMMON_SKILLS.length),
      ascent: clampLevelInput(String(parsed.ascent ?? ""), MAX_LEVEL),
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

// HexaStatEntry.level stays a real number (shared with the standalone HEXA Skills
// calculator and profile display via HexaStatNode), so unlike the plain skill-level
// tiles above, this can't just become a string draft. `touched` is a display-only flag
// (not part of the saved data) so a 0 the user actually typed this session shows as a
// literal "0" instead of collapsing back to the placeholder — see the `touchedLevels`
// tracking in the main component below for how it's set.
function LevelInput({ value, onChange, theme, min = 0, max = MAX_LEVEL, label, touched = false, onTouch }: { value: number; onChange: (v: number) => void; theme: AppTheme; min?: number; max?: number; label?: string; touched?: boolean; onTouch?: () => void }) {
  const showBlank = value === 0 && !touched;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={showBlank ? "" : String(value)}
        placeholder={String(min)}
        onChange={(e) => { onTouch?.(); onChange(clampNumber(Number(e.target.value) || 0, max, min)); }}
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {onClear && (
            <button type="button" onClick={onClear} style={{ ...sectionBtnStyle, color: theme.muted }}>
              Clear
            </button>
          )}
          {onClear && onMaxAll && (
            <span style={{ width: 1, alignSelf: "stretch", background: theme.border, flexShrink: 0 }} />
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

function StatDropdown({ value, options, onChange, onAdvance, isOpen, onToggle, onClose, theme, isError, disabledTypes }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  /** Called (instead of onClose) after an actual pick — opens the next line's dropdown, if
   *  it's still unset. viaKeyboard distinguishes an Enter-driven pick from a mouse click —
   *  only a keyboard pick jumps lines, since a mouse click means the user's cursor is
   *  staying local. */
  onAdvance?: (viaKeyboard: boolean) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  theme: AppTheme;
  isError?: boolean;
  /** Stat types already used elsewhere (sibling lines, other nodes) — excluded from the
   *  list entirely, not just greyed out, so there's nothing to accidentally pick. */
  disabledTypes: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // These 3 dropdowns (Main/Alt 1/Alt 2) are fixed, always-mounted instances shared
  // across every node and preset (switching the active node/preset tab just feeds them
  // different data, it never remounts them) — so a stale search term would otherwise
  // ride along indefinitely across nodes/presets, not just within this one field.
  // Reset synchronously during render on the open transition, per CLAUDE.md's
  // set-state-in-effect rule (the "adjusting state on a prop change" pattern), rather
  // than a bare setState in a useEffect.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setQuery("");
  }

  const closeOnOutsideClick = useEffectEvent((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
  });

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  // Flip the menu above the trigger when there isn't enough room below in the viewport —
  // otherwise a dropdown opened near the bottom of the HEXA node grid forces the page to
  // grow to fit it, visibly pushing content past the footer.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    const menu = menuRef.current;
    if (!container || !menu) return;
    const rect = container.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpenUpward(spaceBelow < menu.offsetHeight + 4 && rect.top > spaceBelow);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const available = options.filter((o) => !disabledTypes.has(o.value));
  const filtered = query ? searchAndRank(available, query, (o) => o.label) : available;
  const selected = options.find((o) => o.value === value);

  function pick(val: string, viaKeyboard: boolean) {
    onChange(val);
    if (onAdvance) { onAdvance(viaKeyboard); } else { onClose(); }
  }

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: filtered,
    resetKey: query,
    onSelect: (o) => pick(o.value, true),
    onClose,
  });

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Backspace" && query === "" && selected) {
      e.preventDefault();
      onChange("");
      onClose();
      return;
    }
    navKeyDown(e);
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (isOpen) return; // the search input inside the menu handles keys once it's open
    if ((e.key === "Backspace" || e.key === "Delete") && selected) {
      e.preventDefault();
      onChange("");
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); onToggle(); }
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
        onClick={(e) => { if (isStrayClick(e)) { return; } onToggle(); }}
        onKeyDown={handleTriggerKeyDown}
        onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
        onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
        style={triggerStyle}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.label ?? "Select stat…"}
        </span>
        <span
          style={{
            fontSize: "0.75rem", flexShrink: 0, opacity: 0.6,
            display: "inline-block", transform: isOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.15s ease",
          }}
        >
          ▾
        </span>
      </button>
      {isOpen && (
        <div ref={menuRef} style={statDropdownMenuStyle(theme, openUpward)}>
          {selected && (
            <button
              type="button"
              onClick={() => { onChange(""); onClose(); }}
              style={statDropdownClearRowStyle(theme)}
            >
              — Clear —
            </button>
          )}
          <div style={{ padding: "0.3rem 0.4rem", borderBottom: `1px solid ${theme.border}` }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search stats"
              value={query}
              placeholder="Search…"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={statDropdownSearchInputStyle(theme)}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.map((o, i) => {
              const isSelected = o.value === value;
              const isHighlighted = i === highlightedIndex;
              return (
                <button
                  key={o.value}
                  ref={itemRef(i)}
                  type="button"
                  onClick={() => pick(o.value, false)}
                  style={statDropdownOptionStyle(theme, isSelected, isHighlighted)}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = `${theme.accent}22`; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  {o.label}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p style={{ margin: 0, padding: "0.4rem 0.5rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
                No results
              </p>
            )}
          </div>
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

function HexaStatRow({
  entry, onUpdate, theme, isPrimary, classId, mainStatLabel, attackLabel, isError, disabledTypes,
  levelTouched, onLevelTouch, isOpen, onToggle, onClose, onAdvance,
}: {
  entry: HexaStatEntry;
  onUpdate: (e: HexaStatEntry) => void;
  theme: AppTheme;
  isPrimary: boolean;
  classId: string;
  mainStatLabel: string;
  attackLabel: string;
  isError?: boolean;
  disabledTypes: Set<string>;
  levelTouched: boolean;
  onLevelTouch: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAdvance?: (viaKeyboard: boolean) => void;
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
            onAdvance={onAdvance}
            isOpen={isOpen}
            onToggle={onToggle}
            onClose={onClose}
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
        <LevelInput value={entry.level} onChange={(v) => onUpdate({ ...entry, level: v })} theme={theme} max={MAX_STAT_ENTRY_LEVEL} label="Stat level"
          touched={levelTouched} onTouch={onLevelTouch} />
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
  substepIndex, substepCount, animStyle, showHexaStat, onBack, onContinue, onNext, onFinish, onValidityChange,
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
  onValidityChange?: (valid: boolean, substepIndex?: number) => void;
}) {
  const isShine = classDef.group === "SHINE";
  const stepLabel = isShine ? "Erda Link" : step.label;
  return (
    <div key={0} style={animStyle}>
      <SetupStepFrame theme={theme} stepLabel={stepLabel} stepNumber={stepNumber} totalSteps={totalSteps}
        substepIndex={substepIndex} substepCount={substepCount}
        onValidityChange={onValidityChange}
        description={isShine ? "Enter your Erda Link skill levels." : "Enter your HEXA skill levels."}
        onBack={onBack}
        onNext={showHexaStat ? onContinue : onNext}
        onFinish={onFinish}
        nextLabel={showHexaStat ? "Continue" : undefined}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div>
            <SectionLabel label="Origin & Ascent" theme={theme}
              onMaxAll={() => update({ origin: String(MAX_LEVEL), ...(classDef.ascent ? { ascent: String(MAX_LEVEL) } : {}) })}
              onClear={() => update({ origin: "0", ...(classDef.ascent ? { ascent: "" } : {}) })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              <LeveledIconTile icon={<SkillIcon skill={classDef.origin} size={32} />} name={classDef.origin.name} level={levels.origin}
                onLevel={(v) => update({ origin: clampLevelInput(v, MAX_LEVEL, 1) })} max={MAX_LEVEL} min={1} theme={theme} />
              {classDef.ascent && (
                <LeveledIconTile icon={<SkillIcon skill={classDef.ascent} size={32} />} name={classDef.ascent.name} level={levels.ascent}
                  onLevel={(v) => update({ ascent: clampLevelInput(v, MAX_LEVEL) })} max={MAX_LEVEL} theme={theme} />
              )}
            </div>
          </div>

          <div>
            <SectionLabel label="Mastery" theme={theme}
              onMaxAll={() => update({ mastery: classDef.mastery.map(() => String(MAX_LEVEL)) })}
              onClear={() => update({ mastery: classDef.mastery.map(() => "") })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {classDef.mastery.map((node, i) => {
                const skill = { iconId: node.iconId, iconUrl: node.iconUrl, name: node.skills.join("\n") };
                return (
                  // react-doctor-disable-next-line no-array-index-as-key
                  <LeveledIconTile key={`mastery-${i}`} icon={<SkillIcon skill={skill} size={32} />} name={skill.name}
                    level={levels.mastery[i] ?? ""}
                    onLevel={(v) => {
                      const next = [...levels.mastery];
                      next[i] = clampLevelInput(v, MAX_LEVEL);
                      update({ mastery: next });
                    }}
                    max={MAX_LEVEL}
                    theme={theme}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <SectionLabel label="Enhancement" theme={theme}
              onMaxAll={() => update({ enhancement: classDef.enhancement.map(() => String(MAX_LEVEL)) })}
              onClear={() => update({ enhancement: classDef.enhancement.map(() => "") })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {classDef.enhancement.map((skill, i) => (
                <LeveledIconTile key={`enhancement-${skill.name}`} icon={<SkillIcon skill={skill} size={32} />} name={skill.name}
                  level={levels.enhancement[i] ?? ""}
                  onLevel={(v) => {
                    const next = [...levels.enhancement];
                    next[i] = clampLevelInput(v, MAX_LEVEL);
                    update({ enhancement: next });
                  }}
                  max={MAX_LEVEL}
                  theme={theme}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel label="Common" theme={theme}
              onMaxAll={() => update({ common: COMMON_SKILLS.map(() => String(MAX_LEVEL)) })}
              onClear={() => update({ common: COMMON_SKILLS.map(() => "") })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {COMMON_SKILLS.map((skill, i) => (
                <LeveledIconTile key={skill.name} icon={<SkillIcon skill={skill} size={32} />} name={skill.name}
                  level={levels.common[i] ?? ""}
                  onLevel={(v) => {
                    const next = [...levels.common];
                    next[i] = clampLevelInput(v, MAX_LEVEL);
                    update({ common: next });
                  }}
                  max={MAX_LEVEL}
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
  theme, step, flowId, stepNumber, totalSteps, jobName = "", direction = "forward", targetSubstep, onValidityChange, onSubstepChange,
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

  const [substep, setSubstep] = useState(() => targetSubstep ?? (direction === "backward" && showHexaStat ? 1 : 0));
  // Reports the mount-time default once (so entering a step "backward," which starts
  // on a substep other than 0, still gets persisted for resume even if the player
  // reloads before navigating again) — subsequent changes are reported directly from
  // goToSubstep below instead of a substep-watching effect. Fully eliminating this last
  // mount-time report would mean lifting substep into a value the parent controls
  // directly, which isn't worth the blast radius for a bookkeeping report that never
  // causes a visible re-render.
  // react-doctor-disable-next-line no-prop-callback-in-effect, no-pass-live-state-to-parent
  useEffect(() => { onSubstepChange?.(substep); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [substepDirection, setSubstepDirection] = useState<"forward" | "backward">("forward");
  const [hasSubstepSwitched, setHasSubstepSwitched] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  // Which of the current slot's 3 stat-type dropdowns (if any) is open. Reset whenever the
  // displayed slot changes (switching node or preset), so a stale open dropdown from the
  // previous slot never lingers.
  const [openField, setOpenField] = useState<"main" | "alt0" | "alt1" | null>(null);
  function selectNode(i: number) {
    setOpenField(null);
    setActiveSlot(i);
  }
  // Display-only: tracks which HEXA Stat level fields the user has actually typed into
  // this session, so a level they set to 0 shows a literal "0" instead of collapsing
  // back to the placeholder (HexaStatEntry.level itself stays a real number — see
  // LevelInput's comment). Resets on remount (e.g. leaving this step and coming back),
  // which only affects the blank-vs-"0" look, never the saved value.
  const [touchedLevels, setTouchedLevels] = useState<Set<string>>(() => new Set());
  function markLevelTouched(key: string) {
    setTouchedLevels((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  // One-shot mount-time backfill from the character's saved tools data (only when this
  // step lands blank) — can't run during render since it depends on a client-only
  // localStorage read. Not worth lifting into the parent controller (which owns none of
  // this step's domain logic) for a fetch that only ever fires once, at mount.
  // react-doctor-disable-next-line no-pass-data-to-parent
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
        onBack={onBack} onNext={onNext} onFinish={onFinish} onValidityChange={onValidityChange}
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
    onSubstepChange?.(next);
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
        onValidityChange={onValidityChange}
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
  const slotLevelSum = hexaStatSlotLevelSum(slot);
  const slotOverLimit = slotLevelSum > HEXA_STAT_NODE_MAX_LEVEL;
  const overLimitMessage = buildOverLimitMessage(hexaStat);
  const anyNodeOverLimit = overLimitMessage !== "";

  function hexaStatFieldValue(field: HexaStatField): string {
    if (field === "main") return slot.main.type;
    const altIndex = field === "alt0" ? 0 : 1;
    return slot.alt[altIndex].type;
  }

  // Picking a line's stat via Enter jumps to the next line in reading order, only if it's
  // still unset (barging into a line someone already filled would be more surprising than
  // helpful, so it just closes instead — same rule as every other picker in this flow). A
  // mouse-clicked pick never jumps at all, handled by StatDropdown's own onAdvance branch.
  function goToNextHexaStatField(from: HexaStatField): () => void {
    const idx = HEXA_STAT_FIELD_ORDER.indexOf(from);
    const next = idx < HEXA_STAT_FIELD_ORDER.length - 1 ? HEXA_STAT_FIELD_ORDER[idx + 1] : null;
    return next && !hexaStatFieldValue(next) ? () => setOpenField(next) : () => setOpenField(null);
  }

  function setSlot(s: HexaStatSlot) {
    const next: [HexaStatNode, HexaStatNode, HexaStatNode] = [hexaStat[0], hexaStat[1], hexaStat[2]];
    const presets: [HexaStatSlot, HexaStatSlot] = [...next[activeSlot].presets];
    presets[activePreset] = s;
    next[activeSlot] = { ...next[activeSlot], presets };
    update({ hexaStat: next });
  }

  function setActivePreset(p: number) {
    setOpenField(null);
    const next: [HexaStatNode, HexaStatNode, HexaStatNode] = [hexaStat[0], hexaStat[1], hexaStat[2]];
    next[activeSlot] = { ...next[activeSlot], activePreset: p };
    update({ hexaStat: next });
  }

  function copyPreset(from: number) {
    const next: [HexaStatNode, HexaStatNode, HexaStatNode] = [hexaStat[0], hexaStat[1], hexaStat[2]];
    const presets: [HexaStatSlot, HexaStatSlot] = [...next[activeSlot].presets];
    presets[activePreset] = presets[from];
    next[activeSlot] = { ...next[activeSlot], presets };
    update({ hexaStat: next });
  }

  function clearPreset() {
    const next: [HexaStatNode, HexaStatNode, HexaStatNode] = [hexaStat[0], hexaStat[1], hexaStat[2]];
    const presets: [HexaStatSlot, HexaStatSlot] = [...next[activeSlot].presets];
    presets[activePreset] = emptySlot();
    next[activeSlot] = { ...next[activeSlot], presets };
    update({ hexaStat: next });
  }

  return (
    <div key={1} style={substepAnimStyle}>
      <SetupStepFrame theme={theme} stepLabel="HEXA Stat" stepNumber={stepNumber} totalSteps={totalSteps}
        substepIndex={substep} substepCount={substepCount}
        description="Set your HEXA Stat nodes."
        onBack={() => goToSubstep(0)} onNext={onNext} onFinish={onFinish}
        nextDisabled={anyNodeOverLimit} onValidityChange={onValidityChange}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start" }}>
            {HEXA_STAT_DEFS.map((def, i) => {
              // Nodes the character's level hasn't reached yet are hidden entirely, not
              // shown disabled — matches the Symbols convention (see SymbolSection's
              // isUnlocked comment): the setup flow doesn't preview content the character
              // can't have yet, that's the profile page's job.
              if (!isNodeUnlocked(i, charLevel)) return null;
              const isActive = activeSlot === i;
              const iconDisabled = isNodeEmpty(hexaStat[i]);
              const tabStyle: React.CSSProperties = {
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                border: `2px solid ${isActive ? theme.accent : theme.border}`,
                borderRadius: "8px",
                padding: "3px",
                background: "transparent",
                font: "inherit",
                cursor: "pointer",
                transition: "border-color 0.15s ease",
              };
              return (
                // react-doctor-disable-next-line no-array-index-as-key
                <button key={i}
                  type="button"
                  className="tap-target-44"
                  onClick={() => selectNode(i)}
                  style={tabStyle}
                  aria-label={def.name}
                >
                  <HexaSkillIcon id={def.iconId} size={36} disabled={iconDisabled} />
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem" }}>
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
                    <button key={label} type="button" className="tap-target-44" onClick={() => setActivePreset(p)} style={presetToggleButtonStyle(theme, isActive)}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: slotOverLimit ? statusText(theme, "danger") : theme.muted }}>
              {slotLevelSum} / {HEXA_STAT_NODE_MAX_LEVEL} levels used
            </span>
          </div>

          <CopyFromPreset theme={theme} count={PRESET_LABELS.length} active={activePreset} onCopy={copyPreset} onClear={clearPreset} labels={PRESET_LABELS} />

          <div>
            <SectionLabel label="Main Stat" theme={theme} />
            <HexaStatRow entry={slot.main} theme={theme} isPrimary={true} isError={mainError}
              disabledTypes={mainDisabled}
              classId={classData?.id ?? ""} mainStatLabel={mainStatLabel} attackLabel={attackLabel}
              levelTouched={touchedLevels.has(`${activeSlot}-${activePreset}-main`)}
              onLevelTouch={() => markLevelTouched(`${activeSlot}-${activePreset}-main`)}
              onUpdate={(e) => setSlot({ ...slot, main: e })}
              isOpen={openField === "main"}
              onToggle={() => setOpenField((f) => f === "main" ? null : "main")}
              onClose={() => setOpenField(null)}
              onAdvance={(viaKeyboard) => { if (viaKeyboard) { goToNextHexaStatField("main")(); } else { setOpenField(null); } }}
            />
          </div>

          <div>
            <SectionLabel label="Alternative Stats" theme={theme} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {slot.alt.map((entry, i) => {
                const field: HexaStatField = i === 0 ? "alt0" : "alt1";
                return (
                  // react-doctor-disable-next-line no-array-index-as-key
                  <HexaStatRow key={i} entry={entry} theme={theme} isPrimary={false} isError={altErrors[i]}
                    disabledTypes={altDisabled[i]}
                    classId={classData?.id ?? ""} mainStatLabel={mainStatLabel} attackLabel={attackLabel}
                    levelTouched={touchedLevels.has(`${activeSlot}-${activePreset}-alt${i}`)}
                    onLevelTouch={() => markLevelTouched(`${activeSlot}-${activePreset}-alt${i}`)}
                    onUpdate={(e) => {
                      const newAlt: [HexaStatEntry, HexaStatEntry] = [slot.alt[0], slot.alt[1]];
                      newAlt[i] = e;
                      setSlot({ ...slot, alt: newAlt });
                    }}
                    isOpen={openField === field}
                    onToggle={() => setOpenField((f) => f === field ? null : field)}
                    onClose={() => setOpenField(null)}
                    onAdvance={(viaKeyboard) => { if (viaKeyboard) { goToNextHexaStatField(field)(); } else { setOpenField(null); } }}
                  />
                );
              })}
            </div>
          </div>

          {anyNodeOverLimit && (
            <p role="alert" style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: theme.muted }}>
              {overLimitMessage}
            </p>
          )}

        </div>
      </SetupStepFrame>
    </div>
  );
}

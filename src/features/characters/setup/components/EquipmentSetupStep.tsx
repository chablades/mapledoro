"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePickerCoords } from "../hooks/usePickerCoords";
import type { AppTheme } from "../../../../components/themes";
import type { SetupStepDefinition } from "../steps";
import { ItemIcon } from "../../../../components/ResourceImage";
import CharacterAvatar from "../../tabs/components/CharacterAvatar";
import SetupStepFrame from "./SetupStepFrame";
import {
  ARCANE_AREAS, SACRED_AREAS, GRAND_SACRED_AREAS,
  ARCANE_MAX_LEVEL, SACRED_MAX_LEVEL, type SymbolArea,
} from "../../../tools/symbols/symbol-data";
import { getClassDataByNexonJobName } from "../data/classSkillData";
import { branchMaskForClass, weaponPrefixesForClass, secondarySpecForClass, isShieldId } from "../data/classBranch";

// ── Types ──────────────────────────────────────────────────────────────────

interface EquipmentItem {
  id: string;
  name: string;
}

/** Picker-only item; carries reqJob/reqLevel for filtering (stored items keep only id/name). */
interface CatalogItem extends EquipmentItem {
  reqJob?: number;
  reqLevel?: number;
}

type SlotKey =
  | "ring1" | "ring2" | "ring3" | "ring4"
  | "face" | "eye" | "earring" | "pendant1" | "pendant2" | "belt" | "pocket"
  | "hat" | "cape" | "top" | "glove" | "bottom" | "shoe" | "shoulder" | "medal"
  | "weapon" | "secondary" | "emblem" | "android" | "heart" | "badge" | "title"
  | "totem1" | "totem2" | "totem3";

type SymbolTabKey = "arcane" | "sacred";

// Title, totems, and symbols are shared across presets; the grid slots swap per preset.
type SharedSlotKey = "title" | "totem1" | "totem2" | "totem3";
type SlotMap = Partial<Record<SlotKey, EquipmentItem | null>>;
const PRESET_COUNT = 3;
const SHARED_SLOTS: ReadonlySet<SlotKey> = new Set<SlotKey>(["title", "totem1", "totem2", "totem3"]);
const isSharedSlot = (slot: SlotKey): slot is SharedSlotKey => SHARED_SLOTS.has(slot);

interface EquipmentDraft extends Partial<Record<SharedSlotKey, EquipmentItem | null>> {
  /** Three equipment-grid presets. */
  presets?: SlotMap[];
  /** Which preset (0-2) is being edited / is primary. */
  activePreset?: number;
  /** Preset indices that have been edited (split off from preset 1). Others mirror preset 1. */
  diverged?: number[];
  /** Symbol levels keyed by region name; folded into the calculator's tools.symbols on finish. */
  symbolLevels?: Record<string, number>;
}

interface EquipmentSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  direction?: "forward" | "backward";
  jobName?: string;
  characterLevel?: number;
  confirmedCharacterName?: string;
  confirmedCharacterImgURL?: string;
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SLOT_LABELS: Record<SlotKey, string> = {
  ring1: "Ring", ring2: "Ring", ring3: "Ring", ring4: "Ring",
  face: "Face", eye: "Eye", earring: "Earring",
  pendant1: "Pendant", pendant2: "Pendant",
  belt: "Belt", pocket: "Pocket",
  hat: "Hat", cape: "Cape", top: "Top",
  glove: "Gloves", bottom: "Bottom", shoe: "Shoes",
  shoulder: "Shoulder", medal: "Medal",
  weapon: "Weapon", secondary: "Secondary", emblem: "Emblem",
  android: "Android", heart: "Heart", badge: "Badge", title: "Title",
  totem1: "Totem", totem2: "Totem", totem3: "Totem",
};

const SLOT_DATA_FILE: Record<SlotKey, string> = {
  ring1: "ring", ring2: "ring", ring3: "ring", ring4: "ring",
  face: "face", eye: "eye", earring: "earring",
  pendant1: "pendant", pendant2: "pendant",
  belt: "belt", pocket: "pocket",
  hat: "hat", cape: "cape", top: "top",
  glove: "glove", bottom: "bottom", shoe: "shoe",
  shoulder: "shoulder", medal: "medal",
  weapon: "weapon", secondary: "secondary", emblem: "emblem",
  android: "android", heart: "heart", badge: "badge", title: "title",
  totem1: "totem", totem2: "totem", totem3: "totem",
};

const SYMBOL_TABS: { key: SymbolTabKey; label: string }[] = [
  { key: "arcane", label: "Arcane" },
  { key: "sacred", label: "Sacred" },
];

const SLOT_SIZE = 68;
const SEARCH_LIMIT = 60;
// Center block spans weapon + secondary + emblem columns
const CENTER_WIDTH = 3 * SLOT_SIZE + 2 * 4;

// ── Parse / serialise ──────────────────────────────────────────────────────

function parseDraft(raw: string): EquipmentDraft {
  try { return JSON.parse(raw) as EquipmentDraft; } catch { return {}; }
}

function serialiseDraft(draft: EquipmentDraft): string {
  return JSON.stringify(draft);
}

// ── Item search ─────────────────────────────────────────────────────────────

function normalize(s: string) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function filterItems(items: CatalogItem[], query: string): CatalogItem[] {
  if (!query.trim()) return items.slice(0, SEARCH_LIMIT);
  const tokens = query.trim().split(/\s+/).flatMap((t) => { const n = normalize(t); return n ? [n] : []; });
  const out: CatalogItem[] = [];
  for (const item of items) {
    if (out.length >= SEARCH_LIMIT) break;
    if (tokens.every((t) => normalize(item.name).includes(t))) out.push(item);
  }
  return out;
}

/** Whether a class can equip an item. mask 0 = no filter; items without reqJob are universal. */
function branchAllows(item: CatalogItem, branchMask: number): boolean {
  if (branchMask === 0) return true;
  return !item.reqJob || (item.reqJob & branchMask) !== 0;
}

const startsWithAny = (id: string, prefixes: string[]) => prefixes.some((p) => id.startsWith(p));

function sameItem(a: EquipmentItem | null | undefined, b: EquipmentItem | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.id === b.id && a.name === b.name;
}

// Astra secondaries (id prefix 0172) come in 3 enhancement stages that all share the same
// name; the trailing id digit (0/1/2) is the stage. Surface it so the picker doesn't show
// three identical rows. Stages correspond to the liberation tool's Astra missions.
function withStageLabel(id: string, name: string): string {
  if (!id.startsWith("0172")) return name;
  const stage = Number(id.slice(-1));
  return stage >= 0 && stage <= 2 ? `${name} (Stage ${stage + 1})` : name;
}

interface PickerSource {
  files: string[];
  filter: (item: CatalogItem) => boolean;
}

/** Resolves which data file(s) to load and how to filter them for a given slot + class.
 *  Weapons/secondaries filter by class-specific id prefixes (precise weapon TYPE);
 *  classes without a prefix mapping fall back to branch filtering. */
function resolvePickerSource(slot: SlotKey, classId: string | undefined, branchMask: number): PickerSource {
  if (slot === "weapon") {
    const prefixes = weaponPrefixesForClass(classId);
    if (prefixes) return { files: ["weapon"], filter: (item) => startsWithAny(item.id, prefixes) && branchAllows(item, branchMask) };
    return { files: ["weapon"], filter: (item) => branchAllows(item, branchMask) };
  }
  if (slot === "secondary") {
    const spec = secondarySpecForClass(classId);
    if (spec) {
      return {
        files: spec.files,
        filter: (item) => {
          if (startsWithAny(item.id, spec.prefixes)) return true;
          if (!isShieldId(item.id)) return false;
          // Astra shields are class-specific (matched by name); regular shields are branch-pooled.
          if (item.name.startsWith("Astra ")) return spec.astraShieldNames.includes(item.name);
          return spec.usesShield && branchAllows(item, branchMask);
        },
      };
    }
    return { files: [SLOT_DATA_FILE[slot]], filter: (item) => branchAllows(item, branchMask) };
  }
  return { files: [SLOT_DATA_FILE[slot]], filter: (item) => branchAllows(item, branchMask) };
}

// ── Item picker ────────────────────────────────────────────────────────────

const cachedSlotItems: Partial<Record<string, CatalogItem[]>> = {};

type RawCatalogEntry = [string, string] | [string, string, { reqJob?: number; reqLevel?: number }];

function ItemPicker({ slot, current, theme, files, itemFilter, maxLevel, presetBaseItem, onSelect, onClose }: {
  slot: SlotKey;
  current: EquipmentItem | null | undefined;
  theme: AppTheme;
  files: string[];
  itemFilter: (item: CatalogItem) => boolean;
  maxLevel?: number;
  /** Preset 1's item for this slot, pinned at the top when editing an overridden preset slot. */
  presetBaseItem?: EquipmentItem | null;
  onSelect: (item: EquipmentItem | null) => void;
  onClose: () => void;
}) {
  const [loadedItems, setLoadedItems] = useState<CatalogItem[] | null>(null);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const cacheKey = files.join("+");
  const items = cachedSlotItems[cacheKey] ?? loadedItems;

  useEffect(() => {
    inputRef.current?.focus();
    if (cachedSlotItems[cacheKey]) return;
    const fileList = cacheKey.split("+");
    Promise.all(fileList.map((f) => fetch(`/data/equipment/${f}.json`).then((r) => r.json() as Promise<RawCatalogEntry[]>)))
      .then((raws) => {
        const parsed = raws.flat().map(([id, name, stats]) => ({ id, name: withStageLabel(id, name), reqJob: stats?.reqJob, reqLevel: stats?.reqLevel }));
        cachedSlotItems[cacheKey] = parsed;
        setLoadedItems(parsed);
      })
      .catch(() => setLoadedItems([]));
  }, [cacheKey]);

  const sourceItems = items
    ? items.filter((it) => itemFilter(it) && (maxLevel == null || it.reqLevel == null || it.reqLevel <= maxLevel))
    : null;
  const filtered = sourceItems && query ? filterItems(sourceItems, query) : null;

  return (
    <div style={{ border: `1px solid ${theme.accent}`, borderRadius: 10, background: theme.panel, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", overflow: "hidden" }}>
      {current && (
        <button
          type="button"
          onClick={() => { onSelect(null); onClose(); }}
          style={{
            display: "block", width: "100%", padding: "0.3rem 0.6rem",
            background: "transparent", border: "none", borderBottom: `1px solid ${theme.border}`,
            cursor: "pointer", fontFamily: "inherit",
            fontSize: "0.75rem", fontWeight: 600, color: theme.muted, textAlign: "left",
          }}
        >
          — Clear slot —
        </button>
      )}
      {presetBaseItem && (
        <button
          type="button"
          onClick={() => { onSelect({ id: presetBaseItem.id, name: presetBaseItem.name }); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "0.4rem 0.6rem", background: `${theme.accent}1a`,
            border: "none", borderBottom: `1px solid ${theme.border}`,
            cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          }}
        >
          {presetBaseItem.id && <ItemIcon id={presetBaseItem.id} size={28} />}
          <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 700, color: theme.text }}>{presetBaseItem.name}</span>
          <span style={{
            fontSize: "0.75rem", fontWeight: 800, color: "#fff", background: theme.accent,
            padding: "1px 6px", borderRadius: 6, letterSpacing: "0.03em", flexShrink: 0,
          }}>
            PRESET 1
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="text"
        aria-label={`Search ${SLOT_LABELS[slot]} items`}
        value={query}
        placeholder={`Search ${SLOT_LABELS[slot]}…`}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "100%", border: "none", borderBottom: query ? `1px solid ${theme.border}` : "none",
          borderRadius: 0, background: theme.bg, color: theme.text,
          fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600,
          padding: "0.45rem 0.6rem", outline: "none", boxSizing: "border-box",
        }}
      />
      {query && (
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {items === null && (
            <p style={{ margin: 0, padding: "0.5rem 0.6rem", fontSize: "0.8rem", color: theme.muted, fontWeight: 600 }}>
              Loading…
            </p>
          )}
          {filtered !== null && filtered.length === 0 && (
            <p style={{ margin: 0, padding: "0.5rem 0.6rem", fontSize: "0.8rem", color: theme.muted, fontWeight: 600 }}>
              No results
            </p>
          )}
          {filtered?.map((item) => {
            const isCurrent = item.id === current?.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect({ id: item.id, name: item.name }); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.45rem",
                  width: "100%", padding: "0.3rem 0.6rem",
                  background: isCurrent ? `${theme.accent}33` : "transparent",
                  border: "none", borderBottom: `1px solid ${theme.border}`,
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: "0.8rem", fontWeight: 600, color: theme.text, textAlign: "left",
                }}
                onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = `${theme.accent}22`; }}
                onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
              >
                <ItemIcon id={item.id} size={28} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PICKER_WIDTH = 240;

// ── Slot cell ──────────────────────────────────────────────────────────────

function SlotCell({ slotKey, item, theme, isActive, onClick, picker }: {
  slotKey: SlotKey;
  item: EquipmentItem | null | undefined;
  theme: AppTheme;
  isActive: boolean;
  onClick: () => void;
  picker?: ReactNode;
}) {
  const { ref: wrapperRef, coords: pickerCoords, compute } = usePickerCoords(isActive, PICKER_WIDTH);
  return (
    <div ref={wrapperRef} style={{ position: "relative", width: SLOT_SIZE, flexShrink: 0 }}>
      <div
        role="button"
        tabIndex={0}
        title={item ? item.name : undefined}
        aria-label={item ? `${SLOT_LABELS[slotKey]}: ${item.name}` : `Set ${SLOT_LABELS[slotKey]}`}
        onClick={(e) => { e.stopPropagation(); compute(); onClick(); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); compute(); onClick(); } }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = `${theme.accent}88`; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = theme.border; }}
        onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
        onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
        style={{
          width: SLOT_SIZE, height: SLOT_SIZE,
          border: `1px solid ${isActive ? theme.accent : theme.border}`,
          borderRadius: 8,
          background: isActive ? `${theme.accent}15` : theme.bg,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 2, cursor: "pointer",
          outline: "2px solid transparent", outlineOffset: 2,
          transition: "border-color 0.15s, background 0.15s",
          overflow: "hidden", padding: "2px 3px", boxSizing: "border-box",
        }}
      >
        {item ? (
          <ItemIcon id={item.id} size={48} />
        ) : (
          <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
            {SLOT_LABELS[slotKey]}
          </span>
        )}
      </div>
      {picker && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", width: PICKER_WIDTH, zIndex: 300, top: pickerCoords.top, left: pickerCoords.left }}
        >
          {picker}
        </div>,
        document.body!
      )}
    </div>
  );
}

// ── Column helper ──────────────────────────────────────────────────────────

function SlotColumn({ slots, grid, theme, activeSlot, onToggle, renderPicker }: {
  slots: SlotKey[];
  grid: SlotMap;
  theme: AppTheme;
  activeSlot: SlotKey | null;
  onToggle: (slot: SlotKey) => void;
  renderPicker: (slot: SlotKey) => ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
      {slots.map((slot) => (
        <SlotCell
          key={slot}
          slotKey={slot}
          item={grid[slot]}
          theme={theme}
          isActive={activeSlot === slot}
          onClick={() => onToggle(slot)}
          picker={renderPicker(slot)}
        />
      ))}
    </div>
  );
}

// ── Preset bar (3 equipment presets + copy-from) ─────────────────────────────

function PresetBar({ theme, active, onSwitch }: {
  theme: AppTheme;
  active: number;
  onSwitch: (n: number) => void;
}) {
  const indices = Array.from({ length: PRESET_COUNT }, (_, i) => i);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: theme.muted }}>
        Preset
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        {indices.map((i) => {
          const on = i === active;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSwitch(i)}
              style={{
                border: `1px solid ${on ? theme.accent : theme.border}`,
                borderRadius: 8,
                background: on ? theme.accent : theme.bg,
                color: on ? "#fff" : theme.text,
                fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
                width: 34, height: 32, cursor: "pointer",
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Symbol level tile + section ──────────────────────────────────────────────

function SymbolLevelTile({ area, level, maxLevel, theme, onLevel }: {
  area: SymbolArea;
  level: number;
  maxLevel: number;
  theme: AppTheme;
  onLevel: (level: number) => void;
}) {
  const placed = level >= 1;
  return (
    <div style={{
      width: 84, flexShrink: 0,
      border: `1px solid ${placed ? theme.accent : theme.border}`,
      borderRadius: 8,
      background: placed ? `${theme.accent}15` : theme.bg,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      padding: "6px 4px", boxSizing: "border-box",
    }}>
      <div style={{ opacity: placed ? 1 : 0.3, filter: placed ? "none" : "grayscale(1)", lineHeight: 0 }}>
        <ItemIcon id={area.itemId} size={32} />
      </div>
      <span style={{
        fontSize: "0.75rem", color: placed ? theme.text : theme.muted, fontWeight: 700, lineHeight: 1.1,
        textAlign: "center", width: "100%", minHeight: "2.2em",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {area.name}
      </span>
      <input
        type="number"
        className="no-spinner"
        min={0}
        max={maxLevel}
        aria-label={`${area.name} symbol level`}
        value={level || ""}
        placeholder="Lv 0"
        onChange={(e) => {
          const raw = Math.floor(Number(e.target.value) || 0);
          onLevel(Math.max(0, Math.min(maxLevel, raw)));
        }}
        style={{
          width: 56, textAlign: "center",
          border: `1px solid ${theme.border}`, borderRadius: 6,
          background: theme.bg, color: theme.text,
          fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem",
          padding: "0.25rem", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function SymbolSection({ symbolLevels, activeTab, theme, onTabChange, onLevel }: {
  symbolLevels: Record<string, number>;
  activeTab: SymbolTabKey;
  theme: AppTheme;
  onTabChange: (tab: SymbolTabKey) => void;
  onLevel: (regionName: string, level: number) => void;
}) {
  const maxLevel = activeTab === "arcane" ? ARCANE_MAX_LEVEL : SACRED_MAX_LEVEL;
  const renderTile = (area: SymbolArea) => (
    <SymbolLevelTile
      key={area.itemId}
      area={area}
      level={symbolLevels[area.name] ?? 0}
      maxLevel={maxLevel}
      theme={theme}
      onLevel={(level) => onLevel(area.name, level)}
    />
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: "0.6rem" }}>
        {SYMBOL_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              style={{
                border: `1px solid ${isActive ? theme.accent : theme.border}`,
                borderRadius: 8,
                background: isActive ? theme.accent : theme.bg,
                color: isActive ? "#fff" : theme.text,
                fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
                padding: "0.4rem 0.8rem", cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab === "arcane" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {ARCANE_AREAS.map(renderTile)}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {SACRED_AREAS.map(renderTile)}
          </div>
          <p style={{
            margin: "0.75rem 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: theme.muted,
          }}>
            Grand Sacred
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {GRAND_SACRED_AREAS.map(renderTile)}
          </div>
        </>
      )}
    </div>
  );
}

function SectionHeading({ label, theme }: { label: string; theme: AppTheme }) {
  return (
    <p style={{
      margin: "0 0 0.5rem", fontSize: "0.8rem", fontWeight: 800,
      letterSpacing: "0.03em", textTransform: "uppercase", color: theme.muted,
    }}>
      {label}
    </p>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EquipmentSetupStep({
  theme,
  step,
  stepNumber,
  totalSteps,
  direction = "forward",
  jobName = "",
  characterLevel,
  confirmedCharacterImgURL,
  value,
  onChange,
  onBack,
  onNext,
  onFinish,
}: EquipmentSetupStepProps) {
  const classId = getClassDataByNexonJobName(jobName)?.id;
  const branchMask = branchMaskForClass(classId);
  const [draft, setDraft] = useState<EquipmentDraft>(() => parseDraft(value));
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);
  const activePreset = draft.activePreset ?? 0;
  // Preset 0 is the base; presets 1-2 mirror it until edited (then they're "diverged").
  const isPresetDiverged = (n: number) => n === 0 || (draft.diverged ?? []).includes(n);
  const activeGrid: SlotMap = (isPresetDiverged(activePreset) ? draft.presets?.[activePreset] : draft.presets?.[0]) ?? {};
  const readSlot = (slot: SlotKey) => (isSharedSlot(slot) ? draft[slot] : activeGrid[slot]);

  function commitDraft(next: EquipmentDraft) {
    setDraft(next);
    onChange(serialiseDraft(next));
  }

  /** A fresh length-3 array of preset grids (cloned), so edits don't mutate state. */
  function clonePresets(): SlotMap[] {
    const base = draft.presets ?? [];
    return Array.from({ length: PRESET_COUNT }, (_, i) => ({ ...(base[i] ?? {}) }));
  }
  const [substep, setSubstep] = useState(() => direction === "backward" ? 1 : 0);
  const [substepDirection, setSubstepDirection] = useState<"forward" | "backward">("forward");
  const [hasSubstepSwitched, setHasSubstepSwitched] = useState(false);
  const [symbolTab, setSymbolTab] = useState<SymbolTabKey>("arcane");

  function goToSubstep(next: number) {
    setHasSubstepSwitched(true);
    setSubstepDirection(next > substep ? "forward" : "backward");
    setActiveSlot(null);
    setSubstep(next);
  }

  const substepAnimStyle: CSSProperties = hasSubstepSwitched ? {
    animationName: substepDirection === "forward" ? "setupStepSlideForward" : "setupStepSlideBackward",
    animationDuration: "var(--characters-standard)",
    animationTimingFunction: "ease",
    animationFillMode: "both",
  } : {};

  function updateSlot(slot: SlotKey, item: EquipmentItem | null) {
    if (isSharedSlot(slot)) {
      commitDraft({ ...draft, [slot]: item });
      return;
    }
    const presets = clonePresets();
    if (isPresetDiverged(activePreset)) {
      presets[activePreset] = { ...presets[activePreset], [slot]: item };
      commitDraft({ ...draft, presets });
    } else {
      // First edit of a mirrored preset: split it off with a full copy of preset 1 + this change.
      presets[activePreset] = { ...presets[0], [slot]: item };
      commitDraft({ ...draft, presets, diverged: [...(draft.diverged ?? []), activePreset] });
    }
  }

  function switchPreset(n: number) {
    setActiveSlot(null);
    if (n === activePreset) return;
    commitDraft({ ...draft, activePreset: n });
  }

  function toggleSlot(slot: SlotKey) {
    setActiveSlot((prev) => (prev === slot ? null : slot));
  }

  function setSymbolLevel(regionName: string, level: number) {
    const levels = { ...(draft.symbolLevels ?? {}) };
    if (level >= 1) levels[regionName] = level;
    else delete levels[regionName];
    const next = { ...draft, symbolLevels: levels };
    setDraft(next);
    onChange(serialiseDraft(next));
  }

  useEffect(() => {
    if (!activeSlot) return;
    const close = () => setActiveSlot(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [!!activeSlot]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Preset 1's item for a slot, when editing a different preset where it's been overridden. */
  function presetBaseItemFor(slot: SlotKey): EquipmentItem | null {
    if (isSharedSlot(slot) || activePreset === 0) return null;
    const base = draft.presets?.[0]?.[slot] ?? null;
    if (!base || sameItem(base, readSlot(slot))) return null;
    return base;
  }

  function renderPicker(slot: SlotKey): ReactNode {
    if (activeSlot !== slot) return null;
    const source = resolvePickerSource(slot, classId, branchMask);
    return (
      <ItemPicker
        slot={slot}
        current={readSlot(slot)}
        theme={theme}
        presetBaseItem={presetBaseItemFor(slot)}
        files={source.files}
        itemFilter={source.filter}
        maxLevel={characterLevel}
        onSelect={(item) => updateSlot(slot, item)}
        onClose={() => setActiveSlot(null)}
      />
    );
  }

  if (substep === 1) {
    return (
      <div key={1} style={substepAnimStyle}>
        <SetupStepFrame
          theme={theme}
          stepLabel="Title & Symbols"
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          description="Add your title and enter your symbol levels."
          onBack={() => goToSubstep(0)}
          onNext={onNext}
          onFinish={onFinish}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <SectionHeading label="Title" theme={theme} />
              <SlotCell
                slotKey="title"
                item={draft.title}
                theme={theme}
                isActive={activeSlot === "title"}
                onClick={() => toggleSlot("title")}
                picker={renderPicker("title")}
              />
            </div>
            <div>
              <SectionHeading label="Totems" theme={theme} />
              <div style={{ display: "flex", gap: 4 }}>
                {(["totem1", "totem2", "totem3"] as const).map((slotKey) => (
                  <SlotCell
                    key={slotKey}
                    slotKey={slotKey}
                    item={draft[slotKey]}
                    theme={theme}
                    isActive={activeSlot === slotKey}
                    onClick={() => toggleSlot(slotKey)}
                    picker={renderPicker(slotKey)}
                  />
                ))}
              </div>
            </div>
            <div>
              <SectionHeading label="Symbols" theme={theme} />
              <SymbolSection
                symbolLevels={draft.symbolLevels ?? {}}
                activeTab={symbolTab}
                theme={theme}
                onTabChange={setSymbolTab}
                onLevel={setSymbolLevel}
              />
            </div>
          </div>
        </SetupStepFrame>
      </div>
    );
  }

  // Layout:
  // Col 1: ring1–4, belt, pocket
  // Col 2: face, eye, earring, pendant1, pendant2
  // Center block (3-col wide): sprite above, then weapon / secondary / emblem row
  // Col 6: hat, top, bottom, shoulder, android
  // Col 7: cape, glove, shoe, medal, heart, badge

  const col1: SlotKey[] = ["ring1", "ring2", "ring3", "ring4", "belt", "pocket"];
  const col2: SlotKey[] = ["face", "eye", "earring", "pendant1", "pendant2"];
  const col6: SlotKey[] = ["hat", "top", "bottom", "shoulder", "android"];
  const col7: SlotKey[] = ["cape", "glove", "shoe", "medal", "heart", "badge"];
  const centerBottom: SlotKey[] = ["weapon", "secondary", "emblem"];

  const colStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 };

  return (
    <div key={0} style={substepAnimStyle}>
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      description="Record the items you have equipped."
      onBack={onBack}
      onNext={() => goToSubstep(1)}
      onFinish={onFinish}
      nextLabel="Continue"
    >
      <PresetBar theme={theme} active={activePreset} onSwitch={switchPreset} />
      {/* Equipment grid */}
      <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 4, alignItems: "stretch", width: "fit-content", margin: "0 auto" }}>

        {/* Col 1 */}
        <SlotColumn slots={col1} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} renderPicker={renderPicker} />

        {/* Col 2 */}
        <SlotColumn slots={col2} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} renderPicker={renderPicker} />

        {/* Center block: sprite + weapon/sub/emblem */}
        <div style={{ ...colStyle, width: CENTER_WIDTH }}>
          <div style={{
            flex: 1,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            background: theme.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            minHeight: SLOT_SIZE * 2,
          }}>
            {confirmedCharacterImgURL ? (
              <CharacterAvatar
                src={confirmedCharacterImgURL}
                alt="Character preview"
                width={100}
                height={200}
                style={{ objectFit: "contain", width: 100, height: 200 }}
              />
            ) : (
              <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, padding: "0.5rem", textAlign: "center" }}>
                No preview
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {centerBottom.map((slot) => (
              <SlotCell
                key={slot}
                slotKey={slot}
                item={activeGrid[slot]}
                theme={theme}
                isActive={activeSlot === slot}
                onClick={() => toggleSlot(slot)}
                picker={renderPicker(slot)}
              />
            ))}
          </div>
        </div>

        {/* Col 6 */}
        <SlotColumn slots={col6} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} renderPicker={renderPicker} />

        {/* Col 7 */}
        <SlotColumn slots={col7} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} renderPicker={renderPicker} />

      </div>
      </div>
    </SetupStepFrame>
    </div>
  );
}

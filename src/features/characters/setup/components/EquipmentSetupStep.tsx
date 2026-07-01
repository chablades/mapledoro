"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePickerCoords } from "../hooks/usePickerCoords";
import type { AppTheme } from "../../../../components/themes";
import HoverTooltip from "../../../../components/HoverTooltip";
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
import { IA_TIER_LABELS, IA_TIER_ORDER, getLinesForIATier, type IATier } from "../data/innerAbilityData";

// ── Types ──────────────────────────────────────────────────────────────────

interface EquipmentItem {
  id: string;
  name: string;
}

/** Picker-only item; carries reqJob/reqLevel/onlyEquip for filtering (stored items keep only id/name). */
interface CatalogItem extends EquipmentItem {
  reqJob?: number;
  reqLevel?: number;
  /** Unique-equip: can't be selected in more than one slot of the same group (rings, pendants, totems). */
  onlyEquip?: boolean;
  /** Pet-equip only: ids of the pets that can wear this item; the petequip picker is filtered to the paired pet. */
  wearablePets?: string[];
  /** Pet only: ids of the pet-equips this pet can wear; the pet picker is filtered to a paired equip's wearers. */
  wearableEquips?: string[];
}

type SlotKey =
  | "ring1" | "ring2" | "ring3" | "ring4"
  | "face" | "eye" | "earring" | "pendant1" | "pendant2" | "belt" | "pocket"
  | "hat" | "cape" | "top" | "glove" | "bottom" | "shoe" | "shoulder" | "medal"
  | "weapon" | "secondary" | "emblem" | "android" | "heart" | "badge" | "title"
  | "totem1" | "totem2" | "totem3"
  | "pet1" | "pet2" | "pet3" | "petEquip1" | "petEquip2" | "petEquip3";

type SymbolTabKey = "arcane" | "sacred";

// Title, totems, pets, pet equips, and symbols are shared across presets; the grid slots swap per preset.
type SharedSlotKey = "title" | "totem1" | "totem2" | "totem3" | "pet1" | "pet2" | "pet3" | "petEquip1" | "petEquip2" | "petEquip3";
type SlotMap = Partial<Record<SlotKey, EquipmentItem | null>>;
const PRESET_COUNT = 3;
/** Substeps in this step: 0 = main grid, 1 = pets & inner ability, 2 = additional equipment. */
const SUBSTEP_COUNT = 3;
const SHARED_SLOTS: ReadonlySet<SlotKey> = new Set<SlotKey>(["title", "totem1", "totem2", "totem3", "pet1", "pet2", "pet3", "petEquip1", "petEquip2", "petEquip3"]);
const isSharedSlot = (slot: SlotKey): slot is SharedSlotKey => SHARED_SLOTS.has(slot);

interface IALineDraft {
  tier?: IATier | "";
  value?: string;
}
interface IAPresetDraft {
  lines?: IALineDraft[];
}
interface IADraft {
  activePreset?: number;
  presets?: IAPresetDraft[];
}

interface EquipmentDraft extends Partial<Record<SharedSlotKey, EquipmentItem | null>> {
  /** Three equipment-grid presets. */
  presets?: SlotMap[];
  /** Which preset (0-2) is being edited / is primary. */
  activePreset?: number;
  /** Preset indices that have been edited (split off from preset 1). Others mirror preset 1. */
  diverged?: number[];
  /** Symbol levels keyed by region name; folded into the calculator's tools.symbols on finish. */
  symbolLevels?: Record<string, number>;
  /** Inner Ability presets (3 lines each, each with an independent tier). */
  innerAbility?: IADraft;
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
  pet1: "Pet", pet2: "Pet", pet3: "Pet",
  petEquip1: "Pet Equip", petEquip2: "Pet Equip", petEquip3: "Pet Equip",
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
  pet1: "pet", pet2: "pet", pet3: "pet",
  petEquip1: "petequip", petEquip2: "petequip", petEquip3: "petequip",
};

const SYMBOL_TABS: { key: SymbolTabKey; label: string }[] = [
  { key: "arcane", label: "Arcane" },
  { key: "sacred", label: "Sacred" },
];

const SLOT_SIZE = 68;
const SEARCH_LIMIT = 60;
// Center block spans weapon + secondary + emblem columns
const CENTER_WIDTH = 3 * SLOT_SIZE + 2 * 4;
// Labels for the mobile equipment-grid carousel (one section visible at a time)
const EQUIPMENT_PAGE_LABELS = ["Accessories", "Weapon", "Armor"];

type SwatchColor = { bg: string; border: string; text: string };

// Equipment grid column layouts (static slot key lists).
const COL1_SLOTS: SlotKey[] = ["ring1", "ring2", "ring3", "ring4", "belt", "pocket"];
const COL2_SLOTS: SlotKey[] = ["face", "eye", "earring", "pendant1", "pendant2"];
const COL6_SLOTS: SlotKey[] = ["hat", "top", "bottom", "shoulder", "android"];
const COL7_SLOTS: SlotKey[] = ["cape", "glove", "shoe", "medal", "heart", "badge"];
const CENTER_BOTTOM_SLOTS: SlotKey[] = ["weapon", "secondary", "emblem"];

const pickerClearRowStyle = (theme: AppTheme): CSSProperties => ({
  display: "block", width: "100%", padding: "0.3rem 0.6rem",
  background: "transparent", border: "none", borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit",
  fontSize: "0.75rem", fontWeight: 600, color: theme.muted, textAlign: "left",
});

const presetBaseItemStyle = (theme: AppTheme): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  padding: "0.4rem 0.6rem", background: `${theme.accent}1a`,
  border: "none", borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
});

const presetBadgeStyle = (theme: AppTheme): CSSProperties => ({
  fontSize: "0.75rem", fontWeight: 800, color: "#fff", background: theme.accent,
  padding: "1px 6px", borderRadius: 6, letterSpacing: "0.03em", flexShrink: 0,
});

const pickerSearchInputStyle = (theme: AppTheme, hasQuery: boolean): CSSProperties => ({
  width: "100%", border: "none", borderBottom: hasQuery ? `1px solid ${theme.border}` : "none",
  borderRadius: 0, background: theme.bg, color: theme.text,
  fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600,
  padding: "0.45rem 0.6rem", outline: "none", boxSizing: "border-box",
});

const pickerItemStyle = (theme: AppTheme, isCurrent: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: "0.45rem",
  width: "100%", padding: "0.3rem 0.6rem",
  background: isCurrent ? `${theme.accent}33` : "transparent",
  border: "none", borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit",
  fontSize: "0.8rem", fontWeight: 600, color: theme.text, textAlign: "left",
});

const slotCellStyle = (theme: AppTheme, isActive: boolean): CSSProperties => ({
  width: SLOT_SIZE, height: SLOT_SIZE,
  border: `1px solid ${isActive ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: isActive ? `${theme.accent}15` : theme.bg,
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  gap: 2, cursor: "pointer",
  outline: "2px solid transparent", outlineOffset: 2,
  transition: "border-color 0.15s, background 0.15s",
  overflow: "hidden", padding: "2px 3px", boxSizing: "border-box",
});

const presetButtonStyle = (theme: AppTheme, on: boolean): CSSProperties => ({
  border: `1px solid ${on ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: on ? theme.accent : theme.bg,
  color: on ? "#fff" : theme.text,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
  width: 34, height: 32, cursor: "pointer",
});

const symbolTileStyle = (theme: AppTheme, placed: boolean): CSSProperties => ({
  width: 74, flexShrink: 0,
  border: `1px solid ${placed ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: placed ? `${theme.accent}15` : theme.bg,
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "8px 9px", boxSizing: "border-box",
});

const symbolTileInputStyle = (theme: AppTheme): CSSProperties => ({
  width: 56, textAlign: "center",
  border: `1px solid ${theme.border}`, borderRadius: 6,
  background: theme.bg, color: theme.text,
  fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem",
  padding: "0.25rem", boxSizing: "border-box",
});

const symbolTabStyle = (theme: AppTheme, isActive: boolean): CSSProperties => ({
  border: `1px solid ${isActive ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: isActive ? theme.accent : theme.bg,
  color: isActive ? "#fff" : theme.text,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
  padding: "0.4rem 0.8rem", cursor: "pointer",
});

const spritePreviewStyle = (theme: AppTheme): CSSProperties => ({
  flex: 1,
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  background: theme.bg,
  display: "flex", alignItems: "center", justifyContent: "center",
  overflow: "hidden",
  minHeight: SLOT_SIZE * 2,
});

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
          // startsWith, not exact equality: served names carry a disambiguating "(...)" suffix
          // (gen-equipment.mjs bakes in a stage/stat label since all 3 enhancement tiers share
          // one base name) that astraShieldNames' base names don't include.
          if (item.name.startsWith("Astra ")) return spec.astraShieldNames.some((n) => item.name.startsWith(n));
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

type RawCatalogEntry = [string, string] | [string, string, { reqJob?: number; reqLevel?: number; onlyEquip?: boolean; wearablePets?: string[]; wearableEquips?: string[] }];

/** Slot groups where the same `onlyEquip` item can't occupy more than one slot at once. */
const RING_SLOTS: readonly SlotKey[] = ["ring1", "ring2", "ring3", "ring4"];
const PENDANT_SLOTS: readonly SlotKey[] = ["pendant1", "pendant2"];
const TOTEM_SLOTS: readonly SlotKey[] = ["totem1", "totem2", "totem3"];
const UNIQUE_SLOT_GROUPS: readonly (readonly SlotKey[])[] = [RING_SLOTS, PENDANT_SLOTS, TOTEM_SLOTS];

// A pet equip can only be worn by specific pets. The paired pet/petEquip pickers constrain each
// other by compatibility (in either order), and changing a pet drops an equip it can no longer wear.
const PET_EQUIP_TO_PET: Partial<Record<SlotKey, SharedSlotKey>> = { petEquip1: "pet1", petEquip2: "pet2", petEquip3: "pet3" };
const PET_TO_PET_EQUIP: Partial<Record<SlotKey, SharedSlotKey>> = { pet1: "petEquip1", pet2: "petEquip2", pet3: "petEquip3" };

/** Whether a pet can wear a given pet-equip, using whichever side's compatibility list is loaded in the catalog cache. */
function petEquipCompatible(petId: string, equipId: string): boolean {
  const pet = cachedSlotItems["pet"]?.find((p) => p.id === petId);
  if (pet?.wearableEquips) return pet.wearableEquips.includes(equipId);
  const equip = cachedSlotItems["petequip"]?.find((e) => e.id === equipId);
  return equip?.wearablePets?.includes(petId) ?? false;
}

function ItemPicker({ slot, current, theme, files, itemFilter, maxLevel, excludeIds, presetBaseItem, showAllWhenEmpty, onSelect, onClose }: {
  slot: SlotKey;
  current: EquipmentItem | null | undefined;
  theme: AppTheme;
  files: string[];
  itemFilter: (item: CatalogItem) => boolean;
  maxLevel?: number;
  /** Item ids already placed in sibling slots (e.g. other rings); onlyEquip items among them are hidden. */
  excludeIds?: ReadonlySet<string>;
  /** Preset 1's item for this slot, pinned at the top when editing an overridden preset slot. */
  presetBaseItem?: EquipmentItem | null;
  /** Show the full filtered list before any search (for slots whose filtered catalog is already small, e.g. pet equips). */
  showAllWhenEmpty?: boolean;
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
        const parsed = raws.flat().map(([id, name, stats]) => ({ id, name, reqJob: stats?.reqJob, reqLevel: stats?.reqLevel, onlyEquip: stats?.onlyEquip, wearablePets: stats?.wearablePets, wearableEquips: stats?.wearableEquips }));
        cachedSlotItems[cacheKey] = parsed;
        setLoadedItems(parsed);
      })
      .catch(() => setLoadedItems([]));
  }, [cacheKey]);

  const sourceItems = items
    ? items.filter((it) =>
        itemFilter(it) &&
        it.id !== current?.id &&
        (maxLevel == null || it.reqLevel == null || it.reqLevel <= maxLevel) &&
        !(it.onlyEquip && excludeIds?.has(it.id)))
    : null;
  // With a query: search results. Empty query: the full list when showAllWhenEmpty, else nothing (huge catalogs require a search).
  const emptyQueryList = showAllWhenEmpty ? sourceItems : null;
  const displayed = sourceItems && query ? filterItems(sourceItems, query) : emptyQueryList;
  // Suppress the "revert to preset 1" shortcut if that item is onlyEquip and already placed in a sibling slot.
  const presetBaseConflicts = !!(
    presetBaseItem &&
    excludeIds?.has(presetBaseItem.id) &&
    items?.some((it) => it.id === presetBaseItem.id && it.onlyEquip)
  );

  return (
    <div style={{ border: `1px solid ${theme.accent}`, borderRadius: 10, background: theme.panel, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", overflow: "hidden" }}>
      {current && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.4rem 0.6rem", borderBottom: `1px solid ${theme.border}` }}>
          {current.id && <ItemIcon id={current.id} size={28} />}
          <div style={{ overflow: "hidden" }}>
            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: theme.muted }}>Currently Equipped</p>
            <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current.name}</p>
          </div>
        </div>
      )}
      {current && (
        <button
          type="button"
          onClick={() => { onSelect(null); onClose(); }}
          style={pickerClearRowStyle(theme)}
        >
          — Clear slot —
        </button>
      )}
      {presetBaseItem && !presetBaseConflicts && (
        <button
          type="button"
          onClick={() => { onSelect({ id: presetBaseItem.id, name: presetBaseItem.name }); onClose(); }}
          style={presetBaseItemStyle(theme)}
        >
          {presetBaseItem.id && <ItemIcon id={presetBaseItem.id} size={28} />}
          <span style={{ flex: 1, fontSize: "0.8rem", fontWeight: 700, color: theme.text }}>{presetBaseItem.name}</span>
          <span style={presetBadgeStyle(theme)}>
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
        style={pickerSearchInputStyle(theme, Boolean(query))}
      />
      {(query || showAllWhenEmpty) && (
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {items === null && (
            <p style={{ margin: 0, padding: "0.5rem 0.6rem", fontSize: "0.8rem", color: theme.muted, fontWeight: 600 }}>
              Loading…
            </p>
          )}
          {displayed !== null && displayed.length === 0 && (
            <p style={{ margin: 0, padding: "0.5rem 0.6rem", fontSize: "0.8rem", color: theme.muted, fontWeight: 600 }}>
              No results
            </p>
          )}
          {displayed?.map((item) => {
            const isCurrent = item.id === current?.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { onSelect({ id: item.id, name: item.name }); onClose(); }}
                style={pickerItemStyle(theme, isCurrent)}
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
  const { ref: wrapperRef, portalRef } = usePickerCoords(isActive, PICKER_WIDTH);
  const button = (
    <div
      role="button"
      tabIndex={0}
      data-slot={slotKey}
      aria-label={item ? `${SLOT_LABELS[slotKey]}: ${item.name}` : `Set ${SLOT_LABELS[slotKey]}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = `${theme.accent}88`; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = theme.border; }}
      onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
      onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
      style={slotCellStyle(theme, isActive)}
    >
      {item ? (
        <ItemIcon id={item.id} size={48} />
      ) : (
        <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
          {SLOT_LABELS[slotKey]}
        </span>
      )}
    </div>
  );
  return (
    <div ref={wrapperRef} style={{ position: "relative", width: SLOT_SIZE, flexShrink: 0 }}>
      {item ? <HoverTooltip label={item.name} theme={theme}>{button}</HoverTooltip> : button}
      {picker && createPortal(
        <div
          ref={portalRef}
          data-equipment-picker
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", width: PICKER_WIDTH, zIndex: 300, top: 0, left: 0 }}
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
              style={presetButtonStyle(theme, on)}
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
    <div style={symbolTileStyle(theme, placed)}>
      <HoverTooltip label={area.name} theme={theme}>
        <div style={{ opacity: placed ? 1 : 0.3, filter: placed ? "none" : "grayscale(1)", lineHeight: 0, cursor: "pointer" }}>
          <ItemIcon id={area.itemId} size={32} />
        </div>
      </HoverTooltip>
      <input
        type="number"
        className="no-spinner"
        min={0}
        max={maxLevel}
        aria-label={`${area.name} symbol level`}
        value={level || ""}
        placeholder="0"
        onChange={(e) => {
          const raw = Math.floor(Number(e.target.value) || 0);
          onLevel(Math.max(0, Math.min(maxLevel, raw)));
        }}
        onKeyDown={(e) => { if (!/^\d$/.test(e.key) && !["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"].includes(e.key)) e.preventDefault(); }}
        style={symbolTileInputStyle(theme)}
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
              style={symbolTabStyle(theme, isActive)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab === "arcane" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 74px)", gap: 4 }}>
          {ARCANE_AREAS.map(renderTile)}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 74px)", gap: 4 }}>
            {SACRED_AREAS.map(renderTile)}
          </div>
          <p style={{
            margin: "0.75rem 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: theme.muted,
          }}>
            Grand Sacred
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 74px)", gap: 4 }}>
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

// ── Inner Ability ──────────────────────────────────────────────────────────

const IA_TIER_COLORS: Record<IATier, { bg: string; border: string; text: string }> = {
  rare:      { bg: "#0d1e38", border: "#4080c0", text: "#6ab4ff" },
  epic:      { bg: "#1e0d38", border: "#8040c0", text: "#c084fc" },
  unique:    { bg: "#2a1e00", border: "#c08020", text: "#fbbf24" },
  legendary: { bg: "#001e10", border: "#20a040", text: "#4ade80" },
};

const IA_TIER_INDEX: Record<IATier, number> = { rare: 0, epic: 1, unique: 2, legendary: 3 };

/** Tiers a line may take given the ability grade. Line 1 is always the grade; lines 2-3 floor at
 *  two tiers below (clamped to Rare). Line 2 may reach the grade itself — covering legacy GMS /
 *  TMS Hyper-circulator Legendary 2nd lines — while line 3 caps one tier below the grade. */
function allowedLineTiers(grade: IATier, lineIdx: number): IATier[] {
  if (lineIdx === 0) return [grade];
  const g = IA_TIER_INDEX[grade];
  const hi = lineIdx === 1 ? g : Math.max(0, g - 1);
  return IA_TIER_ORDER.slice(Math.max(0, g - 2), hi + 1);
}

const IA_PICKER_WIDTH = 240;

const iaSearchInputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 6,
  fontFamily: "inherit",
  fontSize: "0.78rem",
  fontWeight: 600,
  padding: "0.3rem 0.5rem",
  outline: "none",
  border: "1px solid",
};

const iaPopoverVisualStyle: CSSProperties = {
  borderRadius: 10,
  boxShadow: "0 6px 24px rgba(0,0,0,0.28)",
  overflow: "hidden",
};

function matchesIAQuery(candidate: string, query: string): boolean {
  const norm = normalize(candidate);
  const tokens = query.trim().split(/\s+/).flatMap((t) => { const n = normalize(t); return n ? [n] : []; });
  return tokens.length > 0 && tokens.every((t) => norm.includes(t));
}

const IA_POPOVER_SHELL: CSSProperties = {
  ...iaPopoverVisualStyle, position: "absolute", top: 0, left: 0, width: IA_PICKER_WIDTH, zIndex: 310,
};

const iaGradeButtonStyle = (theme: AppTheme, c: SwatchColor | null): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  padding: "0.5rem 0.7rem", borderRadius: 8,
  border: `1px solid ${c ? c.border : theme.border}`,
  background: c ? c.border : theme.bg,
  color: c ? "#fff" : theme.muted,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer", textAlign: "left",
  transition: "border-color 0.15s ease, background 0.15s ease",
});

const iaGradeOptionStyle = (theme: AppTheme, tc: SwatchColor, active: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "0.45rem 0.6rem",
  background: active ? tc.border : "transparent", color: active ? "#fff" : theme.text,
  border: "none", borderBottom: `1px solid ${theme.border}`, cursor: "pointer",
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem", textAlign: "left",
});

const iaLineOptionStyle = (theme: AppTheme): CSSProperties => ({
  display: "block", width: "100%", padding: "0.3rem 0.5rem", background: "transparent",
  border: "none", borderBottom: `1px solid ${theme.border}`, cursor: "pointer",
  fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, color: theme.text, textAlign: "left",
});

const iaLineBarStyle = (theme: AppTheme, c: SwatchColor | null, grade: IATier | ""): CSSProperties => ({
  display: "block", width: "100%", padding: "0.5rem 0.7rem", borderRadius: 8,
  border: c ? `1px solid ${c.border}` : `1px dashed ${theme.border}`,
  background: c ? c.border : theme.bg,
  color: c ? "#fff" : theme.muted,
  fontFamily: "inherit", fontWeight: 700, fontSize: "0.82rem", textAlign: "left",
  cursor: grade ? "pointer" : "not-allowed", opacity: grade ? 1 : 0.55,
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
});

const iaTierToggleStyle = (theme: AppTheme, tc: SwatchColor, active: boolean): CSSProperties => ({
  flex: 1, padding: "0.3rem", borderRadius: 6,
  border: `1px solid ${active ? tc.border : theme.border}`,
  background: active ? tc.border : theme.bg, color: active ? "#fff" : theme.muted,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.72rem", cursor: "pointer",
});

/** Colored grade banner ("Legendary Ability") that opens a 4-tier grade selector. */
function IAGradeHeader({ grade, openId, theme, onToggle, onClose, onSelect }: {
  grade: IATier | "";
  openId: string | null;
  theme: AppTheme;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (tier: IATier) => void;
}) {
  const isOpen = openId === "ia-grade";
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, IA_PICKER_WIDTH);
  const c = grade ? IA_TIER_COLORS[grade] : null;
  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; if (!c) e.currentTarget.style.background = theme.panel; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = c ? c.border : theme.border; if (!c) e.currentTarget.style.background = theme.bg; }}
        style={iaGradeButtonStyle(theme, c)}
      >
        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
          <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" />
        </svg>
        {grade ? `${IA_TIER_LABELS[grade]} Ability` : "Set Ability Grade"}
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ marginLeft: "auto", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isOpen && createPortal(
        <div ref={portalRef} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
          style={{ ...IA_POPOVER_SHELL, background: theme.panel, border: `1px solid ${theme.accent}` }}>
          {IA_TIER_ORDER.map((t) => {
            const tc = IA_TIER_COLORS[t];
            const active = grade === t;
            return (
              <button key={t} type="button" onClick={() => { onSelect(t); onClose(); }}
                style={iaGradeOptionStyle(theme, tc, active)}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = tc.border; e.currentTarget.style.color = "#fff"; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.text; } }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: tc.border, flexShrink: 0 }} />
                {IA_TIER_LABELS[t]} Ability
              </button>
            );
          })}
        </div>,
        document.body!
      )}
    </div>
  );
}

/** Search + value list for a line's chosen tier. Mounts when the line popover opens. */
function IALineOptions({ tier, currentValue, theme, onPick }: {
  tier: IATier;
  currentValue: string;
  theme: AppTheme;
  onPick: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const options = getLinesForIATier(tier).filter((l) => l !== currentValue);
  const filtered = query ? options.filter((l) => matchesIAQuery(l, query)) : options;
  return (
    <>
      {currentValue && (
        <button type="button" onClick={() => onPick("")}
          style={pickerClearRowStyle(theme)}>
          — Clear —
        </button>
      )}
      <div style={{ padding: "0.3rem 0.4rem", borderBottom: `1px solid ${theme.border}` }}>
        <input ref={inputRef} type="text" aria-label="Search Inner Ability lines" value={query} placeholder="Search…"
          onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.stopPropagation()}
          style={{ ...iaSearchInputStyle, borderColor: theme.border, background: theme.bg, color: theme.text }} />
      </div>
      <div style={{ maxHeight: 200, overflowY: "auto" }}>
        {filtered.map((line) => (
          <button key={line} type="button" onClick={() => onPick(line)}
            style={iaLineOptionStyle(theme)}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${theme.accent}22`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            {line}
          </button>
        ))}
        {filtered.length === 0 && (
          <p style={{ margin: 0, padding: "0.4rem 0.5rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>No results</p>
        )}
      </div>
    </>
  );
}

/** One colored line bar (tier color + value), opening a popover to pick its tier (≤ grade) and value. */
function IALineBar({ lineIdx, line, grade, openId, theme, onToggle, onClose, onSetTier, onSetValue }: {
  lineIdx: number;
  line: IALineFull;
  grade: IATier | "";
  openId: string | null;
  theme: AppTheme;
  onToggle: () => void;
  onClose: () => void;
  onSetTier: (tier: IATier) => void;
  onSetValue: (tier: IATier, value: string) => void;
}) {
  const isOpen = openId === `ia-line-${lineIdx}`;
  const { ref: wrapperRef, portalRef } = usePickerCoords(isOpen, IA_PICKER_WIDTH);
  const allowed = grade ? allowedLineTiers(grade, lineIdx) : [];
  // Line 1's tier is the grade; a line with a single allowed tier takes it implicitly.
  let tier: IATier | "" = "";
  if (lineIdx === 0) tier = grade;
  else if (line.tier) tier = line.tier;
  else if (allowed.length === 1) tier = allowed[0];
  const showTierRow = lineIdx > 0 && allowed.length > 1;
  const c = tier ? IA_TIER_COLORS[tier] : null;
  const label = !grade ? "Set ability grade first" : (line.value || `Line ${lineIdx + 1}`);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button type="button" disabled={!grade} onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={iaLineBarStyle(theme, c, grade)}>
        {label}
      </button>
      {isOpen && grade && createPortal(
        <div ref={portalRef} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
          style={{ ...IA_POPOVER_SHELL, background: theme.panel, border: `1px solid ${theme.accent}` }}>
          {showTierRow && (
            <div style={{ display: "flex", gap: 4, padding: "0.4rem 0.5rem", borderBottom: `1px solid ${theme.border}` }}>
              {allowed.map((t) => {
                const tc = IA_TIER_COLORS[t];
                const active = line.tier === t;
                return (
                  <button key={t} type="button" onClick={() => onSetTier(t)}
                    style={iaTierToggleStyle(theme, tc, active)}>
                    {IA_TIER_LABELS[t]}
                  </button>
                );
              })}
            </div>
          )}
          {tier ? (
            <IALineOptions tier={tier} currentValue={line.value} theme={theme}
              onPick={(v) => { onSetValue(tier, v); onClose(); }} />
          ) : (
            <p style={{ margin: 0, padding: "0.5rem 0.6rem", fontSize: "0.78rem", color: theme.muted, fontWeight: 600 }}>Pick a tier first</p>
          )}
        </div>,
        document.body!
      )}
    </div>
  );
}

interface IALineFull { tier: IATier | ""; value: string }
interface IAPresetFull { lines: [IALineFull, IALineFull, IALineFull] }
interface IAFull { activePreset: number; presets: [IAPresetFull, IAPresetFull, IAPresetFull] }

/** Fills in defaults for the partial Inner Ability draft so the UI can index it safely. */
function normalizeIA(ia: IADraft | undefined): IAFull {
  const presets = ia?.presets ?? [];
  const preset = (i: number): IAPresetFull => {
    const lines = presets[i]?.lines ?? [];
    const line = (j: number): IALineFull => ({ tier: lines[j]?.tier ?? "", value: lines[j]?.value ?? "" });
    return { lines: [line(0), line(1), line(2)] };
  };
  const activePreset = ia?.activePreset;
  return {
    activePreset: activePreset === 1 || activePreset === 2 ? activePreset : 0,
    presets: [preset(0), preset(1), preset(2)],
  };
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
  const [substep, setSubstep] = useState(() => direction === "backward" ? 2 : 0);
  const [substepDirection, setSubstepDirection] = useState<"forward" | "backward">("forward");
  const [hasSubstepSwitched, setHasSubstepSwitched] = useState(false);
  const [symbolTab, setSymbolTab] = useState<SymbolTabKey>("arcane");
  const [mobileGridPage, setMobileGridPage] = useState(0);
  const [iaOpenId, setIaOpenId] = useState<string | null>(null);
  const iaZoneRef = useRef<HTMLDivElement>(null);
  const ia = normalizeIA(draft.innerAbility);

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
      // Changing the pet drops a paired equip it can no longer wear (cleared pet ⇒ always drop).
      const pairedEquip = PET_TO_PET_EQUIP[slot];
      if (pairedEquip && !sameItem(item, draft[slot])) {
        const equip = draft[pairedEquip];
        if (equip && !(item && petEquipCompatible(item.id, equip.id))) {
          commitDraft({ ...draft, [slot]: item, [pairedEquip]: null });
          return;
        }
      }
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
    setIaOpenId(null);
  }

  function toggleIA(id: string) {
    setIaOpenId((prev) => (prev === id ? null : id));
    setActiveSlot(null);
  }

  function setIAPreset(n: number) {
    setIaOpenId(null); // close any open line/grade popover; it belongs to the preset we're leaving
    if (n === ia.activePreset) return;
    commitDraft({ ...draft, innerAbility: { ...ia, activePreset: n } });
  }

  function setIALine(lineIdx: number, patch: Partial<IALineFull>) {
    const presets = ia.presets.map((p, i) => {
      if (i !== ia.activePreset) return p;
      const lines = p.lines.map((l, j) => (j === lineIdx ? { ...l, ...patch } : l)) as IAPresetFull["lines"];
      return { lines };
    }) as IAFull["presets"];
    commitDraft({ ...draft, innerAbility: { ...ia, presets } });
  }

  // Sets the overall ability grade (= line 1's tier) and re-clamps lines 2-3 that now fall
  // outside their allowed range, clearing the affected line (value pools differ per tier).
  function setIAGrade(grade: IATier) {
    const active = ia.presets[ia.activePreset];
    if (active.lines[0].tier === grade) return;
    const lines = active.lines.map((l, idx) => {
      if (idx === 0) return { tier: grade, value: "" };
      return allowedLineTiers(grade, idx).includes(l.tier as IATier) ? l : { tier: "", value: "" };
    }) as IAPresetFull["lines"];
    const presets = ia.presets.map((p, i) => (i === ia.activePreset ? { lines } : p)) as IAFull["presets"];
    commitDraft({ ...draft, innerAbility: { ...ia, presets } });
  }

  // Closes the Inner Ability line picker on outside clicks, mirroring the equipment grid's
  // activeSlot click handler but scoped to the IA zone (its portal popover stops propagation).
  useEffect(() => {
    if (!iaOpenId) return;
    function handleMouseDown(e: MouseEvent) {
      if (iaZoneRef.current && !iaZoneRef.current.contains(e.target as Node)) setIaOpenId(null);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [iaOpenId]);

  function setSymbolLevel(regionName: string, level: number) {
    const levels = { ...(draft.symbolLevels ?? {}) };
    if (level >= 1) levels[regionName] = level;
    else delete levels[regionName];
    const next = { ...draft, symbolLevels: levels };
    setDraft(next);
    onChange(serialiseDraft(next));
  }

  // Capture phase so a tap on another slot can swap the picker directly, even when the open
  // picker's portal (absolutely positioned, high z-index) visually overlaps that slot — checking
  // elementsFromPoint sees through the portal to the slot cell underneath. Walk top-to-bottom so
  // a click that actually lands on the picker (e.g. its search box or "Clear slot" button) is
  // left alone even if some other slot cell happens to sit underneath it at that point.
  useEffect(() => {
    if (!activeSlot) return;
    const handleClick = (e: MouseEvent) => {
      const path = document.elementsFromPoint(e.clientX, e.clientY);
      for (const el of path) {
        if (!(el instanceof HTMLElement)) continue;
        if (el.hasAttribute("data-equipment-picker")) return;
        if (el.dataset.slot) {
          const slot = el.dataset.slot as SlotKey;
          if (slot !== activeSlot) {
            e.stopPropagation();
            setActiveSlot(slot);
          }
          return;
        }
      }
      setActiveSlot(null);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [activeSlot]);

  /** Item ids placed in sibling slots of the same unique-equip group (other rings/pendants/totems). */
  function siblingItemIds(slot: SlotKey): ReadonlySet<string> | undefined {
    const group = UNIQUE_SLOT_GROUPS.find((g) => g.includes(slot));
    if (!group) return undefined;
    const ids = new Set<string>();
    for (const sibling of group) {
      if (sibling === slot) continue;
      const item = readSlot(sibling);
      if (item) ids.add(item.id);
    }
    return ids;
  }

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
    let itemFilter = source.filter;
    let showAllWhenEmpty = false;

    const pairedPet = PET_EQUIP_TO_PET[slot]; // set ⇒ this is a petEquip slot
    const pairedEquip = PET_TO_PET_EQUIP[slot]; // set ⇒ this is a pet slot
    if (pairedPet) {
      // Pet chosen: show only the equips it can wear — a short list, so reveal it without searching.
      const pet = draft[pairedPet];
      if (pet) {
        itemFilter = (item) => source.filter(item) && (item.wearablePets?.includes(pet.id) ?? false);
        showAllWhenEmpty = true;
      }
    } else if (pairedEquip && !readSlot(slot)) {
      // Equip chosen but this pet slot is empty: narrow the pet list to its wearers (guides equip→pet
      // order) and reveal that short list without searching.
      const equip = draft[pairedEquip];
      if (equip) {
        itemFilter = (item) => source.filter(item) && (item.wearableEquips?.includes(equip.id) ?? false);
        showAllWhenEmpty = true;
      }
    }

    return (
      <ItemPicker
        slot={slot}
        current={readSlot(slot)}
        theme={theme}
        presetBaseItem={presetBaseItemFor(slot)}
        excludeIds={siblingItemIds(slot)}
        files={source.files}
        itemFilter={itemFilter}
        maxLevel={characterLevel}
        showAllWhenEmpty={showAllWhenEmpty}
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
          stepLabel="Pets & Inner Ability"
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          substepIndex={substep}
          substepCount={SUBSTEP_COUNT}
          description="All slots and fields are optional. Fill in what you can."
          onBack={() => goToSubstep(0)}
          onNext={() => goToSubstep(2)}
          onFinish={onFinish}
          nextLabel="Continue"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <SectionHeading label="Pets" theme={theme} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {([["pet1", "petEquip1"], ["pet2", "petEquip2"], ["pet3", "petEquip3"]] as const).map(([petKey, equipKey]) => (
                  <div key={petKey} style={{ display: "flex", gap: 4 }}>
                    <SlotCell
                      slotKey={petKey}
                      item={draft[petKey]}
                      theme={theme}
                      isActive={activeSlot === petKey}
                      onClick={() => toggleSlot(petKey)}
                      picker={renderPicker(petKey)}
                    />
                    <SlotCell
                      slotKey={equipKey}
                      item={draft[equipKey]}
                      theme={theme}
                      isActive={activeSlot === equipKey}
                      onClick={() => toggleSlot(equipKey)}
                      picker={renderPicker(equipKey)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div ref={iaZoneRef}>
              <SectionHeading label="Inner Ability" theme={theme} />
              <div style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 6 }}>
                <PresetBar theme={theme} active={ia.activePreset} onSwitch={setIAPreset} />
                <IAGradeHeader
                  grade={ia.presets[ia.activePreset].lines[0].tier}
                  openId={iaOpenId}
                  theme={theme}
                  onToggle={() => toggleIA("ia-grade")}
                  onClose={() => setIaOpenId(null)}
                  onSelect={setIAGrade}
                />
                {ia.presets[ia.activePreset].lines.map((line, i) => (
                  <IALineBar
                    key={i}
                    lineIdx={i}
                    line={line}
                    grade={ia.presets[ia.activePreset].lines[0].tier}
                    openId={iaOpenId}
                    theme={theme}
                    onToggle={() => toggleIA(`ia-line-${i}`)}
                    onClose={() => setIaOpenId(null)}
                    onSetTier={(t) => setIALine(i, { tier: t, value: "" })}
                    onSetValue={(t, v) => setIALine(i, { tier: t, value: v })}
                  />
                ))}
              </div>
            </div>
          </div>
        </SetupStepFrame>
      </div>
    );
  }

  if (substep === 2) {
    return (
      <div key={2} style={substepAnimStyle}>
        <SetupStepFrame
          theme={theme}
          stepLabel="Additional Equipment"
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          substepIndex={substep}
          substepCount={SUBSTEP_COUNT}
          description="All slots and fields are optional. Fill in what you can."
          onBack={() => goToSubstep(1)}
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

  const navBtnStyle: CSSProperties = {
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    background: theme.bg,
    color: theme.text,
    fontFamily: "inherit", fontWeight: 800, fontSize: "1.5rem",
    width: 44, height: 48, cursor: "pointer",
  };

  return (
    <div key={0} className="eq-substep-root" style={substepAnimStyle}>
    <style>{`
      .eq-substep-root {
        container-type: inline-size;
      }
      /* Carousel kicks in once the available width can't fit the full grid (~500px),
         regardless of which page-layout breakpoint produced that width. */
      @container (max-width: 520px) {
        .eq-page-0 .eq-section-1, .eq-page-0 .eq-section-2,
        .eq-page-1 .eq-section-0, .eq-page-1 .eq-section-2,
        .eq-page-2 .eq-section-0, .eq-page-2 .eq-section-1 { display: none; }
        .eq-page-label.eq-page-label { display: block; }
        .eq-page-nav-btn.eq-page-nav-btn { display: flex; align-items: center; justify-content: center; }
      }
    `}</style>
    <SetupStepFrame
      theme={theme}
      stepLabel={step.label}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      substepIndex={substep}
      substepCount={SUBSTEP_COUNT}
      description="All slots are optional. Fill in what you can."
      onBack={onBack}
      onNext={() => goToSubstep(1)}
      onFinish={onFinish}
      nextLabel="Continue"
    >
      <PresetBar theme={theme} active={activePreset} onSwitch={switchPreset} />
      <p className="eq-page-label" style={{ margin: "0 0 8px", fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
        {EQUIPMENT_PAGE_LABELS[mobileGridPage]}
      </p>
      {/* Equipment grid */}
      <div className={`eq-page-${mobileGridPage}`}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>

        <button type="button" className="eq-page-nav-btn" aria-label="Previous section" onClick={() => setMobileGridPage((p) => (p + 2) % 3)} style={navBtnStyle}>‹</button>

        <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>

          <div className="eq-section eq-section-0" style={{ gap: 4, flexShrink: 0 }}>
            {/* Col 1 */}
            <SlotColumn slots={COL1_SLOTS} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} renderPicker={renderPicker} />

            {/* Col 2 */}
            <SlotColumn slots={COL2_SLOTS} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} renderPicker={renderPicker} />
          </div>

          {/* Center block: sprite + weapon/sub/emblem */}
          <div className="eq-section eq-section-1" style={{ flexDirection: "column", gap: 4, flexShrink: 0, width: CENTER_WIDTH }}>
            <div style={spritePreviewStyle(theme)}>
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
              {CENTER_BOTTOM_SLOTS.map((slot) => (
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

          <div className="eq-section eq-section-2" style={{ gap: 4, flexShrink: 0 }}>
            {/* Col 6 */}
            <SlotColumn slots={COL6_SLOTS} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} renderPicker={renderPicker} />

            {/* Col 7 */}
            <SlotColumn slots={COL7_SLOTS} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} renderPicker={renderPicker} />
          </div>

        </div>

        <button type="button" className="eq-page-nav-btn" aria-label="Next section" onClick={() => setMobileGridPage((p) => (p + 1) % 3)} style={navBtnStyle}>›</button>

      </div>
      </div>
    </SetupStepFrame>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePickerCoords } from "../hooks/usePickerCoords";
import { numericKeyDown, sanitizeDigitsInput, isStrayClick } from "../../../../lib/inputUtils";
import { useKeyboardListNav } from "../../../../lib/useKeyboardListNav";
import { searchAndRank } from "../../../../lib/searchMatch";
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
import type { SymbolState } from "../../../tools/symbols/useSymbolState";
import { getClassDataByNexonJobName } from "../data/classSkillData";
import { isArcaneEligible, isSacredEligible, isWeaponAttSane, deriveWeaponAttLabel, WEAPON_ATT_WARN_AT } from "../data/statsStepDraft";
import { branchMaskForClass, weaponPrefixesForClass, secondarySpecForClass, isShieldId } from "../data/classBranch";
import { readCharactersStore, selectCharacterByIgn } from "../../model/charactersStore";
import {
  isSharedSlot, sameItem, parseEquipmentStepDraft, serializeEquipmentStepDraft, storedEquipmentToDraft,
  SLOT_LABELS, SLOT_SIZE, CENTER_WIDTH, SYMBOL_TILE_SIZE, EQUIPMENT_PAGE_LABELS,
  COL1_SLOTS, COL2_SLOTS, COL6_SLOTS, COL7_SLOTS, CENTER_BOTTOM_SLOTS,
  slotCellStyle, navBtnStyle,
  type SlotKey, type SharedSlotKey, type SlotMap, type EquipmentItem, type EquipmentDraft,
} from "../data/equipmentStepDraft";
import { InputWarningBubble } from "./QuestionControls";

// ── Types ──────────────────────────────────────────────────────────────────

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

type SymbolTabKey = "arcane" | "sacred";

const PRESET_COUNT = 3;
/** Substeps in this step: 0 = main grid, 1 = additional equipment, 2 = pets. */
const SUBSTEP_COUNT = 3;

// Reading-order chains for the two substeps whose slots line up top-to-bottom in a single
// in-game window (Titles/Totems/Symbols, Pets). The main grid's own chain (MAIN_GRID_CHAIN,
// defined below once its column layout constants exist) is a 2D spatial layout, but a
// column-based reading order was worked out with Yuki (2026-07-08) — see its own comment.
const ADDITIONAL_EQUIP_CHAIN: readonly SlotKey[] = ["title", "totem1", "totem2", "totem3"];
const PETS_CHAIN: readonly SlotKey[] = ["pet1", "petEquip1", "pet2", "petEquip2", "pet3", "petEquip3"];

function chainForSlot(slot: SlotKey): readonly SlotKey[] | null {
  if (ADDITIONAL_EQUIP_CHAIN.includes(slot)) return ADDITIONAL_EQUIP_CHAIN;
  if (PETS_CHAIN.includes(slot)) return PETS_CHAIN;
  if (MAIN_GRID_CHAIN.includes(slot)) return MAIN_GRID_CHAIN;
  return null;
}

interface EquipmentSetupStepProps {
  theme: AppTheme;
  step: SetupStepDefinition;
  stepNumber: number;
  totalSteps: number;
  direction?: "forward" | "backward";
  targetSubstep?: number | null;
  /** When true, targetSubstep is the substep opened from a profile bookmark's edit
   *  pencil — it should present as if it were this step's only substep, mirroring
   *  StatsSetupStep's own confineToSubstep prop. */
  confineToSubstep?: boolean;
  onSubstepChange?: (substepIndex: number) => void;
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
// SLOT_LABELS, sizing/layout constants, and the shared tile/nav styles live in
// equipmentStepDraft.ts (react-doctor's only-export-components rule), imported above.

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

const SEARCH_LIMIT = 60;
// A symbol group's 3-column tile grid — used to align its Max All/Clear header to the
// same width so those buttons can right-align against the actual last tile.
const SYMBOL_GRID_WIDTH = 3 * SYMBOL_TILE_SIZE + 2 * 4;

// Reading-order chain for the main equipment grid (confirmed with Yuki, 2026-07-08): top to
// bottom within each column, then the top of the next column, following the grid's own
// left-to-right column order — rings/belt/pocket, then face/eye/earring/pendants, then
// weapon/secondary/emblem, then hat/top/bottom/shoulder/android, then cape/glove/shoe/
// medal/heart/badge. The sprite itself isn't a pickable slot, so it's naturally skipped.
const MAIN_GRID_CHAIN: readonly SlotKey[] = [
  ...COL1_SLOTS, ...COL2_SLOTS, ...CENTER_BOTTOM_SLOTS, ...COL6_SLOTS, ...COL7_SLOTS,
];

const equippedHeaderStyle = (theme: AppTheme, interactive: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  padding: "0.4rem 0.6rem",
  // `border: "none"` (to reset the button's default border) would also wipe out a
  // borderBottom set before it, since the shorthand resets all sides — so borderBottom
  // is applied last, unconditionally, guaranteeing it always wins.
  ...(interactive
    ? { background: "none", border: "none", font: "inherit", textAlign: "left" as const, cursor: "pointer" }
    : {}),
  borderBottom: `1px solid ${theme.border}`,
});

const equippedHeaderLabelStyle = (theme: AppTheme): CSSProperties => ({
  margin: 0, fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: theme.muted,
});

const equippedHeaderNameStyle = (theme: AppTheme): CSSProperties => ({
  margin: 0, fontSize: "0.8rem", fontWeight: 700, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
});

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

function pickerItemBackground(theme: AppTheme, isCurrent: boolean, isHighlighted: boolean): string {
  if (isCurrent) return `${theme.accent}33`;
  if (isHighlighted) return `${theme.accent}22`;
  return "transparent";
}

const pickerItemStyle = (theme: AppTheme, isCurrent: boolean, isHighlighted: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: "0.45rem",
  width: "100%", padding: "0.3rem 0.6rem",
  background: pickerItemBackground(theme, isCurrent, isHighlighted),
  border: "none", borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit",
  fontSize: "0.8rem", fontWeight: 600, color: theme.text, textAlign: "left",
});

const presetButtonStyle = (theme: AppTheme, on: boolean): CSSProperties => ({
  border: `1px solid ${on ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: on ? theme.accent : theme.bg,
  color: on ? "#fff" : theme.text,
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
  width: 34, height: 32, cursor: "pointer",
});

// Deliberately no opacity on this container: it wraps a HoverTooltip bubble (a real DOM
// child, not a native title), and CSS opacity compounds onto descendants — a dimmed tile
// made its own tooltip render washed-out/translucent on hover. Locked is already visually
// distinct via the icon's own dimming (below), the muted "Lv X+" badge, and the missing
// input, so no separate container-level fade is needed.
const symbolTileStyle = (theme: AppTheme, placed: boolean): CSSProperties => ({
  width: SYMBOL_TILE_SIZE, flexShrink: 0,
  border: `1px solid ${placed ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: placed ? `${theme.accent}15` : theme.bg,
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "8px 9px", boxSizing: "border-box",
});

// Read-only counterpart: no accent highlight, since there's nothing being "selected" on a
// display-only tile — placed-vs-unplaced already reads from the icon's own opacity/grayscale.
// Locked gets a dashed border on top of that (mirrors iaLineChipStyle's own dashed-when-unset
// convention) so it doesn't just look like an emptier version of "unlocked but 0" — it reads
// as a different kind of empty.
const readOnlySymbolTileStyle = (theme: AppTheme, locked?: boolean): CSSProperties => ({
  width: SYMBOL_TILE_SIZE, flexShrink: 0,
  border: locked ? `1px dashed ${theme.border}` : `1px solid ${theme.border}`,
  borderRadius: 8,
  background: theme.bg,
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "8px 9px", boxSizing: "border-box",
});

// Padding + matching negative margin grows the actual clickable box toward a 44px
// touch target without shifting surrounding layout — the button still occupies its
// original space, it just responds to taps/clicks a bit outside its visible text.
const symbolSectionBtnStyle: CSSProperties = {
  background: "none", border: "none", font: "inherit",
  fontSize: "0.75rem", fontWeight: 800,
  padding: "15px 6px", margin: "-15px -6px",
  cursor: "pointer",
};

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
  color: isActive ? theme.accentOn : theme.text,
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

// ── Item search ─────────────────────────────────────────────────────────────

function filterItems(items: CatalogItem[], query: string): CatalogItem[] {
  if (!query.trim()) return items.slice(0, SEARCH_LIMIT);
  return searchAndRank(items, query, (item) => item.name).slice(0, SEARCH_LIMIT);
}

/** Whether a class can equip an item. mask 0 = no filter; items without reqJob are universal. */
function branchAllows(item: CatalogItem, branchMask: number): boolean {
  if (branchMask === 0) return true;
  return !item.reqJob || (item.reqJob & branchMask) !== 0;
}

const startsWithAny = (id: string, prefixes: string[]) => prefixes.some((p) => id.startsWith(p));

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

function ItemPicker({
  slot, current, theme, files, itemFilter, maxLevel, excludeIds, presetBaseItem, showAllWhenEmpty,
  onSelect, onClose, onAdvance, onPrev, onNext, weaponAttStep,
}: {
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
  /** Called (instead of onClose) after an actual pick, for slots that belong to a chained
   *  group (e.g. Title → Totems, Pet 1 → Pet Equip 1 → Pet 2 → …). viaKeyboard distinguishes
   *  an Enter-driven pick from a mouse click — only a keyboard pick jumps slots, since a
   *  mouse click means the user's cursor is staying local. Slots outside a chain (the main
   *  equipment grid) don't pass this, so a pick there always just closes, same as before. */
  onAdvance?: (viaKeyboard: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** Weapon slot, preset 1 only: picking (or reviewing) an item shows a Weapon ATT/MATT
   *  ask in this same popover before committing, mirroring the Familiars tier-pick flow. */
  weaponAttStep?: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  };
}) {
  const [loadedItems, setLoadedItems] = useState<CatalogItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [pendingItem, setPendingItem] = useState<EquipmentItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAndroid = slot === "android";

  function selectItem(item: EquipmentItem, viaKeyboard: boolean) {
    if (weaponAttStep) { setPendingItem(item); return; }
    onSelect(item);
    if (onAdvance) { onAdvance(viaKeyboard); } else { onClose(); }
  }

  const cacheKey = files.join("+");
  const items = cachedSlotItems[cacheKey] ?? loadedItems;

  // Refocus the search box whenever we're not showing the weapon-ATT follow-up screen —
  // including when "Back" returns from it, so typing can resume without an extra click.
  useEffect(() => {
    if (!pendingItem) inputRef.current?.focus();
  }, [pendingItem]);

  useEffect(() => {
    if (cachedSlotItems[cacheKey]) return;
    let cancelled = false;
    const fileList = cacheKey.split("+");
    Promise.all(fileList.map((f) => fetch(`/data/equipment/${f}.json`).then((r) => r.json() as Promise<RawCatalogEntry[]>)))
      .then((raws) => {
        const parsed = raws.flat().map(([id, name, stats]) => ({ id, name, reqJob: stats?.reqJob, reqLevel: stats?.reqLevel, onlyEquip: stats?.onlyEquip, wearablePets: stats?.wearablePets, wearableEquips: stats?.wearableEquips }));
        cachedSlotItems[cacheKey] = parsed;
        if (!cancelled) setLoadedItems(parsed);
      })
      .catch(() => { if (!cancelled) setLoadedItems([]); });
    return () => { cancelled = true; };
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

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: displayed ?? [],
    resetKey: query,
    onSelect: (item) => selectItem({ id: item.id, name: item.name }, true),
    onClose,
    onPrev,
    onNext,
  });

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && query === "" && current) {
      e.preventDefault();
      onSelect(null);
      onClose();
      return;
    }
    navKeyDown(e);
  }

  if (pendingItem && weaponAttStep) {
    return (
      <WeaponAttStepView
        item={pendingItem}
        theme={theme}
        isAndroid={isAndroid}
        label={weaponAttStep.label}
        value={weaponAttStep.value}
        onChange={weaponAttStep.onChange}
        onBack={() => setPendingItem(null)}
        onConfirm={(viaKeyboard) => {
          onSelect(pendingItem);
          if (onAdvance) { onAdvance(viaKeyboard); } else { onClose(); }
        }}
      />
    );
  }

  return (
    <div style={{ border: `1px solid ${theme.accent}`, borderRadius: 10, background: theme.panel, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", overflow: "hidden" }}>
      {current && weaponAttStep ? (
        <button
          type="button"
          onClick={() => setPendingItem(current)}
          style={equippedHeaderStyle(theme, true)}
        >
          {current.id && <ItemIcon id={current.id} size={28} revealed={isAndroid} />}
          <div style={{ overflow: "hidden", flex: 1 }}>
            <p style={equippedHeaderLabelStyle(theme)}>Currently Equipped</p>
            <p style={equippedHeaderNameStyle(theme)}>{current.name}</p>
          </div>
          <span style={{ flexShrink: 0, color: theme.muted, fontSize: "0.85rem" }}>›</span>
        </button>
      ) : current && (
        <div style={equippedHeaderStyle(theme, false)}>
          {current.id && <ItemIcon id={current.id} size={28} revealed={isAndroid} />}
          <div style={{ overflow: "hidden" }}>
            <p style={equippedHeaderLabelStyle(theme)}>Currently Equipped</p>
            <p style={equippedHeaderNameStyle(theme)}>{current.name}</p>
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
          onClick={() => selectItem({ id: presetBaseItem.id, name: presetBaseItem.name }, false)}
          style={presetBaseItemStyle(theme)}
        >
          {presetBaseItem.id && <ItemIcon id={presetBaseItem.id} size={28} revealed={isAndroid} />}
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
        onKeyDown={handleSearchKeyDown}
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
          {displayed?.map((item, i) => {
            const isCurrent = item.id === current?.id;
            const isHighlighted = i === highlightedIndex;
            return (
              <button
                key={item.id}
                ref={itemRef(i)}
                type="button"
                onClick={() => selectItem({ id: item.id, name: item.name }, false)}
                style={pickerItemStyle(theme, isCurrent, isHighlighted)}
                onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = `${theme.accent}22`; }}
                onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
              >
                <ItemIcon id={item.id} size={28} revealed={isAndroid} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const weaponAttBackButtonStyle = (theme: AppTheme): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  background: "transparent", border: "none", borderBottom: `1px solid ${theme.border}`,
  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
  padding: "0.4rem 0.6rem",
});

const weaponAttConfirmButtonStyle = (theme: AppTheme, disabled: boolean): CSSProperties => ({
  border: "none", borderRadius: 8, padding: "0.4rem 0.9rem",
  fontFamily: "inherit", fontWeight: 800, fontSize: "0.8rem",
  cursor: disabled ? "default" : "pointer",
  background: disabled ? theme.border : theme.accent,
  color: disabled ? theme.muted : "#fff",
  opacity: disabled ? 0.6 : 1,
});

const weaponAttInputStyle = (theme: AppTheme): CSSProperties => ({
  width: "100%", boxSizing: "border-box", border: `1px solid ${theme.border}`, borderRadius: 8,
  background: theme.bg, color: theme.text, fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 700,
  padding: "0.4rem 0.6rem", outline: "2px solid transparent",
});

// Follow-up screen shown inside the weapon slot's picker after selecting an item (preset
// 1 only) — mirrors FamiliarsSetupStep's tier-pick flow, so the ATT ask is tied to the
// moment of picking the weapon instead of a separate field elsewhere on the page.
function WeaponAttStepView({ item, theme, isAndroid, label, value, onChange, onBack, onConfirm }: {
  item: EquipmentItem;
  theme: AppTheme;
  isAndroid: boolean;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  /** viaKeyboard distinguishes an Enter-driven confirm from a mouse click on Done — only a
   *  keyboard confirm advances to the next slot in the chain, matching every other picker's
   *  Enter-advances/click-just-closes convention. */
  onConfirm: (viaKeyboard: boolean) => void;
}) {
  const sane = isWeaponAttSane(value);
  const showWarning = Number(value) > WEAPON_ATT_WARN_AT;
  const statShortName = label.endsWith("Magic ATT") ? "Magic ATT" : "ATT";
  // Focus once on mount only — re-running this on every render (the usual guarded-ref
  // autofocus pattern) would fight the user for focus if anything elsewhere causes a
  // harmless re-render while they're mid-selection, silently clearing their selection.
  const hasAutoFocusedRef = useRef(false);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") { onBack(); return; }
    if (e.key === "Enter") {
      if (sane) onConfirm(true);
      return;
    }
    numericKeyDown(e);
  }

  return (
    <div style={{ border: `1px solid ${theme.accent}`, borderRadius: 10, background: theme.panel, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", overflow: "hidden" }}>
      <button type="button" onClick={onBack} style={weaponAttBackButtonStyle(theme)}>
        {item.id && <ItemIcon id={item.id} size={28} revealed={isAndroid} />}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.8rem", fontWeight: 700, color: theme.text }}>
          ← {item.name}
        </span>
      </button>
      <div style={{ padding: "0.6rem" }}>
        <p style={{ margin: "0 0 0.4rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>
          {`Enter the total ${label} shown on this weapon's tooltip (the white number with a +).`}
        </p>
        <div style={{ position: "relative" }}>
          {showWarning && (
            <InputWarningBubble message={`That looks like your total ${statShortName}, enter your weapon's ${statShortName}.`} theme={theme} />
          )}
          <input
            ref={(el) => {
              if (el && !hasAutoFocusedRef.current) {
                hasAutoFocusedRef.current = true;
                el.focus();
              }
            }}
            type="text"
            inputMode="numeric"
            aria-label={label}
            value={value}
            placeholder="0"
            onChange={(e) => onChange(sanitizeDigitsInput(e.target.value))}
            onKeyDown={handleKeyDown}
            style={weaponAttInputStyle(theme)}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.6rem" }}>
          <button type="button" disabled={!sane} onClick={() => onConfirm(false)} style={weaponAttConfirmButtonStyle(theme, !sane)}>
            Done
          </button>
        </div>
      </div>
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
    <button
      type="button"
      data-slot={slotKey}
      aria-label={item ? `${SLOT_LABELS[slotKey]}: ${item.name}` : `Set ${SLOT_LABELS[slotKey]}`}
      onClick={(e) => { e.stopPropagation(); if (isStrayClick(e)) { return; } onClick(); }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = `${theme.accent}88`; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = theme.border; }}
      onFocus={(e) => { e.currentTarget.style.outlineColor = theme.accent; }}
      onBlur={(e) => { e.currentTarget.style.outlineColor = "transparent"; }}
      style={slotCellStyle(theme, isActive)}
    >
      {item ? (
        <ItemIcon id={item.id} size={48} revealed={slotKey === "android"} />
      ) : (
        <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
          {SLOT_LABELS[slotKey]}
        </span>
      )}
    </button>
  );
  return (
    <div ref={wrapperRef} style={{ position: "relative", width: SLOT_SIZE, flexShrink: 0 }}>
      {item ? <HoverTooltip label={item.name} theme={theme}>{button}</HoverTooltip> : button}
      {isActive && typeof document !== "undefined" && createPortal(
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

/** Read-only counterpart to SlotCell for the profile Gear bookmark — same icon/empty-label
 *  box and sizing (slotCellStyle/SLOT_SIZE), but no button semantics, hover-swap, or picker
 *  portal, since nothing here is clickable. */
export function ReadOnlySlotTile({ slotKey, item, theme }: {
  slotKey: SlotKey;
  item: EquipmentItem | null | undefined;
  theme: AppTheme;
}) {
  const box = (
    <div style={{ ...slotCellStyle(theme, false), cursor: "default", width: SLOT_SIZE, flexShrink: 0 }}>
      {item ? (
        <ItemIcon id={item.id} size={48} revealed={slotKey === "android"} />
      ) : (
        <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
          {SLOT_LABELS[slotKey]}
        </span>
      )}
    </div>
  );
  return item ? <HoverTooltip label={item.name} theme={theme}>{box}</HoverTooltip> : box;
}

/** Read-only counterpart to SymbolLevelTile for the profile Gear bookmark — same icon tile,
 *  but the level renders as plain text instead of an input. Three visually distinct states:
 *  placed (leveled, full color), unlocked-but-unleveled (lightly dimmed, still a normal solid
 *  border — it's available, just empty), and `locked` (character hasn't reached this area's
 *  required level yet — heavily dimmed + grayscale + dashed border + the unlock level instead
 *  of a real always-0 level), so a locked area reads as "not unlocked yet" rather than either
 *  "bugged" or "just an emptier version of unleveled." */
function symbolTileIconOpacity(locked: boolean | undefined, placed: boolean): number {
  if (locked) return 0.3;
  return placed ? 1 : 0.6;
}

export function ReadOnlySymbolTile({ area, level, theme, locked }: {
  area: SymbolArea;
  level: number;
  theme: AppTheme;
  locked?: boolean;
}) {
  const placed = !locked && level >= 1;
  const label = locked ? `Lv. ${area.requiredLevel}+` : `Lv. ${level}`;
  const iconOpacity = symbolTileIconOpacity(locked, placed);
  return (
    <HoverTooltip label={area.name} theme={theme}>
      <div style={readOnlySymbolTileStyle(theme, locked)}>
        <div style={{ opacity: iconOpacity, filter: locked ? "grayscale(1)" : "none", lineHeight: 0 }}>
          <ItemIcon id={area.itemId} size={32} />
        </div>
        <span style={{ fontFamily: "inherit", fontWeight: 700, fontSize: "0.8rem", color: placed ? theme.text : theme.muted }}>{label}</span>
      </div>
    </HoverTooltip>
  );
}

// ── Column helper ──────────────────────────────────────────────────────────

function SlotColumn({ slots, grid, theme, activeSlot, onToggle, pickerCtx }: {
  slots: SlotKey[];
  grid: SlotMap;
  theme: AppTheme;
  activeSlot: SlotKey | null;
  onToggle: (slot: SlotKey) => void;
  pickerCtx: SlotPickerContext;
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
          picker={<SlotPicker slot={slot} ctx={pickerCtx} />}
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
              className="tap-target-44"
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

// Clamps while preserving the string (blank until touched, matching Oz Rings).
function clampSymbolLevelInput(raw: string, maxLevel: number): string {
  const digits = sanitizeDigitsInput(raw);
  if (digits === "") return "";
  return String(Math.min(maxLevel, Number(digits)));
}

function SymbolLevelTile({ area, level, maxLevel, theme, onLevel }: {
  area: SymbolArea;
  level: string;
  maxLevel: number;
  theme: AppTheme;
  onLevel: (level: string) => void;
}) {
  const placed = (Number(level) || 0) >= 1;
  return (
    <div style={symbolTileStyle(theme, placed)}>
      <HoverTooltip label={area.name} theme={theme}>
        <div style={{ opacity: placed ? 1 : 0.3, filter: placed ? "none" : "grayscale(1)", lineHeight: 0, cursor: "pointer" }}>
          <ItemIcon id={area.itemId} size={32} />
        </div>
      </HoverTooltip>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${area.name} symbol level`}
        value={level}
        placeholder="0"
        onChange={(e) => onLevel(clampSymbolLevelInput(e.target.value, maxLevel))}
        onKeyDown={numericKeyDown}
        style={symbolTileInputStyle(theme)}
      />
    </div>
  );
}

function SymbolGroupHeader({ label, theme, onMaxAll, onClear }: {
  label: string;
  theme: AppTheme;
  onMaxAll: () => void;
  onClear: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
      <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button type="button" onClick={onClear} style={{ ...symbolSectionBtnStyle, color: theme.muted }}>Clear</button>
        <span style={{ width: 1, alignSelf: "stretch", background: theme.border, flexShrink: 0 }} />
        <button type="button" onClick={onMaxAll} style={{ ...symbolSectionBtnStyle, color: theme.accent }}>Max All</button>
      </div>
    </div>
  );
}

// Whole group (including its Max All/Clear header) is skipped once none of its areas are
// unlocked yet — e.g. Grand Sacred (Lv 290+) for a freshly-260 character.
function SymbolGroup({ label, areas, maxLevel, symbolLevels, theme, isUnlocked, onLevel, onLevelMany }: {
  label: string;
  areas: SymbolArea[];
  maxLevel: number;
  symbolLevels: Record<string, string>;
  theme: AppTheme;
  isUnlocked: (area: SymbolArea) => boolean;
  onLevel: (regionName: string, level: string) => void;
  onLevelMany: (updates: Record<string, string>) => void;
}) {
  const unlockedAreas = areas.filter(isUnlocked);
  if (unlockedAreas.length === 0) return null;
  return (
    <div style={{ width: SYMBOL_GRID_WIDTH }}>
      <SymbolGroupHeader
        label={label}
        theme={theme}
        onMaxAll={() => onLevelMany(Object.fromEntries(unlockedAreas.map((a) => [a.name, String(maxLevel)])))}
        onClear={() => onLevelMany(Object.fromEntries(unlockedAreas.map((a) => [a.name, ""])))}
      />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${SYMBOL_TILE_SIZE}px)`, gap: 4 }}>
        {unlockedAreas.map((area) => (
          <SymbolLevelTile
            key={area.itemId}
            area={area}
            level={symbolLevels[area.name] ?? ""}
            maxLevel={maxLevel}
            theme={theme}
            onLevel={(level) => onLevel(area.name, level)}
          />
        ))}
      </div>
    </div>
  );
}

function SymbolSection({ symbolLevels, activeTab, availableTabs, characterLevel, theme, onTabChange, onLevel, onLevelMany }: {
  symbolLevels: Record<string, string>;
  activeTab: SymbolTabKey;
  availableTabs: { key: SymbolTabKey; label: string }[];
  characterLevel?: number;
  theme: AppTheme;
  onTabChange: (tab: SymbolTabKey) => void;
  onLevel: (regionName: string, level: string) => void;
  onLevelMany: (updates: Record<string, string>) => void;
}) {
  // Undefined level = assume eligible, same convention as isArcaneEligible/isSacredEligible
  // (an unresolved lookup shouldn't wrongly hide every area). Areas the character hasn't
  // reached yet are hidden entirely, not shown disabled — this is the setup flow, not the
  // profile page, and the project's own convention (see isArcaneEligible/isSacredEligible
  // hiding the whole tab) is that asking about content the character can't have yet is
  // noise. The profile-page "show disabled with a reason" treatment doesn't apply here.
  const isUnlocked = (area: SymbolArea) => characterLevel === undefined || characterLevel >= area.requiredLevel;
  return (
    <div>
      {availableTabs.length > 1 && (
      <div style={{ display: "flex", gap: 4, marginBottom: "0.6rem" }}>
        {availableTabs.map((tab) => {
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
      )}
      {activeTab === "arcane" ? (
        <SymbolGroup label="Arcane" areas={ARCANE_AREAS} maxLevel={ARCANE_MAX_LEVEL} symbolLevels={symbolLevels} theme={theme} isUnlocked={isUnlocked} onLevel={onLevel} onLevelMany={onLevelMany} />
      ) : (
        <>
          <SymbolGroup label="Sacred" areas={SACRED_AREAS} maxLevel={SACRED_MAX_LEVEL} symbolLevels={symbolLevels} theme={theme} isUnlocked={isUnlocked} onLevel={onLevel} onLevelMany={onLevelMany} />
          <div style={{ marginTop: "0.75rem" }}>
            <SymbolGroup label="Grand Sacred" areas={GRAND_SACRED_AREAS} maxLevel={SACRED_MAX_LEVEL} symbolLevels={symbolLevels} theme={theme} isUnlocked={isUnlocked} onLevel={onLevel} onLevelMany={onLevelMany} />
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

// ── Slot picker (per-slot ItemPicker wrapper) ────────────────────────────────

/** Shared context every SlotPicker needs, built once per render by EquipmentSetupStep. */
interface SlotPickerContext {
  activeSlot: SlotKey | null;
  classId: string | undefined;
  branchMask: number;
  weaponAttLabel: string;
  activePreset: number;
  draft: EquipmentDraft;
  theme: AppTheme;
  characterLevel?: number;
  readSlot: (slot: SlotKey) => EquipmentItem | null | undefined;
  siblingItemIds: (slot: SlotKey) => ReadonlySet<string> | undefined;
  presetBaseItemFor: (slot: SlotKey) => EquipmentItem | null;
  chainNavForSlot: (slot: SlotKey) => { onPrev?: () => void; onNext?: () => void };
  updateSlot: (slot: SlotKey, item: EquipmentItem | null) => void;
  setActiveSlot: (slot: SlotKey | null) => void;
  setWeaponAtt: (v: string) => void;
}

function SlotPicker({ slot, ctx }: { slot: SlotKey; ctx: SlotPickerContext }) {
  const {
    activeSlot, classId, branchMask, weaponAttLabel, activePreset, draft, theme, characterLevel,
    readSlot, siblingItemIds, presetBaseItemFor, chainNavForSlot, updateSlot, setActiveSlot, setWeaponAtt,
  } = ctx;
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

  // Weapon ATT/MATT is scouter-only data, asked inline right after picking a weapon —
  // but only for preset 1 (the one assumed to be the character's actual active
  // loadout; see the activePreset fix elsewhere in this step), so filling in
  // presets 2/3 doesn't ask the same question again for a build that isn't "active."
  const weaponAttStep = slot === "weapon" && activePreset === 0
    ? { label: weaponAttLabel, value: draft.weaponAtt ?? "", onChange: setWeaponAtt }
    : undefined;

  const { onPrev: goPrev, onNext: goNext } = chainNavForSlot(slot);

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
      onAdvance={goNext && ((viaKeyboard) => (viaKeyboard ? goNext() : setActiveSlot(null)))}
      onPrev={goPrev}
      onNext={goNext}
      weaponAttStep={weaponAttStep}
    />
  );
}

interface ConfinableFrameProps {
  substepIndex: number;
  substepCount: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}

/** When confined (opened straight from a profile bookmark's edit pencil), a substep
 *  presents as this step's only one: no pips, Back exits the step directly instead of
 *  going to a sibling substep, and Next/Continue finishes the step instead of advancing
 *  to a sibling substep. Mirrors StatsSetupStep's own confinableFrameProps. */
function confinableFrameProps(
  confineToSubstep: boolean | undefined,
  onExitStep: () => void,
  onFinish: () => void,
  normal: ConfinableFrameProps,
): ConfinableFrameProps {
  if (!confineToSubstep) return normal;
  return { substepIndex: 0, substepCount: 1, onBack: onExitStep, onNext: onFinish, nextLabel: undefined };
}

// ── Substep 1: title, totems & symbols ────────────────────────────────────────

function AdditionalEquipSubstep({
  theme, stepNumber, totalSteps, substepAnimStyle, draft, activeSlot, toggleSlot, pickerCtx,
  availableSymbolTabs, symbolTab, characterLevel, onTabChange, onLevel, onLevelMany,
  substepIndex, substepCount, onBack, onNext, onFinish, nextLabel,
}: {
  theme: AppTheme;
  stepNumber: number;
  totalSteps: number;
  substepAnimStyle: CSSProperties;
  draft: EquipmentDraft;
  activeSlot: SlotKey | null;
  toggleSlot: (slot: SlotKey) => void;
  pickerCtx: SlotPickerContext;
  availableSymbolTabs: { key: SymbolTabKey; label: string }[];
  symbolTab: SymbolTabKey;
  characterLevel?: number;
  onTabChange: (tab: SymbolTabKey) => void;
  onLevel: (regionName: string, level: string) => void;
  onLevelMany: (updates: Record<string, string>) => void;
  substepIndex: number;
  substepCount: number;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  nextLabel?: string;
}) {
  return (
    <div key={1} style={substepAnimStyle}>
      <SetupStepFrame
        theme={theme}
        stepLabel="Titles, Totems & Symbols"
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        substepIndex={substepIndex}
        substepCount={substepCount}
        description="Set your title, totems, and symbol levels."
        onBack={onBack}
        onNext={onNext}
        onFinish={onFinish}
        nextLabel={nextLabel}
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
              picker={<SlotPicker slot="title" ctx={pickerCtx} />}
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
                  picker={<SlotPicker slot={slotKey} ctx={pickerCtx} />}
                />
              ))}
            </div>
          </div>
          {availableSymbolTabs.length > 0 && (
            <div>
              <SectionHeading label="Symbols" theme={theme} />
              <SymbolSection
                symbolLevels={draft.symbolLevels ?? {}}
                activeTab={symbolTab}
                availableTabs={availableSymbolTabs}
                characterLevel={characterLevel}
                theme={theme}
                onTabChange={onTabChange}
                onLevel={onLevel}
                onLevelMany={onLevelMany}
              />
            </div>
          )}
        </div>
      </SetupStepFrame>
    </div>
  );
}

// ── Substep 2: pets ────────────────────────────────────────────────────────────

const PET_SLOT_TRIPLES = [
  ["pet1", "petEquip1", "Pet 1"],
  ["pet2", "petEquip2", "Pet 2"],
  ["pet3", "petEquip3", "Pet 3"],
] as const;

function PetsSubstep({
  theme, stepNumber, totalSteps, substepAnimStyle, draft, activeSlot, toggleSlot, pickerCtx,
  substepIndex, substepCount, onBack, onNext, onFinish, nextLabel,
}: {
  theme: AppTheme;
  stepNumber: number;
  totalSteps: number;
  substepAnimStyle: CSSProperties;
  draft: EquipmentDraft;
  activeSlot: SlotKey | null;
  toggleSlot: (slot: SlotKey) => void;
  pickerCtx: SlotPickerContext;
  substepIndex: number;
  substepCount: number;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  nextLabel?: string;
}) {
  return (
    <div key={2} style={substepAnimStyle}>
      <SetupStepFrame
        theme={theme}
        stepLabel="Pets"
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        substepIndex={substepIndex}
        substepCount={substepCount}
        description="Choose your pets."
        onBack={onBack}
        onNext={onNext}
        onFinish={onFinish}
        nextLabel={nextLabel}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {PET_SLOT_TRIPLES.map(([petKey, equipKey, label]) => (
            <div key={petKey}>
              <SectionHeading label={label} theme={theme} />
              <div style={{ display: "flex", gap: 4 }}>
                <SlotCell
                  slotKey={petKey}
                  item={draft[petKey]}
                  theme={theme}
                  isActive={activeSlot === petKey}
                  onClick={() => toggleSlot(petKey)}
                  picker={<SlotPicker slot={petKey} ctx={pickerCtx} />}
                />
                <SlotCell
                  slotKey={equipKey}
                  item={draft[equipKey]}
                  theme={theme}
                  isActive={activeSlot === equipKey}
                  onClick={() => toggleSlot(equipKey)}
                  picker={<SlotPicker slot={equipKey} ctx={pickerCtx} />}
                />
              </div>
            </div>
          ))}
        </div>
      </SetupStepFrame>
    </div>
  );
}

// ── Substep 0: main equipment grid ─────────────────────────────────────────────

// Layout:
// Col 1: ring1–4, belt, pocket
// Col 2: face, eye, earring, pendant1, pendant2
// Center block (3-col wide): sprite above, then weapon / secondary / emblem row
// Col 6: hat, top, bottom, shoulder, android
// Col 7: cape, glove, shoe, medal, heart, badge
function EquipmentGridSubstep({
  theme, stepNumber, totalSteps, substepAnimStyle, activeGrid, activeSlot, toggleSlot, pickerCtx,
  activePreset, switchPreset, mobileGridPage, setMobileGridPage, confirmedCharacterImgURL,
  substepIndex, substepCount, onBack, onNext, onFinish, nextLabel,
}: {
  theme: AppTheme;
  stepNumber: number;
  totalSteps: number;
  substepAnimStyle: CSSProperties;
  activeGrid: SlotMap;
  activeSlot: SlotKey | null;
  toggleSlot: (slot: SlotKey) => void;
  pickerCtx: SlotPickerContext;
  activePreset: number;
  switchPreset: (n: number) => void;
  mobileGridPage: number;
  setMobileGridPage: (updater: (p: number) => number) => void;
  confirmedCharacterImgURL?: string;
  substepIndex: number;
  substepCount: number;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  nextLabel?: string;
}) {
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
      stepLabel="Equipment"
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      substepIndex={substepIndex}
      substepCount={substepCount}
      description="Choose your equipped gear."
      onBack={onBack}
      onNext={onNext}
      onFinish={onFinish}
      nextLabel={nextLabel}
    >
      <PresetBar theme={theme} active={activePreset} onSwitch={switchPreset} />
      <p className="eq-page-label" style={{ margin: "0 0 8px", fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
        {EQUIPMENT_PAGE_LABELS[mobileGridPage]}
      </p>
      {/* Equipment grid */}
      <div className={`eq-page-${mobileGridPage}`}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>

        <button type="button" className="eq-page-nav-btn" aria-label="Previous section" onClick={() => setMobileGridPage((p) => (p + 2) % 3)} style={navBtnStyle(theme)}>‹</button>

        <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>

          <div className="eq-section eq-section-0" style={{ gap: 4, flexShrink: 0 }}>
            {/* Col 1 */}
            <SlotColumn slots={COL1_SLOTS} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} pickerCtx={pickerCtx} />

            {/* Col 2 */}
            <SlotColumn slots={COL2_SLOTS} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} pickerCtx={pickerCtx} />
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
                  picker={<SlotPicker slot={slot} ctx={pickerCtx} />}
                />
              ))}
            </div>
          </div>

          <div className="eq-section eq-section-2" style={{ gap: 4, flexShrink: 0 }}>
            {/* Col 6 */}
            <SlotColumn slots={COL6_SLOTS} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} pickerCtx={pickerCtx} />

            {/* Col 7 */}
            <SlotColumn slots={COL7_SLOTS} grid={activeGrid} theme={theme} activeSlot={activeSlot} onToggle={toggleSlot} pickerCtx={pickerCtx} />
          </div>

        </div>

        <button type="button" className="eq-page-nav-btn" aria-label="Next section" onClick={() => setMobileGridPage((p) => (p + 1) % 3)} style={navBtnStyle(theme)}>›</button>

      </div>
      </div>
    </SetupStepFrame>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface EquipmentStepState {
  draft: EquipmentDraft;
  activeSlot: SlotKey | null;
  toggleSlot: (slot: SlotKey) => void;
  activePreset: number;
  activeGrid: SlotMap;
  substep: number;
  substepAnimStyle: CSSProperties;
  symbolTab: SymbolTabKey;
  setSymbolTab: (tab: SymbolTabKey) => void;
  mobileGridPage: number;
  setMobileGridPage: (updater: (p: number) => number) => void;
  availableSymbolTabs: { key: SymbolTabKey; label: string }[];
  goToSubstep: (next: number) => void;
  switchPreset: (n: number) => void;
  setSymbolLevel: (regionName: string, level: string) => void;
  setSymbolLevels: (updates: Record<string, string>) => void;
  pickerCtx: SlotPickerContext;
}

/** All of EquipmentSetupStep's state, derived values, and slot/substep handlers, kept in
 *  one hook so the component itself stays a thin substep dispatcher. Depends on several
 *  file-local types (SlotKey, EquipmentDraft, etc.), so it stays in this file rather than
 *  becoming a standalone hook module. */
function useEquipmentStepState({
  theme, jobName, characterLevel, confirmedCharacterName,
  direction, targetSubstep, onSubstepChange, value, onChange,
}: {
  theme: AppTheme;
  jobName: string;
  characterLevel?: number;
  confirmedCharacterName?: string;
  direction: "forward" | "backward";
  targetSubstep?: number | null;
  onSubstepChange?: (substepIndex: number) => void;
  value: string;
  onChange: (value: string) => void;
}): EquipmentStepState {
  const classData = getClassDataByNexonJobName(jobName);
  const classId = classData?.id;
  const branchMask = branchMaskForClass(classId);
  const { label: weaponAttLabel } = deriveWeaponAttLabel(classData);
  const showArcaneSymbols = isArcaneEligible(characterLevel, classData?.isLegacy);
  const showSacredSymbols = isSacredEligible(characterLevel, classData?.isLegacy);
  const availableSymbolTabs = SYMBOL_TABS.filter(
    (tab) => (tab.key === "arcane" ? showArcaneSymbols : showSacredSymbols),
  );
  // Derived fresh from `value` every render (not mirrored into its own useState) so the
  // one-shot backfill effect below can update it by calling onChange alone, matching
  // V Matrix/HEXA Matrix/Familiars' pattern — a local mirror would go stale the moment
  // the backfill wrote to `value` without a matching setDraft, silently reintroducing
  // the wholesale-overwrite bug the backfill exists to fix.
  const draft = parseEquipmentStepDraft(value);
  const initialValueRef = useRef(value);
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);
  const activePreset = draft.activePreset ?? 0;
  // Preset 0 is the base. Presets 1-2 are sparse per-slot overrides on top of it — a
  // slot present in the active preset's own map wins, otherwise it falls through to
  // preset 0's value, so untouched slots keep mirroring preset 0 live even after other
  // slots in the same preset have been customized (plain object spread already gives
  // this "later/override keys win, missing keys fall through" merge for free).
  const activeGrid: SlotMap = activePreset === 0
    ? (draft.presets?.[0] ?? {})
    : { ...(draft.presets?.[0] ?? {}), ...(draft.presets?.[activePreset] ?? {}) };
  const readSlot = (slot: SlotKey) => (isSharedSlot(slot) ? draft[slot] : activeGrid[slot]);

  function commitDraft(next: EquipmentDraft) {
    onChange(serializeEquipmentStepDraft(next));
  }

  // One-shot mount-time backfill from the character's saved equipment/symbols/weapon
  // ATT (only when this step lands blank) — matches V Matrix/HEXA Matrix/Familiars'
  // own pattern. Can't run during render since it depends on a client-only localStorage
  // read.
  useEffect(() => {
    if (initialValueRef.current || !confirmedCharacterName) return;
    const saved = selectCharacterByIgn(readCharactersStore(), confirmedCharacterName);
    if (!saved) return;
    const symbols = saved.tools?.symbols as { symbols?: Record<string, SymbolState> } | undefined;
    // react-doctor-disable-next-line no-pass-data-to-parent
    commitDraft(storedEquipmentToDraft(saved.equipment, symbols?.symbols, saved.scouter?.weaponAtt));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** A fresh length-3 array of preset grids (cloned), so edits don't mutate state. */
  function clonePresets(): SlotMap[] {
    const base = draft.presets ?? [];
    return Array.from({ length: PRESET_COUNT }, (_, i) => ({ ...(base[i] ?? {}) }));
  }
  const [substep, setSubstep] = useState(() => targetSubstep ?? (direction === "backward" ? 2 : 0));
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
  const [symbolTab, setSymbolTab] = useState<SymbolTabKey>(() => (showArcaneSymbols ? "arcane" : "sacred"));
  const [mobileGridPage, setMobileGridPage] = useState(0);

  function goToSubstep(next: number) {
    setHasSubstepSwitched(true);
    setSubstepDirection(next > substep ? "forward" : "backward");
    setActiveSlot(null);
    setSubstep(next);
    onSubstepChange?.(next);
  }

  const substepAnimStyle: CSSProperties = hasSubstepSwitched ? {
    animationName: substepDirection === "forward" ? "setupStepSlideForward" : "setupStepSlideBackward",
    animationDuration: "var(--characters-standard)",
    animationTimingFunction: "ease",
    animationFillMode: "both",
  } : {};

  function updateSlot(slot: SlotKey, item: EquipmentItem | null) {
    if (isSharedSlot(slot)) {
      // Switching to a DIFFERENT pet that can't wear the paired equip drops it. Clearing
      // the pet (item === null) does NOT drop it — in-game, an unequipped pet leaves its
      // Pet Equip sitting there inert until a compatible pet re-fills the slot, it isn't
      // force-unequipped.
      const pairedEquip = PET_TO_PET_EQUIP[slot];
      if (pairedEquip && item && !sameItem(item, draft[slot])) {
        const equip = draft[pairedEquip];
        if (equip && !petEquipCompatible(item.id, equip.id)) {
          commitDraft({ ...draft, [slot]: item, [pairedEquip]: null });
          return;
        }
      }
      commitDraft({ ...draft, [slot]: item });
      return;
    }
    // Always writes into just this one slot of the active preset's own sparse map —
    // every other slot stays absent, so it keeps falling through to preset 0 (see
    // activeGrid above) rather than getting frozen by a whole-preset clone.
    const presets = clonePresets();
    presets[activePreset] = { ...presets[activePreset], [slot]: item };
    commitDraft({ ...draft, presets });
  }

  function switchPreset(n: number) {
    setActiveSlot(null);
    if (n === activePreset) return;
    commitDraft({ ...draft, activePreset: n });
  }

  function toggleSlot(slot: SlotKey) {
    setActiveSlot((prev) => (prev === slot ? null : slot));
  }

  function setSymbolLevels(updates: Record<string, string>) {
    // Kept as strings (even "0" or "") rather than deleted, so a tile can distinguish
    // "explicitly typed 0" from "never touched" — the controller already excludes sub-1
    // levels when building the calculator's real tools.symbols data.
    const levels = { ...(draft.symbolLevels ?? {}), ...updates };
    commitDraft({ ...draft, symbolLevels: levels });
  }

  function setSymbolLevel(regionName: string, level: string) {
    setSymbolLevels({ [regionName]: level });
  }

  function setWeaponAtt(v: string) {
    commitDraft({ ...draft, weaponAtt: v });
  }

  // Capture phase so a tap on another slot can swap the picker directly, even when the open
  // picker's portal (absolutely positioned, high z-index) visually overlaps that slot — checking
  // elementsFromPoint sees through the portal to the slot cell underneath. Walk top-to-bottom so
  // a click that actually lands on the picker (e.g. its search box or "Clear slot" button) is
  // left alone even if some other slot cell happens to sit underneath it at that point.
  useEffect(() => {
    if (!activeSlot) return;
    // Tracks whether the mousedown that started this interaction was inside the picker, so
    // a drag that ends outside it isn't mistaken for a real gesture there — e.g. selecting
    // the weapon-ATT description text (or a picker's search query) and releasing past the
    // window edge, or over an unrelated slot cell, shouldn't close the picker or swap to
    // that slot. Only the click's landing point was checked before, not where it began.
    let mouseDownInsidePicker = false;
    const handleMouseDown = (e: MouseEvent) => {
      mouseDownInsidePicker = document.elementsFromPoint(e.clientX, e.clientY)
        .some((el) => el instanceof HTMLElement && el.hasAttribute("data-equipment-picker"));
    };
    const handleClick = (e: MouseEvent) => {
      const path = document.elementsFromPoint(e.clientX, e.clientY);
      for (const el of path) {
        if (!(el instanceof HTMLElement)) continue;
        if (el.hasAttribute("data-equipment-picker")) return;
        if (el.dataset.slot) {
          const slot = el.dataset.slot as SlotKey;
          if (slot !== activeSlot && !mouseDownInsidePicker) {
            e.stopPropagation();
            setActiveSlot(slot);
          }
          return;
        }
      }
      if (mouseDownInsidePicker) return;
      setActiveSlot(null);
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("click", handleClick, true);
    };
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

  // Finishing a slot's picker — via Enter-picking or via an explicit Tab — only ever
  // considers the next slot in the chain, and only jumps in if it's still empty; barging
  // into a slot someone already filled (e.g. while correcting an earlier one) would be more
  // surprising than helpful, so it just closes instead. Same rule as Familiars/Legion/IA.
  function goToEquipSlot(chain: readonly SlotKey[], fromSlot: SlotKey): () => void {
    const idx = chain.indexOf(fromSlot);
    const next = idx >= 0 && idx < chain.length - 1 ? chain[idx + 1] : null;
    return next && !readSlot(next) ? () => setActiveSlot(next) : () => setActiveSlot(null);
  }

  /** Prev/next navigation for a slot's chained group (Titles/Totems/Symbols or Pets), if any. */
  function chainNavForSlot(slot: SlotKey): { onPrev?: () => void; onNext?: () => void } {
    const chain = chainForSlot(slot);
    if (!chain) return {};
    const idx = chain.indexOf(slot);
    return {
      onNext: goToEquipSlot(chain, slot),
      onPrev: idx > 0 ? () => setActiveSlot(chain[idx - 1]) : undefined,
    };
  }

  const pickerCtx: SlotPickerContext = {
    activeSlot, classId, branchMask, weaponAttLabel, activePreset, draft, theme, characterLevel,
    readSlot, siblingItemIds, presetBaseItemFor, chainNavForSlot, updateSlot, setActiveSlot, setWeaponAtt,
  };

  return {
    draft, activeSlot, toggleSlot, activePreset, activeGrid, substep, substepAnimStyle,
    symbolTab, setSymbolTab, mobileGridPage, setMobileGridPage, availableSymbolTabs,
    goToSubstep, switchPreset, setSymbolLevel, setSymbolLevels, pickerCtx,
  };
}

export default function EquipmentSetupStep({
  theme,
  stepNumber,
  totalSteps,
  direction = "forward",
  targetSubstep,
  confineToSubstep,
  onSubstepChange,
  jobName = "",
  characterLevel,
  confirmedCharacterName,
  confirmedCharacterImgURL,
  value,
  onChange,
  onBack,
  onNext,
  onFinish,
}: EquipmentSetupStepProps) {
  const {
    draft, activeSlot, toggleSlot, activePreset, activeGrid, substep, substepAnimStyle,
    symbolTab, setSymbolTab, mobileGridPage, setMobileGridPage, availableSymbolTabs,
    goToSubstep, switchPreset, setSymbolLevel, setSymbolLevels, pickerCtx,
  } = useEquipmentStepState({
    theme, jobName, characterLevel, confirmedCharacterName, direction, targetSubstep, onSubstepChange, value, onChange,
  });

  if (substep === 1) {
    const frame = confinableFrameProps(confineToSubstep, onBack, onFinish, {
      substepIndex: 1, substepCount: SUBSTEP_COUNT, onBack: () => goToSubstep(0), onNext: () => goToSubstep(2), nextLabel: "Continue",
    });
    return (
      <AdditionalEquipSubstep
        theme={theme}
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        substepAnimStyle={substepAnimStyle}
        draft={draft}
        activeSlot={activeSlot}
        toggleSlot={toggleSlot}
        pickerCtx={pickerCtx}
        availableSymbolTabs={availableSymbolTabs}
        symbolTab={symbolTab}
        characterLevel={characterLevel}
        onTabChange={setSymbolTab}
        onLevel={setSymbolLevel}
        onLevelMany={setSymbolLevels}
        substepIndex={frame.substepIndex}
        substepCount={frame.substepCount}
        onBack={frame.onBack}
        onNext={frame.onNext}
        onFinish={onFinish}
        nextLabel={frame.nextLabel}
      />
    );
  }

  if (substep === 2) {
    const frame = confinableFrameProps(confineToSubstep, onBack, onFinish, {
      substepIndex: 2, substepCount: SUBSTEP_COUNT, onBack: () => goToSubstep(1), onNext,
    });
    return (
      <PetsSubstep
        theme={theme}
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        substepAnimStyle={substepAnimStyle}
        draft={draft}
        activeSlot={activeSlot}
        toggleSlot={toggleSlot}
        pickerCtx={pickerCtx}
        substepIndex={frame.substepIndex}
        substepCount={frame.substepCount}
        onBack={frame.onBack}
        onNext={frame.onNext}
        onFinish={onFinish}
        nextLabel={frame.nextLabel}
      />
    );
  }

  const frame = confinableFrameProps(confineToSubstep, onBack, onFinish, {
    substepIndex: 0, substepCount: SUBSTEP_COUNT, onBack, onNext: () => goToSubstep(1), nextLabel: "Continue",
  });
  return (
    <EquipmentGridSubstep
      theme={theme}
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      substepAnimStyle={substepAnimStyle}
      activeGrid={activeGrid}
      activeSlot={activeSlot}
      toggleSlot={toggleSlot}
      pickerCtx={pickerCtx}
      activePreset={activePreset}
      switchPreset={switchPreset}
      mobileGridPage={mobileGridPage}
      setMobileGridPage={setMobileGridPage}
      confirmedCharacterImgURL={confirmedCharacterImgURL}
      substepIndex={frame.substepIndex}
      substepCount={frame.substepCount}
      onBack={frame.onBack}
      onNext={frame.onNext}
      onFinish={onFinish}
      nextLabel={frame.nextLabel}
    />
  );
}

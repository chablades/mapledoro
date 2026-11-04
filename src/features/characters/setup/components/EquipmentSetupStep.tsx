"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePickerCoords } from "../../../../lib/usePickerCoords";
import { numericKeyDown, sanitizeDigitsInput, isStrayClick } from "../../../../lib/inputUtils";
import { useKeyboardListNav } from "../../../../lib/useKeyboardListNav";
import { searchAndRank } from "../../../../lib/searchMatch";
import { dialogBtnColors, type AppTheme } from "../../../../components/themes";
import HoverTooltip from "../../../../components/HoverTooltip";
import type { SetupStepDefinition } from "../steps";
import CharacterAvatar from "../../tabs/components/CharacterAvatar";
import EquipItemIcon from "./EquipItemIcon";
import ItemTooltip from "./ItemTooltip";
import { ItemIcon } from "../../../../components/ResourceImage";
import EquipmentUpgradeDialog, { type ItemUpgrades, type UpgradeEntry } from "./EquipmentUpgradeDialog";
import { isUpgradeable } from "../data/equipmentInfo";
import { canFlame } from "../data/flameData";
import { useEquipInfo } from "../data/useEquipInfo";
import SetupStepFrame from "./SetupStepFrame";
import { PresetBar } from "./PresetBar";
import { NavChevron } from "../../DropdownChevron";
import {
  ARCANE_AREAS, SACRED_AREAS, GRAND_SACRED_AREAS,
  ARCANE_MAX_LEVEL, SACRED_MAX_LEVEL, type SymbolArea,
} from "../../../tools/symbols/symbol-data";
import type { SymbolState } from "../../../tools/symbols/useSymbolState";
import { getClassDataByNexonJobName } from "../data/classSkillData";
import {
  equippedOzLevel, fitsSkillSlot, gridSkillSlotKind, isRingKey, isSpecialSkillRing, skillRingFits, skillRingHost,
  specialRingElsewhere, type OzRingLevels,
} from "../data/specialRingData";
import { symbolUnlockWarning } from "../data/symbolUnlock";
import { statusText } from "../../../../components/statusColors";
import { branchMaskForClass, weaponPrefixesForClass, secondarySpecForClass, isShieldId } from "../data/classBranch";
import { readCharactersStore, selectCharacterByIgn, type StoredCharacterRecord } from "../../model/charactersStore";
import {
  hasEnhancements, isSharedSlot, sameItem, sameUpgradedItem, parseEquipmentStepDraft, serializeEquipmentStepDraft, storedEquipmentToDraft,
  SLOT_LABELS, SLOT_SIZE, CENTER_WIDTH, SYMBOL_TILE_SIZE, EQUIPMENT_PAGE_LABELS,
  COL1_SLOTS, COL2_SLOTS, COL6_SLOTS, COL7_SLOTS, CENTER_BOTTOM_SLOTS,
  slotCellStyle, navBtnStyle,
  type SlotKey, type SharedSlotKey, type SlotMap, type EquipmentItem, type EquipmentDraft,
} from "../data/equipmentStepDraft";

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
// The main grid's full width: two 2-slot columns either side of the centre block, 4px gaps.
const GRID_WIDTH = 4 * SLOT_SIZE + CENTER_WIDTH + 4 * 4;

// The upgrade window's rail, in the game's equipment window order.
const UPGRADE_SLOT_ORDER: readonly SlotKey[] = [
  "weapon", "secondary", "emblem", "hat", "top", "bottom", "shoe", "glove", "cape", "shoulder",
  "face", "eye", "earring", "pendant1", "pendant2", "belt", "pocket",
  "ring1", "ring2", "ring3", "ring4", "medal", "badge", "heart", "android",
  // Shared across presets; the Ancient Slate Replica is the one totem that takes flames.
  "totem1", "totem2", "totem3",
];

const isTotemSlot = (slot: SlotKey) => slot === "totem1" || slot === "totem2" || slot === "totem3";
/** Substeps in this step: 0 = main grid, 1 = additional equipment, 2 = pets. */
const SUBSTEP_COUNT = 3;

// Reading-order chains for the two substeps whose slots line up top-to-bottom in a single
// in-game window (Titles/Totems/Symbols, Pets). The main grid's own chain (MAIN_GRID_CHAIN,
// defined below once its column layout constants exist) is a 2D spatial layout with its
// own column-based reading order. See its own comment.
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
   *  pencil. It presents as if it were this step's only substep, mirroring
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
  ring1: "ring", ring2: "ring", ring3: "ring", ring4: "ring", skillRing: "ring",
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

// Search results are relevance-ranked before this cut, so the tail it drops is the loosest
// matches; narrowing the query is the natural way to reach anything past it.
const SEARCH_LIMIT = 30;
// The unsearched showAllWhenEmpty list is raw catalog order, not ranked, so a cut here is
// arbitrary rather than "the worst ones". Sized to clear the real worst case (the 48 pets that
// can wear the most widely-compatible pet equip), so it acts purely as a ceiling against a slot
// whose filter turns out to match hundreds, not as a display limit anything is expected to hit.
const FULL_LIST_LIMIT = 60;
// Every result row loads a remote item icon, so committing a fresh result set on each
// keystroke fires a burst of image requests for rows that are scrolled out of sight and
// superseded by the next character anyway. The search box stays instant; only the
// filtering it drives waits for a pause.
const SEARCH_DEBOUNCE_MS = 150;
// A symbol group's 3-column tile grid. Aligns its Max All/Clear header to the same width
// so those buttons can right-align against the actual last tile.
const SYMBOL_GRID_WIDTH = 3 * SYMBOL_TILE_SIZE + 2 * 4;

// Reading-order chain for the main equipment grid: top to bottom within each column, then
// the top of the next column, following the grid's own left-to-right column order:
// rings/belt/pocket, then face/eye/earring/pendants, then weapon/secondary/emblem, then
// hat/top/bottom/shoulder/android, then cape/glove/shoe/medal/heart/badge. The sprite
// itself isn't a pickable slot, so it's naturally skipped.
const MAIN_GRID_CHAIN: readonly SlotKey[] = [
  ...COL1_SLOTS, ...COL2_SLOTS, ...CENTER_BOTTOM_SLOTS, ...COL6_SLOTS, ...COL7_SLOTS,
];

const equippedHeaderStyle = (theme: AppTheme): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 8, width: "100%",
  padding: "0.4rem 0.6rem",
  borderBottom: `1px solid ${theme.border}`,
});

// A bare chevron, not a boxed button: it reads as "there's more behind this item".
const upgradeOpenStyle = (theme: AppTheme): CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, padding: 0, flexShrink: 0,
  border: "none", borderRadius: 8, background: "none", color: theme.muted, cursor: "pointer",
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

// Deliberately no opacity on this container: it wraps a HoverTooltip bubble (a real DOM
// child, not a native title), and CSS opacity compounds onto descendants, so a dimmed tile
// renders its own tooltip washed out on hover. Locked already reads as distinct via the
// icon's own dimming (below), the muted "Lv X+" badge, and the missing input.
const symbolTileStyle = (theme: AppTheme, placed: boolean): CSSProperties => ({
  width: SYMBOL_TILE_SIZE, flexShrink: 0,
  border: `1px solid ${placed ? theme.accent : theme.border}`,
  borderRadius: 8,
  background: placed ? `${theme.accent}15` : theme.bg,
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "8px 9px", boxSizing: "border-box",
});

// Read-only counterpart: no accent highlight, since there's nothing being "selected" on a
// display-only tile. Placed-vs-unplaced reads from the icon's own opacity/grayscale. Locked
// gets a dashed border on top of that (mirroring iaLineChipStyle's dashed-when-unset
// convention) so it reads as a different kind of empty than "unlocked but 0".
const readOnlySymbolTileStyle = (theme: AppTheme, locked?: boolean): CSSProperties => ({
  width: SYMBOL_TILE_SIZE, flexShrink: 0,
  border: locked ? `1px dashed ${theme.border}` : `1px solid ${theme.border}`,
  borderRadius: 8,
  background: theme.bg,
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "8px 9px", boxSizing: "border-box",
});

// Padding plus a matching negative margin grows the clickable box toward a 44px touch
// target without shifting surrounding layout. The button still occupies its original
// space, and responds to clicks slightly outside its visible text.
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

function ringGridOf(readSlot: (slot: SlotKey) => EquipmentItem | null | undefined) {
  return {
    ring1: readSlot("ring1"), ring2: readSlot("ring2"), ring3: readSlot("ring3"), ring4: readSlot("ring4"),
    skillRing: readSlot("skillRing"),
  };
}

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

/** Loads (with the module-level cache) and filters one slot group's item catalog, and derives
 *  the search-debounced display list. Split out of ItemPicker so that component is left with
 *  rendering and keyboard wiring only. */
function useItemPickerCatalog({
  files, current, itemFilter, maxLevel, excludeIds, presetBaseItem, showAllWhenEmpty, query,
}: {
  files: string[];
  current: EquipmentItem | null | undefined;
  itemFilter: (item: CatalogItem) => boolean;
  maxLevel?: number;
  excludeIds?: ReadonlySet<string>;
  presetBaseItem?: EquipmentItem | null;
  showAllWhenEmpty?: boolean;
  query: string;
}) {
  const [loadedItems, setLoadedItems] = useState<CatalogItem[] | null>(null);
  // Trails `query` by SEARCH_DEBOUNCE_MS; drives the result list (and everything that has to
  // stay in sync with it) so the icon requests land once per pause, not once per keystroke.
  const [searchQuery, setSearchQuery] = useState("");

  const cacheKey = files.join("+");
  const items = cachedSlotItems[cacheKey] ?? loadedItems;

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (cachedSlotItems[cacheKey]) return;
    let cancelled = false;
    const fileList = cacheKey.split("+");
    Promise.all(fileList.map((f) => fetch(`/data/equipment/${f}.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load equipment data for ${f}`);
      return r.json() as Promise<RawCatalogEntry[]>;
    })))
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
  // Capped: "already small" holds for a pet paired with a chosen equip, but not for every
  // showAllWhenEmpty case, and an uncapped list is hundreds of remote icons on slot open.
  const emptyQueryList = showAllWhenEmpty ? sourceItems?.slice(0, FULL_LIST_LIMIT) ?? null : null;
  const displayed = sourceItems && searchQuery ? filterItems(sourceItems, searchQuery) : emptyQueryList;
  // Suppress the "revert to preset 1" shortcut if that item is onlyEquip and already placed in a sibling slot.
  const presetBaseConflicts = !!(
    presetBaseItem &&
    excludeIds?.has(presetBaseItem.id) &&
    items?.some((it) => it.id === presetBaseItem.id && it.onlyEquip)
  );

  return { items, displayed, searchQuery, presetBaseConflicts };
}

function ItemPicker({
  slot, current, theme, files, itemFilter, maxLevel, excludeIds, presetBaseItem, showAllWhenEmpty,
  onSelect, onClose, onAdvance, onPrev, onNext, heading, onUpgrade,
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
   *  an Enter-driven pick from a mouse click. Only a keyboard pick jumps slots, since a
   *  mouse click means the cursor is staying local. Slots outside a chain (the main
   *  equipment grid) don't pass this, so a pick there closes the picker. */
  onAdvance?: (viaKeyboard: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** A title row on top, for a picker that's its own window (the skill ring's). */
  heading?: string;
  /** Opens the equipped item's enhancements (Star Force, flames), shown when the item takes any. */
  onUpgrade?: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isAndroid = slot === "android";

  function selectItem(item: EquipmentItem, viaKeyboard: boolean) {
    onSelect(item);
    if (onAdvance) { onAdvance(viaKeyboard); } else { onClose(); }
  }

  const { items, displayed, searchQuery, presetBaseConflicts } = useItemPickerCatalog({
    files, current, itemFilter, maxLevel, excludeIds, presetBaseItem, showAllWhenEmpty, query,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { highlightedIndex, onKeyDown: navKeyDown, itemRef } = useKeyboardListNav({
    items: displayed ?? [],
    resetKey: searchQuery,
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

  return (
    <div style={{ border: `1px solid ${theme.accent}`, borderRadius: 10, background: theme.panel, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", overflow: "hidden" }}>
      {heading && <p style={pickerHeadingStyle(theme)}>{heading}</p>}
      {current && (
        <div style={equippedHeaderStyle(theme)}>
          {current.id && <EquipItemIcon id={current.id} name={current.name} theme={theme} size={28} revealed={isAndroid} />}
          <div style={{ overflow: "hidden", flex: 1 }}>
            <p style={equippedHeaderLabelStyle(theme)}>Currently Equipped</p>
            <p style={equippedHeaderNameStyle(theme)}>{current.name}</p>
          </div>
          {onUpgrade && (
            <HoverTooltip label="Enhancements" theme={theme}>
              <button
                type="button" aria-label="Enhancements" onClick={() => { onClose(); onUpgrade(); }} style={upgradeOpenStyle(theme)}
                onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = "rgba(127,127,127,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = theme.muted; e.currentTarget.style.background = "none"; }}
              >
                <NavChevron direction="next" size={16} />
              </button>
            </HoverTooltip>
          )}
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
          onClick={() => selectItem(presetBaseItem, false)}
          style={presetBaseItemStyle(theme)}
        >
          {presetBaseItem.id && <EquipItemIcon id={presetBaseItem.id} name={presetBaseItem.name} theme={theme} size={28} revealed={isAndroid} />}
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
        style={pickerSearchInputStyle(theme, Boolean(searchQuery))}
      />
      {(searchQuery || showAllWhenEmpty) && (
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
                <EquipItemIcon id={item.id} name={item.name} theme={theme} size={28} revealed={isAndroid} />
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

/** The skill ring slot a Lv. 4+ Restraint or Continuous unlocks, drawn on that ring's tile like
 *  the game's cog: the cog bottom-right, the ring in it (when set) small in the top-right. */
interface SkillRingSlot {
  item: EquipmentItem | null | undefined;
  /** The skill ring's Oz Rings step level, for the cog's tooltip. */
  level: number | null;
  isActive: boolean;
  onClick: () => void;
  picker: ReactNode;
}

function CogIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// On the tooltip wrapper, not the cog: HoverTooltip wraps the cog in its own div, which is
// what has to sit in the tile's corner.
const cogCornerStyle: CSSProperties = { position: "absolute", right: 4, bottom: 4, zIndex: 1, lineHeight: 0 };

/** Solid once a skill ring is in, an outline while the slot is empty. */
function cogStyle(theme: AppTheme, filled: boolean, isActive: boolean): CSSProperties {
  return {
    width: 22, height: 22, padding: 0, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", font: "inherit",
    background: filled ? theme.accent : theme.panel,
    color: filled ? theme.accentOn : theme.accentText,
    border: `1.5px solid ${isActive ? theme.text : theme.accent}`,
  };
}

// An Oz Ring's level from the Oz Rings step, bottom-left of its tile (the cog takes the right).
// Text until the game's own level badge art is dumped.
const levelBadgeStyle = (theme: AppTheme): CSSProperties => ({
  position: "absolute", left: 4, bottom: 4, zIndex: 1, padding: "0 4px", borderRadius: 4, pointerEvents: "none",
  fontSize: "0.75rem", fontWeight: 800, lineHeight: "16px", color: theme.text, background: theme.panel,
  border: `1px solid ${theme.border}`,
});

function LevelBadge({ level, theme }: { level: number; theme: AppTheme }) {
  return <span style={levelBadgeStyle(theme)}>Lv. {level}</span>;
}

const levelSuffix = (level: number | null) => (level ? ` (Lv. ${level})` : "");
const skillRingLabel = (item: EquipmentItem, level: number | null) => `Skill Ring: ${item.name}${levelSuffix(level)}`;
const EMPTY_SKILL_RING_LABEL = "Skill Ring: empty (needs Lv. 4+)";

const pickerHeadingStyle = (theme: AppTheme): CSSProperties => ({
  margin: 0, padding: "6px 10px", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase",
  letterSpacing: "0.05em", color: theme.muted, borderBottom: `1px solid ${theme.border}`,
});

/** What a read-only cog shows on hover: the skill ring worn with this ring. */
function SkillRingTooltip({ item, level, theme }: { item: EquipmentItem; level: number | null; theme: AppTheme }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <EquipItemIcon id={item.id} name={item.name} theme={theme} size={28} />
      <span>
        <span style={{ display: "block", fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>{SLOT_LABELS.skillRing}</span>
        {item.name}{levelSuffix(level)}
      </span>
    </span>
  );
}

/** An item's name, or its name, stars and flame lines once it has any logged. */
function itemTooltipLabel(theme: AppTheme, slot: SlotKey, item: EquipmentItem, character?: StoredCharacterRecord): ReactNode {
  return hasEnhancements(item) ? <ItemTooltip theme={theme} slot={slot} item={item} character={character} /> : item.name;
}

function SlotCell({ slotKey, item, theme, isActive, onClick, picker, skillRing, level }: {
  slotKey: SlotKey;
  item: EquipmentItem | null | undefined;
  theme: AppTheme;
  isActive: boolean;
  onClick: () => void;
  picker?: ReactNode;
  skillRing?: SkillRingSlot;
  /** An equipped Oz Ring's level from the Oz Rings step. */
  level?: number | null;
}) {
  const skillOpen = !!skillRing?.isActive;
  const { ref: wrapperRef, portalRef } = usePickerCoords(isActive || skillOpen, PICKER_WIDTH);
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
        <EquipItemIcon id={item.id} name={item.name} theme={theme} size={48} revealed={slotKey === "android"} />
      ) : (
        <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
          {SLOT_LABELS[slotKey]}
        </span>
      )}
    </button>
  );
  return (
    <div ref={wrapperRef} style={{ position: "relative", width: SLOT_SIZE, flexShrink: 0 }}>
      {item ? <HoverTooltip label={itemTooltipLabel(theme, slotKey, item)} theme={theme}>{button}</HoverTooltip> : button}
      {level && <LevelBadge level={level} theme={theme} />}
      {skillRing && (
        <HoverTooltip label={skillRing.item ? skillRingLabel(skillRing.item, skillRing.level) : EMPTY_SKILL_RING_LABEL} theme={theme} style={cogCornerStyle}>
          <button
            type="button"
            data-slot="skillRing"
            aria-label={skillRing.item ? skillRingLabel(skillRing.item, skillRing.level) : "Set Skill Ring"}
            onClick={(e) => { e.stopPropagation(); if (isStrayClick(e)) { return; } skillRing.onClick(); }}
            style={cogStyle(theme, !!skillRing.item, skillOpen)}
          >
            <CogIcon />
          </button>
        </HoverTooltip>
      )}
      {(isActive || skillOpen) && typeof document !== "undefined" && createPortal(
        <div
          ref={portalRef}
          data-equipment-picker
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", width: PICKER_WIDTH, zIndex: 300, top: 0, left: 0 }}
        >
          {skillOpen ? skillRing?.picker : picker}
        </div>,
        document.body!
      )}
    </div>
  );
}

/** Read-only counterpart to SlotCell for the profile Gear bookmark. Same icon/empty-label
 *  box and sizing (slotCellStyle/SLOT_SIZE), but no button semantics, hover-swap, or picker
 *  portal, since nothing here is clickable. */
export function ReadOnlySlotTile({ slotKey, item, theme, skillRing, ozLevels, character }: {
  slotKey: SlotKey;
  item: EquipmentItem | null | undefined;
  theme: AppTheme;
  /** The wearer, so a flamed item's tooltip can show its flame score. */
  character?: StoredCharacterRecord;
  /** Set on the ring that unlocks the skill ring slot: the skill ring worn with it, or null when
   *  that slot is empty (an outlined cog, so it reads as not set up yet). */
  skillRing?: EquipmentItem | null;
  /** The Oz Rings step's levels, shown on an equipped Oz Ring. */
  ozLevels?: OzRingLevels;
}) {
  const level = equippedOzLevel(item?.id, ozLevels);
  const box = (
    <div data-slot-key={slotKey} style={{ ...slotCellStyle(theme, false), cursor: "default", width: SLOT_SIZE, flexShrink: 0 }}>
      {item ? (
        <EquipItemIcon id={item.id} name={item.name} theme={theme} size={48} revealed={slotKey === "android"} />
      ) : (
        <span style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden" }}>
          {SLOT_LABELS[slotKey]}
        </span>
      )}
    </div>
  );
  const tile = item ? <HoverTooltip label={itemTooltipLabel(theme, slotKey, item, character)} theme={theme}>{box}</HoverTooltip> : box;
  if (skillRing === undefined && !level) return tile;
  // The cog sits beside the ring's own tooltip rather than inside it, so hovering the cog shows
  // only the skill ring, not both.
  return (
    <div style={{ position: "relative", width: SLOT_SIZE, flexShrink: 0 }}>
      {tile}
      {level && <LevelBadge level={level} theme={theme} />}
      {skillRing !== undefined && (
        <HoverTooltip
          label={skillRing ? <SkillRingTooltip item={skillRing} level={equippedOzLevel(skillRing.id, ozLevels)} theme={theme} /> : EMPTY_SKILL_RING_LABEL}
          theme={theme}
          style={cogCornerStyle}
        >
          <span style={{ ...cogStyle(theme, !!skillRing, false), cursor: "default" }}><CogIcon /></span>
        </HoverTooltip>
      )}
    </div>
  );
}

/** Read-only counterpart to SymbolLevelTile for the profile Gear bookmark. Same icon tile,
 *  but the level renders as plain text instead of an input. Three visually distinct states:
 *  placed (leveled, full color), unlocked but unleveled (lightly dimmed, normal solid
 *  border, meaning available and empty), and `locked` (the character hasn't reached this
 *  area's required level, so it renders heavily dimmed and grayscale with a dashed border
 *  and the unlock level in place of an always-0 level). */
function symbolTileIconOpacity(locked: boolean | undefined, placed: boolean): number {
  if (locked) return 0.3;
  return placed ? 1 : 0.6;
}

// `loadImage=false` renders an empty box at the same size instead of the real icon. The
// profile Gear bookmark uses it to defer a not-yet-visited sub-view's images (see
// EquipmentBookmark's visitedViews). Layout is unaffected, since the box size doesn't
// depend on its content.
export function ReadOnlySymbolTile({ area, level, theme, locked, loadImage = true }: {
  area: SymbolArea;
  level: number;
  theme: AppTheme;
  locked?: boolean;
  loadImage?: boolean;
}) {
  const placed = !locked && level >= 1;
  const label = locked ? `Lv. ${area.requiredLevel}+` : `Lv. ${level}`;
  const iconOpacity = symbolTileIconOpacity(locked, placed);
  return (
    <HoverTooltip label={area.name} theme={theme}>
      <div style={readOnlySymbolTileStyle(theme, locked)}>
        <div style={{ opacity: iconOpacity, filter: locked ? "grayscale(1)" : "none", lineHeight: 0 }}>
          {loadImage ? <EquipItemIcon id={area.itemId} name={area.name} theme={theme} size={32} /> : <div style={{ width: 32, height: 32 }} />}
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
  const host = skillRingHost(grid);
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
          level={equippedOzLevel(grid[slot]?.id, pickerCtx.ozLevels)}
          skillRing={slot === host ? {
            item: grid.skillRing,
            level: equippedOzLevel(grid.skillRing?.id, pickerCtx.ozLevels),
            isActive: activeSlot === "skillRing",
            onClick: () => onToggle("skillRing"),
            picker: <SlotPicker slot="skillRing" ctx={pickerCtx} />,
          } : undefined}
        />
      ))}
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

function SymbolLevelTile({ area, level, maxLevel, theme, onLevel, warning }: {
  area: SymbolArea;
  level: string;
  maxLevel: number;
  theme: AppTheme;
  onLevel: (level: string) => void;
  /** symbolUnlockWarning: above the saved level, shown with a dashed warning border. */
  warning: string | null;
}) {
  const placed = (Number(level) || 0) >= 1;
  const tileStyle = symbolTileStyle(theme, placed);
  const label = warning
    ? <>{area.name}<br /><span style={{ color: statusText(theme, "warning") }}>{warning}</span></>
    : area.name;
  return (
    <div style={warning ? { ...tileStyle, border: `1px dashed ${statusText(theme, "warning")}` } : tileStyle}>
      <HoverTooltip label={label} theme={theme}>
        <div style={{ opacity: placed ? 1 : 0.3, filter: placed ? "none" : "grayscale(1)", lineHeight: 0, cursor: "pointer" }}>
          <EquipItemIcon id={area.itemId} name={area.name} theme={theme} size={32} />
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

// Every area shows, those above the saved level with a warning (symbolUnlock.ts). Max All only
// maxes the areas already reached, so it never fills in one the character may not have yet.
function SymbolGroup({ label, areas, maxLevel, symbolLevels, theme, characterLevel, onLevel, onLevelMany }: {
  label: string;
  areas: SymbolArea[];
  maxLevel: number;
  symbolLevels: Record<string, string>;
  theme: AppTheme;
  characterLevel?: number;
  onLevel: (regionName: string, level: string) => void;
  onLevelMany: (updates: Record<string, string>) => void;
}) {
  const reached = areas.filter((a) => !symbolUnlockWarning(a.name, characterLevel));
  return (
    <div style={{ width: SYMBOL_GRID_WIDTH }}>
      <SymbolGroupHeader
        label={label}
        theme={theme}
        onMaxAll={() => onLevelMany(Object.fromEntries(reached.map((a) => [a.name, String(maxLevel)])))}
        onClear={() => onLevelMany(Object.fromEntries(areas.map((a) => [a.name, ""])))}
      />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${SYMBOL_TILE_SIZE}px)`, gap: 4 }}>
        {areas.map((area) => (
          <SymbolLevelTile
            key={area.itemId}
            area={area}
            level={symbolLevels[area.name] ?? ""}
            maxLevel={maxLevel}
            theme={theme}
            onLevel={(level) => onLevel(area.name, level)}
            warning={symbolUnlockWarning(area.name, characterLevel)}
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
        <SymbolGroup label="Arcane" areas={ARCANE_AREAS} maxLevel={ARCANE_MAX_LEVEL} symbolLevels={symbolLevels} theme={theme} characterLevel={characterLevel} onLevel={onLevel} onLevelMany={onLevelMany} />
      ) : (
        <>
          <SymbolGroup label="Sacred" areas={SACRED_AREAS} maxLevel={SACRED_MAX_LEVEL} symbolLevels={symbolLevels} theme={theme} characterLevel={characterLevel} onLevel={onLevel} onLevelMany={onLevelMany} />
          <div style={{ marginTop: "0.75rem" }}>
            <SymbolGroup label="Grand Sacred" areas={GRAND_SACRED_AREAS} maxLevel={SACRED_MAX_LEVEL} symbolLevels={symbolLevels} theme={theme} characterLevel={characterLevel} onLevel={onLevel} onLevelMany={onLevelMany} />
          </div>
        </>
      )}
    </div>
  );
}

/** Opens the Enhancements window, for anyone who never reopens an item to find its ›. `short`
 *  always reads "Enhance"; otherwise it shortens only on narrow screens. */
function EnhanceButton({ theme, onClick, short = false }: { theme: AppTheme; onClick: () => void; short?: boolean }) {
  return (
    <button type="button" aria-label="Enhancements" onClick={onClick} className="tool-btn tool-dialog-btn eq-enhance-btn" style={{ ...dialogBtnColors(theme), display: "inline-flex", alignItems: "center", gap: 6 }}>
      {/* Burning Rebirth Flame, so the button reads as "upgrade this gear" at a glance. */}
      <ItemIcon id="02536002" size={22} alt="" style={{ margin: "-4px 0" }} />
      {short ? <span>Enhance</span> : (
        <>
          <span className="eq-enhance-label">Enhancements</span>
          <span className="eq-enhance-short">Enhance</span>
        </>
      )}
      <NavChevron direction="next" size={14} />
    </button>
  );
}

const sectionHeadingStyle = (theme: AppTheme): CSSProperties => ({
  margin: "0 0 0.5rem", fontSize: "0.8rem", fontWeight: 800,
  letterSpacing: "0.03em", textTransform: "uppercase", color: theme.muted,
});

function SectionHeading({ label, theme }: { label: string; theme: AppTheme }) {
  return <p style={sectionHeadingStyle(theme)}>{label}</p>;
}

// ── Slot picker (per-slot ItemPicker wrapper) ────────────────────────────────

/** Shared context every SlotPicker needs, built once per render by EquipmentSetupStep. */
interface SlotPickerContext {
  activeSlot: SlotKey | null;
  classId: string | undefined;
  branchMask: number;
  draft: EquipmentDraft;
  theme: AppTheme;
  characterLevel?: number;
  readSlot: (slot: SlotKey) => EquipmentItem | null | undefined;
  siblingItemIds: (slot: SlotKey) => ReadonlySet<string> | undefined;
  presetBaseItemFor: (slot: SlotKey) => EquipmentItem | null;
  chainNavForSlot: (slot: SlotKey) => { onPrev?: () => void; onNext?: () => void };
  updateSlot: (slot: SlotKey, item: EquipmentItem | null) => void;
  setActiveSlot: (slot: SlotKey | null) => void;
  /** The saved Oz Rings step levels, for the level shown on an equipped Oz Ring. */
  ozLevels: OzRingLevels | undefined;
  openUpgrades: (slot: SlotKey) => void;
}

function SlotPicker({ slot, ctx }: { slot: SlotKey; ctx: SlotPickerContext }) {
  if (ctx.activeSlot !== slot) return null;
  return <OpenSlotPicker slot={slot} ctx={ctx} />;
}

/** The slot's item list, narrowed by what's already equipped around it, and whether that list
 *  is short enough to show before any search. */
function slotItemFilter(slot: SlotKey, ctx: SlotPickerContext, base: (item: CatalogItem) => boolean): { itemFilter: (item: CatalogItem) => boolean; showAllWhenEmpty: boolean } {
  const { draft, readSlot } = ctx;
  const ringGrid = ringGridOf(readSlot);
  if (slot === "skillRing") {
    // Only the kind the host ring's slot takes, a short list, so shown without searching.
    const kind = gridSkillSlotKind(ringGrid);
    return { itemFilter: (item) => kind !== null && fitsSkillSlot(kind, item.id) && base(item), showAllWhenEmpty: true };
  }
  if (isRingKey(slot) && specialRingElsewhere(ringGrid, slot)) {
    // One special skill ring across the 4 slots; a second goes in the skill ring slot.
    return { itemFilter: (item) => !isSpecialSkillRing(item.id) && base(item), showAllWhenEmpty: false };
  }
  const pairedPet = PET_EQUIP_TO_PET[slot]; // set ⇒ this is a petEquip slot
  const pairedEquip = PET_TO_PET_EQUIP[slot]; // set ⇒ this is a pet slot
  // Pet chosen: show only the equips it can wear. Short enough to reveal without searching.
  const pet = pairedPet ? draft[pairedPet] : null;
  if (pet) return { itemFilter: (item) => base(item) && (item.wearablePets?.includes(pet.id) ?? false), showAllWhenEmpty: true };
  // Equip chosen but this pet slot is empty: narrow the pet list to its wearers (guides equip→pet
  // order) and reveal that short list without searching.
  const equip = pairedEquip && !readSlot(slot) ? draft[pairedEquip] : null;
  if (equip) return { itemFilter: (item) => base(item) && (item.wearableEquips?.includes(equip.id) ?? false), showAllWhenEmpty: true };
  return { itemFilter: base, showAllWhenEmpty: false };
}

function OpenSlotPicker({ slot, ctx }: { slot: SlotKey; ctx: SlotPickerContext }) {
  const {
    classId, branchMask, theme, characterLevel,
    readSlot, siblingItemIds, presetBaseItemFor, chainNavForSlot, updateSlot, setActiveSlot,
  } = ctx;
  const equipped = readSlot(slot);
  // Grid slots and totems can carry enhancements; titles and pets can't.
  const upgradable = (!isSharedSlot(slot) || isTotemSlot(slot)) && equipped?.id ? equipped : null;
  const upgradeInfo = useEquipInfo(upgradable ? [{ slot, item: upgradable }] : [])[slot];
  const source = resolvePickerSource(slot, classId, branchMask);
  const { itemFilter, showAllWhenEmpty } = slotItemFilter(slot, ctx, source.filter);
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
      heading={slot === "skillRing" ? SLOT_LABELS.skillRing : undefined}
      onUpgrade={isUpgradeable(upgradeInfo) ? () => ctx.openUpgrades(slot) : undefined}
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
  // The Ancient Slate Replica is the one totem that takes flames; the button opens on it.
  const flameTotem = (["totem1", "totem2", "totem3"] as const).find((slot) => { const id = draft[slot]?.id; return !!id && canFlame(slot, id); });
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
          {/* Sized to the three tiles, so the button lines up with the last one. */}
          <div style={{ display: "inline-flex", flexDirection: "column", alignSelf: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: "0.5rem" }}>
              <p style={{ ...sectionHeadingStyle(theme), margin: 0 }}>Totems</p>
              {flameTotem && <EnhanceButton theme={theme} short onClick={() => pickerCtx.openUpgrades(flameTotem)} />}
            </div>
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
  substepIndex, substepCount, onBack, onNext, onFinish, nextLabel, confineToSubstep, onOpenEnhancements,
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
  /** Hides the bossing-preset hint when this step renders as a profile bookmark's
   *  confined edit, since the profile's own "Set preset X as active" control is right
   *  there. Same reasoning as Stats/Inner Ability's own confineToSubstep gating. */
  confineToSubstep?: boolean;
  /** Opens the Enhancements window on the first item; absent while nothing is equipped. */
  onOpenEnhancements?: () => void;
}) {
  return (
    <div key={0} className="eq-substep-root" style={substepAnimStyle}>
    <style>{`
      .eq-substep-root {
        container-type: inline-size;
      }
      /* Carousel kicks in once the available width can't fit the full grid (~500px),
         regardless of which page-layout breakpoint produced that width. */
      .eq-enhance-short { display: none; }
      @container (max-width: 520px) {
        .eq-page-0 .eq-section-1, .eq-page-0 .eq-section-2,
        .eq-page-1 .eq-section-0, .eq-page-1 .eq-section-2,
        .eq-page-2 .eq-section-0, .eq-page-2 .eq-section-1 { display: none; }
        .eq-page-label.eq-page-label { display: block; }
        .eq-page-nav-btn.eq-page-nav-btn { display: flex; align-items: center; justify-content: center; }
        .eq-enhance-label { display: none; }
        .eq-enhance-short.eq-enhance-short { display: inline; }
        .eq-enhance-btn.eq-enhance-btn { padding-left: 10px; padding-right: 8px; }
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
      {/* As wide as the grid below, so the presets and Enhancements line up with its edges. */}
      <div style={{ maxWidth: GRID_WIDTH, margin: "0 auto" }}>
      <PresetBar
        theme={theme} count={PRESET_COUNT} active={activePreset} onSwitch={switchPreset}
        end={onOpenEnhancements && (
          // The same window each item's picker opens with its ›, for anyone who never reopens an
          // item they already entered.
          // Narrow screens shorten the word so it fits beside the presets.
          <EnhanceButton theme={theme} onClick={onOpenEnhancements} />
        )}
      />
      </div>
      {!confineToSubstep && (
        <p style={{ margin: "0 0 6px", fontSize: "0.75rem", fontWeight: 600, color: theme.muted, textAlign: "center" }}>
          Preset 1 is set as active by default. If you boss on a different preset, change that afterward from your profile.
        </p>
      )}
      <p className="eq-page-label" style={{ margin: "0 0 8px", fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>
        {EQUIPMENT_PAGE_LABELS[mobileGridPage]}
      </p>
      {/* Equipment grid */}
      <div className={`eq-page-${mobileGridPage}`}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>

        <button type="button" className="eq-page-nav-btn" aria-label="Previous section" onClick={() => setMobileGridPage((p) => (p + 2) % 3)} style={navBtnStyle(theme)}><NavChevron direction="prev" /></button>

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

        <button type="button" className="eq-page-nav-btn" aria-label="Next section" onClick={() => setMobileGridPage((p) => (p + 1) % 3)} style={navBtnStyle(theme)}><NavChevron direction="next" /></button>

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
  /** The item the Enhancements window opened on, "first" from the button under the grid. */
  upgradeSlot: SlotKey | "first" | null;
  setUpgradeSlot: (slot: SlotKey | "first" | null) => void;
  upgradeEntries: UpgradeEntry[];
  saveUpgrades: (changes: Partial<Record<SlotKey, ItemUpgrades>>) => void;
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
  // Hidden only for legacy classes, who can never have them. A level gap is only a warning
  // (symbolUnlock.ts), since the saved level can be a day behind.
  const showArcaneSymbols = !classData?.isLegacy;
  const showSacredSymbols = !classData?.isLegacy;
  const availableSymbolTabs = SYMBOL_TABS.filter(
    (tab) => (tab.key === "arcane" ? showArcaneSymbols : showSacredSymbols),
  );
  // Derived fresh from `value` every render (not mirrored into its own useState) so the
  // one-shot backfill effect below can update it by calling onChange alone, matching
  // V Matrix/HEXA Matrix/Familiars' pattern. A local mirror would go stale the moment
  // the backfill wrote to `value` without a matching setDraft, silently reintroducing
  // the wholesale-overwrite bug the backfill exists to fix.
  const draft = parseEquipmentStepDraft(value);
  const initialValueRef = useRef(value);
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);
  const activePreset = draft.activePreset ?? 0;
  // Preset 0 is the base. Presets 1-2 are sparse per-slot overrides on top of it: a
  // slot present in the active preset's own map wins, otherwise it falls through to
  // preset 0's value, so untouched slots keep mirroring preset 0 live even after other
  // slots in the same preset have been customized (plain object spread already gives
  // this "later/override keys win, missing keys fall through" merge for free).
  const activeGrid: SlotMap = activePreset === 0
    ? (draft.presets?.[0] ?? {})
    : { ...draft.presets?.[0], ...draft.presets?.[activePreset] };
  const readSlot = (slot: SlotKey) => (isSharedSlot(slot) ? draft[slot] : activeGrid[slot]);

  function commitDraft(next: EquipmentDraft) {
    onChange(serializeEquipmentStepDraft(next));
  }

  // One-shot mount-time backfill from the character's saved equipment/symbols, only
  // when this step lands blank. Matches V Matrix/HEXA Matrix/Familiars' own pattern.
  // Can't run during render since it depends on a client-only localStorage read.
  useEffect(() => {
    if (initialValueRef.current || !confirmedCharacterName) return;
    const saved = selectCharacterByIgn(readCharactersStore(), confirmedCharacterName);
    if (!saved) return;
    const symbols = saved.tools?.symbols as { symbols?: Record<string, SymbolState> } | undefined;
    // react-doctor-disable-next-line no-pass-data-to-parent
    commitDraft(storedEquipmentToDraft(saved.equipment, symbols?.symbols));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The saved Oz Rings step levels, read once like the backfill above. A level changed later in
  // this same setup run shows once it's saved.
  const [upgradeSlot, setUpgradeSlot] = useState<SlotKey | "first" | null>(null);
  const [ozLevels] = useState<OzRingLevels | undefined>(() => {
    if (typeof window === "undefined" || !confirmedCharacterName) return undefined;
    return selectCharacterByIgn(readCharactersStore(), confirmedCharacterName)?.scouter?.ozRings?.levels;
  });

  /** A fresh length-3 array of preset grids (cloned), so edits don't mutate state. */
  function clonePresets(): SlotMap[] {
    const base = draft.presets ?? [];
    return Array.from({ length: PRESET_COUNT }, (_, i) => ({ ...base[i] }));
  }
  const [substep, setSubstep] = useState(() => targetSubstep ?? (direction === "backward" ? 2 : 0));
  // Reports the mount-time default once (so entering a step "backward," which starts
  // on a substep other than 0, still gets persisted for resume even if the player
  // reloads before navigating again). Subsequent changes are reported directly from
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
      // Switching to another pet that can't wear the paired equip drops that equip.
      // Clearing the pet (item === null) does not. In-game, an unequipped pet leaves its
      // Pet Equip sitting there inert until a compatible pet re-fills the slot.
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
    // Writes into this one slot of the active preset's own sparse map. Every other slot
    // stays absent, so it keeps falling through to preset 0 (see activeGrid above)
    // rather than getting frozen by a whole-preset clone.
    const presets = clonePresets();
    const next: SlotMap = { ...presets[activePreset], [slot]: item };
    // Picking Preset 1's own item in Preset 2/3 means mirroring it again, not a copy of it.
    if (activePreset !== 0 && item && sameUpgradedItem(item, presets[0]?.[slot])) delete next[slot];
    // Swapping the host ring can leave a skill ring its slot no longer takes (Continuous ->
    // Restraint with Weapon Jump in it), or no slot at all, so it comes off.
    if (isRingKey(slot) && !skillRingFits({ ...activeGrid, [slot]: item })) next.skillRing = null;
    presets[activePreset] = next;
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
    // "explicitly typed 0" from "never touched". The controller already excludes sub-1
    // levels when building the calculator's real tools.symbols data.
    const levels = { ...draft.symbolLevels, ...updates };
    commitDraft({ ...draft, symbolLevels: levels });
  }

  function setSymbolLevel(regionName: string, level: string) {
    setSymbolLevels({ [regionName]: level });
  }

  // Capture phase so a tap on another slot can swap the picker directly, even when the open
  // picker's portal (absolutely positioned, high z-index) visually overlaps that slot.
  // Checking elementsFromPoint sees through the portal to the slot cell underneath. Walk
  // top-to-bottom so a click that lands on the picker (its search box or "Clear slot"
  // button) is left alone even if a slot cell happens to sit underneath it.
  useEffect(() => {
    if (!activeSlot) return;
    // Tracks whether the mousedown that started this interaction was inside the picker, so
    // a drag that ends outside it isn't mistaken for a real gesture there. Selecting a
    // picker's search query text and releasing past the window edge, or over an unrelated
    // slot cell, shouldn't close the picker or swap to that slot.
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

  // Finishing a slot's picker, by Enter-picking or an explicit Tab, considers only the next
  // slot in the chain, and jumps in only if it's still empty. Barging into a slot someone
  // already filled (say while correcting an earlier one) would surprise more than it helps,
  // so the picker closes instead. Same rule as Familiars/Legion/IA.
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

  /** The preset an edit to this slot lands in: Preset 2/3's own item, else Preset 1's, which
   *  a slot that hasn't been changed in this preset still mirrors. */
  function ownerPreset(slot: SlotKey): number {
    return activePreset !== 0 && draft.presets?.[activePreset]?.[slot] !== undefined ? activePreset : 0;
  }

  const upgradeEntries: UpgradeEntry[] = UPGRADE_SLOT_ORDER.flatMap((slot) => {
    const item = readSlot(slot);
    return item?.id ? [{ slot, item, preset: isSharedSlot(slot) ? 0 : ownerPreset(slot) + 1 }] : [];
  });

  function saveUpgrades(changes: Partial<Record<SlotKey, ItemUpgrades>>) {
    const presets = clonePresets();
    const shared: Partial<Record<SharedSlotKey, EquipmentItem>> = {};
    const withUpgrades = (item: EquipmentItem, { starForce, flame }: ItemUpgrades): EquipmentItem =>
      ({ id: item.id, name: item.name, ...(starForce ? { starForce } : null), ...(flame?.length ? { flame } : null) });
    for (const [slot, upgrades] of Object.entries(changes) as [SlotKey, ItemUpgrades][]) {
      if (isSharedSlot(slot)) {
        // Totems are the same in every preset, so they live on the draft itself.
        const item = draft[slot];
        if (item) shared[slot] = withUpgrades(item, upgrades);
        continue;
      }
      const owner = ownerPreset(slot);
      const item = presets[owner]?.[slot];
      if (item) presets[owner] = { ...presets[owner], [slot]: withUpgrades(item, upgrades) };
    }
    commitDraft({ ...draft, ...shared, presets });
  }

  const pickerCtx: SlotPickerContext = {
    activeSlot, classId, branchMask, draft, theme, characterLevel,
    readSlot, siblingItemIds, presetBaseItemFor, chainNavForSlot, updateSlot, setActiveSlot, ozLevels,
    openUpgrades: setUpgradeSlot,
  };

  return {
    draft, activeSlot, toggleSlot, activePreset, activeGrid, substep, substepAnimStyle,
    symbolTab, setSymbolTab, mobileGridPage, setMobileGridPage, availableSymbolTabs,
    goToSubstep, switchPreset, setSymbolLevel, setSymbolLevels, pickerCtx,
    upgradeSlot, setUpgradeSlot, upgradeEntries, saveUpgrades,
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
    upgradeSlot, setUpgradeSlot, upgradeEntries, saveUpgrades,
  } = useEquipmentStepState({
    theme, jobName, characterLevel, confirmedCharacterName, direction, targetSubstep, onSubstepChange, value, onChange,
  });

  const enhancementsWindow = upgradeSlot && (
    <EquipmentUpgradeDialog
      key={upgradeSlot} theme={theme} entries={upgradeEntries} initialSlot={upgradeSlot === "first" ? undefined : upgradeSlot}
      onSave={saveUpgrades} onClose={() => setUpgradeSlot(null)}
    />
  );

  if (substep === 1) {
    const frame = confinableFrameProps(confineToSubstep, onBack, onFinish, {
      substepIndex: 1, substepCount: SUBSTEP_COUNT, onBack: () => goToSubstep(0), onNext: () => goToSubstep(2), nextLabel: "Continue",
    });
    return (
      <>
      {enhancementsWindow}
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
      </>
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
    <>
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
      confineToSubstep={confineToSubstep}
      onOpenEnhancements={upgradeEntries.length > 0 ? () => setUpgradeSlot("first") : undefined}
      substepIndex={frame.substepIndex}
      substepCount={frame.substepCount}
      onBack={frame.onBack}
      onNext={frame.onNext}
      onFinish={onFinish}
      nextLabel={frame.nextLabel}
    />
    {enhancementsWindow}
    </>
  );
}

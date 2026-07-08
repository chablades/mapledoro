"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePickerCoords } from "../hooks/usePickerCoords";
import { numericKeyDown, sanitizeDigitsInput } from "../../../../lib/inputUtils";
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
import { getClassDataByNexonJobName } from "../data/classSkillData";
import { isArcaneEligible, isSacredEligible, isWeaponAttSane, deriveWeaponAttLabel, WEAPON_ATT_WARN_AT } from "../data/statsStepDraft";
import { branchMaskForClass, weaponPrefixesForClass, secondarySpecForClass, isShieldId } from "../data/classBranch";
import { InputWarningBubble } from "./QuestionControls";

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
/** Substeps in this step: 0 = main grid, 1 = additional equipment, 2 = pets. */
const SUBSTEP_COUNT = 3;
const SHARED_SLOTS: ReadonlySet<SlotKey> = new Set<SlotKey>(["title", "totem1", "totem2", "totem3", "pet1", "pet2", "pet3", "petEquip1", "petEquip2", "petEquip3"]);
const isSharedSlot = (slot: SlotKey): slot is SharedSlotKey => SHARED_SLOTS.has(slot);

// Reading-order chains for the two substeps whose slots line up top-to-bottom in a single
// in-game window (Additional Equipment, Pets) — unlike the main grid's 2D spatial layout,
// which has no unambiguous "next" order, so it isn't chained.
const ADDITIONAL_EQUIP_CHAIN: readonly SlotKey[] = ["title", "totem1", "totem2", "totem3"];
const PETS_CHAIN: readonly SlotKey[] = ["pet1", "petEquip1", "pet2", "petEquip2", "pet3", "petEquip3"];

function chainForSlot(slot: SlotKey): readonly SlotKey[] | null {
  if (ADDITIONAL_EQUIP_CHAIN.includes(slot)) return ADDITIONAL_EQUIP_CHAIN;
  if (PETS_CHAIN.includes(slot)) return PETS_CHAIN;
  return null;
}

interface EquipmentDraft extends Partial<Record<SharedSlotKey, EquipmentItem | null>> {
  /** Three equipment-grid presets. */
  presets?: SlotMap[];
  /** Which preset (0-2) is being edited / is primary. */
  activePreset?: number;
  /** Preset indices that have been edited (split off from preset 1). Others mirror preset 1. */
  diverged?: number[];
  /** Symbol levels keyed by region name; folded into the calculator's tools.symbols on
   *  finish. String, not number — blank until touched, matching Oz Rings; the
   *  controller converts to real numbers when building tools.symbols. */
  symbolLevels?: Record<string, string>;
  /** Scouter-only weapon ATT/MATT, asked inline when picking a weapon in preset 1 (see
   *  WeaponAttStepView) — not equipment data, folded into `scouter.weaponAtt` on finish. */
  weaponAtt?: string;
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

// Equipment grid column layouts (static slot key lists).
const COL1_SLOTS: SlotKey[] = ["ring1", "ring2", "ring3", "ring4", "belt", "pocket"];
const COL2_SLOTS: SlotKey[] = ["face", "eye", "earring", "pendant1", "pendant2"];
const COL6_SLOTS: SlotKey[] = ["hat", "top", "bottom", "shoulder", "android"];
const COL7_SLOTS: SlotKey[] = ["cape", "glove", "shoe", "medal", "heart", "badge"];
const CENTER_BOTTOM_SLOTS: SlotKey[] = ["weapon", "secondary", "emblem"];

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
        onConfirm={() => { onSelect(pendingItem); onClose(); }}
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
  onConfirm: () => void;
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
      if (sane) onConfirm();
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
          <button type="button" disabled={!sane} onClick={onConfirm} style={weaponAttConfirmButtonStyle(theme, !sane)}>
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
        <ItemIcon id={item.id} size={48} revealed={slotKey === "android"} />
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

function SymbolSection({ symbolLevels, activeTab, availableTabs, theme, onTabChange, onLevel }: {
  symbolLevels: Record<string, string>;
  activeTab: SymbolTabKey;
  availableTabs: { key: SymbolTabKey; label: string }[];
  theme: AppTheme;
  onTabChange: (tab: SymbolTabKey) => void;
  onLevel: (regionName: string, level: string) => void;
}) {
  const maxLevel = activeTab === "arcane" ? ARCANE_MAX_LEVEL : SACRED_MAX_LEVEL;
  const renderTile = (area: SymbolArea) => (
    <SymbolLevelTile
      key={area.itemId}
      area={area}
      level={symbolLevels[area.name] ?? ""}
      maxLevel={maxLevel}
      theme={theme}
      onLevel={(level) => onLevel(area.name, level)}
    />
  );
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
  const classData = getClassDataByNexonJobName(jobName);
  const classId = classData?.id;
  const branchMask = branchMaskForClass(classId);
  const { label: weaponAttLabel } = deriveWeaponAttLabel(classData);
  const showArcaneSymbols = isArcaneEligible(characterLevel, classData?.isLegacy);
  const showSacredSymbols = isSacredEligible(characterLevel, classData?.isLegacy);
  const availableSymbolTabs = SYMBOL_TABS.filter(
    (tab) => (tab.key === "arcane" ? showArcaneSymbols : showSacredSymbols),
  );
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
  const [symbolTab, setSymbolTab] = useState<SymbolTabKey>(() => (showArcaneSymbols ? "arcane" : "sacred"));
  const [mobileGridPage, setMobileGridPage] = useState(0);

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

  function setSymbolLevel(regionName: string, level: string) {
    // Kept as a string (even "0" or "") rather than deleted, so the tile can
    // distinguish "explicitly typed 0" from "never touched" — the controller already
    // excludes sub-1 levels when building the calculator's real tools.symbols data.
    const levels = { ...(draft.symbolLevels ?? {}), [regionName]: level };
    const next = { ...draft, symbolLevels: levels };
    setDraft(next);
    onChange(serialiseDraft(next));
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
    // Tracks whether the mousedown that started this interaction was inside the picker,
    // so a drag that ends outside it (e.g. selecting the weapon-ATT description text and
    // releasing past the window edge) isn't mistaken for an outside click — only the
    // click's landing point was checked before, not where the gesture began.
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
          if (slot !== activeSlot) {
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

  /** Prev/next navigation for a slot's chained group (Additional Equipment or Pets), if any. */
  function chainNavForSlot(slot: SlotKey): { onPrev?: () => void; onNext?: () => void } {
    const chain = chainForSlot(slot);
    if (!chain) return {};
    const idx = chain.indexOf(slot);
    return {
      onNext: goToEquipSlot(chain, slot),
      onPrev: idx > 0 ? () => setActiveSlot(chain[idx - 1]) : undefined,
    };
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

  if (substep === 1) {
    return (
      <div key={1} style={substepAnimStyle}>
        <SetupStepFrame
          theme={theme}
          stepLabel="Additional Equipment"
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          substepIndex={substep}
          substepCount={SUBSTEP_COUNT}
          description="Set your title, totems, and symbol levels."
          onBack={() => goToSubstep(0)}
          onNext={() => goToSubstep(2)}
          onFinish={onFinish}
          nextLabel="Continue"
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
            {availableSymbolTabs.length > 0 && (
              <div>
                <SectionHeading label="Symbols" theme={theme} />
                <SymbolSection
                  symbolLevels={draft.symbolLevels ?? {}}
                  activeTab={symbolTab}
                  availableTabs={availableSymbolTabs}
                  theme={theme}
                  onTabChange={setSymbolTab}
                  onLevel={setSymbolLevel}
                />
              </div>
            )}
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
          stepLabel="Pets"
          stepNumber={stepNumber}
          totalSteps={totalSteps}
          substepIndex={substep}
          substepCount={SUBSTEP_COUNT}
          description="Choose your pets."
          onBack={() => goToSubstep(1)}
          onNext={onNext}
          onFinish={onFinish}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {([["pet1", "petEquip1", "Pet 1"], ["pet2", "petEquip2", "Pet 2"], ["pet3", "petEquip3", "Pet 3"]] as const).map(([petKey, equipKey, label]) => (
              <div key={petKey}>
                <SectionHeading label={label} theme={theme} />
                <div style={{ display: "flex", gap: 4 }}>
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
              </div>
            ))}
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
      description="Choose your equipped gear."
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

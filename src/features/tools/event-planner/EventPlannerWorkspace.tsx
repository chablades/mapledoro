"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { AppTheme } from "../../../components/themes";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { ToolHeader } from "../../../components/ToolHeader";
import { ItemIcon as ResourceItemIcon } from "../../../components/ResourceImage";
import {
  CharacterDropdown,
  CharacterAvatarBox,
} from "../../../components/CharacterSyncPanel";
import { ConfirmButton } from "../../../components/ConfirmButton";
import { formatMeso, formatMesoFull } from "../format";
import { Toggle, PanelDivider, ActionButton } from "../shared-ui";
import { MVP_OPTIONS } from "../shared-data";
import { BOOM_TIER_COUNT, type MvpTier } from "../star-force/star-force-data";
import { toolStyles } from "../tool-styles";
import {
  EVENT_ITEMS,
  EVENT_ITEMS_BY_ID,
  ITEM_CATEGORIES,
  categoryLabel,
  type EventItem,
} from "./event-items";
import { useEventPlannerState, type PlannerEntry, type EntryCost } from "./useEventPlannerState";
import { useEventPlannerForm, type FormState, type FormAction } from "./useEventPlannerForm";
import type { StoredCharacterRecord } from "../../characters/model/charactersStore";

// ── Shared sub-components ────────────────────────────────────────────────────

function ItemIcon({ item, size = 28 }: { item: EventItem; size?: number }) {
  return <ResourceItemIcon id={item.itemId} size={size} alt={item.name} />;
}

// ── Filterable item dropdown ─────────────────────────────────────────────────

// Matches the CharacterDropdown trigger (34px avatar + 2×5px padding + 2×1px border).
const ITEM_TRIGGER_HEIGHT = 46;

function ItemSelector({
  theme,
  value,
  onChange,
  inputStyle,
}: {
  theme: AppTheme;
  value: string | null;
  onChange: (itemId: string | null) => void;
  inputStyle: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return EVENT_ITEMS;
    return EVENT_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.slot.toLowerCase().includes(q) ||
        categoryLabel(item.category).toLowerCase().includes(q),
    );
  }, [search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, EventItem[]>();
    for (const item of filtered) {
      const arr = groups.get(item.category) ?? [];
      arr.push(item);
      groups.set(item.category, arr);
    }
    return groups;
  }, [filtered]);

  const selectedItem = value ? EVENT_ITEMS_BY_ID.get(value) ?? null : null;

  const searchInputStyle: React.CSSProperties = {
    border: "none",
    background: "transparent",
    color: theme.text,
    outline: "none",
    width: "100%",
    fontFamily: "var(--font-body)",
    fontSize: "inherit",
    fontWeight: "inherit",
    padding: 0,
    cursor: "inherit",
  };

  const dropdownMenuStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: 320,
    overflowY: "auto",
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    zIndex: 10,
    marginTop: 4,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  };

  const dropdownItemStyle: React.CSSProperties = {
    padding: "7px 12px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 600,
    color: theme.text,
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 200 }}>
      <div
        className="tool-input"
        role="combobox"
        tabIndex={0}
        aria-expanded={open}
        aria-controls="event-item-listbox"
        style={{
          ...inputStyle,
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          boxSizing: "border-box",
          cursor: "pointer",
          height: ITEM_TRIGGER_HEIGHT,
        }}
        onClick={() => {
          if (!open) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!open) setOpen(true);
          }
        }}
      >
        {selectedItem && !open && (
          <ItemIcon item={selectedItem} size={18} />
        )}
        <input
          type="text"
          value={open ? search : (selectedItem?.name ?? "")}
          onChange={(e) => {
            setSearch(e.target.value);
            if (value) onChange(null);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setSearch("");
            setOpen(true);
          }}
          placeholder="Search items..."
          style={searchInputStyle}
        />
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.75rem",
            color: theme.muted,
            flexShrink: 0,
            pointerEvents: "none",
          }}
        >
          ▼
        </span>
      </div>
      {open && (
        <div
          id="event-item-listbox"
          role="listbox"
          style={dropdownMenuStyle}
        >
          {filtered.length === 0 && (
            <div
              style={{
                padding: "12px",
                fontSize: "0.8rem",
                color: theme.muted,
                textAlign: "center",
              }}
            >
              No items found
            </div>
          )}
          {ITEM_CATEGORIES.map((cat) => {
            const items = grouped.get(cat.id);
            if (!items || items.length === 0) return null;
            return (
              <div key={cat.id}>
                <div
                  style={{
                    padding: "8px 12px 4px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: theme.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {cat.label}
                </div>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="tool-btn tool-dropdown-item"
                    role="option"
                    tabIndex={0}
                    aria-selected={value === item.id}
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onChange(item.id);
                        setOpen(false);
                        setSearch("");
                      }
                    }}
                    style={dropdownItemStyle}
                  >
                    <ItemIcon item={item} size={22} />
                    <span>{item.name}</span>
                    <span
                      style={{
                        color: theme.muted,
                        fontSize: "0.75rem",
                        marginLeft: "auto",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Lv.{item.level} &middot; {item.slot}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Summary strip ────────────────────────────────────────────────────────────

function PlanSummary({
  theme,
  grandTotal,
  entryCount,
  clearEntries,
  panelStyle,
  clearAllButtonStyle,
}: {
  theme: AppTheme;
  grandTotal: { cost: number; booms: number };
  entryCount: number;
  clearEntries: () => void;
  panelStyle: React.CSSProperties;
  clearAllButtonStyle: React.CSSProperties;
}) {
  const statLabel: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: theme.muted,
    marginBottom: "0.15rem",
  };
  const statValue: React.CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontSize: "1.15rem",
    color: theme.text,
  };
  return (
    <div className="fade-in panel-card" style={panelStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "2rem",
        }}
      >
        <div>
          <div style={statLabel}>Total Expected Cost</div>
          <div style={{ ...statValue, color: theme.accentText }}>
            {formatMesoFull(grandTotal.cost)} mesos
          </div>
        </div>
        <div>
          <div style={statLabel}>Expected Spares</div>
          <div style={{ ...statValue, color: grandTotal.booms > 0 ? "#e05a5a" : theme.text }}>
            {grandTotal.booms === 0 ? "0" : grandTotal.booms.toFixed(1)}
          </div>
        </div>
        <div>
          <div style={statLabel}>Items</div>
          <div style={statValue}>{entryCount}</div>
        </div>
        <ConfirmButton
          theme={theme}
          label="Clear All"
          title="Clear all items?"
          message="This removes every item from the plan. This can't be undone."
          confirmLabel="Clear all"
          onConfirm={clearEntries}
          style={{ ...clearAllButtonStyle, marginLeft: "auto" }}
        />
      </div>
    </div>
  );
}

// ── Per-character plan panel with sortable table ─────────────────────────────

type SortKey = "item" | "current" | "target" | "cost" | "spares";
interface SortState {
  key: SortKey;
  dir: 1 | -1;
}
interface PlanRow {
  entry: PlannerEntry;
  cost: EntryCost;
}

const SORT_COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "item", label: "Item", align: "left" },
  { key: "current", label: "Current", align: "right" },
  { key: "target", label: "Target", align: "right" },
  { key: "cost", label: "Exp. Cost", align: "right" },
  { key: "spares", label: "Spares", align: "right" },
];

// Read-only per-entry option columns (not sortable).
const STATUS_COLUMNS = ["Star Catch", "Safeguard", "Boom Red."];

function sortValue(row: PlanRow, key: SortKey): string | number {
  switch (key) {
    case "item": return EVENT_ITEMS_BY_ID.get(row.entry.itemId)?.name ?? "";
    case "current": return row.entry.currentStar;
    case "target": return row.entry.targetStar;
    case "cost": return row.cost.cost;
    case "spares": return row.cost.booms;
  }
}

/** aria-sort value and header arrow for a column under the current sort. */
function sortIndicator(
  sort: SortState | null,
  key: SortKey,
): { ariaSort: "ascending" | "descending" | undefined; arrow: string } {
  if (sort?.key !== key) return { ariaSort: undefined, arrow: "" };
  return sort.dir === 1
    ? { ariaSort: "ascending", arrow: " ▲" }
    : { ariaSort: "descending", arrow: " ▼" };
}

function sortRows(rows: PlanRow[], sort: SortState | null): PlanRow[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    const cmp = typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number);
    return cmp * sort.dir;
  });
}

/** Read-only ✓/— cell for a per-entry option. */
function StatusCell({
  theme,
  on,
  tdStyle,
}: {
  theme: AppTheme;
  on: boolean;
  tdStyle: React.CSSProperties;
}) {
  return (
    <td style={{ ...tdStyle, textAlign: "center", color: on ? theme.accent : theme.muted }}>
      {on ? "✓" : "—"}
    </td>
  );
}

function PlanRowCells({
  theme,
  entry,
  cost,
  item,
  tdStyle,
  removeEntry,
}: {
  theme: AppTheme;
  entry: PlannerEntry;
  cost: EntryCost;
  item: EventItem;
  tdStyle: React.CSSProperties;
  removeEntry: (id: string) => void;
}) {
  const removeStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    fontWeight: 700,
    color: theme.muted,
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    userSelect: "none",
    flexShrink: 0,
  };

  return (
    <>
      <td style={{ ...tdStyle, textAlign: "left", whiteSpace: "normal" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ItemIcon item={item} size={26} />
          <div>
            <div>{item.name}</div>
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
              Lv.{item.level} {item.slot}
            </div>
          </div>
        </div>
      </td>
      <td style={tdStyle}>{entry.currentStar}★</td>
      <td style={tdStyle}>{entry.targetStar}★</td>
      <td style={tdStyle} title={`${formatMesoFull(cost.cost)} mesos`}>
        {formatMeso(cost.cost)}
      </td>
      <td style={{ ...tdStyle, color: cost.booms > 0 ? "#e05a5a" : theme.muted }}>
        {cost.booms === 0 ? "0" : cost.booms.toFixed(1)}
      </td>
      <StatusCell tdStyle={tdStyle} theme={theme} on={entry.starCatch} />
      {/* Tier > 1 overrides safeguard, so show the effective status. */}
      <StatusCell tdStyle={tdStyle} theme={theme} on={entry.safeguard && entry.boomTier <= 1} />
      <td style={{ ...tdStyle, textAlign: "center", color: entry.boomTier > 1 ? theme.text : theme.muted }}>
        {entry.boomTier > 1 ? `${entry.boomTier}×` : "—"}
      </td>
      <td style={tdStyle}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="tool-btn"
            onClick={() => removeEntry(entry.id)}
            style={removeStyle}
          >
            {"×"}
          </button>
        </div>
      </td>
    </>
  );
}

function CharacterPlanPanel({
  theme,
  name,
  record,
  rows,
  removeEntry,
  panelStyle,
}: {
  theme: AppTheme;
  name: string;
  record: StoredCharacterRecord | null;
  rows: PlanRow[];
  removeEntry: (id: string) => void;
  panelStyle: React.CSSProperties;
}) {
  // Sorting is per-panel: clicking a header only reorders this character's table.
  const [sort, setSort] = useState<SortState | null>(null);
  const onSort = (key: SortKey) =>
    setSort((s) => (s && s.key === key ? { key, dir: -s.dir as 1 | -1 } : { key, dir: 1 }));

  const sortedRows = sortRows(rows, sort);
  const subtotal = rows.reduce((s, r) => s + r.cost.cost, 0);

  const thStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderBottom: `2px solid ${theme.border}`,
  };
  const thButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "0.75rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: theme.muted,
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: theme.text,
    textAlign: "right",
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${theme.border}`,
  };

  return (
    <div className="fade-in panel-card" style={{ ...panelStyle, padding: 0 }}>
      <div
        style={{
          padding: "0.6rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
        }}
      >
        <CharacterAvatarBox theme={theme} record={record} size={42} />
        <div>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>
            {name}
          </div>
          {record && (
            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
              Lv.{record.level} {record.jobName}
            </div>
          )}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: theme.accentText,
          }}
        >
          {formatMesoFull(subtotal)} mesos
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="ep-plan-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              {SORT_COLUMNS.map((col) => {
                const { ariaSort, arrow } = sortIndicator(sort, col.key);
                return (
                  <th
                    key={col.key}
                    aria-sort={ariaSort}
                    style={{ ...thStyle, textAlign: col.align }}
                  >
                    <button
                      type="button"
                      className="tool-btn"
                      onClick={() => onSort(col.key)}
                      style={thButtonStyle}
                    >
                      {col.label}
                      {arrow}
                    </button>
                  </th>
                );
              })}
              {STATUS_COLUMNS.map((label) => (
                <th key={label} style={{ ...thStyle, textAlign: "center" }}>
                  <span style={thButtonStyle}>{label}</span>
                </th>
              ))}
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ entry, cost }) => {
              const item = EVENT_ITEMS_BY_ID.get(entry.itemId);
              if (!item) return null;
              return (
                <tr key={entry.id}>
                  <PlanRowCells
                    theme={theme}
                    entry={entry}
                    cost={cost}
                    item={item}
                    tdStyle={tdStyle}
                    removeEntry={removeEntry}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Event settings ───────────────────────────────────────────────────────────

// Pin toggles, selects, and form controls to one height so the rows line up
// (same control height as the star force calculator).
const controlHeightStyle: React.CSSProperties = { height: 34, boxSizing: "border-box" };
const toggleControlStyle: React.CSSProperties = {
  ...controlHeightStyle,
  display: "flex",
  alignItems: "center",
};

function EventSettingsSection({
  theme, costDiscount, boomReduction, starCatch, safeguard, mvp, boomTier,
  setCostDiscount, setBoomReduction, setStarCatch, setSafeguard, setMvp, setBoomTier,
  selectStyle,
}: {
  theme: AppTheme;
  costDiscount: boolean;
  boomReduction: boolean;
  starCatch: boolean;
  safeguard: boolean;
  mvp: MvpTier;
  boomTier: number;
  setCostDiscount: (v: boolean) => void;
  setBoomReduction: (v: boolean) => void;
  setStarCatch: (v: boolean) => void;
  setSafeguard: (v: boolean) => void;
  setMvp: (v: MvpTier) => void;
  setBoomTier: (v: number) => void;
  selectStyle: React.CSSProperties;
}) {
  // The next item's Enhancement Mode tier > 1 overrides its safeguard, so disable
  // that toggle. The events stay enabled — they stack with Enhancement Mode and
  // apply to every entry.
  const tierActive = boomTier > 1;
  const rowStyle: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" };
  const labelStyle: React.CSSProperties = { color: theme.muted, marginBottom: 0, minWidth: 110 };
  // Left-column labels (Events, MVP) hug their controls more tightly.
  const narrowLabelStyle: React.CSSProperties = { ...labelStyle, minWidth: 60 };
  return (
    <div className="ep-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
      <div className="ep-setting-row" style={rowStyle}>
        <span className="section-label" style={narrowLabelStyle}>Events</span>
        <Toggle theme={theme} label="30% Off Cost" checked={costDiscount} style={toggleControlStyle} onChange={setCostDiscount} />
        <Toggle theme={theme} label="30% Boom Reduction" checked={boomReduction} style={toggleControlStyle} onChange={setBoomReduction} />
      </div>
      <div className="ep-setting-row" style={rowStyle}>
        <span className="section-label" style={labelStyle}>Options</span>
        <Toggle theme={theme} label="Star Catching" checked={starCatch} style={toggleControlStyle} onChange={setStarCatch} />
        <Toggle theme={theme} label="Safeguard (15-17)" checked={safeguard} disabled={tierActive} style={toggleControlStyle} onChange={setSafeguard} />
      </div>
      <div className="ep-setting-row" style={rowStyle}>
        <span className="section-label" style={narrowLabelStyle}>MVP</span>
        <select
          className="tool-select"
          value={mvp}
          onChange={(e) => setMvp(e.target.value as MvpTier)}
          style={{ ...selectStyle, ...controlHeightStyle, width: 130 }}
        >
          {MVP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="ep-setting-row" style={rowStyle}>
        <span className="section-label" style={labelStyle}>Enhancement Mode</span>
        <input
          type="range"
          min={1}
          max={BOOM_TIER_COUNT}
          step={1}
          value={boomTier}
          onChange={(e) => setBoomTier(Number(e.target.value))}
          aria-label="Enhancement Mode tier"
          style={{ flex: 1, minWidth: 140, accentColor: theme.accent, cursor: "pointer" }}
        />
        <span style={{ fontSize: "0.8rem", fontWeight: 800, color: theme.text, minWidth: 24 }}>
          {boomTier}×
        </span>
      </div>
    </div>
  );
}

// ── Add item form ─────────────────────────────────────────────────────────────

function AddItemForm({
  theme, form, dispatchForm, characters, itemMaxStar, canAdd, handleAdd, styles,
}: {
  theme: AppTheme;
  form: FormState;
  dispatchForm: React.Dispatch<FormAction>;
  characters: StoredCharacterRecord[];
  itemMaxStar: number;
  canAdd: boolean;
  handleAdd: () => void;
  styles: ReturnType<typeof toolStyles>;
}) {
  return (
    <div className="ep-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "end" }}>
      <div>
        <div className="section-label" style={{ color: theme.muted, marginBottom: 4, fontSize: "0.75rem" }}>Character</div>
        <div style={{ display: "flex", gap: 6 }}>
          <CharacterDropdown
            theme={theme}
            characters={characters}
            selectedCharName={form.char === "" ? null : form.char}
            onCharChange={(name) => dispatchForm({ type: "setChar", value: name ?? "" })}
            inputStyle={styles.inputStyle}
            nullOption={{ label: "Unspecified", subtitle: "No character" }}
            extraOption={{ value: "__custom__", label: "Other", subtitle: "Enter a name" }}
            triggerStyle={{ maxWidth: "none", minWidth: 160 }}
          />
          {form.char === "__custom__" && (
            <input className="tool-input" type="text" value={form.charCustom} onChange={(e) => dispatchForm({ type: "setCharCustom", value: e.target.value })} placeholder="Character name" style={{ ...styles.inputStyle, flex: 1, minWidth: 0, alignSelf: "stretch" }} />
          )}
        </div>
      </div>
      <div>
        <div className="section-label" style={{ color: theme.muted, marginBottom: 4, fontSize: "0.75rem" }}>Item</div>
        <ItemSelector theme={theme} value={form.item} onChange={(v) => dispatchForm({ type: "setItem", value: v })} inputStyle={styles.inputStyle} />
      </div>
      <div>
        <div className="section-label" style={{ color: theme.muted, marginBottom: 4, fontSize: "0.75rem" }}>Stars</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select className="tool-select" value={form.currentStar} onChange={(e) => dispatchForm({ type: "setCurrentStar", value: Number(e.target.value) })} style={{ ...styles.selectStyle, width: 80 }}>
            {Array.from({ length: itemMaxStar }, (_, i) => i).map((s) => <option key={s} value={s}>{s}★</option>)}
          </select>
          <span style={{ color: theme.muted, fontWeight: 700, fontSize: "0.85rem" }}>→</span>
          <select className="tool-select" value={form.targetStar} onChange={(e) => dispatchForm({ type: "setTargetStar", value: Number(e.target.value) })} style={{ ...styles.selectStyle, width: 80 }}>
            {Array.from({ length: itemMaxStar }, (_, i) => i + 1).map((s) => <option key={s} value={s}>{s}★</option>)}
          </select>
        </div>
      </div>
      <div>
        <div className="section-label" style={{ color: theme.muted, marginBottom: 4, fontSize: "0.75rem" }}>Replace Cost</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input className="tool-input" type="number" min={0} value={form.replaceCost} onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} onChange={(e) => dispatchForm({ type: "setReplaceCost", value: Math.max(0, Number(e.target.value) || 0) })} placeholder="0" style={{ ...styles.inputStyle, ...controlHeightStyle, width: 120 }} />
          <ActionButton theme={theme} label="+ Add" disabled={!canAdd} onClick={handleAdd} style={{ marginLeft: "auto", ...controlHeightStyle, padding: "0 22px" }} />
        </div>
      </div>
    </div>
  );
}

// ── Main workspace ───────────────────────────────────────────────────────────

export default function EventPlannerWorkspace({ theme }: { theme: AppTheme }) {
  const {
    mounted,
    characters,
    state,
    setCostDiscount,
    setBoomReduction,
    setMvp,
    addEntry,
    removeEntry,
    clearEntries,
    entryCosts,
    grandTotal,
  } = useEventPlannerState();

  const styles = toolStyles(theme);

  // ── Add-item form state ──

  const { form, dispatchForm, itemMaxStar, canAdd, handleAdd } =
    useEventPlannerForm(addEntry);

  // ── Group entries by character ──

  const charByName = useMemo(
    () => new Map(characters.map((c) => [c.characterName, c])),
    [characters],
  );

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, PlanRow[]>();
    state.entries.forEach((entry, idx) => {
      const key = entry.characterName || "Unspecified";
      const arr = groups.get(key) ?? [];
      arr.push({ entry, cost: entryCosts[idx] });
      groups.set(key, arr);
    });
    return groups;
  }, [state.entries, entryCosts]);

  // ── Styles ──

  const panelStyle: React.CSSProperties = { ...styles.sectionPanel, borderRadius: "14px" };

  const clearAllButtonStyle: React.CSSProperties = {
    padding: "6px 14px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 700,
    color: "#e05a5a", background: theme.timerBg, border: `1px solid ${theme.border}`,
    userSelect: "none",
  };

  if (!mounted) return null;

  return (
    <div className="page-content">
      <style>{`
        .tool-dropdown-item:hover { background: ${theme.timerBg}; }
        .ep-plan-table tbody tr:last-child td { border-bottom: none; }
        @media (max-width: 860px) {
          .ep-form-grid { grid-template-columns: 1fr !important; }
          /* Stack each settings row: label on its own line, controls filling
             the full width below (the boom slider + value wrap to a new line). */
          .ep-setting-row > .section-label { flex-basis: 100%; }
          .ep-setting-row > .tool-btn { flex: 1; justify-content: center; }
          .ep-setting-row > .tool-select { flex: 1; }
        }
      `}</style>

      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Event Planner"
          description="Toggle your active events and options, then add items with their current and target stars to plan your total spending."
        />

        {/* Settings + add form share one panel to keep the header area short. */}
        <div className="fade-in panel-card" style={{ ...panelStyle, overflow: "visible", position: "relative", zIndex: 10 }}>
          <EventSettingsSection
            theme={theme}
            costDiscount={state.costDiscount}
            boomReduction={state.boomReduction}
            starCatch={form.starCatch}
            safeguard={form.safeguard}
            mvp={state.mvp}
            boomTier={form.boomTier}
            setCostDiscount={setCostDiscount}
            setBoomReduction={setBoomReduction}
            setStarCatch={(v) => dispatchForm({ type: "setStarCatch", value: v })}
            setSafeguard={(v) => dispatchForm({ type: "setSafeguard", value: v })}
            setMvp={setMvp}
            setBoomTier={(v) => dispatchForm({ type: "setBoomTier", value: v })}
            selectStyle={styles.selectStyle}
          />
          <PanelDivider theme={theme} />
          <AddItemForm
            theme={theme}
            form={form}
            dispatchForm={dispatchForm}
            characters={characters}
            itemMaxStar={itemMaxStar}
            canAdd={canAdd}
            handleAdd={handleAdd}
            styles={styles}
          />
        </div>

        {state.entries.length > 0 && (
          <PlanSummary
            theme={theme}
            grandTotal={grandTotal}
            entryCount={state.entries.length}
            clearEntries={clearEntries}
            panelStyle={panelStyle}
            clearAllButtonStyle={clearAllButtonStyle}
          />
        )}

        {Array.from(groupedEntries.entries()).map(([name, rows]) => (
          <CharacterPlanPanel
            key={name}
            theme={theme}
            name={name}
            record={charByName.get(name) ?? null}
            rows={rows}
            removeEntry={removeEntry}
            panelStyle={panelStyle}
          />
        ))}
      </div>
    </div>
  );
}

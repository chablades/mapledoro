"use client";

import {
  useState,
  useReducer,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import Image from "next/image";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import { WikiAttribution } from "../../../components/WikiAttribution";
import {
  formatMeso,
  formatMesoFull,
} from "../star-force/star-force-data";
import { Toggle, PillGroup, MVP_OPTIONS } from "../shared-ui";
import { toolStyles } from "../tool-styles";
import {
  EVENT_ITEMS,
  EVENT_ITEMS_BY_ID,
  ITEM_CATEGORIES,
  maxStarForLevel,
  categoryLabel,
  type EventItem,
} from "./event-items";
import { useEventPlannerState, type PlannerEntry, type EntryCost } from "./useEventPlannerState";

// ── Shared sub-components ────────────────────────────────────────────────────

function ItemIcon({
  item,
  size = 28,
  theme,
}: {
  item: EventItem;
  size?: number;
  theme: AppTheme;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <Image
        ref={imgRef}
        src={item.icon}
        alt={item.name}
        width={size}
        height={size}
        onError={() => {
          if (imgRef.current) imgRef.current.style.display = "none";
          if (fallbackRef.current) fallbackRef.current.style.display = "flex";
        }}
        className="item-icon-img"
      />
      <div
        ref={fallbackRef}
        className="item-icon-fallback"
        style={{
          width: size,
          height: size,
          background: theme.timerBg,
          border: `1px solid ${theme.border}`,
          fontSize: size * 0.36,
          color: theme.muted,
        }}
      >
        {item.name[0]}
      </div>
    </>
  );
}

// ── Filterable item dropdown ─────────────────────────────────────────────────

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

  const refSelect = useRef<HTMLSelectElement>(null);
  const [selectH, setSelectH] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (refSelect.current) setSelectH(refSelect.current.offsetHeight);
  }, []);

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
      {/* Hidden sizing reference */}
      <select
        ref={refSelect}
        className="tool-input"
        style={{ ...inputStyle, cursor: "pointer", position: "absolute", visibility: "hidden", pointerEvents: "none", width: "100%" }}
        tabIndex={-1}
        aria-hidden
      >
        <option>X</option>
      </select>
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
          height: selectH,
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
          <ItemIcon item={selectedItem} size={18} theme={theme} />
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
                    <ItemIcon item={item} size={22} theme={theme} />
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

// ── Summary panel ───────────────────────────────────────────────────────────

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
  return (
    <div className="fade-in panel-card" style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.95rem",
              color: theme.text,
              marginBottom: "0.75rem",
            }}
          >
            Summary
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem" }}>
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: theme.muted,
                  marginBottom: "0.2rem",
                }}
              >
                Total Expected Cost
              </div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.25rem",
                  color: theme.accent,
                }}
              >
                {formatMeso(grandTotal.cost)}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: theme.muted,
                  fontWeight: 600,
                }}
              >
                {formatMesoFull(grandTotal.cost)} mesos
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: theme.muted,
                  marginBottom: "0.2rem",
                }}
              >
                Total Expected Spares
              </div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.25rem",
                  color: grandTotal.booms > 0 ? "#e05a5a" : theme.text,
                }}
              >
                {grandTotal.booms === 0 ? "0" : grandTotal.booms.toFixed(1)}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: theme.muted,
                  fontWeight: 600,
                }}
              >
                replacement items
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: theme.muted,
                  marginBottom: "0.2rem",
                }}
              >
                Items
              </div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.25rem",
                  color: theme.text,
                }}
              >
                {entryCount}
              </div>
            </div>
          </div>
        </div>
        <div
          className="tool-btn"
          role="button"
          tabIndex={0}
          onClick={clearEntries}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              clearEntries();
            }
          }}
          style={clearAllButtonStyle}
        >
          Clear All
        </div>
      </div>
    </div>
  );
}

// ── Plan items list ─────────────────────────────────────────────────────────

function PlanItemsList({
  theme,
  groupedEntries,
  toggleSafeguard,
  removeEntry,
  panelStyle,
  safeguardBaseStyle,
  removeButtonStyle,
}: {
  theme: AppTheme;
  groupedEntries: Map<string, { entry: PlannerEntry; cost: EntryCost; idx: number }[]>;
  toggleSafeguard: (id: string) => void;
  removeEntry: (id: string) => void;
  panelStyle: React.CSSProperties;
  safeguardBaseStyle: React.CSSProperties;
  removeButtonStyle: React.CSSProperties;
}) {
  return (
    <div className="fade-in panel-card" style={{ ...panelStyle, padding: 0 }}>
      {Array.from(groupedEntries.entries()).map(
        ([charName, items], groupIdx) => (
          <div key={charName}>
            <div
              style={{
                padding: "0.75rem 1.25rem",
                borderBottom: `1px solid ${theme.border}`,
                borderTop: groupIdx > 0 ? `1px solid ${theme.border}` : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  color: theme.text,
                }}
              >
                {charName}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: theme.accent,
                }}
              >
                {formatMesoFull(
                  items.reduce((s, i) => s + i.cost.cost, 0),
                )}{" "}mesos
              </div>
            </div>

            {items.map(({ entry, cost }) => {
              const item = EVENT_ITEMS_BY_ID.get(entry.itemId);
              if (!item) return null;
              return (
                <div
                  key={entry.id}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderBottom: `1px solid ${theme.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <ItemIcon item={item} size={30} theme={theme} />
                  <div style={{ minWidth: 220 }}>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: theme.text,
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: theme.muted,
                      }}
                    >
                      Lv.{item.level} {item.slot}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: theme.accent,
                      whiteSpace: "nowrap",
                      width: 90,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {entry.currentStar}★ → {entry.targetStar}★
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      gap: "1rem",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: theme.text,
                        }}
                      >
                        {formatMesoFull(cost.cost)} mesos
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 90 }}>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: cost.booms > 0 ? "#e05a5a" : theme.muted,
                        }}
                      >
                        {cost.booms === 0 ? "0" : cost.booms.toFixed(1)} spares
                      </div>
                    </div>
                    <div
                      className="tool-btn"
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSafeguard(entry.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSafeguard(entry.id);
                        }
                      }}
                      title={entry.safeguard ? "Safeguard ON (15-17)" : "Safeguard OFF"}
                      style={{
                        ...safeguardBaseStyle,
                        color: entry.safeguard ? theme.accentText : theme.muted,
                        background: entry.safeguard ? theme.accentSoft : theme.timerBg,
                        border: `1px solid ${entry.safeguard ? theme.accent : theme.border}`,
                      }}
                    >
                      Safeguard
                    </div>
                    <div
                      className="tool-btn"
                      role="button"
                      tabIndex={0}
                      onClick={() => removeEntry(entry.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          removeEntry(entry.id);
                        }
                      }}
                      style={removeButtonStyle}
                    >
                      {"×"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ),
      )}
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
    setStarCatch,
    setMvp,
    addEntry,
    removeEntry,
    toggleSafeguard,
    clearEntries,
    entryCosts,
    grandTotal,
  } = useEventPlannerState();

  const styles = toolStyles(theme);

  // ── Add-item form state ──

  interface FormState {
    char: string;
    charCustom: string;
    item: string | null;
    currentStar: number;
    targetStar: number;
    replaceCost: number;
    safeguard: boolean;
  }
  type FormAction =
    | { type: "setChar"; value: string }
    | { type: "setCharCustom"; value: string }
    | { type: "setItem"; value: string | null }
    | { type: "setCurrentStar"; value: number }
    | { type: "setTargetStar"; value: number }
    | { type: "setReplaceCost"; value: number }
    | { type: "setSafeguard"; value: boolean }
    | { type: "clearItem" };
  const [form, dispatchForm] = useReducer(
    (state: FormState, action: FormAction): FormState => {
      switch (action.type) {
        case "setChar": return { ...state, char: action.value };
        case "setCharCustom": return { ...state, charCustom: action.value };
        case "setItem": return { ...state, item: action.value };
        case "setCurrentStar": return { ...state, currentStar: action.value };
        case "setTargetStar": return { ...state, targetStar: action.value };
        case "setReplaceCost": return { ...state, replaceCost: action.value };
        case "setSafeguard": return { ...state, safeguard: action.value };
        case "clearItem": return { ...state, item: null };
      }
    },
    { char: "", charCustom: "", item: null, currentStar: 17, targetStar: 22, replaceCost: 0, safeguard: false },
  );

  const selectedItem = form.item ? EVENT_ITEMS_BY_ID.get(form.item) ?? null : null;
  const itemMaxStar = selectedItem ? maxStarForLevel(selectedItem.level) : 25;

  const canAdd =
    selectedItem !== null && form.currentStar < form.targetStar && form.targetStar <= itemMaxStar;

  const handleAdd = useCallback(() => {
    if (!form.item || !canAdd) return;
    const charName = form.char === "__custom__" ? form.charCustom.trim() : form.char;
    addEntry({
      characterName: charName,
      itemId: form.item,
      currentStar: form.currentStar,
      targetStar: form.targetStar,
      replacementCost: form.replaceCost,
      safeguard: form.safeguard,
    });
    dispatchForm({ type: "clearItem" });
  }, [form, canAdd, addEntry]);

  // ── Group entries by character ──

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, { entry: PlannerEntry; cost: EntryCost; idx: number }[]>();
    state.entries.forEach((entry, idx) => {
      const key = entry.characterName || "Unspecified";
      const arr = groups.get(key) ?? [];
      arr.push({ entry, cost: entryCosts[idx], idx });
      groups.set(key, arr);
    });
    return groups;
  }, [state.entries, entryCosts]);

  // ── Styles ──

  const panelStyle: React.CSSProperties = {
    ...styles.sectionPanel,
    borderRadius: "14px",
  };

  const addButtonBaseStyle: React.CSSProperties = {
    padding: "7px 20px",
    borderRadius: "10px",
    fontSize: "0.82rem",
    fontWeight: 800,
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const clearAllButtonStyle: React.CSSProperties = {
    padding: "6px 14px",
    borderRadius: "8px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#e05a5a",
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    userSelect: "none",
    alignSelf: "flex-start",
  };

  const safeguardBaseStyle: React.CSSProperties = {
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: "0.75rem",
    fontWeight: 700,
    userSelect: "none",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };

  const removeButtonStyle: React.CSSProperties = {
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

  if (!mounted) return null;

  return (
    <div style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}>
      <style>{`
        .tool-btn { transition: background 0.15s, border-color 0.15s; cursor: pointer; }
        .tool-dropdown-item:hover { background: ${theme.timerBg}; }
        @media (max-width: 860px) {
          .ep-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <ToolHeader
          theme={theme}
          title="Event Planner"
          description="Toggle your active events and options, then add items with their current and target stars to plan your total spending."
        />

        {/* ── Event Settings ────────────────────────────────────────────── */}
        <div className="fade-in panel-card" style={panelStyle}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <span
              className="section-label"
              style={{ color: theme.muted, marginBottom: 0, minWidth: 60 }}
            >
              Events
            </span>
            <Toggle
              theme={theme}
              label="30% Off Cost"
              checked={state.costDiscount}
              onChange={setCostDiscount}
            />
            <Toggle
              theme={theme}
              label="30% Boom Reduction"
              checked={state.boomReduction}
              onChange={setBoomReduction}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <span
              className="section-label"
              style={{ color: theme.muted, marginBottom: 0, minWidth: 60 }}
            >
              Options
            </span>
            <Toggle
              theme={theme}
              label="Star Catching"
              checked={state.starCatch}
              onChange={setStarCatch}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <span
              className="section-label"
              style={{ color: theme.muted, marginBottom: 0, minWidth: 60 }}
            >
              MVP
            </span>
            <PillGroup
              theme={theme}
              options={MVP_OPTIONS}
              value={state.mvp}
              onChange={setMvp}
            />
          </div>
        </div>

        {/* ── Add Item Form ─────────────────────────────────────────────── */}
        <div className="fade-in panel-card" style={{ ...panelStyle, overflow: "visible", position: "relative", zIndex: 10 }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.95rem",
              color: theme.text,
              marginBottom: "1rem",
            }}
          >
            Add Item
          </div>

          <div
            className="ep-form-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.75rem",
              alignItems: "end",
            }}
          >
            {/* Character */}
            <div>
              <div
                className="section-label"
                style={{ color: theme.muted, marginBottom: 4, fontSize: "0.75rem" }}
              >
                Character
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  className="tool-input"
                  value={form.char}
                  onChange={(e) => dispatchForm({ type: "setChar", value: e.target.value })}
                  style={{ ...styles.selectStyle, flex: 1 }}
                >
                  <option value="">Unspecified</option>
                  {characters.map((c) => (
                    <option key={c.characterName} value={c.characterName}>
                      {c.characterName} (Lv.{c.level} {c.jobName})
                    </option>
                  ))}
                  <option value="__custom__">Other (enter name)</option>
                </select>
                {form.char === "__custom__" && (
                  <input
                    className="tool-input"
                    type="text"
                    value={form.charCustom}
                    onChange={(e) => dispatchForm({ type: "setCharCustom", value: e.target.value })}
                    placeholder="Character name"
                    style={{ ...styles.inputStyle, flex: 1 }}
                  />
                )}
              </div>
            </div>

            {/* Item selector */}
            <div>
              <div
                className="section-label"
                style={{ color: theme.muted, marginBottom: 4, fontSize: "0.75rem" }}
              >
                Item
              </div>
              <ItemSelector
                theme={theme}
                value={form.item}
                onChange={(v) => dispatchForm({ type: "setItem", value: v })}
                inputStyle={styles.inputStyle}
              />
            </div>

            {/* Stars */}
            <div>
              <div
                className="section-label"
                style={{ color: theme.muted, marginBottom: 4, fontSize: "0.75rem" }}
              >
                Stars
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select
                  className="tool-input"
                  value={form.currentStar}
                  onChange={(e) => dispatchForm({ type: "setCurrentStar", value: Number(e.target.value) })}
                  style={{ ...styles.selectStyle, width: 80 }}
                >
                  {Array.from({ length: itemMaxStar }, (_, i) => i).map((s) => (
                    <option key={s} value={s}>
                      {s}★
                    </option>
                  ))}
                </select>
                <span style={{ color: theme.muted, fontWeight: 700, fontSize: "0.85rem" }}>
                  →
                </span>
                <select
                  className="tool-input"
                  value={form.targetStar}
                  onChange={(e) => dispatchForm({ type: "setTargetStar", value: Number(e.target.value) })}
                  style={{ ...styles.selectStyle, width: 80 }}
                >
                  {Array.from({ length: itemMaxStar }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      {s}★
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Replace cost + safeguard + add button */}
            <div>
              <div
                className="section-label"
                style={{ color: theme.muted, marginBottom: 4, fontSize: "0.75rem" }}
              >
                Replace Cost
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  className="tool-input"
                  type="number"
                  min={0}
                  value={form.replaceCost}
                  onChange={(e) =>
                    dispatchForm({ type: "setReplaceCost", value: Math.max(0, Number(e.target.value) || 0) })
                  }
                  placeholder="0"
                  style={{ ...styles.inputStyle, width: 120 }}
                />
                <Toggle
                  theme={theme}
                  label="Safeguard"
                  checked={form.safeguard}
                  onChange={(v) => dispatchForm({ type: "setSafeguard", value: v })}
                />
                <div
                  className="tool-btn"
                  role="button"
                  tabIndex={0}
                  onClick={handleAdd}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  style={{
                    ...addButtonBaseStyle,
                    color: canAdd ? theme.accentText : theme.muted,
                    background: canAdd ? theme.accentSoft : theme.timerBg,
                    border: `1px solid ${canAdd ? theme.accent : theme.border}`,
                    opacity: canAdd ? 1 : 0.5,
                    pointerEvents: canAdd ? "auto" : "none",
                  }}
                >
                  + Add
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary ───────────────────────────────────────���───────────── */}
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

        {/* ── Plan Items ────────────────────────────────────────────────── */}
        {state.entries.length > 0 && (
          <PlanItemsList
            theme={theme}
            groupedEntries={groupedEntries}
            toggleSafeguard={toggleSafeguard}
            removeEntry={removeEntry}
            panelStyle={panelStyle}
            safeguardBaseStyle={safeguardBaseStyle}
            removeButtonStyle={removeButtonStyle}
          />
        )}

        <WikiAttribution theme={theme} subject="Item images" />
      </div>
    </div>
  );
}

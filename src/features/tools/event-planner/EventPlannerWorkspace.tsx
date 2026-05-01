"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from "react";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import { WikiAttribution } from "../../../components/WikiAttribution";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import {
  computeExpectedCosts,
  formatMeso,
  formatMesoFull,
  type StarForceOpts,
  type MvpTier,
} from "../star-force/star-force-data";
import { Toggle, PillGroup } from "../shared-ui";
import {
  EVENT_ITEMS,
  EVENT_ITEMS_BY_ID,
  ITEM_CATEGORIES,
  maxStarForLevel,
  categoryLabel,
  type EventItem,
} from "./event-items";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlannerEntry {
  id: string;
  characterName: string;
  itemId: string;
  currentStar: number;
  targetStar: number;
  replacementCost: number;
  safeguard: boolean;
}

interface SavedState {
  costDiscount: boolean;
  boomReduction: boolean;
  starCatch: boolean;
  mvp: MvpTier;
  entries: PlannerEntry[];
}

interface EntryCost {
  cost: number;
  booms: number;
}

// ── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "event-planner-v1";

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(state: SavedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultState(): SavedState {
  return {
    costDiscount: false,
    boomReduction: false,
    starCatch: true,
    mvp: "none",
    entries: [],
  };
}

// ── Cost Calculation ─────────────────────────────────────────────────────────

function computeEntryCost(entry: PlannerEntry, settings: SavedState): EntryCost {
  const item = EVENT_ITEMS_BY_ID.get(entry.itemId);
  if (!item || entry.currentStar >= entry.targetStar) return { cost: 0, booms: 0 };

  const opts: StarForceOpts = {
    level: item.level,
    startStar: entry.currentStar,
    targetStar: entry.targetStar,
    replacementCost: entry.replacementCost,
    costDiscount: settings.costDiscount,
    boomReduction: settings.boomReduction,
    starCatch: settings.starCatch,
    safeguard: entry.safeguard,
    mvp: settings.mvp,
  };

  const results = computeExpectedCosts(opts);
  return {
    cost: results.reduce((s, r) => s + r.expectedCost, 0),
    booms: results.reduce((s, r) => s + r.expectedBooms, 0),
  };
}

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
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 4,
          background: theme.timerBg,
          border: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.36,
          fontWeight: 800,
          color: theme.muted,
          flexShrink: 0,
        }}
      >
        {item.name[0]}
      </div>
    );
  }

  return (
    <img
      src={item.icon}
      alt={item.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ objectFit: "contain", flexShrink: 0 }}
    />
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

  /* Ref select is a hidden native <select> used purely to derive the
     exact computed height so the custom input matches pixel-for-pixel. */
  const refSelect = useRef<HTMLSelectElement>(null);
  const [selectH, setSelectH] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (refSelect.current) setSelectH(refSelect.current.offsetHeight);
  }, []);

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
          style={{
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
          }}
        />
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.6rem",
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
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: 320,
            overflowY: "auto",
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: "8px",
            zIndex: 100,
            marginTop: 4,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          }}
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
                    fontSize: "0.68rem",
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
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    style={{
                      padding: "7px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: theme.text,
                    }}
                  >
                    <ItemIcon item={item} size={22} theme={theme} />
                    <span>{item.name}</span>
                    <span
                      style={{
                        color: theme.muted,
                        fontSize: "0.7rem",
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

// ── MVP options ──────────────────────────────────────────────────────────────

const MVP_OPTIONS: { value: MvpTier; label: string }[] = [
  { value: "none", label: "None" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "diamond", label: "Diamond" },
];

// ── Main workspace ───────────────────────────────────────────────────────────

export default function EventPlannerWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const characters: StoredCharacterRecord[] = useMemo(
    () => (mounted ? selectCharactersList(readCharactersStore()) : []),
    [mounted],
  );

  // ── Persisted state ──

  const [state, setState] = useState<SavedState>(() => {
    if (typeof window === "undefined") return defaultState();
    return loadState() ?? defaultState();
  });

  useEffect(() => {
    persistState(state);
  }, [state]);

  // ── Settings callbacks ──

  const setCostDiscount = useCallback(
    (v: boolean) => setState((s) => ({ ...s, costDiscount: v })),
    [],
  );
  const setBoomReduction = useCallback(
    (v: boolean) => setState((s) => ({ ...s, boomReduction: v })),
    [],
  );
  const setStarCatch = useCallback(
    (v: boolean) => setState((s) => ({ ...s, starCatch: v })),
    [],
  );
  const setMvp = useCallback(
    (v: MvpTier) => setState((s) => ({ ...s, mvp: v })),
    [],
  );

  // ── Entry management ──

  const addEntry = useCallback(
    (entry: Omit<PlannerEntry, "id">) => {
      setState((s) => ({
        ...s,
        entries: [...s.entries, { ...entry, id: crypto.randomUUID() }],
      }));
    },
    [],
  );

  const removeEntry = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      entries: s.entries.filter((e) => e.id !== id),
    }));
  }, []);

  const toggleSafeguard = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, safeguard: !e.safeguard } : e,
      ),
    }));
  }, []);

  const clearEntries = useCallback(() => {
    setState((s) => ({ ...s, entries: [] }));
  }, []);

  // ── Cost computation ──

  const entryCosts = useMemo(
    () => state.entries.map((e) => computeEntryCost(e, state)),
    [state],
  );

  const grandTotal = useMemo(
    () =>
      entryCosts.reduce(
        (acc, c) => ({ cost: acc.cost + c.cost, booms: acc.booms + c.booms }),
        { cost: 0, booms: 0 },
      ),
    [entryCosts],
  );

  // ── Add-item form state ──

  const [formChar, setFormChar] = useState<string>("");
  const [formCharCustom, setFormCharCustom] = useState("");
  const [formItem, setFormItem] = useState<string | null>(null);
  const [formCurrentStar, setFormCurrentStar] = useState(17);
  const [formTargetStar, setFormTargetStar] = useState(22);
  const [formReplaceCost, setFormReplaceCost] = useState(0);
  const [formSafeguard, setFormSafeguard] = useState(false);

  const selectedItem = formItem ? EVENT_ITEMS_BY_ID.get(formItem) ?? null : null;
  const itemMaxStar = selectedItem ? maxStarForLevel(selectedItem.level) : 25;

  const canAdd =
    selectedItem !== null && formCurrentStar < formTargetStar && formTargetStar <= itemMaxStar;

  const handleAdd = useCallback(() => {
    if (!formItem || !canAdd) return;
    const charName = formChar === "__custom__" ? formCharCustom.trim() : formChar;
    addEntry({
      characterName: charName,
      itemId: formItem,
      currentStar: formCurrentStar,
      targetStar: formTargetStar,
      replacementCost: formReplaceCost,
      safeguard: formSafeguard,
    });
    setFormItem(null);
  }, [formItem, canAdd, formChar, formCharCustom, formCurrentStar, formTargetStar, formReplaceCost, formSafeguard, addEntry]);

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

  const inputStyle: React.CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontSize: "0.82rem",
    fontWeight: 700,
    borderRadius: "8px",
    padding: "7px 10px",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  const panelStyle: React.CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    padding: "1.25rem",
    marginBottom: "1.25rem",
    borderRadius: "14px",
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
                style={{ color: theme.muted, marginBottom: 4, fontSize: "0.72rem" }}
              >
                Character
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <select
                  className="tool-input"
                  value={formChar}
                  onChange={(e) => setFormChar(e.target.value)}
                  style={{ ...selectStyle, flex: 1 }}
                >
                  <option value="">Unspecified</option>
                  {characters.map((c) => (
                    <option key={c.characterName} value={c.characterName}>
                      {c.characterName} (Lv.{c.level} {c.jobName})
                    </option>
                  ))}
                  <option value="__custom__">Other (enter name)</option>
                </select>
                {formChar === "__custom__" && (
                  <input
                    className="tool-input"
                    type="text"
                    value={formCharCustom}
                    onChange={(e) => setFormCharCustom(e.target.value)}
                    placeholder="Character name"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                )}
              </div>
            </div>

            {/* Item selector */}
            <div>
              <div
                className="section-label"
                style={{ color: theme.muted, marginBottom: 4, fontSize: "0.72rem" }}
              >
                Item
              </div>
              <ItemSelector
                theme={theme}
                value={formItem}
                onChange={setFormItem}
                inputStyle={inputStyle}
              />
            </div>

            {/* Stars */}
            <div>
              <div
                className="section-label"
                style={{ color: theme.muted, marginBottom: 4, fontSize: "0.72rem" }}
              >
                Stars
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select
                  className="tool-input"
                  value={formCurrentStar}
                  onChange={(e) => setFormCurrentStar(Number(e.target.value))}
                  style={{ ...selectStyle, width: 80 }}
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
                  value={formTargetStar}
                  onChange={(e) => setFormTargetStar(Number(e.target.value))}
                  style={{ ...selectStyle, width: 80 }}
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
                style={{ color: theme.muted, marginBottom: 4, fontSize: "0.72rem" }}
              >
                Replace Cost
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  className="tool-input"
                  type="number"
                  min={0}
                  value={formReplaceCost}
                  onChange={(e) =>
                    setFormReplaceCost(Math.max(0, Number(e.target.value) || 0))
                  }
                  placeholder="0"
                  style={{ ...inputStyle, width: 120 }}
                />
                <Toggle
                  theme={theme}
                  label="Safeguard"
                  checked={formSafeguard}
                  onChange={setFormSafeguard}
                />
                <div
                  className="tool-btn"
                  onClick={handleAdd}
                  style={{
                    padding: "7px 20px",
                    borderRadius: "10px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    color: canAdd ? theme.accentText : theme.muted,
                    background: canAdd ? theme.accentSoft : theme.timerBg,
                    border: `1px solid ${canAdd ? theme.accent : theme.border}`,
                    userSelect: "none",
                    opacity: canAdd ? 1 : 0.5,
                    pointerEvents: canAdd ? "auto" : "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Add
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Summary ───────────────────────────────────────────────────── */}
        {state.entries.length > 0 && (
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
                        fontSize: "0.68rem",
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
                        fontSize: "0.72rem",
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
                        fontSize: "0.68rem",
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
                        fontSize: "0.72rem",
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
                        fontSize: "0.68rem",
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
                      {state.entries.length}
                    </div>
                  </div>
                </div>
              </div>
              <div
                className="tool-btn"
                onClick={clearEntries}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#e05a5a",
                  background: theme.timerBg,
                  border: `1px solid ${theme.border}`,
                  userSelect: "none",
                  alignSelf: "flex-start",
                }}
              >
                Clear All
              </div>
            </div>
          </div>
        )}

        {/* ── Plan Items ────────────────────────────────────────────────── */}
        {state.entries.length > 0 && (
          <div className="fade-in panel-card" style={{ ...panelStyle, padding: 0 }}>
            {Array.from(groupedEntries.entries()).map(
              ([charName, items], groupIdx) => (
                <div key={charName}>
                  {/* Character group header */}
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
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: theme.accent,
                      }}
                    >
                      {formatMesoFull(
                        items.reduce((s, i) => s + i.cost.cost, 0),
                      )}{" "}mesos
                    </div>
                  </div>

                  {/* Item rows */}
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
                              fontSize: "0.7rem",
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
                            onClick={() => toggleSafeguard(entry.id)}
                            title={entry.safeguard ? "Safeguard ON (15-17)" : "Safeguard OFF"}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: entry.safeguard ? theme.accentText : theme.muted,
                              background: entry.safeguard ? theme.accentSoft : theme.timerBg,
                              border: `1px solid ${entry.safeguard ? theme.accent : theme.border}`,
                              userSelect: "none",
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Safeguard
                          </div>
                          <div
                            className="tool-btn"
                            onClick={() => removeEntry(entry.id)}
                            style={{
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
                            }}
                          >
                            {"\u00d7"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ),
            )}
          </div>
        )}

        <WikiAttribution theme={theme} subject="Item images" />
      </div>
    </div>
  );
}

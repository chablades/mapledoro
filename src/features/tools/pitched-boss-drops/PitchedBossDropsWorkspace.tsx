"use client";

import { useMemo, useRef, useState } from "react";
import { useMounted } from "../../../lib/useMounted";
import type { CSSProperties } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ItemIcon } from "./pitched-boss-ui";
import { toolStyles } from "../tool-styles";
import { controlHeightStyle } from "../shared-styles";
import { formatShortDate } from "../date";
import { ItemIcon as ResourceItemIcon } from "../../../components/ResourceImage";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import { ConfirmButton } from "../../../components/ConfirmButton";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import {
  clearStorageWriteFailure,
  reportStorageWriteFailure,
} from "../../../lib/storageWriteFailure";
import { DROP_CATEGORIES, DROP_ITEMS, DROP_ITEMS_BY_ID, type DropItem } from "./pitched-items";
import LogDropDialog, { type LogDropPayload } from "./LogDropDialog";
import { ActionButton } from "../shared-ui";
import type { PitchedBossDrop } from "./types";

const PitchedBossCharts = dynamic(() => import("./PitchedBossCharts"), {
  ssr: false,
});

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

interface PitchedBossDropsStore {
  version: 1;
  drops: PitchedBossDrop[];
}

/* The drop log has its own localStorage key rather than a field in the shared
 * mapledoro_tools_v1 blob, because it is the one tool store that grows without
 * bound: it is an append-only event log, so every Daily Tracker toggle and every
 * Boss Crystals re-read used to parse the player's entire drop history along with
 * their own data. */
const STORAGE_KEY = "mapledoro_drop_tracker_v1";
/** Where the log lived before it got its own key: a field inside the shared store. */
const LEGACY_TOOLS_KEY = "pitchedBossDrops";

function emptyStore(): PitchedBossDropsStore {
  return { version: 1, drops: [] };
}

function generateId(): string {
  return crypto.randomUUID();
}

function parseStore(raw: string | null): PitchedBossDropsStore | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PitchedBossDropsStore;
    if (parsed?.version === 1 && Array.isArray(parsed.drops)) return parsed;
  } catch { /* fall through to null */ }
  return null;
}

/** Returns whether the write actually persisted, so the migration below can tell
 *  a real save from a swallowed quota failure. */
function persistStore(store: PitchedBossDropsStore): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    clearStorageWriteFailure("dropTracker");
    return true;
  } catch {
    reportStorageWriteFailure("dropTracker");
    return false;
  }
}

function readStore(): PitchedBossDropsStore {
  if (typeof window === "undefined") return emptyStore();
  const own = parseStore(window.localStorage.getItem(STORAGE_KEY));
  if (own) return own;

  // No own key yet, so fall back to the shared store and move the log across.
  // The legacy copy is only cleared once the new key has actually persisted --
  // persistStore swallows quota failures, so clearing first could lose the whole
  // history. Returning the legacy data either way means a failed migration costs
  // nothing and simply retries on the next mount.
  //
  // Kept indefinitely rather than run once: Settings' JSON export is a snapshot of
  // whatever keys existed at the time, so a much older export can still be
  // imported and needs this path.
  const legacy = readGlobalTool<PitchedBossDropsStore>(LEGACY_TOOLS_KEY);
  if (legacy?.version === 1 && Array.isArray(legacy.drops)) {
    if (persistStore(legacy)) writeGlobalTool(LEGACY_TOOLS_KEY, null);
    return legacy;
  }
  return emptyStore();
}

function writeStore(store: PitchedBossDropsStore): void {
  persistStore(store);
}

/* ------------------------------------------------------------------ */
/*  Inline-style helpers                                               */
/* ------------------------------------------------------------------ */

// Colors + context sizing; static settings come from the `.tool-select` class.
function filterSelectStyle(theme: AppTheme): CSSProperties {
  return { ...toolStyles(theme).selectStyle, ...controlHeightStyle };
}

function thStyle(theme: AppTheme): CSSProperties {
  return {
    textAlign: "left" as const,
    padding: "0.5rem 0.75rem",
    color: theme.muted,
    fontWeight: 700,
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  };
}

function tdStyle(theme: AppTheme): CSSProperties {
  return {
    padding: "0.5rem 0.75rem",
    color: theme.text,
    fontSize: "0.82rem",
    verticalAlign: "middle",
  };
}

/* ------------------------------------------------------------------ */
/*  Filters & sorting                                                  */
/* ------------------------------------------------------------------ */

interface Filters {
  character: string; // "all" | characterName
  category: string; // "all" | category id
}

function applyFilters(drops: PitchedBossDrop[], filters: Filters): PitchedBossDrop[] {
  return drops.filter((d) => {
    if (filters.character !== "all" && d.characterName !== filters.character) return false;
    if (filters.category !== "all") {
      const item = DROP_ITEMS_BY_ID.get(d.itemId);
      if (item?.category !== filters.category) return false;
    }
    return true;
  });
}

type SortKey = "date" | "character" | "item" | "channel";
interface Sort {
  key: SortKey;
  dir: "asc" | "desc";
}

function itemName(itemId: string): string {
  return DROP_ITEMS_BY_ID.get(itemId)?.name ?? itemId;
}

function compareDrops(a: PitchedBossDrop, b: PitchedBossDrop, key: SortKey): number {
  switch (key) {
    case "date": return a.timestamp - b.timestamp;
    case "character": return a.characterName.localeCompare(b.characterName);
    case "item": return itemName(a.itemId).localeCompare(itemName(b.itemId));
    case "channel": return a.channel - b.channel;
  }
}

function sortDrops(drops: PitchedBossDrop[], sort: Sort): PitchedBossDrop[] {
  const factor = sort.dir === "asc" ? 1 : -1;
  return drops.toSorted((a, b) => {
    const primary = compareDrops(a, b, sort.key) * factor;
    // Stable tie-break: most recent first.
    return primary !== 0 ? primary : b.timestamp - a.timestamp;
  });
}

/* ------------------------------------------------------------------ */
/*  Summary stats                                                      */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

interface DropStats {
  total: number;
  thisMonth: number;
  daysSinceLast: number | null;
  topItem: { item: DropItem; count: number } | null;
}

function computeStats(drops: PitchedBossDrop[]): DropStats {
  if (drops.length === 0) return { total: 0, thisMonth: 0, daysSinceLast: null, topItem: null };

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Both sides are calendar dates read at the same offset, so the difference stays a
  // whole number of days through a DST change.
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  let latest = -Infinity;
  let thisMonth = 0;
  const counts = new Map<string, number>();

  for (const drop of drops) {
    if (drop.date.startsWith(monthPrefix)) thisMonth += 1;
    const parsed = Date.parse(`${drop.date}T00:00:00Z`);
    if (Number.isFinite(parsed) && parsed > latest) latest = parsed;
    counts.set(drop.itemId, (counts.get(drop.itemId) ?? 0) + 1);
  }

  return {
    total: drops.length,
    thisMonth,
    daysSinceLast: Number.isFinite(latest) ? Math.max(0, Math.round((todayUtc - latest) / DAY_MS)) : null,
    topItem: pickTopItem(counts),
  };
}

/**
 * The most-logged item, resolving ties by name.
 *
 * A Map iterates in insertion order, so choosing on a strict `>` alone handed ties to
 * whichever item happened to appear first in the array passed in, and re-sorting the
 * table changed that array. The name comparison makes the answer independent of the
 * caller's ordering.
 */
function pickTopItem(counts: Map<string, number>): DropStats["topItem"] {
  let top: DropStats["topItem"] = null;
  for (const [itemId, count] of counts) {
    const item = DROP_ITEMS_BY_ID.get(itemId);
    if (!item) continue;
    const beatsCount = top !== null && count > top.count;
    const winsTie = top !== null && count === top.count && item.name.localeCompare(top.item.name) < 0;
    if (top === null || beatsCount || winsTie) top = { item, count };
  }
  return top;
}

function droughtLabel(days: number | null): string {
  if (days === null) return "--";
  if (days === 0) return "Today";
  return `${days}d`;
}

/** One tinted strip holding the run of headline numbers. Separate bordered cards for
 *  each would nest a card inside the panel card. */
function StatStrip({ theme, stats }: { theme: AppTheme; stats: DropStats }) {
  // Every value sits in a row of the same height, so the labels underneath share one
  // baseline whether the value is a number or an icon beside a name.
  const valueRow: CSSProperties = {
    height: 32,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };
  const value: CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontSize: "1.5rem",
    lineHeight: 1,
    color: theme.text,
  };
  const label: CSSProperties = { color: theme.muted, marginTop: 6 };
  // Layout lives in `.pbd-stat-strip` so the mobile breakpoint can restack it; an
  // inline `display` would outrank the media query.
  return (
    <div className="pbd-stat-strip" style={{ background: theme.timerBg }}>
      <div>
        <div style={valueRow}><span style={value}>{stats.total}</span></div>
        <div className="tool-field-label" style={label}>Total drops</div>
      </div>
      <div>
        <div style={valueRow}><span style={value}>{stats.thisMonth}</span></div>
        <div className="tool-field-label" style={label}>This month</div>
      </div>
      <div>
        <div style={valueRow}><span style={value}>{droughtLabel(stats.daysSinceLast)}</span></div>
        <div className="tool-field-label" style={label}>Since last drop</div>
      </div>
      {stats.topItem && (
        <div style={{ minWidth: 0 }}>
          <div style={valueRow}>
            <ResourceItemIcon id={stats.topItem.item.itemId} size={26} alt="" />
            <span
              style={{
                ...value,
                fontSize: "1.05rem",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {stats.topItem.item.name}
            </span>
          </div>
          <div className="tool-field-label" style={label}>
            Most dropped ({stats.topItem.count})
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collection grid                                                    */
/* ------------------------------------------------------------------ */

/** Every trackable item as a tile with its count, so the drops read as a collection
 *  rather than as rows. Items not yet dropped stay visible but dimmed. */
function CollectionGrid({
  theme,
  counts,
  categoryFilter,
}: {
  theme: AppTheme;
  counts: Map<string, number>;
  categoryFilter: string;
}) {
  const categories = DROP_CATEGORIES.filter(
    (cat) => categoryFilter === "all" || cat.id === categoryFilter,
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {categories.map((cat) => (
        <div key={cat.id}>
          <div
            className="tool-field-label"
            style={{ color: theme.muted, marginBottom: "0.5rem" }}
          >
            {cat.label}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {DROP_ITEMS.filter((item) => item.category === cat.id).map((item) => {
              const count = counts.get(item.id) ?? 0;
              const owned = count > 0;
              return (
                <div
                  key={item.id}
                  title={owned ? `${item.name} — ${count}` : item.name}
                  style={{
                    position: "relative",
                    width: 52,
                    height: 52,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 10,
                    background: owned ? theme.accentSoft : theme.timerBg,
                    border: `1px solid ${owned ? theme.accent : theme.border}`,
                    opacity: owned ? 1 : 0.4,
                  }}
                >
                  <ResourceItemIcon id={item.itemId} size={32} alt={item.name} />
                  {owned && (
                    <span
                      style={{
                        position: "absolute",
                        right: -4,
                        bottom: -4,
                        minWidth: 20,
                        height: 20,
                        padding: "0 5px",
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        background: theme.accent,
                        color: theme.accentOn,
                      }}
                    >
                      {count}
                    </span>
                  )}
                  <span className="sr-only">
                    {item.name}: {count} logged
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Note cell                                                          */
/* ------------------------------------------------------------------ */

function NoteEditor({
  theme,
  initial,
  label,
  onCommit,
  onCancel,
}: {
  theme: AppTheme;
  initial: string;
  label: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  // Focus once as the editor mounts. Guarding on the flag rather than on
  // document.activeElement keeps it from stealing focus back on later renders.
  const focused = useRef(false);
  return (
    <input
      type="text"
      className="tool-input"
      defaultValue={initial}
      aria-label={label}
      ref={(el) => {
        if (el && !focused.current) {
          focused.current = true;
          el.focus();
          el.select();
        }
      }}
      onBlur={(e) => onCommit(e.target.value.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") onCancel();
      }}
      style={{
        width: "100%",
        minWidth: 140,
        padding: "3px 6px",
        background: "transparent",
        color: theme.text,
        borderColor: theme.border,
        fontSize: "0.82rem",
      }}
    />
  );
}

function NoteCell({
  theme,
  drop,
  name,
  onNote,
}: {
  theme: AppTheme;
  drop: PitchedBossDrop;
  name: string;
  onNote: (id: string, note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const label = `Note for ${name} drop`;

  if (editing) {
    return (
      <td style={tdStyle(theme)}>
        <NoteEditor
          theme={theme}
          initial={drop.note ?? ""}
          label={label}
          onCommit={(next) => {
            if (next !== (drop.note ?? "")) onNote(drop.id, next);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </td>
    );
  }

  return (
    <td style={tdStyle(theme)}>
      <button
        type="button"
        className="btn-reset pbd-note"
        aria-label={drop.note ? `${label}: ${drop.note}. Edit` : `${label}. Add`}
        onClick={() => setEditing(true)}
        style={{
          width: "100%",
          minWidth: 140,
          padding: "3px 6px",
          borderRadius: 6,
          fontSize: "0.82rem",
          color: drop.note ? theme.text : theme.muted,
          cursor: "text",
        }}
      >
        {drop.note || "Add note"}
      </button>
    </td>
  );
}

/* ------------------------------------------------------------------ */
/*  Table                                                              */
/* ------------------------------------------------------------------ */

function SortableTh({
  theme,
  label,
  sortKey,
  sort,
  onSort,
  width,
}: {
  theme: AppTheme;
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  width?: number;
}) {
  const active = sort.key === sortKey;
  const ascending = sort.dir === "asc";
  let arrow = "";
  let ariaSort: "ascending" | "descending" | "none" = "none";
  if (active) {
    arrow = ascending ? "▲" : "▼";
    ariaSort = ascending ? "ascending" : "descending";
  }
  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      style={{
        ...thStyle(theme),
        ...(width ? { width } : {}),
        padding: 0,
        whiteSpace: "nowrap",
      }}
    >
      <button
        type="button"
        className="tool-btn"
        onClick={() => onSort(sortKey)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          width: "100%",
          padding: "0.5rem 0.75rem",
          background: "none",
          border: "none",
          font: "inherit",
          fontWeight: 700,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          textAlign: "left",
          cursor: "pointer",
          userSelect: "none",
          color: active ? theme.text : theme.muted,
        }}
      >
        {label}
        {arrow && <span aria-hidden="true">{arrow}</span>}
      </button>
    </th>
  );
}

function DropLogTable({
  theme,
  drops,
  sort,
  onSort,
  onNote,
  onDelete,
}: {
  theme: AppTheme;
  drops: PitchedBossDrop[];
  sort: Sort;
  onSort: (key: SortKey) => void;
  onNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto" }}>
      <table
        className="pbd-table"
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}
      >
        <thead>
          <tr>
            <SortableTh theme={theme} label="Date" sortKey="date" sort={sort} onSort={onSort} width={110} />
            <SortableTh theme={theme} label="Item" sortKey="item" sort={sort} onSort={onSort} />
            <SortableTh theme={theme} label="Character" sortKey="character" sort={sort} onSort={onSort} />
            <SortableTh theme={theme} label="CH" sortKey="channel" sort={sort} onSort={onSort} width={64} />
            <th scope="col" style={thStyle(theme)}>Note</th>
            <th scope="col" style={{ ...thStyle(theme), width: 44 }}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {drops.map((drop, index) => {
            const item = DROP_ITEMS_BY_ID.get(drop.itemId);
            const name = item?.name ?? drop.itemId;
            return (
              <tr
                key={drop.id}
                style={{ background: index % 2 === 1 ? theme.timerBg : "transparent" }}
              >
                <td style={{ ...tdStyle(theme), color: theme.muted, whiteSpace: "nowrap" }}>
                  {formatShortDate(Date.parse(`${drop.date}T00:00:00Z`))}
                </td>
                <td style={{ ...tdStyle(theme), fontWeight: 700 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {item && <ItemIcon id={item.itemId} />}
                    {name}
                  </span>
                </td>
                <td style={tdStyle(theme)}>{drop.characterName}</td>
                <td style={{ ...tdStyle(theme), color: theme.muted }}>{drop.channel}</td>
                <NoteCell theme={theme} drop={drop} name={name} onNote={onNote} />
                <td style={tdStyle(theme)}>
                  <ConfirmButton
                    theme={theme}
                    label="✕"
                    ariaLabel={`Delete ${name} drop`}
                    title="Delete this drop?"
                    message={`This removes the ${name} logged on ${drop.date}. This can't be undone.`}
                    confirmLabel="Delete"
                    onConfirm={() => onDelete(drop.id)}
                    style={{
                      width: 28,
                      height: 28,
                      padding: 0,
                      display: "grid",
                      placeItems: "center",
                      border: "none",
                      fontSize: "0.9rem",
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Log panel header                                                   */
/* ------------------------------------------------------------------ */

/** Title block and toolbar are separate groups of matching height, so they centre
 *  against each other instead of a lone heading floating beside 34px controls. */
function LogPanelHeader({
  theme,
  shownCount,
  totalCount,
  filters,
  setFilters,
  characterNames,
  onLog,
}: {
  theme: AppTheme;
  shownCount: number;
  totalCount: number;
  filters: Filters;
  setFilters: (f: Filters) => void;
  characterNames: string[];
  onLog: () => void;
}) {
  const filtered = shownCount !== totalCount;
  return (
    <div className="pbd-log-header">
      <div className="pbd-log-title">
        <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
          Drop Log
        </h2>
        <div className="tool-field-label" style={{ color: theme.muted, marginTop: 2 }}>
          {filtered ? `${shownCount} of ${totalCount} drops` : `${totalCount} drops`}
        </div>
      </div>
      <div className="pbd-log-controls">
        <select
          className="tool-select"
          value={filters.character}
          onChange={(e) => setFilters({ ...filters, character: e.target.value })}
          style={filterSelectStyle(theme)}
          aria-label="Filter by character"
        >
          <option value="all">All characters</option>
          {characterNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          className="tool-select"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          style={filterSelectStyle(theme)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {DROP_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
        {/* Same height token as the selects. A bare `height` would be content-box
            against actionBtnBase's 1px border and render 2px taller than they do. */}
        <ActionButton
          theme={theme}
          label="+ Log a Drop"
          onClick={onLog}
          style={{ ...controlHeightStyle, padding: "0 1rem", whiteSpace: "nowrap" }}
        />
      </div>
    </div>
  );
}

function emptyMessageStyle(theme: AppTheme): CSSProperties {
  return {
    textAlign: "center",
    color: theme.muted,
    fontSize: "0.9rem",
    padding: "1.5rem 0",
  };
}

function LogPanelBody({
  theme,
  totalCount,
  drops,
  sort,
  onSort,
  onNote,
  onDelete,
}: {
  theme: AppTheme;
  totalCount: number;
  drops: PitchedBossDrop[];
  sort: Sort;
  onSort: (key: SortKey) => void;
  onNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
}) {
  if (totalCount === 0) {
    return (
      <div style={emptyMessageStyle(theme)}>
        No drops logged yet. Click “Log a Drop” to record your first one.
      </div>
    );
  }
  if (drops.length === 0) {
    return <div style={emptyMessageStyle(theme)}>No drops match the current filters.</div>;
  }
  return (
    <DropLogTable
      theme={theme}
      drops={drops}
      sort={sort}
      onSort={onSort}
      onNote={onNote}
      onDelete={onDelete}
    />
  );
}

function NoCharactersState({ theme }: { theme: AppTheme }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "2.5rem 1rem 2rem",
      }}
    >
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.25rem", opacity: 0.7 }}>
        {DROP_ITEMS.slice(0, 6).map((item) => (
          <span
            key={item.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 10,
              background: theme.timerBg,
              border: `1px solid ${theme.border}`,
            }}
          >
            <ResourceItemIcon id={item.itemId} size={30} />
          </span>
        ))}
      </div>
      <div style={{ fontWeight: 700, color: theme.text, fontSize: "1rem", marginBottom: "0.4rem" }}>
        Track your boss drops
      </div>
      <div
        style={{
          color: theme.muted,
          fontSize: "0.82rem",
          maxWidth: 360,
          lineHeight: 1.5,
          marginBottom: "1.25rem",
        }}
      >
        Add a character to start logging pitched boss items, armor boxes,
        grindstones, and other rare drops, then watch your luck stats build up
        over time.
      </div>
      <Link
        href="/characters/directory"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.5rem 1.25rem",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: "0.82rem",
          background: theme.accent,
          color: theme.accentOn,
          textDecoration: "none",
        }}
      >
        Add a character
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main workspace                                                     */
/* ------------------------------------------------------------------ */

export default function PitchedBossDropsWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();

  const [drops, setDrops] = useState<PitchedBossDrop[]>(() => readStore().drops);
  const [filters, setFilters] = useState<Filters>({ character: "all", category: "all" });
  const [sort, setSort] = useState<Sort>({ key: "date", dir: "desc" });
  const [dialogOpen, setDialogOpen] = useState(false);

  // Reads localStorage, so it stays out of the render path: without this every note
  // edit and sort click re-parsed the whole character store.
  const characters: StoredCharacterRecord[] = useMemo(
    () => (mounted ? selectCharactersList(readCharactersStore()) : []),
    [mounted],
  );

  // Filtering and sorting stay separate: only the table cares about sort order, and
  // deriving the summary from sorted rows let a column click reshuffle a tie.
  const visibleDrops = useMemo(() => applyFilters(drops, filters), [drops, filters]);
  const sortedDrops = useMemo(() => sortDrops(visibleDrops, sort), [visibleDrops, sort]);

  const characterNames = useMemo(
    () => Array.from(new Set(drops.map((d) => d.characterName))).sort((a, b) => a.localeCompare(b)),
    [drops],
  );

  const stats = useMemo(() => computeStats(visibleDrops), [visibleDrops]);

  const collectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const drop of visibleDrops) counts.set(drop.itemId, (counts.get(drop.itemId) ?? 0) + 1);
    return counts;
  }, [visibleDrops]);

  function saveDrops(next: PitchedBossDrop[]) {
    setDrops(next);
    writeStore({ version: 1, drops: next });
  }

  function handleAdd(payload: LogDropPayload) {
    const newDrop: PitchedBossDrop = {
      id: generateId(),
      characterId: String(payload.character.characterID),
      characterName: payload.character.characterName,
      itemId: payload.itemId,
      channel: payload.channel,
      date: payload.date,
      timestamp: Date.parse(`${payload.date}T00:00:00Z`),
      note: payload.note || undefined,
    };
    saveDrops([...drops, newDrop].sort((a, b) => b.timestamp - a.timestamp));
    setDialogOpen(false);
  }

  function handleNote(id: string, note: string) {
    saveDrops(drops.map((d) => (d.id === id ? { ...d, note: note || undefined } : d)));
  }

  function handleDelete(id: string) {
    saveDrops(drops.filter((d) => d.id !== id));
  }

  function handleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "date" ? "desc" : "asc" },
    );
  }

  if (!mounted) return null;

  const hasCharacters = characters.length > 0;
  const panelStyle = toolStyles(theme).sectionPanel;

  return (
    <div className="page-content">
      <style>{`
        .pbd-note:hover, .pbd-note:focus-visible { background: ${theme.timerBg}; }
        .pbd-table tbody tr:last-child td { border-bottom: none; }

        /* Keeps the columns readable rather than crushed. The wrapper's
           overflow-x: auto scrolls it on a narrow screen. */
        .pbd-table { min-width: 720px; }

        .pbd-stat-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 1.25rem 3rem;
          border-radius: 10px;
          padding: 1rem 1.25rem;
        }

        .pbd-log-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.85rem;
        }
        .pbd-log-title { margin-right: auto; }
        .pbd-log-controls { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        /* A flex item's automatic minimum size is its min-content width, and a
           select's min-content is its widest option, so a long character name
           would push the row wider than the screen instead of shrinking it. */
        .pbd-log-controls > * { min-width: 0; }

        /* Four stats ragged-wrap into an uneven second line well before they run out
           of room, so hand them an even grid instead of letting flex break them up. */
        @media (max-width: 700px) {
          .pbd-stat-strip {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
          }
        }

        /* Title above the controls, controls still side by side: stacking all three
           full-width this early wastes most of the row. The upper bound matters:
           once the row becomes a column below 560px, a flex-basis is read as the
           item's *height*, which stretched every select to 140px tall. */
        @media (max-width: 860px) and (min-width: 561px) {
          .pbd-log-controls > .tool-select { flex: 1 1 140px; }
        }

        @media (max-width: 860px) {
          .pbd-log-header { flex-direction: column; align-items: stretch; }
          .pbd-log-title { margin-right: 0; }
        }

        @media (max-width: 560px) {
          .pbd-log-controls { flex-direction: column; }
          .pbd-log-controls > * { width: 100%; }
        }
      `}</style>
      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Drop Tracker"
          description="Your rare boss drop history, charted by item and by month."
        />

        {!hasCharacters ? (
          <div className="fade-in panel-card" style={panelStyle}>
            <NoCharactersState theme={theme} />
          </div>
        ) : (
          <>
            {drops.length > 0 && (
              <div className="fade-in panel-card" style={panelStyle}>
                <StatStrip theme={theme} stats={stats} />
              </div>
            )}

            <div className="fade-in panel-card" style={panelStyle}>
              <LogPanelHeader
                theme={theme}
                shownCount={visibleDrops.length}
                totalCount={drops.length}
                filters={filters}
                setFilters={setFilters}
                characterNames={characterNames}
                onLog={() => setDialogOpen(true)}
              />
              <LogPanelBody
                theme={theme}
                totalCount={drops.length}
                drops={sortedDrops}
                sort={sort}
                onSort={handleSort}
                onNote={handleNote}
                onDelete={handleDelete}
              />
            </div>

            {drops.length > 0 && (
              <div className="fade-in panel-card" style={panelStyle}>
                <h2 className="tool-panel-title" style={{ color: theme.text }}>Collection</h2>
                <CollectionGrid
                  theme={theme}
                  counts={collectionCounts}
                  categoryFilter={filters.category}
                />
              </div>
            )}

            {/* Unsorted, so a column click can't reorder the chart's legend either. */}
            {visibleDrops.length > 0 && (
              <PitchedBossCharts theme={theme} drops={visibleDrops} />
            )}
          </>
        )}
      </div>

      {dialogOpen && (
        <LogDropDialog
          theme={theme}
          characters={characters}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleAdd}
        />
      )}
    </div>
  );
}

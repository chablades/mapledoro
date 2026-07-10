"use client";

import { useState } from "react";
import { useMounted } from "../../../lib/useMounted";
import type { CSSProperties } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ItemIcon } from "./pitched-boss-ui";
import { panelStyle } from "./pitched-boss-styles";
import { ItemIcon as ResourceItemIcon } from "../../../components/ResourceImage";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import { DROP_CATEGORIES, DROP_ITEMS, DROP_ITEMS_BY_ID } from "./pitched-items";
import LogDropDialog, { type LogDropPayload } from "./LogDropDialog";
import { ActionButton } from "../shared-ui";

const PitchedBossCharts = dynamic(() => import("./PitchedBossCharts"), {
  ssr: false,
});

/* ------------------------------------------------------------------ */
/*  Types & storage                                                    */
/* ------------------------------------------------------------------ */

interface PitchedBossDrop {
  id: string;
  characterId: string;
  characterName: string;
  itemId: string;
  channel: number;
  date: string; // YYYY-MM-DD
  timestamp: number;
  note?: string;
}

interface PitchedBossDropsStore {
  version: 1;
  drops: PitchedBossDrop[];
}

function generateId(): string {
  return crypto.randomUUID();
}

function readStore(): PitchedBossDropsStore {
  if (typeof window === "undefined") return { version: 1, drops: [] };
  const stored = readGlobalTool<PitchedBossDropsStore>("pitchedBossDrops");
  if (stored?.version === 1 && Array.isArray(stored.drops)) return stored;
  return { version: 1, drops: [] };
}

function writeStore(store: PitchedBossDropsStore): void {
  writeGlobalTool("pitchedBossDrops", store);
}

/* ------------------------------------------------------------------ */
/*  Inline-style helpers                                               */
/* ------------------------------------------------------------------ */

// Colors + context sizing; static settings come from the `.tool-select` class.
function filterSelectStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.timerBg,
    color: theme.text,
    borderColor: theme.border,
    height: 34,
    boxSizing: "border-box",
  };
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
  };
}

/* ------------------------------------------------------------------ */
/*  Filters                                                            */
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

/* ------------------------------------------------------------------ */
/*  Sorting                                                            */
/* ------------------------------------------------------------------ */

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
/*  Sub-components                                                     */
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
  let arrow = "";
  if (active) arrow = sort.dir === "asc" ? " ▲" : " ▼";
  return (
    <th
      role="button"
      tabIndex={0}
      onClick={() => onSort(sortKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(sortKey);
        }
      }}
      style={{
        ...thStyle(theme),
        ...(width ? { width } : {}),
        cursor: "pointer",
        userSelect: "none",
        color: active ? theme.text : theme.muted,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {arrow}
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
    <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <thead>
          <tr
            style={{
              borderBottom: `2px solid ${theme.border}`,
              position: "sticky",
              top: 0,
              background: theme.panel,
            }}
          >
            <SortableTh theme={theme} label="Date" sortKey="date" sort={sort} onSort={onSort} />
            <SortableTh theme={theme} label="Character" sortKey="character" sort={sort} onSort={onSort} />
            <SortableTh theme={theme} label="Item" sortKey="item" sort={sort} onSort={onSort} />
            <SortableTh theme={theme} label="CH" sortKey="channel" sort={sort} onSort={onSort} width={50} />
            <th style={thStyle(theme)}>Note</th>
            <th style={{ ...thStyle(theme), width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {drops.map((drop) => {
            const item = DROP_ITEMS_BY_ID.get(drop.itemId);
            return (
              <tr key={drop.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={tdStyle(theme)}>{drop.date}</td>
                <td style={tdStyle(theme)}>{drop.characterName}</td>
                <td style={{ ...tdStyle(theme), fontWeight: 600 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    {item && <ItemIcon id={item.itemId} />}
                    {item?.name ?? drop.itemId}
                  </span>
                </td>
                <td style={tdStyle(theme)}>{drop.channel}</td>
                <td style={tdStyle(theme)}>
                  <input
                    type="text"
                    defaultValue={drop.note ?? ""}
                    placeholder="Add note…"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (drop.note ?? "")) onNote(drop.id, v);
                    }}
                    className="tool-input"
                    style={{
                      width: "100%",
                      minWidth: 120,
                      padding: "3px 6px",
                      background: "transparent",
                      color: theme.text,
                      borderColor: theme.border,
                      fontSize: "0.8rem",
                    }}
                  />
                </td>
                <td style={tdStyle(theme)}>
                  <button
                    onClick={() => onDelete(drop.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: theme.muted,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                    title="Delete drop"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilterBar({
  theme,
  filters,
  setFilters,
  characterNames,
  onLog,
}: {
  theme: AppTheme;
  filters: Filters;
  setFilters: (f: Filters) => void;
  characterNames: string[];
  onLog: () => void;
}) {
  return (
    <div
      className="pbd-filter-bar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "0.85rem",
      }}
    >
      <div style={{ fontWeight: 700, color: theme.text, fontSize: "1rem", marginRight: "auto" }}>
        Drop Log
      </div>
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
      <ActionButton
        theme={theme}
        label="+ Log a Drop"
        onClick={onLog}
        style={{ height: 34, padding: "0 1rem", whiteSpace: "nowrap" }}
      />
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
      <div style={{ fontWeight: 700, color: theme.text, fontSize: "1.05rem", marginBottom: "0.4rem" }}>
        Track your boss drops
      </div>
      <div
        style={{
          color: theme.muted,
          fontSize: "0.85rem",
          maxWidth: 360,
          lineHeight: 1.5,
          marginBottom: "1.25rem",
        }}
      >
        Add a character to start logging pitched boss items, armor boxes,
        grindstones, and other rare drops — then watch your luck stats build up
        over time.
      </div>
      <Link
        href="/characters"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.5rem 1.25rem",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: "0.85rem",
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

  const [drops, setDrops] = useState<PitchedBossDrop[]>(() =>
    typeof window === "undefined" ? [] : readStore().drops,
  );
  const [filters, setFilters] = useState<Filters>({ character: "all", category: "all" });
  const [sort, setSort] = useState<Sort>({ key: "date", dir: "desc" });
  const [dialogOpen, setDialogOpen] = useState(false);

  const characters: StoredCharacterRecord[] = mounted
    ? selectCharactersList(readCharactersStore())
    : [];

  function saveDrops(next: PitchedBossDrop[]) {
    setDrops(next);
    writeStore({ version: 1, drops: next });
  }

  function handleAdd(payload: LogDropPayload) {
    const char = characters.find((c) => c.characterName === payload.characterName);
    if (!char) return;
    const newDrop: PitchedBossDrop = {
      id: generateId(),
      characterId: String(char.characterID),
      characterName: char.characterName,
      itemId: payload.itemId,
      channel: payload.channel,
      date: payload.date,
      timestamp: new Date(payload.date).getTime(),
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

  const filteredDrops = sortDrops(applyFilters(drops, filters), sort);
  const characterNames = Array.from(new Set(drops.map((d) => d.characterName))).sort((a, b) =>
    a.localeCompare(b),
  );
  const hasCharacters = characters.length > 0;

  return (
    <div className="page-content">
      <style>{`
        @media (max-width: 860px) {
          .pbd-filter-bar { flex-direction: column; align-items: stretch; }
          .pbd-filter-bar > * { width: 100%; margin-right: 0 !important; }
        }
      `}</style>
      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Drop Tracker"
          description="Log rare boss drops as they happen — pitched items, armor boxes, grindstones, and more — to build your drop history and analytics."
        />

        {!hasCharacters ? (
          <div style={panelStyle(theme)}>
            <NoCharactersState theme={theme} />
          </div>
        ) : (
          <>
            <div style={panelStyle(theme)}>
              <FilterBar
                theme={theme}
                filters={filters}
                setFilters={setFilters}
                characterNames={characterNames}
                onLog={() => setDialogOpen(true)}
              />
              <LogPanelBody
                theme={theme}
                totalCount={drops.length}
                drops={filteredDrops}
                sort={sort}
                onSort={handleSort}
                onNote={handleNote}
                onDelete={handleDelete}
              />
            </div>

            {filteredDrops.length > 0 && (
              <PitchedBossCharts theme={theme} drops={filteredDrops} />
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

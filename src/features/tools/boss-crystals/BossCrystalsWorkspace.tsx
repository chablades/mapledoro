"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import {
  BOSSES,
  BOSS_GROUPS,
  SHARED_INDICES,
  PRESETS,
  formatMeso,
} from "./bosses";
import { generateXlsx, downloadBlob, colLetter, type Cell, type FormulaCell } from "./xlsx-export";

// -- Types --------------------------------------------------------------------

interface BossRow {
  checked: boolean;
  partySize: number;
}

interface CharacterColumn {
  name: string;
  bosses: BossRow[];
}

// -- Helpers ------------------------------------------------------------------

function createColumn(preset: string): CharacterColumn {
  return {
    name: "",
    bosses: BOSSES.map((b) => ({
      checked: !!(b.preset && b.preset.includes(preset)),
      partySize: 1,
    })),
  };
}

function getDisabledSet(bosses: BossRow[]): Set<number> {
  const disabled = new Set<number>();
  for (let i = 0; i < bosses.length; i++) {
    if (bosses[i].checked) {
      for (const idx of SHARED_INDICES[i]) disabled.add(idx);
    }
  }
  return disabled;
}

function calcCharacterIncome(
  bosses: BossRow[],
  server: string,
): { meso: number; crystals: number } {
  const mult = server === "heroic" ? 1 : 5;
  const values: number[] = [];

  for (let i = 0; i < bosses.length; i++) {
    const row = bosses[i];
    if (!row.checked) continue;
    values.push(BOSSES[i].meso / row.partySize);
  }

  // Keep top 14 boss crystals
  values.sort((a, b) => b - a);
  const top14 = values.slice(0, 14);
  let total = 0;
  for (const v of top14) {
    total += v / mult;
  }

  return { meso: Math.floor(total), crystals: top14.length };
}

// -- Storage ------------------------------------------------------------------

const STORAGE_KEY = "boss-crystals-v2";

interface SavedState {
  server: string;
  columns: CharacterColumn[];
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(server: string, columns: CharacterColumn[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ server, columns }));
}

function restoreColumns(saved: SavedState): CharacterColumn[] {
  return saved.columns.map((col) => ({
    name: col.name,
    bosses: BOSSES.map((_, i) => {
      const s = col.bosses[i];
      return s ? { checked: s.checked, partySize: s.partySize } : { checked: false, partySize: 1 };
    }),
  }));
}

// -- Component ----------------------------------------------------------------

export default function BossCrystalsWorkspace({ theme }: { theme: AppTheme }) {
  const [server, setServer] = useState("heroic");
  const [columns, setColumns] = useState<CharacterColumn[]>(() => [createColumn("")]);
  const [loaded, setLoaded] = useState(false);
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);
  const dragSrcCol = useRef<number | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setServer(saved.server);
      setColumns(restoreColumns(saved));
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (loaded) saveState(server, columns);
  }, [server, columns, loaded]);

  const addColumn = useCallback((preset: string) => {
    setColumns((prev) => [...prev, createColumn(preset)]);
  }, []);

  const deleteColumn = useCallback((idx: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const cloneColumn = useCallback((idx: number) => {
    setColumns((prev) => {
      const col = prev[idx];
      const cloned: CharacterColumn = {
        name: col.name,
        bosses: col.bosses.map((b) => ({ ...b })),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, cloned);
      return next;
    });
  }, []);

  const reorderColumns = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const setCharName = useCallback((colIdx: number, name: string) => {
    setColumns((prev) =>
      prev.map((c, i) => (i === colIdx ? { ...c, name } : c)),
    );
  }, []);

  const toggleBoss = useCallback((colIdx: number, bossIdx: number) => {
    setColumns((prev) =>
      prev.map((col, ci) => {
        if (ci !== colIdx) return col;
        return {
          ...col,
          bosses: col.bosses.map((b, bi) =>
            bi === bossIdx ? { ...b, checked: !b.checked } : b,
          ),
        };
      }),
    );
  }, []);

  const updatePartySize = useCallback(
    (colIdx: number, bossIdx: number, val: number) => {
      setColumns((prev) =>
        prev.map((col, ci) => {
          if (ci !== colIdx) return col;
          const bosses = col.bosses.map((b, bi) =>
            bi === bossIdx ? { ...b, partySize: val } : b,
          );
          return { ...col, bosses };
        }),
      );
    },
    [],
  );

  const clearData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setServer("heroic");
    setColumns([createColumn("")]);
  }, []);

  const exportXlsx = useCallback(() => {
    const mult = server === "heroic" ? 1 : 5;
    const f = (formula: string, array?: boolean): FormulaCell => ({ formula, array });
    const rows: Cell[][] = [];

    // Row geometry (1-indexed in spreadsheet)
    const firstDataRow = 2;
    const lastBossRow = firstDataRow + BOSSES.length - 1;

    // -- Header --
    rows.push([
      "Boss",
      "Mesos",
      ...columns.map((c, i) => c.name || `Character ${i + 1}`),
    ]);

    // -- Boss rows --
    for (let bi = 0; bi < BOSSES.length; bi++) {
      const boss = BOSSES[bi];
      const row: Cell[] = [boss.name, Math.floor(boss.meso / mult)];
      for (const col of columns) {
        const br = col.bosses[bi];
        row.push(br.checked ? br.partySize : null);
      }
      rows.push(row);
    }

    // -- Blank row --
    rows.push([]);

    // -- Character Total (top 14 crystals: meso / party_size) --
    const charTotalRowIdx = rows.length;
    {
      const ks = "{1,2,3,4,5,6,7,8,9,10,11,12,13,14}";
      const row: Cell[] = ["Character Total", null];
      for (let ci = 0; ci < columns.length; ci++) {
        const cc = colLetter(2 + ci);
        const range = `${cc}${firstDataRow}:${cc}${lastBossRow}`;
        const mesos = `B${firstDataRow}:B${lastBossRow}`;
        row.push(f(`SUM(LARGE(IF(${range}<>"",${mesos}/${range},0),${ks}))`, true));
      }
      rows.push(row);
    }

    // -- Blank row --
    rows.push([]);

    // -- Weekly Income Summary --
    rows.push(["Weekly Income Summary", null]);
    rows.push([]);

    rows.push(["Bossing", null]);
    for (let ci = 0; ci < columns.length; ci++) {
      const cc = colLetter(2 + ci);
      const charName = columns[ci].name || `Character ${ci + 1}`;
      const income = calcCharacterIncome(columns[ci].bosses, server);
      rows.push([
        charName,
        f(`${cc}${charTotalRowIdx + 1}`),
        `Crystals: ${income.crystals}`,
      ]);
    }

    rows.push([]);

    // Grand total = sum of all character totals
    {
      const charTotalCells = columns
        .map((_, ci) => `${colLetter(2 + ci)}${charTotalRowIdx + 1}`)
        .join("+");
      let tc = 0;
      for (const col of columns) {
        tc += calcCharacterIncome(col.bosses, server).crystals;
      }
      rows.push([
        "Total",
        f(charTotalCells),
        `Crystals: ${tc} / 180`,
      ]);
    }

    const colWidths = [34, 22, ...columns.map(() => 22)];
    const xlsx = generateXlsx([{ name: "Boss Crystals", rows, colWidths }]);
    downloadBlob(xlsx, "boss-crystals.xlsx");
  }, [server, columns]);

  // Totals
  let totalMeso = 0;
  let totalCrystals = 0;
  const charIncomes = columns.map((col) => {
    const income = calcCharacterIncome(col.bosses, server);
    totalMeso += income.meso;
    totalCrystals += income.crystals;
    return income;
  });

  const serverMult = server === "heroic" ? 1 : 5;

  const inputStyle: React.CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    padding: "4px 6px",
    color: theme.text,
    fontFamily: "'Nunito', sans-serif",
    fontSize: "0.78rem",
    fontWeight: 700,
    width: "42px",
    textAlign: "center",
    outline: "none",
  };

  const checkboxStyle = (checked: boolean, disabled: boolean): React.CSSProperties => ({
    width: "18px",
    height: "18px",
    borderRadius: "5px",
    flexShrink: 0,
    border: `2px solid ${disabled ? theme.border : checked ? theme.accent : theme.border}`,
    background: disabled
      ? theme.timerBg
      : checked
        ? theme.accent
        : "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s",
    opacity: disabled ? 0.4 : 1,
  });

  return (
    <>
      <style>{`
        .bc-row-hover:hover { background: ${theme.accentSoft} !important; }
        .bc-btn { transition: background 0.15s, transform 0.1s; cursor: pointer; user-select: none; }
        .bc-btn:hover { transform: translateY(-1px); }
        .bc-btn:active { transform: translateY(0); }
        .bc-col-drag { cursor: grab; }
        .bc-col-drag:active { cursor: grabbing; }
        @media (max-width: 860px) {
          .bc-main { padding: 1rem !important; }
          .bc-sticky-bar { font-size: 0.72rem !important; padding: 0.6rem 0.75rem !important; }
        }
      `}</style>

      <div
        className="bc-main"
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "1.25rem" }}>
            <Link
              href="/tools"
              style={{
                fontSize: "0.78rem",
                fontWeight: 800,
                color: theme.accent,
                textDecoration: "none",
              }}
            >
              ← Back to Tools
            </Link>
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.5rem",
                color: theme.text,
                marginTop: "0.5rem",
              }}
            >
              Boss Crystal Calculator
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: theme.muted,
                fontWeight: 600,
                marginTop: "0.15rem",
                lineHeight: 1.5,
              }}
            >
              Select bosses and set party size (1-6). Supports GMS (14 crystals/char).
            </div>
          </div>

          {/* Controls panel */}
          <div
            className="fade-in"
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "18px",
              padding: "1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            {/* Server toggle */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                background: theme.timerBg,
                borderRadius: "10px",
                padding: "3px",
                border: `1px solid ${theme.border}`,
              }}
            >
              {["heroic", "interactive"].map((s) => (
                <div
                  key={s}
                  className="bc-btn"
                  onClick={() => setServer(s)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: server === s ? theme.accentText : theme.muted,
                    background: server === s ? theme.accentSoft : "transparent",
                  }}
                >
                  {s === "heroic" ? "Heroic" : "Interactive"}
                </div>
              ))}
            </div>

            <div
              style={{
                width: "1px",
                height: "24px",
                background: theme.border,
              }}
            />

            {/* Add column presets */}
            {PRESETS.map((p) => (
              <div
                key={p.key}
                className="bc-btn"
                onClick={() => addColumn(p.key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: theme.accentText,
                  background: theme.accentSoft,
                  border: `1px solid ${theme.border}`,
                }}
              >
                + {p.label}
              </div>
            ))}

            <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
              <div
                className="bc-btn"
                onClick={clearData}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: "#e05a5a",
                  background: "transparent",
                  border: `1px solid #e05a5a33`,
                }}
              >
                Clear All
              </div>
              <div
                className="bc-btn"
                onClick={exportXlsx}
                style={{
                  padding: "6px 14px",
                  borderRadius: "10px",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: theme.accentText,
                  background: "transparent",
                  border: `1px solid ${theme.border}`,
                }}
              >
                Export
              </div>
            </div>
          </div>

          {/* Sticky Income Summary Bar */}
          <div
            className="fade-in bc-sticky-bar"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "14px",
              padding: "0.75rem 1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.75rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            {/* Grand total */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "0.9rem",
                  color: theme.text,
                }}
              >
                Weekly:
              </span>
              <span
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "1.1rem",
                  color: theme.accent,
                }}
              >
                {formatMeso(totalMeso)}
              </span>
            </div>

            <div style={{ width: "1px", height: "24px", background: theme.border }} />

            {/* Per-character crystal pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {columns.map((col, ci) => (
                <div
                  key={ci}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 10px",
                    borderRadius: "8px",
                    background: theme.timerBg,
                    border: `1px solid ${theme.border}`,
                    fontSize: "0.73rem",
                    fontWeight: 700,
                    color: theme.text,
                  }}
                >
                  <span style={{ maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {col.name || `Char ${ci + 1}`}
                  </span>
                  <span style={{ color: charIncomes[ci].crystals >= 14 ? theme.accent : theme.muted }}>
                    {charIncomes[ci].crystals}/14
                  </span>
                </div>
              ))}
            </div>

            {/* Total crystals badge */}
            <div
              style={{
                marginLeft: "auto",
                padding: "4px 12px",
                borderRadius: "10px",
                background: totalCrystals > 180 ? "#e05a5a22" : theme.accentSoft,
                fontSize: "0.76rem",
                fontWeight: 800,
                color: totalCrystals > 180 ? "#e05a5a" : theme.accentText,
              }}
            >
              {totalCrystals}/180
            </div>
          </div>

          {/* Boss table */}
          <div
            className="fade-in"
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "18px",
              overflow: "hidden",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: `${200 + columns.length * 140}px`,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 2,
                        background: theme.panel,
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        fontFamily: "'Fredoka One', cursive",
                        fontSize: "0.85rem",
                        color: theme.text,
                        borderBottom: `1px solid ${theme.border}`,
                        minWidth: "200px",
                      }}
                    >
                      Boss
                    </th>
                    <th
                      style={{
                        padding: "0.75rem 0.75rem",
                        textAlign: "right",
                        fontFamily: "'Fredoka One', cursive",
                        fontSize: "0.85rem",
                        color: theme.text,
                        borderBottom: `1px solid ${theme.border}`,
                        minWidth: "120px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Mesos
                    </th>
                    {columns.map((col, ci) => (
                      <th
                        key={ci}
                        className="bc-col-drag"
                        draggable
                        onDragStart={() => { dragSrcCol.current = ci; }}
                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(ci); }}
                        onDragLeave={() => { if (dragOverCol === ci) setDragOverCol(null); }}
                        onDrop={() => {
                          if (dragSrcCol.current !== null) reorderColumns(dragSrcCol.current, ci);
                          dragSrcCol.current = null;
                          setDragOverCol(null);
                        }}
                        onDragEnd={() => { dragSrcCol.current = null; setDragOverCol(null); }}
                        style={{
                          padding: "0.5rem 0.5rem",
                          textAlign: "center",
                          borderBottom: `1px solid ${theme.border}`,
                          borderLeft: `1px solid ${dragOverCol === ci ? theme.accent : theme.border}`,
                          minWidth: "130px",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg
                            className="bc-btn"
                            onClick={() => cloneColumn(ci)}
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            fill={theme.muted}
                            style={{ flexShrink: 0 }}
                          >
                            <title>Clone character</title>
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                          </svg>
                          <input
                            type="text"
                            placeholder={`Char ${ci + 1}`}
                            maxLength={14}
                            value={col.name}
                            onChange={(e) => setCharName(ci, e.target.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            draggable={false}
                            style={{
                              background: theme.timerBg,
                              border: `1px solid ${theme.border}`,
                              borderRadius: "8px",
                              padding: "5px 8px",
                              color: theme.text,
                              fontFamily: "'Nunito', sans-serif",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              flex: 1,
                              minWidth: 0,
                              textAlign: "center",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                          <div
                            className="bc-btn"
                            onClick={() => deleteColumn(ci)}
                            title="Delete character"
                            style={{
                              padding: "2px 5px",
                              borderRadius: "6px",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              color: "#e05a5a",
                              lineHeight: 1,
                              flexShrink: 0,
                            }}
                          >
                            ✕
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                  // Compute per-column disabled sets
                  const disabledSets = columns.map((col) => getDisabledSet(col.bosses));

                  // Compute per-boss-group striping
                  let groupIdx = 0;
                  let prevGroup = "";
                  return BOSSES.map((boss, bi) => {
                    const group = BOSS_GROUPS.find((g) => g.bossIndices.includes(bi));
                    const groupLabel = group ? group.label : boss.name;
                    if (groupLabel !== prevGroup) {
                      if (prevGroup !== "") groupIdx++;
                      prevGroup = groupLabel;
                    }
                    const striped = groupIdx % 2 !== 0;
                    const rowBg = striped ? theme.timerBg : "transparent";
                    return (
                      <tr key={boss.name}>
                        <td
                          style={{
                            position: "sticky",
                            left: 0,
                            zIndex: 1,
                            background: striped ? theme.timerBg : theme.panel,
                            padding: "0.45rem 1rem",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: theme.text,
                            whiteSpace: "nowrap",
                            borderBottom: `1px solid ${theme.border}`,
                          }}
                        >
                          {boss.name}
                        </td>
                        <td
                          style={{
                            padding: "0.45rem 0.75rem",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: theme.muted,
                            textAlign: "right",
                            whiteSpace: "nowrap",
                            background: rowBg,
                            borderBottom: `1px solid ${theme.border}`,
                          }}
                        >
                          {formatMeso(boss.meso / serverMult)}
                        </td>
                        {columns.map((col, ci) => {
                          const row = col.bosses[bi];
                          const disabled = disabledSets[ci].has(bi);
                          return (
                            <td
                              key={ci}
                              className="bc-row-hover"
                              style={{
                                padding: "0.35rem 0.5rem",
                                textAlign: "center",
                                background: rowBg,
                                borderBottom: `1px solid ${theme.border}`,
                                borderLeft: `1px solid ${theme.border}`,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                }}
                              >
                                <div
                                  style={checkboxStyle(row.checked, disabled)}
                                  onClick={() => {
                                    if (!disabled) toggleBoss(ci, bi);
                                  }}
                                >
                                  {row.checked && !disabled && (
                                    <span
                                      style={{
                                        color: "#fff",
                                        fontSize: "0.6rem",
                                        fontWeight: 900,
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  min={1}
                                  max={boss.name === "Lotus (Extreme)" ? 2 : 6}
                                  value={row.partySize}
                                  onChange={(e) => {
                                    const max =
                                      boss.name === "Lotus (Extreme)" ? 2 : 6;
                                    let v = parseInt(e.target.value) || 1;
                                    if (v < 1) v = 1;
                                    if (v > max) v = max;
                                    updatePartySize(ci, bi, v);
                                  }}
                                  style={inputStyle}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results panel */}
          <div
            className="fade-in"
            style={{
              background: theme.panel,
              border: `1px solid ${theme.border}`,
              borderRadius: "18px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "1rem 1.25rem 0.8rem",
                borderBottom: `1px solid ${theme.border}`,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "1.15rem",
                  color: theme.text,
                }}
              >
                Weekly Income
              </span>
            </div>

            <div style={{ padding: "1rem 1.25rem" }}>
              {/* Per-character income */}
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  color: theme.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                }}
              >
                Bossing
              </div>
              {columns.map((col, ci) => (
                <div
                  key={ci}
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: theme.text,
                    padding: "4px 0",
                  }}
                >
                  {col.name || `Unnamed character (column ${ci + 1})`}:{" "}
                  <span style={{ color: theme.accent }}>
                    {formatMeso(charIncomes[ci].meso)} Mesos
                  </span>
                  <span style={{ color: theme.muted, fontSize: "0.78rem" }}>
                    {" "}
                    [ {charIncomes[ci].crystals} / 14 ]
                  </span>
                </div>
              ))}

              {/* Total */}
              <div
                style={{
                  marginTop: "1.25rem",
                  paddingTop: "1rem",
                  borderTop: `1px solid ${theme.border}`,
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "1.1rem",
                    color: theme.text,
                  }}
                >
                  Total:
                </span>
                <span
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "1.3rem",
                    color: theme.accent,
                  }}
                >
                  {formatMeso(totalMeso)} Mesos
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    color: totalCrystals > 180 ? "#e05a5a" : theme.muted,
                  }}
                >
                  [ Crystals: {totalCrystals} / 180 ]
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

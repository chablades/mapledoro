"use client";

import { useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import { WikiAttribution } from "../../../components/WikiAttribution";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import { PITCHED_BOSS_ITEMS, PITCHED_ITEMS_BY_ID } from "./pitched-items";

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
}

interface PitchedBossDropsStore {
  version: 1;
  drops: PitchedBossDrop[];
}

const STORAGE_KEY = "pitched-boss-drops-v1";

function generateId(): string {
  return crypto.randomUUID();
}

function readStore(): PitchedBossDropsStore {
  if (typeof window === "undefined") return { version: 1, drops: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, drops: [] };
    const parsed = JSON.parse(raw);
    if (parsed?.version === 1 && Array.isArray(parsed.drops)) {
      return parsed as PitchedBossDropsStore;
    }
  } catch {
    /* ignore */
  }
  return { version: 1, drops: [] };
}

function writeStore(store: PitchedBossDropsStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/*  Chart helpers                                                      */
/* ------------------------------------------------------------------ */

const CHART_COLORS = [
  "#e07840",
  "#40b040",
  "#7c6aff",
  "#e05a5a",
  "#40b8ff",
  "#d4a02a",
  "#d460a0",
  "#60a060",
  "#a090dd",
  "#c08060",
];

function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

/* ------------------------------------------------------------------ */
/*  Inline-style helpers                                               */
/* ------------------------------------------------------------------ */

function fieldStyle(theme: AppTheme): CSSProperties {
  return {
    width: "100%",
    padding: "0.5rem 0.6rem",
    background: theme.timerBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    fontSize: "0.85rem",
    height: 38,
    boxSizing: "border-box",
  };
}

function thStyle(theme: AppTheme): CSSProperties {
  return {
    textAlign: "left" as const,
    padding: "0.5rem 0.75rem",
    color: theme.muted,
    fontWeight: 700,
    fontSize: "0.72rem",
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

function panelStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: "1.25rem",
    marginBottom: "1.5rem",
  };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ItemIcon({ src }: { src: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      <img
        src={src}
        alt=""
        style={{ imageRendering: "pixelated" }}
      />
    </span>
  );
}

function DropCountBarChart({
  theme,
  drops,
}: {
  theme: AppTheme;
  drops: PitchedBossDrop[];
}) {
  const counts = new Map<string, number>();
  for (const drop of drops) {
    counts.set(drop.itemId, (counts.get(drop.itemId) ?? 0) + 1);
  }

  const entries = Array.from(counts.entries())
    .map(([itemId, count]) => ({
      item: PITCHED_ITEMS_BY_ID.get(itemId),
      count,
    }))
    .filter((e): e is { item: NonNullable<typeof e.item>; count: number } =>
      Boolean(e.item),
    )
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div style={panelStyle(theme)}>
      <div
        style={{
          fontWeight: 700,
          color: theme.text,
          marginBottom: "1rem",
          fontSize: "0.95rem",
        }}
      >
        Drops by Item
      </div>
      {entries.map(({ item, count }, i) => (
        <div key={item.id} style={{ marginBottom: "0.6rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.78rem",
              marginBottom: 3,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: theme.text, fontWeight: 600 }}>
              <ItemIcon src={item.icon} />
              {item.name}
            </span>
            <span style={{ color: theme.muted, fontWeight: 700 }}>{count}</span>
          </div>
          <div
            style={{
              width: "100%",
              height: 18,
              background: theme.timerBg,
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(count / maxCount) * 100}%`,
                minWidth: 4,
                height: "100%",
                background: CHART_COLORS[i % CHART_COLORS.length],
                borderRadius: 6,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyTimeSeriesChart({
  theme,
  drops,
}: {
  theme: AppTheme;
  drops: PitchedBossDrop[];
}) {
  const months = getLastNMonths(6);
  const labels = months.map(formatMonth);
  const charNames = Array.from(new Set(drops.map((d) => d.characterName)));

  const datasets = charNames.map((name, i) => ({
    label: name,
    data: months.map(
      (month) => drops.filter((d) => d.characterName === name && d.date.startsWith(month)).length,
    ),
    borderColor: CHART_COLORS[i % CHART_COLORS.length],
    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
    tension: 0.25,
    pointRadius: 4,
    pointHoverRadius: 6,
    borderWidth: 2.5,
  }));

  const chartData = { labels, datasets };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom" as const, labels: { color: theme.muted, font: { size: 12, weight: 600 as const } } },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { ticks: { color: theme.muted }, grid: { color: theme.border } },
      y: {
        beginAtZero: true,
        ticks: { color: theme.muted, stepSize: 1 },
        grid: { color: theme.border },
      },
    },
  };

  return (
    <div style={panelStyle(theme)}>
      <div style={{ fontWeight: 700, color: theme.text, marginBottom: "1rem", fontSize: "0.95rem" }}>
        Monthly Drops by Character
      </div>
      <Line data={chartData} options={options} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main workspace                                                     */
/* ------------------------------------------------------------------ */

const emptySubscribe = () => () => {};

export default function PitchedBossDropsWorkspace({
  theme,
}: {
  theme: AppTheme;
}) {
  // useSyncExternalStore avoids setState-in-effect for the SSR/client gate
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Lazy initialization reads localStorage only on the client
  const [drops, setDrops] = useState<PitchedBossDrop[]>(() =>
    typeof window === "undefined" ? [] : readStore().drops,
  );
  // Read characters fresh each render so newly added characters appear immediately
  const characters: StoredCharacterRecord[] = mounted
    ? selectCharactersList(readCharactersStore())
    : [];

  // Form state
  const [selectedCharId, setSelectedCharId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [channel, setChannel] = useState("");
  const [date, setDate] = useState(() =>
    typeof window === "undefined" ? "" : todayStr(),
  );

  function saveDrops(next: PitchedBossDrop[]) {
    setDrops(next);
    writeStore({ version: 1, drops: next });
  }

  function handleAdd() {
    if (!selectedCharId || !selectedItemId || !channel || !date) return;
    const char = characters.find(
      (c) => c.characterName === selectedCharId,
    );
    if (!char) return;

    const newDrop: PitchedBossDrop = {
      id: generateId(),
      characterId: String(char.characterID),
      characterName: char.characterName,
      itemId: selectedItemId,
      channel: parseInt(channel, 10),
      date,
      timestamp: new Date(date).getTime(),
    };

    const next = [...drops, newDrop].sort((a, b) => b.timestamp - a.timestamp);
    saveDrops(next);
    setSelectedItemId("");
    setChannel("");
  }

  function handleDelete(id: string) {
    saveDrops(drops.filter((d) => d.id !== id));
  }

  if (!mounted) return null;

  const sortedDrops = [...drops].sort((a, b) => b.timestamp - a.timestamp);
  const formReady =
    selectedCharId !== "" &&
    selectedItemId !== "" &&
    channel !== "" &&
    date !== "";

  return (
    <div
      className="pbd-main"
      style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <ToolHeader
          theme={theme}
          title="Pitched Boss Drop Tracker"
          description="Select a character and item, then log each drop as it happens to build your drop history and analytics."
        />
        {/* ── Add drop form ── */}
        <div style={panelStyle(theme)}>
          <div
            style={{
              fontWeight: 700,
              color: theme.text,
              marginBottom: "1rem",
              fontSize: "1rem",
            }}
          >
            Log a Drop
          </div>

          {characters.length === 0 ? (
            <div style={{ color: theme.muted, fontSize: "0.85rem" }}>
              No characters added yet.{" "}
              <a href="/characters" style={{ color: theme.accent }}>
                Add characters
              </a>{" "}
              to start tracking drops.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                alignItems: "flex-end",
              }}
            >
              <div style={{ flex: "1 1 180px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: theme.muted,
                    marginBottom: 4,
                  }}
                >
                  Character
                </label>
                <select
                  value={selectedCharId}
                  onChange={(e) => setSelectedCharId(e.target.value)}
                  style={fieldStyle(theme)}
                >
                  <option value="">Select character…</option>
                  {characters.map((c) => (
                    <option key={c.characterName} value={c.characterName}>
                      {c.characterName} (Lv.{c.level} {c.jobName})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: "1 1 220px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: theme.muted,
                    marginBottom: 4,
                  }}
                >
                  Item Dropped
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  style={fieldStyle(theme)}
                >
                  <option value="">Select item…</option>
                  {PITCHED_BOSS_ITEMS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.boss})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: "0 0 90px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: theme.muted,
                    marginBottom: 4,
                  }}
                >
                  Channel
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="CH"
                  style={fieldStyle(theme)}
                />
              </div>

              <div style={{ flex: "0 0 150px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: theme.muted,
                    marginBottom: 4,
                  }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={fieldStyle(theme)}
                />
              </div>

              <button
                onClick={handleAdd}
                disabled={!formReady}
                style={{
                  padding: "0.5rem 1.25rem",
                  background: formReady ? theme.accent : theme.border,
                  color: formReady ? "#fff" : theme.muted,
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: formReady ? "pointer" : "not-allowed",
                  height: 38,
                  whiteSpace: "nowrap",
                }}
              >
                Add Drop
              </button>
            </div>
          )}
        </div>

        {/* ── Drop log ── */}
        {sortedDrops.length > 0 && (
          <div style={panelStyle(theme)}>
            <div
              style={{
                fontWeight: 700,
                color: theme.text,
                marginBottom: "1rem",
                fontSize: "1rem",
              }}
            >
              Drop Log ({sortedDrops.length} total)
            </div>
            <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.82rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: `2px solid ${theme.border}`,
                      position: "sticky",
                      top: 0,
                      background: theme.panel,
                    }}
                  >
                    <th style={thStyle(theme)}>Date</th>
                    <th style={thStyle(theme)}>Character</th>
                    <th style={thStyle(theme)}>Item</th>
                    <th style={thStyle(theme)}>Boss</th>
                    <th style={thStyle(theme)}>CH</th>
                    <th style={{ ...thStyle(theme), width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {sortedDrops.map((drop) => {
                    const item = PITCHED_ITEMS_BY_ID.get(drop.itemId);
                    return (
                      <tr
                        key={drop.id}
                        style={{ borderBottom: `1px solid ${theme.border}` }}
                      >
                        <td style={tdStyle(theme)}>{drop.date}</td>
                        <td style={tdStyle(theme)}>{drop.characterName}</td>
                        <td style={{ ...tdStyle(theme), fontWeight: 600 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            {item && <ItemIcon src={item.icon} />}
                            {item?.name ?? drop.itemId}
                          </span>
                        </td>
                        <td style={{ ...tdStyle(theme), color: theme.muted }}>
                          {item?.boss ?? "\u2014"}
                        </td>
                        <td style={tdStyle(theme)}>{drop.channel}</td>
                        <td style={tdStyle(theme)}>
                          <button
                            onClick={() => handleDelete(drop.id)}
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
          </div>
        )}

        {/* ── Analytics ── */}
        {sortedDrops.length > 0 && (
          <>
            <DropCountBarChart theme={theme} drops={sortedDrops} />
            <MonthlyTimeSeriesChart theme={theme} drops={sortedDrops} />
          </>
        )}

        {/* ── Empty state ── */}
        {sortedDrops.length === 0 && characters.length > 0 && (
          <div
            style={{
              textAlign: "center",
              color: theme.muted,
              fontSize: "0.9rem",
              padding: "2rem 0",
            }}
          >
            No drops logged yet. Use the form above to record your first pitched
            boss drop!
          </div>
        )}

        <WikiAttribution theme={theme} subject="Item images" />
      </div>
    </div>
  );
}

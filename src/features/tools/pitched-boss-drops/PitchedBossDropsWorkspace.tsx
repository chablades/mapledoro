"use client";

import { useState, useReducer, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { panelStyle, ItemIcon } from "./pitched-boss-ui";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import { WikiAttribution } from "../../../components/WikiAttribution";
import {
  readCharactersStore,
  selectCharactersList,
  type StoredCharacterRecord,
} from "../../characters/model/charactersStore";
import { readGlobalTool, writeGlobalTool } from "../globalToolsStore";
import { PITCHED_BOSS_ITEMS, PITCHED_ITEMS_BY_ID } from "./pitched-items";

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

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

const addDropBtnBase: CSSProperties = {
  padding: "0.5rem 1.25rem",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: "0.85rem",
  height: 38,
  whiteSpace: "nowrap",
};

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function DropLogTable({
  theme,
  drops,
  onDelete,
}: {
  theme: AppTheme;
  drops: PitchedBossDrop[];
  onDelete: (id: string) => void;
}) {
  return (
    <div style={panelStyle(theme)}>
      <div
        style={{
          fontWeight: 700,
          color: theme.text,
          marginBottom: "1rem",
          fontSize: "1rem",
        }}
      >
        Drop Log ({drops.length} total)
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
            {drops.map((drop) => {
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
                    {item?.boss ?? "—"}
                  </td>
                  <td style={tdStyle(theme)}>{drop.channel}</td>
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
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const [drops, setDrops] = useState<PitchedBossDrop[]>(() =>
    typeof window === "undefined" ? [] : readStore().drops,
  );
  const characters: StoredCharacterRecord[] = mounted
    ? selectCharactersList(readCharactersStore())
    : [];

  interface FormState {
    charId: string;
    itemId: string;
    channel: string;
    date: string;
  }
  type FormAction =
    | { type: "setCharId"; value: string }
    | { type: "setItemId"; value: string }
    | { type: "setChannel"; value: string }
    | { type: "setDate"; value: string }
    | { type: "resetAfterAdd" };
  const [form, dispatchForm] = useReducer(
    (state: FormState, action: FormAction): FormState => {
      switch (action.type) {
        case "setCharId": return { ...state, charId: action.value };
        case "setItemId": return { ...state, itemId: action.value };
        case "setChannel": return { ...state, channel: action.value };
        case "setDate": return { ...state, date: action.value };
        case "resetAfterAdd": return { ...state, itemId: "", channel: "" };
      }
    },
    undefined,
    (): FormState => ({
      charId: "",
      itemId: "",
      channel: "",
      date: typeof window === "undefined" ? "" : todayStr(),
    }),
  );

  function saveDrops(next: PitchedBossDrop[]) {
    setDrops(next);
    writeStore({ version: 1, drops: next });
  }

  function handleAdd() {
    if (!form.charId || !form.itemId || !form.channel || !form.date) return;
    const char = characters.find(
      (c) => c.characterName === form.charId,
    );
    if (!char) return;

    const newDrop: PitchedBossDrop = {
      id: generateId(),
      characterId: String(char.characterID),
      characterName: char.characterName,
      itemId: form.itemId,
      channel: parseInt(form.channel, 10),
      date: form.date,
      timestamp: new Date(form.date).getTime(),
    };

    const next = [...drops, newDrop].sort((a, b) => b.timestamp - a.timestamp);
    saveDrops(next);
    dispatchForm({ type: "resetAfterAdd" });
  }

  function handleDelete(id: string) {
    saveDrops(drops.filter((d) => d.id !== id));
  }

  if (!mounted) return null;

  const sortedDrops = drops.toSorted((a, b) => b.timestamp - a.timestamp);
  const formReady =
    form.charId !== "" &&
    form.itemId !== "" &&
    form.channel !== "" &&
    form.date !== "";

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
              <Link href="/characters" style={{ color: theme.accent }}>
                Add characters
              </Link>{" "}
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
                  <select
                    value={form.charId}
                    onChange={(e) => dispatchForm({ type: "setCharId", value: e.target.value })}
                    style={fieldStyle(theme)}
                  >
                    <option value="">Select character…</option>
                    {characters.map((c) => (
                      <option key={c.characterName} value={c.characterName}>
                        {c.characterName} (Lv.{c.level} {c.jobName})
                      </option>
                    ))}
                  </select>
                </label>
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
                  <select
                    value={form.itemId}
                    onChange={(e) => dispatchForm({ type: "setItemId", value: e.target.value })}
                    style={fieldStyle(theme)}
                  >
                    <option value="">Select item…</option>
                    {PITCHED_BOSS_ITEMS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.boss})
                      </option>
                    ))}
                  </select>
                </label>
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
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={form.channel}
                    onChange={(e) => dispatchForm({ type: "setChannel", value: e.target.value })}
                    placeholder="CH"
                    style={fieldStyle(theme)}
                  />
                </label>
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
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => dispatchForm({ type: "setDate", value: e.target.value })}
                    style={fieldStyle(theme)}
                  />
                </label>
              </div>

              <button
                onClick={handleAdd}
                disabled={!formReady}
                style={{
                  ...addDropBtnBase,
                  background: formReady ? theme.accent : theme.border,
                  color: formReady ? "#fff" : theme.muted,
                  cursor: formReady ? "pointer" : "not-allowed",
                }}
              >
                Add Drop
              </button>
            </div>
          )}
        </div>

        {/* ── Drop log ── */}
        {sortedDrops.length > 0 && (
          <DropLogTable theme={theme} drops={sortedDrops} onDelete={handleDelete} />
        )}

        {/* ── Analytics ── */}
        {sortedDrops.length > 0 && (
          <PitchedBossCharts theme={theme} drops={sortedDrops} />
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

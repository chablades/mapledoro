"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { AppTheme } from "../../../components/themes";
import {
  type SymbolType,
  type SymbolArea,
  ARCANE_AREAS,
  SACRED_AREAS,
  ARCANE_GROWTH,
  SACRED_GROWTH,
  ARCANE_MAX_LEVEL,
  SACRED_MAX_LEVEL,
  symbolsRemaining,
  symbolsConsumed,
  daysToMax,
  symbolsForLevel,
} from "./symbol-data";

// -- Types --------------------------------------------------------------------

interface SymbolState {
  level: number;
  current: number;
  daily: number;
  /** Arcane only — toggles the flat 120/week from weekly dungeons. */
  weeklyEnabled: boolean;
  /** Sacred only — whether this symbol is being tracked. */
  enabled: boolean;
}

interface SavedState {
  type: SymbolType;
  symbols: Record<string, SymbolState>;
}

// -- Constants ----------------------------------------------------------------

const WEEKLY_SYMBOLS = 120;
const DAILY_EVENT_BONUS = 6;

// -- Storage ------------------------------------------------------------------

const STORAGE_KEY = "symbols-v2";

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: SavedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// -- Helpers ------------------------------------------------------------------

function defaultSymbolState(area: SymbolArea, symbolType: SymbolType): SymbolState {
  return {
    level: 1,
    current: 0,
    daily: area.daily,
    weeklyEnabled: symbolType === "arcane",
    enabled: symbolType === "arcane",
  };
}

function getSymbolState(
  symbols: Record<string, SymbolState>,
  area: SymbolArea,
  symbolType: SymbolType,
): SymbolState {
  return symbols[area.name] ?? defaultSymbolState(area, symbolType);
}

function todayStr(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function addDays(days: number): string {
  const d = new Date(todayStr() + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Effective weekly for a symbol based on type and toggle state. */
function effectiveWeekly(symbolType: SymbolType, weeklyEnabled: boolean): number {
  return symbolType === "arcane" && weeklyEnabled ? WEEKLY_SYMBOLS : 0;
}

// -- Component ----------------------------------------------------------------

interface FormState {
  type: SymbolType;
  symbols: Record<string, SymbolState>;
}

function initFormState(): FormState {
  const saved = loadState();
  if (saved) {
    return { type: saved.type, symbols: saved.symbols };
  }
  return { type: "arcane", symbols: {} };
}

export default function SymbolWorkspace({ theme }: { theme: AppTheme }) {
  const [form, setForm] = useState<FormState>(initFormState);
  const { type, symbols } = form;

  const areas = type === "arcane" ? ARCANE_AREAS : SACRED_AREAS;
  const growth = type === "arcane" ? ARCANE_GROWTH : SACRED_GROWTH;
  const maxLevel = type === "arcane" ? ARCANE_MAX_LEVEL : SACRED_MAX_LEVEL;

  // Persist
  useEffect(() => {
    saveState({ type, symbols });
  }, [type, symbols]);

  const switchType = useCallback((t: SymbolType) => {
    setForm((f) => ({ ...f, type: t }));
  }, []);

  const updateSymbol = useCallback(
    (areaName: string, patch: Partial<SymbolState>) => {
      setForm((f) => {
        const currentType = f.type;
        const currentAreas = currentType === "arcane" ? ARCANE_AREAS : SACRED_AREAS;
        const area = currentAreas.find((a) => a.name === areaName)!;
        return {
          ...f,
          symbols: {
            ...f.symbols,
            [areaName]: { ...getSymbolState(f.symbols, area, currentType), ...patch },
          },
        };
      });
    },
    [],
  );

  const resetAll = useCallback(() => {
    setForm((f) => {
      const currentAreas = f.type === "arcane" ? ARCANE_AREAS : SACRED_AREAS;
      const next = { ...f.symbols };
      for (const area of currentAreas) {
        next[area.name] = defaultSymbolState(area, f.type);
      }
      return { ...f, symbols: next };
    });
  }, []);

  // Compute totals — only count enabled (tracked) symbols
  let totalConsumed = 0;
  let totalSymbolsNeeded = 0;
  let maxDaysVal = 0;
  const totalForOneArea = growth.reduce((a, b) => a + b, 0);
  const perSymbol: {
    area: SymbolArea;
    state: SymbolState;
    remaining: number;
    days: number;
    consumed: number;
    levelMax: number;
    isMaxed: boolean;
    isTracked: boolean;
  }[] = [];

  for (const area of areas) {
    const s = getSymbolState(symbols, area, type);
    const isTracked = type === "arcane" || s.enabled;
    const weekly = effectiveWeekly(type, s.weeklyEnabled);
    const remaining = symbolsRemaining(growth, s.level, s.current);
    const days = daysToMax(remaining, s.daily, weekly);
    const consumed = symbolsConsumed(growth, s.level, s.current, maxLevel);
    const isMaxed = s.level >= maxLevel;

    if (isTracked) {
      totalConsumed += consumed;
      totalSymbolsNeeded += totalForOneArea;
      if (days !== Infinity && days > maxDaysVal) maxDaysVal = days;
    }

    perSymbol.push({
      area,
      state: s,
      remaining,
      days,
      consumed,
      levelMax: symbolsForLevel(growth, s.level),
      isMaxed,
      isTracked,
    });
  }

  const tracked = perSymbol.filter((p) => p.isTracked);
  const overallPct = totalSymbolsNeeded > 0
    ? Math.min(100, (totalConsumed / totalSymbolsNeeded) * 100)
    : 0;
  const allMaxed = tracked.length > 0 && tracked.every((p) => p.isMaxed);
  const anyInfinite = tracked.some((p) => p.days === Infinity && !p.isMaxed);
  const noneTracked = tracked.length === 0;

  // -- Styles -----------------------------------------------------------------

  const inputStyle: React.CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    padding: "6px 10px",
    color: theme.text,
    fontFamily: "'Nunito', sans-serif",
    fontSize: "0.82rem",
    fontWeight: 700,
    outline: "none",
  };

  const sectionPanel: React.CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: "18px",
    padding: "1.25rem",
    marginBottom: "1.25rem",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    fontWeight: 800,
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "8px",
  };

  return (
    <>
      <style>{`
        .sym-btn { transition: background 0.15s, transform 0.1s; cursor: pointer; user-select: none; }
        .sym-btn:hover { transform: translateY(-1px); }
        .sym-btn:active { transform: translateY(0); }
        @media (max-width: 860px) {
          .sym-main { padding: 1rem !important; }
          .sym-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        className="sym-main"
        style={{
          flex: 1,
          width: "100%",
          padding: "1.5rem 1.5rem 2rem 2.75rem",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
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
              Symbol Calculator
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
              Track your Arcane and Sacred symbol progress and estimate completion dates.
            </div>
          </div>

          {/* Type toggle */}
          <div className="fade-in" style={sectionPanel}>
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
              {(["arcane", "sacred"] as const).map((t) => (
                <div
                  key={t}
                  className="sym-btn"
                  onClick={() => switchType(t)}
                  style={{
                    flex: 1,
                    padding: "9px 18px",
                    borderRadius: "8px",
                    fontSize: "0.88rem",
                    fontWeight: 800,
                    textAlign: "center",
                    color: type === t ? theme.accentText : theme.muted,
                    background: type === t ? theme.accentSoft : "transparent",
                  }}
                >
                  {t === "arcane" ? "Arcane Symbols" : "Sacred Symbols"}
                </div>
              ))}
            </div>
          </div>

          {/* Overall Progress */}
          <div className="fade-in" style={sectionPanel}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "8px",
              }}
            >
              <div style={labelStyle}>Overall Progress</div>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  color: theme.accent,
                }}
              >
                {noneTracked
                  ? "No symbols tracked"
                  : `${totalConsumed.toLocaleString()} / ${totalSymbolsNeeded.toLocaleString()} symbols`}
              </div>
            </div>
            <div
              style={{
                height: "12px",
                borderRadius: "6px",
                background: theme.timerBg,
                border: `1px solid ${theme.border}`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${overallPct}%`,
                  background: theme.accent,
                  borderRadius: "6px",
                  transition: "width 0.35s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "6px",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: theme.muted,
              }}
            >
              <span>
                {noneTracked
                  ? "Select symbols below to start tracking"
                  : allMaxed
                    ? "All symbols maxed!"
                    : anyInfinite
                      ? "Set daily symbols to estimate completion"
                      : `All maxed in ~${maxDaysVal} days (${addDays(maxDaysVal)})`}
              </span>
              <span>{noneTracked ? "" : `${overallPct.toFixed(1)}%`}</span>
            </div>
          </div>

          {/* Symbol Cards */}
          <div className="fade-in" style={sectionPanel}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ ...labelStyle, marginBottom: 0 }}>
                {type === "arcane" ? "Arcane River" : "Grandis"} Symbols
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div
                  className="sym-btn"
                  onClick={resetAll}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    color: "#e05a5a",
                    background: "transparent",
                    border: "1px solid #e05a5a33",
                  }}
                >
                  Reset
                </div>
              </div>
            </div>

            <div
              className="sym-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {perSymbol.map(({ area, state, remaining, days, levelMax, isMaxed, isTracked, consumed }) => {
                const levelPct = isMaxed
                  ? 100
                  : levelMax > 0
                    ? (state.current / levelMax) * 100
                    : 0;
                const areaPct = totalForOneArea > 0 ? (consumed / totalForOneArea) * 100 : 0;
                const isSacred = type === "sacred";
                const dailyMax = area.daily + DAILY_EVENT_BONUS;

                return (
                  <div
                    key={area.name}
                    style={{
                      background: theme.timerBg,
                      border: `1px solid ${isMaxed && isTracked ? theme.accent + "55" : theme.border}`,
                      borderRadius: "14px",
                      padding: "1rem",
                      transition: "border-color 0.15s, opacity 0.15s",
                      opacity: isSacred && !isTracked ? 0.5 : 1,
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={area.icon}
                        alt={area.name}
                        width={38}
                        height={38}
                        style={{
                          borderRadius: "8px",
                          objectFit: "contain",
                          flexShrink: 0,
                          background: theme.panel,
                          border: `1px solid ${theme.border}`,
                          padding: "2px",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'Fredoka One', cursive",
                            fontSize: "0.9rem",
                            color: theme.text,
                          }}
                        >
                          {area.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: theme.muted,
                          }}
                        >
                          Lv. {area.requiredLevel}+
                        </div>
                      </div>

                      {/* Sacred: tracking toggle */}
                      {isSacred && (
                        <div
                          className="sym-btn"
                          onClick={() => updateSymbol(area.name, { enabled: !state.enabled })}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "8px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            color: isTracked ? theme.accentText : theme.muted,
                            background: isTracked ? theme.accentSoft : "transparent",
                            border: `1px solid ${isTracked ? theme.accent + "44" : theme.border}`,
                          }}
                        >
                          {isTracked ? "Tracking" : "Not tracking"}
                        </div>
                      )}

                      {/* Arcane: days badge */}
                      {!isSacred && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            color: isMaxed ? "#fff" : days === Infinity ? "#e05a5a" : theme.accent,
                            background: isMaxed ? theme.accent : theme.accentSoft,
                          }}
                        >
                          {isMaxed ? "MAX" : days === Infinity ? "--" : `~${days}d`}
                        </div>
                      )}

                      {/* Sacred tracked: days badge */}
                      {isSacred && isTracked && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                            color: isMaxed ? "#fff" : days === Infinity ? "#e05a5a" : theme.accent,
                            background: isMaxed ? theme.accent : theme.accentSoft,
                          }}
                        >
                          {isMaxed ? "MAX" : days === Infinity ? "--" : `~${days}d`}
                        </div>
                      )}
                    </div>

                    {/* Level + Current */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        marginBottom: "0.5rem",
                        opacity: isSacred && !isTracked ? 0.4 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <div style={{ flex: "0 0 auto" }}>
                        <div
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: theme.muted,
                            marginBottom: "3px",
                          }}
                        >
                          Level
                        </div>
                        <select
                          value={state.level}
                          disabled={isSacred && !isTracked}
                          onChange={(e) => {
                            const newLevel = Number(e.target.value);
                            updateSymbol(area.name, {
                              level: newLevel,
                              current: 0,
                            });
                          }}
                          style={{
                            ...inputStyle,
                            width: "70px",
                            cursor: isSacred && !isTracked ? "not-allowed" : "pointer",
                            padding: "4px 6px",
                            fontSize: "0.78rem",
                          }}
                        >
                          {Array.from({ length: maxLevel }, (_, i) => i + 1).map(
                            (lvl) => (
                              <option key={lvl} value={lvl}>
                                {lvl}{lvl === maxLevel ? " (MAX)" : ""}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      {!isMaxed && (
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: theme.muted,
                              marginBottom: "3px",
                            }}
                          >
                            Current / Needed
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <input
                              type="number"
                              min={0}
                              max={levelMax}
                              value={state.current}
                              disabled={isSacred && !isTracked}
                              onChange={(e) => {
                                let v = parseInt(e.target.value) || 0;
                                if (v < 0) v = 0;
                                if (v > levelMax) v = levelMax;
                                updateSymbol(area.name, { current: v });
                              }}
                              style={{
                                ...inputStyle,
                                width: "64px",
                                textAlign: "center",
                                padding: "4px 6px",
                                fontSize: "0.78rem",
                                cursor: isSacred && !isTracked ? "not-allowed" : "text",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color: theme.muted,
                              }}
                            >
                              / {levelMax.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {isMaxed && (
                        <div
                          style={{
                            flex: 1,
                            fontSize: "0.82rem",
                            fontWeight: 800,
                            color: theme.accent,
                            textAlign: "center",
                            padding: "8px 0",
                          }}
                        >
                          Symbol Maxed
                        </div>
                      )}
                    </div>

                    {/* Level progress bar */}
                    {!isMaxed && (
                      <div
                        style={{
                          height: "6px",
                          borderRadius: "3px",
                          background: theme.panel,
                          border: `1px solid ${theme.border}`,
                          overflow: "hidden",
                          marginBottom: "0.6rem",
                          opacity: isSacred && !isTracked ? 0.4 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${levelPct}%`,
                            background: theme.accent,
                            borderRadius: "3px",
                            transition: "width 0.25s ease",
                          }}
                        />
                      </div>
                    )}

                    {/* Daily + Weekly controls */}
                    {!isMaxed && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          alignItems: "center",
                          marginBottom: "0.6rem",
                          opacity: isSacred && !isTracked ? 0.4 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        {/* Daily input (both arcane and sacred) */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              color: theme.muted,
                            }}
                          >
                            Daily
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={dailyMax}
                            value={state.daily}
                            disabled={isSacred && !isTracked}
                            onChange={(e) => {
                              let v = parseInt(e.target.value) || 0;
                              if (v < 0) v = 0;
                              if (v > dailyMax) v = dailyMax;
                              updateSymbol(area.name, { daily: v });
                            }}
                            style={{
                              ...inputStyle,
                              width: "52px",
                              textAlign: "center",
                              padding: "3px 4px",
                              fontSize: "0.75rem",
                              cursor: isSacred && !isTracked ? "not-allowed" : "text",
                            }}
                          />
                        </div>

                        {/* Arcane only: weekly toggle pill */}
                        {!isSacred && (
                          <div
                            className="sym-btn"
                            onClick={() =>
                              updateSymbol(area.name, {
                                weeklyEnabled: !state.weeklyEnabled,
                              })
                            }
                            style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              color: state.weeklyEnabled
                                ? theme.accentText
                                : theme.muted,
                              background: state.weeklyEnabled
                                ? theme.accentSoft
                                : "transparent",
                              border: `1px solid ${state.weeklyEnabled ? theme.accent + "44" : theme.border}`,
                            }}
                          >
                            Weekly {state.weeklyEnabled ? "120" : "OFF"}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Overall area progress + completion */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: theme.muted,
                        opacity: isSacred && !isTracked ? 0.4 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <span>{areaPct.toFixed(1)}% complete</span>
                      {!isMaxed && isTracked && days !== Infinity && (
                        <span style={{ color: theme.accent, fontWeight: 800 }}>
                          {addDays(days)}
                        </span>
                      )}
                      {!isMaxed && isTracked && days === Infinity && (
                        <span style={{ color: "#e05a5a", fontWeight: 800 }}>
                          No income set
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Completion Summary */}
          <div
            className="fade-in"
            style={{ ...sectionPanel, marginBottom: "1.25rem" }}
          >
            <div
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "1.15rem",
                color: theme.text,
                marginBottom: "1rem",
                paddingBottom: "0.8rem",
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              Completion Summary
            </div>

            {noneTracked ? (
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: theme.muted,
                  fontStyle: "italic",
                  textAlign: "center",
                  padding: "1rem 0",
                }}
              >
                {type === "sacred"
                  ? "Enable symbols above to see completion estimates."
                  : "No symbols to track."}
              </div>
            ) : tracked.filter((p) => !p.isMaxed).length === 0 ? (
              <div
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: theme.accent,
                  textAlign: "center",
                  padding: "1rem 0",
                }}
              >
                All {type === "arcane" ? "Arcane" : "tracked Sacred"} Symbols are maxed!
              </div>
            ) : (
              <>
                {tracked
                  .filter((p) => !p.isMaxed)
                  .sort((a, b) => (b.days === Infinity ? -1 : a.days === Infinity ? 1 : b.days - a.days))
                  .map(({ area, remaining, days }) => (
                    <div
                      key={area.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "5px 0",
                        borderBottom: `1px solid ${theme.border}`,
                        fontSize: "0.82rem",
                        fontWeight: 700,
                      }}
                    >
                      <span style={{ color: theme.text }}>
                        {area.name}
                        <span
                          style={{
                            fontSize: "0.68rem",
                            color: theme.muted,
                            marginLeft: "6px",
                          }}
                        >
                          ({remaining.toLocaleString()} left)
                        </span>
                      </span>
                      <span
                        style={{
                          color: days === Infinity ? "#e05a5a" : theme.accent,
                          fontWeight: 800,
                        }}
                      >
                        {days === Infinity ? "--" : `${days} days`}
                      </span>
                    </div>
                  ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "8px",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: "0.9rem",
                      color: theme.text,
                    }}
                  >
                    All Maxed By
                  </span>
                  <span
                    style={{
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: "1rem",
                      color: anyInfinite ? "#e05a5a" : theme.accent,
                    }}
                  >
                    {allMaxed
                      ? "Done!"
                      : anyInfinite
                        ? "Needs daily income"
                        : addDays(maxDaysVal)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Attribution */}
          <div
            style={{
              fontSize: "0.68rem",
              color: theme.muted,
              fontWeight: 600,
              lineHeight: 1.6,
              padding: "0 0.25rem",
            }}
          >
            Symbol images sourced from{" "}
            <a
              href="https://maplestorywiki.net"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: theme.accent, textDecoration: "none" }}
            >
              MapleStory Wiki
            </a>
            , licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: theme.accent, textDecoration: "none" }}
            >
              CC BY-NC-SA 4.0
            </a>
            .
          </div>
        </div>
      </div>
    </>
  );
}

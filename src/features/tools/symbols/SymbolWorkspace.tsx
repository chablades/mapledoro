"use client";

import { useState, useEffect, useCallback } from "react";
import { ToolHeader } from "../../../components/ToolHeader";
import { WikiAttribution } from "../../../components/WikiAttribution";
import {
  inputStyle as baseInputStyle,
  sectionPanel as baseSectionPanel,
  labelStyle as baseLabelStyle,
} from "../commonStyles";
import { todayStr } from "../dateUtils";
import { loadFromStorage, saveToStorage } from "../storage";
import type { AppTheme } from "../../../components/themes";
import { SymbolCard, type PerSymbolData } from "./SymbolCard";
import {
  type SymbolType,
  type SymbolState,
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

// -- Types & Constants --------------------------------------------------------

interface FormState {
  type: SymbolType;
  symbols: Record<string, SymbolState>;
}

const WEEKLY_SYMBOLS = 120;
const DAILY_EVENT_BONUS = 6;

const STORAGE_KEY = "symbols-v2";

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

// -- Sub-components -----------------------------------------------------------

function CompletionSummary({
  tracked,
  type,
  theme,
  maxDaysVal,
}: {
  tracked: PerSymbolData[];
  type: SymbolType;
  theme: AppTheme;
  maxDaysVal: number;
}) {
  const noneTracked = tracked.length === 0;
  const allMaxed = tracked.length > 0 && tracked.every((p) => p.isMaxed);
  const anyInfinite = tracked.some((p) => p.days === Infinity && !p.isMaxed);
  const incomplete = tracked
    .filter((p) => !p.isMaxed)
    .sort((a, b) => (b.days === Infinity ? -1 : a.days === Infinity ? 1 : b.days - a.days));
  const sectionPanel = baseSectionPanel(theme);

  return (
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
      ) : incomplete.length === 0 ? (
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
          {incomplete.map(({ area, remaining, days }) => (
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
  );
}

// -- Component ----------------------------------------------------------------

function initFormState(): FormState {
  const saved = loadFromStorage<FormState>(STORAGE_KEY);
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
    saveToStorage(STORAGE_KEY, { type, symbols });
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
  const perSymbol: PerSymbolData[] = [];

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

  const inputStyle = baseInputStyle(theme);
  const sectionPanel = baseSectionPanel(theme);
  const labelStyle = baseLabelStyle(theme);

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
          <ToolHeader
            theme={theme}
            title="Symbol Calculator"
            description="Track your Arcane and Sacred symbol progress and estimate completion dates."
          />

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
              {perSymbol.map((symbolData) => (
                <SymbolCard
                  key={symbolData.area.name}
                  theme={theme}
                  type={type}
                  symbol={symbolData}
                  totalForOneArea={totalForOneArea}
                  maxLevel={maxLevel}
                  dailyMax={symbolData.area.daily + DAILY_EVENT_BONUS}
                  inputStyle={inputStyle}
                  updateSymbol={updateSymbol}
                  addDays={addDays}
                />
              ))}
            </div>
          </div>

          <CompletionSummary
            tracked={tracked}
            type={type}
            theme={theme}
            maxDaysVal={maxDaysVal}
          />

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
            <WikiAttribution theme={theme} subject="Symbol images" />
          </div>
        </div>
      </div>
    </>
  );
}

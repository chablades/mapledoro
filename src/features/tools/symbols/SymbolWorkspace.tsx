"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import type { AppTheme } from "../../../components/themes";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
import { ToolHeader } from "../../../components/ToolHeader";
import { WikiAttribution } from "../../../components/WikiAttribution";
import { CharacterSyncPanel } from "../../../components/CharacterSyncPanel";
import { SegmentedToggle } from "../../../components/SegmentedToggle";
import { toolStyles } from "../tool-styles";
import {
  type SymbolType,
  type SymbolArea,
  symbolsForLevel,
} from "./symbol-data";
import {
  useSymbolState,
  effectiveWeekly,
  type SymbolState,
  type SymbolStats,
} from "./useSymbolState";

// -- Constants ----------------------------------------------------------------

const DAILY_EVENT_BONUS = 6;

// -- Helpers ------------------------------------------------------------------

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

// -- Symbol Card: Header ------------------------------------------------------

function SymbolCardHeader({
  area,
  state,
  days,
  isMaxed,
  isTracked,
  isSacred,
  theme,
  updateSymbol,
}: {
  area: SymbolArea;
  state: SymbolState;
  days: number;
  isMaxed: boolean;
  isTracked: boolean;
  isSacred: boolean;
  theme: AppTheme;
  updateSymbol: (areaName: string, patch: Partial<SymbolState>) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "0.75rem",
      }}
    >
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
            fontFamily: "var(--font-heading)",
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

      {(!isSacred || isTracked) && (() => {
        let badgeColor: string;
        let badgeLabel: string;
        if (isMaxed) { badgeColor = "#fff"; badgeLabel = "MAX"; }
        else if (days === Infinity) { badgeColor = "#e05a5a"; badgeLabel = "--"; }
        else { badgeColor = theme.accent; badgeLabel = `~${days}d`; }
        return (
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 800,
              padding: "2px 8px",
              borderRadius: "6px",
              flexShrink: 0,
              whiteSpace: "nowrap",
              color: badgeColor,
              background: isMaxed ? theme.accent : theme.accentSoft,
            }}
          >
            {badgeLabel}
          </div>
        );
      })()}
    </div>
  );
}

// -- Symbol Card: Level Controls ----------------------------------------------

function SymbolLevelControls({
  area,
  state,
  isMaxed,
  disabled,
  maxLevel,
  levelMax,
  inputStyle,
  theme,
  updateSymbol,
}: {
  area: SymbolArea;
  state: SymbolState;
  isMaxed: boolean;
  disabled: boolean;
  maxLevel: number;
  levelMax: number;
  inputStyle: React.CSSProperties;
  theme: AppTheme;
  updateSymbol: (areaName: string, patch: Partial<SymbolState>) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        marginBottom: "0.5rem",
        opacity: disabled ? 0.4 : 1,
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
          className="tool-input"
          value={state.level}
          disabled={disabled}
          onChange={(e) => {
            const newLevel = Number(e.target.value);
            updateSymbol(area.name, { level: newLevel, current: 0 });
          }}
          style={{
            ...inputStyle,
            width: "70px",
            cursor: disabled ? "not-allowed" : "pointer",
            padding: "4px 6px",
            fontSize: "0.78rem",
          }}
        >
          {Array.from({ length: maxLevel }, (_, i) => i + 1).map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
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
              className="tool-input"
              type="number"
              min={0}
              max={levelMax}
              value={state.current}
              disabled={disabled}
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
                cursor: disabled ? "not-allowed" : "text",
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
  );
}

// -- Symbol Card: Income Controls ---------------------------------------------

function SymbolIncomeControls({
  area,
  state,
  disabled,
  isSacred,
  dailyMax,
  inputStyle,
  theme,
  updateSymbol,
}: {
  area: SymbolArea;
  state: SymbolState;
  disabled: boolean;
  isSacred: boolean;
  dailyMax: number;
  inputStyle: React.CSSProperties;
  theme: AppTheme;
  updateSymbol: (areaName: string, patch: Partial<SymbolState>) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "center",
        marginBottom: "0.6rem",
        opacity: disabled ? 0.4 : 1,
        transition: "opacity 0.15s",
      }}
    >
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
          className="tool-input"
          max={dailyMax}
          value={state.daily}
          disabled={disabled}
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
            cursor: disabled ? "not-allowed" : "text",
          }}
        />
      </div>

      {!isSacred && (
        <div
          className="sym-btn"
          onClick={() =>
            updateSymbol(area.name, { weeklyEnabled: !state.weeklyEnabled })
          }
          style={{
            padding: "4px 10px",
            borderRadius: "8px",
            fontSize: "0.72rem",
            fontWeight: 800,
            color: state.weeklyEnabled ? theme.accentText : theme.muted,
            background: state.weeklyEnabled ? theme.accentSoft : "transparent",
            border: `1px solid ${state.weeklyEnabled ? theme.accent + "44" : theme.border}`,
          }}
        >
          Weekly {state.weeklyEnabled ? "120" : "OFF"}
        </div>
      )}
    </div>
  );
}

// -- Symbol Card --------------------------------------------------------------

function SymbolCard({
  area,
  state,
  days,
  consumed,
  levelMax,
  isMaxed,
  isTracked,
  type,
  maxLevel,
  totalForOneArea,
  inputStyle,
  theme,
  updateSymbol,
}: {
  area: SymbolArea;
  state: SymbolState;
  days: number;
  consumed: number;
  levelMax: number;
  isMaxed: boolean;
  isTracked: boolean;
  type: SymbolType;
  maxLevel: number;
  totalForOneArea: number;
  inputStyle: React.CSSProperties;
  theme: AppTheme;
  updateSymbol: (areaName: string, patch: Partial<SymbolState>) => void;
}) {
  let levelPct: number;
  if (isMaxed) levelPct = 100;
  else if (levelMax > 0) levelPct = (state.current / levelMax) * 100;
  else levelPct = 0;
  const areaPct = totalForOneArea > 0 ? (consumed / totalForOneArea) * 100 : 0;
  const isSacred = type === "sacred";
  const dailyMax = area.daily + DAILY_EVENT_BONUS;
  const disabledSacred = isSacred && !isTracked;

  return (
    <div
      style={{
        background: theme.timerBg,
        border: `1px solid ${isMaxed && isTracked ? theme.accent + "55" : theme.border}`,
        borderRadius: "14px",
        padding: "1rem",
        transition: "border-color 0.15s, opacity 0.15s",
        opacity: disabledSacred ? 0.5 : 1,
      }}
    >
      <SymbolCardHeader
        area={area}
        state={state}
        days={days}
        isMaxed={isMaxed}
        isTracked={isTracked}
        isSacred={isSacred}
        theme={theme}
        updateSymbol={updateSymbol}
      />

      <SymbolLevelControls
        area={area}
        state={state}
        isMaxed={isMaxed}
        disabled={disabledSacred}
        maxLevel={maxLevel}
        levelMax={levelMax}
        inputStyle={inputStyle}
        theme={theme}
        updateSymbol={updateSymbol}
      />

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
            opacity: disabledSacred ? 0.4 : 1,
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

      {!isMaxed && (
        <SymbolIncomeControls
          area={area}
          state={state}
          disabled={disabledSacred}
          isSacred={isSacred}
          dailyMax={dailyMax}
          inputStyle={inputStyle}
          theme={theme}
          updateSymbol={updateSymbol}
        />
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
          opacity: disabledSacred ? 0.4 : 1,
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
}

// -- Overall Progress Panel ---------------------------------------------------

function OverallProgressPanel({
  theme,
  sectionPanel,
  stats,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  stats: SymbolStats;
}) {
  const { noneTracked, totalConsumed, totalSymbolsNeeded, overallPct, allMaxed, anyInfinite, maxDaysVal } = stats;

  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "8px",
        }}
      >
        <div className="section-label" style={{ color: theme.muted }}>Overall Progress</div>
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
          {(() => {
            if (noneTracked) return "Select symbols below to start tracking";
            if (allMaxed) return "All symbols maxed!";
            if (anyInfinite) return "Set daily symbols to estimate completion";
            return `All maxed in ~${maxDaysVal} days (${addDays(maxDaysVal)})`;
          })()}
        </span>
        <span>{noneTracked ? "" : `${overallPct.toFixed(1)}%`}</span>
      </div>
    </div>
  );
}

// -- Completion Summary Panel -------------------------------------------------

function CompletionSummaryPanel({
  theme,
  sectionPanel,
  stats,
  type,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  stats: SymbolStats;
  type: SymbolType;
}) {
  const { tracked, noneTracked, allMaxed, anyInfinite, maxDaysVal } = stats;
  const incomplete = tracked.filter((p) => !p.isMaxed);

  return (
    <div
      className="fade-in panel-card"
      style={{ ...sectionPanel, marginBottom: "1.25rem" }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "1.15rem",
          color: theme.text,
          marginBottom: "1rem",
          paddingBottom: "0.8rem",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        Completion Summary
      </div>

      {noneTracked && (
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
      )}

      {!noneTracked && incomplete.length === 0 && (
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
      )}

      {!noneTracked && incomplete.length > 0 && (
        <>
          {[...incomplete]
            .sort((a, b) => {
              if (b.days === Infinity) return -1;
              if (a.days === Infinity) return 1;
              return b.days - a.days;
            })
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
                fontFamily: "var(--font-heading)",
                fontSize: "0.9rem",
                color: theme.text,
              }}
            >
              All Maxed By
            </span>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1rem",
                color: anyInfinite ? "#e05a5a" : theme.accent,
              }}
            >
              {(() => {
                if (allMaxed) return "Done!";
                if (anyInfinite) return "Needs daily income";
                return addDays(maxDaysVal);
              })()}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// -- Completion Timeline Chart ------------------------------------------------

const TIMELINE_COLORS = [
  "#e07840", "#40b040", "#7c6aff", "#e05a5a", "#40b8ff",
  "#d4a02a", "#d460a0", "#60a060", "#a090dd", "#c08060",
];

function computeLevelDays(
  state: SymbolState,
  growth: number[],
  maxLevel: number,
  type: SymbolType,
): { day: number; level: number }[] {
  const weekly = effectiveWeekly(type, state.weeklyEnabled);
  const rate = state.daily + weekly / 7;
  if (rate <= 0) return [];

  const points: { day: number; level: number }[] = [{ day: 0, level: state.level }];
  let cumDays = 0;
  let remaining = symbolsForLevel(growth, state.level) - state.current;

  for (let lvl = state.level; lvl < maxLevel; lvl++) {
    if (lvl > state.level) remaining = symbolsForLevel(growth, lvl);
    cumDays += remaining / rate;
    points.push({ day: Math.ceil(cumDays), level: lvl + 1 });
  }
  return points;
}

function CompletionTimelineChart({
  theme,
  sectionPanel,
  stats,
  growth,
  maxLevel,
  type,
}: {
  theme: AppTheme;
  sectionPanel: React.CSSProperties;
  stats: SymbolStats;
  growth: number[];
  maxLevel: number;
  type: SymbolType;
}) {
  const series = stats.tracked
    .filter((p) => !p.isMaxed && p.days !== Infinity)
    .map((p) => ({
      name: p.area.name,
      points: computeLevelDays(p.state, growth, maxLevel, type),
    }))
    .filter((s) => s.points.length > 1);

  const maxDay = Math.max(...series.flatMap((s) => s.points.map((p) => p.day)), 1);

  const datasets = series.map((s, i) => ({
    label: s.name,
    data: s.points.map((p) => ({ x: p.day, y: p.level })),
    borderColor: TIMELINE_COLORS[i % TIMELINE_COLORS.length],
    backgroundColor: TIMELINE_COLORS[i % TIMELINE_COLORS.length],
    tension: 0.2,
    pointRadius: 3,
    pointHoverRadius: 5,
    borderWidth: 2.5,
  }));

  const chartData = { datasets };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: "bottom" as const, labels: { color: theme.muted, font: { size: 12, weight: 600 as const } } },
      tooltip: {
        callbacks: {
          title: (items) => {
            const d = (items[0]?.parsed.x as number | null) ?? 0;
            return d === 0 ? "Today" : addDays(d);
          },
          label: (item) =>
            `${item.dataset.label}: Level ${item.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        type: "linear" as const,
        min: 0,
        max: maxDay,
        ticks: {
          color: theme.muted,
          maxTicksLimit: 6,
          callback: (value: number | string) => {
            const d = typeof value === "string" ? parseFloat(value) : value;
            return d === 0 ? "Today" : addDays(d);
          },
        },
        grid: { color: theme.border },
        title: { display: true, text: "Date", color: theme.muted, font: { size: 12 } },
      },
      y: {
        min: 1,
        max: maxLevel,
        ticks: { color: theme.muted, stepSize: maxLevel <= 12 ? 1 : 2 },
        grid: { color: theme.border },
        title: { display: true, text: "Level", color: theme.muted, font: { size: 12 } },
      },
    },
  };

  if (series.length === 0) return null;

  return (
    <div className="fade-in panel-card" style={{ ...sectionPanel, marginBottom: "1.25rem" }}>
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "1.15rem",
          color: theme.text,
          marginBottom: "1rem",
          paddingBottom: "0.8rem",
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        Completion Timeline
      </div>
      <Line data={chartData} options={options} />
    </div>
  );
}

// -- Main Component -----------------------------------------------------------

export default function SymbolWorkspace({ theme }: { theme: AppTheme }) {
  const {
    mounted,
    characters,
    selectedCharName,
    handleCharChange,
    type,
    growth,
    maxLevel,
    switchType,
    updateSymbol,
    resetAll,
    stats,
  } = useSymbolState();

  const styles = toolStyles(theme);

  if (!mounted) return null;

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
          <ToolHeader
            theme={theme}
            title="Symbol Tracker"
            description="Switch between Arcane and Sacred, enter each symbol's level and count, and view your estimated days to max."
          />

          <CharacterSyncPanel
            theme={theme}
            characters={characters}
            selectedCharName={selectedCharName}
            onCharChange={handleCharChange}
            inputStyle={styles.inputStyle}
            sectionPanel={styles.sectionPanel}
          />

          <SegmentedToggle
            theme={theme}
            options={["arcane", "sacred"] as const}
            value={type}
            labels={{ arcane: "Arcane Symbols", sacred: "Sacred Symbols" }}
            sectionPanel={styles.sectionPanel}
            btnClassName="sym-btn"
            onChange={switchType}
          />

          <OverallProgressPanel theme={theme} sectionPanel={styles.sectionPanel} stats={stats} />

          {/* Symbol Cards */}
          <div className="fade-in panel-card" style={styles.sectionPanel}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <div className="section-label" style={{ color: theme.muted, marginBottom: 0 }}>
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
              {stats.perSymbol.map(({ area, state, days, levelMax, isMaxed, isTracked, consumed }) => (
                <SymbolCard
                  key={area.name}
                  area={area}
                  state={state}
                  days={days}
                  consumed={consumed}
                  levelMax={levelMax}
                  isMaxed={isMaxed}
                  isTracked={isTracked}
                  type={type}
                  maxLevel={maxLevel}
                  totalForOneArea={stats.totalForOneArea}
                  inputStyle={styles.inputStyle}
                  theme={theme}
                  updateSymbol={updateSymbol}
                />
              ))}
            </div>
          </div>

          <CompletionSummaryPanel theme={theme} sectionPanel={styles.sectionPanel} stats={stats} type={type} />

          <CompletionTimelineChart theme={theme} sectionPanel={styles.sectionPanel} stats={stats} growth={growth} maxLevel={maxLevel} type={type} />

          <WikiAttribution theme={theme} subject="Symbol images" />
        </div>
      </div>
    </>
  );
}

"use client";

import { useReducer, useMemo, useState, useEffect, type ComponentType } from "react";
import { useMounted } from "../../../lib/useMounted";
import type { AppTheme } from "../../../components/themes";
import type { ChartOptions, ChartData, TooltipItem } from "chart.js";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { ToolHeader } from "../../../components/ToolHeader";
import {
  attemptCost,
  computeExpectedCosts,
  simulate,
  BOOM_TIER_COUNT,
  type StarForceOpts,
  type MvpTier,
  type StarResult,
  type SimulationResult,
} from "./star-force-data";
import { formatMeso, formatMesoFull } from "../format";
import { Toggle, PillGroup, ActionButton } from "../shared-ui";
import { MVP_OPTIONS } from "../shared-data";
import { toolStyles } from "../tool-styles";

// -- Helpers ------------------------------------------------------------------

const STAR_OPTIONS = Array.from({ length: 31 }, (_, i) => i);

function pct(n: number): string {
  if (n === 0) return "—";
  return (n * 100).toFixed(1) + "%";
}

// Shared height so textboxes, dropdowns, and toggles line up (slider excluded).
const CONTROL_HEIGHT = 34;

// Common control width per grid column (left: Item Level / Target Star / Trials;
// right: Current Star / Replace Cost / MVP).
const LEFT_COL_WIDTH = 110;
const RIGHT_COL_WIDTH = 130;

const controlSizeStyle: React.CSSProperties = {
  height: CONTROL_HEIGHT,
  boxSizing: "border-box",
};

const toggleControlStyle: React.CSSProperties = {
  ...controlSizeStyle,
  display: "flex",
  alignItems: "center",
};

const optionRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.75rem",
  alignItems: "center",
};

const previewBarBase: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  display: "flex",
  flexWrap: "wrap",
  gap: "1.25rem",
  fontSize: "0.78rem",
  fontWeight: 700,
};

const optionsPanelBase: React.CSSProperties = {
  padding: "1.25rem",
  marginBottom: "1.25rem",
  borderRadius: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
};

// -- Sub-components -----------------------------------------------------------

function InputRow({
  label,
  theme,
  children,
}: {
  label: string;
  theme: AppTheme;
  children: React.ReactNode;
}) {
  return (
    <label className="sf-input-row" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span
        className="section-label"
        style={{ color: theme.muted, minWidth: 96, marginBottom: 0 }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function SimulationPanel({
  theme,
  sim,
  startStar,
  targetStar,
  trials,
}: {
  theme: AppTheme;
  sim: SimulationResult;
  startStar: number;
  targetStar: number;
  trials: number;
}) {
  const statStyle: React.CSSProperties = { flex: "1 1 140px" };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    fontWeight: 800,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: theme.muted,
    marginBottom: "0.2rem",
  };
  const valueStyle: React.CSSProperties = {
    fontFamily: "var(--font-heading)",
    fontSize: "1.15rem",
    color: theme.text,
  };

  return (
    <div
      className="fade-in panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        padding: "1.25rem",
        marginBottom: "1.25rem",
        borderRadius: "14px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "1rem",
          color: theme.text,
          marginBottom: "0.25rem",
        }}
      >
        {startStar}★ → {targetStar}★ Simulation
      </div>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, marginBottom: "1rem" }}>
        {trials.toLocaleString()} trials
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        <div style={statStyle}>
          <div style={labelStyle}>Mean Cost</div>
          <div style={{ ...valueStyle, color: theme.accent }}>{formatMeso(sim.meanCost)}</div>
          <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
            {formatMesoFull(sim.meanCost)} mesos
          </div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>Median Cost</div>
          <div style={valueStyle}>{formatMeso(sim.medianCost)}</div>
          <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
            {formatMesoFull(sim.medianCost)} mesos
          </div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>Mean Booms</div>
          <div style={{ ...valueStyle, color: sim.meanBooms > 0 ? "#e05a5a" : theme.text }}>
            {sim.meanBooms === 0 ? "0" : sim.meanBooms.toFixed(1)}
          </div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>Median Booms</div>
          <div style={{ ...valueStyle, color: sim.medianBooms > 0 ? "#e05a5a" : theme.text }}>
            {sim.medianBooms}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        <div style={statStyle}>
          <div style={labelStyle}>Best Case</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
            {formatMeso(sim.minCost)}
          </div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>75th %ile</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
            {formatMeso(sim.p75Cost)}
          </div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>85th %ile</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
            {formatMeso(sim.p85Cost)}
          </div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>95th %ile</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
            {formatMeso(sim.p95Cost)}
          </div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>Worst Case</div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: theme.text }}>
            {formatMeso(sim.maxCost)}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Histogram panel ----------------------------------------------------------

type HistMetric = "cost" | "booms";
type BarChartComponent = ComponentType<{ data: unknown; options: unknown }>;

const METRIC_OPTIONS: { value: HistMetric; label: string }[] = [
  { value: "cost", label: "Meso Cost" },
  { value: "booms", label: "Booms" },
];

const COST_BIN_COUNT = 30;

interface Bins {
  labels: string[];
  counts: number[];
  rangeLabels: string[]; // tooltip title per bar
  cumulative: number[]; // running total up to and including each bin
}

function withCumulative(counts: number[]): number[] {
  let run = 0;
  return counts.map((c) => (run += c));
}

/** Equal-width bins across the cost range (sorted ascending). */
function buildCostBins(sorted: number[]): Bins {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (max <= min) {
    const one = [sorted.length];
    return { labels: [formatMeso(min)], counts: one, rangeLabels: [formatMeso(min)], cumulative: one };
  }
  const width = (max - min) / COST_BIN_COUNT;
  const counts = new Array<number>(COST_BIN_COUNT).fill(0);
  for (const v of sorted) {
    counts[Math.min(COST_BIN_COUNT - 1, Math.floor((v - min) / width))]++;
  }
  const labels: string[] = [];
  const rangeLabels: string[] = [];
  for (let i = 0; i < COST_BIN_COUNT; i++) {
    const lo = min + i * width;
    labels.push(formatMeso(lo));
    rangeLabels.push(`${formatMeso(lo)} – ${formatMeso(lo + width)}`);
  }
  return { labels, counts, rangeLabels, cumulative: withCumulative(counts) };
}

/** One bar per integer boom count (sorted ascending). */
function buildBoomBins(sorted: number[]): Bins {
  const max = sorted[sorted.length - 1];
  const counts = new Array<number>(max + 1).fill(0);
  for (const v of sorted) counts[v]++;
  const labels = counts.map((_, i) => String(i));
  return {
    labels,
    counts,
    rangeLabels: labels.map((l) => `${l} boom${l === "1" ? "" : "s"}`),
    cumulative: withCumulative(counts),
  };
}

function HistogramPanel({ theme, sim }: { theme: AppTheme; sim: SimulationResult }) {
  const [Bar, setBar] = useState<BarChartComponent | null>(null);
  const [metric, setMetric] = useState<HistMetric>("cost");

  useEffect(() => {
    let mounted = true;
    async function loadChart() {
      const [chartModule, barModule] = await Promise.all([
        import("chart.js"),
        import("react-chartjs-2"),
      ]);
      chartModule.Chart.register(
        chartModule.CategoryScale,
        chartModule.LinearScale,
        chartModule.BarElement,
        chartModule.Tooltip,
      );
      if (mounted) setBar(() => barModule.Bar as BarChartComponent);
    }
    loadChart();
    return () => {
      mounted = false;
    };
  }, []);

  const bins = useMemo(
    () => (metric === "cost" ? buildCostBins(sim.costs) : buildBoomBins(sim.booms)),
    [metric, sim],
  );
  const total = sim.costs.length;

  const data: ChartData<"bar"> = {
    labels: bins.labels,
    datasets: [
      {
        label: "Trials",
        data: bins.counts,
        backgroundColor: theme.accent,
        borderRadius: 3,
        categoryPercentage: 1,
        barPercentage: metric === "cost" ? 1 : 0.9,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<"bar">[]) => bins.rangeLabels[items[0].dataIndex],
          label: (item: TooltipItem<"bar">) => {
            const c = item.parsed.y ?? 0;
            return `${c.toLocaleString()} trials (${((c / total) * 100).toFixed(1)}%)`;
          },
          afterLabel: (item: TooltipItem<"bar">) =>
            `Cumulative: ${((bins.cumulative[item.dataIndex] / total) * 100).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: theme.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: theme.muted },
        grid: { color: theme.border },
      },
    },
  };

  return (
    <div
      className="fade-in panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        padding: "1.25rem",
        marginBottom: "1.25rem",
        borderRadius: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: theme.text }}>
          {metric === "cost" ? "Cost Distribution" : "Boom Distribution"}
        </div>
        <PillGroup theme={theme} options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
      </div>
      <div style={{ height: 280 }}>{Bar ? <Bar data={data} options={options} /> : null}</div>
    </div>
  );
}

function BreakdownTable({ theme, results }: { theme: AppTheme; results: StarResult[] }) {
  const thStyle: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: "0.7rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: theme.muted,
    textAlign: "right",
    borderBottom: `2px solid ${theme.border}`,
  };
  const tdStyle: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: "0.8rem",
    fontWeight: 700,
    color: theme.text,
    textAlign: "right",
    borderBottom: `1px solid ${theme.border}`,
  };

  return (
    <div
      className="fade-in panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1.25rem 1.25rem 0.75rem",
          fontFamily: "var(--font-heading)",
          fontSize: "1rem",
          color: theme.text,
        }}
      >
        Per-Star Breakdown
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Star</th>
              <th style={thStyle}>Success</th>
              <th style={thStyle}>Destroy</th>
              <th style={thStyle}>Cost / Try</th>
              <th style={thStyle}>Expected Cost</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.star}>
                <td style={{ ...tdStyle, textAlign: "left", color: theme.accent }}>
                  {r.star}★ → {r.star + 1}★
                </td>
                <td style={tdStyle}>{pct(r.success)}</td>
                <td style={{ ...tdStyle, color: r.destroy > 0 ? "#e05a5a" : theme.muted }}>
                  {pct(r.destroy)}
                </td>
                <td style={tdStyle}>{formatMeso(r.cost)}</td>
                <td style={{ ...tdStyle, fontWeight: 800 }}>{formatMeso(r.expectedCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Types --------------------------------------------------------------------

interface CalcState {
  level: number;
  startStar: number;
  targetStar: number;
  replacementCost: number;
  costDiscount: boolean;
  boomReduction: boolean;
  starCatch: boolean;
  safeguard: boolean;
  mvp: MvpTier;
  boomTier: number;
  trials: number;
  simGen: number;
}
type CalcAction =
  | { type: "setLevel"; value: number }
  | { type: "setStartStar"; value: number }
  | { type: "setTargetStar"; value: number }
  | { type: "setReplacementCost"; value: number }
  | { type: "setCostDiscount"; value: boolean }
  | { type: "setBoomReduction"; value: boolean }
  | { type: "setStarCatch"; value: boolean }
  | { type: "setSafeguard"; value: boolean }
  | { type: "setMvp"; value: MvpTier }
  | { type: "setBoomTier"; value: number }
  | { type: "setTrials"; value: number }
  | { type: "reroll" };

// -- Inputs + options panel ---------------------------------------------------

function StarForceForm({
  theme,
  calc,
  dispatch,
  previewCost,
  previewResult,
  inputStyle,
  selectStyle,
}: {
  theme: AppTheme;
  calc: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
  previewCost: number;
  previewResult: StarResult | null;
  inputStyle: React.CSSProperties;
  selectStyle: React.CSSProperties;
}) {
  // The 30% events stack with Enhancement Mode, but we don't assume safeguard
  // does — so only safeguard is disabled when a tier above baseline is active.
  const tierActive = calc.boomTier > 1;

  return (
    <div
      className="fade-in panel-card"
      style={{
        ...optionsPanelBase,
        background: theme.panel,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div className="sf-inputs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <InputRow label="Item Level" theme={theme}>
          <input
            className="tool-input"
            type="number"
            min={0}
            max={300}
            value={calc.level}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={replaceZeroOnDigit}
            onChange={(e) => dispatch({ type: "setLevel", value: Math.max(0, Math.min(300, Number(e.target.value) || 0)) })}
            style={{ ...inputStyle, width: LEFT_COL_WIDTH }}
          />
        </InputRow>

        <InputRow label="Current Star" theme={theme}>
          <select
            className="tool-select"
            value={calc.startStar}
            onChange={(e) => dispatch({ type: "setStartStar", value: Number(e.target.value) })}
            style={{ ...selectStyle, width: RIGHT_COL_WIDTH }}
          >
            {STAR_OPTIONS.slice(0, 30).map((s) => (
              <option key={s} value={s}>{s}★</option>
            ))}
          </select>
        </InputRow>

        <InputRow label="Target Star" theme={theme}>
          <select
            className="tool-select"
            value={calc.targetStar}
            onChange={(e) => dispatch({ type: "setTargetStar", value: Number(e.target.value) })}
            style={{ ...selectStyle, width: LEFT_COL_WIDTH }}
          >
            {STAR_OPTIONS.slice(1).map((s) => (
              <option key={s} value={s}>{s}★</option>
            ))}
          </select>
        </InputRow>

        <InputRow label="Replace Cost" theme={theme}>
          <input
            className="tool-input"
            type="number"
            min={0}
            value={calc.replacementCost}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={replaceZeroOnDigit}
            onChange={(e) => dispatch({ type: "setReplacementCost", value: Math.max(0, Number(e.target.value) || 0) })}
            style={{ ...inputStyle, width: RIGHT_COL_WIDTH }}
            placeholder="0"
          />
        </InputRow>

        <InputRow label="Trials" theme={theme}>
          <input
            className="tool-input"
            type="number"
            min={1}
            max={100000}
            value={calc.trials}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => dispatch({ type: "setTrials", value: Math.max(1, Math.min(100000, Number(e.target.value) || 1000)) })}
            style={{ ...inputStyle, width: LEFT_COL_WIDTH }}
          />
        </InputRow>

        <InputRow label="MVP" theme={theme}>
          <select
            className="tool-select"
            value={calc.mvp}
            onChange={(e) => dispatch({ type: "setMvp", value: e.target.value as MvpTier })}
            style={{ ...selectStyle, width: RIGHT_COL_WIDTH }}
          >
            {MVP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </InputRow>
      </div>

      {/* Events + Options, aligned with the inputs grid columns */}
      <div className="sf-inputs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="sf-option-row" style={optionRowStyle}>
          <span className="section-label" style={{ color: theme.muted, minWidth: 96, marginBottom: 0 }}>
            Events
          </span>
          <Toggle theme={theme} label="30% Off" checked={calc.costDiscount} style={toggleControlStyle} onChange={(v) => dispatch({ type: "setCostDiscount", value: v })} />
          <Toggle theme={theme} label="30% Boom Reduction" checked={calc.boomReduction} style={toggleControlStyle} onChange={(v) => dispatch({ type: "setBoomReduction", value: v })} />
        </div>
        <div className="sf-option-row" style={optionRowStyle}>
          <span className="section-label" style={{ color: theme.muted, minWidth: 96, marginBottom: 0 }}>
            Options
          </span>
          <Toggle theme={theme} label="Star Catching" checked={calc.starCatch} style={toggleControlStyle} onChange={(v) => dispatch({ type: "setStarCatch", value: v })} />
          <Toggle theme={theme} label="Safeguard (15-17)" checked={calc.safeguard} disabled={tierActive} style={toggleControlStyle} onChange={(v) => dispatch({ type: "setSafeguard", value: v })} />
        </div>
      </div>

      <div className="sf-slider-row" style={optionRowStyle}>
        <span className="section-label" style={{ color: theme.muted, minWidth: 96, marginBottom: 0 }}>
          Enhancement Mode
        </span>
        <div className="sf-slider-controls" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input
            type="range"
            min={1}
            max={BOOM_TIER_COUNT}
            step={1}
            value={calc.boomTier}
            onChange={(e) => dispatch({ type: "setBoomTier", value: Number(e.target.value) })}
            aria-label="Enhancement Mode tier"
            style={{ width: 160, accentColor: theme.accent, cursor: "pointer" }}
          />
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: theme.text, minWidth: 28 }}>
            {calc.boomTier}×
          </span>
        </div>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
          {tierActive
            ? "Applies to 15★→22★. Higher tiers cost more for less destruction."
            : "1× is the normal rate. Drag right to trade higher cost for fewer booms (15★→22★)."}
        </span>
      </div>

      <div
        style={{
          ...previewBarBase,
          background: theme.timerBg,
          color: theme.muted,
        }}
      >
        <span>
          Next try: <span style={{ color: theme.text }}>{formatMesoFull(previewCost)} mesos</span>
        </span>
        {previewResult && (
          <>
            <span>
              Success: <span style={{ color: theme.text }}>{pct(previewResult.success)}</span>
            </span>
            {previewResult.destroy > 0 && (
              <span>
                Destroy: <span style={{ color: "#e05a5a" }}>{pct(previewResult.destroy)}</span>
              </span>
            )}
          </>
        )}
      </div>

      <ActionButton
        theme={theme}
        label="Simulate"
        fullWidth
        onClick={() => dispatch({ type: "reroll" })}
      />
    </div>
  );
}

// -- Main workspace -----------------------------------------------------------

export default function StarForceWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();

  const [calc, dispatch] = useReducer(
    (state: CalcState, action: CalcAction): CalcState => {
      switch (action.type) {
        case "setLevel": return { ...state, level: action.value };
        case "setStartStar": return { ...state, startStar: action.value };
        case "setTargetStar": return { ...state, targetStar: action.value };
        case "setReplacementCost": return { ...state, replacementCost: action.value };
        case "setCostDiscount": return { ...state, costDiscount: action.value };
        case "setBoomReduction": return { ...state, boomReduction: action.value };
        case "setStarCatch": return { ...state, starCatch: action.value };
        case "setSafeguard": return { ...state, safeguard: action.value };
        case "setMvp": return { ...state, mvp: action.value };
        case "setBoomTier": return { ...state, boomTier: action.value };
        case "setTrials": return { ...state, trials: action.value };
        case "reroll": return { ...state, simGen: state.simGen + 1 };
      }
    },
    {
      level: 200,
      startStar: 0,
      targetStar: 22,
      replacementCost: 0,
      costDiscount: false,
      boomReduction: false,
      starCatch: true,
      safeguard: false,
      mvp: "none" as MvpTier,
      boomTier: 1,
      trials: 1000,
      simGen: 0,
    },
  );

  const effectiveTarget = Math.max(calc.targetStar, calc.startStar + 1);

  // The 30% events stack with Enhancement Mode, but safeguard is ignored when a
  // tier above baseline is active (we can't assume that one stacks).
  const tierActive = calc.boomTier > 1;

  const opts: StarForceOpts = useMemo(
    () => ({
      level: calc.level,
      startStar: calc.startStar,
      targetStar: effectiveTarget,
      replacementCost: calc.replacementCost,
      costDiscount: calc.costDiscount,
      boomReduction: calc.boomReduction,
      starCatch: calc.starCatch,
      safeguard: tierActive ? false : calc.safeguard,
      mvp: calc.mvp,
      boomTier: calc.boomTier,
    }),
    [calc.level, calc.startStar, effectiveTarget, calc.replacementCost, calc.costDiscount, calc.boomReduction, calc.starCatch, calc.safeguard, calc.mvp, calc.boomTier, tierActive],
  );

  const results = useMemo(() => computeExpectedCosts(opts), [opts]);

  const sim = useMemo(() => {
    if (!mounted || calc.startStar >= effectiveTarget || calc.trials <= 0) return null;
    return simulate(opts, calc.trials);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, opts, calc.trials, calc.simGen]);

  const previewCost = useMemo(
    () => attemptCost(calc.level, calc.startStar, opts),
    [calc.level, calc.startStar, opts],
  );

  // Preview rates for the first star
  const previewResult = results.length > 0 ? results[0] : null;

  const styles = toolStyles(theme);
  const inputStyle: React.CSSProperties = { ...styles.inputStyle, ...controlSizeStyle };
  const selectStyle: React.CSSProperties = { ...styles.selectStyle, ...controlSizeStyle };

  return (
    <div className="page-content">
      <style>{`
        @media (max-width: 860px) {
          .sf-inputs-grid { grid-template-columns: 1fr !important; }
          .sf-input-row .tool-input, .sf-input-row .tool-select { flex: 1; min-width: 0; }
          .sf-option-row, .sf-slider-row { flex-direction: column; align-items: stretch !important; gap: 0.5rem; }
          .sf-option-row .tool-btn { width: 100%; }
          .sf-slider-row input[type="range"] { flex: 1; min-width: 0; }
        }
      `}</style>

      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Star Force Calculator"
          description="Enter your item level, current star, and target star, then run the simulation to see expected meso costs."
        />

        {/* -- Inputs + options --------------------------------------------- */}
        <StarForceForm
          theme={theme}
          calc={calc}
          dispatch={dispatch}
          previewCost={previewCost}
          previewResult={previewResult}
          inputStyle={inputStyle}
          selectStyle={selectStyle}
        />

        {/* -- Results ------------------------------------------------------- */}
        {calc.startStar < calc.targetStar && sim && (
          <SimulationPanel
            theme={theme}
            sim={sim}
            startStar={calc.startStar}
            targetStar={effectiveTarget}
            trials={calc.trials}
          />
        )}

        {calc.startStar < calc.targetStar && sim && (
          <HistogramPanel theme={theme} sim={sim} />
        )}

        {calc.startStar < calc.targetStar && results.length > 0 && (
          <BreakdownTable theme={theme} results={results} />
        )}
      </div>
    </div>
  );
}

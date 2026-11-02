"use client";

import { useReducer, useMemo, useState, useEffect, useEffectEvent } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import type { ChartOptions, ChartData, TooltipItem } from "chart.js";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { ToolHeader } from "../../../components/ToolHeader";
import { useLazyChart } from "../useLazyChart";
import {
  attemptCost,
  computeExpectedCosts,
  expectedAttempts,
  startSimulation,
  BOOM_TIER_COUNT,
  MAX_STAR,
  type StarForceOpts,
  type MvpTier,
  type StarResult,
  type SimulationResult,
  type SimulationRun,
} from "./star-force-data";
import { formatMeso, formatMesoFull } from "../format";
import { Toggle, PillGroup, ActionButton, ToolNumberInput } from "../shared-ui";
import { MVP_OPTIONS } from "../shared-data";
import { toolStyles } from "../tool-styles";
import { controlHeightStyle, dataTableTd, dataTableTh, statValueStyle, toggleControlStyle } from "../shared-styles";

// -- Helpers ------------------------------------------------------------------

const STAR_OPTIONS = Array.from({ length: MAX_STAR + 1 }, (_, i) => i);
const MAX_TRIALS = 100_000;

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

const compactFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatDuration(seconds: number): string {
  if (seconds < 1) return "under a second";
  if (seconds < 60) return `about ${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs === 0 ? `about ${mins}m` : `about ${mins}m ${secs}s`;
}

// Coarse throughput constant for the pre-run estimate. Measured around 80M
// attempts/sec; halved so the warning errs toward "slower than promised". Once
// a run starts, the remaining time is measured rather than guessed.
const ESTIMATED_ATTEMPTS_PER_SECOND = 40_000_000;

// Above this the run is worth warning about before it starts.
const HEAVY_RUN_SECONDS = 2;

// Time slice per animation frame. Long enough to make progress, short enough
// to leave the frame budget alone.
const FRAME_BUDGET_MS = 24;

// Every input and select is the same width, and every row's label sits in the
// same gutter (`.sf-label`), so the controls line up down a column and across
// both columns.
const CONTROL_WIDTH = 140;

// Same gap as an input row, so a row that opens with `.sf-label` starts its
// first control on the same vertical line as the textboxes above it.
const optionRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  alignItems: "center",
};

const previewBarBase: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  display: "flex",
  flexWrap: "wrap",
  gap: "1.25rem",
  fontSize: "0.75rem",
  fontWeight: 700,
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
      <span className="section-label sf-label" style={{ color: theme.muted, marginBottom: 0 }}>
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
  const boomRed = statusText(theme, "danger");
  const statStyle: React.CSSProperties = { flex: "1 1 140px" };
  const labelStyle: React.CSSProperties = { color: theme.muted };
  const valueStyle = statValueStyle(theme);

  return (
    <div className="fade-in panel-card" style={toolStyles(theme).sectionPanel}>
      <h2 className="tool-panel-title" style={{ color: theme.text, marginBottom: "0.25rem" }}>
        {startStar}★ → {targetStar}★ Simulation
      </h2>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, marginBottom: "1rem" }}>
        {trials.toLocaleString()} trials
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        <div style={statStyle}>
          <div className="tool-field-label" style={labelStyle}>Mean Cost</div>
          <div style={{ ...valueStyle, color: theme.accentText }}>{formatMeso(sim.meanCost)}</div>
          <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
            {formatMesoFull(sim.meanCost)} mesos
          </div>
        </div>
        <div style={statStyle}>
          <div className="tool-field-label" style={labelStyle}>Median Cost</div>
          <div style={valueStyle}>{formatMeso(sim.medianCost)}</div>
          <div style={{ fontSize: "0.75rem", color: theme.muted, fontWeight: 600 }}>
            {formatMesoFull(sim.medianCost)} mesos
          </div>
        </div>
        <div style={statStyle}>
          <div className="tool-field-label" style={labelStyle}>Mean Booms</div>
          <div style={{ ...valueStyle, color: sim.meanBooms > 0 ? boomRed : theme.text }}>
            {sim.meanBooms === 0 ? "0" : sim.meanBooms.toFixed(1)}
          </div>
        </div>
        <div style={statStyle}>
          <div className="tool-field-label" style={labelStyle}>Median Booms</div>
          <div style={{ ...valueStyle, color: sim.medianBooms > 0 ? boomRed : theme.text }}>
            {sim.medianBooms}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {([
          ["Best Case", sim.minCost],
          ["75th %ile", sim.p75Cost],
          ["85th %ile", sim.p85Cost],
          ["95th %ile", sim.p95Cost],
          ["Worst Case", sim.maxCost],
        ] as const).map(([label, value]) => (
          <div key={label} style={statStyle}>
            <div className="tool-field-label" style={labelStyle}>{label}</div>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.text }}>
              {formatMeso(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Histogram panel ----------------------------------------------------------

type HistMetric = "cost" | "booms";

const METRIC_OPTIONS: { value: HistMetric; label: string }[] = [
  { value: "cost", label: "Meso Cost" },
  { value: "booms", label: "Booms" },
];

const BIN_COUNT = 30;
// Beyond this many distinct boom counts, one bar per count stops being a chart.
// A 0★→28★ run can produce trials with 16,000 booms.
const MAX_BOOM_BARS = 40;

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

/** Equal-width bins across the value range (input sorted ascending). */
function buildRangeBins(sorted: Float64Array, format: (n: number) => string): Bins {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (max <= min) {
    const one = [sorted.length];
    return { labels: [format(min)], counts: one, rangeLabels: [format(min)], cumulative: one };
  }

  const width = (max - min) / BIN_COUNT;
  const counts = Array.from({ length: BIN_COUNT }, () => 0);
  for (const v of sorted) {
    counts[Math.min(BIN_COUNT - 1, Math.floor((v - min) / width))]++;
  }

  const labels: string[] = [];
  const rangeLabels: string[] = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const lo = min + i * width;
    labels.push(format(lo));
    rangeLabels.push(`${format(lo)} – ${format(lo + width)}`);
  }
  return { labels, counts, rangeLabels, cumulative: withCumulative(counts) };
}

/** One bar per integer boom count, unless the spread is too wide to draw. */
function buildBoomBins(sorted: Float64Array): Bins {
  const max = sorted[sorted.length - 1];
  if (max + 1 > MAX_BOOM_BARS) {
    return buildRangeBins(sorted, (n) => Math.round(n).toLocaleString());
  }

  const counts = Array.from({ length: max + 1 }, () => 0);
  for (const v of sorted) counts[v]++;
  const labels = counts.map((_, i) => String(i));
  return {
    labels,
    counts,
    rangeLabels: labels.map((l) => `${l} boom${l === "1" ? "" : "s"}`),
    cumulative: withCumulative(counts),
  };
}

/** The chart is a canvas. This is the same data, for screen readers.
 *
 *  `sr-only` goes on a wrapping div, never on the `<table>` itself. A table
 *  element generates two boxes: a wrapper box that takes `position` and the
 *  margins, and an inner table box that takes `width` / `height` / `overflow` /
 *  `clip-path`. The `<caption>` is laid out in the wrapper, *beside* the inner
 *  box, so hiding the table clips the rows and leaves the caption painting full
 *  size at the class's `left: 0`: down the left edge of the page, level with the
 *  chart. Firefox does exactly that; Chrome happens to clip it anyway. */
function HistogramTable({ bins, total, metric }: { bins: Bins; total: number; metric: HistMetric }) {
  return (
    <div className="sr-only">
      <table>
        <caption>{metric === "cost" ? "Meso cost" : "Boom count"} distribution across {total.toLocaleString()} trials</caption>
        <thead>
          <tr>
            <th scope="col">{metric === "cost" ? "Cost range" : "Booms"}</th>
            <th scope="col">Trials</th>
            <th scope="col">Share</th>
            <th scope="col">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {bins.counts.map((count, i) => (
            <tr key={bins.rangeLabels[i]}>
              <th scope="row">{bins.rangeLabels[i]}</th>
              <td>{count.toLocaleString()}</td>
              <td>{((count / total) * 100).toFixed(1)}%</td>
              <td>{((bins.cumulative[i] / total) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistogramPanel({ theme, sim }: { theme: AppTheme; sim: SimulationResult }) {
  const [metric, setMetric] = useState<HistMetric>("cost");
  const charts = useLazyChart(["Bar"], (c) => [
    c.CategoryScale,
    c.LinearScale,
    c.BarElement,
    c.Tooltip,
  ]);
  const Bar = charts?.Bar ?? null;

  const bins = useMemo(
    () => (metric === "cost" ? buildRangeBins(sim.costs, formatMeso) : buildBoomBins(sim.booms)),
    [metric, sim],
  );
  const total = sim.costs.length;

  const data: ChartData<"bar"> = useMemo(
    () => ({
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
    }),
    [bins, metric, theme.accent],
  );

  const options: ChartOptions<"bar"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.panel,
          titleColor: theme.text,
          bodyColor: theme.text,
          borderColor: theme.border,
          borderWidth: 1,
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
    }),
    [bins, total, theme.panel, theme.text, theme.border, theme.muted],
  );

  const chartLabel =
    metric === "cost"
      ? `Bar chart: meso cost distribution across ${total.toLocaleString()} trials, from ${formatMeso(sim.minCost)} to ${formatMeso(sim.maxCost)}.`
      : `Bar chart: boom count distribution across ${total.toLocaleString()} trials, from ${sim.booms[0]} to ${sim.booms[sim.booms.length - 1]} booms.`;

  return (
    <div
      className="fade-in panel-card"
      style={toolStyles(theme).sectionPanel}
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
        <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>
          {metric === "cost" ? "Cost Distribution" : "Boom Distribution"}
        </h2>
        <PillGroup theme={theme} options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
      </div>
      <div style={{ height: 280 }} role="img" aria-label={chartLabel}>
        {Bar ? <Bar data={data} options={options} /> : null}
      </div>
      <HistogramTable bins={bins} total={total} metric={metric} />
    </div>
  );
}

function BreakdownTable({ theme, results }: { theme: AppTheme; results: StarResult[] }) {
  const boomRed = statusText(theme, "danger");
  const thStyle: React.CSSProperties = { ...dataTableTh(theme), textAlign: "right" };
  const tdStyle: React.CSSProperties = { ...dataTableTd(theme), textAlign: "right" };

  return (
    <div
      className="fade-in panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        overflow: "hidden",
      }}
    >
      <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text, padding: "1.25rem 1.25rem 0.75rem" }}>
        Per-Star Breakdown
      </h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <th scope="col" style={{ ...thStyle, textAlign: "left" }}>Star</th>
              <th scope="col" style={thStyle}>Success</th>
              <th scope="col" style={thStyle}>Destroy</th>
              <th scope="col" style={thStyle}>Cost / Try</th>
              <th scope="col" style={thStyle}>Expected Cost</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.star}>
                <th scope="row" style={{ ...tdStyle, textAlign: "left", fontWeight: 700, color: theme.accentText }}>
                  {r.star}★ → {r.star + 1}★
                </th>
                <td style={tdStyle}>{pct(r.success)}</td>
                <td style={{ ...tdStyle, color: r.destroy > 0 ? boomRed : theme.muted }}>
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
  safeguard: boolean;
  mvp: MvpTier;
  boomTier: number;
  /** Raw text so the field can be emptied while typing. */
  trials: string;
}
type CalcAction =
  | { type: "setLevel"; value: number }
  | { type: "setStartStar"; value: number }
  | { type: "setTargetStar"; value: number }
  | { type: "setReplacementCost"; value: number }
  | { type: "setCostDiscount"; value: boolean }
  | { type: "setBoomReduction"; value: boolean }
  | { type: "setSafeguard"; value: boolean }
  | { type: "setMvp"; value: MvpTier }
  | { type: "setBoomTier"; value: number }
  | { type: "setTrials"; value: string };

function reducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "setLevel": return { ...state, level: action.value };
    // Target must stay above current; the dropdowns can't express otherwise.
    case "setStartStar": return { ...state, startStar: action.value, targetStar: Math.max(state.targetStar, action.value + 1) };
    case "setTargetStar": return { ...state, targetStar: Math.max(action.value, state.startStar + 1) };
    case "setReplacementCost": return { ...state, replacementCost: action.value };
    case "setCostDiscount": return { ...state, costDiscount: action.value };
    case "setBoomReduction": return { ...state, boomReduction: action.value };
    case "setSafeguard": return { ...state, safeguard: action.value };
    case "setMvp": return { ...state, mvp: action.value };
    case "setBoomTier": return { ...state, boomTier: action.value };
    case "setTrials": return { ...state, trials: action.value };
  }
}

function parseTrials(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MAX_TRIALS, n));
}

// -- Run controls -------------------------------------------------------------

type RunPhase =
  | { kind: "idle" }
  | { kind: "running"; run: SimulationRun; startedAt: number }
  | { kind: "done" }
  | { kind: "cancelled" };

interface RunEstimate {
  attempts: number;
  seconds: number;
  heavy: boolean;
}

function noteStyleFor(theme: AppTheme): React.CSSProperties {
  return { fontSize: "0.75rem", fontWeight: 600, color: theme.muted, lineHeight: 1.5 };
}

/** Drives the run one frame at a time. Owns the per-frame progress state so the
 *  workspace above it only re-renders when the run finishes. */
function SimulationProgress({
  theme,
  run,
  startedAt,
  trials,
  onFinished,
  onCancel,
  cancelStyle,
}: {
  theme: AppTheme;
  run: SimulationRun;
  startedAt: number;
  trials: number;
  onFinished: (result: SimulationResult) => void;
  onCancel: () => void;
  cancelStyle: React.CSSProperties;
}) {
  const [progress, setProgress] = useState({ completed: 0, elapsedMs: 0 });
  // Not a dependency: a fresh onFinished from a parent re-render must not restart the loop.
  const finish = useEffectEvent(onFinished);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const finished = run.step(FRAME_BUDGET_MS);
      setProgress({ completed: run.completed, elapsedMs: performance.now() - startedAt });
      if (finished) finish(run.result());
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, startedAt]);

  const { completed, elapsedMs } = progress;
  const fraction = trials > 0 ? completed / trials : 0;
  const remainingMs = completed > 0 ? (elapsedMs / completed) * (trials - completed) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <div
        role="progressbar"
        aria-label="Simulation progress"
        aria-valuemin={0}
        aria-valuemax={trials}
        aria-valuenow={completed}
        style={{ height: 6, borderRadius: 999, background: theme.timerBg, overflow: "hidden" }}
      >
        <div style={{ width: `${fraction * 100}%`, height: "100%", background: theme.accent }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={noteStyleFor(theme)}>
          Running {completed.toLocaleString()} of {trials.toLocaleString()} trials
          {remainingMs != null && completed > 20 ? `, ${formatDuration(remainingMs / 1000)} left` : ""}
        </span>
        <button type="button" className="tool-btn tool-dialog-btn" onClick={onCancel} style={cancelStyle}>
          Stop
        </button>
      </div>
    </div>
  );
}

function RunControls({
  theme,
  phase,
  trials,
  estimate,
  stale,
  onRun,
  onFinished,
  onCancel,
  cancelStyle,
}: {
  theme: AppTheme;
  phase: RunPhase;
  trials: number;
  estimate: RunEstimate;
  stale: boolean;
  onRun: () => void;
  onFinished: (result: SimulationResult) => void;
  onCancel: () => void;
  cancelStyle: React.CSSProperties;
}) {
  const noteStyle = noteStyleFor(theme);

  if (phase.kind === "running") {
    return (
      <SimulationProgress
        theme={theme}
        run={phase.run}
        startedAt={phase.startedAt}
        trials={trials}
        onFinished={onFinished}
        onCancel={onCancel}
        cancelStyle={cancelStyle}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <ActionButton
        theme={theme}
        label={phase.kind === "done" || phase.kind === "cancelled" ? "Run Simulation Again" : "Run Simulation"}
        fullWidth
        disabled={trials < 1}
        onClick={onRun}
      />
      {trials < 1 && <span style={noteStyle}>Enter a trial count between 1 and {MAX_TRIALS.toLocaleString()}.</span>}
      {trials >= 1 && estimate.heavy && (
        <span style={noteStyle}>
          Heavy run: roughly {compactFmt.format(estimate.attempts)} enhancement attempts,{" "}
          {formatDuration(estimate.seconds)}. You can stop it once it starts.
        </span>
      )}
      {stale && <span style={noteStyle}>Settings changed since the last run.</span>}
    </div>
  );
}

// -- Inputs + options panel ---------------------------------------------------

function StarForceForm({
  theme,
  calc,
  dispatch,
  previewCost,
  previewResult,
  inputStyle,
  selectStyle,
  runControls,
}: {
  theme: AppTheme;
  calc: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
  previewCost: number;
  previewResult: StarResult;
  inputStyle: React.CSSProperties;
  selectStyle: React.CSSProperties;
  runControls: React.ReactNode;
}) {
  // The 30% events stack with Enhancement Mode, but we don't assume safeguard
  // does — so only safeguard is disabled when a tier above baseline is active.
  const tierActive = calc.boomTier > 1;
  const boomRed = statusText(theme, "danger");
  const trials = parseTrials(calc.trials);

  return (
    <div
      className="fade-in panel-card"
      style={{
        ...toolStyles(theme).sectionPanel,
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* The panel's flex gap provides the spacing below, so the title's own margin is zeroed. */}
      <h2 className="tool-panel-title" style={{ margin: 0, color: theme.text }}>Star Force Settings</h2>
      <div className="sf-inputs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <InputRow label="Item Level" theme={theme}>
          <ToolNumberInput
            min={0}
            max={300}
            value={calc.level}
            onKeyDown={replaceZeroOnDigit}
            onCommit={(value) => dispatch({ type: "setLevel", value })}
            style={{ ...inputStyle, width: CONTROL_WIDTH }}
          />
        </InputRow>

        <InputRow label="Current Star" theme={theme}>
          <select
            className="tool-select"
            value={calc.startStar}
            onChange={(e) => dispatch({ type: "setStartStar", value: Number(e.target.value) })}
            style={{ ...selectStyle, width: CONTROL_WIDTH }}
          >
            {STAR_OPTIONS.slice(0, MAX_STAR).map((s) => (
              <option key={s} value={s}>{s}★</option>
            ))}
          </select>
        </InputRow>

        <InputRow label="Target Star" theme={theme}>
          <select
            className="tool-select"
            value={calc.targetStar}
            onChange={(e) => dispatch({ type: "setTargetStar", value: Number(e.target.value) })}
            style={{ ...selectStyle, width: CONTROL_WIDTH }}
          >
            {STAR_OPTIONS.filter((s) => s > calc.startStar).map((s) => (
              <option key={s} value={s}>{s}★</option>
            ))}
          </select>
        </InputRow>

        <InputRow label="Replace Cost" theme={theme}>
          {/* react-doctor-disable-next-line no-placeholder-only-field -- InputRow renders a wrapping <label>, so its visible "Replace Cost" text is this input's accessible name; the rule can't see through the component boundary. */}
          <input
            className="tool-input"
            type="number"
            min={0}
            value={calc.replacementCost}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={replaceZeroOnDigit}
            onChange={(e) => dispatch({ type: "setReplacementCost", value: Math.max(0, Number(e.target.value) || 0) })}
            style={{ ...inputStyle, width: CONTROL_WIDTH }}
            placeholder="0"
          />
        </InputRow>

        <InputRow label="Trials" theme={theme}>
          <input
            className="tool-input"
            type="number"
            min={1}
            max={MAX_TRIALS}
            value={calc.trials}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={replaceZeroOnDigit}
            onChange={(e) => dispatch({ type: "setTrials", value: e.target.value })}
            // Normalize on the way out, so clamping never fights the keystroke.
            onBlur={() => trials >= 1 && dispatch({ type: "setTrials", value: String(trials) })}
            style={{ ...inputStyle, width: CONTROL_WIDTH }}
          />
        </InputRow>

        <InputRow label="MVP" theme={theme}>
          <select
            className="tool-select"
            value={calc.mvp}
            onChange={(e) => dispatch({ type: "setMvp", value: e.target.value as MvpTier })}
            style={{ ...selectStyle, width: CONTROL_WIDTH }}
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
          <span className="section-label sf-label" style={{ color: theme.muted, marginBottom: 0 }}>
            Events
          </span>
          <Toggle theme={theme} label="30% Off" checked={calc.costDiscount} style={toggleControlStyle} onChange={(v) => dispatch({ type: "setCostDiscount", value: v })} />
          <Toggle theme={theme} label="30% Boom Reduction" checked={calc.boomReduction} style={toggleControlStyle} onChange={(v) => dispatch({ type: "setBoomReduction", value: v })} />
        </div>
        <div className="sf-option-row" style={optionRowStyle}>
          <span className="section-label sf-label" style={{ color: theme.muted, marginBottom: 0 }}>
            Options
          </span>
          <Toggle theme={theme} label="Safeguard (15-17)" checked={calc.safeguard} disabled={tierActive} style={toggleControlStyle} onChange={(v) => dispatch({ type: "setSafeguard", value: v })} />
        </div>
      </div>

      <div className="sf-slider-row" style={optionRowStyle}>
        <span className="section-label" style={{ color: theme.muted, marginBottom: 0, whiteSpace: "nowrap" }}>
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
            aria-valuetext={`Tier ${calc.boomTier}`}
            style={{ width: 160, accentColor: theme.accent, cursor: "pointer" }}
          />
          <span style={{ fontSize: "0.82rem", fontWeight: 800, color: theme.text, minWidth: 52 }}>
            Tier {calc.boomTier}
          </span>
        </div>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted }}>
          {tierActive
            ? "Applies to 15★→22★. Higher tiers cost more for less destruction."
            : "Tier 1 is the normal rate. Drag right to trade higher cost for fewer booms (15★→22★)."}
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
        <span>
          Success: <span style={{ color: theme.text }}>{pct(previewResult.success)}</span>
        </span>
        {previewResult.destroy > 0 && (
          <span>
            Destroy: <span style={{ color: boomRed }}>{pct(previewResult.destroy)}</span>
          </span>
        )}
      </div>

      {runControls}
    </div>
  );
}

// -- Main workspace -----------------------------------------------------------

interface SimSnapshot {
  startStar: number;
  targetStar: number;
  trials: number;
}

function simulationSummary(sim: SimulationResult, snapshot: SimSnapshot): string {
  return (
    `Simulation complete. ${snapshot.trials.toLocaleString()} trials from ${snapshot.startStar} to ${snapshot.targetStar} stars. ` +
    `Mean cost ${formatMesoFull(sim.meanCost)} mesos, median ${formatMesoFull(sim.medianCost)} mesos, ` +
    `mean ${sim.meanBooms.toFixed(1)} booms.`
  );
}

export default function StarForceWorkspace({ theme }: { theme: AppTheme }) {
  const [calc, dispatch] = useReducer(reducer, {
    level: 200,
    startStar: 0,
    targetStar: 22,
    replacementCost: 0,
    costDiscount: false,
    boomReduction: false,
    safeguard: false,
    mvp: "none" as MvpTier,
    boomTier: 1,
    trials: "1000",
  });

  const trials = parseTrials(calc.trials);

  // The 30% events stack with Enhancement Mode, but safeguard is ignored when a
  // tier above baseline is active (we can't assume that one stacks).
  const tierActive = calc.boomTier > 1;

  const opts: StarForceOpts = useMemo(
    () => ({
      level: calc.level,
      startStar: calc.startStar,
      targetStar: calc.targetStar,
      replacementCost: calc.replacementCost,
      costDiscount: calc.costDiscount,
      boomReduction: calc.boomReduction,
      safeguard: tierActive ? false : calc.safeguard,
      mvp: calc.mvp,
      boomTier: calc.boomTier,
    }),
    [calc.level, calc.startStar, calc.targetStar, calc.replacementCost, calc.costDiscount, calc.boomReduction, calc.safeguard, calc.mvp, calc.boomTier, tierActive],
  );

  // Closed form, cheap, always live. Only the Monte Carlo run is gated.
  const results = useMemo(() => computeExpectedCosts(opts), [opts]);
  const previewCost = useMemo(() => attemptCost(calc.level, calc.startStar, opts), [calc.level, calc.startStar, opts]);
  const previewResult = results[0];

  const estimate: RunEstimate = useMemo(() => {
    const attempts = expectedAttempts(opts) * trials;
    const seconds = attempts / ESTIMATED_ATTEMPTS_PER_SECOND;
    return { attempts, seconds, heavy: seconds >= HEAVY_RUN_SECONDS };
  }, [opts, trials]);

  // A run is a snapshot: it keeps the settings it started with, and goes stale
  // when they change underneath it.
  const settingsKey = useMemo(() => JSON.stringify([opts, trials]), [opts, trials]);

  const [phase, setPhase] = useState<RunPhase>({ kind: "idle" });
  const [sim, setSim] = useState<SimulationResult | null>(null);
  const [snapshot, setSnapshot] = useState<SimSnapshot | null>(null);
  const [runKey, setRunKey] = useState("");

  const handleRun = () => {
    if (trials < 1) return;
    setSim(null);
    setSnapshot({ startStar: calc.startStar, targetStar: calc.targetStar, trials });
    setRunKey(settingsKey);
    setPhase({ kind: "running", run: startSimulation(opts, trials), startedAt: performance.now() });
  };

  const handleFinished = (result: SimulationResult) => {
    setSim(result);
    setPhase({ kind: "done" });
  };

  const handleCancel = () => setPhase({ kind: "cancelled" });

  const styles = toolStyles(theme);
  const inputStyle: React.CSSProperties = { ...styles.inputStyle, ...controlHeightStyle };
  const selectStyle: React.CSSProperties = { ...styles.selectStyle, ...controlHeightStyle };

  const stale = phase.kind === "done" && runKey !== settingsKey;
  const showResults = sim !== null && snapshot !== null;

  const announcement = (() => {
    if (phase.kind === "cancelled") return "Simulation stopped.";
    if (phase.kind === "done" && sim && snapshot) return simulationSummary(sim, snapshot);
    return "";
  })();

  const emptyNoteStyle: React.CSSProperties = {
    ...styles.sectionPanel,
    fontSize: "0.82rem",
    fontWeight: 600,
    color: theme.muted,
    lineHeight: 1.5,
  };

  return (
    <div className="page-content">
      <style>{`
        /* Shared gutter, so the first control of every row in a column starts on
           the same vertical line. Sized for the longest label that uses it,
           "Current Star" / "Replace Cost"; nowrap keeps a row one line high if a
           font swap overruns it. The Enhancement Mode row opts out: its label is
           wider than the gutter, and it spans the panel rather than a column. */
        .sf-label { width: 116px; flex-shrink: 0; white-space: nowrap; }

        @media (max-width: 860px) {
          .sf-inputs-grid { grid-template-columns: 1fr !important; }
          .sf-input-row .tool-input, .sf-input-row .tool-select { flex: 1; min-width: 0; }
          .sf-option-row, .sf-slider-row { flex-direction: column; align-items: stretch !important; gap: 0.5rem; }
          .sf-option-row .sf-label { width: auto; }
          .sf-option-row .tool-btn { width: 100%; }
          .sf-slider-row input[type="range"] { flex: 1; min-width: 0; }
        }
      `}</style>

      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Star Force Calculator"
          description="Expected meso and booms for a single star force run, from a full simulation."
        />

        <StarForceForm
          theme={theme}
          calc={calc}
          dispatch={dispatch}
          previewCost={previewCost}
          previewResult={previewResult}
          inputStyle={inputStyle}
          selectStyle={selectStyle}
          runControls={
            <RunControls
              theme={theme}
              phase={phase}
              trials={trials}
              estimate={estimate}
              stale={stale}
              onRun={handleRun}
              onFinished={handleFinished}
              onCancel={handleCancel}
              cancelStyle={styles.dialogBtnStyle}
            />
          }
        />

        <p className="sr-only" role="status">{announcement}</p>

        {showResults ? (
          <>
            <SimulationPanel
              theme={theme}
              sim={sim}
              startStar={snapshot.startStar}
              targetStar={snapshot.targetStar}
              trials={snapshot.trials}
            />
            <HistogramPanel theme={theme} sim={sim} />
          </>
        ) : (
          <div className="fade-in panel-card" style={emptyNoteStyle}>
            {phase.kind === "cancelled"
              ? "Simulation stopped before it finished. Run it again, or lower the trial count or target star."
              : "Run the simulation to see the cost distribution, percentiles, and boom counts. The per-star breakdown below is exact and needs no simulation."}
          </div>
        )}

        <BreakdownTable theme={theme} results={results} />
      </div>
    </div>
  );
}

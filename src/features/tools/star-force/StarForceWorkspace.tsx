"use client";

import { useReducer, useMemo, useSyncExternalStore } from "react";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import {
  attemptCost,
  computeExpectedCosts,
  simulate,
  formatMeso,
  formatMesoFull,
  type StarForceOpts,
  type MvpTier,
  type StarResult,
  type SimulationResult,
} from "./star-force-data";
import { Toggle, PillGroup, MVP_OPTIONS } from "../shared-ui";
import { toolStyles } from "../tool-styles";

// -- Helpers ------------------------------------------------------------------

const STAR_OPTIONS = Array.from({ length: 31 }, (_, i) => i);

function pct(n: number): string {
  if (n === 0) return "—";
  return (n * 100).toFixed(1) + "%";
}

const rerollBtnStyle: React.CSSProperties = {
  padding: "7px 16px",
  borderRadius: "10px",
  fontSize: "0.8rem",
  fontWeight: 800,
  userSelect: "none",
};

const previewBarBase: React.CSSProperties = {
  marginTop: "1rem",
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
  gap: "0.75rem",
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
    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span
        className="section-label"
        style={{ color: theme.muted, minWidth: 130, marginBottom: 0 }}
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
  | { type: "setTrials"; value: number }
  | { type: "reroll" };

// -- Inputs panel -------------------------------------------------------------

function StarForceInputs({
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
      <div className="sf-inputs-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <InputRow label="Item Level" theme={theme}>
          <input
            className="tool-input"
            type="number"
            min={0}
            max={300}
            value={calc.level}
            onChange={(e) => dispatch({ type: "setLevel", value: Math.max(0, Math.min(300, Number(e.target.value) || 0)) })}
            style={inputStyle}
          />
        </InputRow>

        <InputRow label="Current Star" theme={theme}>
          <select
            className="tool-input"
            value={calc.startStar}
            onChange={(e) => dispatch({ type: "setStartStar", value: Number(e.target.value) })}
            style={selectStyle}
          >
            {STAR_OPTIONS.slice(0, 30).map((s) => (
              <option key={s} value={s}>{s}★</option>
            ))}
          </select>
        </InputRow>

        <InputRow label="Target Star" theme={theme}>
          <select
            className="tool-input"
            value={calc.targetStar}
            onChange={(e) => dispatch({ type: "setTargetStar", value: Number(e.target.value) })}
            style={selectStyle}
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
            onChange={(e) => dispatch({ type: "setReplacementCost", value: Math.max(0, Number(e.target.value) || 0) })}
            style={inputStyle}
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
            onChange={(e) => dispatch({ type: "setTrials", value: Math.max(1, Math.min(100000, Number(e.target.value) || 1000)) })}
            style={inputStyle}
          />
        </InputRow>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            className="tool-btn"
            role="button"
            tabIndex={0}
            onClick={() => dispatch({ type: "reroll" })}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dispatch({ type: "reroll" }); } }}
            style={{
              ...rerollBtnStyle,
              color: theme.accentText,
              background: theme.accentSoft,
              border: `1px solid ${theme.accent}`,
            }}
          >
            Re-roll
          </div>
        </div>
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
    </div>
  );
}

// -- Options panel ------------------------------------------------------------

function StarForceOptions({
  theme,
  calc,
  dispatch,
}: {
  theme: AppTheme;
  calc: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
}) {
  return (
    <div
      className="fade-in panel-card"
      style={{
        ...optionsPanelBase,
        background: theme.panel,
        border: `1px solid ${theme.border}`,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <span
          className="section-label"
          style={{ color: theme.muted, marginBottom: 0, minWidth: 60 }}
        >
          Events
        </span>
        <Toggle theme={theme} label="30% Off Cost" checked={calc.costDiscount} onChange={(v) => dispatch({ type: "setCostDiscount", value: v })} />
        <Toggle theme={theme} label="30% Boom Reduction" checked={calc.boomReduction} onChange={(v) => dispatch({ type: "setBoomReduction", value: v })} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <span
          className="section-label"
          style={{ color: theme.muted, marginBottom: 0, minWidth: 60 }}
        >
          Options
        </span>
        <Toggle theme={theme} label="Star Catching" checked={calc.starCatch} onChange={(v) => dispatch({ type: "setStarCatch", value: v })} />
        <Toggle
          theme={theme}
          label="Safeguard (15-17)"
          checked={calc.safeguard}
          onChange={(v) => dispatch({ type: "setSafeguard", value: v })}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <span
          className="section-label"
          style={{ color: theme.muted, marginBottom: 0, minWidth: 60 }}
        >
          MVP
        </span>
        <PillGroup theme={theme} options={MVP_OPTIONS} value={calc.mvp} onChange={(v) => dispatch({ type: "setMvp", value: v })} />
      </div>
    </div>
  );
}

// -- Main workspace -----------------------------------------------------------

export default function StarForceWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

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
      trials: 1000,
      simGen: 0,
    },
  );

  const effectiveTarget = Math.max(calc.targetStar, calc.startStar + 1);

  const opts: StarForceOpts = useMemo(
    () => ({
      level: calc.level,
      startStar: calc.startStar,
      targetStar: effectiveTarget,
      replacementCost: calc.replacementCost,
      costDiscount: calc.costDiscount,
      boomReduction: calc.boomReduction,
      starCatch: calc.starCatch,
      safeguard: calc.safeguard,
      mvp: calc.mvp,
    }),
    [calc.level, calc.startStar, effectiveTarget, calc.replacementCost, calc.costDiscount, calc.boomReduction, calc.starCatch, calc.safeguard, calc.mvp],
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
  const inputStyle: React.CSSProperties = { ...styles.inputStyle, width: 110 };
  const selectStyle: React.CSSProperties = { ...styles.selectStyle, width: 90 };

  return (
    <div className="sf-main" style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}>
      <style>{`
        .tool-btn { transition: background 0.15s, border-color 0.15s; cursor: pointer; }
        @media (max-width: 860px) {
          .sf-inputs-grid { grid-template-columns: 1fr !important; }
          .sf-main { padding: 1rem !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <ToolHeader
          theme={theme}
          title="Star Force Calculator"
          description="Enter your item level, current star, and target star, then run the simulation to see expected meso costs."
        />

        {/* -- Inputs -------------------------------------------------------- */}
        <StarForceInputs
          theme={theme}
          calc={calc}
          dispatch={dispatch}
          previewCost={previewCost}
          previewResult={previewResult}
          inputStyle={inputStyle}
          selectStyle={selectStyle}
        />

        {/* -- Options ------------------------------------------------------- */}
        <StarForceOptions theme={theme} calc={calc} dispatch={dispatch} />

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

        {calc.startStar < calc.targetStar && results.length > 0 && (
          <BreakdownTable theme={theme} results={results} />
        )}
      </div>
    </div>
  );
}

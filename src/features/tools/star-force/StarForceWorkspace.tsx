"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
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
import { Toggle, PillGroup } from "../shared-ui";

// -- Helpers ------------------------------------------------------------------

const STAR_OPTIONS = Array.from({ length: 31 }, (_, i) => i);

function pct(n: number): string {
  if (n === 0) return "—";
  return (n * 100).toFixed(1) + "%";
}

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
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <label
        className="section-label"
        style={{ color: theme.muted, minWidth: 130, marginBottom: 0 }}
      >
        {label}
      </label>
      {children}
    </div>
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
          <div style={{ fontSize: "0.72rem", color: theme.muted, fontWeight: 600 }}>
            {formatMesoFull(sim.meanCost)} mesos
          </div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>Median Cost</div>
          <div style={valueStyle}>{formatMeso(sim.medianCost)}</div>
          <div style={{ fontSize: "0.72rem", color: theme.muted, fontWeight: 600 }}>
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

// -- Main workspace -----------------------------------------------------------

const MVP_OPTIONS: { value: MvpTier; label: string }[] = [
  { value: "none", label: "None" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "diamond", label: "Diamond" },
];

export default function StarForceWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const [level, setLevel] = useState(200);
  const [startStar, setStartStar] = useState(0);
  const [targetStar, setTargetStar] = useState(22);
  const [replacementCost, setReplacementCost] = useState(0);
  const [costDiscount, setCostDiscount] = useState(false);
  const [boomReduction, setBoomReduction] = useState(false);
  const [starCatch, setStarCatch] = useState(true);
  const [safeguard, setSafeguard] = useState(false);
  const [mvp, setMvp] = useState<MvpTier>("none");
  const [trials, setTrials] = useState(1000);
  const [simGen, setSimGen] = useState(0);

  const effectiveTarget = Math.max(targetStar, startStar + 1);

  const opts: StarForceOpts = useMemo(
    () => ({
      level,
      startStar,
      targetStar: effectiveTarget,
      replacementCost,
      costDiscount,
      boomReduction,
      starCatch,
      safeguard,
      mvp,
    }),
    [level, startStar, effectiveTarget, replacementCost, costDiscount, boomReduction, starCatch, safeguard, mvp],
  );

  const results = useMemo(() => computeExpectedCosts(opts), [opts]);

  const sim = useMemo(() => {
    if (!mounted || startStar >= effectiveTarget || trials <= 0) return null;
    return simulate(opts, trials);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, opts, trials, simGen]);

  const previewCost = useMemo(
    () => attemptCost(level, startStar, opts),
    [level, startStar, opts],
  );

  // Preview rates for the first star
  const previewResult = results.length > 0 ? results[0] : null;

  const inputStyle: React.CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontSize: "0.82rem",
    fontWeight: 700,
    borderRadius: "8px",
    padding: "7px 10px",
    width: 110,
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, width: 90, cursor: "pointer" };

  return (
    <div style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}>
      <style>{`
        .tool-btn { transition: background 0.15s, border-color 0.15s; cursor: pointer; }
        @media (max-width: 860px) {
          .sf-inputs-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <ToolHeader
          theme={theme}
          title="Star Force Calculator"
          description="Estimate the expected meso cost to star force your equipment."
        />

        {/* -- Inputs -------------------------------------------------------- */}
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
                value={level}
                onChange={(e) => setLevel(Math.max(0, Math.min(300, Number(e.target.value) || 0)))}
                style={inputStyle}
              />
            </InputRow>

            <InputRow label="Current Star" theme={theme}>
              <select
                className="tool-input"
                value={startStar}
                onChange={(e) => setStartStar(Number(e.target.value))}
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
                value={targetStar}
                onChange={(e) => setTargetStar(Number(e.target.value))}
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
                value={replacementCost}
                onChange={(e) => setReplacementCost(Math.max(0, Number(e.target.value) || 0))}
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
                value={trials}
                onChange={(e) => setTrials(Math.max(1, Math.min(100000, Number(e.target.value) || 1000)))}
                style={inputStyle}
              />
            </InputRow>

            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                className="tool-btn"
                onClick={() => setSimGen((g) => g + 1)}
                style={{
                  padding: "7px 16px",
                  borderRadius: "10px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  color: theme.accentText,
                  background: theme.accentSoft,
                  border: `1px solid ${theme.accent}`,
                  userSelect: "none",
                }}
              >
                Re-roll
              </div>
            </div>
          </div>

          {/* Next attempt preview */}
          <div
            style={{
              marginTop: "1rem",
              padding: "10px 14px",
              background: theme.timerBg,
              borderRadius: "10px",
              display: "flex",
              flexWrap: "wrap",
              gap: "1.25rem",
              fontSize: "0.78rem",
              fontWeight: 700,
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

        {/* -- Options ------------------------------------------------------- */}
        <div
          className="fade-in panel-card"
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            padding: "1.25rem",
            marginBottom: "1.25rem",
            borderRadius: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {/* Events row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <span
              className="section-label"
              style={{ color: theme.muted, marginBottom: 0, minWidth: 60 }}
            >
              Events
            </span>
            <Toggle theme={theme} label="30% Off Cost" checked={costDiscount} onChange={setCostDiscount} />
            <Toggle theme={theme} label="30% Boom Reduction" checked={boomReduction} onChange={setBoomReduction} />
          </div>

          {/* Enhancements row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <span
              className="section-label"
              style={{ color: theme.muted, marginBottom: 0, minWidth: 60 }}
            >
              Options
            </span>
            <Toggle theme={theme} label="Star Catching" checked={starCatch} onChange={setStarCatch} />
            <Toggle
              theme={theme}
              label="Safeguard (15-17)"
              checked={safeguard}
              onChange={setSafeguard}
            />
          </div>

          {/* MVP row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <span
              className="section-label"
              style={{ color: theme.muted, marginBottom: 0, minWidth: 60 }}
            >
              MVP
            </span>
            <PillGroup theme={theme} options={MVP_OPTIONS} value={mvp} onChange={setMvp} />
          </div>
        </div>

        {/* -- Results ------------------------------------------------------- */}
        {startStar < targetStar && sim && (
          <SimulationPanel
            theme={theme}
            sim={sim}
            startStar={startStar}
            targetStar={effectiveTarget}
            trials={trials}
          />
        )}

        {startStar < targetStar && results.length > 0 && (
          <BreakdownTable theme={theme} results={results} />
        )}
      </div>
    </div>
  );
}

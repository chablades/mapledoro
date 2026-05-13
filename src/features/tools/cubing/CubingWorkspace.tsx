"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import {
  type CubeKey,
  type ItemCategory,
  ITEM_CATEGORIES,
  CUBE_TYPES,
  TIERS,
  STAT_TYPES,
  MAX_CUBE_TIER,
  TIER_RATES,
  TIER_RATES_DMT,
  buildStatOptions,
  translateDesiredStat,
  geoDistrQuantile,
  getTierUpCosts,
  cubingCost,
} from "./cubing-types";
import { getProbability } from "./cubing-engine";
import { toolStyles } from "../tool-styles";

interface TierStep {
  from: string;
  to: string;
  probability: number;
}

interface CalcResult {
  mesoMean: number;
  mesoMedian: number;
  meso75: number;
  meso85: number;
  meso95: number;
  cubeMean: number;
  cubeMedian: number;
  cube75: number;
  cube85: number;
  cube95: number;
  cubeType: CubeKey;
  probability: number;
  tierSteps: TierStep[];
}

const TIER_PILL: Record<number, { bg: string; text: string }> = {
  0: { bg: "#4a9eff", text: "#fff" },
  1: { bg: "#b566ff", text: "#fff" },
  2: { bg: "#ffb800", text: "#3a2400" },
  3: { bg: "#22aa44", text: "#fff" },
};

export default function CubingWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);

  const [itemType, setItemType] = useState<ItemCategory>("shoes");
  const [cubeType, setCubeType] = useState<CubeKey>("red");
  const [currentTier, setCurrentTier] = useState(3);
  const [desiredTier, setDesiredTier] = useState(3);
  const [itemLevel, setItemLevel] = useState(150);
  const [statType, setStatType] = useState("normal");
  const [desiredStat, setDesiredStat] = useState("any");
  const [dmt, setDmt] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);

  const canPickStat = currentTier === desiredTier;
  const levelValid = itemLevel > 70;

  const statOptions = useMemo(
    () => canPickStat ? buildStatOptions(itemType, cubeType, desiredTier, itemLevel, statType) : [],
    [itemType, cubeType, desiredTier, itemLevel, statType, canPickStat],
  );

  const groupedOptions = useMemo(() => {
    const groups: { label: string; options: { value: string; label: string }[] }[] = [];
    const map = new Map<string, { label: string; options: { value: string; label: string }[] }>();
    for (const opt of statOptions) {
      let group = map.get(opt.group);
      if (!group) {
        group = { label: opt.group, options: [] };
        map.set(opt.group, group);
        groups.push(group);
      }
      group.options.push(opt);
    }
    return groups;
  }, [statOptions]);

  function handleCurrentTierChange(val: number) {
    setCurrentTier(val);
    if (desiredTier < val) setDesiredTier(val);
    setDesiredStat("any");
  }

  function handleDesiredTierChange(val: number) {
    setDesiredTier(val);
    if (currentTier > val) setCurrentTier(val);
    setDesiredStat("any");
  }

  function handleCalculate() {
    if (!levelValid) return;
    const isAny = desiredStat === "any";
    const input = isAny ? undefined : translateDesiredStat(desiredStat);
    const p = isAny ? 1 : getProbability(desiredTier, input!, itemType, cubeType, itemLevel);
    const tierUp = getTierUpCosts(currentTier, desiredTier, cubeType, dmt);

    const rates = dmt ? TIER_RATES_DMT : TIER_RATES;
    const tierSteps: TierStep[] = [];
    for (let i = currentTier; i < desiredTier; i++) {
      const prob = rates[cubeType][i];
      if (prob != null) {
        tierSteps.push({ from: TIERS[i].label, to: TIERS[i + 1].label, probability: prob });
      }
    }

    const stats = isAny
      ? { mean: 0, median: 0, seventy_fifth: 0, eighty_fifth: 0, ninety_fifth: 0 }
      : geoDistrQuantile(p);

    const mean = Math.round(stats.mean) + tierUp.mean;
    const median = Math.round(stats.median) + tierUp.median;
    const s75 = Math.round(stats.seventy_fifth) + tierUp.seventy_fifth;
    const s85 = Math.round(stats.eighty_fifth) + tierUp.eighty_fifth;
    const s95 = Math.round(stats.ninety_fifth) + tierUp.ninety_fifth;

    setResult({
      cubeMean: mean,
      cubeMedian: median,
      cube75: s75,
      cube85: s85,
      cube95: s95,
      mesoMean: cubingCost(cubeType, itemLevel, mean),
      mesoMedian: cubingCost(cubeType, itemLevel, median),
      meso75: cubingCost(cubeType, itemLevel, s75),
      meso85: cubingCost(cubeType, itemLevel, s85),
      meso95: cubingCost(cubeType, itemLevel, s95),
      cubeType,
      probability: p,
      tierSteps,
    });
  }

  if (!mounted) return null;

  const styles = toolStyles(theme);

  const selectStyle: React.CSSProperties = {
    ...styles.selectStyle,
    width: "100%",
    padding: "8px 10px",
    appearance: "auto" as const,
  };

  const labelStyle = styles.labelStyle;

  const panelStyle: React.CSSProperties = {
    ...styles.sectionPanel,
    borderRadius: "18px",
  };

  const cubeLabel = CUBE_TYPES.find((c) => c.value === result?.cubeType)?.label ?? result?.cubeType;

  return (
    <div className="cubing-main" style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}>
      <style>{`
        @media (max-width: 640px) {
          .cubing-results { grid-template-columns: 1fr !important; }
          .cubing-tier-pills { gap: 4px !important; }
          .cubing-tier-pill { padding: 6px 8px !important; font-size: 0.72rem !important; }
        }
        @media (max-width: 860px) {
          .cubing-main { padding: 1rem !important; }
        }
        .cubing-tier-pill:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

      `}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <ToolHeader
          theme={theme}
          title="Cubing Calculator"
          description="Select your item category, cube type, and item level, then choose your current and desired tier to see expected costs."
        />

        <div className="fade-in" style={panelStyle}>
          <div style={{ ...labelStyle, marginBottom: "12px", fontSize: "0.78rem" }}>
            Cubing Information
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
            <Field label="Item Category" style={labelStyle}>
              <select
                value={itemType}
                onChange={(e) => { setItemType(e.target.value as ItemCategory); setDesiredStat("any"); }}
                style={selectStyle}
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Cube Type" style={labelStyle}>
              <select value={cubeType} onChange={(e) => {
                const next = e.target.value as CubeKey;
                const max = MAX_CUBE_TIER[next];
                setCubeType(next);
                if (currentTier > max) setCurrentTier(max);
                if (desiredTier > max) setDesiredTier(max);
                setDesiredStat("any");
              }} style={selectStyle}>
                {CUBE_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Item Level" style={labelStyle}>
              <input
                type="number"
                value={itemLevel}
                onChange={(e) => { setItemLevel(Number(e.target.value)); setDesiredStat("any"); }}
                min={71}
                style={{ ...selectStyle, appearance: "auto" as const }}
              />
            </Field>
          </div>
        </div>

        <div className="fade-in" style={panelStyle}>
          <div style={{ ...labelStyle, marginBottom: "12px", fontSize: "0.78rem" }}>
            Tier Progression
          </div>
          <div style={{ marginBottom: "8px" }}>
            <div style={{ ...labelStyle, marginBottom: "6px" }}>Current Tier</div>
            <TierPills theme={theme} selected={currentTier} maxTier={MAX_CUBE_TIER[cubeType]} onChange={handleCurrentTierChange} />
          </div>
          <TierPathLabel currentTier={currentTier} desiredTier={desiredTier} muted={theme.muted} />
          <div>
            <div style={{ ...labelStyle, marginBottom: "6px" }}>Desired Tier</div>
            <TierPills theme={theme} selected={desiredTier} maxTier={MAX_CUBE_TIER[cubeType]} onChange={handleDesiredTierChange} />
          </div>
        </div>

        <div className="fade-in" style={panelStyle}>
          <div style={{ ...labelStyle, marginBottom: "12px", fontSize: "0.78rem" }}>
            Desired Stats
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
            <Field label="Stat Type" style={labelStyle}>
              <select
                value={statType}
                onChange={(e) => { setStatType(e.target.value); setDesiredStat("any"); }}
                disabled={!canPickStat}
                style={{ ...selectStyle, opacity: canPickStat ? 1 : 0.5 }}
              >
                {STAT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Desired Stat" style={labelStyle}>
              <DesiredStatSelect
                levelValid={levelValid}
                canPickStat={canPickStat}
                desiredStat={desiredStat}
                groupedOptions={groupedOptions}
                selectStyle={selectStyle}
                onChangeStat={setDesiredStat}
              />
            </Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 700, color: theme.text, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={dmt}
                onChange={(e) => setDmt(e.target.checked)}
                style={{ accentColor: theme.accent }}
              />
              Double Miracle Time
            </label>
            <button
              onClick={handleCalculate}
              disabled={!levelValid}
              className="tool-btn"
              style={{
                padding: "10px 28px",
                borderRadius: "10px",
                border: `1px solid ${theme.accent}`,
                background: theme.accent,
                color: "#fff",
                fontSize: "0.85rem",
                fontWeight: 800,
                cursor: levelValid ? "pointer" : "not-allowed",
                opacity: levelValid ? 1 : 0.5,
                marginLeft: "auto",
              }}
            >
              Calculate
            </button>
          </div>
        </div>

        {result && (
          <div className="fade-in">
            {result.tierSteps.length > 0 && (
              <TierUpProbabilities theme={theme} steps={result.tierSteps} />
            )}
            {result.probability < 1 && (
              <ProbabilityBadge theme={theme} probability={result.probability} />
            )}
            <div className="cubing-results" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <ResultCard
                theme={theme}
                title="Meso Cost"
                heroValue={formatMesoShort(result.mesoMean)}
                heroLabel="Average cost"
                rows={[
                  { label: "Median", value: result.mesoMedian },
                  { label: "75th percentile", value: result.meso75 },
                  { label: "85th percentile", value: result.meso85 },
                  { label: "95th percentile", value: result.meso95 },
                ]}
                format={(n: number) => `${n.toLocaleString()} mesos`}
              />
              <ResultCard
                theme={theme}
                title={`${cubeLabel} Cubes`}
                heroValue={result.cubeMean.toLocaleString()}
                heroLabel="Average cubes"
                rows={[
                  { label: "Median", value: result.cubeMedian },
                  { label: "75th percentile", value: result.cube75 },
                  { label: "85th percentile", value: result.cube85 },
                  { label: "95th percentile", value: result.cube95 },
                ]}
                format={(n: number) => n.toLocaleString()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TierPills({ theme, selected, maxTier, onChange }: {
  theme: AppTheme;
  selected: number;
  maxTier: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="cubing-tier-pills" style={{ display: "flex", gap: "6px" }}>
      {TIERS.map((t) => {
        const sel = selected === t.value;
        const disabled = t.value > maxTier;
        const tc = TIER_PILL[t.value];
        return (
          <button
            key={t.value}
            onClick={() => !disabled && onChange(t.value)}
            className="cubing-tier-pill"
            style={{
              flex: 1,
              padding: "8px 14px",
              borderRadius: "10px",
              border: `2px solid ${sel ? tc.bg : theme.border}`,
              background: sel ? tc.bg : "transparent",
              color: sel ? tc.text : theme.muted,
              fontSize: "0.78rem",
              fontWeight: 800,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.35 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function TierPathLabel({ currentTier, desiredTier, muted }: { currentTier: number; desiredTier: number; muted: string }) {
  const steps = desiredTier - currentTier;
  let text: string;
  if (steps <= 0) text = `Rerolling at ${TIERS[currentTier].label}`;
  else if (steps === 1) text = "↓ 1 tier-up step";
  else text = `↓ ${steps} tier-up steps`;
  return (
    <div style={{ textAlign: "center", color: muted, fontSize: "0.75rem", fontWeight: 700, margin: "6px 0" }}>
      {text}
    </div>
  );
}

function Field({ label, style, children }: { label: string; style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div>
      <div style={style}>{label}</div>
      {children}
    </div>
  );
}

function ProbabilityBadge({ theme, probability }: { theme: AppTheme; probability: number }) {
  const pct = probability * 100;
  const display = pct >= 0.01 ? `${pct.toFixed(2)}%` : `${pct.toExponential(2)}%`;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "1rem",
      padding: "14px 20px",
      borderRadius: "14px",
      background: theme.panel,
      border: `1px solid ${theme.border}`,
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Probability per cube
        </div>
        <div style={{ marginTop: "4px" }}>
          <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accent }}>
            {display}
          </span>
        </div>
      </div>
    </div>
  );
}

function TierUpProbabilities({ theme, steps }: { theme: AppTheme; steps: TierStep[] }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "24px",
      marginBottom: "1rem",
      padding: "14px 20px",
      borderRadius: "14px",
      background: theme.panel,
      border: `1px solid ${theme.border}`,
      flexWrap: "wrap",
    }}>
      {steps.map((step) => {
        const pct = step.probability * 100;
        const display = pct >= 0.01 ? `${pct.toFixed(2)}%` : `${pct.toExponential(2)}%`;
        return (
          <div key={`${step.from}-${step.to}`} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {step.from} → {step.to}
            </div>
            <div style={{ marginTop: "4px" }}>
              <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accent }}>
                {display}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultCard({
  theme,
  title,
  heroValue,
  heroLabel,
  rows,
  format,
}: {
  theme: AppTheme;
  title: string;
  heroValue: string;
  heroLabel: string;
  rows: { label: string; value: number }[];
  format: (n: number) => string;
}) {
  return (
    <div
      className="panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: "18px",
        padding: "1.25rem",
      }}
    >
      <div style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {title}
      </div>
      <div style={{ margin: "8px 0 16px" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: theme.text, lineHeight: 1.1 }}>
          {heroValue}
        </div>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted, marginTop: "2px" }}>
          {heroLabel}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {rows.map((row) => (
          <div key={row.label} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: theme.muted,
            background: theme.timerBg,
            borderRadius: "8px",
            padding: "6px 10px",
          }}>
            <span>{row.label}</span>
            <span style={{ color: theme.accent, fontWeight: 800 }}>{format(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function trimTrailingZero(v: string): string {
  return v.endsWith(".0") ? v.slice(0, -2) : v;
}

function formatMesoShort(n: number): string {
  if (n >= 1_000_000_000) return `${trimTrailingZero((n / 1_000_000_000).toFixed(1))}B mesos`;
  if (n >= 1_000_000) return `${trimTrailingZero((n / 1_000_000).toFixed(1))}M mesos`;
  return `${n.toLocaleString()} mesos`;
}

function DesiredStatSelect({
  levelValid,
  canPickStat,
  desiredStat,
  groupedOptions,
  selectStyle,
  onChangeStat,
}: {
  levelValid: boolean;
  canPickStat: boolean;
  desiredStat: string;
  groupedOptions: { label: string; options: { value: string; label: string }[] }[];
  selectStyle: React.CSSProperties;
  onChangeStat: (v: string) => void;
}) {
  if (!levelValid) {
    return (
      <select disabled style={{ ...selectStyle, opacity: 0.5 }}>
        <option>Item level must be greater than 71</option>
      </select>
    );
  }
  if (!canPickStat) {
    return (
      <select disabled style={{ ...selectStyle, opacity: 0.5 }}>
        <option value="any">Any</option>
      </select>
    );
  }
  return (
    <select value={desiredStat} onChange={(e) => onChangeStat(e.target.value)} style={selectStyle}>
      <option value="any">Any</option>
      {groupedOptions.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

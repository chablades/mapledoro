"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import type { AppTheme } from "../../../components/themes";
import { ToolHeader } from "../../../components/ToolHeader";
import {
  type CubeKey,
  type ItemCategory,
  type QuantileResult,
  ITEM_CATEGORIES,
  CUBE_TYPES,
  TIERS,
  STAT_TYPES,
  MAX_CUBE_TIER,
  buildStatOptions,
  translateDesiredStat,
  geoDistrQuantile,
  getTierUpCosts,
  cubingCost,
} from "./cubing-types";
import { getProbability } from "./cubing-engine";

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
}

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

  const canPickStat = currentTier === desiredTier && MAX_CUBE_TIER[cubeType] >= desiredTier;
  const levelValid = itemLevel > 70;

  const statOptions = useMemo(
    () => canPickStat ? buildStatOptions(itemType, cubeType, desiredTier, itemLevel, statType) : [],
    [itemType, cubeType, desiredTier, itemLevel, statType, canPickStat],
  );

  const groupedOptions = useMemo(() => {
    const groups: { label: string; options: { value: string; label: string }[] }[] = [];
    const seen = new Set<string>();
    for (const opt of statOptions) {
      if (!seen.has(opt.group)) {
        seen.add(opt.group);
        groups.push({ label: opt.group, options: [] });
      }
      groups.find((g) => g.label === opt.group)!.options.push(opt);
    }
    return groups;
  }, [statOptions]);

  function handleCurrentTierChange(val: number) {
    setCurrentTier(val);
    if (desiredTier < val) setDesiredTier(val);
    setDesiredStat("any");
    autoPickCube(val, Math.max(desiredTier, val));
  }

  function handleDesiredTierChange(val: number) {
    setDesiredTier(val);
    if (currentTier > val) setCurrentTier(val);
    setDesiredStat("any");
    autoPickCube(Math.min(currentTier, val), val);
  }

  function autoPickCube(cur: number, des: number) {
    const tieringUp = cur !== des;
    if (tieringUp) {
      if (MAX_CUBE_TIER[cubeType] >= des) return;
      setCubeType(des === 1 ? "master" : "black");
    } else {
      if (des === 1) setCubeType("occult");
      else if (des === 2) setCubeType("master");
      else if (des === 3) setCubeType("red");
    }
  }

  function handleCalculate() {
    if (!levelValid) return;
    const isAny = desiredStat === "any";
    const input = isAny ? undefined : translateDesiredStat(desiredStat);
    const p = isAny ? 1 : getProbability(desiredTier, input!, itemType, cubeType, itemLevel);
    const tierUp = getTierUpCosts(currentTier, desiredTier, cubeType, dmt);

    let stats: QuantileResult;
    if (isAny) {
      stats = { mean: 0, median: 0, seventy_fifth: 0, eighty_fifth: 0, ninety_fifth: 0 };
    } else {
      stats = geoDistrQuantile(p);
    }

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
    });
  }

  if (!mounted) return null;

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "8px",
    border: `1px solid ${theme.border}`,
    background: theme.timerBg,
    color: theme.text,
    fontSize: "0.82rem",
    fontWeight: 700,
    appearance: "auto" as const,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.72rem",
    fontWeight: 800,
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "4px",
  };

  const panelStyle: React.CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: "18px",
    padding: "1.25rem",
    marginBottom: "1.25rem",
  };

  const cubeLabel = CUBE_TYPES.find((c) => c.value === result?.cubeType)?.label ?? result?.cubeType;

  return (
    <div style={{ flex: 1, width: "100%", padding: "1.5rem 1.5rem 2rem 2.75rem" }}>
      <style>{`
        @media (max-width: 640px) {
          .cubing-results { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <ToolHeader
          theme={theme}
          title="Cubing Calculator"
          description="Calculate the expected cost and number of cubes to achieve your desired potential."
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
              <select value={cubeType} onChange={(e) => { setCubeType(e.target.value as CubeKey); setDesiredStat("any"); }} style={selectStyle}>
                {CUBE_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Current Tier" style={labelStyle}>
              <select value={currentTier} onChange={(e) => handleCurrentTierChange(Number(e.target.value))} style={selectStyle}>
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
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
            Desired Stats
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
            <Field label="Desired Tier" style={labelStyle}>
              <select value={desiredTier} onChange={(e) => handleDesiredTierChange(Number(e.target.value))} style={selectStyle}>
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Stat Type" style={labelStyle}>
              <select value={statType} onChange={(e) => { setStatType(e.target.value); setDesiredStat("any"); }} style={selectStyle}>
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
          <div className="fade-in cubing-results" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <ResultCard theme={theme} title="Meso Estimate">
              <ResultRow label="Average cost" value={formatMeso(result.mesoMean)} />
              <ResultRow label="Median cost" value={formatMeso(result.mesoMedian)} />
              <ResultDivider theme={theme} />
              <ResultRow label="75% chance within" value={formatMeso(result.meso75)} />
              <ResultRow label="85% chance within" value={formatMeso(result.meso85)} />
              <ResultRow label="95% chance within" value={formatMeso(result.meso95)} />
            </ResultCard>

            <ResultCard theme={theme} title="Cube Estimate">
              <ResultRow label="Average cubes" value={`${result.cubeMean.toLocaleString()} ${cubeLabel} cubes`} />
              <ResultRow label="Median cubes" value={`${result.cubeMedian.toLocaleString()} ${cubeLabel} cubes`} />
              <ResultDivider theme={theme} />
              <ResultRow label="75% chance within" value={`${result.cube75.toLocaleString()} ${cubeLabel} cubes`} />
              <ResultRow label="85% chance within" value={`${result.cube85.toLocaleString()} ${cubeLabel} cubes`} />
              <ResultRow label="95% chance within" value={`${result.cube95.toLocaleString()} ${cubeLabel} cubes`} />
            </ResultCard>
          </div>
        )}
      </div>
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

function ResultCard({ theme, title, children }: { theme: AppTheme; title: string; children: React.ReactNode }) {
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
      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: theme.text, marginBottom: "10px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ResultDivider({ theme }: { theme: AppTheme }) {
  return <div style={{ borderTop: `1px solid ${theme.border}`, margin: "8px 0" }} />;
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px" }}>
      <span style={{ opacity: 0.7 }}>{label}: </span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function formatMeso(n: number): string {
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

"use client";

import { useState, useMemo, useReducer } from "react";
import { useMounted } from "../../../lib/useMounted";
import type { AppTheme } from "../../../components/themes";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { Field, Toggle, ActionButton } from "../shared-ui";
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
  meso75: number;
  meso85: number;
  meso95: number;
  cubeMean: number;
  cube75: number;
  cube85: number;
  cube95: number;
  cubeType: CubeKey;
  probability: number;
  tierSteps: TierStep[];
}

interface FormState {
  itemType: ItemCategory;
  cubeType: CubeKey;
  currentTier: number;
  desiredTier: number;
  itemLevel: number;
  statType: string;
  desiredStat: string;
  dmt: boolean;
}

type FormAction =
  | { type: "setItemType"; value: ItemCategory }
  | { type: "setCubeType"; value: CubeKey }
  | { type: "setCurrentTier"; value: number }
  | { type: "setDesiredTier"; value: number }
  | { type: "setItemLevel"; value: number }
  | { type: "setStatType"; value: string }
  | { type: "setDesiredStat"; value: string }
  | { type: "setDmt"; value: boolean };

/** Keep the chosen desired stat across form changes; reset to "any" only when
 *  it's no longer a valid option (e.g. armor ↔ WSE swaps, tier mismatch). */
function withValidDesiredStat(s: FormState): FormState {
  if (s.desiredStat === "any") return s;
  const stillValid =
    s.currentTier === s.desiredTier &&
    s.itemLevel > 70 &&
    buildStatOptions(s.itemType, s.cubeType, s.desiredTier, s.itemLevel, s.statType)
      .some((o) => o.value === s.desiredStat);
  return stillValid ? s : { ...s, desiredStat: "any" };
}

function formReducer(s: FormState, a: FormAction): FormState {
  switch (a.type) {
    case "setItemType":
      return withValidDesiredStat({ ...s, itemType: a.value });
    case "setCubeType": {
      const max = MAX_CUBE_TIER[a.value];
      return withValidDesiredStat({
        ...s,
        cubeType: a.value,
        currentTier: s.currentTier > max ? max : s.currentTier,
        desiredTier: s.desiredTier > max ? max : s.desiredTier,
      });
    }
    case "setCurrentTier":
      return withValidDesiredStat({
        ...s,
        currentTier: a.value,
        desiredTier: s.desiredTier < a.value ? a.value : s.desiredTier,
      });
    case "setDesiredTier":
      return withValidDesiredStat({
        ...s,
        desiredTier: a.value,
        currentTier: s.currentTier > a.value ? a.value : s.currentTier,
      });
    case "setItemLevel":
      return withValidDesiredStat({ ...s, itemLevel: a.value });
    case "setStatType":
      return withValidDesiredStat({ ...s, statType: a.value });
    case "setDesiredStat":
      return { ...s, desiredStat: a.value };
    case "setDmt":
      return { ...s, dmt: a.value };
  }
}

const FORM_INIT: FormState = {
  itemType: "shoes",
  cubeType: "red",
  currentTier: 3,
  desiredTier: 3,
  itemLevel: 150,
  statType: "normal",
  desiredStat: "any",
  dmt: false,
};

export default function CubingWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();

  const [form, dispatch] = useReducer(formReducer, FORM_INIT);
  const { itemType, cubeType, currentTier, desiredTier, itemLevel, statType, desiredStat, dmt } = form;
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
      ? { mean: 0, seventy_fifth: 0, eighty_fifth: 0, ninety_fifth: 0 }
      : geoDistrQuantile(p);

    const mean = Math.round(stats.mean) + tierUp.mean;
    const s75 = Math.round(stats.seventy_fifth) + tierUp.seventy_fifth;
    const s85 = Math.round(stats.eighty_fifth) + tierUp.eighty_fifth;
    const s95 = Math.round(stats.ninety_fifth) + tierUp.ninety_fifth;

    setResult({
      cubeMean: mean,
      cube75: s75,
      cube85: s85,
      cube95: s95,
      mesoMean: cubingCost(cubeType, itemLevel, mean),
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
    height: "35px", // pin: Chrome gives <select> a taller intrinsic line box than <input>
    padding: "8px 10px",
    appearance: "auto" as const,
  };

  const labelStyle = styles.labelStyle;

  const panelStyle: React.CSSProperties = {
    ...styles.sectionPanel,
    borderRadius: "18px",
  };

  const fieldRowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "12px",
  };

  const cubeLabel = CUBE_TYPES.find((c) => c.value === result?.cubeType)?.label ?? result?.cubeType;

  return (
    <div className="page-content">
      <style>{`
        @media (max-width: 640px) {
          .cubing-results { grid-template-columns: 1fr !important; }
          .cubing-actions { flex-direction: column; }
          .cubing-actions .tool-btn { width: 100%; height: 40px; margin-left: 0 !important; }
        }
      `}</style>
      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Cubing Calculator"
          description="Select your item category, cube type, and item level, then choose your current and desired tier to see expected costs."
        />

        <div className="fade-in" style={panelStyle}>
          <div className="tool-field-label" style={{ ...labelStyle, marginBottom: "12px", fontSize: "0.78rem" }}>
            Cubing Information
          </div>
          <div style={fieldRowStyle}>
            <Field label="Item Category" style={labelStyle}>
              <select
                className="tool-select"
                value={itemType}
                onChange={(e) => dispatch({ type: "setItemType", value: e.target.value as ItemCategory })}
                style={selectStyle}
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Cube Type" style={labelStyle}>
              <select className="tool-select" value={cubeType} onChange={(e) => dispatch({ type: "setCubeType", value: e.target.value as CubeKey })} style={selectStyle}>
                {CUBE_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Item Level" style={labelStyle}>
              <input
                className="tool-input"
                type="number"
                value={itemLevel}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={replaceZeroOnDigit}
                onChange={(e) => dispatch({ type: "setItemLevel", value: Number(e.target.value) })}
                min={71}
                style={{ ...selectStyle, appearance: "auto" as const }}
              />
            </Field>
          </div>
          <div style={fieldRowStyle}>
            <Field label="Current Tier" style={labelStyle}>
              <select
                className="tool-select"
                value={currentTier}
                onChange={(e) => dispatch({ type: "setCurrentTier", value: Number(e.target.value) })}
                style={selectStyle}
              >
                {TIERS.filter((t) => t.value <= MAX_CUBE_TIER[cubeType]).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Desired Tier" style={labelStyle}>
              <select
                className="tool-select"
                value={desiredTier}
                onChange={(e) => dispatch({ type: "setDesiredTier", value: Number(e.target.value) })}
                style={selectStyle}
              >
                {TIERS.filter((t) => t.value <= MAX_CUBE_TIER[cubeType]).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <div style={fieldRowStyle}>
            <Field label="Stat Type" style={labelStyle}>
              <select
                className="tool-select"
                value={statType}
                onChange={(e) => dispatch({ type: "setStatType", value: e.target.value })}
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
                onChangeStat={(v) => dispatch({ type: "setDesiredStat", value: v })}
              />
            </Field>
          </div>
          <div className="cubing-actions" style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "4px", flexWrap: "wrap" }}>
            <Toggle
              theme={theme}
              label="Double Miracle Time"
              checked={dmt}
              disabled={currentTier === desiredTier}
              onChange={(v) => dispatch({ type: "setDmt", value: v })}
              style={{ alignSelf: "stretch", minWidth: "190px" }}
            />
            <ActionButton
              theme={theme}
              label="Calculate"
              disabled={!levelValid}
              onClick={handleCalculate}
              style={{ marginLeft: "auto" }}
            />
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
                heroValue={`${result.mesoMean.toLocaleString()} mesos`}
                heroLabel="Average cost"
                rows={[
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

function formatPctFull(pct: number): string {
  if (pct >= 0.01) return `${pct.toFixed(4)}%`;
  const s = pct.toPrecision(4);
  return `${parseFloat(s)}%`;
}

function ProbabilityBadge({ theme, probability }: { theme: AppTheme; probability: number }) {
  const pct = probability * 100;
  const display = formatPctFull(pct);

  const containerStyle: React.CSSProperties = {
    marginBottom: "1rem",
    background: theme.panel,
    border: `1px solid ${theme.border}`,
  };

  return (
    <div className="result-banner" style={containerStyle}>
      <div style={{ textAlign: "center" }}>
        <div className="tool-field-label" style={{ color: theme.muted, marginBottom: 0 }}>
          Probability per cube
        </div>
        <div style={{ marginTop: "4px" }}>
          <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accentText }}>
            {display}
          </span>
        </div>
      </div>
    </div>
  );
}

function TierUpProbabilities({ theme, steps }: { theme: AppTheme; steps: TierStep[] }) {
  const containerStyle: React.CSSProperties = {
    gap: "24px",
    marginBottom: "1rem",
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    flexWrap: "wrap",
  };

  return (
    <div className="result-banner" style={containerStyle}>
      {steps.map((step) => {
        const pct = step.probability * 100;
        const display = formatPctFull(pct);
        return (
          <div key={`${step.from}-${step.to}`} style={{ textAlign: "center" }}>
            <div className="tool-field-label" style={{ color: theme.muted, marginBottom: 0 }}>
              {step.from} → {step.to}
            </div>
            <div style={{ marginTop: "4px" }}>
              <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accentText }}>
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
  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: theme.muted,
    background: theme.timerBg,
    borderRadius: "8px",
    padding: "6px 10px",
  };

  return (
    <div
      className="panel-card"
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        padding: "1.25rem",
      }}
    >
      <div className="tool-field-label" style={{ color: theme.muted, marginBottom: 0 }}>
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
          <div key={row.label} style={rowStyle}>
            <span>{row.label}</span>
            <span style={{ color: theme.accentText, fontWeight: 800 }}>{format(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
      <select className="tool-select" disabled style={{ ...selectStyle, opacity: 0.5 }}>
        <option>Item level must be greater than 71</option>
      </select>
    );
  }
  if (!canPickStat) {
    return (
      <select className="tool-select" disabled style={{ ...selectStyle, opacity: 0.5 }}>
        <option value="any">Any</option>
      </select>
    );
  }
  return (
    <select className="tool-select" value={desiredStat} onChange={(e) => onChangeStat(e.target.value)} style={selectStyle}>
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

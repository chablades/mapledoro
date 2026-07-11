"use client";

import { useDeferredValue, useId, useMemo, useReducer, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { Field, Toggle } from "../shared-ui";
import { ToolHeader } from "../../../components/ToolHeader";
import { formatCount, formatMesoFull, formatPct } from "../format";
import { toolStyles } from "../tool-styles";
import { getProbability } from "./cubing-engine";
import {
  availableDesiredTiers,
  buildStatOptions,
  cubingCost,
  CUBE_TYPES,
  DMT_CUBES,
  geoDistrQuantile,
  getTierUpCosts,
  ITEM_CATEGORIES,
  MAX_ITEM_LEVEL,
  MIN_ITEM_LEVEL,
  STAT_TYPES,
  TIERS,
  tierUpSteps,
  translateDesiredStat,
  type CubeKey,
  type ItemCategory,
  type QuantileResult,
  type TierStep,
} from "./cubing-types";

// -- State --------------------------------------------------------------------

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

/** Pull the tiers back into the range this cube has rate tables for, and keep
 *  the current tier at or below the desired one. The available tiers are always
 *  contiguous, so first and last bound the range. */
function withValidTiers(s: FormState): FormState {
  const allowed = availableDesiredTiers(s.itemType, s.cubeType);
  const min = allowed[0];
  const max = allowed[allowed.length - 1];
  const desiredTier = Math.min(Math.max(s.desiredTier, min), max);
  const currentTier = Math.min(s.currentTier, desiredTier);
  if (desiredTier === s.desiredTier && currentTier === s.currentTier) return s;
  return { ...s, desiredTier, currentTier };
}

/** Keep the chosen desired stat across form changes, resetting to "any" only
 *  when it's genuinely no longer offered (armor ↔ WSE swaps, a tier-up, or the
 *  level-160 bonus shifting every line amount). Deliberately does *not* look at
 *  whether the level is in range: a level typed one digit at a time passes
 *  through invalid values, and dropping the stat on the way would lose it. */
function withValidDesiredStat(s: FormState): FormState {
  if (s.desiredStat === "any") return s;
  const stillValid =
    s.currentTier === s.desiredTier &&
    buildStatOptions(s.itemType, s.cubeType, s.desiredTier, s.itemLevel, s.statType)
      .some((o) => o.value === s.desiredStat);
  return stillValid ? s : { ...s, desiredStat: "any" };
}

const normalize = (s: FormState): FormState => withValidDesiredStat(withValidTiers(s));

function formReducer(s: FormState, a: FormAction): FormState {
  switch (a.type) {
    case "setItemType":
      return normalize({ ...s, itemType: a.value });
    case "setCubeType":
      return normalize({ ...s, cubeType: a.value, dmt: s.dmt && DMT_CUBES.has(a.value) });
    case "setCurrentTier":
      return normalize({ ...s, currentTier: a.value });
    case "setDesiredTier":
      return normalize({ ...s, desiredTier: a.value });
    case "setItemLevel":
      return normalize({ ...s, itemLevel: a.value });
    case "setStatType":
      return normalize({ ...s, statType: a.value });
    case "setDesiredStat":
      return { ...s, desiredStat: a.value };
    case "setDmt":
      return { ...s, dmt: a.value };
  }
}

// -- Calculation --------------------------------------------------------------

interface ResultRow {
  label: string;
  cubes: number;
  meso: number;
}

type Outcome =
  | { status: "invalidLevel" }
  | { status: "nothingToDo" }
  | { status: "impossible" }
  | { status: "ok"; probability: number; tierSteps: TierStep[]; rows: ResultRow[] };

const ROW_LABELS = ["Average", "75th percentile", "85th percentile", "95th percentile"];

const NO_STAT_COST: QuantileResult = { mean: 0, median: 0, seventy_fifth: 0, eighty_fifth: 0, ninety_fifth: 0 };

function computeOutcome(f: FormState): Outcome {
  if (f.itemLevel < MIN_ITEM_LEVEL || f.itemLevel > MAX_ITEM_LEVEL) return { status: "invalidLevel" };

  const isAny = f.desiredStat === "any";
  const tieringUp = f.currentTier < f.desiredTier;
  // No stat to hit and no tier to climb: there is nothing to spend cubes on.
  if (isAny && !tieringUp) return { status: "nothingToDo" };

  const probability = isAny
    ? 1
    : getProbability(f.desiredTier, translateDesiredStat(f.desiredStat), f.itemType, f.cubeType, f.itemLevel);
  if (probability <= 0) return { status: "impossible" };

  // Rolling for "any" potential costs nothing of its own; only the tier ups are paid for.
  const statCost = isAny ? NO_STAT_COST : geoDistrQuantile(probability);
  const tierUp = getTierUpCosts(f.currentTier, f.desiredTier, f.cubeType, f.dmt);

  const counts = [
    Math.round(statCost.mean) + tierUp.mean,
    Math.round(statCost.seventy_fifth) + tierUp.seventy_fifth,
    Math.round(statCost.eighty_fifth) + tierUp.eighty_fifth,
    Math.round(statCost.ninety_fifth) + tierUp.ninety_fifth,
  ];

  return {
    status: "ok",
    probability,
    tierSteps: tierUpSteps(f.currentTier, f.desiredTier, f.cubeType, f.dmt),
    rows: counts.map((cubes, i) => ({
      label: ROW_LABELS[i],
      cubes,
      meso: cubingCost(f.cubeType, f.itemLevel, cubes),
    })),
  };
}

/** Why the Double Miracle Time toggle is off, or null when it's available. The
 *  event doubles tier-up rates for Glowing and Bright cubes only, and tier-up
 *  rates are the only thing it touches. */
function dmtDisabledReason(cubeType: CubeKey, tieringUp: boolean): string | null {
  if (!DMT_CUBES.has(cubeType)) {
    return "Double Miracle Time does not affect this cube. It only doubles tier up rates for Glowing and Bright cubes.";
  }
  if (!tieringUp) return "Double Miracle Time only affects tier ups. Raise the desired tier to use it.";
  return null;
}

/** Spoken summary for the live region. Screen readers get the headline numbers
 *  rather than the whole table re-read on every change. */
function resultsStatusText(outcome: Outcome, cubeLabel: string): string {
  switch (outcome.status) {
    case "invalidLevel":
      return `Enter an item level between ${MIN_ITEM_LEVEL} and ${MAX_ITEM_LEVEL} to see cube costs.`;
    case "nothingToDo":
      return "Choose a desired stat, or a higher desired tier, to see cube costs.";
    case "impossible":
      return "The desired stat is not reachable with these settings.";
    case "ok": {
      const average = outcome.rows[0];
      const parts: string[] = [];
      if (outcome.probability < 1) parts.push(`Probability ${formatPct(outcome.probability * 100)} per cube.`);
      parts.push(`Average ${formatCount(average.cubes)} ${cubeLabel} cubes, about ${formatMesoFull(average.meso)} mesos.`);
      return parts.join(" ");
    }
  }
}

// -- Results ------------------------------------------------------------------

function SummaryRow({ theme, label, value, style }: {
  theme: AppTheme;
  label: string;
  value: string;
  style: CSSProperties;
}) {
  return (
    <div style={style}>
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>{label}</span>
      <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accentText }}>{value}</span>
    </div>
  );
}

function ResultsTable({ theme, rows, cubeLabel }: { theme: AppTheme; rows: ResultRow[]; cubeLabel: string }) {
  const headCell: CSSProperties = {
    padding: "6px 10px",
    fontSize: "0.75rem",
    fontWeight: 700,
    color: theme.muted,
    borderBottom: `1px solid ${theme.border}`,
    whiteSpace: "nowrap",
  };
  const rowHeadCell: CSSProperties = {
    padding: "9px 10px",
    fontSize: "0.82rem",
    fontWeight: 700,
    textAlign: "left",
    whiteSpace: "nowrap",
  };
  const valueCell: CSSProperties = {
    padding: "9px 10px",
    textAlign: "right",
    color: theme.text,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <caption className="sr-only">Cubes needed, and their meso cost, by outcome</caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...headCell, textAlign: "left" }}>Outcome</th>
            <th scope="col" style={{ ...headCell, textAlign: "right" }}>{cubeLabel} cubes</th>
            <th scope="col" style={{ ...headCell, textAlign: "right" }}>Meso cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            // The average is the answer people came for; the percentiles qualify it.
            const isAverage = i === 0;
            const value: CSSProperties = {
              ...valueCell,
              fontWeight: isAverage ? 800 : 600,
              fontSize: isAverage ? "0.95rem" : "0.82rem",
            };
            return (
              <tr key={row.label} style={{ background: isAverage ? theme.timerBg : "transparent" }}>
                <th scope="row" style={{ ...rowHeadCell, color: isAverage ? theme.text : theme.muted }}>
                  {row.label}
                </th>
                <td style={value}>{formatCount(row.cubes)}</td>
                <td style={value}>{formatMesoFull(row.meso)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultsBody({ theme, outcome, cubeLabel, summaryRowStyle }: {
  theme: AppTheme;
  outcome: Outcome;
  cubeLabel: string;
  summaryRowStyle: CSSProperties;
}) {
  const messageStyle: CSSProperties = { fontSize: "0.82rem", fontWeight: 600, color: theme.muted, margin: 0, lineHeight: 1.5 };

  if (outcome.status === "invalidLevel") {
    return (
      <p style={messageStyle}>
        Enter an item level between {MIN_ITEM_LEVEL} and {MAX_ITEM_LEVEL} to see how many cubes it takes.
      </p>
    );
  }

  if (outcome.status === "nothingToDo") {
    return (
      <p style={messageStyle}>
        Pick a desired stat, or raise the desired tier above the current one, to see how many cubes it takes.
      </p>
    );
  }

  if (outcome.status === "impossible") {
    return (
      <p style={messageStyle}>
        No potential outcome reaches this stat with these settings. Try a lower target, a higher item level, or a
        different cube.
      </p>
    );
  }

  return (
    <>
      {outcome.tierSteps.map((step) => (
        <SummaryRow
          key={`${step.from}-${step.to}`}
          theme={theme}
          label={`${step.from} → ${step.to} per cube`}
          value={formatPct(step.probability * 100)}
          style={summaryRowStyle}
        />
      ))}
      {outcome.probability < 1 && (
        <SummaryRow
          theme={theme}
          label="Desired stat per cube"
          value={formatPct(outcome.probability * 100)}
          style={summaryRowStyle}
        />
      )}
      <div style={{ marginTop: "1rem" }}>
        <ResultsTable theme={theme} rows={outcome.rows} cubeLabel={cubeLabel} />
      </div>
    </>
  );
}

// -- Main workspace -----------------------------------------------------------

export default function CubingWorkspace({ theme }: { theme: AppTheme }) {
  const uid = useId();
  const [form, dispatch] = useReducer(formReducer, FORM_INIT);
  const { itemType, cubeType, currentTier, desiredTier, itemLevel, statType, desiredStat, dmt } = form;

  // The engine walks every line-1/2/3 combination. Deferring lets React paint the
  // typed character before recomputing against the settled form.
  const deferred = useDeferredValue(form);
  const outcome = useMemo(() => computeOutcome(deferred), [deferred]);

  const canPickStat = currentTier === desiredTier;
  const levelValid = itemLevel >= MIN_ITEM_LEVEL && itemLevel <= MAX_ITEM_LEVEL;

  const desiredTierOptions = useMemo(() => availableDesiredTiers(itemType, cubeType), [itemType, cubeType]);
  const currentTierOptions = TIERS.filter((t) => t.value <= desiredTier);

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

  const styles = toolStyles(theme);
  const labelStyle = styles.labelStyle;
  // Height pinned here, not on `.tool-select`: Chrome gives a <select> a taller
  // intrinsic line box than an <input>, and this form puts them side by side.
  const controlStyle: CSSProperties = { ...styles.selectStyle, width: "100%", height: "35px" };
  const panelStyle: CSSProperties = { ...styles.sectionPanel, borderRadius: "18px" };

  // Tinted region, not a bordered box: a card inside a card is always wrong.
  const summaryRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    background: theme.timerBg,
    borderRadius: "10px",
    padding: "10px 14px",
    marginBottom: "0.5rem",
  };

  const hintStyle: CSSProperties = { margin: "4px 0 0", fontSize: "0.75rem", fontWeight: 600, color: theme.muted, lineHeight: 1.4 };
  const errorStyle: CSSProperties = { ...hintStyle, fontWeight: 700, color: statusText(theme, "danger") };

  const cubeLabel = CUBE_TYPES.find((c) => c.value === deferred.cubeType)?.label ?? deferred.cubeType;

  const tieringUp = currentTier < desiredTier;
  const dmtHint = dmtDisabledReason(cubeType, tieringUp);

  const levelId = `${uid}-item-level`;
  const levelErrorId = `${uid}-item-level-error`;
  const statId = `${uid}-desired-stat`;
  const statHintId = `${uid}-desired-stat-hint`;

  return (
    <div className="page-content">
      <style>{`
        @media (max-width: 860px) {
          .cubing-fields { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 560px) {
          .cubing-fields { grid-template-columns: 1fr !important; }
          .cubing-toggle-row .tool-btn { width: 100%; }
        }
      `}</style>

      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Cubing Calculator"
          description="Select your item category, cube type, and item level, then choose your current and desired tier to see expected costs."
        />

        <section className="fade-in" style={panelStyle}>
          <h2 className="tool-panel-title" style={{ color: theme.text }}>Cube Settings</h2>

          <div className="cubing-fields" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
            <Field label="Item Category" htmlFor={`${uid}-item-type`} style={labelStyle}>
              <select
                id={`${uid}-item-type`}
                className="tool-select"
                value={itemType}
                onChange={(e) => dispatch({ type: "setItemType", value: e.target.value as ItemCategory })}
                style={controlStyle}
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Cube Type" htmlFor={`${uid}-cube-type`} style={labelStyle}>
              <select
                id={`${uid}-cube-type`}
                className="tool-select"
                value={cubeType}
                onChange={(e) => dispatch({ type: "setCubeType", value: e.target.value as CubeKey })}
                style={controlStyle}
              >
                {CUBE_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Item Level" htmlFor={levelId} style={labelStyle}>
              <input
                id={levelId}
                className="tool-input"
                type="number"
                value={itemLevel}
                min={MIN_ITEM_LEVEL}
                max={MAX_ITEM_LEVEL}
                aria-invalid={!levelValid}
                aria-describedby={levelValid ? undefined : levelErrorId}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={replaceZeroOnDigit}
                onChange={(e) => dispatch({ type: "setItemLevel", value: Number(e.target.value) })}
                style={controlStyle}
              />
              {!levelValid && (
                <p id={levelErrorId} style={errorStyle}>
                  Must be between {MIN_ITEM_LEVEL} and {MAX_ITEM_LEVEL}.
                </p>
              )}
            </Field>

            <Field label="Current Tier" htmlFor={`${uid}-current-tier`} style={labelStyle}>
              <select
                id={`${uid}-current-tier`}
                className="tool-select"
                value={currentTier}
                onChange={(e) => dispatch({ type: "setCurrentTier", value: Number(e.target.value) })}
                style={controlStyle}
              >
                {currentTierOptions.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Desired Tier" htmlFor={`${uid}-desired-tier`} style={labelStyle}>
              <select
                id={`${uid}-desired-tier`}
                className="tool-select"
                value={desiredTier}
                onChange={(e) => dispatch({ type: "setDesiredTier", value: Number(e.target.value) })}
                style={controlStyle}
              >
                {desiredTierOptions.map((tier) => (
                  <option key={tier} value={tier}>{TIERS[tier].label}</option>
                ))}
              </select>
            </Field>

            <Field label="Stat Type" htmlFor={`${uid}-stat-type`} style={labelStyle}>
              <select
                id={`${uid}-stat-type`}
                className="tool-select"
                value={statType}
                disabled={!canPickStat}
                onChange={(e) => dispatch({ type: "setStatType", value: e.target.value })}
                style={{ ...controlStyle, opacity: canPickStat ? 1 : 0.5 }}
              >
                {STAT_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>

            {/* Its option labels are the longest in the form, and a native select
                can neither wrap nor truncate them. Give it the full row. */}
            <Field label="Desired Stat" htmlFor={statId} style={labelStyle} containerStyle={{ gridColumn: "1 / -1" }}>
              <select
                id={statId}
                className="tool-select"
                value={desiredStat}
                disabled={!canPickStat}
                aria-describedby={canPickStat ? undefined : statHintId}
                onChange={(e) => dispatch({ type: "setDesiredStat", value: e.target.value })}
                style={{ ...controlStyle, opacity: canPickStat ? 1 : 0.5 }}
              >
                <option value="any">Any</option>
                {groupedOptions.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {!canPickStat && (
                <p id={statHintId} style={hintStyle}>
                  Set the current and desired tier to the same tier to target a stat.
                </p>
              )}
            </Field>
          </div>

          <div className="cubing-toggle-row" style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Toggle
              theme={theme}
              label="Double Miracle Time"
              checked={dmt}
              disabled={dmtHint != null}
              onChange={(v) => dispatch({ type: "setDmt", value: v })}
              style={{ height: "35px" }}
            />
            {dmtHint && <p style={{ ...hintStyle, margin: 0, flex: "1 1 240px" }}>{dmtHint}</p>}
          </div>
        </section>

        <section className="fade-in" style={panelStyle}>
          <h2 className="tool-panel-title" style={{ color: theme.text }}>Results</h2>
          <p className="sr-only" role="status">{resultsStatusText(outcome, cubeLabel)}</p>
          {/* No reserved height: the panel sizes to its content, so a message state
              stays compact instead of holding open space for a table that isn't there. */}
          <ResultsBody theme={theme} outcome={outcome} cubeLabel={cubeLabel} summaryRowStyle={summaryRowStyle} />
        </section>
      </div>
    </div>
  );
}

"use client";

import { useReducer, useMemo, useCallback } from "react";
import { useMounted } from "../../../lib/useMounted";
import type { CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { replaceZeroOnDigit } from "../numberInputHandlers";
import { ToolHeader } from "../../../components/ToolHeader";
import { Field, Toggle } from "../shared-ui";
import { formatMesoFull } from "../format";
import { toolStyles } from "../tool-styles";
import {
  FLAME_CLASS_OPTIONS,
  FLAME_TYPE_OPTIONS,
  ARMOR_LEVELS,
  WEAPON_LEVELS,
  GRANULAR_LEVELS,
  computeFlameResults,
  computeFlameScore,
  defaultEquivalences,
  defaultDesiredStat,
  flameMesoCost,
  formatFlames,
  getLowerTierLimit,
  getUpperTierLimit,
  type FlameClass,
  type FlameType,
  type ItemType,
  type StatEquivalences,
  type FlameScoreInputs,
  type FlameResults,
} from "./flaming-data";

function formatPctFull(pct: number): string {
  if (pct >= 0.01) return `${pct.toFixed(4)}%`;
  const s = pct.toPrecision(4);
  return `${parseFloat(s)}%`;
}

// -- State --------------------------------------------------------------------

interface CalcState {
  flameClass: FlameClass;
  itemType: ItemType;
  flameType: FlameType;
  itemLevel: string;
  weaponLevel: string;
  baseAttack: number;
  flameAdvantaged: boolean;
  desiredStat: number;
  guildDiscount: boolean;
  equivalences: StatEquivalences;
  flameScore: FlameScoreInputs;
}

type CalcAction =
  | { type: "setClass"; value: FlameClass }
  | { type: "setItemType"; value: ItemType }
  | { type: "setFlameType"; value: FlameType }
  | { type: "setItemLevel"; value: string }
  | { type: "setWeaponLevel"; value: string }
  | { type: "setBaseAttack"; value: number }
  | { type: "setFlameAdvantaged"; value: boolean }
  | { type: "setDesiredStat"; value: number }
  | { type: "setGuildDiscount"; value: boolean }
  | { type: "setEquiv"; field: keyof StatEquivalences; value: number }
  | { type: "setFlameScoreField"; field: keyof FlameScoreInputs; value: number };

function initState(): CalcState {
  const eq = defaultEquivalences("other");
  return {
    flameClass: "other",
    itemType: "armor",
    flameType: "powerful",
    itemLevel: "140-159",
    weaponLevel: "200+",
    baseAttack: 149,
    flameAdvantaged: true,
    desiredStat: 100,
    guildDiscount: false,
    equivalences: eq,
    flameScore: { mainStat: 0, secondaryStat: 0, allStatPct: 0, attack: 0, bossPct: 0, dmgPct: 0, hp: 0, dex: 0, str: 0, luk: 0 },
  };
}

function reducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "setClass": {
      const eq = defaultEquivalences(action.value);
      const ds = defaultDesiredStat(action.value, state.itemType);
      const itemLevel = action.value === "da" ? "200-209" : "140-159";
      return { ...state, flameClass: action.value, equivalences: eq, desiredStat: ds, itemLevel };
    }
    case "setItemType": {
      const eq = defaultEquivalences(state.flameClass);
      const ds = defaultDesiredStat(state.flameClass, action.value);
      return { ...state, itemType: action.value, equivalences: eq, desiredStat: ds };
    }
    case "setFlameType":
      return { ...state, flameType: action.value };
    case "setItemLevel":
      return { ...state, itemLevel: action.value };
    case "setWeaponLevel":
      return { ...state, weaponLevel: action.value };
    case "setBaseAttack":
      return { ...state, baseAttack: action.value };
    case "setFlameAdvantaged":
      return { ...state, flameAdvantaged: action.value };
    case "setDesiredStat":
      return { ...state, desiredStat: action.value };
    case "setGuildDiscount":
      return { ...state, guildDiscount: action.value };
    case "setEquiv":
      return { ...state, equivalences: { ...state.equivalences, [action.field]: action.value } };
    case "setFlameScoreField":
      return { ...state, flameScore: { ...state.flameScore, [action.field]: action.value } };
  }
}

// -- Sub-components -----------------------------------------------------------

function EquivRow({
  prefix,
  suffix,
  value,
  onChange,
  theme,
  inputStyle,
}: {
  prefix: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
  theme: AppTheme;
  inputStyle: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted, whiteSpace: "nowrap" }}>{prefix}</span>
      <input
        className="tool-input"
        type="number"
        step={0.01}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={replaceZeroOnDigit}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{ ...inputStyle, width: 70, textAlign: "center" }}
      />
      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted, whiteSpace: "nowrap" }}>{suffix}</span>
    </div>
  );
}

function ResultCard({
  theme,
  title,
  heroValue,
  heroLabel,
  rows,
}: {
  theme: AppTheme;
  title: string;
  heroValue: string;
  heroLabel: string;
  rows: { label: string; value: string }[];
}) {
  const cardStyle: CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    padding: "1.25rem",
  };
  const rowStyle: CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: "0.75rem", fontWeight: 700, color: theme.muted,
    background: theme.timerBg, borderRadius: "8px", padding: "6px 10px",
  };

  return (
    <div className="panel-card" style={cardStyle}>
      <div className="tool-field-label" style={{ color: theme.muted, marginBottom: 0 }}>{title}</div>
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
            <span style={{ color: theme.accent, fontWeight: 800 }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlameSettingsPanel({
  theme,
  state,
  dispatch,
  selectStyle,
  inputStyle,
  labelStyle,
  panelStyle,
}: {
  theme: AppTheme;
  state: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
  selectStyle: CSSProperties;
  inputStyle: CSSProperties;
  labelStyle: CSSProperties;
  panelStyle: CSSProperties;
}) {
  const needsGranular = state.flameClass === "da";
  const levelOptions = needsGranular ? GRANULAR_LEVELS : ARMOR_LEVELS;
  const showWeaponLevel = state.itemType === "weapon" && state.flameClass !== "da";

  const nonAdv = !state.flameAdvantaged;
  const lo = getLowerTierLimit(state.flameType, nonAdv);
  const hi = getUpperTierLimit(state.flameType, nonAdv) - 1;
  const advLabel = state.flameAdvantaged
    ? `Flame-Advantaged Item (Tiers ${lo}–${hi})`
    : `Non-Advantaged Item (Tiers ${lo}–${hi})`;

  const guildDisabled = state.flameType === "eternal" || state.flameType === "reincarnation";

  return (
    <div className="fade-in" style={panelStyle}>
      <div className="tool-field-label" style={{ ...labelStyle, marginBottom: "12px", fontSize: "0.78rem" }}>
        Flame Settings
      </div>
      <div className="flame-inputs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
        <Field label="Class" style={labelStyle}>
          <select
            className="tool-select"
            value={state.flameClass}
            onChange={(e) => dispatch({ type: "setClass", value: e.target.value as FlameClass })}
            style={selectStyle}
          >
            {FLAME_CLASS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Item Type" style={labelStyle}>
          <select
            className="tool-select"
            value={state.itemType}
            onChange={(e) => dispatch({ type: "setItemType", value: e.target.value as ItemType })}
            style={selectStyle}
          >
            <option value="armor">Armor</option>
            <option value="weapon">Weapon</option>
          </select>
        </Field>

        <Field label="Flame Type" style={labelStyle}>
          <select
            className="tool-select"
            value={state.flameType}
            onChange={(e) => dispatch({ type: "setFlameType", value: e.target.value as FlameType })}
            style={selectStyle}
          >
            {FLAME_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Item Level" style={labelStyle}>
          {showWeaponLevel ? (
            <select
              className="tool-select"
              value={state.weaponLevel}
              onChange={(e) => dispatch({ type: "setWeaponLevel", value: e.target.value })}
              style={selectStyle}
            >
              {WEAPON_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          ) : (
            <select
              className="tool-select"
              value={state.itemLevel}
              onChange={(e) => dispatch({ type: "setItemLevel", value: e.target.value })}
              style={selectStyle}
            >
              {levelOptions.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}
        </Field>

        {state.itemType === "weapon" && (
          <Field label="Base Attack" style={labelStyle}>
            <input
              className="tool-input"
              type="number"
              min={0}
              value={state.baseAttack}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={replaceZeroOnDigit}
              onChange={(e) => dispatch({ type: "setBaseAttack", value: Math.max(0, Number(e.target.value) || 0) })}
              style={{ ...inputStyle, width: "100%", padding: "8px 10px" }}
            />
          </Field>
        )}
      </div>

      <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <Toggle
          theme={theme}
          label={advLabel}
          checked={state.flameAdvantaged}
          onChange={(v) => dispatch({ type: "setFlameAdvantaged", value: v })}
        />
        <div style={{ opacity: guildDisabled ? 0.4 : 1, pointerEvents: guildDisabled ? "none" : "auto" }}>
          <Toggle
            theme={theme}
            label="Guild Discount on Flames"
            checked={state.guildDiscount && !guildDisabled}
            onChange={(v) => dispatch({ type: "setGuildDiscount", value: v })}
          />
        </div>
      </div>
    </div>
  );
}

function EquivalencesPanel({
  theme,
  state,
  dispatch,
  inputStyle,
  labelStyle,
  panelStyle,
}: {
  theme: AppTheme;
  state: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
  inputStyle: CSSProperties;
  labelStyle: CSSProperties;
  panelStyle: CSSProperties;
}) {
  const cls = state.flameClass;

  const setEquiv = useCallback(
    (field: keyof StatEquivalences, value: number) => dispatch({ type: "setEquiv", field, value }),
    [dispatch],
  );

  if (cls === "da") return null;

  return (
    <div className="fade-in" style={panelStyle}>
      <div className="tool-field-label" style={{ ...labelStyle, marginBottom: "12px", fontSize: "0.78rem" }}>
        Stat Equivalences
      </div>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, marginBottom: "1rem" }}>
        Adjust these to match your character. Leave defaults if unsure.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <EquivRow prefix="1 All Stat % =" suffix="Main Stat" value={state.equivalences.allStat} onChange={(v) => setEquiv("allStat", v)} theme={theme} inputStyle={inputStyle} />
        <EquivRow prefix="1 Attack =" suffix="Main Stat" value={state.equivalences.attack} onChange={(v) => setEquiv("attack", v)} theme={theme} inputStyle={inputStyle} />

        {cls === "other" && (
          <EquivRow prefix="1 Main Stat =" suffix="Secondary Stat" value={state.equivalences.secondaryStat} onChange={(v) => setEquiv("secondaryStat", v)} theme={theme} inputStyle={inputStyle} />
        )}
        {(cls === "db" || cls === "shadower" || cls === "cadena") && (
          <>
            <EquivRow prefix="1 Main Stat =" suffix="DEX" value={state.equivalences.dexStat} onChange={(v) => setEquiv("dexStat", v)} theme={theme} inputStyle={inputStyle} />
            <EquivRow prefix="1 Main Stat =" suffix="STR" value={state.equivalences.strStat} onChange={(v) => setEquiv("strStat", v)} theme={theme} inputStyle={inputStyle} />
          </>
        )}

        {state.itemType === "weapon" && (
          <EquivRow prefix="1% Damage =" suffix="Main Stat" value={state.equivalences.dmg} onChange={(v) => setEquiv("dmg", v)} theme={theme} inputStyle={inputStyle} />
        )}
      </div>
    </div>
  );
}

function TargetPanel({
  theme,
  state,
  dispatch,
  inputStyle,
  labelStyle,
  panelStyle,
}: {
  theme: AppTheme;
  state: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
  inputStyle: CSSProperties;
  labelStyle: CSSProperties;
  panelStyle: CSSProperties;
}) {
  const label = state.flameClass === "da" ? "Main Stat (HP Equivalent)" : "Main Stat";

  return (
    <div className="fade-in" style={panelStyle}>
      <div className="tool-field-label" style={{ ...labelStyle, marginBottom: "12px", fontSize: "0.78rem" }}>
        Desired Stats
      </div>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, marginBottom: "1rem" }}>
        Set the minimum bonus stat total you want to achieve.
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <input
          className="tool-input"
          type="number"
          min={0}
          value={state.desiredStat}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={replaceZeroOnDigit}
          onChange={(e) => dispatch({ type: "setDesiredStat", value: Math.max(0, Number(e.target.value) || 0) })}
          style={{ ...inputStyle, width: 110, textAlign: "center" }}
        />
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>{label}</span>
      </div>
    </div>
  );
}

function ResultsPanel({ theme, results, flameType, guildDiscount }: {
  theme: AppTheme;
  results: FlameResults;
  flameType: FlameType;
  guildDiscount: boolean;
}) {
  const showMeso = flameType === "powerful";
  const txt = results.flameTypeText;

  const meanCost = showMeso ? flameMesoCost(results.mean, guildDiscount) : null;
  const fmtCost = (flames: number) => {
    const c = flameMesoCost(flames, guildDiscount);
    return c != null ? formatMesoFull(c) : "N/A";
  };

  return (
    <div className="flame-results" style={{ display: "grid", gridTemplateColumns: showMeso ? "1fr 1fr" : "1fr", gap: "1rem", marginBottom: "1.25rem" }}>
      <ResultCard
        theme={theme}
        title="Flame Count"
        heroValue={`${formatFlames(results.mean)} ${txt}`}
        heroLabel="Average flames"
        rows={[
          { label: "75th percentile", value: `${formatFlames(results.p75)} ${txt}` },
          { label: "85th percentile", value: `${formatFlames(results.p85)} ${txt}` },
          { label: "95th percentile", value: `${formatFlames(results.p95)} ${txt}` },
        ]}
      />
      {showMeso && (
        <ResultCard
          theme={theme}
          title="Meso Cost"
          heroValue={meanCost != null ? `${formatMesoFull(meanCost)} mesos` : "N/A"}
          heroLabel="Average cost"
          rows={[
            { label: "75th percentile", value: fmtCost(results.p75) },
            { label: "85th percentile", value: fmtCost(results.p85) },
            { label: "95th percentile", value: fmtCost(results.p95) },
          ]}
        />
      )}
    </div>
  );
}

function FlameScorePanel({
  theme,
  state,
  dispatch,
  inputStyle,
  labelStyle,
  panelStyle,
}: {
  theme: AppTheme;
  state: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
  inputStyle: CSSProperties;
  labelStyle: CSSProperties;
  panelStyle: CSSProperties;
}) {
  const cls = state.flameClass;
  const setField = useCallback(
    (field: keyof FlameScoreInputs, value: number) => dispatch({ type: "setFlameScoreField", field, value }),
    [dispatch],
  );

  const score = useMemo(
    () => computeFlameScore(cls, state.itemType, state.flameScore, state.equivalences),
    [cls, state.itemType, state.flameScore, state.equivalences],
  );

  const fieldInputStyle: CSSProperties = { ...inputStyle, width: "100%", textAlign: "center", padding: "8px 10px" };
  const flexItem: CSSProperties = { flex: "1 1 0", minWidth: 0 };

  return (
    <div className="fade-in" style={panelStyle}>
      <div className="tool-field-label" style={{ ...labelStyle, marginBottom: "12px", fontSize: "0.78rem" }}>
        Flame Score Checker
      </div>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, marginBottom: "1rem" }}>
        Enter your current bonus stats to calculate your flame score.
      </div>

      <div className="flame-score-fields" style={{ display: "flex", gap: "12px", marginBottom: "1rem" }}>
        {cls !== "da" && (
          <Field label="Main Stat" style={labelStyle} containerStyle={flexItem}>
            <input className="tool-input" type="number" onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} value={state.flameScore.mainStat} onChange={(e) => setField("mainStat", Number(e.target.value) || 0)} style={fieldInputStyle} />
          </Field>
        )}
        {cls === "da" && (
          <Field label="HP" style={labelStyle} containerStyle={flexItem}>
            <input className="tool-input" type="number" onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} value={state.flameScore.hp} onChange={(e) => setField("hp", Number(e.target.value) || 0)} style={fieldInputStyle} />
          </Field>
        )}
        {cls === "other" && (
          <Field label="Secondary Stat" style={labelStyle} containerStyle={flexItem}>
            <input className="tool-input" type="number" onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} value={state.flameScore.secondaryStat} onChange={(e) => setField("secondaryStat", Number(e.target.value) || 0)} style={fieldInputStyle} />
          </Field>
        )}
        {(cls === "db" || cls === "shadower" || cls === "cadena") && (
          <>
            <Field label="DEX" style={labelStyle} containerStyle={flexItem}>
              <input className="tool-input" type="number" onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} value={state.flameScore.dex} onChange={(e) => setField("dex", Number(e.target.value) || 0)} style={fieldInputStyle} />
            </Field>
            <Field label="STR" style={labelStyle} containerStyle={flexItem}>
              <input className="tool-input" type="number" onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} value={state.flameScore.str} onChange={(e) => setField("str", Number(e.target.value) || 0)} style={fieldInputStyle} />
            </Field>
          </>
        )}
        {cls !== "da" && (
          <Field label="All Stat %" style={labelStyle} containerStyle={flexItem}>
            <input className="tool-input" type="number" onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} value={state.flameScore.allStatPct} onChange={(e) => setField("allStatPct", Number(e.target.value) || 0)} style={fieldInputStyle} />
          </Field>
        )}
        <Field label="Attack Power" style={labelStyle} containerStyle={flexItem}>
          <input className="tool-input" type="number" onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} value={state.flameScore.attack} onChange={(e) => setField("attack", Number(e.target.value) || 0)} style={fieldInputStyle} />
        </Field>
        {state.itemType === "weapon" && (
          <>
            <Field label="Boss %" style={labelStyle} containerStyle={flexItem}>
              <input className="tool-input" type="number" onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} value={state.flameScore.bossPct} onChange={(e) => setField("bossPct", Number(e.target.value) || 0)} style={fieldInputStyle} />
            </Field>
            <Field label="Damage %" style={labelStyle} containerStyle={flexItem}>
              <input className="tool-input" type="number" onFocus={(e) => e.currentTarget.select()} onKeyDown={replaceZeroOnDigit} value={state.flameScore.dmgPct} onChange={(e) => setField("dmgPct", Number(e.target.value) || 0)} style={fieldInputStyle} />
            </Field>
          </>
        )}
      </div>

      <div className="result-banner" style={{ background: theme.timerBg, border: `1px solid ${theme.border}` }}>
        <div style={{ textAlign: "center" }}>
          <div className="tool-field-label" style={{ color: theme.muted, marginBottom: 0 }}>
            Flame Score
          </div>
          <div style={{ marginTop: "4px" }}>
            <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accent }}>
              {score}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Main workspace -----------------------------------------------------------

export default function FlamingWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();

  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const results = useMemo(() => {
    if (!mounted) return null;
    return computeFlameResults({
      flameClass: state.flameClass,
      itemType: state.itemType,
      flameType: state.flameType,
      itemLevel: state.itemLevel,
      weaponLevel: state.weaponLevel,
      baseAttack: state.baseAttack,
      flameAdvantaged: state.flameAdvantaged,
      desiredStat: state.desiredStat,
      equivalences: state.equivalences,
    });
  }, [
    mounted,
    state.flameClass,
    state.itemType,
    state.flameType,
    state.itemLevel,
    state.weaponLevel,
    state.baseAttack,
    state.flameAdvantaged,
    state.desiredStat,
    state.equivalences,
  ]);

  const styles = toolStyles(theme);
  const inputStyle = styles.inputStyle;
  const labelStyle = styles.labelStyle;

  const selectStyle: CSSProperties = {
    ...styles.selectStyle,
    width: "100%",
    padding: "8px 10px",
    appearance: "auto" as const,
  };

  const panelStyle: CSSProperties = {
    ...styles.sectionPanel,
    borderRadius: "18px",
  };

  const guildDiscount = state.flameType === "eternal" || state.flameType === "reincarnation"
    ? false
    : state.guildDiscount;

  const probBadgeStyle: CSSProperties = {
    marginBottom: "1rem",
    background: theme.panel,
    border: `1px solid ${theme.border}`,
  };

  return (
    <div className="page-content">
      <style>{`
        @media (max-width: 640px) {
          .flame-results { grid-template-columns: 1fr !important; }
          .flame-score-fields { flex-wrap: wrap; }
          .flame-eq-target-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 860px) {
          .flame-inputs-grid { grid-template-columns: 1fr !important; }
          .flame-eq-target-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="tool-container">
        <ToolHeader
          theme={theme}
          title="Flaming Calculator"
          description="Calculate the expected number of flames to achieve your desired bonus stats."
        />

        <FlameSettingsPanel theme={theme} state={state} dispatch={dispatch} selectStyle={selectStyle} inputStyle={inputStyle} labelStyle={labelStyle} panelStyle={panelStyle} />
        {state.flameClass !== "da" ? (
          <div className="flame-eq-target-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
            <EquivalencesPanel theme={theme} state={state} dispatch={dispatch} inputStyle={inputStyle} labelStyle={labelStyle} panelStyle={{ ...panelStyle, marginBottom: 0 }} />
            <TargetPanel theme={theme} state={state} dispatch={dispatch} inputStyle={inputStyle} labelStyle={labelStyle} panelStyle={{ ...panelStyle, marginBottom: 0 }} />
          </div>
        ) : (
          <TargetPanel theme={theme} state={state} dispatch={dispatch} inputStyle={inputStyle} labelStyle={labelStyle} panelStyle={panelStyle} />
        )}

        {results && (
          <>
            <div className="fade-in result-banner" style={probBadgeStyle}>
              <div style={{ textAlign: "center" }}>
                <div className="tool-field-label" style={{ color: theme.muted, marginBottom: 0 }}>
                  Probability per flame
                </div>
                <div style={{ marginTop: "4px" }}>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accent }}>
                    {formatPctFull(results.probability * 100)}
                  </span>
                </div>
              </div>
            </div>
            <ResultsPanel theme={theme} results={results} flameType={state.flameType} guildDiscount={guildDiscount} />
          </>
        )}

        <FlameScorePanel theme={theme} state={state} dispatch={dispatch} inputStyle={inputStyle} labelStyle={labelStyle} panelStyle={panelStyle} />
      </div>
    </div>
  );
}

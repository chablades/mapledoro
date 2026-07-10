"use client";

import { useReducer, useMemo, useCallback, useDeferredValue, useId } from "react";
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

/** Meso costs only exist for Powerful flames; the guild discount rides on them. */
function usesMeso(flameType: FlameType): boolean {
  return flameType === "powerful";
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
    guildDiscount: true,
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

/** Bonus stats are never negative, and a negative equivalence inverts the maths. */
function toPositive(raw: string): number {
  return Math.max(0, Number(raw) || 0);
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
  const affixStyle: CSSProperties = { fontSize: "0.82rem", fontWeight: 700, color: theme.muted, whiteSpace: "nowrap" };

  return (
    <>
      {/* The affixes read as one sentence around the input, so they're hidden
          from assistive tech and restated as the input's own label. */}
      <span aria-hidden="true" style={{ ...affixStyle, justifySelf: "end" }}>{prefix}</span>
      <input
        className="tool-input"
        type="number"
        step={0.1}
        min={0}
        aria-label={`${prefix} ${suffix}`}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={replaceZeroOnDigit}
        onChange={(e) => onChange(toPositive(e.target.value))}
        style={{ ...inputStyle, width: 70, textAlign: "center" }}
      />
      <span aria-hidden="true" style={affixStyle}>{suffix}</span>
    </>
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
  const uid = useId();
  const needsGranular = state.flameClass === "da";
  const levelOptions = needsGranular ? GRANULAR_LEVELS : ARMOR_LEVELS;
  const showWeaponLevel = state.itemType === "weapon" && state.flameClass !== "da";

  const guildDisabled = !usesMeso(state.flameType);

  return (
    <section className="fade-in" style={panelStyle}>
      <h2 className="tool-panel-title" style={{ color: theme.text }}>Flame Settings</h2>

      <div className="flame-inputs-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
        <Field label="Class" htmlFor={`${uid}-class`} style={labelStyle}>
          <select
            id={`${uid}-class`}
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

        <Field label="Item Type" htmlFor={`${uid}-item-type`} style={labelStyle}>
          <select
            id={`${uid}-item-type`}
            className="tool-select"
            value={state.itemType}
            onChange={(e) => dispatch({ type: "setItemType", value: e.target.value as ItemType })}
            style={selectStyle}
          >
            <option value="armor">Armor</option>
            <option value="weapon">Weapon</option>
          </select>
        </Field>

        <Field label="Flame Type" htmlFor={`${uid}-flame-type`} style={labelStyle}>
          <select
            id={`${uid}-flame-type`}
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

        <Field label="Item Level" htmlFor={`${uid}-item-level`} style={labelStyle}>
          {showWeaponLevel ? (
            <select
              id={`${uid}-item-level`}
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
              id={`${uid}-item-level`}
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
          <Field label="Base Attack" htmlFor={`${uid}-base-attack`} style={labelStyle}>
            <input
              id={`${uid}-base-attack`}
              className="tool-input"
              type="number"
              min={0}
              value={state.baseAttack}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={replaceZeroOnDigit}
              onChange={(e) => dispatch({ type: "setBaseAttack", value: toPositive(e.target.value) })}
              style={{ ...inputStyle, width: "100%", padding: "8px 10px" }}
            />
          </Field>
        )}
      </div>

      <div className="flame-toggles" style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <Toggle
          theme={theme}
          label="Flame-Advantaged Item (Tiers 3–6)"
          checked={state.flameAdvantaged}
          onChange={(v) => dispatch({ type: "setFlameAdvantaged", value: v })}
        />
        <Toggle
          theme={theme}
          label="Guild Discount on Flames"
          checked={state.guildDiscount}
          disabled={guildDisabled}
          onChange={(v) => dispatch({ type: "setGuildDiscount", value: v })}
        />
      </div>
    </section>
  );
}

function EquivalencesPanel({
  theme,
  state,
  dispatch,
  inputStyle,
  panelStyle,
}: {
  theme: AppTheme;
  state: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
  inputStyle: CSSProperties;
  panelStyle: CSSProperties;
}) {
  const cls = state.flameClass;

  const setEquiv = useCallback(
    (field: keyof StatEquivalences, value: number) => dispatch({ type: "setEquiv", field, value }),
    [dispatch],
  );

  if (cls === "da") return null;

  return (
    <section className="fade-in" style={panelStyle}>
      <h2 className="tool-panel-title" style={{ color: theme.text }}>Stat Equivalences</h2>
      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, margin: "0 0 1rem" }}>
        Adjust these to match your character. Leave defaults if unsure.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "max-content max-content max-content", alignItems: "center", gap: "0.5rem", justifyContent: "start" }}>
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
    </section>
  );
}

function TargetPanel({
  theme,
  state,
  dispatch,
  inputStyle,
  panelStyle,
}: {
  theme: AppTheme;
  state: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
  inputStyle: CSSProperties;
  panelStyle: CSSProperties;
}) {
  const uid = useId();
  const label = state.flameClass === "da" ? "Main Stat (HP Equivalent)" : "Main Stat";

  return (
    <section className="fade-in" style={panelStyle}>
      <h2 className="tool-panel-title" style={{ color: theme.text }}>Desired Stats</h2>
      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, margin: "0 0 1rem" }}>
        Set the minimum bonus stat total you want to achieve.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <input
          id={`${uid}-desired`}
          className="tool-input"
          type="number"
          min={0}
          value={state.desiredStat}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={replaceZeroOnDigit}
          onChange={(e) => dispatch({ type: "setDesiredStat", value: toPositive(e.target.value) })}
          style={{ ...inputStyle, width: 110, textAlign: "center" }}
        />
        <label htmlFor={`${uid}-desired`} style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>
          {label}
        </label>
      </div>
    </section>
  );
}

// -- Results ------------------------------------------------------------------

const RESULT_ROWS: { key: "mean" | "p75" | "p85" | "p95"; label: string }[] = [
  { key: "mean", label: "Average" },
  { key: "p75", label: "75th percentile" },
  { key: "p85", label: "85th percentile" },
  { key: "p95", label: "95th percentile" },
];

function mesoCell(flames: number, guildDiscount: boolean): string {
  const cost = flameMesoCost(flames, guildDiscount);
  return cost != null ? formatMesoFull(cost) : "N/A";
}

/** Spoken summary for the live region. Screen readers get the headline numbers
 *  rather than the whole table re-read on every recalculation. */
function resultsStatusText(results: FlameResults | null, showMeso: boolean, guildDiscount: boolean): string {
  if (!results) return "Enter a desired stat total to calculate flames.";
  if (results.probability === 0) return "The desired stat total is not reachable with these settings.";

  const parts = [
    `Probability ${formatPctFull(results.probability * 100)} per flame.`,
    `Average ${formatFlames(results.mean)} ${results.flameTypeText}.`,
  ];
  if (showMeso) parts.push(`About ${mesoCell(results.mean, guildDiscount)} mesos.`);
  return parts.join(" ");
}

function ResultsTable({ theme, results, showMeso, guildDiscount }: {
  theme: AppTheme;
  results: FlameResults;
  showMeso: boolean;
  guildDiscount: boolean;
}) {
  const unit = results.flameTypeText;
  const flamesHeading = unit.charAt(0).toUpperCase() + unit.slice(1);

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
        <caption className="sr-only">Flames needed, and their meso cost, by outcome</caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...headCell, textAlign: "left" }}>Outcome</th>
            <th scope="col" style={{ ...headCell, textAlign: "right" }}>{flamesHeading}</th>
            {showMeso && <th scope="col" style={{ ...headCell, textAlign: "right" }}>Meso cost</th>}
          </tr>
        </thead>
        <tbody>
          {RESULT_ROWS.map((row, i) => {
            // The average is the answer people came for; the percentiles qualify it.
            const isAverage = i === 0;
            const value: CSSProperties = {
              ...valueCell,
              fontWeight: isAverage ? 800 : 600,
              fontSize: isAverage ? "0.95rem" : "0.82rem",
            };
            return (
              <tr key={row.key} style={{ background: isAverage ? theme.timerBg : "transparent" }}>
                <th scope="row" style={{ ...rowHeadCell, color: isAverage ? theme.text : theme.muted }}>
                  {row.label}
                </th>
                <td style={value}>{formatFlames(results[row.key])}</td>
                {showMeso && <td style={value}>{mesoCell(results[row.key], guildDiscount)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultsBody({ theme, results, showMeso, guildDiscount, desiredStat, targetNoun, summaryRowStyle }: {
  theme: AppTheme;
  results: FlameResults | null;
  showMeso: boolean;
  guildDiscount: boolean;
  desiredStat: number;
  targetNoun: string;
  summaryRowStyle: CSSProperties;
}) {
  const messageStyle: CSSProperties = { fontSize: "0.82rem", fontWeight: 600, color: theme.muted, margin: 0, lineHeight: 1.5 };

  if (!results) {
    return <p style={messageStyle}>Enter a desired stat total above to see how many flames it takes.</p>;
  }

  if (results.probability === 0) {
    return (
      <p style={messageStyle}>
        No combination of bonus stat lines reaches {desiredStat.toLocaleString("en-US")} {targetNoun} with these settings.
        Lower the target, or try a different flame type or item level.
      </p>
    );
  }

  return (
    <>
      <div style={summaryRowStyle}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>Probability per flame</span>
        <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accentText }}>
          {formatPctFull(results.probability * 100)}
        </span>
      </div>
      <ResultsTable theme={theme} results={results} showMeso={showMeso} guildDiscount={guildDiscount} />
    </>
  );
}

function FlameScorePanel({
  theme,
  state,
  dispatch,
  inputStyle,
  labelStyle,
  panelStyle,
  summaryRowStyle,
}: {
  theme: AppTheme;
  state: CalcState;
  dispatch: React.ActionDispatch<[action: CalcAction]>;
  inputStyle: CSSProperties;
  labelStyle: CSSProperties;
  panelStyle: CSSProperties;
  summaryRowStyle: CSSProperties;
}) {
  const uid = useId();
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

  const scoreField = (field: keyof FlameScoreInputs, label: string) => {
    const id = `${uid}-${field}`;
    return (
      <Field label={label} htmlFor={id} style={labelStyle} containerStyle={flexItem}>
        <input
          id={id}
          className="tool-input"
          type="number"
          min={0}
          value={state.flameScore[field]}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={replaceZeroOnDigit}
          onChange={(e) => setField(field, toPositive(e.target.value))}
          style={fieldInputStyle}
        />
      </Field>
    );
  };

  return (
    <section className="fade-in" style={panelStyle}>
      <h2 className="tool-panel-title" style={{ color: theme.text }}>Flame Score Checker</h2>
      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: theme.muted, margin: "0 0 1rem" }}>
        Enter your current bonus stats to calculate your flame score.
      </p>

      <div className="flame-score-fields" style={{ display: "flex", gap: "12px", marginBottom: "1rem" }}>
        {cls !== "da" && scoreField("mainStat", "Main Stat")}
        {cls === "da" && scoreField("hp", "HP")}
        {cls === "other" && scoreField("secondaryStat", "Secondary Stat")}
        {(cls === "db" || cls === "shadower" || cls === "cadena") && (
          <>
            {scoreField("dex", "DEX")}
            {scoreField("str", "STR")}
          </>
        )}
        {cls !== "da" && scoreField("allStatPct", "All Stat %")}
        {scoreField("attack", "Attack Power")}
        {state.itemType === "weapon" && (
          <>
            {scoreField("bossPct", "Boss %")}
            {scoreField("dmgPct", "Damage %")}
          </>
        )}
      </div>

      <div style={summaryRowStyle}>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: theme.muted }}>Flame score</span>
        <span style={{ fontSize: "1.15rem", fontWeight: 800, color: theme.accentText }}>{score}</span>
      </div>
    </section>
  );
}

// -- Main workspace -----------------------------------------------------------

export default function FlamingWorkspace({ theme }: { theme: AppTheme }) {
  const mounted = useMounted();

  const [state, dispatch] = useReducer(reducer, undefined, initState);

  // The probability engine walks ~200k line/tier combinations (a few ms on
  // desktop, more on phones). Deferring it lets React paint the typed character
  // before recomputing against the settled state.
  const deferred = useDeferredValue(state);

  const results = useMemo(() => {
    if (!mounted) return null;
    return computeFlameResults({
      flameClass: deferred.flameClass,
      itemType: deferred.itemType,
      flameType: deferred.flameType,
      itemLevel: deferred.itemLevel,
      weaponLevel: deferred.weaponLevel,
      baseAttack: deferred.baseAttack,
      flameAdvantaged: deferred.flameAdvantaged,
      desiredStat: deferred.desiredStat,
      equivalences: deferred.equivalences,
    });
  }, [mounted, deferred]);

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

  // Tinted region, not a bordered box: a card inside a card is always wrong.
  const summaryRowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    background: theme.timerBg,
    borderRadius: "10px",
    padding: "10px 14px",
    marginBottom: "1rem",
  };

  const showMeso = usesMeso(deferred.flameType);
  const guildDiscount = showMeso && deferred.guildDiscount;
  const targetNoun = deferred.flameClass === "da" ? "main stat (HP equivalent)" : "main stat";

  return (
    <div className="page-content">
      <style>{`
        @media (max-width: 640px) {
          .flame-score-fields { flex-wrap: wrap; }
          .flame-toggles { flex-direction: column; align-items: stretch !important; }
          .flame-toggles .tool-btn { width: 100%; }
        }
        @media (max-width: 860px) {
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
            <EquivalencesPanel theme={theme} state={state} dispatch={dispatch} inputStyle={inputStyle} panelStyle={{ ...panelStyle, marginBottom: 0 }} />
            <TargetPanel theme={theme} state={state} dispatch={dispatch} inputStyle={inputStyle} panelStyle={{ ...panelStyle, marginBottom: 0 }} />
          </div>
        ) : (
          <TargetPanel theme={theme} state={state} dispatch={dispatch} inputStyle={inputStyle} panelStyle={panelStyle} />
        )}

        <section className="fade-in" style={panelStyle}>
          <h2 className="tool-panel-title" style={{ color: theme.text }}>Results</h2>
          <p className="sr-only" role="status">
            {mounted ? resultsStatusText(results, showMeso, guildDiscount) : ""}
          </p>
          {/* Reserved height: results only exist after mount, and the panel
              shouldn't jump once they land. */}
          <div style={{ minHeight: 200 }}>
            {mounted && (
              <ResultsBody
                theme={theme}
                results={results}
                showMeso={showMeso}
                guildDiscount={guildDiscount}
                desiredStat={deferred.desiredStat}
                targetNoun={targetNoun}
                summaryRowStyle={summaryRowStyle}
              />
            )}
          </div>
        </section>

        <FlameScorePanel theme={theme} state={state} dispatch={dispatch} inputStyle={inputStyle} labelStyle={labelStyle} panelStyle={panelStyle} summaryRowStyle={summaryRowStyle} />
      </div>
    </div>
  );
}

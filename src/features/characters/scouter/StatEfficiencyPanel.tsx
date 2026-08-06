"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { AppTheme } from "../../../components/themes";
import HoverTooltip from "../../../components/HoverTooltip";
import { ToolNumberInput } from "../../tools/shared-ui";
import { critRateToCritDmg } from "../../tools/stat-optimizer/scouter-class-data";
import { toolStyles } from "../../tools/tool-styles";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { resolveClassId } from "../setup/data/nexonJobMapping";
import type { ScouterSpecEfficiency } from "./scouterCache";
import {
  computeMainEfficiencies, detailEfficiencyRows, efficiencyUnitOptions,
  formatEfficiencyValue, meterPosition, resolveEfficiencyStatLabels,
  type DetailEfficiencyRow, type EfficiencyStatLabels, type EfficiencyUnitId, type MainEfficiencyRow,
} from "./statEfficiency";

// ── Shared chrome ──────────────────────────────────────────────────────────────

const sectionHeadingStyle: CSSProperties = {
  fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
};

const captionStyle: CSSProperties = { margin: 0, fontSize: "0.75rem" };

/* Both sections render as two side-by-side boxes rather than one grid spanning both halves:
   each box sizes its own columns, which is what keeps the split dead centre. A single wide
   grid would put the divider wherever the wider half's labels happened to end. */
const twoColumnStyle: CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, alignItems: "start",
};

function boxStyle(theme: AppTheme): CSSProperties {
  return { border: `1px solid ${theme.border}`, borderRadius: 10, overflow: "hidden" };
}

function Section({ theme, heading, caption, children }: {
  theme: AppTheme; heading: string; caption: string; children: ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <h4 style={{ ...sectionHeadingStyle, margin: 0, color: theme.muted }}>{heading}</h4>
      <p style={{ ...captionStyle, color: theme.muted }}>{caption}</p>
      {children}
    </section>
  );
}

// ── Comparisons ────────────────────────────────────────────────────────────────

/* Within a column, one shared 3-track grid for its rows (source | meter | answer) rather than
   a tile each: the sources and answers are different lengths, so per-row boxes came out ragged
   and put every meter at a different width and offset. Each row is a subgrid spanning all 3
   tracks, the same pattern (and the same reason for setting gridColumn on the HoverTooltip
   wrapper) as BossClearGrid's SpotlightTile. */
const comparisonGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "max-content minmax(24px, 1fr) max-content",
};

const comparisonRowStyle: CSSProperties = {
  display: "grid", gridColumn: "1 / -1", gridTemplateColumns: "subgrid",
  alignItems: "center", columnGap: 8, padding: "6px 8px", boxSizing: "border-box",
};

const meterTrackStyle: CSSProperties = { position: "relative", height: 6, borderRadius: 999, width: "100%" };

const meterDotStyle: CSSProperties = {
  position: "absolute", top: "50%", transform: "translate(-50%, -50%)",
  width: 10, height: 10, borderRadius: 999, zIndex: 2,
};

const sourceCellStyle: CSSProperties = { fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" };

const answerCellStyle: CSSProperties = { fontSize: "0.75rem", fontWeight: 800, whiteSpace: "nowrap", justifySelf: "end" };

/** The band marking where a typical character's value sits: the middle 30% of the track when
 *  either extreme is a lopsided build, the right half when the scale simply runs bad-to-good.
 *  Reversed rows already flipped their position, so "right" stays right either way. */
function emphasisBandStyle(row: MainEfficiencyRow, theme: AppTheme): CSSProperties {
  const centered = row.emphasis === "center";
  return {
    position: "absolute", top: 0, height: "100%", borderRadius: 999,
    left: centered ? "35%" : "50%", width: centered ? "30%" : "50%",
    background: theme.accent, opacity: 0.4,
  };
}

function ComparisonRow({ theme, row, isLast }: { theme: AppTheme; row: MainEfficiencyRow; isLast: boolean }) {
  return (
    <HoverTooltip
      theme={theme}
      label={row.hint}
      style={{ display: "grid", gridColumn: "1 / -1", gridTemplateColumns: "subgrid" }}
    >
      <div style={{ ...comparisonRowStyle, borderBottom: isLast ? "none" : `1px solid ${theme.border}` }}>
        <span style={{ ...sourceCellStyle, color: theme.text }}>{row.source}</span>
        <span className="stat-efficiency-meter" style={{ ...meterTrackStyle, background: theme.timerBg }}>
          <span style={emphasisBandStyle(row, theme)} />
          <span style={{ ...meterDotStyle, left: `${meterPosition(row)}%`, background: theme.panel, border: `2px solid ${theme.accent}` }} />
        </span>
        <span style={{ ...answerCellStyle, color: theme.text }}>
          {row.value} <span style={{ color: theme.muted, fontWeight: 700 }}>{row.unit}</span>
        </span>
      </div>
    </HoverTooltip>
  );
}

function ComparisonColumn({ theme, rows }: { theme: AppTheme; rows: MainEfficiencyRow[] }) {
  return (
    <div className="stat-efficiency-comparisons" style={{ ...boxStyle(theme), ...comparisonGridStyle }}>
      {rows.map((row, i) => (
        <ComparisonRow key={row.id} theme={theme} row={row} isLast={i === rows.length - 1} />
      ))}
    </div>
  );
}

function ComparisonList({ theme, labels, level, eff }: {
  theme: AppTheme; labels: EfficiencyStatLabels; level: number; eff: ScouterSpecEfficiency;
}) {
  const rows = useMemo(() => computeMainEfficiencies(eff, level, labels), [eff, level, labels]);
  // Reads down the left column then down the right, so scouter's own ordering (which groups
  // related comparisons) survives the split.
  const half = Math.ceil(rows.length / 2);
  return (
    <div className="stat-efficiency-columns" style={twoColumnStyle}>
      <ComparisonColumn theme={theme} rows={rows.slice(0, half)} />
      <ComparisonColumn theme={theme} rows={rows.slice(half)} />
    </div>
  );
}

// ── Per stat ───────────────────────────────────────────────────────────────────

function cellStyle(theme: AppTheme, isLast: boolean): CSSProperties {
  return { padding: "5px 9px", borderBottom: isLast ? "none" : `1px solid ${theme.border}`, fontSize: "0.75rem", color: theme.text, lineHeight: 1.3 };
}

/** Right-aligned text sitting flush on a cell's padding edge reads as touching the box, so the
 *  Worth column carries more inset than the shared cell padding gives it. The column's own
 *  width has to cover this: table-layout is fixed, so padding eats the width, not the table. */
const WORTH_INSET = 10;

const unitLabelStyle: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", fontWeight: 700 };
/* Body font on purpose. This column used --font-heading, but Fredoka is loaded at a single
   weight (700, see layout.tsx), so fontWeight here was inert and the numbers rendered as a
   block of the panel's only display type. Nunito ships 400/600/700/800, so the weight is a
   real knob again: 800 matches the Comparisons section's answers, so both sections read
   their values at the same weight. */
const worthCellStyle: CSSProperties = { textAlign: "right", fontWeight: 800, paddingRight: WORTH_INSET };
/* Header row runs taller than the body rows it labels, so the column names sit off the panel
   edge instead of wedged against it. */
const headCellStyle: CSSProperties = { textAlign: "left", fontWeight: 800, padding: "8px 9px" };
const worthHeadCellStyle: CSSProperties = { ...headCellStyle, textAlign: "right", paddingRight: WORTH_INSET };

/* Fixed layout so both columns' tables come out with identical tracks: Amount and Worth are
   pinned, and the stat name takes whatever is left of an equal-width half. Wide names wrap
   rather than widening one table against the other. */
const perStatTableStyle: CSSProperties = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" };

interface PerStatColumnProps {
  theme: AppTheme;
  eff: ScouterSpecEfficiency;
  rows: DetailEfficiencyRow[];
  unit: EfficiencyUnitId;
  amounts: Record<string, number>;
  onAmount: (id: string, value: number) => void;
  inputStyle: CSSProperties;
}

function PerStatColumn({ theme, eff, rows, unit, amounts, onAmount, inputStyle }: PerStatColumnProps) {
  // Four cell styles per column rather than one built per cell: this table re-renders on every
  // keystroke in an Amount box, and only the last row differs (it drops the divider).
  const cell = cellStyle(theme, false);
  const lastCell = cellStyle(theme, true);
  const worthCell = { ...cell, ...worthCellStyle };
  const lastWorthCell = { ...lastCell, ...worthCellStyle };
  return (
    <div style={boxStyle(theme)}>
      <table style={perStatTableStyle}>
        <thead>
          <tr style={{ background: theme.timerBg }}>
            <th style={{ ...cell, ...headCellStyle, color: theme.muted }}>Stat</th>
            <th style={{ ...cell, ...headCellStyle, color: theme.muted, width: 60 }}>Amount</th>
            <th style={{ ...cell, ...worthHeadCellStyle, color: theme.muted, width: 60 }}>Worth</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            const amount = amounts[row.id] ?? row.defaultAmount;
            return (
              <tr key={row.id}>
                <td style={isLast ? lastCell : cell}>{row.label}</td>
                <td style={isLast ? lastCell : cell}>
                  <ToolNumberInput
                    value={amount}
                    min={0}
                    max={100000}
                    aria-label={`${row.label} amount`}
                    // Shape (the compact padding/type size this narrow column needs, and dropping
                    // the spinner arrows Chromium reserves room for even while they're hidden)
                    // stays in CSS so the ≤560px 16px rule that stops iOS zooming on focus can
                    // still reach it -- an inline font-size would win over that media query.
                    className="tool-input no-spinner stat-efficiency-amount"
                    style={inputStyle}
                    onCommit={(v) => onAmount(row.id, v)}
                  />
                </td>
                <td style={isLast ? lastWorthCell : worthCell}>
                  {formatEfficiencyValue(eff, row, amount, unit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PerStatTable({ theme, labels, eff, critRateToDmg }: {
  theme: AppTheme; labels: EfficiencyStatLabels; eff: ScouterSpecEfficiency; critRateToDmg: number;
}) {
  const rows = useMemo(
    () => detailEfficiencyRows(eff, labels, critRateToDmg),
    [eff, labels, critRateToDmg],
  );
  const unitOptions = useMemo(() => efficiencyUnitOptions(labels), [labels]);
  const [unit, setUnit] = useState<EfficiencyUnitId>("finalDamage");
  // Amounts are a scratchpad, not character data -- typing here compares lines, it doesn't
  // change anything about the character, so nothing is persisted (same as the live site).
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const styles = toolStyles(theme);
  // Column 2 starts at the main stat instead of at the halfway mark. Every row from there down
  // is one of the same triple (a stat, its %, and its "% not applied"), so a cut at the middle
  // strands part of a stat's group at the bottom of column 1; everything above it is the
  // damage-side stats. Sub2 classes make column 2 the longer of the two -- that's the trade.
  const splitIndex = rows.findIndex((r) => r.id === "main");

  const setAmount = (id: string, value: number) => setAmounts((prev) => ({ ...prev, [id]: value }));
  const columnProps = { theme, eff, unit, amounts, onAmount: setAmount, inputStyle: styles.inputStyle };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ ...unitLabelStyle, color: theme.muted }}>
        Show as
        <select
          className="tool-select"
          style={{ ...styles.selectStyle, flex: 1, maxWidth: 180 }}
          value={unit}
          onChange={(e) => setUnit(e.target.value as EfficiencyUnitId)}
        >
          {unitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <div className="stat-efficiency-columns" style={twoColumnStyle}>
        <PerStatColumn {...columnProps} rows={rows.slice(0, splitIndex)} />
        <PerStatColumn {...columnProps} rows={rows.slice(splitIndex)} />
      </div>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────────

/** MapleScouter's Stat Efficiency panel. Read-only in the sense that matters: the numbers all
 *  come from the cached /api/calc/dmg result, and refreshing them only happens via the Scouter
 *  figure on Overview (manual-refresh-only by design, see useScouterResult). The per-stat
 *  table's amount boxes are a scratchpad on top of those numbers, not character data. */
export default function StatEfficiencyPanel({ theme, character, eff }: {
  theme: AppTheme; character: StoredCharacterRecord; eff: ScouterSpecEfficiency;
}) {
  // Both sections name the same stats, so they resolve them once here rather than each
  // running the class lookup off the same jobName.
  const labels = useMemo(() => resolveEfficiencyStatLabels(character.jobName), [character.jobName]);
  // Non-zero only for the archers whose passives convert crit rate past 100%, which is the
  // only case the Per Stat table has a crit rate row to show.
  const critRateToDmg = useMemo(
    () => critRateToCritDmg(resolveClassId(character.jobName)),
    [character.jobName],
  );
  return (
    <div className="stat-efficiency-panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Section
        theme={theme}
        heading="Comparisons"
        caption="What a typical potential line is worth to you, measured against another stat. The marker shows where you sit in the range most characters land in."
      >
        <ComparisonList theme={theme} labels={labels} level={character.level} eff={eff} />
      </Section>
      <Section
        theme={theme}
        heading="Per Stat"
        caption="What each stat is worth at the amount shown, re-expressed in whichever unit you pick. Type a different amount to price a bigger or smaller line."
      >
        <PerStatTable theme={theme} labels={labels} eff={eff} critRateToDmg={critRateToDmg} />
      </Section>
    </div>
  );
}

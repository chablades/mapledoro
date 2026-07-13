import type { CSSProperties } from "react";
import type { AppTheme } from "../../components/themes";

/** Cells for the cubing/flaming results tables: light chrome, sentence-case
 *  header, no vertical rules. The `emphasis` variant is for the average row,
 *  the answer people came for; the percentile rows qualify it. */
export function resultsTableStyles(theme: AppTheme): {
  headCell: CSSProperties;
  rowHeadCell: CSSProperties;
  valueCell: CSSProperties;
  valueCellFor: (isAverage: boolean) => CSSProperties;
} {
  const valueCell: CSSProperties = {
    padding: "9px 10px",
    textAlign: "right",
    color: theme.text,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };
  return {
    headCell: {
      padding: "6px 10px",
      fontSize: "0.75rem",
      fontWeight: 700,
      color: theme.muted,
      borderBottom: `1px solid ${theme.border}`,
      whiteSpace: "nowrap",
    },
    rowHeadCell: {
      padding: "9px 10px",
      fontSize: "0.82rem",
      fontWeight: 700,
      textAlign: "left",
      whiteSpace: "nowrap",
    },
    valueCell,
    valueCellFor: (isAverage: boolean) => ({
      ...valueCell,
      fontWeight: isAverage ? 800 : 600,
      fontSize: isAverage ? "0.9rem" : "0.82rem",
    }),
  };
}

/** Explanatory message inside a results panel (invalid input, nothing to do). */
export function resultsMessageStyle(theme: AppTheme): CSSProperties {
  return { fontSize: "0.82rem", fontWeight: 600, color: theme.muted, margin: 0, lineHeight: 1.5 };
}

/** Tinted label/value row above a results table. A tinted region, not a
 *  bordered box: a card inside a card is always wrong. Callers add their own
 *  marginBottom. */
export function summaryRowStyle(theme: AppTheme): CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    background: theme.timerBg,
    borderRadius: "10px",
    padding: "10px 14px",
  };
}

/** Value under a `.tool-field-label` in a stat tile (mean cost, total mesos, …). */
export function statValueStyle(theme: AppTheme): CSSProperties {
  return { fontFamily: "var(--font-heading)", fontSize: "1.15rem", color: theme.text };
}

/** Pin form controls to one height so selects, inputs, and toggles line up in
 *  a shared row despite different intrinsic line boxes. */
export const controlHeightStyle: CSSProperties = { height: 34, boxSizing: "border-box" };

/** `controlHeightStyle` for a row of Toggle pills: centers them in the pinned height. */
export const toggleControlStyle: CSSProperties = {
  ...controlHeightStyle,
  display: "flex",
  alignItems: "center",
};

/** Header cell for data tables (per-star breakdown, EXP table, drop log).
 *  Alignment is per-column, so callers set textAlign. */
export function dataTableTh(theme: AppTheme): CSSProperties {
  return {
    padding: "8px 12px",
    fontSize: "0.75rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: theme.muted,
    borderBottom: `2px solid ${theme.border}`,
  };
}

/** Body cell paired with `dataTableTh`. */
export function dataTableTd(theme: AppTheme): CSSProperties {
  return {
    padding: "8px 12px",
    fontSize: "0.82rem",
    fontWeight: 700,
    color: theme.text,
    borderBottom: `1px solid ${theme.border}`,
  };
}

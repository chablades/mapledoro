// Shared meso formatting for tool workspaces. Pure module — no React, no
// localStorage (star-force-data and event-planner depend on staying pure).

const mesoFormatter = new Intl.NumberFormat("en-US");

/** Abbreviated meso amount (1.2T / 3.4B / 5.6M); full digits below 1M. */
export function formatMeso(n: number): string {
  if (n >= 1_000_000_000_000) {
    return (n / 1_000_000_000_000).toFixed(1).replace(/\.0$/, "") + "T";
  }
  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  return mesoFormatter.format(Math.floor(n));
}

/** Full meso amount with thousands separators. */
export function formatMesoFull(n: number): string {
  if (!isFinite(n)) return "N/A";
  return mesoFormatter.format(Math.floor(n));
}

/** Whole count with thousands separators (cubes, flames). */
export function formatCount(n: number): string {
  if (!isFinite(n)) return "N/A";
  return mesoFormatter.format(Math.round(n));
}

/** Percentage with precision scaled to its magnitude, so a whole number reads
 *  as one: 34% / 4.5% / 0.9901% / 0.0012%. Floating-point drift (0.05 * 2 * 100
 *  = 10.000000000000002) is what makes the rounding necessary at all; the
 *  Number() round-trip then drops the zeros toFixed() padded back on. */
export function formatPct(pct: number): string {
  if (!isFinite(pct)) return "N/A";
  if (pct >= 1) return `${Number(pct.toFixed(2))}%`;
  if (pct >= 0.01) return `${Number(pct.toFixed(4))}%`;
  return `${Number(pct.toPrecision(3))}%`;
}

/** Abbreviated EXP amount in the lowercase community convention (1.23q / 1.23t / 1.23b / 1.2m); full digits below 1M. */
export function formatExpCompact(n: number): string {
  if (n >= 1_000_000_000_000_000) return `${(n / 1_000_000_000_000_000).toFixed(2)}q`;
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}t`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  return formatMesoFull(n);
}

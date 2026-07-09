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

/** Abbreviated EXP amount in the lowercase community convention (1.23q / 1.23t / 1.23b / 1.2m); full digits below 1M. */
export function formatExpCompact(n: number): string {
  if (n >= 1_000_000_000_000_000) return `${(n / 1_000_000_000_000_000).toFixed(2)}q`;
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}t`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  return formatMesoFull(n);
}

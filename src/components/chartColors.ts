import type { AppTheme, ColorMode } from "./themes";

// Categorical chart-series colors, split per color mode like the accent and
// status tokens: a series color has to read as a fill on the panel surface, and
// #1a1a22 (dark) needs brighter hues than #ffffff (light). Hues follow the
// Okabe-Ito colorblind-safe qualitative family so adjacent series stay
// distinguishable under the common color-vision deficiencies; lightness is
// tuned per mode for contrast on that mode's panel.

const CHART_SERIES: Record<ColorMode, string[]> = {
  light: [
    "#d55e00", // vermillion
    "#0072b2", // blue
    "#018a5e", // green
    "#c0508f", // magenta
    "#b07800", // amber
    "#2a8fb8", // teal
    "#6a4bab", // violet
    "#8a4a2a", // brown
  ],
  dark: [
    "#f0863c", // orange
    "#56b4e9", // sky
    "#33c493", // green
    "#e79ac0", // pink
    "#f0c040", // amber
    "#5ec8d8", // teal
    "#a88ce0", // violet
    "#d08a5a", // brown
  ],
};

// Deterministic string hash so a given key (itemId, character name) maps to the
// same color every render and every session, independent of how many series are
// present or what order they arrive in. Replaces coloring by array index, which
// reshuffled whenever the sort order or the set of series changed.
function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Stable categorical color for a chart series, keyed by identity, per color mode. */
export function chartSeriesColor(theme: AppTheme, key: string): string {
  const palette = CHART_SERIES[theme.colorMode];
  return palette[hashKey(key) % palette.length];
}

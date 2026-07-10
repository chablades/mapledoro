import type { CSSProperties } from "react";

export interface AppTheme {
  name: string;
  emoji: string;
  /** Which base the theme was composed from. Lets per-mode palettes (see
   *  `statusColors.ts`) resolve from a theme alone. */
  colorMode: ColorMode;
  bg: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  /** Brand color. A fill and border color only — never a text color. See `accentText`. */
  accent: string;
  accentSoft: string;
  /** Accent-colored *text*, tuned per color mode. Use wherever accent is the ink. */
  accentText: string;
  /** Text/icon color that sits on top of an `accent` fill. Derived, never authored. */
  accentOn: string;
  sidebar: string;
  sidebarAccent: string;
  timerBg: string;
  badge: string;
  badgeText: string;
}

export type ColorMode = "light" | "dark";

interface ColorModeBase {
  bg: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  sidebar: string;
  timerBg: string;
  badge: string;
  badgeText: string;
}

interface AccentTheme {
  name: string;
  emoji: string;
  accent: string;
  light: { accentSoft: string; accentText: string };
  dark: { accentSoft: string; accentText: string };
}

const LIGHT_BASE: ColorModeBase = {
  bg: "#faf8f5",
  panel: "#ffffff",
  border: "#ede8e0",
  text: "#1c1814",
  muted: "#7a6f66",
  sidebar: "#faf8f5",
  timerBg: "#faf8f5",
  badge: "#f0e8e0",
  badgeText: "#7a5a40",
};

const DARK_BASE: ColorModeBase = {
  bg: "#101014",
  panel: "#1a1a22",
  border: "#2a2a34",
  text: "#e0ddd8",
  muted: "#88828d",
  sidebar: "#131318",
  timerBg: "#141418",
  badge: "#242428",
  badgeText: "#928a92",
};

const COLOR_MODE_BASES: Record<ColorMode, ColorModeBase> = {
  light: LIGHT_BASE,
  dark: DARK_BASE,
};

// Every `accentText` here clears 4.5:1 against its own `accentSoft` and against
// every surface in its color mode. `accent` is exempt: it is a fill, and
// `accentOn` supplies the ink that sits on it.
export const ACCENT_THEMES: Record<string, AccentTheme> = {
  aranya: {
    name: "Aranya",
    emoji: "🪷",
    accent: "#882233",
    light: { accentSoft: "#f6e8ec", accentText: "#6e1828" },
    dark: { accentSoft: "#200c10", accentText: "#d65c6b" },
  },
  momijigaoka: {
    name: "Momijigaoka",
    emoji: "⛩️",
    accent: "#cd3900",
    light: { accentSoft: "#fdeee6", accentText: "#bf4303" },
    dark: { accentSoft: "#281204", accentText: "#f08040" },
  },
  default: {
    name: "Default",
    emoji: "🍁",
    accent: "#bc4c0a",
    light: { accentSoft: "#fdf0ea", accentText: "#b94b12" },
    dark: { accentSoft: "#2a1a0e", accentText: "#e89a50" },
  },
  ludibrium: {
    name: "Ludibrium",
    emoji: "🧸",
    accent: "#856d00",
    light: { accentSoft: "#fdf6e0", accentText: "#816f00" },
    dark: { accentSoft: "#241e00", accentText: "#f0d830" },
  },
  juno: {
    name: "Juno",
    emoji: "🌿",
    accent: "#647700",
    light: { accentSoft: "#f4f7e0", accentText: "#6a7500" },
    dark: { accentSoft: "#1c2200", accentText: "#e8f030" },
  },
  sleepywood: {
    name: "Sleepywood",
    emoji: "🌑",
    accent: "#157220",
    light: { accentSoft: "#e6f4e8", accentText: "#0e5a18" },
    dark: { accentSoft: "#0a200c", accentText: "#3ab848" },
  },
  onyxapple: {
    name: "Onyx Apple",
    emoji: "🍎",
    accent: "#3366FF",
    light: { accentSoft: "#e8eeff", accentText: "#2850cc" },
    dark: { accentSoft: "#0c1430", accentText: "#6090ff" },
  },
  arcaneriver: {
    name: "Arcane River",
    emoji: "🌊",
    accent: "#2530A0",
    light: { accentSoft: "#e8e9f4", accentText: "#1c2480" },
    dark: { accentSoft: "#0a0c28", accentText: "#8088e8" },
  },
  cha: {
    name: "Cha",
    emoji: "🍵",
    // Darkened from #6677bb: the original sat in the luminance band where
    // neither white nor ink cleared 4.5:1 as a fill.
    accent: "#6171b5",
    light: { accentSoft: "#eef0f8", accentText: "#4c5a9a" },
    dark: { accentSoft: "#141828", accentText: "#8e9cd8" },
  },
  esfera: {
    name: "Esfera",
    emoji: "🔮",
    accent: "#7a65a0",
    light: { accentSoft: "#f2eef8", accentText: "#785fa5" },
    dark: { accentSoft: "#1c1628", accentText: "#b8a0e0" },
  },
  elluel: {
    name: "Elluel",
    emoji: "🌸",
    accent: "#a95374",
    light: { accentSoft: "#f8ecf0", accentText: "#a05370" },
    dark: { accentSoft: "#281020", accentText: "#f0b8d0" },
  },
  yuki: {
    name: "Yuki",
    emoji: "🐰",
    accent: "#ba4864",
    light: { accentSoft: "#fceef2", accentText: "#b84060" },
    dark: { accentSoft: "#301020", accentText: "#f080a0" },
  },
};

const ACCENT_INK = "#1c1814";

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** The readable ink for text sitting on a solid `fill`. White fails WCAG AA on a
 *  bright fill; near-black fails on a dark one. Pick per fill, not per color
 *  mode — a fill is the same hex in light and dark. */
export function inkOn(fill: string): string {
  const whiteContrast = 1.05 / (relativeLuminance(fill) + 0.05);
  return whiteContrast >= 4.5 ? "#ffffff" : ACCENT_INK;
}

export function composeTheme(accentKey: string, colorMode: ColorMode): AppTheme {
  const accent = ACCENT_THEMES[accentKey] ?? ACCENT_THEMES["default"];
  const base = COLOR_MODE_BASES[colorMode];
  const modeAccent = accent[colorMode];

  return {
    name: accent.name,
    emoji: accent.emoji,
    colorMode,
    ...base,
    accent: accent.accent,
    accentSoft: modeAccent.accentSoft,
    accentText: modeAccent.accentText,
    accentOn: inkOn(accent.accent),
    sidebarAccent: accent.accent,
  };
}

// Dialog action button colors (shape comes from the global `.tool-dialog-btn`
// class). Secondary = muted neutral; primary = soft accent fill.
export function dialogBtnColors(theme: AppTheme): CSSProperties {
  return {
    color: theme.muted,
    background: theme.timerBg,
    borderColor: theme.border,
  };
}

export function dialogPrimaryBtnColors(theme: AppTheme): CSSProperties {
  return {
    color: theme.accentText,
    background: theme.accentSoft,
    borderColor: theme.accent,
  };
}


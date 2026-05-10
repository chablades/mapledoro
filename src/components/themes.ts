export interface AppTheme {
  name: string;
  emoji: string;
  bg: string;
  panel: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
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
  muted: "#8a7f75",
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
  muted: "#807a85",
  sidebar: "#131318",
  timerBg: "#141418",
  badge: "#242428",
  badgeText: "#908890",
};

const COLOR_MODE_BASES: Record<ColorMode, ColorModeBase> = {
  light: LIGHT_BASE,
  dark: DARK_BASE,
};

export const ACCENT_THEMES: Record<string, AccentTheme> = {
  aranya: {
    name: "Aranya",
    emoji: "🪷",
    accent: "#882233",
    light: { accentSoft: "#f6e8ec", accentText: "#6e1828" },
    dark: { accentSoft: "#200c10", accentText: "#c85060" },
  },
  momijigaoka: {
    name: "Momijigaoka",
    emoji: "⛩️",
    accent: "#E95505",
    light: { accentSoft: "#fdeee6", accentText: "#c04404" },
    dark: { accentSoft: "#281204", accentText: "#f08040" },
  },
  default: {
    name: "Default",
    emoji: "🍁",
    accent: "#d4622a",
    light: { accentSoft: "#fdf0ea", accentText: "#c45520" },
    dark: { accentSoft: "#2a1a0e", accentText: "#e89a50" },
  },
  ludibrium: {
    name: "Ludibrium",
    emoji: "🧸",
    accent: "#F6D808",
    light: { accentSoft: "#fef9e0", accentText: "#b8a006" },
    dark: { accentSoft: "#282200", accentText: "#f0d830" },
  },
  juno: {
    name: "Juno",
    emoji: "🌿",
    accent: "#DDEE00",
    light: { accentSoft: "#fafde0", accentText: "#a0aa00" },
    dark: { accentSoft: "#222800", accentText: "#e8f030" },
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
    dark: { accentSoft: "#0a0c28", accentText: "#5860d0" },
  },
  cha: {
    name: "Cha",
    emoji: "🍵",
    accent: "#6677bb",
    light: { accentSoft: "#eef0f8", accentText: "#4c5a9a" },
    dark: { accentSoft: "#141828", accentText: "#8e9cd8" },
  },
  esfera: {
    name: "Esfera",
    emoji: "🔮",
    accent: "#9882C0",
    light: { accentSoft: "#f2eef8", accentText: "#7a62a8" },
    dark: { accentSoft: "#1c1628", accentText: "#b8a0e0" },
  },
  elluel: {
    name: "Elluel",
    emoji: "🌸",
    accent: "#E9A6BB",
    light: { accentSoft: "#fdf2f6", accentText: "#c47a98" },
    dark: { accentSoft: "#2a1420", accentText: "#f0b8d0" },
  },
  yuki: {
    name: "Yuki",
    emoji: "🐰",
    accent: "#d4607a",
    light: { accentSoft: "#fceef2", accentText: "#b84060" },
    dark: { accentSoft: "#301020", accentText: "#f080a0" },
  },
};

export function composeTheme(accentKey: string, colorMode: ColorMode): AppTheme {
  const accent = ACCENT_THEMES[accentKey] ?? ACCENT_THEMES["default"];
  const base = COLOR_MODE_BASES[colorMode];
  const modeAccent = accent[colorMode];

  return {
    name: accent.name,
    emoji: accent.emoji,
    ...base,
    accent: accent.accent,
    accentSoft: modeAccent.accentSoft,
    accentText: modeAccent.accentText,
    sidebarAccent: accent.accent,
  };
}


/*
  Single source of truth for application themes.
  Edit theme colors/names here to affect all pages using shared components.
*/
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

export const THEMES: Record<string, AppTheme> = {
  default: {
    name: "Default",
    emoji: "🍁",
    bg: "#faf8f5",
    panel: "#ffffff",
    border: "#ede8e0",
    text: "#1c1814",
    muted: "#8a7f75",
    accent: "#d4622a",
    accentSoft: "#fdf0ea",
    accentText: "#c45520",
    sidebar: "#fff9f5",
    sidebarAccent: "#d4622a",
    timerBg: "#fdf8f4",
    badge: "#f0e8e0",
    badgeText: "#7a5a40",
  },
  henesys: {
    name: "Henesys",
    emoji: "🌿",
    bg: "#f2faf2",
    panel: "#ffffff",
    border: "#cce8cc",
    text: "#162816",
    muted: "#507050",
    accent: "#2d8a2d",
    accentSoft: "#e8f5e8",
    accentText: "#1e6e1e",
    sidebar: "#f0faf0",
    sidebarAccent: "#2d8a2d",
    timerBg: "#f0faf0",
    badge: "#d4edda",
    badgeText: "#1e5c1e",
  },
  kerning: {
    name: "Kerning City",
    emoji: "🌆",
    bg: "#0e0e18",
    panel: "#16162a",
    border: "#252540",
    text: "#e8e6f8",
    muted: "#7875a0",
    accent: "#7c6aff",
    accentSoft: "#1c1a38",
    accentText: "#a090ff",
    sidebar: "#121228",
    sidebarAccent: "#7c6aff",
    timerBg: "#131328",
    badge: "#1e1c3a",
    badgeText: "#9088cc",
  },
  sleepywood: {
    name: "Sleepywood",
    emoji: "🌑",
    bg: "#100e0c",
    panel: "#1a1612",
    border: "#2a2218",
    text: "#e8ddd0",
    muted: "#806a54",
    accent: "#c47c2a",
    accentSoft: "#281c0c",
    accentText: "#e89a40",
    sidebar: "#161210",
    sidebarAccent: "#c47c2a",
    timerBg: "#181410",
    badge: "#241c10",
    badgeText: "#a07848",
  },
  ellinia: {
    name: "Ellinia",
    emoji: "✨",
    bg: "#0a1020",
    panel: "#101828",
    border: "#182840",
    text: "#d0e8ff",
    muted: "#5880aa",
    accent: "#4ab8ff",
    accentSoft: "#0c1e38",
    accentText: "#7accff",
    sidebar: "#0c1422",
    sidebarAccent: "#4ab8ff",
    timerBg: "#0c1830",
    badge: "#102030",
    badgeText: "#6aaadd",
  },
  mushroomshrine: {
    name: "Mushroom Shrine",
    emoji: "🍄",
    bg: "#fdf5f0",
    panel: "#ffffff",
    border: "#f0ddd0",
    text: "#2a1810",
    muted: "#a07060",
    accent: "#e05a5a",
    accentSoft: "#fff0f0",
    accentText: "#c04040",
    sidebar: "#fff8f5",
    sidebarAccent: "#e05a5a",
    timerBg: "#fff5f2",
    badge: "#fde8e8",
    badgeText: "#a03030",
  },
  yuki: {
    name: "Yuki",
    emoji: "🐰",
    bg: "#faf8f9",
    panel: "#ffffff",
    border: "#eedde6",
    text: "#2a1e24",
    muted: "#a88898",
    accent: "#d4607a",
    accentSoft: "#fceef2",
    accentText: "#b84060",
    sidebar: "#fdf5f8",
    sidebarAccent: "#d4607a",
    timerBg: "#fdf8fa",
    badge: "#e8d5e0",
    badgeText: "#7a4060",
  },
};

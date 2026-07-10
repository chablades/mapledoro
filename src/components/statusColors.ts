import { inkOn, type AppTheme, type ColorMode } from "./themes";

// Status colors carry the same split as the accent tokens: a `fill` is one hex
// shared by both color modes, so it can never also be the text color (a hex dark
// enough to read on white is too dark to read on #101014). Filled pills get
// `fill` + `on`; status-colored text on a neutral surface gets `statusText`.

export type StatusKind = "success" | "danger" | "info" | "warning";

const withInk = (fill: string) => ({ fill, on: inkOn(fill) });

export const STATUS: Record<StatusKind, { fill: string; on: string }> = {
  success: withInk("#10b981"),
  // Darkened from #ef4444 so white ink clears 4.5:1. Dark ink also clears on the
  // original red, but a destructive button reads as destructive in white on red.
  danger: withInk("#dd3135"),
  info: withInk("#3b82f6"),
  warning: withInk("#f59e0b"),
};

// Hue and chroma match the fills; only lightness moves, far enough to clear
// 4.5:1 on every surface in that color mode.
const STATUS_TEXT: Record<ColorMode, Record<"success" | "danger" | "warning", string>> = {
  light: { success: "#00824f", danger: "#d82a31", warning: "#a15a04" },
  dark: { success: "#10b981", danger: "#ef4544", warning: "#d97706" },
};

/** Status-colored *text* on a neutral surface, per color mode — like `accentText`. */
export function statusText(theme: AppTheme, kind: "success" | "danger" | "warning"): string {
  return STATUS_TEXT[theme.colorMode][kind];
}

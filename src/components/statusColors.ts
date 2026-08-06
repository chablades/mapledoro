import { inkOn, type AppTheme, type ColorMode } from "./themes";

// Status colors carry the same split as the accent tokens: a `fill` is one hex
// shared by both color modes, so it can never also be the text color (a hex dark
// enough to read on white is too dark to read on #101014). Filled pills get
// `fill` + `on`; status-colored text on a neutral surface gets `statusText`.

// success -> danger -> critical -> severe is an escalating severity ladder past "danger" --
// critical/severe exist because a feature (Boss Clear's tier colors, see BossClearGrid.tsx) has
// a 6-step severity spectrum and needs distinct hues past danger's red, not because every
// consumer needs 6 steps. Everything here is named for what it MEANS, not what it looks like --
// don't reintroduce a bare color-name key (e.g. "purple"/"orange") alongside these; if a future
// need is genuinely just "a 7th distinct hue" with no severity meaning, it doesn't belong in
// this file's naming scheme.
export type StatusKind = "success" | "danger" | "info" | "warning" | "critical" | "severe";

const withInk = (fill: string) => ({ fill, on: inkOn(fill) });

export const STATUS: Record<StatusKind, { fill: string; on: string }> = {
  success: withInk("#10b981"),
  // Darkened from #ef4444 so white ink clears 4.5:1. Dark ink also clears on the
  // original red, but a destructive button reads as destructive in white on red.
  danger: withInk("#dd3135"),
  info: withInk("#3b82f6"),
  warning: withInk("#f59e0b"),
  // Distinct from both danger's crimson (hue 359) and warning's amber (hue 38) -- sits at hue 26
  // so it doesn't blend into either neighbor. For Boss Clear's severity ladder.
  critical: withInk("#bd580a"),
  // A distinct violet, one step past critical, same reason as critical above.
  severe: withInk("#9436ec"),
};

// Hue and chroma match the fills; only lightness moves, far enough to clear
// 4.5:1 on every surface in that color mode. info's light-mode value is darkened from the
// #3b82f6 fill (which only clears 3.68:1 on white); dark mode reuses the fill as-is since it
// already clears 4.70:1+ on every dark surface. severe's light-mode value reuses its fill
// (#9436ec already clears 4.95:1+ on light surfaces); dark mode needed a LIGHTER violet
// (#ab60f0) since the fill itself only clears ~3.3-3.6:1 on dark surfaces. critical's light-mode
// value is darkened slightly from its fill (#bd580a clears panel but not bg at 4.5:1); dark mode
// needed a LIGHTER orange (#d5630b) since the fill only clears ~3.3-3.9:1 on dark surfaces (same
// pattern as severe). For Boss Clear's tier colors -- see BossClearGrid.tsx's chipTagColor
// and bossClearFormula.ts's ClearColorTier mapping.
const STATUS_TEXT: Record<ColorMode, Record<"success" | "danger" | "warning" | "info" | "critical" | "severe", string>> = {
  light: { success: "#00824f", danger: "#d82a31", warning: "#a15a04", info: "#0b62ef", critical: "#b8550a", severe: "#9436ec" },
  dark: { success: "#10b981", danger: "#ef4544", warning: "#d97706", info: "#3b82f6", critical: "#d5630b", severe: "#ab60f0" },
};

/** Status-colored *text* on a neutral surface, per color mode — like `accentText`. */
export function statusText(theme: AppTheme, kind: "success" | "danger" | "warning" | "info" | "critical" | "severe"): string {
  return STATUS_TEXT[theme.colorMode][kind];
}

import type { Contrast } from "./themes";

/*
  The accessibility settings (Settings > Accessibility). Each is saved under its
  key in localStorage and a same-named cookie (usePersistedPref), so layout.tsx
  can render the first paint with it. Server and client both import this file.
*/

export const CONTRAST_KEY = "mapledoro-contrast";
export const CONTRASTS: readonly Contrast[] = ["standard", "high"];

/** "system" follows the device's reduced-motion setting; "reduce" forces it on. */
export type MotionPref = "system" | "reduce";
export const MOTION_KEY = "mapledoro-motion";
export const MOTION_PREFS: readonly MotionPref[] = ["system", "reduce"];

export type TextSize = "default" | "large" | "larger";
export const TEXT_SIZE_KEY = "mapledoro-text-size";
export const TEXT_SIZES: readonly TextSize[] = ["default", "large", "larger"];

/** Root font size per text size. Type and spacing are in rem, so both scale. */
export const TEXT_SIZE_ROOT: Record<TextSize, string> = {
  default: "100%",
  large: "110%",
  larger: "125%",
};

export function parsePref<T extends string>(raw: string | undefined, valid: readonly T[], fallback: T): T {
  return valid.includes(raw as T) ? (raw as T) : fallback;
}

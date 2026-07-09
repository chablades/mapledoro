import type { KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";

const EDIT_KEYS = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"];

/** Blocks non-digit keys on numeric-only inputs, allowing editing/navigation keys and Ctrl/Cmd shortcuts. */
export function numericKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key) && !EDIT_KEYS.includes(e.key)) e.preventDefault();
}

// Tracks where the most recent real mousedown landed. A capture-phase listener sees it
// before any handler's stopPropagation() can interfere, and before React's own synthetic
// event system re-dispatches it.
let lastMouseDownTarget: EventTarget | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("mousedown", (e) => { lastMouseDownTarget = e.target; }, true);
}

/**
 * True if this click's originating press landed on a different element than the one now
 * receiving the click. Browsers fire `click` on whichever element is under the pointer at
 * mouseup, not wherever mousedown happened — so pressing down inside a search input,
 * dragging (with or without actually selecting any text), and releasing over an unrelated
 * tile still fires a genuine `click` on that tile. Guarding "open this picker"-style click
 * handlers with this turns that leaked click back into the no-op it should've been.
 * `e.detail === 0` marks a keyboard-triggered click (Enter/Space on a focused button),
 * which has no real preceding mousedown to compare against, so those are always let through.
 */
export function isStrayClick(e: ReactMouseEvent): boolean {
  if (e.detail === 0) return false;
  return !!lastMouseDownTarget && !e.currentTarget.contains(lastMouseDownTarget as Node);
}

/**
 * Digits only, with leading zeros stripped (bare "0" stays "0", empty stays empty).
 * numericKeyDown only blocks non-digit keystrokes — it doesn't stop something like
 * "01232" being typed digit-by-digit, and a paste bypasses it entirely. Without this,
 * the leading zero would be saved and sent to MapleScouter as-is.
 */
export function sanitizeDigitsInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return String(Number.parseInt(digits, 10));
}

/** Blocks keys on decimal inputs, allowing digits, a single ".", editing/navigation keys, and Ctrl/Cmd shortcuts. */
export function decimalKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key) && e.key !== "." && !EDIT_KEYS.includes(e.key)) e.preventDefault();
}

/**
 * Clamps a numeric level to [min, max], falling back to min when NaN. Shared by every
 * "level" style input across the app (V/Hexa Matrix nodes, equipment symbols, legion
 * artifacts, the standalone hexa-skills tool) so they all clamp on every keystroke the
 * same way instead of diverging per component.
 */
export function clampNumber(v: number, max: number, min = 0): number {
  return Number.isNaN(v) ? min : Math.max(min, Math.min(max, v));
}

/**
 * Digits + at most one decimal point, capped at 2 decimal places, with leading
 * zeros in the integer part stripped. Keeps a trailing "." intact (e.g. "43.") so
 * the user can keep typing decimal digits.
 */
export function sanitizeDecimalInput(raw: string): string {
  const firstDot = raw.indexOf(".");
  const cleaned = firstDot === -1
    ? raw.replace(/\D/g, "")
    : raw.slice(0, firstDot).replace(/\D/g, "") + "." + raw.slice(firstDot + 1).replace(/\D/g, "");
  if (cleaned === "" || cleaned === ".") return cleaned === "." ? "0." : "";
  const [intPart, decPart] = cleaned.split(".");
  const normalizedInt = intPart === "" ? "0" : String(Number.parseInt(intPart, 10));
  return decPart === undefined ? normalizedInt : `${normalizedInt}.${decPart.slice(0, 2)}`;
}

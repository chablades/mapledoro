import type { KeyboardEvent } from "react";

const EDIT_KEYS = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"];

/** Blocks non-digit keys on numeric-only inputs, allowing editing/navigation keys and Ctrl/Cmd shortcuts. */
export function numericKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key) && !EDIT_KEYS.includes(e.key)) e.preventDefault();
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
 * Digits + at most one decimal point, with leading zeros in the integer part stripped.
 * Keeps a trailing "." intact (e.g. "43.") so the user can keep typing decimal digits.
 */
export function sanitizeDecimalInput(raw: string): string {
  const firstDot = raw.indexOf(".");
  const cleaned = firstDot === -1
    ? raw.replace(/\D/g, "")
    : raw.slice(0, firstDot).replace(/\D/g, "") + "." + raw.slice(firstDot + 1).replace(/\D/g, "");
  if (cleaned === "" || cleaned === ".") return cleaned === "." ? "0." : "";
  const [intPart, decPart] = cleaned.split(".");
  const normalizedInt = intPart === "" ? "0" : String(Number.parseInt(intPart, 10));
  return decPart === undefined ? normalizedInt : `${normalizedInt}.${decPart}`;
}

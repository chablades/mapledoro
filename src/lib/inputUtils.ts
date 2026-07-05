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

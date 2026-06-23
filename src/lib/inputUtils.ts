import type { KeyboardEvent } from "react";

const EDIT_KEYS = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab","Home","End"];

/** Blocks non-digit keys on numeric-only inputs, allowing editing/navigation keys. */
export function numericKeyDown(e: KeyboardEvent<HTMLInputElement>) {
  if (!/^\d$/.test(e.key) && !EDIT_KEYS.includes(e.key)) e.preventDefault();
}

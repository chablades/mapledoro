import type { KeyboardEvent } from "react";

// Number inputs render a literal "0" when their value is zero. Without this, a
// typed digit lands beside that zero ("0" + "5" → "05"/"50") instead of replacing
// it. When the field currently holds just "0" and a digit is pressed, select the
// "0" first so the keystroke overwrites it — keeps the zero visible at rest while
// covering both the click-in and backspace-to-zero cases.
export function replaceZeroOnDigit(e: KeyboardEvent<HTMLInputElement>) {
  if (e.currentTarget.value === "0" && e.key.length === 1 && e.key >= "0" && e.key <= "9") {
    e.currentTarget.select();
  }
}

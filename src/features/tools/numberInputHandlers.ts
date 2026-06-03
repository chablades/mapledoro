import type { KeyboardEvent } from "react";

// Number inputs render a literal resting value (usually "0", but "1" for fields
// that can't drop below 1, like an always-unlocked Origin skill). Without this, a
// typed digit lands beside that value ("0" + "5" → "05"/"50") instead of replacing
// it. When the field currently holds just the base value and a digit is pressed,
// select it first so the keystroke overwrites it — keeps the base visible at rest
// while covering both the click-in and backspace-to-base cases.
function selectOnDigitWhenValueIs(base: string) {
  return (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.currentTarget.value === base && e.key.length === 1 && e.key >= "0" && e.key <= "9") {
      e.currentTarget.select();
    }
  };
}

export const replaceZeroOnDigit = selectOnDigitWhenValueIs("0");
export const replaceOneOnDigit = selectOnDigitWhenValueIs("1");

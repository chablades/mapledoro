"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

function firstEnabledIndex<T>(items: readonly T[], isDisabled?: (item: T) => boolean): number {
  for (let i = 0; i < items.length; i++) {
    if (!isDisabled?.(items[i])) return i;
  }
  return -1;
}

function stepIndex<T>(items: readonly T[], from: number, dir: 1 | -1, isDisabled?: (item: T) => boolean): number {
  if (items.length === 0) return -1;
  let i = from;
  for (let step = 0; step < items.length; step++) {
    i = (i + dir + items.length) % items.length;
    if (!isDisabled?.(items[i])) return i;
  }
  return from;
}

interface UseKeyboardListNavOptions<T> {
  /** The currently visible/selectable items, in display order. */
  items: readonly T[];
  /** Changes exactly when the highlight should snap back to the first enabled item
   *  (e.g. the dropdown's open state, or a search query). */
  resetKey: unknown;
  isDisabled?: (item: T) => boolean;
  onSelect: (item: T, index: number) => void;
  /** Escape closes the picker outright, in addition to arrow-key navigation. Optional
   *  since some callers (e.g. a trigger button that opens/closes its own popover)
   *  already handle Escape themselves before this hook ever sees the keystroke. */
  onClose?: () => void;
  /** Shift+Tab steps back to the previous field in a chained group (e.g. a familiar's
   *  Line 2 back to Line 1). Optional — only chained-group pickers wire this up; plain
   *  Shift+Tab falls through to native focus movement when omitted. */
  onPrev?: () => void;
  /** Tab steps forward to the next field in a chained group, WITHOUT picking anything —
   *  ordinary form-tabbing semantics, distinct from Enter (which picks the highlighted
   *  item). Optional — plain Tab falls through to native focus movement when omitted. */
  onNext?: () => void;
}

interface UseKeyboardListNavResult {
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  /** Ref callback for row `index` — scrolls it into view while it's highlighted. */
  itemRef: (index: number) => (el: HTMLElement | null) => void;
}

/**
 * Shared Down/Up/Enter/Escape navigation for an open picker or dropdown list: arrow
 * keys move a highlighted index (skipping disabled entries), Enter selects it, Escape
 * closes it (when `onClose` is passed) — so a list can be driven end-to-end without a
 * mouse. Reset via `resetKey` rather than an effect (React's "adjust state during
 * render" pattern), since the project's lint rules disallow bare setState in useEffect.
 */
export function useKeyboardListNav<T>({
  items, resetKey, isDisabled, onSelect, onClose, onPrev, onNext,
}: UseKeyboardListNavOptions<T>): UseKeyboardListNavResult {
  const [manualHighlight, setManualHighlight] = useState<number | null>(null);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  const itemNodesRef = useRef<Map<number, HTMLElement> | null>(null);
  if (itemNodesRef.current === null) itemNodesRef.current = new Map();

  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    if (manualHighlight !== null) setManualHighlight(null);
  }

  const highlightedIndex = manualHighlight !== null && manualHighlight < items.length
    ? manualHighlight
    : firstEnabledIndex(items, isDisabled);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && onClose) {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setManualHighlight(stepIndex(items, highlightedIndex, 1, isDisabled));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setManualHighlight(stepIndex(items, highlightedIndex, -1, isDisabled));
    } else if (e.key === "Tab" && e.shiftKey) {
      if (onPrev) {
        e.preventDefault();
        onPrev();
      }
    } else if (e.key === "Tab") {
      if (onNext) {
        e.preventDefault();
        onNext();
      }
    } else if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < items.length) {
      e.preventDefault();
      onSelect(items[highlightedIndex], highlightedIndex);
    }
  }

  // Scroll on highlight change only — not inside the ref callback below, which React
  // re-invokes on every render (its identity changes each call), which would otherwise
  // snap the list back to the highlighted row any time something unrelated re-renders.
  useEffect(() => {
    itemNodesRef.current!.get(highlightedIndex)?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  function itemRef(index: number) {
    return (el: HTMLElement | null) => {
      if (!el) {
        itemNodesRef.current!.delete(index);
        return;
      }
      itemNodesRef.current!.set(index, el);
    };
  }

  return { highlightedIndex, setHighlightedIndex: setManualHighlight, onKeyDown, itemRef };
}

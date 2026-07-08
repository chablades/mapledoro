"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { AppTheme } from "./themes";

const EDGE_MARGIN = 8;

/**
 * Wraps children with a name bubble that shows on hover (desktop) or tap (touch).
 * Replaces the native `title` attribute, which only works on hover and is unreachable on touch.
 */
export default function HoverTooltip({ label, theme, style, children }: {
  label: ReactNode;
  theme: AppTheme;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Computed from the wrapper's natural center (unaffected by any prior shift), so this
  // doesn't need shiftX as a dependency and can stay stable across renders.
  const recenter = useCallback(() => {
    const wrapper = ref.current;
    const bubble = bubbleRef.current;
    if (!wrapper || !bubble) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const bubbleWidth = bubble.offsetWidth;
    const centerX = wrapperRect.left + wrapperRect.width / 2;
    const naturalLeft = centerX - bubbleWidth / 2;
    const naturalRight = centerX + bubbleWidth / 2;
    if (naturalLeft < EDGE_MARGIN) setShiftX(EDGE_MARGIN - naturalLeft);
    else if (naturalRight > window.innerWidth - EDGE_MARGIN) setShiftX(window.innerWidth - EDGE_MARGIN - naturalRight);
    else setShiftX(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    recenter();
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, recenter]);

  return (
    <div
      ref={ref}
      className="hover-tip"
      style={style}
      onClick={() => setOpen((o) => !o)}
      onMouseEnter={recenter}
    >
      {children}
      <div
        ref={bubbleRef}
        className={`hover-tip-bubble${open ? " is-open" : ""}`}
        style={{
          background: theme.panel,
          color: theme.text,
          border: `1px solid ${theme.border}`,
          transform: `translateX(calc(-50% + ${shiftX}px))`,
        }}
      >
        {label}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AppTheme } from "./themes";
import { MODAL_OPENED_EVENT } from "./ModalShell";

const EDGE_MARGIN = 8;
const GAP = 6;

function isHoverCapable(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Wraps children with a name bubble that shows on hover (desktop), tap (touch), or keyboard
 * focus. Replaces the native `title` attribute, which only works on hover and is unreachable
 * on touch. Rendered via a portal to document.body (position: fixed) rather than position:
 * absolute within the page flow -- any ancestor with overflow other than "visible" (e.g.
 * .profile-binder's intentional overflow:hidden for its height-pinning trick, see
 * CharacterSetupFlow.styles.ts) silently clips an absolutely-positioned bubble. InfoTooltip.tsx
 * hit the same class of bug earlier and uses the same fix.
 */
export default function HoverTooltip({ label, theme, style, children }: {
  label: ReactNode;
  theme: AppTheme;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [clickOpen, setClickOpen] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const [shiftX, setShiftX] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const open = hoverOpen || clickOpen || focusOpen;

  // Anchored via `bottom` (distance from the viewport's bottom edge) rather than `top`, so the
  // browser positions the bubble correctly on its very first paint without JS already knowing
  // the bubble's own (not-yet-measured) height.
  const place = useCallback(() => {
    const wrapper = ref.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    setPos({ left: rect.left + rect.width / 2, bottom: window.innerHeight - rect.top + GAP });
  }, []);

  // Horizontal viewport-edge clamp -- needs the bubble's actual width, so it can only run once
  // the bubble has mounted and been measured (mirrors the old recenter()'s shiftX math).
  const clamp = useCallback(() => {
    const bubble = bubbleRef.current;
    if (!bubble || !pos) return;
    const bubbleWidth = bubble.offsetWidth;
    const naturalLeft = pos.left - bubbleWidth / 2;
    const naturalRight = pos.left + bubbleWidth / 2;
    if (naturalLeft < EDGE_MARGIN) setShiftX(EDGE_MARGIN - naturalLeft);
    else if (naturalRight > window.innerWidth - EDGE_MARGIN) setShiftX(window.innerWidth - EDGE_MARGIN - naturalRight);
    else setShiftX(0);
  }, [pos]);

  useEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (open && pos) clamp();
  }, [open, pos, clamp]);

  useEffect(() => {
    if (!clickOpen) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (bubbleRef.current?.contains(target)) return;
      setClickOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [clickOpen]);

  const closeAll = useCallback(() => {
    setHoverOpen(false);
    setClickOpen(false);
    setFocusOpen(false);
  }, []);

  // Position is computed once per open rather than tracked live, so letting the page scroll
  // under a `fixed` bubble would visibly detach it from its trigger -- close instead (same
  // tradeoff InfoTooltip makes).
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", closeAll, true);
    return () => window.removeEventListener("scroll", closeAll, true);
  }, [open, closeAll]);

  // A trigger whose own click opens a ModalShell dialog (rather than navigating elsewhere,
  // which would unmount this component and clear its state for free) goes inert once
  // showModal() runs -- it stops receiving the mouse/focus events this component would
  // otherwise rely on to close itself, including its own clickOpen toggle from that same
  // click. ModalShell broadcasts this event right as it opens so the bubble doesn't linger
  // stuck floating over the modal.
  useEffect(() => {
    if (!open) return;
    window.addEventListener(MODAL_OPENED_EVENT, closeAll);
    return () => window.removeEventListener(MODAL_OPENED_EVENT, closeAll);
  }, [open, closeAll]);

  return (
    // This wraps arbitrary children — sometimes a real interactive control (which already
    // exposes this label via its own aria-label), sometimes a purely decorative icon with
    // nothing focusable inside. Neither a real <button> (would nest inside an existing
    // button in some call sites) nor an onKeyDown equivalent (would double-fire alongside
    // the inner control's own Enter-activated click, canceling the toggle out) is safe
    // here. Keyboard visibility is instead handled by onFocus/onBlur below, which reveal
    // the bubble whenever a focusable descendant gains focus, with no risk of double-
    // toggling since it doesn't touch click logic.
    // react-doctor-disable-next-line no-static-element-interactions, click-events-have-key-events
    <div
      ref={ref}
      className="hover-tip"
      style={style}
      // A click supersedes whatever passive hover/focus state was showing -- important when
      // the wrapped element's own click handler opens a native <dialog>, which makes the
      // background (including this trigger) inert and stops delivering further mouse/focus
      // events to it. Without this, hoverOpen/focusOpen can freeze true from the instant of
      // the click and the bubble stays stuck floating over the modal until an unrelated
      // pointerdown inside the dialog happens to close clickOpen via the effect below.
      onClick={() => {
        setHoverOpen(false);
        setFocusOpen(false);
        setClickOpen((o) => !o);
      }}
      onMouseEnter={() => { if (isHoverCapable()) setHoverOpen(true); }}
      onMouseLeave={() => { if (isHoverCapable()) setHoverOpen(false); }}
      onFocus={() => setFocusOpen(true)}
      onBlur={(e) => {
        if (ref.current && e.relatedTarget instanceof Node && ref.current.contains(e.relatedTarget)) return;
        setFocusOpen(false);
      }}
    >
      {children}
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={bubbleRef}
          className="hover-tip-bubble"
          style={{
            left: pos.left,
            bottom: pos.bottom,
            transform: `translateX(calc(-50% + ${shiftX}px))`,
            background: theme.panel,
            color: theme.text,
            border: `1px solid ${theme.border}`,
          }}
        >
          {label}
        </div>,
        document.body,
      )}
    </div>
  );
}

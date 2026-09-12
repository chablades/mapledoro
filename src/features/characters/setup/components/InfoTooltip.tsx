"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";

export interface TooltipContent {
  title: string;
  description: ReactNode;
  /** Plain URLs render at full size, no offset; pass `{ src, scale, offsetY }` for an icon
   *  whose raw art isn't cropped consistently with its neighbors (a real MapleStory asset
   *  inconsistency, not something CSS alone can fix, as with the Oz Ring Boss Ring Box icons).
   *  `scale`, 0 to 1, shrinks it, and `offsetY`, in px where positive is down, nudges vertical
   *  position. Both apply via `transform` rather than width, height or margin, so every icon's
   *  box keeps the same size and position in the row, with no separate re-centering to get
   *  slightly wrong. */
  imageUrls?: (string | { src: string; scale?: number; offsetY?: number })[];
  link?: { href: string; label: string };
}

const infoButtonStyle = (theme: AppTheme, open: boolean, bordered: boolean): CSSProperties => ({
  width: "1rem",
  height: "1rem",
  borderRadius: bordered ? "50%" : 0,
  border: bordered ? `1.5px solid ${theme.muted}` : "none",
  background: bordered && open ? `${theme.accent}18` : "transparent",
  color: open ? theme.accent : theme.muted,
  fontSize: "0.75rem",
  fontWeight: 900,
  fontFamily: "inherit",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  flexShrink: 0,
  lineHeight: 1,
  transition: "color 0.1s, background 0.1s",
});

// A plain SVG rather than the U+1F512 emoji: iOS renders emoji through its own emoji
// font (a colorful padlock, not the flat glyph other platforms show), which reads as
// visually inconsistent next to the "?" tooltip trigger. `currentColor` follows the
// button's own color, so it dims to theme.muted / lights to theme.accent the same way
// the "?" text already does, with no extra color prop to keep in sync.
export function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="0.95rem" height="0.95rem" aria-hidden="true">
      <path
        d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8v6H4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Rendered via a portal straight to document.body (position: fixed, viewport coordinates) rather
// than position: absolute within the page flow. Any ancestor with overflow other than "visible",
// even overflow-x alone, which silently forces overflow-y to "auto" too (see AppShell.tsx),
// becomes an accidental clipping container for an absolutely positioned popup. Fixed plus a
// portal sidesteps that whole class of which-ancestor-is-clipping-it bugs.
const infoPopupStyle = (theme: AppTheme, top: number, left: number, maxHeight: number): CSSProperties => ({
  position: "fixed",
  top,
  left,
  zIndex: 200,
  background: theme.bg,
  border: `1px solid ${theme.border}`,
  borderRadius: "10px",
  padding: "0.7rem 0.85rem",
  width: "min(240px, calc(100vw - 24px))",
  maxHeight,
  overflowY: "auto",
  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
});

function TooltipImage({ src, scale = 1, offsetY = 0 }: { src: string; scale?: number; offsetY?: number }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const transforms = [
    offsetY !== 0 ? `translateY(${offsetY}px)` : "",
    scale !== 1 ? `scale(${scale})` : "",
  ].filter(Boolean).join(" ");
  return (
    <>
      <div ref={wrapperRef}>
        <Image
          src={src}
          alt=""
          width={28}
          height={28}
          unoptimized
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = "none";
            if (fallbackRef.current) fallbackRef.current.style.display = "block";
          }}
          style={{
            borderRadius: "6px", display: "block", objectFit: "contain",
            transform: transforms || undefined,
          }}
        />
      </div>
      <div ref={fallbackRef} style={{ display: "none" }} />
    </>
  );
}

// A 0.4rem gap between trigger and popup, matching the original CSS-based spacing. Computed off
// the root font-size rather than a hardcoded 16px, in case browser text zoom is active.
function remToPx(rem: number): number {
  if (typeof document === "undefined") return rem * 16;
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export default function InfoTooltip({ content, theme, icon = "?", label = "More information", bordered = true }: {
  content: TooltipContent;
  theme: AppTheme;
  /** Glyph shown in the trigger button, defaults to "?". Pass a different glyph (e.g. a
   *  lock) for a tooltip with a different job, like explaining why a field is locked
   *  rather than what the field means. */
  icon?: ReactNode;
  /** aria-label for the trigger button, should match what `icon` communicates. */
  label?: string;
  /** The circular border/background chrome that makes "?" read as a button. A glyph
   *  that already reads as clickable on its own (e.g. a lock) can skip it. */
  bordered?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  function handleToggle() {
    const next = !open;
    if (next && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Generous placeholder for the one frame before the effect below measures the
      // popup's real height and picks a side and cap. Never visible as a scroll gap, since
      // it's corrected before paint settles.
      setPos({ top: rect.bottom + remToPx(0.4), left: rect.left, maxHeight: window.innerHeight });
    }
    setOpen(next);
  }

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const popup = popupRef.current;
    if (container && popup) {
      const margin = 8;
      const gap = remToPx(0.4);
      const rect = container.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
      const spaceAbove = rect.top - gap - margin;
      const naturalHeight = popup.offsetHeight;
      // Flip above the trigger when there isn't enough room below in the viewport. Otherwise
      // a tooltip opened near the bottom of a step forces the page to grow to fit it, pushing
      // content past the footer. When the popup's natural height fits on neither side, as with
      // a long description on a short viewport, pick whichever side has more room and cap it
      // there with an internal scroll rather than running off the bottom of the screen.
      const openAbove = naturalHeight > spaceBelow && (naturalHeight <= spaceAbove || spaceAbove > spaceBelow);
      const maxHeight = Math.max(80, openAbove ? Math.min(naturalHeight, spaceAbove) : Math.min(naturalHeight, spaceBelow));
      const top = openAbove ? rect.top - maxHeight - gap : rect.bottom + gap;
      const naturalRight = rect.left + popup.offsetWidth;
      let left = rect.left;
      if (naturalRight > window.innerWidth - margin) left = window.innerWidth - margin - popup.offsetWidth;
      if (left < margin) left = margin;
      setPos({ top, left, maxHeight });
    }
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      setOpen(false);
    }
    // Fixed positioning is computed once at open time rather than tracked live, so closing on
    // scroll keeps the popup from visibly detaching from its trigger as the page moves under
    // it. Capture phase (see addEventListener below) means this also fires for a scroll inside
    // the popup itself, in its own overflowY: auto content (see infoPopupStyle's maxHeight).
    // That isn't the page moving under it, so it shouldn't close, unlike every other scroll
    // source.
    function handleScroll(e: Event) {
      if (e.target instanceof Node && popupRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={label}
        style={infoButtonStyle(theme, open, bordered)}
      >
        {icon}
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div ref={popupRef} style={infoPopupStyle(theme, pos.top, pos.left, pos.maxHeight)}>
          {content.imageUrls && content.imageUrls.length > 0 && (
            <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.4rem" }}>
              {content.imageUrls.map((entry) => {
                const { src, scale, offsetY } = typeof entry === "string" ? { src: entry, scale: undefined, offsetY: undefined } : entry;
                return <TooltipImage key={src} src={src} scale={scale} offsetY={offsetY} />;
              })}
            </div>
          )}
          <p style={{ margin: 0, marginBottom: "0.3rem", fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>
            {content.title}
          </p>
          <div style={{ fontSize: "0.78rem", fontWeight: 400, color: theme.muted, lineHeight: 1.5 }}>
            {content.description}
          </div>
          {content.link && (
            <a
              href={content.link.href}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-block", marginTop: "0.45rem", fontSize: "0.75rem", color: theme.accent, fontWeight: 700, textDecoration: "none" }}
            >
              {content.link.label} →
            </a>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

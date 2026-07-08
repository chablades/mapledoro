"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";

export interface TooltipContent {
  title: string;
  description: ReactNode;
  /** Plain URLs render at full size, no offset; pass `{ src, scale, offsetY }` for an icon
   *  whose raw art isn't cropped consistently with its neighbors (a real MapleStory asset
   *  inconsistency, not something CSS alone can fix — see the Oz Ring Boss Ring Box icons).
   *  `scale` (0-1) shrinks it, `offsetY` (px, +down) nudges vertical position. Both apply
   *  via `transform` rather than width/height/margin, so every icon's box stays the same
   *  size and position in the row — no separate re-centering to get slightly wrong. */
  imageUrls?: (string | { src: string; scale?: number; offsetY?: number })[];
  link?: { href: string; label: string };
}

const infoButtonStyle = (theme: AppTheme, open: boolean): CSSProperties => ({
  width: "1rem",
  height: "1rem",
  borderRadius: "50%",
  border: `1.5px solid ${theme.muted}`,
  background: open ? `${theme.accent}18` : "transparent",
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

const infoPopupStyle = (theme: AppTheme, shiftX: number, openAbove: boolean): CSSProperties => ({
  position: "absolute",
  ...(openAbove ? { bottom: "calc(100% + 0.4rem)" } : { top: "calc(100% + 0.4rem)" }),
  left: 0,
  transform: shiftX ? `translateX(${shiftX}px)` : undefined,
  zIndex: 200,
  background: theme.bg,
  border: `1px solid ${theme.border}`,
  borderRadius: "10px",
  padding: "0.7rem 0.85rem",
  width: "min(240px, calc(100vw - 24px))",
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
            borderRadius: "5px", display: "block", objectFit: "contain",
            transform: transforms || undefined,
          }}
        />
      </div>
      <div ref={fallbackRef} style={{ display: "none" }} />
    </>
  );
}

export default function InfoTooltip({ content, theme }: { content: TooltipContent; theme: AppTheme }) {
  const [open, setOpen] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  const [openAbove, setOpenAbove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const popup = popupRef.current;
    if (container && popup) {
      const margin = 8;
      const rect = container.getBoundingClientRect();
      const naturalRight = rect.left + popup.offsetWidth;
      setShiftX(naturalRight > window.innerWidth - margin ? window.innerWidth - margin - naturalRight : 0);
      // Flip above the trigger when there isn't enough room below in the viewport —
      // otherwise a tooltip opened near the bottom of a step forces the page to grow
      // to fit it, visibly pushing content past the footer.
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenAbove(spaceBelow < popup.offsetHeight + margin && rect.top > spaceBelow);
    }
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More information"
        style={infoButtonStyle(theme, open)}
      >
        ?
      </button>
      {open && (
        <div ref={popupRef} style={infoPopupStyle(theme, shiftX, openAbove)}>
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
        </div>
      )}
    </div>
  );
}

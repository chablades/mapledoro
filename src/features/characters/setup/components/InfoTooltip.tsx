"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";

export interface TooltipContent {
  title: string;
  description: ReactNode;
  imageUrls?: string[];
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

const infoPopupStyle = (theme: AppTheme, shiftX: number): CSSProperties => ({
  position: "absolute",
  top: "calc(100% + 0.4rem)",
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

function TooltipImage({ src }: { src: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
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
          style={{ borderRadius: "5px", display: "block" }}
        />
      </div>
      <div ref={fallbackRef} style={{ display: "none" }} />
    </>
  );
}

export default function InfoTooltip({ content, theme }: { content: TooltipContent; theme: AppTheme }) {
  const [open, setOpen] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const popup = popupRef.current;
    if (container && popup) {
      const margin = 8;
      const naturalLeft = container.getBoundingClientRect().left;
      const naturalRight = naturalLeft + popup.offsetWidth;
      setShiftX(naturalRight > window.innerWidth - margin ? window.innerWidth - margin - naturalRight : 0);
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
        <div ref={popupRef} style={infoPopupStyle(theme, shiftX)}>
          {content.imageUrls && content.imageUrls.length > 0 && (
            <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.4rem" }}>
              {content.imageUrls.map((src) => <TooltipImage key={src} src={src} />)}
            </div>
          )}
          <p style={{ margin: 0, marginBottom: "0.3rem", fontSize: "0.82rem", fontWeight: 800, color: theme.text }}>
            {content.title}
          </p>
          <div style={{ fontSize: "0.78rem", color: theme.muted, lineHeight: 1.5 }}>
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

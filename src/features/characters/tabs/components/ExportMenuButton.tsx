"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { AppTheme } from "../../../../components/themes";
import { usePickerCoords } from "../../../../lib/usePickerCoords";
import { exportCharacterCard, exportCharacterJson } from "../../share/characterExport";

const MENU_WIDTH = 170;

type Status = "idle" | "working" | "done" | "failed";

const STATUS_LABEL: Record<Status, string> = { idle: "Export", working: "Exporting…", done: "Export", failed: "Export failed" };

const menuStyle = (theme: AppTheme): CSSProperties => ({
  position: "absolute", top: 0, left: 0, width: MENU_WIDTH, zIndex: 310, display: "flex", flexDirection: "column",
  padding: 4, background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 10,
  boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
});

const itemStyle = (theme: AppTheme): CSSProperties => ({
  border: "none", background: "none", padding: "8px 10px", borderRadius: 6, textAlign: "left",
  fontFamily: "inherit", fontSize: "0.8rem", fontWeight: 700, color: theme.text, cursor: "pointer",
});

/** The profile's Export tab: opens a menu of export formats. Downloads are silent in some
 *  browsers, so the tab itself flashes (and says "Exporting…" while a card renders). */
export default function ExportMenuButton({ theme, charName, icon, className }: {
  theme: AppTheme;
  charName: string | undefined;
  icon: ReactNode;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const { ref: wrapperRef, portalRef } = usePickerCoords(open, MENU_WIDTH);
  const focusedOnOpen = useRef(false);

  useEffect(() => {
    if (status !== "done" && status !== "failed") return;
    const t = setTimeout(() => setStatus("idle"), status === "failed" ? 2500 : 400);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapperRef.current?.contains(target) && !portalRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, wrapperRef, portalRef]);

  function exportJson() {
    setOpen(false);
    exportCharacterJson(charName);
    setStatus("done");
  }

  async function exportCard() {
    setOpen(false);
    setStatus("working");
    try {
      await exportCharacterCard(charName);
      setStatus("done");
    } catch (err) {
      console.error("[export] card export failed", err);
      setStatus("failed");
    }
  }

  // Moves focus into the menu once per open, so keyboard users land on the first option. The
  // menu mounts at the page's top-left before usePickerCoords places it, so focusing must not
  // scroll, or the page jumps to the top.
  const focusFirst = (el: HTMLButtonElement | null) => {
    if (!el || focusedOnOpen.current) return;
    focusedOnOpen.current = true;
    el.focus({ preventScroll: true });
  };

  const highlighted = status === "done" || status === "working";
  return (
    <div ref={wrapperRef}>
      <button
        type="button"
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={status === "working"}
        onClick={() => { focusedOnOpen.current = false; setOpen((v) => !v); }}
        style={{
          background: highlighted ? `${theme.accent}33` : "transparent",
          color: highlighted ? theme.accentText : theme.muted,
          gap: 6,
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
        {icon}
        {STATUS_LABEL[status]}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div ref={portalRef} role="menu" aria-label="Export format" style={menuStyle(theme)}>
          <button ref={focusFirst} type="button" role="menuitem" style={itemStyle(theme)} onClick={exportJson}>JSON file</button>
          <button type="button" role="menuitem" style={itemStyle(theme)} onClick={() => void exportCard()}>Card image (PNG)</button>
        </div>,
        document.body,
      )}
    </div>
  );
}

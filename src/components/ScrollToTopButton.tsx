"use client";

import { useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import type { AppTheme } from "./themes";

const SCROLL_THRESHOLD = 400;

const subscribe = (cb: () => void) => {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
};

const buttonBase: CSSProperties = {
  position: "fixed",
  bottom: "1.5rem",
  right: "1.5rem",
  zIndex: 40,
  width: "44px",
  height: "44px",
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.1rem",
  fontWeight: 800,
  boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
  transition:
    "opacity 0.25s ease, transform 0.25s ease, visibility 0.25s, background 0.35s ease",
};

export default function ScrollToTopButton({ theme }: { theme: AppTheme }) {
  const visible = useSyncExternalStore(
    subscribe,
    () => window.scrollY > SCROLL_THRESHOLD,
    () => false,
  );

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{
        ...buttonBase,
        background: theme.accent,
        color: theme.accentOn,
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        transform: visible ? "translateY(0)" : "translateY(0.5rem)",
      }}
    >
      ↑
    </button>
  );
}

"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { STATUS, statusText } from "../../../components/statusColors";
import { SCOUTER_ENGINE_NOTICE } from "./ScouterFigure";

// Owned here only: a per-browser "seen it" flag for the notice below, nothing else.
const DISMISSED_KEY = "mapledoro_scouter_engine_notice_dismissed";

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}
function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch { /* blocked storage: the notice just comes back next visit */ }
  for (const listener of listeners) listener();
}

// Same shape as the app's other inline notes (the Stat Optimizer's WarnNote): a soft tinted panel
// with a thin border all round, in the info tone.
function noticeStyle(theme: AppTheme): CSSProperties {
  return {
    display: "flex", alignItems: "flex-start", gap: 8, margin: 0, padding: "0.55rem 0.75rem",
    fontSize: "0.78rem", lineHeight: 1.5, color: theme.text, background: theme.timerBg,
    border: `1px solid ${STATUS.info.fill}55`, borderRadius: 10,
  };
}

const dismissStyle: CSSProperties = {
  background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer", lineHeight: 1, marginLeft: "auto",
};

function InfoIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-5M12 8h.01" />
    </svg>
  );
}

/** Slim, dismissible note above the Scouter and Stat Efficiency bookmarks, saying the figures now
 *  come from MapleDoro's own engine. Hidden during server render and once dismissed. */
export default function ScouterEngineNotice({ theme, style }: { theme: AppTheme; style?: CSSProperties }) {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  if (dismissed) return null;
  return (
    <div role="note" style={{ ...noticeStyle(theme), ...style }}>
      <InfoIcon color={statusText(theme, "info")} />
      <span>{SCOUTER_ENGINE_NOTICE}</span>
      <button type="button" className="tap-target-44" aria-label="Dismiss notice" onClick={dismiss} style={{ ...dismissStyle, color: theme.muted }}>✕</button>
    </div>
  );
}

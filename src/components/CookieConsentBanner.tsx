"use client";

import { useSyncExternalStore, useCallback } from "react";
import type { CSSProperties } from "react";
import { Analytics } from "@vercel/analytics/next";
import { useTheme } from "./ThemeContext";

const STORAGE_KEY = "mapledoro_analytics_consent";

type Consent = "granted" | "denied" | null;

function readConsent(): Consent {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "granted" || v === "denied") return v;
  } catch { /* SSR or blocked storage */ }
  return null;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

function useConsent() {
  const consent = useSyncExternalStore(subscribe, readConsent, () => null);

  const setConsent = useCallback((value: "granted" | "denied") => {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  return { consent, setConsent };
}

export default function CookieConsentBanner() {
  const { theme } = useTheme();
  const { consent, setConsent } = useConsent();

  return (
    <>
      {consent === "granted" && <Analytics />}
      {consent === null && <Banner theme={theme} onAccept={() => setConsent("granted")} onDecline={() => setConsent("denied")} />}
    </>
  );
}

function Banner({
  theme,
  onAccept,
  onDecline,
}: {
  theme: { panel: string; border: string; text: string; muted: string; accent: string };
  onAccept: () => void;
  onDecline: () => void;
}) {
  const containerStyle: CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    padding: "1rem 1.5rem",
    background: theme.panel,
    borderTop: `1px solid ${theme.border}`,
    boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    flexWrap: "wrap",
  };

  const buttonBase: CSSProperties = {
    border: "none",
    borderRadius: "10px",
    fontFamily: "inherit",
    fontWeight: 800,
    fontSize: "0.82rem",
    padding: "0.5rem 1rem",
    cursor: "pointer",
  };

  return (
    <div style={containerStyle}>
      <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: theme.text, maxWidth: 560 }}>
        We use anonymous analytics to understand how the site is used and to improve your experience. No personal data is collected. Learn more in our{" "}
        <a
          href="/privacy"
          style={{ color: theme.accent, textDecoration: "underline" }}
        >
          Privacy Policy
        </a>
        .
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onDecline}
          style={{ ...buttonBase, background: "transparent", border: `1px solid ${theme.border}`, color: theme.muted }}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          style={{ ...buttonBase, background: theme.accent, color: "#fff" }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}

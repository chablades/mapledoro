"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { useTheme } from "../../components/ThemeContext";

// No AppShell here: every link in the nav points at a tool that is down, so this
// page stands alone and only inherits the theme from the root layout.
const PAGE_STYLE: CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1.5rem",
};

const CARD_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: 460,
  padding: "2.75rem 2rem",
  textAlign: "center",
};

const LOGO_STYLE: CSSProperties = {
  display: "block",
  margin: "0 auto 1.5rem",
  borderRadius: "16px",
};

const TITLE_STYLE: CSSProperties = {
  margin: "0 0 0.5rem",
};

const SUBTEXT_STYLE: CSSProperties = {
  margin: "0 0 1.25rem",
  fontSize: "0.95rem",
  fontWeight: 700,
};

const BODY_STYLE: CSSProperties = {
  margin: 0,
  fontSize: "0.85rem",
  lineHeight: 1.6,
};

const BUTTON_STYLE: CSSProperties = {
  marginTop: "1.75rem",
  padding: "0.6rem 1.4rem",
  border: "none",
  borderRadius: "12px",
  font: "inherit",
  fontSize: "0.85rem",
  fontWeight: 700,
  cursor: "pointer",
};

export default function MaintenanceContent() {
  const { theme } = useTheme();

  return (
    <div style={{ ...PAGE_STYLE, background: theme.bg, color: theme.text }}>
      <div
        className="fade-in panel-card"
        style={{
          ...CARD_STYLE,
          background: theme.panel,
          border: `1px solid ${theme.border}`,
        }}
      >
        <Image
          src="/icons/doro.png"
          alt=""
          width={96}
          height={96}
          unoptimized
          priority
          style={LOGO_STYLE}
        />
        <h1 className="page-title" style={{ ...TITLE_STYLE, color: theme.text }}>
          MapleDoro is under maintenance
        </h1>
        <p style={{ ...SUBTEXT_STYLE, color: theme.accentText }}>
          critical bug detected. am fixing. - doro
        </p>
        <p style={{ ...BODY_STYLE, color: theme.muted }}>
          Your data is saved in your browser rather than on a server, and this
          page does not touch it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ ...BUTTON_STYLE, background: theme.accent, color: theme.accentOn }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

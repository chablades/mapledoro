"use client";

import type { AppTheme } from "./themes";

export function LegalSection({
  theme,
  title,
  children,
}: {
  theme: AppTheme;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          fontSize: "0.95rem",
          fontWeight: 800,
          color: theme.text,
          marginBottom: "0.4rem",
        }}
      >
        {title}
      </div>
      <div style={{ color: theme.text, fontSize: "0.88rem", lineHeight: 1.7, fontWeight: 500 }}>
        {children}
      </div>
    </div>
  );
}

export default function LegalPageLayout({
  theme,
  title,
  lastUpdated,
  children,
}: {
  theme: AppTheme;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-title" style={{ color: theme.text }}>
          {title}
        </div>
        <div className="page-subtitle" style={{ color: theme.muted }}>
          Last updated: {lastUpdated}
        </div>

        <div
          className="fade-in panel-card"
          style={{
            background: theme.panel,
            border: `1px solid ${theme.border}`,
            borderRadius: "14px",
            padding: "1.5rem 1.75rem",
            marginTop: "1rem",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

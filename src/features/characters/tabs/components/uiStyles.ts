import type { CSSProperties } from "react";
import type { AppTheme } from "../../../../components/themes";

export function panelCardStyle(theme: AppTheme, padding: string): CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: "20px",
    padding,
    boxShadow: "0 12px 36px rgba(0,0,0,0.08)",
  };
}

export function titleStyle(): CSSProperties {
  return {
    fontFamily: "'Fredoka One', cursive",
    fontSize: "1.8rem",
    lineHeight: 1.15,
    margin: 0,
    marginBottom: "0.45rem",
  };
}

export function subtitleStyle(theme: AppTheme): CSSProperties {
  return { color: theme.muted, fontSize: "0.95rem", fontWeight: 600, margin: 0 };
}

export function primaryButtonStyle(theme: AppTheme, padding = "0.65rem 0.9rem"): CSSProperties {
  return {
    border: "none",
    borderRadius: "10px",
    background: theme.accent,
    color: "#fff",
    fontFamily: "inherit",
    fontWeight: 800,
    fontSize: "0.9rem",
    padding,
    cursor: "pointer",
  };
}

export function secondaryButtonStyle(theme: AppTheme, padding = "0.65rem 0.9rem"): CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    borderRadius: "10px",
    background: theme.bg,
    color: theme.text,
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: "0.9rem",
    padding,
    cursor: "pointer",
  };
}

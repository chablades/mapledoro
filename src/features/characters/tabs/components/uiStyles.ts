import type { CSSProperties } from "react";
import type { AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";

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
    fontFamily: "var(--font-heading)",
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
    color: theme.accentOn,
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

export function dangerButtonStyle(theme: AppTheme, padding = "0.28rem 0.62rem"): CSSProperties {
  const red = statusText(theme, "danger");
  return {
    border: `1px solid ${red}`,
    borderRadius: "999px",
    background: theme.bg,
    color: red,
    fontFamily: "inherit",
    fontWeight: 800,
    fontSize: "0.78rem",
    padding,
    width: "fit-content",
    cursor: "pointer",
  };
}

export function successButtonStyle(theme: AppTheme, padding = "0.28rem 0.62rem"): CSSProperties {
  const green = statusText(theme, "success");
  return {
    border: `1px solid ${green}`,
    borderRadius: "999px",
    background: theme.bg,
    color: green,
    fontFamily: "inherit",
    fontWeight: 800,
    fontSize: "0.78rem",
    padding,
    width: "fit-content",
    cursor: "pointer",
  };
}

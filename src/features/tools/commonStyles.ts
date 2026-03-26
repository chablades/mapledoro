/** Shared theme-aware style factories for tool workspaces. */

import type { AppTheme } from "../../components/themes";

export function inputStyle(theme: AppTheme): React.CSSProperties {
  return {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    padding: "6px 10px",
    color: theme.text,
    fontFamily: "'Nunito', sans-serif",
    fontSize: "0.82rem",
    fontWeight: 700,
    outline: "none",
  };
}

export function sectionPanel(theme: AppTheme): React.CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: "18px",
    padding: "1.25rem",
    marginBottom: "1.25rem",
  };
}

export function labelStyle(theme: AppTheme): React.CSSProperties {
  return {
    fontSize: "0.7rem",
    fontWeight: 800,
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "8px",
  };
}

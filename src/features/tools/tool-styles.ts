import type { CSSProperties } from "react";
import type { AppTheme } from "../../components/themes";

export interface ToolStyles {
  sectionPanel: CSSProperties;
  inputStyle: CSSProperties;
  selectStyle: CSSProperties;
  labelStyle: CSSProperties;
}

export function toolStyles(theme: AppTheme): ToolStyles {
  const sectionPanel: CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    padding: "1.25rem",
    marginBottom: "1.25rem",
  };

  const inputStyle: CSSProperties = {
    background: theme.timerBg,
    border: `1px solid ${theme.border}`,
    color: theme.text,
    fontSize: "0.82rem",
    fontWeight: 700,
    borderRadius: "8px",
    padding: "7px 10px",
  };

  const selectStyle: CSSProperties = {
    ...inputStyle,
    cursor: "pointer",
  };

  const labelStyle: CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 800,
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "4px",
  };

  return { sectionPanel, inputStyle, selectStyle, labelStyle };
}

import type { CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";

export function panelStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: "1rem 1.1rem",
    marginBottom: "1rem",
  };
}

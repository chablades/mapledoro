import type { CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";

export function panelStyle(theme: AppTheme): CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: "1.25rem",
    marginBottom: "1.5rem",
  };
}

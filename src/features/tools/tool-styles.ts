import type { CSSProperties } from "react";
import { dialogBtnColors, dialogPrimaryBtnColors } from "../../components/ConfirmDialog";
import type { AppTheme } from "../../components/themes";

export interface ToolStyles {
  sectionPanel: CSSProperties;
  inputStyle: CSSProperties;
  selectStyle: CSSProperties;
  labelStyle: CSSProperties;
  dialogBtnStyle: CSSProperties;
  dialogPrimaryBtnStyle: CSSProperties;
}

export function toolStyles(theme: AppTheme): ToolStyles {
  const sectionPanel: CSSProperties = {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    padding: "1.25rem",
    marginBottom: "1.25rem",
  };

  // Dynamic theme colors only. Static settings (radius, padding, font,
  // border width) live in the `.tool-input` / `.tool-select` /
  // `.tool-field-label` global CSS classes; callers pair the className with
  // these inline color objects.
  const inputStyle: CSSProperties = {
    background: theme.timerBg,
    borderColor: theme.border,
    color: theme.text,
  };

  const selectStyle: CSSProperties = { ...inputStyle };

  const labelStyle: CSSProperties = {
    color: theme.muted,
  };

  // Dialog action buttons (colors only; shape comes from `.tool-dialog-btn`).
  const dialogBtnStyle: CSSProperties = dialogBtnColors(theme);

  const dialogPrimaryBtnStyle: CSSProperties = dialogPrimaryBtnColors(theme);

  return {
    sectionPanel,
    inputStyle,
    selectStyle,
    labelStyle,
    dialogBtnStyle,
    dialogPrimaryBtnStyle,
  };
}

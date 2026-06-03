import { ItemIcon as ResourceItemIcon } from "../../../components/ResourceImage";
import type { AppTheme } from "../../../components/themes";

export function panelStyle(theme: AppTheme): React.CSSProperties {
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: "1.25rem",
    marginBottom: "1.5rem",
  };
}

export function ItemIcon({ id }: { id: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    >
      <ResourceItemIcon id={id} size={32} />
    </span>
  );
}

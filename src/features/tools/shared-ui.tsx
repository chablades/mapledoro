import type { AppTheme } from "../../components/themes";

const toggleBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "10px",
  fontSize: "0.8rem",
  fontWeight: 700,
  cursor: "pointer",
  userSelect: "none",
};

export function Toggle({
  theme,
  label,
  checked,
  onChange,
  disabled = false,
  style,
}: {
  theme: AppTheme;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const mergedStyle: React.CSSProperties = {
    ...toggleBase,
    ...style,
    color: checked ? theme.accentText : theme.muted,
    background: checked ? theme.accentSoft : theme.timerBg,
    border: `1px solid ${checked ? theme.accent : theme.border}`,
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
  const content = `${checked ? "\u2713 " : ""}${label}`;

  if (disabled) {
    return <div role="button" aria-disabled style={mergedStyle}>{content}</div>;
  }

  const activate = () => onChange(!checked);
  return (
    <div
      className="tool-btn"
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); } }}
      style={mergedStyle}
    >
      {content}
    </div>
  );
}

export function PillGroup<T extends string>({
  theme,
  options,
  value,
  onChange,
}: {
  theme: AppTheme;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        background: theme.timerBg,
        borderRadius: "10px",
        padding: "3px",
        border: `1px solid ${theme.border}`,
      }}
    >
      {options.map((o) => (
        <div
          key={o.value}
          className="tool-btn"
          role="button"
          tabIndex={0}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(o.value); } }}
          style={{
            padding: "5px 12px",
            borderRadius: "8px",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: value === o.value ? "#fff" : theme.muted,
            background: value === o.value ? theme.accent : "transparent",
            userSelect: "none",
          }}
        >
          {o.label}
        </div>
      ))}
    </div>
  );
}

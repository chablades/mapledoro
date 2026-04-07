import type { AppTheme } from "../../components/themes";

export function Toggle({
  theme,
  label,
  checked,
  onChange,
}: {
  theme: AppTheme;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="tool-btn"
      onClick={() => onChange(!checked)}
      style={{
        padding: "8px 16px",
        borderRadius: "10px",
        fontSize: "0.8rem",
        fontWeight: 700,
        cursor: "pointer",
        color: checked ? theme.accentText : theme.muted,
        background: checked ? theme.accentSoft : theme.timerBg,
        border: `1px solid ${checked ? theme.accent : theme.border}`,
        userSelect: "none",
      }}
    >
      {checked ? "\u2713 " : ""}
      {label}
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
          onClick={() => onChange(o.value)}
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

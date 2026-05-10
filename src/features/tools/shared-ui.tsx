import type { AppTheme } from "../../components/themes";
import type { MvpTier } from "./star-force/star-force-data";

export const MVP_OPTIONS: { value: MvpTier; label: string }[] = [
  { value: "none", label: "None" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "diamond", label: "Diamond" },
];

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
}: {
  theme: AppTheme;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="tool-btn"
      role="button"
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(!checked); } }}
      style={{
        ...toggleBase,
        color: checked ? theme.accentText : theme.muted,
        background: checked ? theme.accentSoft : theme.timerBg,
        border: `1px solid ${checked ? theme.accent : theme.border}`,
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

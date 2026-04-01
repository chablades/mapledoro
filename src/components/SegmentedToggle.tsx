import type { AppTheme } from "./themes";

interface SegmentedToggleProps<T extends string> {
  theme: AppTheme;
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  sectionPanel: React.CSSProperties;
  btnClassName?: string;
  onChange: (value: T) => void;
}

export function SegmentedToggle<T extends string>({
  theme,
  options,
  value,
  labels,
  sectionPanel,
  btnClassName,
  onChange,
}: SegmentedToggleProps<T>) {
  return (
    <div className="fade-in panel-card" style={sectionPanel}>
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
        {options.map((t) => (
          <div
            key={t}
            className={btnClassName}
            onClick={() => onChange(t)}
            style={{
              flex: 1,
              padding: "9px 18px",
              borderRadius: "8px",
              fontSize: "0.88rem",
              fontWeight: 800,
              textAlign: "center",
              cursor: "pointer",
              userSelect: "none",
              color: value === t ? theme.accentText : theme.muted,
              background: value === t ? theme.accentSoft : "transparent",
            }}
          >
            {labels[t]}
          </div>
        ))}
      </div>
    </div>
  );
}

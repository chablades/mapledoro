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
        className="segmented-toggle-track"
        style={{
          background: theme.timerBg,
          border: `1px solid ${theme.border}`,
        }}
      >
        {options.map((t) => (
          <button
            key={t}
            type="button"
            className={["segmented-toggle-option", btnClassName].filter(Boolean).join(" ")}
            onClick={() => onChange(t)}
            style={{
              color: value === t ? theme.accentText : theme.muted,
              background: value === t ? theme.accentSoft : "transparent",
            }}
          >
            {labels[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

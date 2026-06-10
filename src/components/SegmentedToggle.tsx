import type { AppTheme } from "./themes";

interface SegmentedToggleProps<T extends string> {
  theme: AppTheme;
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  /** Panel chrome around the track. Omit to render the bare track for
   *  embedding in an existing panel or row. */
  sectionPanel?: React.CSSProperties;
  /** Extra styles on the track itself (margins / flex sizing in bare mode). */
  trackStyle?: React.CSSProperties;
  btnClassName?: string;
  onChange: (value: T) => void;
}

export function SegmentedToggle<T extends string>({
  theme,
  options,
  value,
  labels,
  sectionPanel,
  trackStyle,
  btnClassName,
  onChange,
}: SegmentedToggleProps<T>) {
  const track = (
    <div
      className="segmented-toggle-track"
      style={{
        background: theme.timerBg,
        border: `1px solid ${theme.border}`,
        ...trackStyle,
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
  );

  if (!sectionPanel) return track;

  return (
    <div className="fade-in panel-card" style={sectionPanel}>
      {track}
    </div>
  );
}

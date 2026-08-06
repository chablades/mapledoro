import type { AppTheme } from "./themes";

interface SegmentedToggleProps<T extends string> {
  theme: AppTheme;
  options: readonly T[];
  value: T;
  labels: Record<T, string>;
  /** Names the group of choices ("Symbol type"). Without it the buttons are
   *  announced as loose toggles with no indication of what they switch. */
  ariaLabel: string;
  /** `id` of the region the toggle swaps. Set it when picking an option
   *  replaces a whole panel rather than restyling what's already on screen, so
   *  a screen reader can follow the switch to what actually changed. */
  ariaControls?: string;
  /** Panel chrome around the track. Omit to render the bare track for
   *  embedding in an existing panel or row. */
  sectionPanel?: React.CSSProperties;
  /** Extra styles on the track itself (margins / flex sizing in bare mode). */
  trackStyle?: React.CSSProperties;
  btnClassName?: string;
  /** Greys the whole track out and stops it taking input, for when the choice
   *  it offers isn't available yet. */
  disabled?: boolean;
  /** How the selected option is filled. `"soft"` (default) tints it and keeps
   *  the accent as ink; `"solid"` fills it with the accent and flips the ink to
   *  `accentOn`. Solid reads louder, for a small picker sitting in a row of
   *  controls rather than a full-width switch between panels. */
  variant?: "soft" | "solid";
  onChange: (value: T) => void;
}

export function SegmentedToggle<T extends string>({
  theme,
  options,
  value,
  labels,
  ariaLabel,
  ariaControls,
  sectionPanel,
  trackStyle,
  btnClassName,
  disabled,
  variant = "soft",
  onChange,
}: SegmentedToggleProps<T>) {
  // `accentOn` is the derived ink for an `accent` fill; `accent` is never a text
  // color, which is why the pair flips together.
  const selectedColor = variant === "solid" ? theme.accentOn : theme.accentText;
  const selectedBackground = variant === "solid" ? theme.accent : theme.accentSoft;
  const track = (
    <div
      className="segmented-toggle-track"
      role="group"
      aria-label={ariaLabel}
      style={{
        background: theme.timerBg,
        border: `1px solid ${theme.border}`,
        opacity: disabled ? 0.55 : 1,
        ...trackStyle,
      }}
    >
      {options.map((t) => (
        <button
          key={t}
          type="button"
          className={["segmented-toggle-option", btnClassName].filter(Boolean).join(" ")}
          aria-pressed={value === t}
          aria-controls={ariaControls}
          disabled={disabled}
          onClick={() => onChange(t)}
          style={{
            color: value === t ? selectedColor : theme.muted,
            background: value === t ? selectedBackground : "transparent",
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

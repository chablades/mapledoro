interface RefreshSpinnerIconProps {
  color: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

export default function RefreshSpinnerIcon({ color, size = 12, className, style, "aria-label": ariaLabel }: RefreshSpinnerIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ display: "inline-block", ...style }}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <path
        d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path d="M17 3v4h-4" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

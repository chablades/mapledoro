import type { AppTheme } from "./themes";

/** `label` names what is progressing ("Liberation progress"). Required: a bare
 *  progressbar announces a percentage with no indication of what it measures. */
export function ProgressBar({ pct, theme, label }: { pct: number; theme: AppTheme; label: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        height: "12px",
        borderRadius: "6px",
        background: theme.timerBg,
        border: `1px solid ${theme.border}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: "100%",
          background: theme.accent,
          borderRadius: "6px",
          transform: `scaleX(${clamped / 100})`,
          transformOrigin: "left",
          transition: "transform 0.35s ease",
        }}
      />
    </div>
  );
}

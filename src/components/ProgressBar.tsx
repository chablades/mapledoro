import type { AppTheme } from "./themes";

export function ProgressBar({ pct, theme }: { pct: number; theme: AppTheme }) {
  return (
    <div
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
          width: `${pct}%`,
          background: theme.accent,
          borderRadius: "6px",
          transition: "width 0.35s ease",
        }}
      />
    </div>
  );
}

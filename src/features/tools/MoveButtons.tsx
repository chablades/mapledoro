import type { CSSProperties } from "react";
import type { AppTheme } from "../../components/themes";

// The single-click alternative to useCardReorder's drag (WCAG 2.5.7 Dragging
// Movements): every draggable card also carries this pair, which works by mouse,
// touch and keyboard alike. Each button is 24px, the WCAG 2.5.8 minimum target.

const PATHS = {
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  left: "M15 6l-6 6 6 6",
  right: "M9 6l6 6-6 6",
};

function buttonStyle(theme: AppTheme, disabled: boolean): CSSProperties {
  return {
    width: 24,
    height: 24,
    padding: 0,
    borderRadius: 6,
    border: `1px solid ${theme.border}`,
    background: theme.timerBg,
    color: theme.muted,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
}

/** Move-earlier / move-later buttons for the entry at `index` of `count`. `label`
 *  names the entry ("Move Aran earlier"). `axis` picks the arrows: "y" for a
 *  stacked list, "x" for a grid that reads left to right. */
export function MoveButtons({ theme, label, index, count, axis, onMove }: {
  theme: AppTheme;
  label: string;
  index: number;
  count: number;
  axis: "x" | "y";
  onMove: (from: number, to: number) => void;
}) {
  if (count < 2) return null;
  const steps = [
    { to: index - 1, text: "earlier", icon: axis === "y" ? PATHS.up : PATHS.left },
    { to: index + 1, text: "later", icon: axis === "y" ? PATHS.down : PATHS.right },
  ];
  return (
    <span style={{ display: "inline-flex", gap: 2, flexShrink: 0 }}>
      {steps.map(({ to, text, icon }) => {
        const disabled = to < 0 || to >= count;
        return (
          <button
            key={text}
            type="button"
            aria-label={`Move ${label} ${text}`}
            disabled={disabled}
            onClick={() => onMove(index, to)}
            style={buttonStyle(theme, disabled)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={icon} />
            </svg>
          </button>
        );
      })}
    </span>
  );
}

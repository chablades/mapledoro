import type { CSSProperties } from "react";
import type { AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import HoverTooltip from "../../../../components/HoverTooltip";
import type { ExpDelta } from "../../model/expProgress";

function formatPercent(value: number): string {
  return value.toFixed(3);
}

function expDeltaBadgeStyle(theme: AppTheme, fontSize: string): CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 2, color: statusText(theme, "success"), fontWeight: 800, fontSize };
}

/** Small "made progress since last check" badge, shown next to a character's current EXP
 *  percent on the directory card and the EXP bookmark. The percent shown is net across any
 *  level-ups crossed (see netExpPercentGained), so it can read past 100% -- the level count
 *  behind it is condensed into a hover/focus tooltip rather than shown inline. */
export default function ExpDeltaBadge({ theme, delta, fontSize = "0.75rem" }: { theme: AppTheme; delta: ExpDelta; fontSize?: string }) {
  const pct = formatPercent(delta.percentDelta);
  const badge = (
    <span style={expDeltaBadgeStyle(theme, fontSize)} aria-label={`Up ${pct}% since last update`}>
      <span aria-hidden="true">&#9650;</span>
      {pct}%
    </span>
  );
  if (delta.levelDelta <= 0) return badge;
  return (
    <HoverTooltip theme={theme} label={`+${delta.levelDelta} Lv`}>
      {badge}
    </HoverTooltip>
  );
}

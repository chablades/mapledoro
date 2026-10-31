import type { CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import { statusText } from "../../../components/statusColors";
import { formatFigure } from "./scouterFormat";

const chipStyle: CSSProperties = { fontSize: 12, fontWeight: 800, fontFamily: "var(--font-heading)", whiteSpace: "nowrap" };

/** The "+1,234" beside a Boss 380 figure while it counts (useCountUp in useScouterChange.ts),
 *  fading out after (.scouter-change-chip in globals.css); onDone fires when it has. */
export default function ScouterChangeChip({ theme, diff, onDone }: { theme: AppTheme; diff: number; onDone: () => void }) {
  return (
    <span
      className="scouter-change-chip"
      onAnimationEnd={onDone}
      style={{ ...chipStyle, color: statusText(theme, diff > 0 ? "success" : "danger") }}
    >
      {diff > 0 ? "+" : "-"}{formatFigure(Math.abs(diff))}
    </span>
  );
}

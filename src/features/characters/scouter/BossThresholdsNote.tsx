"use client";

import type { CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import InfoTooltip, { type TooltipContent } from "../setup/components/InfoTooltip";
import { BOSSCUT_SCRAPED_AT } from "./bosscut-data.generated";

const BOSS_THRESHOLD_INFO_CONTENT: TooltipContent = {
  title: "Boss thresholds",
  description: (
    <p style={{ margin: 0 }}>
      Boss Clear thresholds from MapleScouter, informally curated by a small group of experienced
      players rather than measured across the whole playerbase.
    </p>
  ),
};

const noteStyle: CSSProperties = {
  fontSize: 12, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, textAlign: "right",
};

/** "Boss thresholds as of <date>" with where the numbers come from, under every Boss Clear view. */
export default function BossThresholdsNote({ theme }: { theme: AppTheme }) {
  return (
    <span style={{ ...noteStyle, color: theme.muted }}>
      Boss thresholds as of {BOSSCUT_SCRAPED_AT}
      <InfoTooltip theme={theme} label="Where do these numbers come from?" content={BOSS_THRESHOLD_INFO_CONTENT} />
    </span>
  );
}

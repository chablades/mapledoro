"use client";

import type { CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import InfoTooltip, { type TooltipContent } from "../setup/components/InfoTooltip";
import { BOSSCUT_SCRAPED_AT } from "./bosscut-data.generated";

const BOSS_THRESHOLD_INFO_CONTENT: TooltipContent = {
  title: "Boss thresholds",
  description: (
    <>
      <p style={{ margin: "0 0 0.5rem" }}>
        Boss Clear thresholds from MapleScouter, informally curated by a small group of experienced
        players rather than measured across the whole playerbase.
      </p>
      {/* Temporary until GMS gets the 20-minute timer patch: MapleScouter already models every
          boss on KMS's post-patch 20-minute timer with HP scaled to match, which preserves the
          required DPS, so the numbers hold for GMS's current timers. Drop this paragraph once
          the patch lands. (Champion Black Mage, the one exception, explains itself on its own
          chip -- see bossClearFormula.ts's effectiveEasyRate.) */}
      <p style={{ margin: 0 }}>
        MapleScouter already uses the 20-minute boss timers with HP cut to match, so the damage
        you need per minute is the same as on GMS&apos;s current timers and these numbers still
        apply.
      </p>
    </>
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

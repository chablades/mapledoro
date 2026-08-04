"use client";

import type { AppTheme } from "../../../../components/themes";
import type { StoredCharacterRecord } from "../../model/charactersStore";

const CARD_WIDTH = 720;
const CARD_HEIGHT = 1080;

// Rasterized via html-to-image into the PNG that gets downloaded for "Export as Image" --
// never actually shown to the user, only captured then discarded. Placeholder content for
// now (name + level only); the real layout reuses BiographyPanel/OverviewKeyStatsSection/
// renderOverviewSection from CharacterProfileOverviewScreen.tsx once this pipeline is
// proven end-to-end.
export default function ProfileShareCard({ theme, character }: { theme: AppTheme; character: StoredCharacterRecord }) {
  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        background: theme.panel,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 800 }}>{character.characterName}</div>
      <div style={{ fontSize: 22, color: theme.muted }}>Lv. {character.level} {character.jobName}</div>
    </div>
  );
}

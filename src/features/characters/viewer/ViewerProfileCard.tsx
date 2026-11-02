"use client";

import { useState, type CSSProperties } from "react";
import type { AppTheme } from "../../../components/themes";
import type { StoredCharacterRecord } from "../model/charactersStore";
import { characterExpPercent, isExpTrackingAvailable } from "../model/expProgress";
import { resolveDisplayJobName } from "../setup/data/nexonJobMapping";
import { CHARACTERS_COPY } from "../tabs/content";
import CharacterAvatar from "../tabs/components/CharacterAvatar";
import { panelCardStyle, primaryButtonStyle, secondaryButtonStyle } from "../tabs/components/uiStyles";

const COPY = CHARACTERS_COPY.characterViewer;

/** Local time, matching a saved profile's own "Updated" line (CharacterProfileScreen.tsx). */
function formatFetchedAt(fetchedAt: number): string {
  return new Date(fetchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const lineStyle = (theme: AppTheme, size: string): CSSProperties => ({
  margin: 0, width: "100%", fontSize: size, color: theme.muted, fontWeight: 700, lineHeight: 1.3, textAlign: "center",
});

const backButtonStyle = (theme: AppTheme): CSSProperties => {
  const { border, background, color } = secondaryButtonStyle(theme);
  return { border, background, color, fontFamily: "inherit", cursor: "pointer", fontWeight: 800, whiteSpace: "nowrap", alignSelf: "flex-start" };
};

// The same neutral chip a mule gets in the directory, so "Viewing" reads as a role-like status
// in the place a saved character shows Main / Champion / Mule.
const viewingChipStyle = (theme: AppTheme): CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", width: "fit-content",
  borderRadius: "999px", padding: "0.22rem 0.68rem", fontSize: "0.76rem", fontWeight: 800,
  letterSpacing: "0.02em", textTransform: "uppercase",
  background: theme.panel, border: `1px solid ${theme.border}`, color: theme.muted,
});

const actionBarStyle = (theme: AppTheme): CSSProperties => ({
  border: `1px solid ${theme.border}`, borderRadius: "12px", background: theme.bg,
  padding: "0.45rem 0.55rem", display: "flex", justifyContent: "center",
  boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
});

const addIcon = (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/** The viewer's left column: the card a profile shows, with "Open another" where a profile has
 *  its way back to the directory, and one action in place of Set main / Set champion / Remove. */
export default function ViewerProfileCard({ theme, character, existsInDirectory, fromQr, onOpenAnother, onAdd }: {
  theme: AppTheme;
  character: StoredCharacterRecord;
  existsInDirectory: boolean;
  fromQr: boolean;
  onOpenAnother: () => void;
  onAdd: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const fetchedDate = formatFetchedAt(character.fetchedAt);

  return (
    <>
      <section className="character-search-panel search-card search-fade-in" style={panelCardStyle(theme, "1.5rem")}>
        <div style={{ display: "grid", justifyItems: "center", gap: "0.5rem" }}>
          <div className="confirmed-summary-card confirmed-summary-card--setup">
            <div className="character-profile-nav-row">
              <button type="button" onClick={onOpenAnother} className="char-profile-back-btn tap-target-44" style={backButtonStyle(theme)}>
                {/* The same desktop and mobile pair as a profile's own back button: the longer
                    label pushed the card past a phone's width. */}
                <span className="desktop-back-label">{`← ${COPY.openAnotherButton}`}</span>
                <span className="mobile-back-label">← Back</span>
              </button>
            </div>
            <div className={`confirmed-avatar-wrap ${imageLoaded ? "" : "image-skeleton-wrap"}`}>
              {character.characterImgURL && (
                <CharacterAvatar
                  key={character.characterImgURL}
                  src={character.characterImgURL}
                  alt={`${character.characterName} avatar`}
                  width={210}
                  height={210}
                  onReady={() => setImageLoaded(true)}
                  className={`image-fade-in ${imageLoaded ? "image-loaded" : ""}`}
                />
              )}
            </div>
            <div className="confirmed-summary-info">
              <div style={{ margin: 0, width: "100%", fontSize: "1.32rem", fontWeight: 800, lineHeight: 1.15, color: theme.text, textAlign: "center" }}>
                {character.characterName}
              </div>
              <p style={lineStyle(theme, "0.95rem")}>{resolveDisplayJobName(character.jobName)}</p>
              <p style={lineStyle(theme, "0.95rem")}>Level {character.level}</p>
              {isExpTrackingAvailable(character.level) && (
                <p style={lineStyle(theme, "0.85rem")}>{characterExpPercent(character.level, character.exp).toFixed(3)}%</p>
              )}
              <div className="profile-role-chip-row" style={{ display: "flex", justifyContent: "center", width: "100%", marginTop: "0.35rem", marginBottom: "0.2rem", minHeight: "26px" }}>
                <span className="profile-role-chip" style={viewingChipStyle(theme)}>{COPY.viewingChip}</span>
              </div>
              <p className="profile-updated-line" style={{ ...lineStyle(theme, "0.78rem"), marginTop: "0.2rem" }}>
                Updated <span className="profile-updated-date">{fetchedDate}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="profile-actions-wrap" style={{ marginTop: "0.5rem", width: "100%", maxWidth: "300px", marginInline: "auto" }}>
        <div className="profile-actions-card profile-actions-fade-in" style={{ display: "grid", gap: "0.5rem" }}>
          <div style={actionBarStyle(theme)}>
            <button
              type="button"
              className="profile-action-button tap-target-44"
              onClick={onAdd}
              style={{ ...primaryButtonStyle(theme, "0.4rem 0.9rem"), borderRadius: "999px", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            >
              {!existsInDirectory && addIcon}
              {existsInDirectory ? COPY.updateButton : COPY.addButton}
            </button>
          </div>
          {fromQr && (
            <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: theme.muted, lineHeight: 1.45, textAlign: "center" }}>
              {COPY.qrNote}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

import type { CSSProperties } from "react";
import { CHARACTERS_COPY } from "../content";
import { resolveDisplayJobName } from "../../setup/data/nexonJobMapping";
import type { SearchPaneActions, SearchPaneModel } from "../paneModels";
import { secondaryButtonStyle } from "../components/uiStyles";
import CharacterAvatar from "../components/CharacterAvatar";

function navBackButtonColorStyle(theme: SearchPaneModel["theme"]): CSSProperties {
  const { border, background, color } = secondaryButtonStyle(theme);
  return { border, background, color };
}

type ProfileRole = "main" | "champion" | "mule";

function isCharacterStale(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

function formatFetchedAt(fetchedAt: number): string {
  return new Date(fetchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function profileRoleBadgeStyle(
  theme: SearchPaneModel["theme"],
  role: ProfileRole,
) {
  if (role === "main") {
    return {
      background: theme.accentSoft,
      border: `1px solid ${theme.accent}`,
      color: theme.accentText,
    };
  }
  if (role === "champion") {
    return {
      background: "#fff4df",
      border: "1px solid #d7a047",
      color: "#8c5b16",
    };
  }
  return {
    background: theme.panel,
    border: `1px solid ${theme.border}`,
    color: theme.muted,
  };
}

const roleChipRowStyle: CSSProperties = {
  display: "flex",
  gap: "0.32rem",
  flexWrap: "wrap",
  width: "100%",
  marginTop: "0.35rem",
  marginBottom: "0.2rem",
  minHeight: "26px",
};

function roleChipStyle(theme: SearchPaneModel["theme"], role: ProfileRole): CSSProperties {
  return {
    ...profileRoleBadgeStyle(theme, role),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    borderRadius: "999px",
    padding: "0.22rem 0.68rem",
    fontSize: "0.76rem",
    fontWeight: 800,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  };
}

function getProfileRoleChips(
  isCurrentMainCharacter: boolean,
  isCurrentChampionCharacter: boolean,
): Array<ProfileRole> {
  if (isCurrentMainCharacter && isCurrentChampionCharacter) return ["main", "champion"];
  if (isCurrentMainCharacter) return ["main"];
  if (isCurrentChampionCharacter) return ["champion"];
  return ["mule"];
}

interface CharacterProfileScreenProps {
  model: SearchPaneModel;
  actions: SearchPaneActions;
}

export default function CharacterProfileScreen({
  model,
  actions,
}: CharacterProfileScreenProps) {
  const { theme, shell, profile } = model;
  if (!profile.confirmedCharacter) return null;
  const roleChips = getProfileRoleChips(
    profile.isCurrentMainCharacter,
    profile.isCurrentChampionCharacter,
  );
  const isStale = isCharacterStale(profile.confirmedCharacter.expiresAt);
  const formattedDate = formatFetchedAt(profile.confirmedCharacter.fetchedAt);
  let statusPrefix: string | null = null;
  if (!profile.isRefreshing && isStale) statusPrefix = "⚠ ";

  return (
    <div style={{ display: "grid", justifyItems: "center", gap: "0.5rem" }}>
      <div
        className={[
          "confirmed-summary-card",
          profile.isSetupContext ? "confirmed-summary-card--setup" : "",
          shell.isBackTransitioning ? "preview-confirm-fade" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="character-profile-nav-row">
          <button
            type="button"
            disabled={shell.isUiLocked}
            aria-label={CHARACTERS_COPY.characterProfile.viewYourCharactersButton}
            onClick={
              profile.canViewCharacterDirectory
                ? actions.toggleCharacterDirectory
                : actions.backFromSetupFlow
            }
            className="char-profile-back-btn tap-target-44"
            style={{
              ...navBackButtonColorStyle(theme),
              fontFamily: "inherit",
              cursor: "pointer",
              fontWeight: 800,
              whiteSpace: "nowrap",
              alignSelf: "flex-start",
            }}
          >
            {profile.canViewCharacterDirectory ? (
              <>
                <span className="desktop-back-label">
                  {`← ${CHARACTERS_COPY.characterProfile.viewYourCharactersButton}`}
                </span>
                <span className="mobile-back-label">← Back</span>
              </>
            ) : (
              CHARACTERS_COPY.characterProfile.backButton
            )}
          </button>
        </div>
        <div
          className={`confirmed-avatar-wrap ${!profile.confirmedImageLoaded ? "image-skeleton-wrap" : ""}`}
        >
          <CharacterAvatar
            key={profile.confirmedCharacter.characterImgURL}
            src={profile.confirmedCharacter.characterImgURL}
            alt={`${profile.confirmedCharacter.characterName} avatar`}
            width={210}
            height={210}
            onReady={actions.confirmedImageLoaded}
            className={`image-fade-in ${profile.confirmedImageLoaded ? "image-loaded" : ""}`}
          />
        </div>
        <div className="confirmed-summary-info">
          <p
            style={{
              margin: 0,
              fontSize: "1.32rem",
              fontWeight: 800,
              lineHeight: 1.15,
              color: theme.text,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            {profile.confirmedCharacter.characterName}
            {profile.currentCharacterGender === "male" && (
              <span aria-label="Male" title="Male" style={{ color: "#2563eb", fontSize: "1.02rem", lineHeight: 1 }}>
                ♂
              </span>
            )}
            {profile.currentCharacterGender === "female" && (
              <span aria-label="Female" title="Female" style={{ color: "#db2777", fontSize: "1.02rem", lineHeight: 1 }}>
                ♀
              </span>
            )}
            {profile.currentCharacterMarried === true && (
              <span
                aria-label="Married"
                title={profile.currentCharacterPartnerName ? `Married to ${profile.currentCharacterPartnerName}` : "Married"}
                style={{ color: "#db2777", fontSize: "1.02rem", lineHeight: 1 }}
              >
                ♥
              </span>
            )}
          </p>
          <p style={{ margin: 0, fontSize: "0.95rem", color: theme.muted, fontWeight: 700, lineHeight: 1.3 }}>
            {resolveDisplayJobName(profile.confirmedCharacter.jobName)}
          </p>
          <p style={{ margin: 0, fontSize: "1rem", color: theme.muted, fontWeight: 700, lineHeight: 1.3 }}>
            Level {profile.confirmedCharacter.level}
          </p>
          {profile.canViewCharacterDirectory && (
            <div className="profile-role-chip-row" style={roleChipRowStyle}>
              {roleChips.map((role) => (
                <span
                  key={role}
                  className="profile-role-chip"
                  style={roleChipStyle(theme, role)}
                >
                  {{ main: "Main", champion: "Champion", mule: "Mule" }[role]}
                </span>
              ))}
            </div>
          )}
          {!profile.isAddingCharacter && !profile.setupStepActive && (
            <p style={{ margin: 0, marginTop: "0.4rem", fontSize: "0.78rem", color: isStale ? "#d97706" : theme.muted, fontWeight: 700, lineHeight: 1.3 }}>
              {profile.isRefreshing && <span className="char-refresh-spin" style={{ color: theme.muted }}>↻ </span>}
              {statusPrefix}Updated {formattedDate}
            </p>
          )}
          {(isStale || profile.isRefreshing) && profile.onRefresh && (
            <button
              type="button"
              className="tap-target-44"
              disabled={profile.isRefreshing}
              onClick={profile.onRefresh}
              style={{
                marginTop: "0.4rem",
                background: "transparent",
                border: `1px solid ${theme.border}`,
                borderRadius: "999px",
                color: theme.muted,
                fontFamily: "inherit",
                fontSize: "0.78rem",
                fontWeight: 800,
                padding: "0.2rem 0.6rem",
                cursor: profile.isRefreshing ? "not-allowed" : "pointer",
                opacity: profile.isRefreshing ? 0.5 : 1,
              }}
            >
              {profile.isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

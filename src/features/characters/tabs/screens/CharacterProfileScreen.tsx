import type { CSSProperties, ReactNode } from "react";
import { CHARACTERS_COPY } from "../content";
import { resolveDisplayJobName } from "../../setup/data/nexonJobMapping";
import type { SearchPaneActions, SearchPaneModel } from "../paneModels";
import { secondaryButtonStyle } from "../components/uiStyles";
import CharacterAvatar from "../components/CharacterAvatar";
import RefreshSpinnerIcon from "../components/RefreshSpinnerIcon";
import HoverTooltip from "../../../../components/HoverTooltip";
import { statusText } from "../../../../components/statusColors";
import { characterExpPercent, isExpTrackingAvailable, resolveExpDelta, type ExpDelta } from "../../model/expProgress";

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

function genderSymbolColor(theme: SearchPaneModel["theme"], gender: "male" | "female"): string {
  if (gender === "male") return theme.colorMode === "dark" ? "#3b7cff" : "#2563eb";
  return theme.colorMode === "dark" ? "#eb3a84" : "#d82274";
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
    const { background, color } =
      theme.colorMode === "dark"
        ? { background: "#2a2008", color: "#f0c869" }
        : { background: "#fff4df", color: "#8c5b16" };
    return { background, border: "1px solid #d7a047", color };
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

function expDeltaTooltipLabel(theme: SearchPaneModel["theme"], delta: ExpDelta): ReactNode {
  const lost = delta.percentDelta < 0;
  const sign = delta.percentDelta > 0 ? "+" : "";
  const pct = `${sign}${delta.percentDelta.toFixed(3)}%`;
  return (
    <>
      <span style={{ color: statusText(theme, lost ? "danger" : "success") }}>{pct}</span>
      {delta.levelDelta > 0 && ` (+${delta.levelDelta} Lv)`}
    </>
  );
}

const genderMarriageIconRowStyle: CSSProperties = {
  position: "absolute",
  left: "100%",
  top: 0,
  marginLeft: "0.35rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  whiteSpace: "nowrap",
};

function GenderMarriageIcons({
  theme, gender, married, partnerName,
}: {
  theme: SearchPaneModel["theme"];
  gender: "male" | "female" | null;
  married: boolean;
  partnerName: string | null;
}) {
  if (!gender && !married) return null;
  return (
    <span style={genderMarriageIconRowStyle}>
      {gender === "male" && (
        <HoverTooltip theme={theme} label="Male">
          <span aria-label="Male" style={{ color: genderSymbolColor(theme, "male"), fontSize: "1.02rem", lineHeight: 1 }}>♂</span>
        </HoverTooltip>
      )}
      {gender === "female" && (
        <HoverTooltip theme={theme} label="Female">
          <span aria-label="Female" style={{ color: genderSymbolColor(theme, "female"), fontSize: "1.02rem", lineHeight: 1 }}>♀</span>
        </HoverTooltip>
      )}
      {married && (
        <HoverTooltip theme={theme} label={partnerName ? `Married to ${partnerName}` : "Married"}>
          <span aria-label="Married" style={{ color: genderSymbolColor(theme, "female"), fontSize: "1.02rem", lineHeight: 1 }}>♥</span>
        </HoverTooltip>
      )}
    </span>
  );
}

// Current EXP percent, decorated with a green up-arrow when there's been real progress
// since the last snapshot -- hovering/focusing the whole thing reveals the actual delta
// (and any level-ups crossed) rather than showing that number inline all the time.
function ExpPercentIndicator({ theme, percent, delta }: { theme: SearchPaneModel["theme"]; percent: number; delta: ExpDelta | null }) {
  const lost = delta !== null && delta.percentDelta < 0;
  const content = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
      {delta && (
        <span aria-hidden="true" style={{ color: statusText(theme, lost ? "danger" : "success") }}>
          {lost ? "▼" : "▲"}
        </span>
      )}
      {percent.toFixed(3)}%
    </span>
  );
  if (!delta) return content;
  return (
    <HoverTooltip theme={theme} label={expDeltaTooltipLabel(theme, delta)}>
      {content}
    </HoverTooltip>
  );
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
  const expDelta = resolveExpDelta(profile.confirmedCharacter);
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
          {/* Name centered as the sole flex child; gender/marriage icons are absolutely
              positioned off its right edge (same pattern as the Level/% row below) so their
              width doesn't pull the name itself off-center. A div, not a <p> -- HoverTooltip
              (inside GenderMarriageIcons) renders a <div>, invalid inside a <p>. */}
          <div style={{ margin: 0, width: "100%", fontSize: "1.32rem", fontWeight: 800, lineHeight: 1.15, color: theme.text, display: "flex", justifyContent: "center" }}>
            <span style={{ position: "relative" }}>
              {profile.confirmedCharacter.characterName}
              <GenderMarriageIcons
                theme={theme}
                gender={profile.currentCharacterGender}
                married={profile.currentCharacterMarried === true}
                partnerName={profile.currentCharacterPartnerName}
              />
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.95rem", color: theme.muted, fontWeight: 700, lineHeight: 1.3 }}>
            {resolveDisplayJobName(profile.confirmedCharacter.jobName)}
          </p>
          {/* A div, not a <p> -- HoverTooltip (inside ExpPercentIndicator) renders a <div>,
              which isn't valid inside a <p> and causes a hydration mismatch. */}
          <div style={{ margin: 0, width: "100%", fontSize: "1rem", color: theme.muted, fontWeight: 700, lineHeight: 1.3, textAlign: "center" }}>
            Level {profile.confirmedCharacter.level}
          </div>
          {isExpTrackingAvailable(profile.confirmedCharacter.level) && (
            <div style={{ margin: 0, width: "100%", fontSize: "0.85rem", color: theme.muted, fontWeight: 700, lineHeight: 1.3, display: "flex", justifyContent: "center" }}>
              <ExpPercentIndicator
                theme={theme}
                percent={characterExpPercent(profile.confirmedCharacter.level, profile.confirmedCharacter.exp)}
                delta={expDelta}
              />
            </div>
          )}
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
            <p style={{ margin: 0, marginTop: "0.4rem", fontSize: "0.78rem", color: isStale ? statusText(theme, "warning") : theme.muted, fontWeight: 700, lineHeight: 1.3 }}>
              {profile.isRefreshing && (
                <RefreshSpinnerIcon
                  aria-label="Refreshing"
                  color={theme.muted}
                  className="char-refresh-spin"
                  style={{ marginRight: "0.2rem", verticalAlign: "middle" }}
                />
              )}
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

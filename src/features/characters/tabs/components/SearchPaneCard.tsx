import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import { MAX_QUERY_LENGTH, WORLD_NAMES, type SetupMode } from "../../model/constants";
import type { NormalizedCharacterData } from "../../model/types";
import { CHARACTERS_COPY } from "../content";
import {
  panelCardStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "./uiStyles";

function profileRoleBadgeStyle(theme: AppTheme, role: "main" | "champion" | "mule") {
  if (role === "main") {
    return {
      background: theme.accentSoft,
      border: `1px solid ${theme.accent}`,
      color: theme.accent,
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

function getProfileRoleChips(
  isCurrentMainCharacter: boolean,
  isCurrentChampionCharacter: boolean,
): Array<"main" | "champion" | "mule"> {
  if (isCurrentMainCharacter && isCurrentChampionCharacter) {
    return ["main", "champion"];
  }
  if (isCurrentMainCharacter) return ["main"];
  if (isCurrentChampionCharacter) return ["champion"];
  return ["mule"];
}

interface SearchPaneCardProps {
  theme: AppTheme;
  isDraftHydrated: boolean;
  isConfirmFadeOut: boolean;
  isModeTransitioning: boolean;
  isSearchFadeIn: boolean;
  setupMode: SetupMode;
  setupFlowStarted: boolean;
  hasCompletedRequiredFlow: boolean;
  canResumeSetup: boolean;
  resumeSetupCharacterName: string | null;
  query: string;
  queryInvalid: boolean;
  isSearching: boolean;
  statusMessage: string;
  statusTone: "neutral" | "error";
  confirmedCharacter: NormalizedCharacterData | null;
  confirmedImageLoaded: boolean;
  isBackTransitioning: boolean;
  isSwitchingToDirectory: boolean;
  showCharacterDirectory: boolean;
  showSummaryNavigation: boolean;
  isSummaryView: boolean;
  isAddingCharacter: boolean;
  isUiLocked: boolean;
  isCurrentMainCharacter: boolean;
  isCurrentChampionCharacter: boolean;
  canSetCurrentChampion: boolean;
  currentCharacterGender: "male" | "female" | null;
  isStartingOptionalFlow: boolean;
  isOptionalFlowFadeIn: boolean;
  onRunTransitionToMode: (nextMode: SetupMode) => void;
  onRunBackToIntroTransition: () => void;
  onBackFromSetupFlow: () => void;
  onBackToCharactersDirectory: () => void;
  onReturnToSummaryProfile: () => void;
  onBackFromAddCharacter: () => void;
  onResumeSavedSetup: () => void;
  onSetCurrentAsMain: () => void;
  onToggleCurrentChampion: () => void;
  onRemoveCurrentCharacter: () => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onQueryChange: (value: string) => void;
  onConfirmedImageLoaded: () => void;
  onToggleCharacterDirectory: () => void;
}

export default function SearchPaneCard({
  theme,
  isDraftHydrated,
  isConfirmFadeOut,
  isModeTransitioning,
  isSearchFadeIn,
  setupMode,
  setupFlowStarted,
  hasCompletedRequiredFlow,
  canResumeSetup,
  resumeSetupCharacterName,
  query,
  queryInvalid,
  isSearching,
  statusMessage,
  statusTone,
  confirmedCharacter,
  confirmedImageLoaded,
  isBackTransitioning,
  isSwitchingToDirectory,
  showCharacterDirectory,
  showSummaryNavigation,
  isSummaryView,
  isAddingCharacter,
  isUiLocked,
  isCurrentMainCharacter,
  isCurrentChampionCharacter,
  canSetCurrentChampion,
  currentCharacterGender,
  isStartingOptionalFlow,
  isOptionalFlowFadeIn,
  onRunTransitionToMode,
  onRunBackToIntroTransition,
  onBackFromSetupFlow,
  onBackToCharactersDirectory,
  onReturnToSummaryProfile,
  onBackFromAddCharacter,
  onResumeSavedSetup,
  onSetCurrentAsMain,
  onToggleCurrentChampion,
  onRemoveCurrentCharacter,
  onSearchSubmit,
  onQueryChange,
  onConfirmedImageLoaded,
  onToggleCharacterDirectory,
}: SearchPaneCardProps) {
  const isDirectoryActive = showCharacterDirectory && !isSwitchingToDirectory;
  const searchCardRef = useRef<HTMLElement | null>(null);
  const [hasShownResumeSetup, setHasShownResumeSetup] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [stableResumeSetupCharacterName, setStableResumeSetupCharacterName] = useState<string | null>(
    resumeSetupCharacterName,
  );
  const isStableSearchFrame =
    !isConfirmFadeOut && !isModeTransitioning && !isBackTransitioning;
  const shouldShowResumeSetup =
    canResumeSetup && (hasShownResumeSetup || isStableSearchFrame);
  const roleChips = getProfileRoleChips(
    isCurrentMainCharacter,
    isCurrentChampionCharacter,
  );
  const canShowProfileRoleActionsRegion =
    setupMode === "search" &&
    setupFlowStarted &&
    Boolean(confirmedCharacter) &&
    !isDirectoryActive &&
    isSummaryView &&
    showSummaryNavigation;
  const showProfileRoleActions = canShowProfileRoleActionsRegion;
  const reserveProfileActionSpace = canShowProfileRoleActionsRegion;

  useEffect(() => {
    if (!canResumeSetup || !isStableSearchFrame || hasShownResumeSetup) return;
    const markShownTimer = window.setTimeout(() => {
      setHasShownResumeSetup(true);
    }, 0);
    return () => clearTimeout(markShownTimer);
  }, [canResumeSetup, hasShownResumeSetup, isStableSearchFrame]);

  useEffect(() => {
    if (!isStableSearchFrame) return;
    const updateLabelTimer = window.setTimeout(() => {
      setStableResumeSetupCharacterName(resumeSetupCharacterName);
    }, 0);
    return () => clearTimeout(updateLabelTimer);
  }, [isStableSearchFrame, resumeSetupCharacterName]);

  useEffect(() => {
    if (confirmedCharacter) return;
    const closeModalTimer = window.setTimeout(() => {
      setShowRemoveConfirm(false);
    }, 0);
    return () => clearTimeout(closeModalTimer);
  }, [confirmedCharacter]);

  useEffect(() => {
    const element = searchCardRef.current;
    if (!element) return;
    if (isSwitchingToDirectory) {
      const height = element.getBoundingClientRect().height;
      element.style.height = `${height}px`;
      element.style.minHeight = `${height}px`;
      return;
    }
    element.style.height = "";
    element.style.minHeight = "";
  }, [isSwitchingToDirectory]);

  return (
    <>
    <section
      ref={searchCardRef}
      className={[
        "character-search-panel",
        "search-card",
        setupFlowStarted &&
        confirmedCharacter &&
        showSummaryNavigation &&
        isSummaryView &&
        !isSwitchingToDirectory &&
        !isStartingOptionalFlow
          ? "profile-shell-fade-in"
          : "",
        isStartingOptionalFlow ? "profile-shell-fade-out" : "",
        isOptionalFlowFadeIn ? "profile-shell-state-fade-in" : "",
        isConfirmFadeOut || isModeTransitioning || isBackTransitioning ? "confirm-fade" : "",
        isSwitchingToDirectory ? "profile-to-directory-fade" : "",
        !isConfirmFadeOut && !isModeTransitioning && isSearchFadeIn ? "search-fade-in" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...panelCardStyle(theme, "1.5rem"),
        visibility: isDraftHydrated ? "visible" : "hidden",
      }}
    >
      {setupMode === "intro" && (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <h1 style={titleStyle()}>
              {CHARACTERS_COPY.titles.intro}
            </h1>
            <p style={subtitleStyle(theme)}>
              {CHARACTERS_COPY.subtitles.intro}
            </p>
          </div>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <button
              type="button"
              disabled={isUiLocked}
              onClick={() => {
                if (isUiLocked) return;
                onRunTransitionToMode("import");
              }}
              style={{ ...primaryButtonStyle(theme, "0.9rem 1rem"), borderRadius: "12px", fontSize: "0.95rem", textAlign: "left" }}
            >
              {CHARACTERS_COPY.buttons.importCharacter}
            </button>
            <button
              type="button"
              disabled={isUiLocked}
              onClick={() => onRunTransitionToMode("search")}
              style={{ ...secondaryButtonStyle(theme, "0.9rem 1rem"), borderRadius: "12px", fontWeight: 800, fontSize: "0.95rem", textAlign: "left" }}
            >
              {CHARACTERS_COPY.buttons.searchCharacter}
            </button>
          </div>
        </>
      )}

      {setupMode === "import" && (
        <>
          <div style={{ marginBottom: "1rem" }}>
            <h1 style={titleStyle()}>
              {CHARACTERS_COPY.titles.import}
            </h1>
            <p style={subtitleStyle(theme)}>
              {CHARACTERS_COPY.subtitles.import}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              type="button"
              disabled={isUiLocked}
              onClick={() => onRunBackToIntroTransition()}
              style={secondaryButtonStyle(theme)}
            >
              {CHARACTERS_COPY.buttons.back}
            </button>
            <button
              type="button"
              disabled={isUiLocked}
              onClick={() => onRunTransitionToMode("search")}
              style={primaryButtonStyle(theme)}
            >
              {CHARACTERS_COPY.buttons.goToSearch}
            </button>
          </div>
        </>
      )}

      {setupMode === "search" && !setupFlowStarted && (
        <>
          <div
            style={{
              marginBottom: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <div>
              <h1 style={titleStyle()}>
                {CHARACTERS_COPY.titles.search}
              </h1>
              <p style={subtitleStyle(theme)}>
                {CHARACTERS_COPY.subtitles.search}
              </p>
              {shouldShowResumeSetup && (
                <button
                  type="button"
                  disabled={isUiLocked}
                  onClick={onResumeSavedSetup}
                  style={{ ...secondaryButtonStyle(theme, "0.4rem 0.65rem"), marginTop: "0.45rem", fontSize: "0.82rem" }}
                >
                  {stableResumeSetupCharacterName
                    ? `Resume setup for ${stableResumeSetupCharacterName}`
                    : CHARACTERS_COPY.buttons.resumeSetup}
                </button>
              )}
            </div>
            <button
              type="button"
              disabled={isUiLocked}
              onClick={() => {
                if (isUiLocked) return;
                if (isAddingCharacter) {
                  if (hasCompletedRequiredFlow) {
                    onBackFromAddCharacter();
                    return;
                  }
                  onRunBackToIntroTransition();
                  return;
                }
                if (hasCompletedRequiredFlow) {
                  onBackToCharactersDirectory();
                  return;
                }
                onRunBackToIntroTransition();
              }}
              style={{ ...secondaryButtonStyle(theme, "0.5rem 0.75rem"), fontSize: "0.85rem", whiteSpace: "nowrap" }}
            >
              {isAddingCharacter
                ? hasCompletedRequiredFlow
                  ? "Back to characters"
                  : CHARACTERS_COPY.buttons.back
                : hasCompletedRequiredFlow
                  ? "Back to characters"
                  : CHARACTERS_COPY.buttons.back}
            </button>
          </div>

          <form onSubmit={onSearchSubmit} className="characters-search-row">
            <input
              type="text"
              disabled={isUiLocked}
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
              }}
              placeholder="In-Game Name"
              maxLength={MAX_QUERY_LENGTH}
              style={{
                width: "100%",
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                background: theme.bg,
                color: theme.text,
                fontFamily: "inherit",
                fontSize: "0.95rem",
                fontWeight: 600,
                padding: "0.8rem 0.9rem",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={isSearching || queryInvalid || isUiLocked}
            style={{
              ...primaryButtonStyle(theme, "0.75rem 1rem"),
              borderRadius: "12px",
              background: isSearching || queryInvalid ? theme.muted : theme.accent,
              cursor: isSearching || queryInvalid || isUiLocked ? "not-allowed" : "pointer",
            }}
          >
            {isSearching ? CHARACTERS_COPY.buttons.searching : CHARACTERS_COPY.buttons.search}
          </button>
          </form>

          <div
            style={{
              marginTop: "0.75rem",
              border: `1px solid ${theme.border}`,
              background: theme.bg,
              borderRadius: "14px",
              padding: "0.8rem 0.95rem",
            }}
          >
            <p
              style={{
                fontSize: "0.9rem",
                color: statusTone === "error" ? "#dc2626" : theme.muted,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {statusMessage}
            </p>
          </div>
        </>
      )}
      {setupMode === "search" && setupFlowStarted && confirmedCharacter && (
          <div style={{ display: "grid", justifyItems: "center", gap: "0.5rem" }}>
            <div
              className={[
                "confirmed-summary-card",
                isBackTransitioning ? "preview-confirm-fade" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                width: "100%",
                maxWidth: "300px",
                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                textAlign: "center",
                gap: "0.35rem",
                paddingTop: "0.15rem",
              }}
            >
              <div
                style={{
                  width: "100%",
                  alignSelf: "stretch",
                  display: "flex",
                  justifyContent: "flex-end",
                  minHeight: "34px",
                }}
              >
                <button
                  type="button"
                  disabled={isUiLocked}
                  aria-label="View your characters"
                  onClick={
                    showSummaryNavigation
                      ? isSummaryView
                        ? onToggleCharacterDirectory
                        : onReturnToSummaryProfile
                      : onBackFromSetupFlow
                  }
                  style={{
                    ...secondaryButtonStyle(theme, "0.5rem 0.75rem"),
                    fontSize: "0.85rem",
                    whiteSpace: "nowrap",
                    marginLeft: "auto",
                  }}
                >
                  {showSummaryNavigation
                    ? isSummaryView
                        ? (
                          <>
                            <span className="desktop-back-label">← View your characters</span>
                            <span className="mobile-back-label">←</span>
                          </>
                        )
                        : "Back to profile"
                    : CHARACTERS_COPY.buttons.back}
                </button>
              </div>
              <div
                className={`confirmed-avatar-wrap ${!confirmedImageLoaded ? "image-skeleton-wrap" : ""}`}
                style={{
                  width: "210px",
                  height: "210px",
                  borderRadius: "22px",
                }}
              >
                <Image
                  src={confirmedCharacter.characterImgURL}
                  alt={`${confirmedCharacter.characterName} avatar`}
                  width={210}
                  height={210}
                  onLoad={onConfirmedImageLoaded}
                  className={`image-fade-in ${confirmedImageLoaded ? "image-loaded" : ""}`}
                  style={{
                    borderRadius: "22px",
                    objectFit: "cover",
                  display: "block",
                }}
              />
              </div>
              <div
                style={{
                  width: "100%",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
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
                  {confirmedCharacter.characterName}
                  {currentCharacterGender === "male" && (
                    <span
                      aria-label="Male"
                      title="Male"
                      style={{ color: "#2563eb", fontSize: "1.02rem", lineHeight: 1 }}
                    >
                      ♂
                    </span>
                  )}
                  {currentCharacterGender === "female" && (
                    <span
                      aria-label="Female"
                      title="Female"
                      style={{ color: "#db2777", fontSize: "1.02rem", lineHeight: 1 }}
                    >
                      ♀
                    </span>
                  )}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.95rem",
                    color: theme.muted,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  {WORLD_NAMES[confirmedCharacter.worldID] ?? `ID ${confirmedCharacter.worldID}`}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    color: theme.muted,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  Level {confirmedCharacter.level}
                </p>
                {showSummaryNavigation && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: "0.32rem",
                      flexWrap: "wrap",
                      width: "100%",
                      marginTop: "0.35rem",
                      marginBottom: "0.2rem",
                      minHeight: "26px",
                    }}
                  >
                    {roleChips.map((role) => (
                      <span
                        key={role}
                        className="profile-role-chip"
                        style={{
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
                        }}
                      >
                        {role === "main" ? "Main" : role === "champion" ? "Champion" : "Mule"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
      )}
    </section>
    {reserveProfileActionSpace && (
      <div
        style={{
          marginTop: "0.5rem",
          width: "100%",
          maxWidth: "300px",
          marginInline: "auto",
          minHeight: "106px",
        }}
      >
        {showProfileRoleActions && (
          <div
            className={[
              "profile-actions-card",
              !isSwitchingToDirectory && !isStartingOptionalFlow
                ? "profile-actions-fade-in"
                : "",
              isStartingOptionalFlow ? "profile-actions-fade-out" : "",
              isSwitchingToDirectory ? "profile-to-directory-fade" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              display: "grid",
              gap: "0.4rem",
            }}
          >
            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                background: theme.bg,
                padding: "0.45rem 0.55rem",
                display: "flex",
                justifyContent: "center",
                gap: "0.45rem",
                flexWrap: "wrap",
                boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
              }}
            >
              {!isCurrentMainCharacter && (
                <button
                  type="button"
                  disabled={isUiLocked}
                  onClick={onSetCurrentAsMain}
                  style={{
                    ...secondaryButtonStyle(theme, "0.28rem 0.62rem"),
                    borderRadius: "999px",
                    width: "fit-content",
                    fontSize: "0.78rem",
                  }}
                >
                  Set main
                </button>
              )}
              {(isCurrentChampionCharacter || canSetCurrentChampion) && (
                <button
                  type="button"
                  disabled={isUiLocked}
                  onClick={onToggleCurrentChampion}
                  style={{
                    ...secondaryButtonStyle(theme, "0.28rem 0.62rem"),
                    borderRadius: "999px",
                    width: "fit-content",
                    fontSize: "0.78rem",
                  }}
                >
                  {isCurrentChampionCharacter ? "Remove champion" : "Set champion"}
                </button>
              )}
            </div>
            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                background: theme.bg,
                padding: "0.45rem 0.55rem",
                display: "flex",
                justifyContent: "center",
                boxShadow: "0 8px 20px rgba(0,0,0,0.10)",
              }}
            >
              <button
                type="button"
                disabled={isUiLocked}
                onClick={() => setShowRemoveConfirm(true)}
                aria-label="Remove character"
                style={{
                  border: "1px solid #ef4444",
                  borderRadius: "999px",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontFamily: "inherit",
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  padding: "0.28rem 0.62rem",
                  width: "fit-content",
                  cursor: "pointer",
                }}
              >
                🗑 Remove
              </button>
            </div>
          </div>
        )}
      </div>
    )}
    {showRemoveConfirm && confirmedCharacter && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.42)",
          display: "grid",
          placeItems: "center",
          zIndex: 60,
          padding: "1rem",
        }}
      >
        <div
          style={{
            width: "min(420px, 100%)",
            borderRadius: "14px",
            border: `1px solid ${theme.border}`,
            background: theme.panel,
            color: theme.text,
            padding: "1rem",
            boxShadow: "0 16px 48px rgba(0,0,0,0.24)",
            display: "grid",
            gap: "0.75rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>
            Remove {confirmedCharacter.characterName}?
          </p>
          <p style={{ margin: 0, color: theme.muted, fontSize: "0.86rem", fontWeight: 700 }}>
            This removes the character and local setup data for this profile.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.55rem" }}>
            <button
              type="button"
              onClick={() => setShowRemoveConfirm(false)}
              style={secondaryButtonStyle(theme, "0.5rem 0.75rem")}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRemoveConfirm(false);
                onRemoveCurrentCharacter();
              }}
              style={{
                border: "1px solid #fca5a5",
                borderRadius: "10px",
                background: "#ef4444",
                color: "#fff",
                fontFamily: "inherit",
                fontWeight: 800,
                fontSize: "0.86rem",
                padding: "0.5rem 0.8rem",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

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

interface SearchPaneCardProps {
  theme: AppTheme;
  isDraftHydrated: boolean;
  isConfirmFadeOut: boolean;
  isModeTransitioning: boolean;
  isSearchFadeIn: boolean;
  setupMode: SetupMode;
  setupFlowStarted: boolean;
  canResumeSetup: boolean;
  query: string;
  queryInvalid: boolean;
  isSearching: boolean;
  statusMessage: string;
  statusTone: "neutral" | "error";
  confirmedCharacter: NormalizedCharacterData | null;
  confirmedImageLoaded: boolean;
  isBackTransitioning: boolean;
  onRunTransitionToMode: (nextMode: SetupMode) => void;
  onRunBackToIntroTransition: () => void;
  onRunBackToSearchTransition: () => void;
  onResumeSavedSetup: () => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onQueryChange: (value: string) => void;
  onConfirmedImageLoaded: () => void;
}

export default function SearchPaneCard({
  theme,
  isDraftHydrated,
  isConfirmFadeOut,
  isModeTransitioning,
  isSearchFadeIn,
  setupMode,
  setupFlowStarted,
  canResumeSetup,
  query,
  queryInvalid,
  isSearching,
  statusMessage,
  statusTone,
  confirmedCharacter,
  confirmedImageLoaded,
  isBackTransitioning,
  onRunTransitionToMode,
  onRunBackToIntroTransition,
  onRunBackToSearchTransition,
  onResumeSavedSetup,
  onSearchSubmit,
  onQueryChange,
  onConfirmedImageLoaded,
}: SearchPaneCardProps) {
  return (
    <section
      className={[
        "character-search-panel",
        "search-card",
        isConfirmFadeOut || isModeTransitioning ? "confirm-fade" : "",
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
              onClick={() => {
                onRunTransitionToMode("import");
              }}
              style={{ ...primaryButtonStyle(theme, "0.9rem 1rem"), borderRadius: "12px", fontSize: "0.95rem", textAlign: "left" }}
            >
              {CHARACTERS_COPY.buttons.importCharacter}
            </button>
            <button
              type="button"
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
              onClick={() => onRunBackToIntroTransition()}
              style={secondaryButtonStyle(theme)}
            >
              {CHARACTERS_COPY.buttons.back}
            </button>
            <button
              type="button"
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
              {canResumeSetup && (
                <button
                  type="button"
                  onClick={onResumeSavedSetup}
                  style={{ ...secondaryButtonStyle(theme, "0.4rem 0.65rem"), marginTop: "0.45rem", fontSize: "0.82rem" }}
                >
                  {CHARACTERS_COPY.buttons.resumeSetup}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onRunBackToIntroTransition();
              }}
              style={{ ...secondaryButtonStyle(theme, "0.5rem 0.75rem"), fontSize: "0.85rem", whiteSpace: "nowrap" }}
            >
              {CHARACTERS_COPY.buttons.back}
            </button>
          </div>

          <form onSubmit={onSearchSubmit} className="characters-search-row">
            <input
              type="text"
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
              disabled={isSearching || queryInvalid}
            style={{
              ...primaryButtonStyle(theme, "0.75rem 1rem"),
              borderRadius: "12px",
              background: isSearching || queryInvalid ? theme.muted : theme.accent,
              cursor: isSearching || queryInvalid ? "not-allowed" : "pointer",
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
        <div
          className={[
            "confirmed-summary-card",
            isBackTransitioning ? "preview-confirm-fade" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            minHeight: "320px",
            maxWidth: "300px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "0.35rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onRunBackToSearchTransition();
            }}
            style={{ ...secondaryButtonStyle(theme, "0.5rem 0.75rem"), alignSelf: "flex-end", fontSize: "0.85rem", whiteSpace: "nowrap" }}
          >
            {CHARACTERS_COPY.buttons.back}
          </button>
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
          <p
            style={{
              margin: 0,
              fontSize: "1.32rem",
              fontWeight: 800,
              lineHeight: 1.15,
              color: theme.text,
            }}
          >
            {confirmedCharacter.characterName}
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
        </div>
      )}
    </section>
  );
}

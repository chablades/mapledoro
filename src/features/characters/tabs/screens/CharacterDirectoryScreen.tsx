import Image from "next/image";
import { toCharacterKey } from "../../model/characterKeys";
import type { NormalizedCharacterData } from "../../model/types";
import {
  buildDirectoryGroups,
  getDirectoryRevealStyle,
  type DirectorySortBy,
} from "../charactersDirectory";
import { CHARACTERS_COPY } from "../content";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";

interface CharacterDirectoryScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
  directorySortBy: DirectorySortBy;
  onDirectorySortByChange: (sortBy: DirectorySortBy) => void;
  directoryRevealPhase: number;
}

export default function CharacterDirectoryScreen({
  model,
  actions,
  directorySortBy,
  onDirectorySortByChange,
  directoryRevealPhase,
}: CharacterDirectoryScreenProps) {
  const { theme, setup, directory } = model;
  const {
    sortedCharacters,
    mainCharacter,
    championCharacters,
    championCharactersForDirectory,
    otherCharacters,
    muleCapacity,
    canAddCharacter,
    hasChampionSection,
    isMainAlsoChampion,
  } = buildDirectoryGroups({
    allCharacters: directory.allCharacters,
    sortBy: directorySortBy,
    mainCharacterKey: directory.mainCharacterKey,
    championCharacterKeys: directory.championCharacterKeys,
    maxCharacters: directory.maxCharacters,
  });

  const inCharacterDirectoryView = setup.showFlowOverview && setup.showCharacterDirectory;
  if (!inCharacterDirectoryView) return null;
  const shouldShowDirectoryPanel =
    inCharacterDirectoryView &&
    !setup.isSwitchingToDirectory &&
    directoryRevealPhase > 0;

  const renderCharacterCard = (character: NormalizedCharacterData) => (
    <div
      key={toCharacterKey(character)}
      style={{
        flex: "0 0 auto",
        width: "min(190px, 100%)",
        minWidth: "160px",
        maxWidth: "190px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <button
        type="button"
        disabled={setup.isUiLocked}
        onClick={() => actions.openCharacterProfile(character)}
        style={{
          display: "grid",
          placeItems: "center",
          gap: "0.35rem",
          background: "transparent",
          border: "none",
          padding: 0,
          color: theme.text,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <Image
          src={character.characterImgURL}
          alt={`${character.characterName} avatar`}
          width={78}
          height={78}
          style={{ borderRadius: "12px", objectFit: "contain", objectPosition: "center bottom" }}
        />
        <span style={{ fontSize: "0.78rem", fontWeight: 800, lineHeight: 1.15, color: theme.text, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap" }}>
          {character.characterName}
        </span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, lineHeight: 1.1, color: theme.muted, textAlign: "center" }}>
          Lv {character.level}
        </span>
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontFamily: "'Fredoka One', cursive", fontSize: "1.2rem", lineHeight: 1.2, color: theme.text }}>
          {CHARACTERS_COPY.characterDirectory.title}
        </h2>
      </div>
      <div style={{ display: "grid", gap: "0.7rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.65rem",
            border: `1px solid ${theme.border}`,
            borderRadius: "12px",
            background: theme.bg,
            padding: "0.7rem",
          }}
        >
          <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 800 }}>
            {CHARACTERS_COPY.characterDirectory.sortRowsLabel}
          </span>
          <select
            disabled={setup.isUiLocked}
            value={directorySortBy}
            onChange={(event) => onDirectorySortByChange(event.target.value as DirectorySortBy)}
            style={{ border: `1px solid ${theme.border}`, borderRadius: "8px", background: theme.panel, color: theme.text, fontFamily: "inherit", fontSize: "0.8rem", fontWeight: 700, padding: "0.25rem 0.4rem" }}
          >
            <option value="name">{CHARACTERS_COPY.characterDirectory.sortAlphabeticalOption}</option>
            <option value="level">{CHARACTERS_COPY.characterDirectory.sortByLevelOption}</option>
            <option value="class">{CHARACTERS_COPY.characterDirectory.sortByClassOption}</option>
          </select>
        </div>

        <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: "0.15rem" }} />
        <section style={getDirectoryRevealStyle(shouldShowDirectoryPanel && directoryRevealPhase >= 1)}>
          <p style={{ margin: 0, fontSize: "0.75rem", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.5rem" }}>
            {CHARACTERS_COPY.characterDirectory.mainCharacterLabel}
          </p>
          {mainCharacter ? (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "flex-start", gap: "0.6rem", width: "100%" }}>
              {renderCharacterCard(mainCharacter)}
            </div>
          ) : (
            <p style={{ margin: 0, color: theme.muted, fontWeight: 700 }}>
              {sortedCharacters.length > 0
                ? CHARACTERS_COPY.characterDirectory.noMainSelectedMessage
                : CHARACTERS_COPY.characterDirectory.noCharactersAddedMessage}
            </p>
          )}
        </section>

        {(championCharactersForDirectory.length > 0 || isMainAlsoChampion) && (
          <section style={getDirectoryRevealStyle(shouldShowDirectoryPanel && directoryRevealPhase >= 2)}>
            <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />
            <p style={{ margin: 0, fontSize: "0.75rem", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.5rem" }}>
              {CHARACTERS_COPY.characterDirectory.championsLabel} ({championCharacters.length}/{directory.maxChampions})
            </p>
            {isMainAlsoChampion && (
              <p style={{ margin: 0, marginBottom: "0.45rem", fontSize: "0.74rem", color: theme.muted, fontWeight: 700 }}>
                {CHARACTERS_COPY.characterDirectory.mainAlsoChampionMessage}
              </p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "flex-start", gap: "0.6rem", overflow: "hidden", width: "100%", paddingBottom: "0.15rem" }}>
              {championCharactersForDirectory.map((character) => renderCharacterCard(character))}
            </div>
          </section>
        )}

        <section style={getDirectoryRevealStyle(shouldShowDirectoryPanel && directoryRevealPhase >= (hasChampionSection ? 3 : 2))}>
          <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />
          <p style={{ margin: 0, fontSize: "0.75rem", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.5rem" }}>
            {CHARACTERS_COPY.characterDirectory.mulesLabel} ({otherCharacters.length}/{muleCapacity})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "flex-start", gap: "0.6rem", overflow: "hidden", width: "100%", paddingBottom: "0.15rem" }}>
            {otherCharacters.map((character) => renderCharacterCard(character))}
            <button
              type="button"
              onClick={actions.openCharacterSearch}
              disabled={!canAddCharacter || setup.isUiLocked}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                background: theme.bg,
                color: theme.text,
                fontFamily: "inherit",
                fontWeight: 900,
                fontSize: "1.45rem",
                padding: "0.5rem 0.65rem",
                flex: "0 0 auto",
                minWidth: "160px",
                maxWidth: "190px",
                width: "min(190px, 100%)",
                height: "120px",
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.3rem",
                opacity: canAddCharacter ? 1 : 0.55,
                cursor: canAddCharacter ? "pointer" : "not-allowed",
              }}
            >
              <span>+</span>
              <span style={{ fontSize: "0.76rem", fontWeight: 800 }}>
                {CHARACTERS_COPY.characterDirectory.addCharacterButton}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

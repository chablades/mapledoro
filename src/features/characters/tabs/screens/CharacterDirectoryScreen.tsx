import { useState } from "react";
import { toCharacterKey } from "../../model/characterKeys";
import { WORLD_NAMES } from "../../model/constants";
import type { NormalizedCharacterData } from "../../model/types";
import {
  buildDirectoryGroups,
  getDirectoryRevealStyle,
  type DirectorySortBy,
} from "../charactersDirectory";
import { CHARACTERS_COPY } from "../content";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import CharacterAvatar from "../components/CharacterAvatar";

function DirectoryCharacterAvatar({ character }: { character: NormalizedCharacterData }) {
  const [imageReady, setImageReady] = useState(false);

  return (
    <div
      className={!imageReady ? "image-skeleton-wrap" : undefined}
      style={{ width: "78px", height: "78px", borderRadius: "12px" }}
    >
      <CharacterAvatar
        src={character.characterImgURL}
        alt={`${character.characterName} avatar`}
        width={78}
        height={78}
        onReady={() => setImageReady(true)}
        className={`image-fade-in ${imageReady ? "image-loaded" : ""}`}
        style={{ borderRadius: "12px", objectFit: "contain", objectPosition: "center bottom" }}
      />
    </div>
  );
}

interface CharacterDirectoryScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
  directorySortBy: DirectorySortBy;
  onDirectorySortByChange: (sortBy: DirectorySortBy) => void;
  directoryWorldFilter: number | null;
  onDirectoryWorldFilterChange: (worldId: number | null) => void;
  directoryRevealPhase: number;
}

export default function CharacterDirectoryScreen({
  model,
  actions,
  directorySortBy,
  onDirectorySortByChange,
  directoryWorldFilter,
  onDirectoryWorldFilterChange,
  directoryRevealPhase,
}: CharacterDirectoryScreenProps) {
  const { theme, setup, directory } = model;

  const inCharacterDirectoryView = setup.showFlowOverview && setup.showCharacterDirectory;
  if (!inCharacterDirectoryView) return null;

  const shouldShowDirectoryPanel =
    inCharacterDirectoryView &&
    !setup.isSwitchingToDirectory &&
    directoryRevealPhase > 0;

  const hasMultipleWorlds = directory.worldIds.length > 1;
  const selectedWorldId = directoryWorldFilter;

  const filteredCharacters = selectedWorldId !== null
    ? directory.allCharacters.filter((c) => c.worldID === selectedWorldId)
    : directory.allCharacters;

  const activeWorldId = selectedWorldId ?? directory.worldIds[0] ?? null;
  const activeMainKey = activeWorldId !== null
    ? (directory.mainCharacterKeyByWorld[String(activeWorldId)] ?? null)
    : null;
  const activeChampionKeys = activeWorldId !== null
    ? (directory.championCharacterKeysByWorld[String(activeWorldId)] ?? [])
    : [];

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
    allCharacters: filteredCharacters,
    sortBy: directorySortBy,
    mainCharacterKey: selectedWorldId !== null ? activeMainKey : null,
    championCharacterKeys: selectedWorldId !== null ? activeChampionKeys : [],
    maxCharacters: directory.maxCharacters,
  });

  const selectStyle = {
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    background: theme.panel,
    color: theme.text,
    fontFamily: "inherit",
    fontSize: "0.8rem",
    fontWeight: 700,
    padding: "0.25rem 0.4rem",
  };

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
        <DirectoryCharacterAvatar
          key={`${character.characterName}:${character.characterImgURL}`}
          character={character}
        />
        <span style={{ fontSize: "0.78rem", fontWeight: 800, lineHeight: 1.15, color: theme.text, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap" }}>
          {character.characterName}
        </span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, lineHeight: 1.1, color: theme.muted, textAlign: "center" }}>
          Lv {character.level}
        </span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, lineHeight: 1.1, color: theme.muted, textAlign: "center" }}>
          {character.jobName}
        </span>
      </button>
    </div>
  );

  const renderAllWorldsView = () => {
    return directory.worldIds.map((worldId, i) => {
      const worldChars = sortedCharacters.filter((c) => c.worldID === worldId);
      if (worldChars.length === 0) return null;
      const worldName = WORLD_NAMES[worldId] ?? `World ${worldId}`;
      return (
        <section key={worldId} style={getDirectoryRevealStyle(shouldShowDirectoryPanel && directoryRevealPhase >= 1)}>
          {i > 0 && <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />}
          <p className="section-label" style={{ color: theme.muted }}>
            {worldName}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "flex-start", gap: "0.6rem", width: "100%" }}>
            {worldChars.map((character) => renderCharacterCard(character))}
          </div>
        </section>
      );
    });
  };

  const worldLabel = selectedWorldId !== null
    ? (WORLD_NAMES[selectedWorldId] ?? `World ${selectedWorldId}`)
    : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.2rem", lineHeight: 1.2, color: theme.text }}>
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
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.78rem", color: theme.muted, fontWeight: 800 }}>
            {!hasMultipleWorlds && worldLabel
              ? worldLabel
              : CHARACTERS_COPY.characterDirectory.sortRowsLabel}
          </span>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {hasMultipleWorlds && (
              <select
                disabled={setup.isUiLocked}
                value={selectedWorldId ?? "all"}
                onChange={(e) => {
                  const val = e.target.value;
                  onDirectoryWorldFilterChange(val === "all" ? null : Number(val));
                }}
                style={selectStyle}
              >
                {directory.worldIds.map((worldId) => (
                  <option key={worldId} value={worldId}>
                    {WORLD_NAMES[worldId] ?? `World ${worldId}`}
                  </option>
                ))}
                <option value="all">All worlds</option>
              </select>
            )}
            <select
              disabled={setup.isUiLocked}
              value={directorySortBy}
              onChange={(event) => onDirectorySortByChange(event.target.value as DirectorySortBy)}
              style={selectStyle}
            >
              <option value="name">{CHARACTERS_COPY.characterDirectory.sortAlphabeticalOption}</option>
              <option value="level">{CHARACTERS_COPY.characterDirectory.sortByLevelOption}</option>
              <option value="class">{CHARACTERS_COPY.characterDirectory.sortByClassOption}</option>
            </select>
          </div>
        </div>

        {/* Single divider — removed the duplicate that was here before */}
        <div style={{ borderTop: `1px solid ${theme.border}` }} />

        {selectedWorldId === null && hasMultipleWorlds ? (
          renderAllWorldsView()
        ) : (
          <>
            <section style={getDirectoryRevealStyle(shouldShowDirectoryPanel && directoryRevealPhase >= 1)}>
              <p className="section-label" style={{ color: theme.muted }}>
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
                <p className="section-label" style={{ color: theme.muted }}>
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
              <p className="section-label" style={{ color: theme.muted }}>
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
          </>
        )}
      </div>
    </div>
  );
}

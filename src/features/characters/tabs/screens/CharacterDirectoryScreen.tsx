import { useState } from "react";
import { toCharacterKey } from "../../model/characterKeys";
import { WORLD_NAMES } from "../../model/constants";
import type { StoredCharacterRecord } from "../../model/charactersStore";
import {
  buildDirectoryGroups,
  getDirectoryRevealStyle,
  type DirectorySortBy,
} from "../charactersDirectory";
import { CHARACTERS_COPY } from "../content";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import type { AppTheme } from "../../../../components/themes";
import CharacterAvatar from "../components/CharacterAvatar";

// ─── Sub-components ────────────────────────────────────────────────────────

function DirectoryCharacterAvatar({ character }: { character: StoredCharacterRecord }) {
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

function formatFetchedAt(fetchedAt: number): string {
  return new Date(fetchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isCharacterStale(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

interface DirectoryCharacterCardProps {
  character: StoredCharacterRecord;
  showWorld: boolean;
  isUiLocked: boolean;
  theme: AppTheme;
  refreshingKeys: ReadonlySet<string>;
  onOpen: (character: StoredCharacterRecord) => void;
}

function DirectoryCharacterCard({ character, showWorld, isUiLocked, theme, refreshingKeys, onOpen }: DirectoryCharacterCardProps) {
  const key = toCharacterKey(character);
  const isRefreshing = refreshingKeys.has(key);
  const stale = !isRefreshing && isCharacterStale(character.expiresAt);
  return (
    <div
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
        disabled={isUiLocked}
        onClick={() => onOpen(character)}
        title={`Last updated: ${formatFetchedAt(character.fetchedAt)}`}
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
          {isRefreshing && <span aria-label="Refreshing" className="char-refresh-spin" style={{ color: theme.muted, marginLeft: "0.2rem" }}>↻</span>}
          {stale && <span aria-label="Data outdated" style={{ color: "#d97706", marginLeft: "0.2rem" }}>⚠</span>}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.1, color: theme.muted, textAlign: "center" }}>
          Lv {character.level}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.1, color: theme.muted, textAlign: "center" }}>
          {character.jobName}
        </span>
        {showWorld && (
          <span style={{ fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.1, color: theme.muted, textAlign: "center" }}>
            {WORLD_NAMES[character.worldID] ?? `World ${character.worldID}`}
          </span>
        )}
      </button>
    </div>
  );
}

interface DirectoryControlsProps {
  theme: AppTheme;
  isUiLocked: boolean;
  hasMultipleWorlds: boolean;
  worldIds: number[];
  selectedWorldId: number | null;
  directorySortBy: DirectorySortBy;
  onWorldChange: (worldId: number | null) => void;
  onSortChange: (sortBy: DirectorySortBy) => void;
}

function DirectoryControls({
  theme, isUiLocked, hasMultipleWorlds, worldIds, selectedWorldId,
  directorySortBy, onWorldChange, onSortChange,
}: DirectoryControlsProps) {
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

  return (
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
        {CHARACTERS_COPY.characterDirectory.sortRowsLabel}
      </span>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        {worldIds.length > 0 && (
          <select
            disabled={isUiLocked || !hasMultipleWorlds}
            value={selectedWorldId ?? "all"}
            onChange={(e) => {
              const val = e.target.value;
              onWorldChange(val === "all" ? null : Number(val));
            }}
            style={selectStyle}
          >
            {worldIds.map((worldId) => (
              <option key={worldId} value={worldId}>
                {WORLD_NAMES[worldId] ?? `World ${worldId}`}
              </option>
            ))}
            {hasMultipleWorlds && <option value="all">All worlds</option>}
          </select>
        )}
        <select
          disabled={isUiLocked}
          value={directorySortBy}
          onChange={(e) => onSortChange(e.target.value as DirectorySortBy)}
          style={selectStyle}
        >
          <option value="name">{CHARACTERS_COPY.characterDirectory.sortAlphabeticalOption}</option>
          <option value="level">{CHARACTERS_COPY.characterDirectory.sortByLevelOption}</option>
          <option value="class">{CHARACTERS_COPY.characterDirectory.sortByClassOption}</option>
        </select>
      </div>
    </div>
  );
}

interface DirectoryRoleViewProps {
  theme: AppTheme;
  isUiLocked: boolean;
  shouldShow: boolean;
  directoryRevealPhase: number;
  hasChampionSection: boolean;
  isMainAlsoChampion: boolean;
  mainCharacter: StoredCharacterRecord | null;
  championCharacters: StoredCharacterRecord[];
  championCharactersForDirectory: StoredCharacterRecord[];
  otherCharacters: StoredCharacterRecord[];
  sortedCharacters: StoredCharacterRecord[];
  muleCapacity: number;
  canAddCharacter: boolean;
  maxChampions: number;
  onOpen: (character: StoredCharacterRecord) => void;
  onAddCharacter: () => void;
  refreshingKeys: ReadonlySet<string>;
}

function DirectoryRoleView({
  theme, isUiLocked, shouldShow, directoryRevealPhase,
  hasChampionSection, isMainAlsoChampion, mainCharacter,
  championCharacters, championCharactersForDirectory, otherCharacters,
  sortedCharacters, muleCapacity, canAddCharacter, maxChampions,
  onOpen, onAddCharacter, refreshingKeys,
}: DirectoryRoleViewProps) {
  const cardProps = { isUiLocked, theme, showWorld: false, onOpen, refreshingKeys };
  const rowStyle = { display: "flex", flexWrap: "wrap" as const, justifyContent: "flex-start", alignItems: "flex-start", gap: "0.6rem", width: "100%" };

  return (
    <>
      <section style={getDirectoryRevealStyle(shouldShow && directoryRevealPhase >= 1)}>
        <p className="section-label" style={{ color: theme.muted }}>
          {CHARACTERS_COPY.characterDirectory.mainCharacterLabel}
        </p>
        {mainCharacter ? (
          <div style={rowStyle}>
            <DirectoryCharacterCard key={toCharacterKey(mainCharacter)} character={mainCharacter} {...cardProps} />
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
        <section style={getDirectoryRevealStyle(shouldShow && directoryRevealPhase >= 2)}>
          <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />
          <p className="section-label" style={{ color: theme.muted }}>
            {CHARACTERS_COPY.characterDirectory.championsLabel} ({championCharacters.length}/{maxChampions})
          </p>
          {isMainAlsoChampion && (
            <p style={{ margin: 0, marginBottom: "0.45rem", fontSize: "0.75rem", color: theme.muted, fontWeight: 700 }}>
              {CHARACTERS_COPY.characterDirectory.mainAlsoChampionMessage}
            </p>
          )}
          <div style={{ ...rowStyle, overflow: "hidden", paddingBottom: "0.15rem" }}>
            {championCharactersForDirectory.map((c) => (
              <DirectoryCharacterCard key={toCharacterKey(c)} character={c} {...cardProps} />
            ))}
          </div>
        </section>
      )}

      <section style={getDirectoryRevealStyle(shouldShow && directoryRevealPhase >= (hasChampionSection ? 3 : 2))}>
        <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />
        <p className="section-label" style={{ color: theme.muted }}>
          {CHARACTERS_COPY.characterDirectory.mulesLabel} ({otherCharacters.length}/{muleCapacity})
        </p>
        <div style={{ ...rowStyle, overflow: "hidden", paddingBottom: "0.15rem" }}>
          {otherCharacters.map((c) => (
            <DirectoryCharacterCard key={toCharacterKey(c)} character={c} {...cardProps} />
          ))}
          <button
            type="button"
            onClick={onAddCharacter}
            disabled={!canAddCharacter || isUiLocked}
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
  );
}

interface DirectoryWorldViewProps {
  theme: AppTheme;
  isUiLocked: boolean;
  worldIds: number[];
  sortedCharacters: StoredCharacterRecord[];
  shouldShow: boolean;
  directoryRevealPhase: number;
  refreshingKeys: ReadonlySet<string>;
  onOpen: (character: StoredCharacterRecord) => void;
}

function DirectoryWorldView({ theme, isUiLocked, worldIds, sortedCharacters, shouldShow, directoryRevealPhase, refreshingKeys, onOpen }: DirectoryWorldViewProps) {
  return (
    <>
      {worldIds.map((worldId, i) => {
        const worldChars = sortedCharacters.filter((c) => c.worldID === worldId);
        if (worldChars.length === 0) return null;
        return (
          <section key={worldId} style={getDirectoryRevealStyle(shouldShow && directoryRevealPhase >= 1)}>
            {i > 0 && <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />}
            <p className="section-label" style={{ color: theme.muted }}>
              {WORLD_NAMES[worldId] ?? `World ${worldId}`}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "flex-start", gap: "0.6rem", width: "100%" }}>
              {worldChars.map((c) => (
                <DirectoryCharacterCard key={toCharacterKey(c)} character={c} showWorld={false} isUiLocked={isUiLocked} theme={theme} refreshingKeys={refreshingKeys} onOpen={onOpen} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────

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
  model, actions, directorySortBy, onDirectorySortByChange,
  directoryWorldFilter, onDirectoryWorldFilterChange, directoryRevealPhase,
}: CharacterDirectoryScreenProps) {
  const { theme, setup, directory } = model;

  const inCharacterDirectoryView = setup.showFlowOverview && setup.showCharacterDirectory;
  if (!inCharacterDirectoryView) return null;

  const shouldShowDirectoryPanel = !setup.isSwitchingToDirectory && directoryRevealPhase > 0;
  const hasMultipleWorlds = directory.worldIds.length > 1;
  const selectedWorldId = directoryWorldFilter;
  const showAllWorlds = selectedWorldId === null && hasMultipleWorlds;

  const filteredCharacters = selectedWorldId !== null
    ? directory.allCharacters.filter((c) => c.worldID === selectedWorldId)
    : directory.allCharacters;

  const activeWorldId = selectedWorldId ?? directory.worldIds[0] ?? null;
  const activeMainKey = activeWorldId !== null ? (directory.mainCharacterKeyByWorld[String(activeWorldId)] ?? null) : null;
  const activeChampionKeys = activeWorldId !== null ? (directory.championCharacterKeysByWorld[String(activeWorldId)] ?? []) : [];

  const groups = buildDirectoryGroups({
    allCharacters: filteredCharacters,
    sortBy: directorySortBy,
    mainCharacterKey: selectedWorldId !== null ? activeMainKey : null,
    championCharacterKeys: selectedWorldId !== null ? activeChampionKeys : [],
    maxCharacters: directory.maxCharacters,
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.2rem", lineHeight: 1.2, color: theme.text }}>
          {CHARACTERS_COPY.characterDirectory.title}
        </h2>
      </div>
      <div style={{ display: "grid", gap: "0.7rem" }}>
        <DirectoryControls
          theme={theme}
          isUiLocked={setup.isUiLocked}
          hasMultipleWorlds={hasMultipleWorlds}
          worldIds={directory.worldIds}
          selectedWorldId={selectedWorldId}
          directorySortBy={directorySortBy}
          onWorldChange={onDirectoryWorldFilterChange}
          onSortChange={onDirectorySortByChange}
        />
        <div style={{ borderTop: `1px solid ${theme.border}` }} />
        {showAllWorlds ? (
          <DirectoryWorldView
            theme={theme}
            isUiLocked={setup.isUiLocked}
            worldIds={directory.worldIds}
            sortedCharacters={groups.sortedCharacters}
            shouldShow={shouldShowDirectoryPanel}
            directoryRevealPhase={directoryRevealPhase}
            refreshingKeys={directory.refreshingKeys}
            onOpen={actions.openCharacterProfile}
          />
        ) : (
          <DirectoryRoleView
            theme={theme}
            isUiLocked={setup.isUiLocked}
            shouldShow={shouldShowDirectoryPanel}
            directoryRevealPhase={directoryRevealPhase}
            hasChampionSection={groups.hasChampionSection}
            isMainAlsoChampion={groups.isMainAlsoChampion}
            mainCharacter={groups.mainCharacter}
            championCharacters={groups.championCharacters}
            championCharactersForDirectory={groups.championCharactersForDirectory}
            otherCharacters={groups.otherCharacters}
            sortedCharacters={groups.sortedCharacters}
            muleCapacity={groups.muleCapacity}
            canAddCharacter={groups.canAddCharacter}
            maxChampions={directory.maxChampions}
            refreshingKeys={directory.refreshingKeys}
            onOpen={actions.openCharacterProfile}
            onAddCharacter={actions.openCharacterSearch}
          />
        )}
      </div>
    </div>
  );
}

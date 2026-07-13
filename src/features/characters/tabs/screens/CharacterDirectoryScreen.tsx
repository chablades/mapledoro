import { useState, type CSSProperties } from "react";
import { toCharacterKey } from "../../model/characterKeys";
import { resolveDisplayJobName } from "../../setup/data/nexonJobMapping";
import { WORLD_NAMES } from "../../model/constants";
import type { StoredCharacterRecord } from "../../model/charactersStore";
import {
  buildDirectoryGroups,
  buildMergedDirectoryGroups,
  getDirectoryRevealStyle,
  paginate,
  type DirectorySortBy,
} from "../charactersDirectory";
import { CHARACTERS_COPY } from "../content";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import type { AppTheme } from "../../../../components/themes";
import { statusText } from "../../../../components/statusColors";
import CharacterAvatar from "../components/CharacterAvatar";
import RefreshSpinnerIcon from "../components/RefreshSpinnerIcon";
import LegionPanel from "./LegionPanel";

const rowStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, 190px)", justifyContent: "center", alignItems: "start", gap: "0.6rem", width: "100%" };

// Main is always small (one per world), but Champions and Mules can both reach real size
// once several worlds are tracked at once (All Worlds view merges every world's list into
// one), so both paginate at the same size. 10 lands on exactly 2 rows at fullscreen desktop
// width (5 cards per row at the 190px card width).
const DIRECTORY_PAGE_SIZE = 10;

function directoryCardButtonStyle(theme: AppTheme): CSSProperties {
  return {
    display: "grid",
    placeItems: "center",
    gap: "0.35rem",
    background: "transparent",
    border: "none",
    padding: 0,
    color: theme.text,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function legionButtonRowStyle(theme: AppTheme): CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    border: `1px solid ${theme.border}`, borderRadius: "12px", background: theme.bg,
    padding: "0.55rem 0.7rem", cursor: "pointer", fontFamily: "inherit", width: "100%",
  };
}

function addCharacterButtonStyle(theme: AppTheme, canAddCharacter: boolean): CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    borderRadius: "12px",
    background: theme.bg,
    color: theme.text,
    fontFamily: "inherit",
    fontWeight: 800,
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
  };
}

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
        style={directoryCardButtonStyle(theme)}
      >
        <DirectoryCharacterAvatar
          key={`${character.characterName}:${character.characterImgURL}`}
          character={character}
        />
        <span style={{ fontSize: "0.78rem", fontWeight: 800, lineHeight: 1.15, color: theme.text, textAlign: "center", maxWidth: "100%", whiteSpace: "nowrap" }}>
          {character.characterName}
          {isRefreshing && (
            <RefreshSpinnerIcon
              aria-label="Refreshing"
              color={theme.muted}
              className="char-refresh-spin"
              style={{ marginLeft: "0.2rem", verticalAlign: "middle" }}
            />
          )}
          {stale && <span aria-label="Data outdated" style={{ color: statusText(theme, "warning"), marginLeft: "0.2rem" }}>⚠</span>}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.1, color: theme.muted, textAlign: "center" }}>
          Lv {character.level}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.1, color: theme.muted, textAlign: "center" }}>
          {resolveDisplayJobName(character.jobName)}
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
  showAllWorlds: boolean;
  worldIds: number[];
  selectedWorldId: number | null;
  directorySortBy: DirectorySortBy;
  onWorldChange: (worldId: number | null) => void;
  onSortChange: (sortBy: DirectorySortBy) => void;
}

function DirectoryControls({
  theme, isUiLocked, hasMultipleWorlds, showAllWorlds, worldIds, selectedWorldId,
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
        alignItems: "center",
        gap: "0.65rem",
        border: `1px solid ${theme.border}`,
        borderRadius: "12px",
        background: theme.bg,
        padding: "0.55rem",
        flexWrap: "wrap",
      }}
    >
      {worldIds.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "0.3rem 0.55rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.muted }}>World</span>
          {hasMultipleWorlds ? (
            <select
              aria-label="Filter by world"
              disabled={isUiLocked}
              value={selectedWorldId ?? "all"}
              onChange={(e) => {
                const val = e.target.value;
                onWorldChange(val === "all" ? null : Number(val));
              }}
              style={{ ...selectStyle, border: "none", background: "transparent", padding: "0 0.2rem" }}
            >
              {worldIds.map((worldId) => (
                <option key={worldId} value={worldId}>
                  {WORLD_NAMES[worldId] ?? `World ${worldId}`}
                </option>
              ))}
              <option value="all">All worlds</option>
            </select>
          ) : (
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: theme.text }}>
              {WORLD_NAMES[worldIds[0]] ?? `World ${worldIds[0]}`}
            </span>
          )}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: "10px", padding: "0.3rem 0.55rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: theme.muted }}>Sort</span>
        <select
          aria-label="Sort characters by"
          disabled={isUiLocked}
          value={directorySortBy}
          onChange={(e) => onSortChange(e.target.value as DirectorySortBy)}
          style={{ ...selectStyle, border: "none", background: "transparent", padding: "0 0.2rem" }}
        >
          <option value="name">{CHARACTERS_COPY.characterDirectory.sortAlphabeticalOption}</option>
          <option value="level">{CHARACTERS_COPY.characterDirectory.sortByLevelOption}</option>
          <option value="class">{CHARACTERS_COPY.characterDirectory.sortByClassOption}</option>
          {showAllWorlds && (
            <option value="world">{CHARACTERS_COPY.characterDirectory.sortByWorldOption}</option>
          )}
        </select>
      </div>
    </div>
  );
}

// Legion Artifact and Link Skills are shared across every character on a world, not
// tied to any one character — this button opens a dedicated panel (LegionPanel)
// instead of living as a per-character tab. It's a genuine screen swap, not a card
// interaction, so it's just a button here rather than a card with its own content.
function LegionButtonRow({ theme, onOpen }: { theme: AppTheme; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={legionButtonRowStyle(theme)}
    >
      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: theme.text }}>Legion</span>
      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: theme.muted, display: "flex", alignItems: "center", gap: "0.3rem" }}>
        Legion Artifact &amp; Link Skills
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
      </span>
    </button>
  );
}

function pagerButtonStyle(theme: AppTheme, disabled: boolean): CSSProperties {
  return {
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    background: theme.bg,
    color: disabled ? theme.muted : theme.text,
    fontFamily: "inherit",
    fontWeight: 800,
    fontSize: "0.78rem",
    padding: "0.35rem 0.65rem",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}

function DirectoryPager({ theme, isUiLocked, page, pageCount, onPageChange }: {
  theme: AppTheme; isUiLocked: boolean; page: number; pageCount: number; onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  const atStart = page <= 0;
  const atEnd = page >= pageCount - 1;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", marginTop: "0.65rem" }}>
      <button
        type="button"
        disabled={isUiLocked || atStart}
        onClick={() => onPageChange(page - 1)}
        style={pagerButtonStyle(theme, isUiLocked || atStart)}
      >
        ‹ Prev
      </button>
      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.muted }}>
        Page {page + 1} of {pageCount}
      </span>
      <button
        type="button"
        disabled={isUiLocked || atEnd}
        onClick={() => onPageChange(page + 1)}
        style={pagerButtonStyle(theme, isUiLocked || atEnd)}
      >
        Next ›
      </button>
    </div>
  );
}

interface DirectoryRoleViewProps {
  theme: AppTheme;
  isUiLocked: boolean;
  shouldShow: boolean;
  directoryRevealPhase: number;
  groups: ReturnType<typeof buildDirectoryGroups>;
  maxChampions: number;
  mulesPage: number;
  onMulesPageChange: (page: number) => void;
  onOpen: (character: StoredCharacterRecord) => void;
  onAddCharacter: () => void;
  refreshingKeys: ReadonlySet<string>;
}

function DirectoryRoleView({
  theme, isUiLocked, shouldShow, directoryRevealPhase, groups, maxChampions,
  mulesPage, onMulesPageChange, onOpen, onAddCharacter, refreshingKeys,
}: DirectoryRoleViewProps) {
  const {
    hasChampionSection, isMainAlsoChampion, mainCharacter,
    championCharacters, championCharactersForDirectory, otherCharacters,
    sortedCharacters, muleCapacity, canAddCharacter,
  } = groups;
  const cardProps = { isUiLocked, theme, showWorld: false, onOpen, refreshingKeys };
  const { pageItems: mulesPageItems, pageCount: mulesPageCount, clampedPage: mulesClampedPage } =
    paginate(otherCharacters, mulesPage, DIRECTORY_PAGE_SIZE);
  const isLastMulesPage = mulesClampedPage === mulesPageCount - 1;

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

      {hasChampionSection && (
        <section style={getDirectoryRevealStyle(shouldShow && directoryRevealPhase >= 2)}>
          <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />
          <p className="section-label" style={{ color: theme.muted }}>
            {CHARACTERS_COPY.characterDirectory.championsLabel} ({championCharacters.length}/{maxChampions})
          </p>
          {isMainAlsoChampion && (
            <p style={{ margin: 0, marginBottom: "0.45rem", fontSize: "0.78rem", color: theme.muted, fontWeight: 700 }}>
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
          {mulesPageItems.map((c) => (
            <DirectoryCharacterCard key={toCharacterKey(c)} character={c} {...cardProps} />
          ))}
          {isLastMulesPage && (
            <button
              type="button"
              onClick={onAddCharacter}
              disabled={!canAddCharacter || isUiLocked}
              style={addCharacterButtonStyle(theme, canAddCharacter)}
            >
              <span>+</span>
              <span style={{ fontSize: "0.76rem", fontWeight: 800 }}>
                {CHARACTERS_COPY.characterDirectory.addCharacterButton}
              </span>
            </button>
          )}
        </div>
        <DirectoryPager theme={theme} isUiLocked={isUiLocked} page={mulesClampedPage} pageCount={mulesPageCount} onPageChange={onMulesPageChange} />
      </section>
    </>
  );
}

interface DirectoryAllWorldsViewProps {
  theme: AppTheme;
  isUiLocked: boolean;
  mergedGroups: ReturnType<typeof buildMergedDirectoryGroups>;
  shouldShow: boolean;
  directoryRevealPhase: number;
  championsPage: number;
  onChampionsPageChange: (page: number) => void;
  mulesPage: number;
  onMulesPageChange: (page: number) => void;
  refreshingKeys: ReadonlySet<string>;
  onOpen: (character: StoredCharacterRecord) => void;
}

// All Worlds merges every tracked world's Main/Champions/Mules into three flat sections
// (each card badged with its world via showWorld) instead of repeating the single-world
// view's three-tier structure once per world — that would mean up to 6 stacked sets of
// headers plus 6 separate pagers for a player with characters on every world. Main is
// always small (one per world) and never paginates, but Champions and Mules both can reach
// real size once merged across several worlds (up to MAX_CHAMPIONS per world for Champions),
// so both paginate the same way.
function DirectoryAllWorldsView({
  theme, isUiLocked, mergedGroups, shouldShow, directoryRevealPhase,
  championsPage, onChampionsPageChange, mulesPage, onMulesPageChange, refreshingKeys, onOpen,
}: DirectoryAllWorldsViewProps) {
  const { sortedCharacters, mainCharacters, championCharacters, otherCharacters } = mergedGroups;
  const cardProps = { isUiLocked, theme, showWorld: true, onOpen, refreshingKeys };
  const hasChampions = championCharacters.length > 0;
  const { pageItems: championsPageItems, pageCount: championsPageCount, clampedPage: championsClampedPage } =
    paginate(championCharacters, championsPage, DIRECTORY_PAGE_SIZE);
  const { pageItems: mulesPageItems, pageCount: mulesPageCount, clampedPage: mulesClampedPage } =
    paginate(otherCharacters, mulesPage, DIRECTORY_PAGE_SIZE);

  return (
    <>
      <section style={getDirectoryRevealStyle(shouldShow && directoryRevealPhase >= 1)}>
        <p className="section-label" style={{ color: theme.muted }}>
          {CHARACTERS_COPY.characterDirectory.mainCharacterLabel}
        </p>
        {mainCharacters.length > 0 ? (
          <div style={rowStyle}>
            {mainCharacters.map((c) => (
              <DirectoryCharacterCard key={toCharacterKey(c)} character={c} {...cardProps} />
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: theme.muted, fontWeight: 700 }}>
            {sortedCharacters.length > 0
              ? CHARACTERS_COPY.characterDirectory.noMainSelectedMessage
              : CHARACTERS_COPY.characterDirectory.noCharactersAddedMessage}
          </p>
        )}
      </section>

      {hasChampions && (
        <section style={getDirectoryRevealStyle(shouldShow && directoryRevealPhase >= 2)}>
          <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />
          <p className="section-label" style={{ color: theme.muted }}>
            {CHARACTERS_COPY.characterDirectory.championsLabel} ({championCharacters.length})
          </p>
          <div style={{ ...rowStyle, overflow: "hidden", paddingBottom: "0.15rem" }}>
            {championsPageItems.map((c) => (
              <DirectoryCharacterCard key={toCharacterKey(c)} character={c} {...cardProps} />
            ))}
          </div>
          <DirectoryPager theme={theme} isUiLocked={isUiLocked} page={championsClampedPage} pageCount={championsPageCount} onPageChange={onChampionsPageChange} />
        </section>
      )}

      {otherCharacters.length > 0 && (
        <section style={getDirectoryRevealStyle(shouldShow && directoryRevealPhase >= (hasChampions ? 3 : 2))}>
          <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />
          <p className="section-label" style={{ color: theme.muted }}>
            {CHARACTERS_COPY.characterDirectory.mulesLabel} ({otherCharacters.length})
          </p>
          <div style={{ ...rowStyle, overflow: "hidden", paddingBottom: "0.15rem" }}>
            {mulesPageItems.map((c) => (
              <DirectoryCharacterCard key={toCharacterKey(c)} character={c} {...cardProps} />
            ))}
          </div>
          <DirectoryPager theme={theme} isUiLocked={isUiLocked} page={mulesClampedPage} pageCount={mulesPageCount} onPageChange={onMulesPageChange} />
        </section>
      )}
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
  const [legionPanelOpen, setLegionPanelOpen] = useState(false);
  // Keyed on whatever view/sort is active, so switching worlds, toggling All Worlds, or
  // re-sorting naturally resets a section back to page 1 instead of clamping onto whatever
  // page number happened to be set for a totally different list.
  const [championsPagerState, setChampionsPagerState] = useState<{ key: string; page: number }>({ key: "", page: 0 });
  const [mulesPagerState, setMulesPagerState] = useState<{ key: string; page: number }>({ key: "", page: 0 });

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
    mainCharacterKey: showAllWorlds ? null : activeMainKey,
    championCharacterKeys: showAllWorlds ? [] : activeChampionKeys,
    maxCharacters: directory.maxCharacters,
  });

  const mergedMainKeys = new Set<string>();
  const mergedChampionKeys = new Set<string>();
  directory.worldIds.forEach((worldId) => {
    const mainKey = directory.mainCharacterKeyByWorld[String(worldId)];
    if (mainKey) mergedMainKeys.add(mainKey);
    (directory.championCharacterKeysByWorld[String(worldId)] ?? []).forEach((key) => mergedChampionKeys.add(key));
  });
  const mergedGroups = buildMergedDirectoryGroups({
    allCharacters: filteredCharacters,
    sortBy: directorySortBy,
    mainCharacterKeys: mergedMainKeys,
    championCharacterKeys: mergedChampionKeys,
  });

  const pagerKey = `${showAllWorlds ? "all" : activeWorldId}:${directorySortBy}`;
  const championsPage = championsPagerState.key === pagerKey ? championsPagerState.page : 0;
  const handleChampionsPageChange = (page: number) => setChampionsPagerState({ key: pagerKey, page });
  const mulesPage = mulesPagerState.key === pagerKey ? mulesPagerState.page : 0;
  const handleMulesPageChange = (page: number) => setMulesPagerState({ key: pagerKey, page });

  if (legionPanelOpen && !showAllWorlds && activeWorldId !== null) {
    return (
      <LegionPanel
        theme={theme}
        worldId={activeWorldId}
        worldCharacters={filteredCharacters}
        onBack={() => setLegionPanelOpen(false)}
      />
    );
  }

  return (
    <div className="fade-in">
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
          showAllWorlds={showAllWorlds}
          worldIds={directory.worldIds}
          selectedWorldId={selectedWorldId}
          directorySortBy={directorySortBy}
          onWorldChange={onDirectoryWorldFilterChange}
          onSortChange={onDirectorySortByChange}
        />
        {!showAllWorlds && activeWorldId !== null && (
          <LegionButtonRow theme={theme} onOpen={() => setLegionPanelOpen(true)} />
        )}
        <div style={{ borderTop: `1px solid ${theme.border}` }} />
        {showAllWorlds ? (
          <DirectoryAllWorldsView
            theme={theme}
            isUiLocked={setup.isUiLocked}
            mergedGroups={mergedGroups}
            shouldShow={shouldShowDirectoryPanel}
            directoryRevealPhase={directoryRevealPhase}
            championsPage={championsPage}
            onChampionsPageChange={handleChampionsPageChange}
            mulesPage={mulesPage}
            onMulesPageChange={handleMulesPageChange}
            refreshingKeys={directory.refreshingKeys}
            onOpen={actions.openCharacterProfile}
          />
        ) : (
          <DirectoryRoleView
            theme={theme}
            isUiLocked={setup.isUiLocked}
            shouldShow={shouldShowDirectoryPanel}
            directoryRevealPhase={directoryRevealPhase}
            groups={groups}
            maxChampions={directory.maxChampions}
            mulesPage={mulesPage}
            onMulesPageChange={handleMulesPageChange}
            refreshingKeys={directory.refreshingKeys}
            onOpen={actions.openCharacterProfile}
            onAddCharacter={actions.openCharacterSearch}
          />
        )}
      </div>
    </div>
  );
}

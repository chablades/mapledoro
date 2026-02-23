import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { AppTheme } from "../../../../components/themes";
import { WORLD_NAMES } from "../../model/constants";
import type { NormalizedCharacterData } from "../../model/types";
import StepRenderer from "../../setup/StepRenderer";
import { getRequiredSetupFlowId, type SetupFlowDefinition, type SetupFlowId } from "../../setup/flows";
import { panelCardStyle, primaryButtonStyle, secondaryButtonStyle } from "./uiStyles";
import { CHARACTERS_COPY } from "../content";

interface PreviewSetupPaneProps {
  theme: AppTheme;
  foundCharacter: NormalizedCharacterData | null;
  previewCardReady: boolean;
  previewContentReady: boolean;
  previewImageLoaded: boolean;
  isConfirmFadeOut: boolean;
  isModeTransitioning: boolean;
  setupFlowStarted: boolean;
  setupPanelVisible: boolean;
  isBackTransitioning: boolean;
  isFinishingSetup: boolean;
  isSwitchingToDirectory: boolean;
  isSwitchingToProfile: boolean;
  isUiLocked: boolean;
  isStartingOptionalFlow: boolean;
  isOptionalFlowFadeIn: boolean;
  activeFlowId: SetupFlowId;
  completedFlowIds: SetupFlowId[];
  optionalFlows: readonly SetupFlowDefinition[];
  showFlowOverview: boolean;
  showCharacterDirectory: boolean;
  fastDirectoryRevealOnce: boolean;
  allCharacters: NormalizedCharacterData[];
  mainCharacterKey: string | null;
  championCharacterKeys: string[];
  maxCharacters: number;
  maxChampions: number;
  setupStepIndex: number;
  setupStepDirection: "forward" | "backward";
  activeSetupStepValue: string;
  onSetPreviewImageLoaded: (loaded: boolean) => void;
  onConfirmFoundCharacter: () => void;
  onSetSetupStepWithDirection: (step: number) => void;
  onStepValueChange: (value: string) => void;
  onFinishSetupFlow: () => void;
  onStartOptionalFlow: (flowId: SetupFlowId) => void;
  onOpenCharacterSearch: () => void;
  onOpenCharacterProfile: (character: NormalizedCharacterData) => void;
}

export default function PreviewSetupPane({
  theme,
  foundCharacter,
  previewCardReady,
  previewContentReady,
  previewImageLoaded,
  isConfirmFadeOut,
  isModeTransitioning,
  setupFlowStarted,
  setupPanelVisible,
  isBackTransitioning,
  isFinishingSetup,
  isSwitchingToDirectory,
  isSwitchingToProfile,
  isUiLocked,
  isStartingOptionalFlow,
  isOptionalFlowFadeIn,
  activeFlowId,
  completedFlowIds,
  optionalFlows,
  showFlowOverview,
  showCharacterDirectory,
  fastDirectoryRevealOnce,
  allCharacters,
  mainCharacterKey,
  championCharacterKeys,
  maxCharacters,
  maxChampions,
  setupStepIndex,
  setupStepDirection,
  activeSetupStepValue,
  onSetPreviewImageLoaded,
  onConfirmFoundCharacter,
  onSetSetupStepWithDirection,
  onStepValueChange,
  onFinishSetupFlow,
  onStartOptionalFlow,
  onOpenCharacterSearch,
  onOpenCharacterProfile,
}: PreviewSetupPaneProps) {
  const requiredFlowDone = completedFlowIds.includes(getRequiredSetupFlowId());
  const [selectedModuleFlowId, setSelectedModuleFlowId] = useState<SetupFlowId | null>(
    optionalFlows[0]?.id ?? null,
  );

  const selectedModuleFlow = useMemo(
    () => optionalFlows.find((flow) => flow.id === selectedModuleFlowId) ?? optionalFlows[0] ?? null,
    [optionalFlows, selectedModuleFlowId],
  );
  const [directorySortBy, setDirectorySortBy] = useState<"name" | "level" | "class">("name");
  const [directoryRevealPhase, setDirectoryRevealPhase] = useState(0);

  const sortedCharacters = useMemo(() => {
    const entries = [...allCharacters];
    if (directorySortBy === "level") {
      entries.sort((a, b) => b.level - a.level || a.characterName.localeCompare(b.characterName));
      return entries;
    }
    if (directorySortBy === "class") {
      entries.sort((a, b) => a.jobName.localeCompare(b.jobName) || a.characterName.localeCompare(b.characterName));
      return entries;
    }
    entries.sort((a, b) => a.characterName.localeCompare(b.characterName));
    return entries;
  }, [allCharacters, directorySortBy]);

  const mainCharacter =
    sortedCharacters.find(
      (character) =>
        `${character.worldID}:${character.characterName.trim().toLowerCase()}` ===
        mainCharacterKey,
    ) ?? null;
  const mainCharacterCompositeKey = mainCharacter
    ? `${mainCharacter.worldID}:${mainCharacter.characterName.trim().toLowerCase()}`
    : null;

  const championSet = new Set(championCharacterKeys);
  const championCharacters = sortedCharacters.filter((character) =>
    championSet.has(`${character.worldID}:${character.characterName.trim().toLowerCase()}`),
  );
  const isMainAlsoChampion = mainCharacterCompositeKey
    ? championSet.has(mainCharacterCompositeKey)
    : false;
  const championCharactersForDirectory = championCharacters.filter((character) => {
    const key = `${character.worldID}:${character.characterName.trim().toLowerCase()}`;
    return key !== mainCharacterCompositeKey;
  });
  const otherCharacters = sortedCharacters.filter((character) => {
    const key = `${character.worldID}:${character.characterName.trim().toLowerCase()}`;
    if (mainCharacterCompositeKey && key === mainCharacterCompositeKey) {
      return false;
    }
    return !championSet.has(key);
  });
  const reservedMainSlots = mainCharacterCompositeKey ? 1 : 0;
  const muleCapacity = Math.max(
    0,
    maxCharacters - reservedMainSlots - championCharactersForDirectory.length,
  );
  const canAddCharacter = sortedCharacters.length < maxCharacters;
  const hasChampionSection = championCharactersForDirectory.length > 0 || isMainAlsoChampion;
  const inCharacterDirectoryView = showFlowOverview && showCharacterDirectory;
  const shouldShowDirectoryPanel =
    inCharacterDirectoryView && !isSwitchingToDirectory && directoryRevealPhase > 0;
  useEffect(() => {
    if (!inCharacterDirectoryView || isSwitchingToDirectory) {
      const resetPhaseTimer = window.setTimeout(() => {
        setDirectoryRevealPhase(0);
      }, 0);
      return () => clearTimeout(resetPhaseTimer);
    }
  }, [inCharacterDirectoryView, isSwitchingToDirectory]);

  useEffect(() => {
    if (!inCharacterDirectoryView || isSwitchingToDirectory) return;
    const startPhaseTimer = window.setTimeout(() => {
      setDirectoryRevealPhase(0);
    }, 0);
    const mainDelay = fastDirectoryRevealOnce ? 24 : 60;
    const championDelay = fastDirectoryRevealOnce ? 56 : 120;
    const mulesDelay = fastDirectoryRevealOnce
      ? hasChampionSection
        ? 88
        : 56
      : hasChampionSection
        ? 180
        : 120;
    const mainTimer = window.setTimeout(() => {
      setDirectoryRevealPhase(1);
    }, mainDelay);
    const championsTimer = window.setTimeout(() => {
      setDirectoryRevealPhase(2);
    }, championDelay);
    const mulesTimer = window.setTimeout(() => {
      setDirectoryRevealPhase(3);
    }, mulesDelay);
    return () => {
      clearTimeout(startPhaseTimer);
      clearTimeout(mainTimer);
      clearTimeout(championsTimer);
      clearTimeout(mulesTimer);
    };
  }, [
    fastDirectoryRevealOnce,
    hasChampionSection,
    inCharacterDirectoryView,
    isSwitchingToDirectory,
  ]);

  const getRevealStyle = (visible: boolean) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(10px)",
    transition: "opacity 0.24s ease, transform 0.24s ease",
    pointerEvents: visible ? "auto" as const : "none" as const,
  });

  const renderCharacterCard = (
    character: NormalizedCharacterData,
    variant: "main" | "champion" | "mule" = "mule",
  ) => {
    const key = `${character.worldID}:${character.characterName.trim().toLowerCase()}`;
    const cardSizeStyle =
      variant === "main"
        ? {
            flex: "0 0 auto",
            width: "min(190px, 100%)",
            minWidth: "160px",
            maxWidth: "190px",
          }
        : variant === "champion"
          ? {
              flex: "0 0 auto",
              width: "min(190px, 100%)",
              minWidth: "160px",
              maxWidth: "190px",
            }
          : {
              flex: "0 0 auto",
              width: "min(190px, 100%)",
              minWidth: "160px",
              maxWidth: "190px",
            };
    return (
      <div key={key} style={{ ...cardSizeStyle, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
        <button
          type="button"
          disabled={isUiLocked}
          onClick={() => onOpenCharacterProfile(character)}
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
            style={{
              borderRadius: "12px",
              objectFit: "contain",
              objectPosition: "center bottom",
            }}
          />
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 800,
              lineHeight: 1.15,
              color: theme.text,
              textAlign: "center",
              maxWidth: "100%",
              whiteSpace: "nowrap",
            }}
          >
            {character.characterName}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              lineHeight: 1.1,
              color: theme.muted,
              textAlign: "center",
            }}
          >
            Lv {character.level}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="preview-pane">
      {foundCharacter && previewCardReady && !setupFlowStarted && (
        <aside
          className={`character-search-panel preview-card ${isConfirmFadeOut || isBackTransitioning || isModeTransitioning ? "confirm-fade" : ""} ${isBackTransitioning || isModeTransitioning ? "back-fade" : ""}`}
          style={panelCardStyle(theme, "1rem")}
        >
          <div
            className={`preview-content ${isConfirmFadeOut || isBackTransitioning || isModeTransitioning ? "preview-confirm-fade" : ""} ${isBackTransitioning || isModeTransitioning ? "back-fade-content" : ""}`}
            style={{
              opacity: previewContentReady ? 1 : 0,
              transform: previewContentReady ? "translateY(0)" : "translateY(6px)",
            }}
          >
            <div
              key={`${foundCharacter.characterName}:${foundCharacter.fetchedAt}`}
              className="preview-char-swap"
              style={{
                display: "flex",
                gap: "0.65rem",
                alignItems: "center",
                marginBottom: "0.6rem",
              }}
            >
              <div
                className={!previewImageLoaded ? "image-skeleton-wrap" : undefined}
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "12px",
                }}
              >
                <Image
                  src={foundCharacter.characterImgURL}
                  alt={`${foundCharacter.characterName} avatar`}
                  width={72}
                  height={72}
                  onLoad={() => onSetPreviewImageLoaded(true)}
                  className={`image-fade-in ${previewImageLoaded ? "image-loaded" : ""}`}
                  style={{
                    borderRadius: "12px",
                    display: "block",
                    objectFit: "cover",
                  }}
                />
              </div>
              <div>
                <p
                  style={{
                    fontSize: "1rem",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    margin: 0,
                    marginBottom: "0.16rem",
                  }}
                >
                  {foundCharacter.characterName}
                </p>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: theme.muted,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  {WORLD_NAMES[foundCharacter.worldID] ?? `ID ${foundCharacter.worldID}`}
                </p>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: theme.muted,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    margin: 0,
                    marginTop: "0.08rem",
                  }}
                >
                  Level {foundCharacter.level} · {foundCharacter.jobName}
                </p>
              </div>
            </div>
            <div
              style={{
                borderTop: `1px solid ${theme.border}`,
                paddingTop: "0.65rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.86rem",
                  color: theme.text,
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: "0.72rem",
                }}
              >
                {CHARACTERS_COPY.titles.confirmPrompt}
              </p>
              <button
                type="button"
                disabled={isUiLocked}
                onClick={onConfirmFoundCharacter}
                style={{
                  ...primaryButtonStyle(theme, "0.7rem 0.9rem"),
                  width: "100%",
                }}
              >
                {CHARACTERS_COPY.buttons.confirm}
              </button>
            </div>
          </div>
        </aside>
      )}
      {setupFlowStarted && (
        <aside
          className={`character-search-panel setup-panel ${setupPanelVisible ? "setup-panel-visible" : ""} ${isBackTransitioning ? "setup-panel-fade" : ""} ${isFinishingSetup ? "setup-finish-fade" : ""} ${isStartingOptionalFlow ? "setup-panel-fade-out" : ""} ${isSwitchingToDirectory || isSwitchingToProfile ? "profile-to-directory-fade" : ""} ${showFlowOverview && !showCharacterDirectory && !isSwitchingToDirectory ? "summary-panel-fade-in" : ""} ${!showFlowOverview && isOptionalFlowFadeIn ? "step-panel-fade-in" : ""}`}
          style={{
            ...panelCardStyle(theme, "1rem"),
            position: "relative",
            opacity: inCharacterDirectoryView && !shouldShowDirectoryPanel ? 0 : 1,
            transform:
              inCharacterDirectoryView && !shouldShowDirectoryPanel
                ? "translateY(8px)"
                : "translateY(0)",
            visibility:
              inCharacterDirectoryView && !shouldShowDirectoryPanel
                ? "hidden"
                : "visible",
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}
        >
          <div
            key={`setup-step-${setupStepIndex}-${showFlowOverview ? "summary" : "flow"}-${showCharacterDirectory ? "directory" : "profile"}`}
            className={`setup-step-content ${
              showFlowOverview
                ? "directory-step-content"
                : isOptionalFlowFadeIn
                  ? "step-no-slide"
                  : setupStepDirection === "forward"
                      ? "step-forward"
                      : "step-backward"
            } ${!showFlowOverview && isOptionalFlowFadeIn ? "step-flow-fade-in" : ""}`}
          >
            {showFlowOverview ? (
              showCharacterDirectory ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "'Fredoka One', cursive",
                        fontSize: "1.2rem",
                        lineHeight: 1.2,
                        color: theme.text,
                      }}
                    >
                      View Your Characters
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
                        Sort rows
                      </span>
                      <select
                        disabled={isUiLocked}
                        value={directorySortBy}
                        onChange={(event) =>
                          setDirectorySortBy(event.target.value as "name" | "level" | "class")
                        }
                        style={{
                          border: `1px solid ${theme.border}`,
                          borderRadius: "8px",
                          background: theme.panel,
                          color: theme.text,
                          fontFamily: "inherit",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          padding: "0.25rem 0.4rem",
                        }}
                      >
                        <option value="name">Alphabetical</option>
                        <option value="level">By Level</option>
                        <option value="class">By Class</option>
                      </select>
                    </div>

                    <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: "0.15rem" }} />
                    <section style={getRevealStyle(shouldShowDirectoryPanel && directoryRevealPhase >= 1)}>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.5rem" }}>
                        Main Character
                      </p>
                      {mainCharacter ? (
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "flex-start", gap: "0.6rem", width: "100%" }}>
                          {renderCharacterCard(mainCharacter, "main")}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: theme.muted, fontWeight: 700 }}>
                          {sortedCharacters.length > 0
                            ? "No main selected yet."
                            : "No characters added yet."}
                        </p>
                      )}
                    </section>

                    {(championCharactersForDirectory.length > 0 || isMainAlsoChampion) && (
                      <section style={getRevealStyle(shouldShowDirectoryPanel && directoryRevealPhase >= 2)}>
                        <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />
                        <p style={{ margin: 0, fontSize: "0.75rem", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.5rem" }}>
                          Champions ({championCharacters.length}/{maxChampions})
                        </p>
                        {isMainAlsoChampion && (
                          <p
                            style={{
                              margin: 0,
                              marginBottom: "0.45rem",
                              fontSize: "0.74rem",
                              color: theme.muted,
                              fontWeight: 700,
                            }}
                          >
                            Main is also set as champion.
                          </p>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "flex-start", gap: "0.6rem", overflow: "hidden", width: "100%", paddingBottom: "0.15rem" }}>
                          {championCharactersForDirectory.map((character) =>
                            renderCharacterCard(character, "champion"),
                          )}
                        </div>
                      </section>
                    )}

                    <section
                      style={getRevealStyle(
                        shouldShowDirectoryPanel &&
                          directoryRevealPhase >= (hasChampionSection ? 3 : 2),
                      )}
                    >
                      <div style={{ borderTop: `1px solid ${theme.border}`, marginBottom: "0.7rem" }} />
                      <p style={{ margin: 0, fontSize: "0.75rem", color: theme.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.5rem" }}>
                        Mules ({otherCharacters.length}/{muleCapacity})
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "flex-start", gap: "0.6rem", overflow: "hidden", width: "100%", paddingBottom: "0.15rem" }}>
                        {otherCharacters.map((character) => renderCharacterCard(character, "mule"))}
                        <button
                          type="button"
                          onClick={onOpenCharacterSearch}
                          disabled={!canAddCharacter || isUiLocked}
                          style={{
                            ...secondaryButtonStyle(theme, "0.5rem 0.65rem"),
                            flex: "0 0 auto",
                            minWidth: "160px",
                            maxWidth: "190px",
                            width: "min(190px, 100%)",
                            height: "120px",
                            borderRadius: "12px",
                            fontSize: "1.45rem",
                            fontWeight: 900,
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
                            Add character
                          </span>
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "'Fredoka One', cursive",
                        fontSize: "1.15rem",
                        lineHeight: 1.2,
                        color: theme.text,
                      }}
                    >
                      Character Summary
                    </h2>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {optionalFlows.map((flow) => {
                        const done = completedFlowIds.includes(flow.id);
                        const locked = !requiredFlowDone;
                        return (
                          <button
                            key={flow.id}
                            type="button"
                            disabled={isUiLocked}
                            onClick={() => setSelectedModuleFlowId(flow.id)}
                            style={{
                              ...secondaryButtonStyle(theme, "0.35rem 0.55rem"),
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              opacity: locked ? 0.45 : 1,
                              borderStyle: done ? "solid" : "dashed",
                              background:
                                selectedModuleFlow?.id === flow.id ? theme.accentSoft : theme.bg,
                              cursor: "pointer",
                            }}
                          >
                            {flow.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div
                    style={{
                      border: `1px dashed ${theme.border}`,
                      borderRadius: "12px",
                      padding: "0.95rem",
                      color: theme.muted,
                      background: theme.bg,
                      fontSize: "0.83rem",
                      fontWeight: 700,
                      minHeight: "220px",
                    }}
                  >
                    <p style={{ margin: 0, marginBottom: "0.55rem", color: theme.text, fontWeight: 800 }}>
                      {selectedModuleFlow?.label ?? "Module"} placeholder
                    </p>
                    <p style={{ margin: 0, marginBottom: "0.85rem", color: theme.muted, fontSize: "0.8rem" }}>
                      {selectedModuleFlow?.description ?? "Module details will appear here."}
                    </p>
                    <button
                      type="button"
                      disabled={!requiredFlowDone || !selectedModuleFlow || isUiLocked}
                      onClick={() => {
                        if (selectedModuleFlow) onStartOptionalFlow(selectedModuleFlow.id);
                      }}
                      style={{
                        ...primaryButtonStyle(theme, "0.45rem 0.7rem"),
                        fontSize: "0.8rem",
                        opacity: !requiredFlowDone ? 0.6 : 1,
                        cursor: !requiredFlowDone ? "not-allowed" : "pointer",
                      }}
                    >
                      Start setup flow
                    </button>
                  </div>
                </div>
              )
            ) : setupStepIndex === 0 ? (
              <>
                <h2
                  style={{
                    margin: 0,
                    marginBottom: "0.45rem",
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "1.3rem",
                    lineHeight: 1.2,
                    color: theme.text,
                  }}
                >
                  {CHARACTERS_COPY.titles.setupIntro}
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    color: theme.muted,
                    fontWeight: 700,
                    marginBottom: "0.9rem",
                  }}
                >
                  {CHARACTERS_COPY.subtitles.setupIntro}
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    disabled={isUiLocked}
                    onClick={() => onSetSetupStepWithDirection(1)}
                    style={primaryButtonStyle(theme, "0.55rem 0.9rem")}
                  >
                    {CHARACTERS_COPY.buttons.nextStep}
                  </button>
                </div>
              </>
            ) : (
              <StepRenderer
                theme={theme}
                flowId={activeFlowId}
                stepIndex={setupStepIndex}
                stepValue={activeSetupStepValue}
                onStepValueChange={onStepValueChange}
                onBackStep={() => onSetSetupStepWithDirection(setupStepIndex - 1)}
                onNextStep={() => onSetSetupStepWithDirection(setupStepIndex + 1)}
                onFinish={onFinishSetupFlow}
              />
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

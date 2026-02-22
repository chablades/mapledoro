import Image from "next/image";
import type { AppTheme } from "../../../../components/themes";
import { WORLD_NAMES } from "../../model/constants";
import type { NormalizedCharacterData } from "../../model/types";
import StepRenderer from "../../setup/StepRenderer";
import { panelCardStyle, primaryButtonStyle, secondaryButtonStyle } from "./uiStyles";
import { CHARACTERS_COPY } from "../content";

interface PreviewSetupPaneProps {
  theme: AppTheme;
  foundCharacter: NormalizedCharacterData | null;
  previewCardReady: boolean;
  previewContentReady: boolean;
  previewImageLoaded: boolean;
  isConfirmFadeOut: boolean;
  setupFlowStarted: boolean;
  setupPanelVisible: boolean;
  isBackTransitioning: boolean;
  setupStepIndex: number;
  setupStepDirection: "forward" | "backward";
  activeSetupStepValue: string;
  onSetPreviewImageLoaded: (loaded: boolean) => void;
  onConfirmFoundCharacter: () => void;
  onSetSetupStepWithDirection: (step: number) => void;
  onStepValueChange: (value: string) => void;
  onFinishSetupFlow: () => void;
}

export default function PreviewSetupPane({
  theme,
  foundCharacter,
  previewCardReady,
  previewContentReady,
  previewImageLoaded,
  isConfirmFadeOut,
  setupFlowStarted,
  setupPanelVisible,
  isBackTransitioning,
  setupStepIndex,
  setupStepDirection,
  activeSetupStepValue,
  onSetPreviewImageLoaded,
  onConfirmFoundCharacter,
  onSetSetupStepWithDirection,
  onStepValueChange,
  onFinishSetupFlow,
}: PreviewSetupPaneProps) {
  return (
    <div className="preview-pane">
      {foundCharacter && previewCardReady && !setupFlowStarted && (
        <aside
          className={`character-search-panel preview-card ${isConfirmFadeOut ? "confirm-fade" : ""}`}
          style={panelCardStyle(theme, "1rem")}
        >
          <div
            className={`preview-content ${isConfirmFadeOut ? "preview-confirm-fade" : ""}`}
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
          className={`character-search-panel setup-panel ${setupPanelVisible ? "setup-panel-visible" : ""} ${isBackTransitioning ? "setup-panel-fade" : ""}`}
          style={{ ...panelCardStyle(theme, "1rem"), position: "relative" }}
        >
          {setupStepIndex > 0 && (
            <button
              type="button"
              onClick={() => onSetSetupStepWithDirection(setupStepIndex + 1)}
              style={{
                ...secondaryButtonStyle(theme, "0.4rem 0.65rem"),
                position: "absolute",
                top: "0.8rem",
                right: "0.8rem",
                color: theme.muted,
                fontSize: "0.8rem",
              }}
            >
              {CHARACTERS_COPY.buttons.skip}
            </button>
          )}
          <div
            key={`setup-step-${setupStepIndex}`}
            className={`setup-step-content ${setupStepDirection === "forward" ? "step-forward" : "step-backward"}`}
          >
            {setupStepIndex === 0 ? (
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

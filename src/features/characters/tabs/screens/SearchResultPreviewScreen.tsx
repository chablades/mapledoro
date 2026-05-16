import { WORLD_NAMES } from "../../model/constants";
import { resolveDisplayJobName } from "../../setup/data/nexonJobMapping";
import { CHARACTERS_COPY } from "../content";
import type { PreviewPaneActions, PreviewPaneModel } from "../paneModels";
import CharacterAvatar from "../components/CharacterAvatar";
import { panelCardStyle, primaryButtonStyle } from "../components/uiStyles";

interface SearchResultPreviewScreenProps {
  model: PreviewPaneModel;
  actions: PreviewPaneActions;
}

export default function SearchResultPreviewScreen({
  model,
  actions,
}: SearchResultPreviewScreenProps) {
  const { theme, preview, setup } = model;
  if (!preview.foundCharacter || !preview.previewCardReady || setup.setupFlowStarted) return null;

  return (
    <aside
      className={`character-search-panel preview-card ${preview.isConfirmFadeOut || setup.isBackTransitioning || preview.isModeTransitioning ? "confirm-fade" : ""} ${setup.isBackTransitioning || preview.isModeTransitioning ? "back-fade" : ""}`}
      style={panelCardStyle(theme, "1rem")}
    >
      <div
        className={`preview-content ${preview.isConfirmFadeOut || setup.isBackTransitioning || preview.isModeTransitioning ? "preview-confirm-fade" : ""} ${setup.isBackTransitioning || preview.isModeTransitioning ? "back-fade-content" : ""}`}
        style={{
          opacity: preview.previewContentReady ? 1 : 0,
          transform: preview.previewContentReady ? "translateY(0)" : "translateY(6px)",
        }}
      >
        <div
          key={`${preview.foundCharacter.characterName}:${preview.foundCharacter.fetchedAt}`}
          className="preview-char-swap"
          style={{ display: "flex", gap: "0.65rem", alignItems: "center", marginBottom: "0.6rem" }}
        >
          <div
            className={!preview.previewImageLoaded ? "image-skeleton-wrap" : undefined}
            style={{ width: "72px", height: "72px", borderRadius: "12px" }}
          >
            <CharacterAvatar
              src={preview.foundCharacter.characterImgURL}
              alt={`${preview.foundCharacter.characterName} avatar`}
              width={72}
              height={72}
              onReady={() => actions.setPreviewImageLoaded(true)}
              className={`image-fade-in ${preview.previewImageLoaded ? "image-loaded" : ""}`}
              style={{ borderRadius: "12px", display: "block", objectFit: "cover" }}
            />
          </div>
          <div>
            <p style={{ fontSize: "1rem", fontWeight: 800, lineHeight: 1.1, margin: 0, marginBottom: "0.16rem" }}>
              {preview.foundCharacter.characterName}
            </p>
            <p style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
              {WORLD_NAMES[preview.foundCharacter.worldID] ?? `ID ${preview.foundCharacter.worldID}`}
            </p>
            <p style={{ fontSize: "0.82rem", color: theme.muted, fontWeight: 700, lineHeight: 1.2, margin: 0, marginTop: "0.08rem" }}>
              Level {preview.foundCharacter.level} · {resolveDisplayJobName(preview.foundCharacter.jobName)}
            </p>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: "0.65rem" }}>
          <p style={{ fontSize: "0.86rem", color: theme.text, fontWeight: 700, margin: 0, marginBottom: "0.72rem" }}>
            {CHARACTERS_COPY.searchResultPreview.confirmPrompt}
          </p>
          <button
            type="button"
            disabled={setup.isUiLocked}
            onClick={actions.confirmFoundCharacter}
            style={{ ...primaryButtonStyle(theme, "0.7rem 0.9rem"), width: "100%" }}
          >
            {CHARACTERS_COPY.searchResultPreview.confirmButton}
          </button>
        </div>
      </div>
    </aside>
  );
}

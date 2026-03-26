import type { NormalizedCharacterData } from "../model/types";

interface DeriveCharactersLayoutArgs {
  foundCharacter: NormalizedCharacterData | null;
  setupFlowStarted: boolean;
  showCharacterDirectory: boolean;
  showSetupPane: boolean;
  isDirectoryTransitioning: boolean;
  suppressLayoutTransition: boolean;
}

export interface CharactersLayoutModel {
  hasPreview: boolean;
  setupActive: boolean;
  directoryView: boolean;
  showSearchPane: boolean;
  contentClassName: string;
}

export function deriveCharactersLayout({
  foundCharacter,
  setupFlowStarted,
  showCharacterDirectory,
  showSetupPane,
  isDirectoryTransitioning,
  suppressLayoutTransition,
}: DeriveCharactersLayoutArgs): CharactersLayoutModel {
  const hasPreview = Boolean(foundCharacter) && !setupFlowStarted;
  const setupActive = setupFlowStarted && showSetupPane;
  const directoryView = showCharacterDirectory && !isDirectoryTransitioning;
  const showSearchPane = !showCharacterDirectory || isDirectoryTransitioning;

  return {
    hasPreview,
    setupActive,
    directoryView,
    showSearchPane,
    contentClassName: [
      "characters-content",
      suppressLayoutTransition ? "suppress-layout" : "",
      hasPreview ? "has-preview" : "",
      setupActive ? "setup-active" : "",
      directoryView ? "directory-view" : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

"use client";

/*
  Characters feature orchestrator.
  Owns tab selection and composes each tab content module.
*/
import type { AppTheme } from "../../components/themes";
import CharacterSetupFlow from "./tabs/CharacterSetupFlow";

interface CharactersWorkspaceProps {
  theme: AppTheme;
  initialCharacterName?: string;
  initialAction?: string;
}

export default function CharactersWorkspace({ theme, initialCharacterName, initialAction }: CharactersWorkspaceProps) {
  return (
    <section
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CharacterSetupFlow theme={theme} initialCharacterName={initialCharacterName} initialAction={initialAction} />
    </section>
  );
}

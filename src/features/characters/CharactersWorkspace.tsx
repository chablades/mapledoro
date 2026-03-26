"use client";

/*
  Characters feature orchestrator.
  Owns tab selection and composes each tab content module.
*/
import type { AppTheme } from "../../components/themes";
import CharacterSetupFlow from "./tabs/CharacterSetupFlow";

interface CharactersWorkspaceProps {
  theme: AppTheme;
}

export default function CharactersWorkspace({ theme }: CharactersWorkspaceProps) {
  return (
    <section
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CharacterSetupFlow theme={theme} />
    </section>
  );
}

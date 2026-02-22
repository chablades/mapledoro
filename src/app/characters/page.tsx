"use client";

/*
  Characters route shell.
*/
import AppShell from "../../components/AppShell";
import CharactersWorkspace from "../../features/characters/CharactersWorkspace";

export default function CharactersPage() {
  return (
    <AppShell currentPath="/characters">
      {({ theme }) => (
        <CharactersWorkspace theme={theme} />
      )}
    </AppShell>
  );
}

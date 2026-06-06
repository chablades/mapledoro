"use client";

/*
  Characters route shell.
*/
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "../../components/AppShell";
import CharactersWorkspace from "../../features/characters/CharactersWorkspace";

function CharactersContent() {
  const params = useSearchParams();
  const initialCharacterName = params.get("character") ?? undefined;
  const initialAction = params.get("action") ?? undefined;
  return (
    <AppShell currentPath="/characters">
      {({ theme }) => (
        <CharactersWorkspace
          theme={theme}
          initialCharacterName={initialCharacterName}
          initialAction={initialAction}
        />
      )}
    </AppShell>
  );
}

export default function CharactersPage() {
  return (
    <Suspense fallback={null}>
      <CharactersContent />
    </Suspense>
  );
}

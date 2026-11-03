"use client";

/*
  View a Character: opens a card or export read-only, outside the directory. Card QR codes land
  here through /i.
*/
import AppShell from "../../../components/AppShell";
import CharacterViewerWorkspace from "../../../features/characters/viewer/CharacterViewerWorkspace";

export default function CharacterViewPage() {
  return (
    <AppShell currentPath="/characters">
      {({ theme }) => (
        <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <CharacterViewerWorkspace theme={theme} />
        </section>
      )}
    </AppShell>
  );
}

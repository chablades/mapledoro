"use client";

/*
  Characters hub: Your Characters (the directory), View a Character, and Party Scouter.
  The directory itself lives at /characters/directory.
*/
import AppShell from "../../components/AppShell";
import CharactersHub from "../../features/characters/hub/CharactersHub";

export default function CharactersHubPage() {
  return (
    <AppShell currentPath="/characters">
      {({ theme }) => <CharactersHub theme={theme} />}
    </AppShell>
  );
}

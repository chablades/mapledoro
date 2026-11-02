"use client";

/*
  Party Scouter: put a party together and see which bosses it can clear together.
*/
import AppShell from "../../../components/AppShell";
import PartyScouterWorkspace from "../../../features/characters/party/PartyScouterWorkspace";

export default function PartyScouterPage() {
  return (
    <AppShell currentPath="/characters">
      {({ theme }) => (
        <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <PartyScouterWorkspace theme={theme} />
        </section>
      )}
    </AppShell>
  );
}

"use client";

import AppShell from "../../../components/AppShell";
import MapGuesserWorkspace from "../../../features/games/map-guesser/MapGuesserWorkspace";

export default function MapGuesserPage() {
  return (
    <AppShell currentPath="/games">
      {({ theme }) => <MapGuesserWorkspace theme={theme} />}
    </AppShell>
  );
}

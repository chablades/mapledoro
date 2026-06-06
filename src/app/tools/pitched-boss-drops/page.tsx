"use client";

/*
  Drop Tracker route shell. Route/folder stay `pitched-boss-drops` to preserve
  existing bookmarks and the `pitchedBossDrops` localStorage key.
*/
import AppShell from "../../../components/AppShell";
import PitchedBossDropsWorkspace from "../../../features/tools/pitched-boss-drops/PitchedBossDropsWorkspace";

export default function PitchedBossDropsPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <PitchedBossDropsWorkspace theme={theme} />}
    </AppShell>
  );
}

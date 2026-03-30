"use client";

/*
  Pitched Boss Drop Tracker route shell.
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

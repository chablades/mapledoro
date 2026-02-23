"use client";

/*
  Boss Crystal Calculator route shell.
*/
import AppShell from "../../../components/AppShell";
import BossCrystalsWorkspace from "../../../features/tools/boss-crystals/BossCrystalsWorkspace";

export default function BossCrystalsPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <BossCrystalsWorkspace theme={theme} />}
    </AppShell>
  );
}

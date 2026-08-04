"use client";

import AppShell from "../../../components/AppShell";
import BgmGuesserWorkspace from "../../../features/games/bgm-guesser/BgmGuesserWorkspace";

export default function BgmGuesserPage() {
  return (
    <AppShell currentPath="/games">
      {({ theme }) => <BgmGuesserWorkspace theme={theme} />}
    </AppShell>
  );
}

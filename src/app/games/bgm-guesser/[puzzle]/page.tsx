"use client";

import { use } from "react";
import AppShell from "../../../../components/AppShell";
import BgmGuesserWorkspace from "../../../../features/games/bgm-guesser/BgmGuesserWorkspace";

export default function BgmGuesserArchivePage({
  params,
}: {
  params: Promise<{ puzzle: string }>;
}) {
  const { puzzle } = use(params);
  return (
    <AppShell currentPath="/games">
      {({ theme }) => <BgmGuesserWorkspace theme={theme} urlPuzzle={puzzle} />}
    </AppShell>
  );
}

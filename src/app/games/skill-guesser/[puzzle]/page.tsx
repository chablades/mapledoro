"use client";

import { use } from "react";
import AppShell from "../../../../components/AppShell";
import SkillGuesserWorkspace from "../../../../features/games/skill-guesser/SkillGuesserWorkspace";

export default function SkillGuesserArchivePage({
  params,
}: {
  params: Promise<{ puzzle: string }>;
}) {
  const { puzzle } = use(params);
  return (
    <AppShell currentPath="/games">
      {({ theme }) => <SkillGuesserWorkspace theme={theme} urlPuzzle={puzzle} />}
    </AppShell>
  );
}

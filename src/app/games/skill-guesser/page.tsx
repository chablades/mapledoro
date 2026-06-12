"use client";

import AppShell from "../../../components/AppShell";
import SkillGuesserWorkspace from "../../../features/games/skill-guesser/SkillGuesserWorkspace";

export default function SkillGuesserPage() {
  return (
    <AppShell currentPath="/games">
      {({ theme }) => <SkillGuesserWorkspace theme={theme} />}
    </AppShell>
  );
}

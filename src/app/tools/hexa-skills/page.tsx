"use client";

/*
  HEXA Skill Tracker route shell.
*/
import AppShell from "../../../components/AppShell";
import HexaSkillsWorkspace from "../../../features/tools/hexa-skills/HexaSkillsWorkspace";

export default function HexaSkillsPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <HexaSkillsWorkspace theme={theme} />}
    </AppShell>
  );
}

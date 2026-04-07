"use client";

/*
  Star Force Calculator route shell.
*/
import AppShell from "../../../components/AppShell";
import StarForceWorkspace from "../../../features/tools/star-force/StarForceWorkspace";

export default function StarForcePage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <StarForceWorkspace theme={theme} />}
    </AppShell>
  );
}

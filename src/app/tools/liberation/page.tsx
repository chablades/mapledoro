"use client";

/*
  Liberation Calculator route shell.
*/
import AppShell from "../../../components/AppShell";
import LiberationWorkspace from "../../../features/tools/liberation/LiberationWorkspace";

export default function LiberationPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <LiberationWorkspace theme={theme} />}
    </AppShell>
  );
}

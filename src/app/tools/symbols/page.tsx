"use client";

/*
  Symbol Calculator route shell.
*/
import AppShell from "../../../components/AppShell";
import SymbolWorkspace from "../../../features/tools/symbols/SymbolWorkspace";

export default function SymbolsPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <SymbolWorkspace theme={theme} />}
    </AppShell>
  );
}

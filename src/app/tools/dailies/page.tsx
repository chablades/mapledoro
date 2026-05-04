"use client";

import AppShell from "../../../components/AppShell";
import DailiesWorkspace from "../../../features/tools/dailies/DailiesWorkspace";

export default function DailiesPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <DailiesWorkspace theme={theme} />}
    </AppShell>
  );
}

"use client";

import AppShell from "../../../components/AppShell";
import CubingWorkspace from "../../../features/tools/cubing/CubingWorkspace";

export default function CubingPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <CubingWorkspace theme={theme} />}
    </AppShell>
  );
}

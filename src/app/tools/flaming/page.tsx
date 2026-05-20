"use client";

import AppShell from "../../../components/AppShell";
import FlamingWorkspace from "../../../features/tools/flaming/FlamingWorkspace";

export default function FlamingPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <FlamingWorkspace theme={theme} />}
    </AppShell>
  );
}

"use client";

import AppShell from "../../../components/AppShell";
import TraceRestorationWorkspace from "../../../features/tools/trace-restoration/TraceRestorationWorkspace";

export default function TraceRestorationPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <TraceRestorationWorkspace theme={theme} />}
    </AppShell>
  );
}

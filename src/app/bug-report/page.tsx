"use client";

import AppShell from "../../components/AppShell";
import BugReportWorkspace from "../../features/bug-report/BugReportWorkspace";

export default function BugReportPage() {
  return (
    <AppShell currentPath="/bug-report">
      {({ theme }) => <BugReportWorkspace theme={theme} />}
    </AppShell>
  );
}

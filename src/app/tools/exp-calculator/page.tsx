"use client";

import AppShell from "../../../components/AppShell";
import ExpCalculatorWorkspace from "../../../features/tools/exp-calculator/ExpCalculatorWorkspace";

export default function ExpCalculatorPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <ExpCalculatorWorkspace theme={theme} />}
    </AppShell>
  );
}

"use client";

import AppShell from "../../../components/AppShell";
import MysticFrontierWorkspace from "../../../features/tools/mystic-frontier/MysticFrontierWorkspace";

export default function MysticFrontierPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <MysticFrontierWorkspace theme={theme} />}
    </AppShell>
  );
}

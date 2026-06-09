"use client";

import AppShell from "../components/AppShell";
import HomeDashboard from "../features/home/HomeDashboard";

export default function MapleDoro() {
  return (
    <AppShell currentPath="/">
      {({ theme }) => <HomeDashboard theme={theme} />}
    </AppShell>
  );
}

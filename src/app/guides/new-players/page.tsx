"use client";

import AppShell from "../../../components/AppShell";
import NewPlayerGuide from "./NewPlayerGuide";

export default function NewPlayersGuidePage() {
  return (
    <AppShell currentPath="/guides">{({ theme }) => <NewPlayerGuide theme={theme} />}</AppShell>
  );
}

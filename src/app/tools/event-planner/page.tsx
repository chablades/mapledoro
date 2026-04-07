"use client";

import AppShell from "../../../components/AppShell";
import EventPlannerWorkspace from "../../../features/tools/event-planner/EventPlannerWorkspace";

export default function EventPlannerPage() {
  return (
    <AppShell currentPath="/tools">
      {({ theme }) => <EventPlannerWorkspace theme={theme} />}
    </AppShell>
  );
}

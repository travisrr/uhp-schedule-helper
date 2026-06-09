"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ScheduleMetricsRibbon } from "@/components/schedule/schedule-metrics-ribbon";
import { ScheduleWeekView } from "@/components/schedule/schedule-week-view";

export default function SchedulePage() {
  return (
    <AppShell
      title="Schedule Output"
      description="Weekly roster with AM/PM shift blocks, role groupings, and labor analytics."
    >
      <div className="space-y-6">
        <ScheduleMetricsRibbon />
        <ScheduleWeekView />
      </div>
    </AppShell>
  );
}

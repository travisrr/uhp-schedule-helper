"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ScheduleMetricsRibbon } from "@/components/schedule/schedule-metrics-ribbon";
import { ScheduleWeekSelector } from "@/components/schedule/schedule-week-selector";
import { ScheduleWeekView } from "@/components/schedule/schedule-week-view";

export default function SchedulePage() {
  return (
    <AppShell
      title="Shift Report"
      description="Weekly roster with AM/PM shift blocks and role groupings, matching the Excel export layout."
    >
      <div className="space-y-6">
        <ScheduleWeekSelector />
        <ScheduleMetricsRibbon />
        <ScheduleWeekView />
      </div>
    </AppShell>
  );
}

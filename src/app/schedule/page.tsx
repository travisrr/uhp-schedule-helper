"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ScheduleWeekSelector } from "@/components/schedule/schedule-week-selector";
import { ScheduleWeekView } from "@/components/schedule/schedule-week-view";

export default function SchedulePage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="no-print">
          <ScheduleWeekSelector />
        </div>
        <ScheduleWeekView />
      </div>
    </AppShell>
  );
}

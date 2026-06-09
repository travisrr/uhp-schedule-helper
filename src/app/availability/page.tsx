"use client";

import { AppShell } from "@/components/layout/app-shell";
import { AvailabilityMatrix } from "@/components/availability/availability-matrix";
import { StaffingGuideSection } from "@/components/availability/staffing-guide";

export default function AvailabilityPage() {
  return (
    <AppShell
      title="Employee Availability"
      description="Roster matrix and staffing guide aligned to your source availability spreadsheet."
    >
      <div className="space-y-8">
        <AvailabilityMatrix />
        <StaffingGuideSection />
      </div>
    </AppShell>
  );
}

"use client";

import { AppShell } from "@/components/layout/app-shell";
import { AvailabilityMatrix } from "@/components/availability/availability-matrix";

export default function AvailabilityPage() {
  return (
    <AppShell
      title="Employee Availability"
      description="Staffing availability grid grouped by role, matching your source spreadsheet."
    >
      <AvailabilityMatrix />
    </AppShell>
  );
}

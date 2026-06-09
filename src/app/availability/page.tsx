"use client";

import { AppShell } from "@/components/layout/app-shell";
import { AvailabilityMatrix } from "@/components/availability/availability-matrix";

export default function AvailabilityPage() {
  return (
    <AppShell
      title="Employee Availability"
      description="Roster matrix aligned to your source availability spreadsheet."
    >
      <AvailabilityMatrix />
    </AppShell>
  );
}

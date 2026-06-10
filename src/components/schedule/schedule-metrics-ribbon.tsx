"use client";

import type { ComponentType, ReactNode } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { useAppData } from "@/context/data-context";
import { computeScheduleRibbonMetrics } from "@/lib/schedule-ribbon-metrics";
import { cn } from "@/lib/utils";

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  icon: ComponentType<{ className?: string }>;
  accent?: "emerald" | "blue";
}) {
  return (
    <div className="flex min-w-[180px] flex-1 items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900",
          accent === "emerald" && "text-emerald-400",
          accent === "blue" && "text-blue-400",
          !accent && "text-zinc-400",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <div className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {value}
        </div>
      </div>
    </div>
  );
}

function BlankMetricCard() {
  return (
    <div
      aria-hidden
      className="min-w-[180px] flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
    />
  );
}

function formatHours(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} hrs`;
}

function ShiftsValue({
  assigned,
  available,
}: {
  assigned: number | null;
  available: number | null;
}) {
  if (assigned === null || available === null) {
    return "—";
  }

  return (
    <div className="flex items-end gap-5">
      <div>
        <p className="text-lg font-semibold leading-none">{available}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Available
        </p>
      </div>
      <div>
        <p className="text-lg font-semibold leading-none">{assigned}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Assigned
        </p>
      </div>
    </div>
  );
}

export function ScheduleMetricsRibbon() {
  const { schedule } = useAppData();
  const metrics = schedule ? computeScheduleRibbonMetrics(schedule) : null;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Total # Shifts"
        value={
          <ShiftsValue
            assigned={metrics?.assignedShifts ?? null}
            available={metrics?.totalShiftSlots ?? null}
          />
        }
        icon={CalendarDays}
        accent="blue"
      />
      <MetricCard
        label="Total # of Hours"
        value={formatHours(metrics?.totalHours ?? null)}
        icon={Clock}
        accent="emerald"
      />
      <BlankMetricCard />
      <BlankMetricCard />
    </div>
  );
}

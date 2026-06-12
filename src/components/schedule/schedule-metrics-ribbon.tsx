"use client";

import { CalendarDays } from "lucide-react";
import { useAppData } from "@/context/data-context";
import { computeScheduleRibbonMetrics } from "@/lib/schedule-ribbon-metrics";
import { cn } from "@/lib/utils";

export function ScheduleMetricsCards({ className }: { className?: string }) {
  const { schedule } = useAppData();
  const metrics = schedule ? computeScheduleRibbonMetrics(schedule) : null;
  const assigned = metrics?.assignedShifts ?? null;
  const available = metrics?.totalShiftSlots ?? null;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
    >
      <CalendarDays className="size-3.5 shrink-0 text-blue-400" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Shifts
        </p>
        {assigned === null || available === null ? (
          <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            —
          </p>
        ) : (
          <p className="text-sm font-semibold tabular-nums leading-tight text-zinc-900 dark:text-zinc-100">
            <span className="text-zinc-500">{available}</span>
            <span className="mx-0.5 font-normal text-zinc-400">·</span>
            <span>{assigned}</span>
            <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              avail · asgn
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

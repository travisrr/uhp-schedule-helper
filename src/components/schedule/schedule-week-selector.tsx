"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/context/data-context";
import { mergeSchedulePreservingLockedDays } from "@/lib/schedule-day-lock";
import { generateScheduleFromAvailability } from "@/lib/scheduler/generate-schedule";
import {
  addDays,
  formatWeekRange,
  getDefaultWeekStart,
  getWeekStartWednesday,
  parseISODateString,
  toISODateString,
} from "@/lib/week-utils";
import { ApplyShiftHoursControls } from "@/components/schedule/apply-shift-hours-controls";
import { ScheduleMetricsCards } from "@/components/schedule/schedule-metrics-ribbon";
import { cn } from "@/lib/utils";

export function ScheduleWeekSelector() {
  const {
    availability,
    schedule,
    priorSchedule,
    selectedWeekStart,
    shiftHours,
    setSelectedWeekStart,
    setSchedule,
  } = useAppData();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const weekStart = useMemo(() => {
    if (selectedWeekStart) {
      return parseISODateString(selectedWeekStart);
    }
    if (schedule?.weekStartDate) {
      return parseISODateString(schedule.weekStartDate);
    }
    return getDefaultWeekStart();
  }, [selectedWeekStart, schedule?.weekStartDate]);

  const weekRangeLabel = formatWeekRange(weekStart);
  const employeeCount = availability?.employees.length ?? 0;
  const canGenerate = employeeCount > 0 && priorSchedule != null;

  function syncWeekStart(nextWeekStart: Date) {
    setSelectedWeekStart(toISODateString(nextWeekStart));
    setStatusMessage(null);
  }

  function handlePreviousWeek() {
    syncWeekStart(addDays(weekStart, -7));
  }

  function handleNextWeek() {
    syncWeekStart(addDays(weekStart, 7));
  }

  function handleDateChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    if (!value) return;
    syncWeekStart(getWeekStartWednesday(parseISODateString(value)));
  }

  function handleGenerateSchedule() {
    if (!availability || availability.employees.length === 0) {
      setStatusMessage("Upload an availability sheet in Settings before generating a schedule.");
      return;
    }

    if (!priorSchedule) {
      setStatusMessage(
        "No prior schedule baseline loaded — import one on the Prior Schedule page first, then generate again.",
      );
      return;
    }

    const result = generateScheduleFromAvailability(
      availability,
      weekStart,
      priorSchedule.schedule,
      shiftHours,
    );
    setSchedule(mergeSchedulePreservingLockedDays(schedule, result.schedule));
    setSelectedWeekStart(toISODateString(weekStart));

    const skipped = result.priorShiftCount - result.assignedShiftCount;
    setStatusMessage(
      `Built ${result.assignedShiftCount} shifts for ${weekRangeLabel} from prior baseline (${result.priorShiftCount} template slots${skipped > 0 ? `; ${skipped} skipped as unavailable` : ""}).`,
    );
  }

  const statusLabel = canGenerate
    ? `${employeeCount} employees`
    : employeeCount > 0
      ? `${employeeCount} employees · need baseline`
      : "No availability data";

  const baselineLabel = priorSchedule
    ? `Baseline: ${priorSchedule.fileName}`
    : "No prior baseline";

  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <CalendarDays className="size-4 text-emerald-500" />
          Schedule Week
        </div>

        <div
          className="min-w-0 max-w-[180px] sm:max-w-[220px] lg:max-w-[280px]"
          title={`${statusLabel}. ${baselineLabel}`}
        >
          <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
            {statusLabel}
          </p>
          <p
            className={cn(
              "truncate text-[11px]",
              priorSchedule
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-zinc-500",
            )}
          >
            {baselineLabel}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-800 dark:bg-zinc-900"
            title="Wednesday – Tuesday"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handlePreviousWeek}
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <p className="min-w-[130px] px-1 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {weekRangeLabel}
            </p>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <input
            type="date"
            value={toISODateString(weekStart)}
            onChange={handleDateChange}
            aria-label="Jump to date"
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />

          <ScheduleMetricsCards />

          <Button
            type="button"
            onClick={handleGenerateSchedule}
            disabled={!canGenerate}
            size="sm"
            className="shrink-0"
          >
            <Sparkles className="size-4" />
            Generate Schedule
          </Button>
        </div>
      </div>

      {statusMessage ? (
        <p
          className={cn(
            "mt-2 border-t border-zinc-200 pt-2 text-xs dark:border-zinc-800",
            canGenerate
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-400",
          )}
        >
          {statusMessage}
        </p>
      ) : null}

      {schedule ? (
        <div className="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
          <ApplyShiftHoursControls />
        </div>
      ) : null}
    </div>
  );
}

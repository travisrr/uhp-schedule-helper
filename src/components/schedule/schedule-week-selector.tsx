"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/context/data-context";
import { generateScheduleFromAvailability } from "@/lib/scheduler/generate-schedule";
import {
  addDays,
  formatWeekRange,
  getDefaultWeekStart,
  getWeekStartWednesday,
  parseISODateString,
  toISODateString,
} from "@/lib/week-utils";
import { cn } from "@/lib/utils";

export function ScheduleWeekSelector() {
  const { availability, schedule, selectedWeekStart, setSelectedWeekStart, setSchedule } =
    useAppData();
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
  const canGenerate = employeeCount > 0;

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

    const generated = generateScheduleFromAvailability(availability, weekStart);
    setSchedule(generated);
    setSelectedWeekStart(toISODateString(weekStart));
    setStatusMessage(
      `Built schedule for ${availability.employees.length} employees across ${weekRangeLabel}.`,
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            <CalendarDays className="size-4 text-emerald-500" />
            Schedule Week
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Pick the Wed–Tue period, then generate shift assignments from staff availability.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePreviousWeek}
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="min-w-[180px] px-2 text-center">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {weekRangeLabel}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">
                Wednesday – Tuesday
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNextWeek}
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="whitespace-nowrap">Jump to date</span>
            <input
              type="date"
              value={toISODateString(weekStart)}
              onChange={handleDateChange}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {canGenerate
            ? `${employeeCount} employees loaded from availability.`
            : "No availability data yet. Upload a sheet in Settings to enable scheduling."}
        </p>

        <Button
          type="button"
          onClick={handleGenerateSchedule}
          disabled={!canGenerate}
          className="shrink-0"
        >
          <Sparkles className="size-4" />
          Generate Schedule
        </Button>
      </div>

      {statusMessage ? (
        <p
          className={cn(
            "mt-3 text-sm",
            canGenerate
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-400",
          )}
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}

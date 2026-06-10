"use client";

import { useMemo, useState } from "react";
import { History, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  ErrorMessage,
  FileDropzone,
  StatusMessage,
} from "@/components/data-ingestion/file-dropzone";
import { ScheduleWeekView } from "@/components/schedule/schedule-week-view";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/context/data-context";
import { parseScheduleSheet } from "@/lib/parsers/schedule-parser";
import {
  formatWeekRange,
  parseISODateString,
} from "@/lib/week-utils";

function countActiveDays(schedule: { days: { mealPeriods: { roles: { shifts: unknown[] }[] }[] }[] }) {
  return schedule.days.filter((day) =>
    day.mealPeriods.some((period) =>
      period.roles.some((role) => role.shifts.length > 0),
    ),
  ).length;
}

function countAssignedShifts(schedule: { days: { mealPeriods: { roles: { shifts: unknown[] }[] }[] }[] }) {
  return schedule.days.reduce(
    (total, day) =>
      total +
      day.mealPeriods.reduce(
        (periodTotal, period) =>
          periodTotal +
          period.roles.reduce(
            (roleTotal, role) => roleTotal + role.shifts.length,
            0,
          ),
        0,
      ),
    0,
  );
}

export function PriorSchedulePageContent() {
  const { priorSchedule, setPriorSchedule, clearPriorSchedule, clearSchedule } =
    useAppData();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const weekLabel = useMemo(() => {
    if (!priorSchedule?.schedule.weekStartDate) return null;
    return formatWeekRange(parseISODateString(priorSchedule.schedule.weekStartDate));
  }, [priorSchedule?.schedule.weekStartDate]);

  return (
    <AppShell
      title="Prior Schedule"
      description="Import a past shift report to use as the starting template when generating future schedules."
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <StatusMessage message={success} onDismiss={() => setSuccess(null)} />
        <ErrorMessage message={error} onDismiss={() => setError(null)} />

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-emerald-500 dark:border-zinc-800 dark:bg-zinc-900">
              <History className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                How the baseline works
              </p>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                When you generate a new schedule on the Shift Report page, the app
                copies each day&apos;s role groupings and shift slots from this
                baseline. Staff who are unavailable are skipped; everyone else keeps
                their prior role and shift times for that day.
              </p>
            </div>
          </div>
        </div>

        <FileDropzone
          label="Import Prior Schedule"
          description="Upload a completed weekly shift report (.csv, .xlsx, .xls). This becomes the template for future schedule generation."
          parse={parseScheduleSheet}
          lastUploaded={priorSchedule?.fileName ?? null}
          onSuccess={(fileName, data) => {
            setPriorSchedule({
              schedule: data,
              fileName,
              importedAt: new Date().toISOString(),
            });
            clearSchedule();
            setSuccess(
              `Prior schedule loaded: ${countActiveDays(data)} active days, ${countAssignedShifts(data)} shift assignments. Re-generate on Shift Report to apply.`,
            );
            setError(null);
          }}
          onError={(message) => {
            setError(message);
            setSuccess(null);
          }}
        />

        {priorSchedule ? (
          <>
            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Active baseline
                </p>
                <p className="text-xs text-zinc-500">
                  File: {priorSchedule.fileName}
                  {weekLabel ? ` · Week: ${weekLabel}` : null}
                  {" · "}
                  {countAssignedShifts(priorSchedule.schedule)} shifts across{" "}
                  {countActiveDays(priorSchedule.schedule)} days
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearPriorSchedule();
                  setSuccess("Prior schedule baseline cleared.");
                  setError(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear baseline
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Baseline preview
              </p>
              <ScheduleWeekView
                schedule={priorSchedule.schedule}
                title="Prior Schedule Baseline"
                emptyMessage="No prior schedule loaded."
                editable={false}
                showWeeklyStats={false}
              />
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

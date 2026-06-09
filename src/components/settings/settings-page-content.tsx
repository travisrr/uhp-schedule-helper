"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  ErrorMessage,
  FileDropzone,
  StatusMessage,
} from "@/components/data-ingestion/file-dropzone";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/context/data-context";
import { readFileAsNamedSheets } from "@/lib/file-ingest";
import { parseAvailabilityWorkbook } from "@/lib/parsers/availability-parser";
import { parseScheduleSheet } from "@/lib/parsers/schedule-parser";

export function SettingsPageContent() {
  const {
    setAvailability,
    setSchedule,
    clearAll,
    availability,
    schedule,
  } = useAppData();

  const [availabilityFile, setAvailabilityFile] = useState<string | null>(null);
  const [scheduleFile, setScheduleFile] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <AppShell
      title="Data Ingestion"
      description="Upload availability rosters and weekly schedule reports to populate both operational dashboards."
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <StatusMessage message={success} onDismiss={() => setSuccess(null)} />
        <ErrorMessage message={error} onDismiss={() => setError(null)} />

        <div className="grid gap-6 lg:grid-cols-2">
          <FileDropzone
            label="Availability Ingestion"
            description="Employee, Role, Wed–Tue availability, and shift counts from every Excel tab. Staffing Guide rows are ignored."
            readAndParse={async (file) => {
              const sheets = await readFileAsNamedSheets(file);
              return parseAvailabilityWorkbook(sheets);
            }}
            lastUploaded={availabilityFile}
            onSuccess={(fileName, data) => {
              setAvailability(data);
              setAvailabilityFile(fileName);
              setSuccess(
                `Availability loaded: ${data.employees.length} employees from all workbook tabs.`,
              );
              setError(null);
            }}
            onError={(message) => {
              setError(message);
              setSuccess(null);
            }}
          />

          <FileDropzone
            label="Schedule Ingestion"
            description="Weekly shift report with AM/PM blocks, role assignments, times, and labor totals."
            parse={parseScheduleSheet}
            lastUploaded={scheduleFile}
            onSuccess={(fileName, data) => {
              setSchedule(data);
              setScheduleFile(fileName);
              setSuccess(
                `Schedule loaded: ${data.days.filter((day) => day.mealPeriods.some((period) => period.roles.some((role) => role.shifts.length > 0))).length} active days parsed.`,
              );
              setError(null);
            }}
            onError={(message) => {
              setError(message);
              setSuccess(null);
            }}
          />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Current dataset</p>
            <p className="text-xs text-zinc-500">
              Availability:{" "}
              {availability
                ? `${availability.employees.length} employees`
                : "Not loaded"}
              {" · "}
              Schedule:{" "}
              {schedule
                ? `${schedule.days.length} day blocks`
                : "Not loaded"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearAll();
              setAvailabilityFile(null);
              setScheduleFile(null);
              setSuccess("All imported data cleared.");
              setError(null);
            }}
          >
            Clear all data
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

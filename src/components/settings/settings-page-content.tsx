"use client";

import { useState } from "react";
import { AvailabilityUploadReview } from "@/components/availability/availability-upload-review";
import { AppShell } from "@/components/layout/app-shell";
import {
  ErrorMessage,
  FileDropzone,
  StatusMessage,
} from "@/components/data-ingestion/file-dropzone";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/context/data-context";
import {
  applySelectiveAvailabilityUpload,
  computeAvailabilityDiff,
} from "@/lib/availability-diff";
import { mergeAvailabilityPreservingLockedDays } from "@/lib/availability-day-lock";
import { readFileAsNamedSheets } from "@/lib/file-ingest";
import { parseAvailabilityWorkbook } from "@/lib/parsers/availability-parser";
import { parseScheduleSheet } from "@/lib/parsers/schedule-parser";
import { completeFileUpload } from "@/lib/storage-sync";
import type { AvailabilityData } from "@/lib/types";
import { DAYS } from "@/lib/utils";

export function SettingsPageContent() {
  const {
    applyPersistedState,
    clearAll,
    availability,
    schedule,
    manifest,
    priorSchedule,
    serverMetrics,
    selectedWeekStart,
    shiftHours,
  } = useAppData();

  const currentState = {
    availability,
    schedule,
    priorSchedule,
    serverMetrics,
    selectedWeekStart,
    shiftHours,
  };

  const [availabilityFile, setAvailabilityFile] = useState<string | null>(
    manifest.availabilityFile,
  );
  const [scheduleFile, setScheduleFile] = useState<string | null>(
    manifest.scheduleFile,
  );
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAvailabilityUpload, setPendingAvailabilityUpload] = useState<{
    file: File;
    fileName: string;
    data: AvailabilityData;
  } | null>(null);

  function reportAvailabilityUpload(fileName: string, data: AvailabilityData) {
    const protectedDays = DAYS.filter((day) => data.uploadProtectedDays?.[day]);
    setAvailabilityFile(fileName);
    setSuccess(
      protectedDays.length > 0
        ? `Availability loaded: ${data.employees.length} roster rows. Kept locked values for ${protectedDays.join(", ")}.`
        : `Availability loaded: ${data.employees.length} roster rows from all workbook tabs.`,
    );
    setError(null);
  }

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
            description="Employee, Role, Wed–Tue availability, and shift counts from every Excel tab. Each role tab is kept as a separate roster row. Admin, BOH kitchen, training, and other non-scheduling roles are excluded automatically. Staffing Guide rows are ignored."
            readAndParse={async (file) => {
              const sheets = await readFileAsNamedSheets(file);
              return parseAvailabilityWorkbook(sheets);
            }}
            lastUploaded={availabilityFile}
            onSuccess={(fileName, data, file) => {
              const diff = computeAvailabilityDiff(availability, data);
              if (diff.needsReview) {
                setPendingAvailabilityUpload({ file, fileName, data });
                setSuccess(null);
                setError(null);
                return;
              }

              const merged = mergeAvailabilityPreservingLockedDays(
                availability,
                data,
              );
              void completeFileUpload({
                kind: "availability",
                file,
                fileName,
                statePatch: { availability: merged },
                current: currentState,
                manifest,
                applyPersistedState,
              }).then(() => reportAvailabilityUpload(fileName, merged));
            }}
            onError={(message) => {
              setError(message);
              setSuccess(null);
            }}
          />

          <FileDropzone
            label="Schedule Ingestion"
            description="Loads a shift report directly into Shift Report (bypasses generation). For building a new week from availability, use Prior Schedule + Generate instead."
            parse={parseScheduleSheet}
            lastUploaded={scheduleFile}
            onSuccess={(fileName, data, file) => {
              void completeFileUpload({
                kind: "schedule",
                file,
                fileName,
                statePatch: { schedule: data },
                current: currentState,
                manifest,
                applyPersistedState,
              }).then(() => {
                setScheduleFile(fileName);
                setSuccess(
                  `Schedule loaded: ${data.days.filter((day) => day.mealPeriods.some((period) => period.roles.some((role) => role.shifts.length > 0))).length} active days parsed.`,
                );
                setError(null);
              });
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
                ? `${availability.employees.length} roster rows`
                : "Not loaded"}
              {" · "}
              Schedule:{" "}
              {schedule
                ? `${schedule.days.length} day blocks`
                : "Not loaded"}
              {" · "}
              Repo files:{" "}
              {[manifest.availabilityFile, manifest.scheduleFile, manifest.priorScheduleFile]
                .filter(Boolean)
                .join(", ") || "None"}
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

        {pendingAvailabilityUpload ? (
          <AvailabilityUploadReview
            open
            fileName={pendingAvailabilityUpload.fileName}
            diff={computeAvailabilityDiff(
              availability,
              pendingAvailabilityUpload.data,
            )}
            onApply={(acceptedKeys) => {
              const { file, fileName, data } = pendingAvailabilityUpload;
              const merged = mergeAvailabilityPreservingLockedDays(
                availability,
                applySelectiveAvailabilityUpload(
                  availability,
                  data,
                  acceptedKeys,
                ),
              );
              setPendingAvailabilityUpload(null);
              void completeFileUpload({
                kind: "availability",
                file,
                fileName,
                statePatch: { availability: merged },
                current: currentState,
                manifest,
                applyPersistedState,
              }).then(() => reportAvailabilityUpload(fileName, merged));
            }}
            onReject={() => {
              setPendingAvailabilityUpload(null);
              setSuccess("Upload discarded. Existing availability roster kept.");
              setError(null);
            }}
          />
        ) : null}
      </div>
    </AppShell>
  );
}

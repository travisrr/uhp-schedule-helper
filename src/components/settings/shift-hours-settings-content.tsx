"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/context/data-context";
import {
  createDefaultShiftHours,
  formatPeriodTimeRange,
  isValidPeriodHours,
  isValidShiftHours,
  type PeriodHours,
  type ShiftHoursSettings,
} from "@/lib/shift-hours";
import { applyShiftHoursToSchedule } from "@/lib/schedule-mutations";
import { isValidTimeToken } from "@/lib/time-format";
import { cn } from "@/lib/utils";

function PeriodHoursFields({
  idPrefix,
  label,
  value,
  onChange,
}: {
  idPrefix: string;
  label: string;
  value: PeriodHours;
  onChange: (next: PeriodHours) => void;
}) {
  const startValid = isValidTimeToken(value.start);
  const endValid = isValidTimeToken(value.end);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="size-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {label}
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          {isValidPeriodHours(value)
            ? formatPeriodTimeRange(value)
            : "Enter valid start and end times"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-start`}>Start time</Label>
          <input
            id={`${idPrefix}-start`}
            value={value.start}
            onChange={(event) =>
              onChange({ ...value, start: event.target.value })
            }
            placeholder="10:30 AM"
            className={timeInputClassName(startValid)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-end`}>End time</Label>
          <input
            id={`${idPrefix}-end`}
            value={value.end}
            onChange={(event) => onChange({ ...value, end: event.target.value })}
            placeholder="4:00 PM"
            className={timeInputClassName(endValid)}
          />
        </div>
      </div>
    </div>
  );
}

function timeInputClassName(valid: boolean): string {
  return cn(
    "h-9 w-full rounded-md border bg-white px-3 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100",
    valid
      ? "border-zinc-200 dark:border-zinc-800"
      : "border-red-400 dark:border-red-500",
  );
}

export function ShiftHoursSettingsContent() {
  const { schedule, shiftHours, setSchedule, setShiftHours } = useAppData();
  const [draft, setDraft] = useState<ShiftHoursSettings>(shiftHours);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(shiftHours);
  }, [shiftHours]);

  const canSave = isValidShiftHours(draft);
  const hasChanges =
    draft.am.start !== shiftHours.am.start ||
    draft.am.end !== shiftHours.am.end ||
    draft.pm.start !== shiftHours.pm.start ||
    draft.pm.end !== shiftHours.pm.end;

  function handleSave() {
    if (!canSave) return;
    setShiftHours(draft);
    setStatusMessage("Standard shift hours saved.");
  }

  function handleReset() {
    const defaults = createDefaultShiftHours();
    setDraft(defaults);
    setShiftHours(defaults);
    setStatusMessage("Reset to default shift hours.");
  }

  function handleApplyToSchedule() {
    if (!canSave) return;
    if (!schedule) {
      setStatusMessage("No schedule loaded. Generate or import a schedule first.");
      return;
    }

    setShiftHours(draft);
    setSchedule(applyShiftHoursToSchedule(schedule, draft));
    setStatusMessage("Shift hours saved and applied to the current schedule.");
  }

  return (
    <AppShell
      title="Shift Hours"
      description="Set the standard start and end times used when generating schedules and assigning employees to open shifts."
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="grid gap-4">
          <PeriodHoursFields
            idPrefix="am-shift"
            label="AM shift"
            value={draft.am}
            onChange={(am) => setDraft((prev) => ({ ...prev, am }))}
          />
          <PeriodHoursFields
            idPrefix="pm-shift"
            label="PM shift"
            value={draft.pm}
            onChange={(pm) => setDraft((prev) => ({ ...prev, pm }))}
          />
        </div>

        <p className="text-sm text-zinc-500">
          Use 12-hour times like 10:30 AM or 4:00 PM. Saved defaults apply when a
          shift has no time assigned yet. Use Apply to schedule to update standard
          times on assigned shifts. One-off times you set on individual employees
          are left unchanged.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={handleSave} disabled={!canSave || !hasChanges}>
            Save shift hours
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleApplyToSchedule}
            disabled={!canSave || !schedule}
          >
            Apply to schedule
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset to defaults
          </Button>
        </div>

        {statusMessage ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

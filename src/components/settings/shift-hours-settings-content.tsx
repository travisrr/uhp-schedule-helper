"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/context/data-context";
import { SlimToggle } from "@/components/ui/slim-toggle";
import {
  createDefaultShiftHours,
  DEFAULT_APPLY_SHIFT_HOURS_SCOPE,
  formatPeriodTimeRange,
  hasApplyShiftHoursScope,
  isValidPeriodHours,
  isValidShiftHours,
  shiftHoursEqual,
  type ApplyShiftHoursScope,
  type DayShiftHours,
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

function DayShiftHoursSection({
  dayLabel,
  idPrefix,
  value,
  onChange,
}: {
  dayLabel: string;
  idPrefix: string;
  value: DayShiftHours;
  onChange: (next: DayShiftHours) => void;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {dayLabel}
      </h2>
      <div className="grid gap-4">
        <PeriodHoursFields
          idPrefix={`${idPrefix}-am`}
          label="AM shift"
          value={value.am}
          onChange={(am) => onChange({ ...value, am })}
        />
        <PeriodHoursFields
          idPrefix={`${idPrefix}-pm`}
          label="PM shift"
          value={value.pm}
          onChange={(pm) => onChange({ ...value, pm })}
        />
      </div>
    </section>
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
  const [applyScope, setApplyScope] = useState<ApplyShiftHoursScope>(
    DEFAULT_APPLY_SHIFT_HOURS_SCOPE,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(shiftHours);
  }, [shiftHours]);

  const canSave = isValidShiftHours(draft);
  const hasChanges = !shiftHoursEqual(draft, shiftHours);

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

  const canApply =
    canSave && schedule != null && hasApplyShiftHoursScope(applyScope);

  function handleApplyToSchedule() {
    if (!canApply) return;

    setShiftHours(draft);
    setSchedule(applyShiftHoursToSchedule(schedule, draft, applyScope));
    const parts: string[] = [];
    if (applyScope.weekdayAm) parts.push("weekday AM");
    if (applyScope.weekdayPm) parts.push("weekday PM");
    if (applyScope.weekend) parts.push("weekend");
    setStatusMessage(
      `Shift hours saved and applied to ${parts.join(", ")} shifts on the current schedule.`,
    );
  }

  return (
    <AppShell
      title="Shift Hours"
      description="Set the standard start and end times used when generating schedules and assigning employees to open shifts."
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Weekdays
            </h2>
            <p className="text-sm text-zinc-500">
              Used for Wednesday through Friday and Monday through Tuesday.
            </p>
          </div>
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
        </section>

        <DayShiftHoursSection
          dayLabel="Saturday"
          idPrefix="sat-shift"
          value={draft.weekend.sat}
          onChange={(sat) =>
            setDraft((prev) => ({
              ...prev,
              weekend: { ...prev.weekend, sat },
            }))
          }
        />

        <DayShiftHoursSection
          dayLabel="Sunday"
          idPrefix="sun-shift"
          value={draft.weekend.sun}
          onChange={(sun) =>
            setDraft((prev) => ({
              ...prev,
              weekend: { ...prev.weekend, sun },
            }))
          }
        />

        <p className="text-sm text-zinc-500">
          Use 12-hour times like 10:30 AM or 4:00 PM. Saved defaults apply when a
          shift has no time assigned yet. Use Apply to schedule to update standard
          times on assigned shifts. One-off times you set on individual employees
          are left unchanged.
        </p>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Apply to schedule
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <SlimToggle
                label="Weekday AM"
                checked={applyScope.weekdayAm}
                onCheckedChange={(weekdayAm) =>
                  setApplyScope((prev) => ({ ...prev, weekdayAm }))
                }
                title="Apply weekday AM shift hours (Wed–Fri, Mon–Tue)"
              />
              <SlimToggle
                label="Weekday PM"
                checked={applyScope.weekdayPm}
                onCheckedChange={(weekdayPm) =>
                  setApplyScope((prev) => ({ ...prev, weekdayPm }))
                }
                title="Apply weekday PM shift hours (Wed–Fri, Mon–Tue)"
              />
              <SlimToggle
                label="Weekend"
                checked={applyScope.weekend}
                onCheckedChange={(weekend) =>
                  setApplyScope((prev) => ({ ...prev, weekend }))
                }
                title="Apply Saturday and Sunday AM and PM shift hours"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleSave} disabled={!canSave || !hasChanges}>
              Save shift hours
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleApplyToSchedule}
              disabled={!canApply}
            >
              Apply to schedule
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset to defaults
            </Button>
          </div>
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

"use client";

import { useState } from "react";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlimToggle } from "@/components/ui/slim-toggle";
import { useAppData } from "@/context/data-context";
import { applyShiftHoursToSchedule } from "@/lib/schedule-mutations";
import {
  DEFAULT_APPLY_SHIFT_HOURS_SCOPE,
  hasApplyShiftHoursScope,
  isValidShiftHours,
  type ApplyShiftHoursScope,
} from "@/lib/shift-hours";
import { cn } from "@/lib/utils";

interface ApplyShiftHoursControlsProps {
  className?: string;
}

export function ApplyShiftHoursControls({
  className,
}: ApplyShiftHoursControlsProps) {
  const { schedule, shiftHours, setSchedule } = useAppData();
  const [scope, setScope] = useState<ApplyShiftHoursScope>(
    DEFAULT_APPLY_SHIFT_HOURS_SCOPE,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canApply =
    schedule != null &&
    isValidShiftHours(shiftHours) &&
    hasApplyShiftHoursScope(scope);

  function updateScope<K extends keyof ApplyShiftHoursScope>(
    key: K,
    value: ApplyShiftHoursScope[K],
  ) {
    setScope((prev) => ({ ...prev, [key]: value }));
    setStatusMessage(null);
  }

  function handleApply() {
    if (!schedule || !canApply) return;

    setSchedule(applyShiftHoursToSchedule(schedule, shiftHours, scope));
    const parts: string[] = [];
    if (scope.weekdayAm) parts.push("weekday AM");
    if (scope.weekdayPm) parts.push("weekday PM");
    if (scope.weekend) parts.push("weekend");
    setStatusMessage(
      `Applied standard hours to ${parts.join(", ")} shifts on the current schedule.`,
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <Clock3 className="size-3.5 text-emerald-500" />
          Apply hours
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 dark:border-zinc-800 dark:bg-zinc-900">
          <SlimToggle
            label="AM"
            checked={scope.weekdayAm}
            onCheckedChange={(weekdayAm) => updateScope("weekdayAm", weekdayAm)}
            title="Apply weekday AM shift hours (Wed–Fri, Mon–Tue)"
          />
          <SlimToggle
            label="PM"
            checked={scope.weekdayPm}
            onCheckedChange={(weekdayPm) => updateScope("weekdayPm", weekdayPm)}
            title="Apply weekday PM shift hours (Wed–Fri, Mon–Tue)"
          />
          <SlimToggle
            label="Weekend"
            checked={scope.weekend}
            onCheckedChange={(weekend) => updateScope("weekend", weekend)}
            title="Apply Saturday and Sunday AM and PM shift hours"
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 shrink-0"
          onClick={handleApply}
          disabled={!canApply}
        >
          Apply to schedule
        </Button>
      </div>

      {statusMessage ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}

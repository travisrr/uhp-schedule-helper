"use client";

import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/context/data-context";
import { DAY_LABELS, DAYS } from "@/lib/utils";
import type { MealPeriodBlock } from "@/lib/types";

function ShiftCard({
  employee,
  timeRange,
}: {
  employee: string;
  timeRange: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-100/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{employee}</p>
      <p className="mt-0.5 text-xs tabular-nums text-emerald-400">{timeRange}</p>
    </div>
  );
}

function MealPeriodColumn({ block }: { block: MealPeriodBlock }) {
  const hasShifts = block.roles.some((role) => role.shifts.length > 0);

  return (
    <div className="min-w-0 flex-1 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {block.period}
        </span>
        <Separator className="flex-1" />
      </div>

      {!hasShifts ? (
        <p className="text-xs text-zinc-400 dark:text-zinc-600">No shifts scheduled</p>
      ) : (
        block.roles.map((roleBlock) =>
          roleBlock.shifts.length > 0 ? (
            <div key={`${block.period}-${roleBlock.role}`} className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {roleBlock.role}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {roleBlock.shifts.map((shift, index) => (
                  <ShiftCard
                    key={`${shift.employee}-${shift.timeRange}-${index}`}
                    employee={shift.employee}
                    timeRange={shift.timeRange}
                  />
                ))}
              </div>
            </div>
          ) : null,
        )
      )}
    </div>
  );
}

export function ScheduleWeekView() {
  const { schedule } = useAppData();

  if (!schedule) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/50">
        <p className="text-sm text-zinc-500">
          Upload a weekly schedule report in Settings to populate shift assignments.
        </p>
      </div>
    );
  }

  const orderedDays = DAYS.map((dayKey) =>
    schedule.days.find((day) => day.day === dayKey),
  ).filter(Boolean);

  if (orderedDays.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/50">
        <p className="text-sm text-zinc-500">
          Schedule file parsed, but no shift blocks were detected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orderedDays.map((day) => {
        if (!day) return null;
        const amBlock =
          day.mealPeriods.find((block) => block.period === "AM") ?? {
            period: "AM" as const,
            roles: [],
          };
        const pmBlock =
          day.mealPeriods.find((block) => block.period === "PM") ?? {
            period: "PM" as const,
            roles: [],
          };

        return (
          <section
            key={day.day}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {DAY_LABELS[day.day]}
              </h3>
            </div>
            <div className="grid gap-6 p-4 lg:grid-cols-2">
              <MealPeriodColumn block={amBlock} />
              <MealPeriodColumn block={pmBlock} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

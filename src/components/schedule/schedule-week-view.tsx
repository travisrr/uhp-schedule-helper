"use client";

import { useAppData } from "@/context/data-context";
import { DAY_LABELS, DAYS } from "@/lib/utils";
import { formatWeekRange, parseISODateString } from "@/lib/week-utils";
import type { MealPeriodBlock } from "@/lib/types";

function MealPeriodTable({ block }: { block: MealPeriodBlock }) {
  const activeRoles = block.roles.filter((role) => role.shifts.length > 0);

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th
            colSpan={4}
            className="border border-zinc-300 bg-black px-3 py-1.5 text-center text-sm font-bold text-white dark:border-zinc-600"
          >
            {block.period}
          </th>
        </tr>
      </thead>
      <tbody>
        {activeRoles.length === 0 ? (
          <tr>
            <td
              colSpan={4}
              className="border border-zinc-300 px-3 py-2 text-xs text-zinc-400 dark:border-zinc-600"
            >
              No shifts scheduled
            </td>
          </tr>
        ) : (
          activeRoles.map((roleBlock) => (
            <RoleSection
              key={`${block.period}-${roleBlock.role}`}
              role={roleBlock.role}
              shifts={roleBlock.shifts}
            />
          ))
        )}
      </tbody>
    </table>
  );
}

function RoleSection({
  role,
  shifts,
}: {
  role: string;
  shifts: Array<{ employee: string; timeRange: string }>;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={4}
          className="border border-zinc-300 bg-zinc-600 px-3 py-1 text-center text-sm font-semibold text-white dark:border-zinc-600"
        >
          {role}
        </td>
      </tr>
      {shifts.map((shift, index) => (
        <tr key={`${shift.employee}-${shift.timeRange}-${index}`}>
          <td
            colSpan={3}
            className="border border-zinc-300 px-3 py-1 text-zinc-900 dark:border-zinc-600 dark:text-zinc-100"
          >
            {shift.employee}
          </td>
          <td className="border border-zinc-300 px-3 py-1 text-right tabular-nums text-zinc-900 dark:border-zinc-600 dark:text-zinc-100">
            {shift.timeRange}
          </td>
        </tr>
      ))}
    </>
  );
}

export function ScheduleWeekView() {
  const { schedule } = useAppData();

  if (!schedule) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/50">
        <p className="text-sm text-zinc-500">
          Select a week above and generate a schedule from availability, or upload a
          weekly schedule report in Settings.
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
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Shift Report
        </h2>
        <div className="space-y-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {schedule.weekStartDate ? (
            <p>Week: {formatWeekRange(parseISODateString(schedule.weekStartDate))}</p>
          ) : null}
          {schedule.generatedAt ? <p>Generated on: {schedule.generatedAt}</p> : null}
        </div>
      </div>

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
        const dateLabel = day.dateLabel ?? DAY_LABELS[day.day];

        return (
          <section key={day.day} className="space-y-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {dateLabel}
            </h3>
            <div className="flex gap-4">
              <div className="min-w-0 flex-1">
                <MealPeriodTable block={amBlock} />
              </div>
              <div className="min-w-0 flex-1">
                <MealPeriodTable block={pmBlock} />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

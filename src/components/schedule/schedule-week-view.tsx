"use client";

import { useAppData } from "@/context/data-context";
import { DAY_LABELS, DAYS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MealPeriodBlock, ScheduleData } from "@/lib/types";

type RowItem =
  | { kind: "role"; role: string }
  | { kind: "shift"; employee: string; timeRange: string };

interface CombinedRow {
  am: RowItem | null;
  pm: RowItem | null;
}

const CELL =
  "border border-[#bfbfbf] bg-white px-2 py-1 align-middle text-black";
const GAP = "border-0 bg-white p-0";
const PERIOD = `${CELL} bg-black text-center font-bold text-white`;
const ROLE = `${CELL} bg-[#808080] text-center font-semibold text-white`;
const DATE = `${CELL} pt-4 text-sm font-bold`;
const TITLE = `${CELL} border-b-0 text-base font-bold`;
const GENERATED = `${CELL} border-t-0 text-[13px] font-normal`;

function flattenMealPeriod(block: MealPeriodBlock): RowItem[] {
  const items: RowItem[] = [];

  for (const roleBlock of block.roles) {
    if (roleBlock.shifts.length === 0) continue;
    items.push({ kind: "role", role: roleBlock.role });
    for (const shift of roleBlock.shifts) {
      items.push({
        kind: "shift",
        employee: shift.employee,
        timeRange: shift.timeRange,
      });
    }
  }

  return items;
}

function buildCombinedRows(
  amBlock: MealPeriodBlock,
  pmBlock: MealPeriodBlock,
): CombinedRow[] {
  const amItems = flattenMealPeriod(amBlock);
  const pmItems = flattenMealPeriod(pmBlock);
  const rowCount = Math.max(amItems.length, pmItems.length);

  if (rowCount === 0) return [];

  return Array.from({ length: rowCount }, (_, index) => ({
    am: amItems[index] ?? null,
    pm: pmItems[index] ?? null,
  }));
}

function SideCells({ item }: { item: RowItem | null }) {
  if (!item) {
    return (
      <>
        <td className={CELL} colSpan={2} />
        <td className={CELL} />
        <td className={CELL} />
      </>
    );
  }

  if (item.kind === "role") {
    return (
      <td className={ROLE} colSpan={4}>
        {item.role}
      </td>
    );
  }

  return (
    <>
      <td className={CELL} colSpan={2}>
        {item.employee}
      </td>
      <td className={CELL} />
      <td className={cn(CELL, "text-right tabular-nums whitespace-nowrap")}>
        {item.timeRange}
      </td>
    </>
  );
}

function DaySection({
  dateLabel,
  amBlock,
  pmBlock,
  isFirstDay,
}: {
  dateLabel: string;
  amBlock: MealPeriodBlock;
  pmBlock: MealPeriodBlock;
  isFirstDay: boolean;
}) {
  const combinedRows = buildCombinedRows(amBlock, pmBlock);

  return (
    <>
      <tr>
        <td className={cn(DATE, isFirstDay && "pt-2")} colSpan={9}>
          {dateLabel}
        </td>
      </tr>
      <tr>
        <td
          className={cn(CELL, "h-2 border-x border-t-0 border-b-0 p-0 leading-none")}
          colSpan={9}
        >
          &nbsp;
        </td>
      </tr>
      <tr>
        <td className={PERIOD} colSpan={4}>
          AM
        </td>
        <td className={cn(GAP, "w-4 min-w-4")} />
        <td className={PERIOD} colSpan={4}>
          PM
        </td>
      </tr>
      {combinedRows.map((row, index) => (
        <tr key={index}>
          <SideCells item={row.am} />
          <td className={cn(GAP, "w-4 min-w-4")} />
          <SideCells item={row.pm} />
        </tr>
      ))}
    </>
  );
}

interface ScheduleWeekViewProps {
  schedule?: ScheduleData | null;
  title?: string;
  emptyMessage?: string;
}

export function ScheduleWeekView({
  schedule: scheduleProp,
  title = "Shift Report",
  emptyMessage = "Select a week above and generate a schedule from availability, or upload a weekly schedule report in Settings.",
}: ScheduleWeekViewProps = {}) {
  const { schedule: contextSchedule } = useAppData();
  const schedule = scheduleProp ?? contextSchedule;

  if (!schedule) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/50">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
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
    <div className="overflow-x-auto rounded border border-[#d4d4d4] bg-white">
      <table className="w-full min-w-[960px] table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[24%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[12%]" />
          <col className="w-[4%]" />
          <col className="w-[12%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[16%]" />
        </colgroup>
        <tbody>
          <tr>
            <td className={TITLE} colSpan={9}>
              {title}
            </td>
          </tr>
          {schedule.generatedAt ? (
            <tr>
              <td className={GENERATED} colSpan={9}>
                Generated on: {schedule.generatedAt}
              </td>
            </tr>
          ) : null}

          {orderedDays.map((day, dayIndex) => {
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
              <DaySection
                key={day.day}
                dateLabel={dateLabel}
                amBlock={amBlock}
                pmBlock={pmBlock}
                isFirstDay={dayIndex === 0}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

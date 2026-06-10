"use client";

import { useAppData } from "@/context/data-context";
import { ScheduleEmployeeStatsPanel } from "@/components/schedule/schedule-employee-stats-panel";
import {
  ScheduleShiftActionProvider,
  useScheduleShiftActions,
} from "@/components/schedule/schedule-shift-actions";
import type { ShiftRef } from "@/lib/schedule-mutations";
import { ensureMealPeriodManagementSlot } from "@/lib/schedule-management-roles";
import { cn, DAY_LABELS, DAYS, type DayKey } from "@/lib/utils";
import type { MealPeriodBlock, ScheduleData } from "@/lib/types";

type RowItem =
  | { kind: "role"; role: string }
  | { kind: "shift"; employee: string; timeRange: string; ref: ShiftRef };

interface CombinedRow {
  am: RowItem | null;
  pm: RowItem | null;
}

const BORDER = "border border-black";
const CELL = `${BORDER} bg-white align-middle text-[13px] leading-snug text-black`;
const GAP = "border-0 bg-white p-0";
const PERIOD = `${BORDER} bg-black px-2 py-1 text-center text-sm font-bold text-white`;
const ROLE_HEADER = `${BORDER} bg-[#808080] px-2 py-1 text-center text-sm font-semibold text-white`;
const DATE = `${BORDER} px-3 pt-4 text-sm font-bold`;
const TITLE = `${BORDER} border-b-0 px-3 py-1 text-base font-bold`;
const GENERATED = `${BORDER} border-t-0 px-3 py-1 text-[13px] font-normal`;
const NAME_CELL = `${CELL} max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-3 py-1 text-left`;
const SPACER_CELL = `${CELL} px-0 py-1`;
const TIME_CELL = `${CELL} whitespace-nowrap px-2 py-1 text-right text-[12px] tabular-nums`;
const EMPTY_SIDE_CELL = `${CELL} px-2 py-1`;
const INTERACTIVE_CELL =
  "cursor-context-menu hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-400";

function flattenMealPeriod(day: DayKey, block: MealPeriodBlock): RowItem[] {
  const normalizedBlock = ensureMealPeriodManagementSlot(block);
  const items: RowItem[] = [];

  for (const roleBlock of normalizedBlock.roles) {
    if (roleBlock.shifts.length === 0) continue;
    items.push({ kind: "role", role: roleBlock.role });
    roleBlock.shifts.forEach((shift, shiftIndex) => {
      items.push({
        kind: "shift",
        employee: shift.employee,
        timeRange: shift.timeRange,
        ref: {
          day,
          period: normalizedBlock.period,
          role: roleBlock.role,
          shiftIndex,
        },
      });
    });
  }

  return items;
}

function buildCombinedRows(
  day: DayKey,
  amBlock: MealPeriodBlock,
  pmBlock: MealPeriodBlock,
): CombinedRow[] {
  const amItems = flattenMealPeriod(day, amBlock);
  const pmItems = flattenMealPeriod(day, pmBlock);
  const rowCount = Math.max(amItems.length, pmItems.length);

  if (rowCount === 0) return [];

  return Array.from({ length: rowCount }, (_, index) => ({
    am: amItems[index] ?? null,
    pm: pmItems[index] ?? null,
  }));
}

function SideCells({
  item,
  editable,
}: {
  item: RowItem | null;
  editable: boolean;
}) {
  const actions = useScheduleShiftActions();

  if (!item) {
    return (
      <>
        <td className={EMPTY_SIDE_CELL} colSpan={2} />
        <td className={SPACER_CELL} />
        <td className={EMPTY_SIDE_CELL} />
      </>
    );
  }

  if (item.kind === "role") {
    return (
      <td className={ROLE_HEADER} colSpan={4} title={item.role}>
        {item.role}
      </td>
    );
  }

  const canEdit = editable && actions;
  const hasEmployee = item.employee.trim().length > 0;
  const displayTimeRange = hasEmployee ? item.timeRange : "";

  return (
    <>
      <td
        className={cn(NAME_CELL, canEdit && INTERACTIVE_CELL)}
        colSpan={2}
        title={item.employee || undefined}
        onContextMenu={
          canEdit
            ? (event) =>
                actions.openEmployeeMenu(event, item.ref, item.employee)
            : undefined
        }
      >
        {hasEmployee ? (
          item.employee
        ) : (
          <span className="text-zinc-400 italic">Unassigned</span>
        )}
      </td>
      <td className={SPACER_CELL} />
      <td
        className={cn(TIME_CELL, canEdit && hasEmployee && INTERACTIVE_CELL)}
        title={displayTimeRange || undefined}
        onContextMenu={
          canEdit && hasEmployee
            ? (event) => actions.openTimeMenu(event, item.ref, item.timeRange)
            : undefined
        }
      >
        {displayTimeRange}
      </td>
    </>
  );
}

function DaySection({
  day,
  dateLabel,
  amBlock,
  pmBlock,
  isFirstDay,
  editable,
}: {
  day: DayKey;
  dateLabel: string;
  amBlock: MealPeriodBlock;
  pmBlock: MealPeriodBlock;
  isFirstDay: boolean;
  editable: boolean;
}) {
  const combinedRows = buildCombinedRows(day, amBlock, pmBlock);

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
          <SideCells item={row.am} editable={editable} />
          <td className={cn(GAP, "w-4 min-w-4")} />
          <SideCells item={row.pm} editable={editable} />
        </tr>
      ))}
    </>
  );
}

const SCHEDULE_COLGROUP = (
  <colgroup>
    <col style={{ width: "18%" }} />
    <col style={{ width: "14%" }} />
    <col style={{ width: "8%" }} />
    <col style={{ width: "16%" }} />
    <col style={{ width: "2%" }} />
    <col style={{ width: "18%" }} />
    <col style={{ width: "14%" }} />
    <col style={{ width: "8%" }} />
    <col style={{ width: "16%" }} />
  </colgroup>
);

function ScheduleWeekTable({
  schedule,
  title,
  editable,
  showWeeklyStats,
}: {
  schedule: ScheduleData;
  title: string;
  editable: boolean;
  showWeeklyStats: boolean;
}) {
  const orderedDays = DAYS.map((dayKey) =>
    schedule.days.find((day) => day.day === dayKey),
  ).filter(Boolean);

  const scheduleTable = (
    <div
      className={cn(
        "overflow-x-auto rounded border border-black bg-white",
        showWeeklyStats ? "min-w-0 flex-1" : undefined,
      )}
    >
      <table className="w-full min-w-[1000px] table-fixed border-collapse text-sm">
        {SCHEDULE_COLGROUP}
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
                day={day.day}
                dateLabel={dateLabel}
                amBlock={amBlock}
                pmBlock={pmBlock}
                isFirstDay={dayIndex === 0}
                editable={editable}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (!showWeeklyStats) {
    return scheduleTable;
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      {scheduleTable}
      <ScheduleEmployeeStatsPanel
        className="xl:w-[300px] xl:shrink-0"
        schedule={schedule}
      />
    </div>
  );
}

interface ScheduleWeekViewProps {
  schedule?: ScheduleData | null;
  title?: string;
  emptyMessage?: string;
  editable?: boolean;
  /** Weekly totals sidebar; off for read-only previews like Prior Schedule. */
  showWeeklyStats?: boolean;
}

export function ScheduleWeekView({
  schedule: scheduleProp,
  title = "Shift Report",
  emptyMessage = "Import a prior schedule baseline, pick a week above, and click Generate Schedule.",
  editable: editableProp,
  showWeeklyStats = true,
}: ScheduleWeekViewProps = {}) {
  const { schedule: contextSchedule, setSchedule } = useAppData();
  const schedule = scheduleProp ?? contextSchedule;
  const editable = editableProp ?? scheduleProp == null;

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

  if (!editable) {
    return (
      <ScheduleWeekTable
        schedule={schedule}
        title={title}
        editable={false}
        showWeeklyStats={showWeeklyStats}
      />
    );
  }

  return (
    <ScheduleShiftActionProvider
      schedule={schedule}
      onScheduleChange={setSchedule}
    >
      <ScheduleWeekTable
        schedule={schedule}
        title={title}
        editable
        showWeeklyStats={showWeeklyStats}
      />
    </ScheduleShiftActionProvider>
  );
}

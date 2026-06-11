"use client";

import { useMemo } from "react";
import { useAppData } from "@/context/data-context";
import { ScheduleEmployeeStatsPanel } from "@/components/schedule/schedule-employee-stats-panel";
import { ScheduleExportActions } from "@/components/schedule/schedule-export-actions";
import {
  ScheduleShiftActionProvider,
  useScheduleShiftActions,
} from "@/components/schedule/schedule-shift-actions";
import type { ShiftRef } from "@/lib/schedule-mutations";
import {
  isScheduleDayLocked,
  setScheduleDayLocked,
} from "@/lib/schedule-day-lock";
import { ensureMealPeriodManagementSlot } from "@/lib/schedule-management-roles";
import { cn, DAY_LABELS, DAYS, type DayKey } from "@/lib/utils";
import type { MealPeriodBlock, ScheduleData } from "@/lib/types";
import { buildDayDateLabels, parseISODateString } from "@/lib/week-utils";

type RowItem =
  | { kind: "role"; role: string; day: DayKey; period: "AM" | "PM" }
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
    items.push({
      kind: "role",
      role: roleBlock.role,
      day,
      period: normalizedBlock.period,
    });
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
    const canEdit = editable && actions;

    return (
      <td
        className={cn(
          ROLE_HEADER,
          canEdit && "cursor-context-menu hover:bg-[#6e6e6e]",
        )}
        colSpan={4}
        title={canEdit ? `${item.role} — right-click for options` : item.role}
        onContextMenu={
          canEdit
            ? (event) =>
                actions.openRoleMenu(event, {
                  day: item.day,
                  period: item.period,
                  role: item.role,
                })
            : undefined
        }
      >
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
        title={
          canEdit && hasEmployee
            ? `${displayTimeRange} — click to adjust`
            : displayTimeRange || undefined
        }
        onClick={
          canEdit && hasEmployee
            ? () => actions.openTimeEditor(item.ref, item.timeRange)
            : undefined
        }
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

function DayLockToggle({
  day,
  locked,
}: {
  day: DayKey;
  locked: boolean;
}) {
  const { setSchedule } = useAppData();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={locked}
      aria-label={
        locked
          ? "Day locked — click to unlock"
          : "Set and lock this day"
      }
      title={
        locked
          ? "Locked — this day will not change when you regenerate or apply shift hours"
          : "Set and lock — freeze this day against bulk updates"
      }
      onClick={() => {
        setSchedule((previous) => {
          if (!previous) return previous;
          return setScheduleDayLocked(previous, day, !locked);
        });
      }}
      className={cn(
        "relative inline-flex h-3.5 w-7 shrink-0 items-center rounded-full border border-black/15 transition-colors",
        locked ? "bg-emerald-500" : "bg-yellow-400",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block size-2 rounded-full bg-white shadow-sm transition-transform",
          locked ? "translate-x-3.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function DaySection({
  day,
  dateLabel,
  amBlock,
  pmBlock,
  isFirstDay,
  editable,
  locked,
  showLockToggle,
}: {
  day: DayKey;
  dateLabel: string;
  amBlock: MealPeriodBlock;
  pmBlock: MealPeriodBlock;
  isFirstDay: boolean;
  editable: boolean;
  locked: boolean;
  showLockToggle: boolean;
}) {
  const combinedRows = buildCombinedRows(day, amBlock, pmBlock);
  const dayEditable = editable && !locked;

  return (
    <>
      <tr>
        <td className={cn(DATE, isFirstDay && "pt-2")} colSpan={9}>
          <div className="flex items-center justify-between gap-3">
            <span>{dateLabel}</span>
            {showLockToggle ? (
              <DayLockToggle day={day} locked={locked} />
            ) : locked ? (
              <span
                className="inline-block size-2 shrink-0 rounded-full bg-emerald-500"
                title="Day locked"
                aria-hidden
              />
            ) : null}
          </div>
        </td>
      </tr>
      <tr>
        <td
          className={cn(
            CELL,
            "h-2 border-x border-t-0 border-b-0 p-0 leading-none",
          )}
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
          <SideCells item={row.am} editable={dayEditable} />
          <td className={cn(GAP, "w-4 min-w-4")} />
          <SideCells item={row.pm} editable={dayEditable} />
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
  editable,
  showWeeklyStats,
  useLiveStats,
  showLockToggle,
}: {
  schedule: ScheduleData;
  editable: boolean;
  showWeeklyStats: boolean;
  useLiveStats: boolean;
  showLockToggle: boolean;
}) {
  const orderedDays = DAYS.map((dayKey) =>
    schedule.days.find((day) => day.day === dayKey),
  ).filter(Boolean);

  const scheduleTable = (
    <div
      id="schedule-print-root"
      className={cn(
        "overflow-x-auto rounded border border-black bg-white",
        showWeeklyStats ? "min-w-0 flex-[1_1_920px]" : undefined,
      )}
    >
      <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
        {SCHEDULE_COLGROUP}
        <tbody>
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
                locked={isScheduleDayLocked(day)}
                showLockToggle={showLockToggle}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (!showWeeklyStats) {
    return (
      <div className="space-y-3">
        <ScheduleExportActions weekStartDate={schedule.weekStartDate} />
        {scheduleTable}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ScheduleExportActions weekStartDate={schedule.weekStartDate} />
      <div className="flex flex-wrap items-start gap-4">
        {scheduleTable}
        <ScheduleEmployeeStatsPanel
          className="no-print w-full min-w-[260px] flex-[1_1_280px] min-[1500px]:sticky min-[1500px]:top-4 min-[1500px]:max-w-[320px]"
          schedule={schedule}
          useLiveSchedule={useLiveStats}
        />
      </div>
    </div>
  );
}

function applyWeekDateLabels(
  schedule: ScheduleData | null | undefined,
  weekStartDate?: string | null,
): ScheduleData | null | undefined {
  if (!weekStartDate) return schedule;
  if (!schedule) return schedule;

  const labels = buildDayDateLabels(parseISODateString(weekStartDate));
  const days = schedule.days.map((day) => ({
    ...day,
    dateLabel: labels[day.day],
  }));

  return {
    ...schedule,
    weekStartDate,
    days,
  };
}

interface ScheduleWeekViewProps {
  schedule?: ScheduleData | null;
  emptyMessage?: string;
  editable?: boolean;
  /** Weekly totals sidebar; off for read-only previews like Prior Schedule. */
  showWeeklyStats?: boolean;
}

export function ScheduleWeekView({
  schedule: scheduleProp,
  emptyMessage = "Import a prior schedule baseline, pick a week above, and click Generate Schedule.",
  editable: editableProp,
  showWeeklyStats = true,
}: ScheduleWeekViewProps = {}) {
  const {
    schedule: contextSchedule,
    selectedWeekStart,
    hydrated,
    setSchedule,
  } = useAppData();
  const sourceSchedule = scheduleProp ?? contextSchedule;
  const schedule = useMemo(
    () =>
      scheduleProp == null
        ? applyWeekDateLabels(sourceSchedule, selectedWeekStart)
        : sourceSchedule,
    [scheduleProp, selectedWeekStart, sourceSchedule],
  );
  const editable = editableProp ?? scheduleProp == null;

  if (!hydrated) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-950/50">
        <p className="text-sm text-zinc-500">Loading saved data…</p>
      </div>
    );
  }

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
        editable={false}
        showWeeklyStats={showWeeklyStats}
        useLiveStats={scheduleProp == null}
        showLockToggle={false}
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
        editable
        showWeeklyStats={showWeeklyStats}
        useLiveStats={scheduleProp == null}
        showLockToggle
      />
    </ScheduleShiftActionProvider>
  );
}

"use client";

import { useMemo } from "react";
import { useAppData } from "@/context/data-context";
import {
  computeEmployeeWeeklyStats,
  formatWeeklyHours,
  scheduleAssignmentFingerprint,
} from "@/lib/schedule-employee-stats";
import type { ScheduleData } from "@/lib/types";
import { cn } from "@/lib/utils";

const BORDER = "border border-black";
const CELL = `${BORDER} bg-white align-middle text-[13px] leading-snug text-black`;
const HEADER = `${BORDER} bg-black px-2 py-1 text-center text-sm font-bold text-white`;
const SUBHEADER = `${BORDER} bg-[#808080] px-2 py-1 text-center text-xs font-semibold text-white`;
const NAME_CELL = `${CELL} max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 text-left font-medium`;
const VALUE_CELL = `${CELL} whitespace-nowrap px-2 py-1 text-center tabular-nums`;

interface ScheduleEmployeeStatsPanelProps {
  /** Fallback schedule when not reading live context (e.g. read-only previews). */
  schedule?: ScheduleData | null;
  /** When true, totals always follow the live schedule in app context. */
  useLiveSchedule?: boolean;
  className?: string;
}

export function ScheduleEmployeeStatsPanel({
  schedule: scheduleProp,
  useLiveSchedule = false,
  className,
}: ScheduleEmployeeStatsPanelProps) {
  const { schedule: contextSchedule } = useAppData();
  const schedule = useLiveSchedule
    ? (contextSchedule ?? scheduleProp ?? null)
    : (scheduleProp ?? null);

  const stats = useMemo(
    () => (schedule ? computeEmployeeWeeklyStats(schedule) : []),
    [schedule],
  );

  const statsKey = schedule
    ? scheduleAssignmentFingerprint(schedule)
    : "empty";

  if (stats.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded border border-black bg-white",
        className,
      )}
    >
      <table className="w-full min-w-[260px] table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: "42%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "24%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className={HEADER} colSpan={4}>
              Weekly Totals
            </th>
          </tr>
          <tr>
            <th className={SUBHEADER} scope="col">
              Employee
            </th>
            <th className={SUBHEADER} scope="col">
              Hours
            </th>
            <th className={SUBHEADER} scope="col">
              Shifts
            </th>
            <th className={SUBHEADER} scope="col">
              AM / PM
            </th>
          </tr>
        </thead>
        <tbody key={statsKey}>
          {stats.map((entry) => (
            <tr key={entry.employee}>
              <td className={NAME_CELL} title={entry.employee}>
                {entry.employee}
              </td>
              <td className={VALUE_CELL}>{formatWeeklyHours(entry.totalHours)}</td>
              <td className={VALUE_CELL}>{entry.totalShifts}</td>
              <td className={VALUE_CELL}>
                {entry.amShifts} / {entry.pmShifts}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

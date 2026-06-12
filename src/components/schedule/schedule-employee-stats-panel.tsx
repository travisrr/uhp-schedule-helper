"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeEmployeeWeeklyStats,
  findChangedEmployeeKeys,
  formatWeeklyHours,
  normalizeEmployeeKey,
  scheduleAssignmentFingerprint,
  type EmployeeWeeklyStats,
} from "@/lib/schedule-employee-stats";
import type { ScheduleData } from "@/lib/types";
import { cn } from "@/lib/utils";

const BORDER = "border border-black";
const CELL = `${BORDER} bg-white align-middle text-[13px] leading-snug text-black`;
const HEADER = `${BORDER} bg-black px-2 py-1 text-center text-sm font-bold text-white`;
const SUBHEADER = `${BORDER} bg-[#808080] px-2 py-1 text-center text-xs font-semibold text-white`;
const NAME_CELL = `${CELL} max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1 text-left font-medium`;
const VALUE_CELL = `${CELL} whitespace-nowrap px-2 py-1 text-center tabular-nums`;

const FLASH_MS = 1_250;

interface ScheduleEmployeeStatsPanelProps {
  schedule: ScheduleData | null;
  className?: string;
}

export function ScheduleEmployeeStatsPanel({
  schedule,
  className,
}: ScheduleEmployeeStatsPanelProps) {
  const assignmentKey = schedule
    ? scheduleAssignmentFingerprint(schedule)
    : "empty";

  const stats = useMemo(
    () => (schedule ? computeEmployeeWeeklyStats(schedule) : []),
    [schedule, assignmentKey],
  );

  const previousStatsRef = useRef<Map<string, EmployeeWeeklyStats>>(new Map());
  const hasInitializedRef = useRef(false);
  const [flashingKeys, setFlashingKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const changed = findChangedEmployeeKeys(previousStatsRef.current, stats);
    previousStatsRef.current = new Map(
      stats.map((entry) => [normalizeEmployeeKey(entry.employee), entry]),
    );

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }

    if (changed.size === 0) return;

    setFlashingKeys(new Set());
    const startFrame = requestAnimationFrame(() => {
      setFlashingKeys(changed);
    });
    const timer = window.setTimeout(() => {
      setFlashingKeys(new Set());
    }, FLASH_MS);

    return () => {
      cancelAnimationFrame(startFrame);
      window.clearTimeout(timer);
    };
  }, [stats]);

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
      <table className="w-full min-w-[320px] table-fixed border-collapse text-sm">
        <colgroup>
          <col style={{ width: "36%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className={HEADER} colSpan={5}>
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
              Weekend
            </th>
            <th className={SUBHEADER} scope="col">
              AM / PM
            </th>
          </tr>
        </thead>
        <tbody>
          {stats.map((entry) => {
            const key = normalizeEmployeeKey(entry.employee);
            const isFlashing = flashingKeys.has(key);

            return (
              <tr
                key={entry.employee}
                className={cn(isFlashing && "stats-row-flash")}
              >
                <td className={NAME_CELL} title={entry.employee}>
                  {entry.employee}
                </td>
                <td className={VALUE_CELL}>
                  {formatWeeklyHours(entry.totalHours)}
                </td>
                <td className={VALUE_CELL}>{entry.totalShifts}</td>
                <td className={VALUE_CELL}>{entry.weekendShifts}</td>
                <td className={VALUE_CELL}>
                  {entry.amShifts} / {entry.pmShifts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

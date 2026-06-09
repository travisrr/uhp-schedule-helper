import type {
  AvailabilityData,
  AvailabilityStatus,
  MealPeriodBlock,
  RoleBlock,
  ScheduleData,
  ScheduleDay,
  ShiftAssignment,
} from "../types";
import { DAYS, type DayKey } from "../utils";
import {
  buildDayDateLabels,
  formatGeneratedTimestamp,
  toISODateString,
} from "../week-utils";

const DEFAULT_AM_TIME = "10:30 AM - 4:00 PM";
const DEFAULT_PM_TIME = "4:00 PM - 10:00 PM";

function canWorkAM(status: AvailabilityStatus): boolean {
  const trimmed = status.trim();
  if (!trimmed || trimmed.toUpperCase() === "OFF") return false;
  if (trimmed.toUpperCase() === "OPEN") return true;
  return /only\s*am/i.test(trimmed);
}

function canWorkPM(status: AvailabilityStatus): boolean {
  const trimmed = status.trim();
  if (!trimmed || trimmed.toUpperCase() === "OFF") return false;
  if (trimmed.toUpperCase() === "OPEN") return true;
  return /only\s*pm/i.test(trimmed);
}

function getRoleName(role: string): string {
  const trimmed = role.trim();
  return trimmed || "Staff";
}

function sortShifts(shifts: ShiftAssignment[]): ShiftAssignment[] {
  return [...shifts].sort((a, b) =>
    a.employee.localeCompare(b.employee, undefined, { sensitivity: "base" }),
  );
}

function buildRoleBlocks(
  assignments: Map<string, ShiftAssignment[]>,
): RoleBlock[] {
  return [...assignments.entries()]
    .sort(([roleA], [roleB]) =>
      roleA.localeCompare(roleB, undefined, { sensitivity: "base" }),
    )
    .map(([role, shifts]) => ({
      role,
      shifts: sortShifts(shifts),
    }));
}

function createEmptyDay(day: DayKey, dateLabel: string): ScheduleDay {
  return {
    day,
    dateLabel,
    mealPeriods: [
      { period: "AM", roles: [] },
      { period: "PM", roles: [] },
    ],
  };
}

function getMealBlock(day: ScheduleDay, period: "AM" | "PM"): MealPeriodBlock {
  return (
    day.mealPeriods.find((block) => block.period === period) ?? {
      period,
      roles: [],
    }
  );
}

export function generateScheduleFromAvailability(
  availability: AvailabilityData,
  weekStartWednesday: Date,
): ScheduleData {
  const dateLabels = buildDayDateLabels(weekStartWednesday);

  const days = DAYS.map((dayKey) => {
    const day = createEmptyDay(dayKey, dateLabels[dayKey]);
    const amByRole = new Map<string, ShiftAssignment[]>();
    const pmByRole = new Map<string, ShiftAssignment[]>();

    for (const employee of availability.employees) {
      const status = employee.days[dayKey];
      const role = getRoleName(employee.role);

      if (canWorkAM(status)) {
        const shifts = amByRole.get(role) ?? [];
        shifts.push({
          employee: employee.employee,
          timeRange: DEFAULT_AM_TIME,
        });
        amByRole.set(role, shifts);
      }

      if (canWorkPM(status)) {
        const shifts = pmByRole.get(role) ?? [];
        shifts.push({
          employee: employee.employee,
          timeRange: DEFAULT_PM_TIME,
        });
        pmByRole.set(role, shifts);
      }
    }

    const amBlock = getMealBlock(day, "AM");
    const pmBlock = getMealBlock(day, "PM");
    amBlock.roles = buildRoleBlocks(amByRole);
    pmBlock.roles = buildRoleBlocks(pmByRole);

    return day;
  });

  return {
    metrics: {
      totalHours: null,
      totalPay: null,
      forecastedSales: null,
      actualLaborCostPercent: null,
    },
    generatedAt: formatGeneratedTimestamp(new Date()),
    weekStartDate: toISODateString(weekStartWednesday),
    days,
  };
}

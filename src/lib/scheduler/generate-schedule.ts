import {
  canWorkAM,
  canWorkPM,
  findEmployeeInAvailability,
  normalizeEmployeeName,
} from "../availability-utils";
import type {
  AvailabilityData,
  MealPeriodBlock,
  RoleBlock,
  ScheduleData,
  ScheduleDay,
  ShiftAssignment,
} from "../types";
import { DAYS, type DayKey } from "../utils";
import { ensureManagementSlot } from "../schedule-management-roles";
import {
  DEFAULT_SHIFT_HOURS,
  timeRangeForPeriod,
  type ShiftHoursSettings,
} from "../shift-hours";
import {
  buildDayDateLabels,
  formatGeneratedTimestamp,
  toISODateString,
} from "../week-utils";

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

function addShiftToRoleMap(
  roleMap: Map<string, ShiftAssignment[]>,
  role: string,
  shift: ShiftAssignment,
): void {
  const shifts = roleMap.get(role) ?? [];
  shifts.push(shift);
  roleMap.set(role, shifts);
}

function generateFromAvailabilityOnly(
  availability: AvailabilityData,
  dateLabels: Record<DayKey, string>,
  shiftHours: ShiftHoursSettings,
): ScheduleDay[] {
  return DAYS.map((dayKey) => {
    const day = createEmptyDay(dayKey, dateLabels[dayKey]);
    const amByRole = new Map<string, ShiftAssignment[]>();
    const pmByRole = new Map<string, ShiftAssignment[]>();
    const seenEmployees = new Set<string>();

    for (const employee of availability.employees) {
      const employeeKey = normalizeEmployeeName(employee.employee);
      if (seenEmployees.has(employeeKey)) continue;
      seenEmployees.add(employeeKey);

      const status = employee.days[dayKey];

      if (canWorkAM(status)) {
        addShiftToRoleMap(amByRole, getRoleName(employee.role), {
          employee: employee.employee,
          timeRange: timeRangeForPeriod("AM", shiftHours),
        });
      }

      if (canWorkPM(status)) {
        addShiftToRoleMap(pmByRole, getRoleName(employee.role), {
          employee: employee.employee,
          timeRange: timeRangeForPeriod("PM", shiftHours),
        });
      }
    }

    const amBlock = getMealBlock(day, "AM");
    const pmBlock = getMealBlock(day, "PM");
    amBlock.roles = ensureManagementSlot(buildRoleBlocks(amByRole), "AM");
    pmBlock.roles = ensureManagementSlot(buildRoleBlocks(pmByRole), "PM");

    return day;
  });
}

function generateFromPriorSchedule(
  availability: AvailabilityData,
  dateLabels: Record<DayKey, string>,
  priorSchedule: ScheduleData,
  shiftHours: ShiftHoursSettings,
): ScheduleDay[] {
  return DAYS.map((dayKey) => {
    const day = createEmptyDay(dayKey, dateLabels[dayKey]);
    const amByRole = new Map<string, ShiftAssignment[]>();
    const pmByRole = new Map<string, ShiftAssignment[]>();
    const priorDay = priorSchedule.days.find((entry) => entry.day === dayKey);

    if (priorDay) {
      for (const mealPeriod of priorDay.mealPeriods) {
        const roleMap = mealPeriod.period === "AM" ? amByRole : pmByRole;

        for (const roleBlock of mealPeriod.roles) {
          const role = getRoleName(roleBlock.role);

          for (const shift of roleBlock.shifts) {
            const employee = findEmployeeInAvailability(
              shift.employee,
              availability,
            );
            if (!employee) continue;

            const status = employee.days[dayKey];
            const canWork =
              mealPeriod.period === "AM" ? canWorkAM(status) : canWorkPM(status);
            if (!canWork) continue;

            const priorTime = shift.timeRange.trim();
            addShiftToRoleMap(roleMap, role, {
              employee: employee.employee,
              timeRange:
                priorTime ||
                timeRangeForPeriod(mealPeriod.period, shiftHours),
              timeOverride:
                shift.timeOverride ?? priorTime.length > 0,
            });
          }
        }
      }
    }

    const amBlock = getMealBlock(day, "AM");
    const pmBlock = getMealBlock(day, "PM");
    amBlock.roles = ensureManagementSlot(buildRoleBlocks(amByRole), "AM");
    pmBlock.roles = ensureManagementSlot(buildRoleBlocks(pmByRole), "PM");

    return day;
  });
}

export interface GeneratedScheduleResult {
  schedule: ScheduleData;
  usedPriorBaseline: boolean;
  priorShiftCount: number;
  assignedShiftCount: number;
}

function countShiftsInDays(days: ScheduleDay[]): number {
  return days.reduce(
    (total, day) =>
      total +
      day.mealPeriods.reduce(
        (periodTotal, period) =>
          periodTotal +
          period.roles.reduce(
            (roleTotal, role) => roleTotal + role.shifts.length,
            0,
          ),
        0,
      ),
    0,
  );
}

export function generateScheduleFromAvailability(
  availability: AvailabilityData,
  weekStartWednesday: Date,
  priorSchedule?: ScheduleData | null,
  shiftHours: ShiftHoursSettings = DEFAULT_SHIFT_HOURS,
): GeneratedScheduleResult {
  const dateLabels = buildDayDateLabels(weekStartWednesday);
  const usedPriorBaseline = priorSchedule != null;
  const days = usedPriorBaseline
    ? generateFromPriorSchedule(
        availability,
        dateLabels,
        priorSchedule,
        shiftHours,
      )
    : generateFromAvailabilityOnly(availability, dateLabels, shiftHours);
  const priorShiftCount = usedPriorBaseline
    ? countShiftsInDays(priorSchedule.days)
    : 0;
  const assignedShiftCount = countShiftsInDays(days);

  const schedule: ScheduleData = {
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

  return {
    schedule,
    usedPriorBaseline,
    priorShiftCount,
    assignedShiftCount,
  };
}

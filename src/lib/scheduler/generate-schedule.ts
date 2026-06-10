import type {
  AvailabilityData,
  AvailabilityStatus,
  EmployeeAvailability,
  MealPeriodBlock,
  RoleBlock,
  ScheduleData,
  ScheduleDay,
  ShiftAssignment,
} from "../types";
import { DAYS, type DayKey } from "../utils";
import { ensureManagementSlot } from "../schedule-management-roles";
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

function normalizeEmployeeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ");
}

function nameParts(name: string): string[] {
  return normalizeEmployeeName(name)
    .split(/[\s,]+/)
    .filter(Boolean)
    .sort();
}

function namesMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeEmployeeName(left);
  const normalizedRight = normalizeEmployeeName(right);
  if (normalizedLeft === normalizedRight) return true;

  const leftParts = nameParts(left);
  const rightParts = nameParts(right);
  return (
    leftParts.length >= 2 &&
    rightParts.length >= 2 &&
    leftParts.join(" ") === rightParts.join(" ")
  );
}

function buildAvailabilityLookup(
  availability: AvailabilityData,
): Map<string, EmployeeAvailability> {
  const lookup = new Map<string, EmployeeAvailability>();

  for (const employee of availability.employees) {
    const key = normalizeEmployeeName(employee.employee);
    if (!lookup.has(key)) {
      lookup.set(key, employee);
    }
  }

  return lookup;
}

function findEmployeeInAvailability(
  priorName: string,
  availability: AvailabilityData,
  lookup: Map<string, EmployeeAvailability>,
): EmployeeAvailability | null {
  const direct = lookup.get(normalizeEmployeeName(priorName));
  if (direct) return direct;

  for (const employee of availability.employees) {
    if (namesMatch(priorName, employee.employee)) {
      return employee;
    }
  }

  return null;
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
          timeRange: DEFAULT_AM_TIME,
        });
      }

      if (canWorkPM(status)) {
        addShiftToRoleMap(pmByRole, getRoleName(employee.role), {
          employee: employee.employee,
          timeRange: DEFAULT_PM_TIME,
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
): ScheduleDay[] {
  const availabilityLookup = buildAvailabilityLookup(availability);

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
              availabilityLookup,
            );
            if (!employee) continue;

            const status = employee.days[dayKey];
            const canWork =
              mealPeriod.period === "AM" ? canWorkAM(status) : canWorkPM(status);
            if (!canWork) continue;

            addShiftToRoleMap(roleMap, role, {
              employee: employee.employee,
              timeRange:
                shift.timeRange.trim() ||
                (mealPeriod.period === "AM" ? DEFAULT_AM_TIME : DEFAULT_PM_TIME),
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
): GeneratedScheduleResult {
  const dateLabels = buildDayDateLabels(weekStartWednesday);
  const usedPriorBaseline = priorSchedule != null;
  const days = usedPriorBaseline
    ? generateFromPriorSchedule(availability, dateLabels, priorSchedule)
    : generateFromAvailabilityOnly(availability, dateLabels);
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

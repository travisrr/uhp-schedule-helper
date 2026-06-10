import type { DayKey } from "@/lib/utils";
import {
  defaultTimeForPeriod,
  isFohManagementRole,
  normalizeScheduleAssignments,
} from "@/lib/schedule-management-roles";
import {
  timeRangeForPeriod,
  type ShiftHoursSettings,
} from "@/lib/shift-hours";
import {
  formatShiftTimeRange,
  isValidTimeToken,
  parseShiftTimeRange,
} from "@/lib/time-format";
import type {
  AvailabilityData,
  ScheduleData,
  ShiftAssignment,
} from "@/lib/types";

export { formatShiftTimeRange, isValidTimeToken, parseShiftTimeRange };

export interface ShiftRef {
  day: DayKey;
  period: "AM" | "PM";
  role: string;
  shiftIndex: number;
}

export interface ShiftListing extends ShiftRef {
  employee: string;
  timeRange: string;
}

export interface EmployeeOption {
  employee: string;
  role: string;
}

function getShiftAtRef(
  schedule: ScheduleData,
  ref: ShiftRef,
): ShiftAssignment | null {
  const day = schedule.days.find((entry) => entry.day === ref.day);
  if (!day) return null;

  const periodBlock = day.mealPeriods.find((block) => block.period === ref.period);
  if (!periodBlock) return null;

  const roleBlock = periodBlock.roles.find((role) => role.role === ref.role);
  if (!roleBlock) return null;

  return roleBlock.shifts[ref.shiftIndex] ?? null;
}

function shiftRefKey(ref: ShiftRef): string {
  return `${ref.day}|${ref.period}|${ref.role}|${ref.shiftIndex}`;
}

export function shiftsMatch(a: ShiftRef, b: ShiftRef): boolean {
  return shiftRefKey(a) === shiftRefKey(b);
}

export function listShiftsInPeriod(
  schedule: ScheduleData,
  day: DayKey,
  period: "AM" | "PM",
): ShiftListing[] {
  const dayBlock = schedule.days.find((entry) => entry.day === day);
  if (!dayBlock) return [];

  const periodBlock = dayBlock.mealPeriods.find((block) => block.period === period);
  if (!periodBlock) return [];

  const listings: ShiftListing[] = [];

  for (const roleBlock of periodBlock.roles) {
    roleBlock.shifts.forEach((shift, shiftIndex) => {
      listings.push({
        day,
        period,
        role: roleBlock.role,
        shiftIndex,
        employee: shift.employee,
        timeRange: shift.timeRange,
      });
    });
  }

  return listings;
}

function normalizeEmployeeKey(name: string): string {
  return name.trim().toLowerCase();
}

export function listAllEmployees(
  availability: AvailabilityData | null,
  schedule: ScheduleData,
): EmployeeOption[] {
  const seen = new Set<string>();
  const options: EmployeeOption[] = [];

  function addOption(employee: string, role: string) {
    const trimmed = employee.trim();
    if (!trimmed) return;

    const key = normalizeEmployeeKey(trimmed);
    if (seen.has(key)) return;

    seen.add(key);
    options.push({ employee: trimmed, role: role.trim() });
  }

  if (availability) {
    for (const entry of availability.employees) {
      addOption(entry.employee, entry.role);
    }
  }

  for (const day of schedule.days) {
    for (const periodBlock of day.mealPeriods) {
      for (const roleBlock of periodBlock.roles) {
        for (const shift of roleBlock.shifts) {
          addOption(shift.employee, roleBlock.role);
        }
      }
    }
  }

  return options.sort((left, right) =>
    left.employee.localeCompare(right.employee),
  );
}

export function assignShiftEmployee(
  schedule: ScheduleData,
  ref: ShiftRef,
  employee: string,
  shiftHours?: ShiftHoursSettings,
): ScheduleData {
  const shift = getShiftAtRef(schedule, ref);
  if (!shift) return schedule;

  const timeRange =
    shift.timeRange.trim() || defaultTimeForPeriod(ref.period, shiftHours);

  return normalizeScheduleAssignments({
    ...schedule,
    days: schedule.days.map((day) => {
      if (day.day !== ref.day) return day;

      return {
        ...day,
        mealPeriods: day.mealPeriods.map((periodBlock) => {
          if (periodBlock.period !== ref.period) return periodBlock;

          return {
            ...periodBlock,
            roles: periodBlock.roles.map((roleBlock) => {
              if (roleBlock.role !== ref.role) return roleBlock;

              return {
                ...roleBlock,
                shifts: roleBlock.shifts.map((entry, shiftIndex) =>
                  shiftIndex === ref.shiftIndex
                    ? { employee: employee.trim(), timeRange }
                    : entry,
                ),
              };
            }),
          };
        }),
      };
    }),
  });
}

export function clearShiftEmployee(
  schedule: ScheduleData,
  ref: ShiftRef,
): ScheduleData {
  const shift = getShiftAtRef(schedule, ref);
  if (!shift) return schedule;

  if (isFohManagementRole(ref.role)) {
    return normalizeScheduleAssignments({
      ...schedule,
      days: schedule.days.map((day) => {
        if (day.day !== ref.day) return day;

        return {
          ...day,
          mealPeriods: day.mealPeriods.map((periodBlock) => {
            if (periodBlock.period !== ref.period) return periodBlock;

            return {
              ...periodBlock,
              roles: periodBlock.roles.map((roleBlock) => {
                if (roleBlock.role !== ref.role) return roleBlock;

                return {
                  ...roleBlock,
                  shifts: roleBlock.shifts.map((entry, shiftIndex) =>
                    shiftIndex === ref.shiftIndex
                      ? { ...entry, employee: "", timeRange: "" }
                      : entry,
                  ),
                };
              }),
            };
          }),
        };
      }),
    });
  }

  return normalizeScheduleAssignments({
    ...schedule,
    days: schedule.days.map((day) => {
      if (day.day !== ref.day) return day;

      return {
        ...day,
        mealPeriods: day.mealPeriods.map((periodBlock) => {
          if (periodBlock.period !== ref.period) return periodBlock;

          return {
            ...periodBlock,
            roles: periodBlock.roles.map((roleBlock) => {
              if (roleBlock.role !== ref.role) return roleBlock;

              return {
                ...roleBlock,
                shifts: roleBlock.shifts.filter(
                  (_, shiftIndex) => shiftIndex !== ref.shiftIndex,
                ),
              };
            }),
          };
        }),
      };
    }),
  });
}

export function swapShiftEmployees(
  schedule: ScheduleData,
  source: ShiftRef,
  target: ShiftRef,
): ScheduleData {
  const sourceShift = getShiftAtRef(schedule, source);
  const targetShift = getShiftAtRef(schedule, target);
  if (!sourceShift || !targetShift) return schedule;

  const sourceEmployee = sourceShift.employee;
  const targetEmployee = targetShift.employee;

  return normalizeScheduleAssignments({
    ...schedule,
    days: schedule.days.map((day) => ({
      ...day,
      mealPeriods: day.mealPeriods.map((periodBlock) => ({
        ...periodBlock,
        roles: periodBlock.roles.map((roleBlock) => ({
          ...roleBlock,
          shifts: roleBlock.shifts.map((shift, shiftIndex) => {
            const ref: ShiftRef = {
              day: day.day,
              period: periodBlock.period,
              role: roleBlock.role,
              shiftIndex,
            };

            if (shiftsMatch(ref, source)) {
              return { ...shift, employee: targetEmployee };
            }
            if (shiftsMatch(ref, target)) {
              return { ...shift, employee: sourceEmployee };
            }
            return shift;
          }),
        })),
      })),
    })),
  });
}

export function applyShiftHoursToSchedule(
  schedule: ScheduleData,
  shiftHours: ShiftHoursSettings,
): ScheduleData {
  return normalizeScheduleAssignments({
    ...schedule,
    days: schedule.days.map((day) => ({
      ...day,
      mealPeriods: day.mealPeriods.map((periodBlock) => ({
        ...periodBlock,
        roles: periodBlock.roles.map((roleBlock) => ({
          ...roleBlock,
          shifts: roleBlock.shifts.map((shift) => {
            if (!shift.employee.trim()) {
              return isFohManagementRole(roleBlock.role)
                ? { ...shift, timeRange: "" }
                : shift;
            }

            return {
              ...shift,
              timeRange: timeRangeForPeriod(periodBlock.period, shiftHours),
            };
          }),
        })),
      })),
    })),
  });
}

export function updateShiftTimeRange(
  schedule: ScheduleData,
  ref: ShiftRef,
  timeRange: string,
): ScheduleData {
  return {
    ...schedule,
    days: schedule.days.map((day) => {
      if (day.day !== ref.day) return day;

      return {
        ...day,
        mealPeriods: day.mealPeriods.map((periodBlock) => {
          if (periodBlock.period !== ref.period) return periodBlock;

          return {
            ...periodBlock,
            roles: periodBlock.roles.map((roleBlock) => {
              if (roleBlock.role !== ref.role) return roleBlock;

              return {
                ...roleBlock,
                shifts: roleBlock.shifts.map((shift, shiftIndex) =>
                  shiftIndex === ref.shiftIndex ? { ...shift, timeRange } : shift,
                ),
              };
            }),
          };
        }),
      };
    }),
  };
}

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
import { isEmployeeAvailableForPeriod } from "@/lib/availability-utils";
import { isScheduleDayLocked } from "@/lib/schedule-day-lock";
import type {
  AvailabilityData,
  RoleBlock,
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

export interface RoleRef {
  day: DayKey;
  period: "AM" | "PM";
  role: string;
}

export interface ShiftListing extends ShiftRef {
  employee: string;
  timeRange: string;
}

export interface EmployeeOption {
  employee: string;
  role: string;
  /** False when the target shift falls outside this employee's availability. */
  availableForShift?: boolean;
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
  shiftContext?: { day: DayKey; period: "AM" | "PM" },
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

  const sorted = options.sort((left, right) =>
    left.employee.localeCompare(right.employee),
  );

  if (!shiftContext || !availability) {
    return sorted;
  }

  return sorted.map((option) => ({
    ...option,
    availableForShift: isEmployeeAvailableForPeriod(
      availability,
      option.employee,
      shiftContext.day,
      shiftContext.period,
    ),
  }));
}

function rolesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function addRoleToPeriod(
  schedule: ScheduleData,
  target: RoleRef,
  roleName: string,
): ScheduleData {
  const trimmedRole = roleName.trim();
  if (!trimmedRole) return schedule;

  return normalizeScheduleAssignments({
    ...schedule,
    days: schedule.days.map((day) => {
      if (day.day !== target.day) return day;

      const mealPeriods = [...day.mealPeriods];
      let periodIndex = mealPeriods.findIndex(
        (block) => block.period === target.period,
      );

      if (periodIndex < 0) {
        mealPeriods.push({ period: target.period, roles: [] });
        periodIndex = mealPeriods.length - 1;
      }

      const periodBlock = mealPeriods[periodIndex];
      if (periodBlock.roles.some((roleBlock) => rolesMatch(roleBlock.role, trimmedRole))) {
        return day;
      }

      const newRoleBlock: RoleBlock = {
        role: trimmedRole,
        shifts: [{ employee: "", timeRange: "" }],
      };

      const roles = [...periodBlock.roles];
      const afterIndex = roles.findIndex((roleBlock) =>
        rolesMatch(roleBlock.role, target.role),
      );

      if (afterIndex >= 0) {
        roles.splice(afterIndex + 1, 0, newRoleBlock);
      } else {
        roles.push(newRoleBlock);
      }

      mealPeriods[periodIndex] = { ...periodBlock, roles };

      return { ...day, mealPeriods };
    }),
  });
}

export function addShiftToRole(
  schedule: ScheduleData,
  ref: RoleRef,
  employee: string,
  shiftHours?: ShiftHoursSettings,
): ScheduleData {
  const trimmedEmployee = employee.trim();
  const timeRange = trimmedEmployee
    ? defaultTimeForPeriod(ref.period, shiftHours, ref.day)
    : "";

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
                shifts: [
                  ...roleBlock.shifts,
                  { employee: trimmedEmployee, timeRange },
                ],
              };
            }),
          };
        }),
      };
    }),
  });
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
    shift.timeRange.trim() ||
    defaultTimeForPeriod(ref.period, shiftHours, ref.day);

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
    days: schedule.days.map((day) => {
      if (isScheduleDayLocked(day)) return day;

      return {
        ...day,
        mealPeriods: day.mealPeriods.map((periodBlock) => ({
          ...periodBlock,
          roles: periodBlock.roles.map((roleBlock) => ({
            ...roleBlock,
            shifts: roleBlock.shifts.map((shift) => {
              if (!shift.employee.trim()) {
                return isFohManagementRole(roleBlock.role)
                  ? { ...shift, timeRange: "", timeOverride: false }
                  : shift;
              }

              if (shift.timeOverride) return shift;

              return {
                ...shift,
                timeRange: timeRangeForPeriod(
                  periodBlock.period,
                  shiftHours,
                  day.day,
                ),
                timeOverride: false,
              };
            }),
          })),
        })),
      };
    }),
  });
}

export function updateShiftTimeRange(
  schedule: ScheduleData,
  ref: ShiftRef,
  timeRange: string,
  options?: { timeOverride?: boolean },
): ScheduleData {
  const timeOverride = options?.timeOverride ?? true;

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
                  shiftIndex === ref.shiftIndex
                    ? { ...shift, timeRange, timeOverride }
                    : shift,
                ),
              };
            }),
          };
        }),
      };
    }),
  };
}

export function getShiftTimeRange(
  schedule: ScheduleData,
  ref: ShiftRef,
): string {
  return getShiftAtRef(schedule, ref)?.timeRange ?? "";
}

import type { DayKey } from "@/lib/utils";
import {
  isFohManagementRole,
  normalizeScheduleAssignments,
} from "@/lib/schedule-management-roles";
import type { ScheduleData, ShiftAssignment } from "@/lib/types";

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

const TIME_TOKEN =
  /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
const SINGLE_TIME = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

export function parseShiftTimeRange(
  timeRange: string,
): { start: string; end: string } | null {
  const match = timeRange.match(TIME_TOKEN);
  if (!match) return null;
  return {
    start: normalizeTimeToken(match[1]),
    end: normalizeTimeToken(match[2]),
  };
}

export function formatShiftTimeRange(start: string, end: string): string {
  return `${normalizeTimeToken(start)} - ${normalizeTimeToken(end)}`;
}

export function isValidTimeToken(value: string): boolean {
  return SINGLE_TIME.test(value.trim());
}

function normalizeTimeToken(value: string): string {
  const match = value.trim().match(SINGLE_TIME);
  if (!match) return value.trim();
  const hour = Number.parseInt(match[1], 10);
  return `${hour}:${match[2]} ${match[3].toUpperCase()}`;
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

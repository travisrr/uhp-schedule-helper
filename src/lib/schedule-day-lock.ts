import type { ScheduleData, ScheduleDay } from "./types";
import type { DayKey } from "./utils";

export function isScheduleDayLocked(day: ScheduleDay): boolean {
  return day.locked === true;
}

export function setScheduleDayLocked(
  schedule: ScheduleData,
  dayKey: DayKey,
  locked: boolean,
): ScheduleData {
  return {
    ...schedule,
    days: schedule.days.map((day) =>
      day.day === dayKey ? { ...day, locked } : day,
    ),
  };
}

/** Keep locked days from the existing schedule when applying a regenerated schedule. */
export function mergeSchedulePreservingLockedDays(
  existing: ScheduleData | null | undefined,
  incoming: ScheduleData,
): ScheduleData {
  if (!existing) return incoming;

  return {
    ...incoming,
    days: incoming.days.map((incomingDay) => {
      const existingDay = existing.days.find((day) => day.day === incomingDay.day);
      if (!existingDay || !isScheduleDayLocked(existingDay)) {
        return incomingDay;
      }

      return {
        ...existingDay,
        dateLabel: incomingDay.dateLabel,
        mealPeriods: structuredClone(existingDay.mealPeriods),
        locked: true,
      };
    }),
  };
}

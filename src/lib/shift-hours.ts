import { formatShiftTimeRange, isValidTimeToken } from "@/lib/time-format";
import { isWeekendDay, type DayKey } from "@/lib/utils";

export interface ApplyShiftHoursScope {
  weekdayAm: boolean;
  weekdayPm: boolean;
  weekend: boolean;
}

export const DEFAULT_APPLY_SHIFT_HOURS_SCOPE: ApplyShiftHoursScope = {
  weekdayAm: true,
  weekdayPm: true,
  weekend: true,
};

export function shouldApplyShiftHours(
  scope: ApplyShiftHoursScope,
  day: DayKey,
  period: "AM" | "PM",
): boolean {
  if (isWeekendDay(day)) return scope.weekend;
  return period === "AM" ? scope.weekdayAm : scope.weekdayPm;
}

export function hasApplyShiftHoursScope(scope: ApplyShiftHoursScope): boolean {
  return scope.weekdayAm || scope.weekdayPm || scope.weekend;
}

export interface PeriodHours {
  start: string;
  end: string;
}

export interface DayShiftHours {
  am: PeriodHours;
  pm: PeriodHours;
}

export interface ShiftHoursSettings {
  am: PeriodHours;
  pm: PeriodHours;
  weekend: {
    sat: DayShiftHours;
    sun: DayShiftHours;
  };
}

export const DEFAULT_SHIFT_HOURS: ShiftHoursSettings = {
  am: { start: "10:30 AM", end: "4:00 PM" },
  pm: { start: "4:00 PM", end: "10:00 PM" },
  weekend: {
    sat: {
      am: { start: "10:30 AM", end: "4:00 PM" },
      pm: { start: "4:00 PM", end: "10:00 PM" },
    },
    sun: {
      am: { start: "10:30 AM", end: "4:00 PM" },
      pm: { start: "4:00 PM", end: "10:00 PM" },
    },
  },
};

export function createDefaultShiftHours(): ShiftHoursSettings {
  return {
    am: { ...DEFAULT_SHIFT_HOURS.am },
    pm: { ...DEFAULT_SHIFT_HOURS.pm },
    weekend: {
      sat: {
        am: { ...DEFAULT_SHIFT_HOURS.weekend.sat.am },
        pm: { ...DEFAULT_SHIFT_HOURS.weekend.sat.pm },
      },
      sun: {
        am: { ...DEFAULT_SHIFT_HOURS.weekend.sun.am },
        pm: { ...DEFAULT_SHIFT_HOURS.weekend.sun.pm },
      },
    },
  };
}

function isPeriodHours(value: unknown): value is PeriodHours {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PeriodHours>;
  return (
    typeof candidate.start === "string" && typeof candidate.end === "string"
  );
}

function normalizeDayShiftHours(
  value: unknown,
  fallback: DayShiftHours,
): DayShiftHours {
  if (!value || typeof value !== "object") {
    return {
      am: { ...fallback.am },
      pm: { ...fallback.pm },
    };
  }

  const candidate = value as Partial<DayShiftHours>;
  const am = isPeriodHours(candidate.am) ? candidate.am : fallback.am;
  const pm = isPeriodHours(candidate.pm) ? candidate.pm : fallback.pm;

  return {
    am: { start: am.start, end: am.end },
    pm: { start: pm.start, end: pm.end },
  };
}

export function normalizeShiftHours(value: unknown): ShiftHoursSettings {
  if (!value || typeof value !== "object") {
    return createDefaultShiftHours();
  }

  const candidate = value as Partial<ShiftHoursSettings>;
  const am = isPeriodHours(candidate.am)
    ? candidate.am
    : DEFAULT_SHIFT_HOURS.am;
  const pm = isPeriodHours(candidate.pm)
    ? candidate.pm
    : DEFAULT_SHIFT_HOURS.pm;
  const weekdayFallback: DayShiftHours = { am, pm };

  return {
    am: { start: am.start, end: am.end },
    pm: { start: pm.start, end: pm.end },
    weekend: {
      sat: normalizeDayShiftHours(candidate.weekend?.sat, weekdayFallback),
      sun: normalizeDayShiftHours(candidate.weekend?.sun, weekdayFallback),
    },
  };
}

export function isValidPeriodHours(hours: PeriodHours): boolean {
  return isValidTimeToken(hours.start) && isValidTimeToken(hours.end);
}

export function isValidDayShiftHours(hours: DayShiftHours): boolean {
  return isValidPeriodHours(hours.am) && isValidPeriodHours(hours.pm);
}

export function isValidShiftHours(settings: ShiftHoursSettings): boolean {
  return (
    isValidPeriodHours(settings.am) &&
    isValidPeriodHours(settings.pm) &&
    isValidDayShiftHours(settings.weekend.sat) &&
    isValidDayShiftHours(settings.weekend.sun)
  );
}

function periodHoursEqual(left: PeriodHours, right: PeriodHours): boolean {
  return left.start === right.start && left.end === right.end;
}

function dayShiftHoursEqual(left: DayShiftHours, right: DayShiftHours): boolean {
  return (
    periodHoursEqual(left.am, right.am) &&
    periodHoursEqual(left.pm, right.pm)
  );
}

export function shiftHoursEqual(
  left: ShiftHoursSettings,
  right: ShiftHoursSettings,
): boolean {
  return (
    periodHoursEqual(left.am, right.am) &&
    periodHoursEqual(left.pm, right.pm) &&
    dayShiftHoursEqual(left.weekend.sat, right.weekend.sat) &&
    dayShiftHoursEqual(left.weekend.sun, right.weekend.sun)
  );
}

export function formatPeriodTimeRange(hours: PeriodHours): string {
  return formatShiftTimeRange(hours.start, hours.end);
}

export function periodHoursForShift(
  settings: ShiftHoursSettings,
  day: DayKey,
  period: "AM" | "PM",
): PeriodHours {
  if (day === "Sat") {
    return period === "AM"
      ? settings.weekend.sat.am
      : settings.weekend.sat.pm;
  }

  if (day === "Sun") {
    return period === "AM"
      ? settings.weekend.sun.am
      : settings.weekend.sun.pm;
  }

  return period === "AM" ? settings.am : settings.pm;
}

export function timeRangeForPeriod(
  period: "AM" | "PM",
  settings: ShiftHoursSettings = DEFAULT_SHIFT_HOURS,
  day?: DayKey,
): string {
  const hours = day
    ? periodHoursForShift(settings, day, period)
    : period === "AM"
      ? settings.am
      : settings.pm;

  return formatPeriodTimeRange(hours);
}

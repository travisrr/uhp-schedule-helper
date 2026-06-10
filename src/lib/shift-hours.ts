import { formatShiftTimeRange, isValidTimeToken } from "@/lib/time-format";

export interface PeriodHours {
  start: string;
  end: string;
}

export interface ShiftHoursSettings {
  am: PeriodHours;
  pm: PeriodHours;
}

export const DEFAULT_SHIFT_HOURS: ShiftHoursSettings = {
  am: { start: "10:30 AM", end: "4:00 PM" },
  pm: { start: "4:00 PM", end: "10:00 PM" },
};

export function createDefaultShiftHours(): ShiftHoursSettings {
  return {
    am: { ...DEFAULT_SHIFT_HOURS.am },
    pm: { ...DEFAULT_SHIFT_HOURS.pm },
  };
}

function isPeriodHours(value: unknown): value is PeriodHours {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PeriodHours>;
  return (
    typeof candidate.start === "string" && typeof candidate.end === "string"
  );
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

  return {
    am: { start: am.start, end: am.end },
    pm: { start: pm.start, end: pm.end },
  };
}

export function isValidPeriodHours(hours: PeriodHours): boolean {
  return isValidTimeToken(hours.start) && isValidTimeToken(hours.end);
}

export function isValidShiftHours(settings: ShiftHoursSettings): boolean {
  return isValidPeriodHours(settings.am) && isValidPeriodHours(settings.pm);
}

export function formatPeriodTimeRange(hours: PeriodHours): string {
  return formatShiftTimeRange(hours.start, hours.end);
}

export function timeRangeForPeriod(
  period: "AM" | "PM",
  settings: ShiftHoursSettings = DEFAULT_SHIFT_HOURS,
): string {
  return period === "AM"
    ? formatPeriodTimeRange(settings.am)
    : formatPeriodTimeRange(settings.pm);
}

import type { ScheduleData } from "./types";
import type { DayKey } from "./utils";

export interface EmployeeWeeklyStats {
  employee: string;
  totalHours: number;
  totalShifts: number;
  amShifts: number;
  pmShifts: number;
  weekendShifts: number;
}

const WEEKEND_DAYS = new Set<DayKey>(["Sat", "Sun"]);

function parseTimeToMinutes(time: string): number | null {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function hoursFromTimeRange(timeRange: string): number | null {
  const match = timeRange.match(
    /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i,
  );
  if (!match) return null;

  const start = parseTimeToMinutes(match[1]);
  const end = parseTimeToMinutes(match[2]);
  if (start === null || end === null) return null;

  let durationMinutes = end - start;
  if (durationMinutes <= 0) durationMinutes += 24 * 60;

  return durationMinutes / 60;
}

export function normalizeEmployeeKey(name: string): string {
  return name.trim().toLowerCase();
}

function employeeWeeklyStatsEqual(
  left: EmployeeWeeklyStats,
  right: EmployeeWeeklyStats,
): boolean {
  return (
    left.totalHours === right.totalHours &&
    left.totalShifts === right.totalShifts &&
    left.amShifts === right.amShifts &&
    left.pmShifts === right.pmShifts &&
    left.weekendShifts === right.weekendShifts
  );
}

/** Returns employee keys whose weekly totals differ from the previous snapshot. */
export function findChangedEmployeeKeys(
  previous: Map<string, EmployeeWeeklyStats>,
  current: EmployeeWeeklyStats[],
): Set<string> {
  const changed = new Set<string>();
  const currentByKey = new Map(
    current.map((entry) => [normalizeEmployeeKey(entry.employee), entry]),
  );

  for (const [key, entry] of currentByKey) {
    const prior = previous.get(key);
    if (!prior || !employeeWeeklyStatsEqual(prior, entry)) {
      changed.add(key);
    }
  }

  return changed;
}

export function formatWeeklyHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Stable fingerprint for React keys when shift assignments change. */
export function scheduleAssignmentFingerprint(schedule: ScheduleData): string {
  const parts: string[] = [];

  for (const day of schedule.days) {
    for (const period of day.mealPeriods) {
      for (const roleBlock of period.roles) {
        for (const shift of roleBlock.shifts) {
          parts.push(
            `${day.day}|${period.period}|${roleBlock.role}|${shift.employee}|${shift.timeRange}`,
          );
        }
      }
    }
  }

  return parts.join("\n");
}

export function computeEmployeeWeeklyStats(
  schedule: ScheduleData,
): EmployeeWeeklyStats[] {
  const byKey = new Map<string, EmployeeWeeklyStats>();

  for (const day of schedule.days) {
    for (const period of day.mealPeriods) {
      for (const roleBlock of period.roles) {
        for (const shift of roleBlock.shifts) {
          const trimmed = shift.employee.trim();
          if (!trimmed) continue;

          const key = normalizeEmployeeKey(trimmed);
          const existing = byKey.get(key);

          const isWeekend = WEEKEND_DAYS.has(day.day);

          if (existing) {
            existing.totalShifts += 1;
            if (period.period === "AM") existing.amShifts += 1;
            else existing.pmShifts += 1;
            if (isWeekend) existing.weekendShifts += 1;

            const hours = hoursFromTimeRange(shift.timeRange);
            if (hours !== null) existing.totalHours += hours;
            continue;
          }

          const hours = hoursFromTimeRange(shift.timeRange);
          byKey.set(key, {
            employee: trimmed,
            totalHours: hours ?? 0,
            totalShifts: 1,
            amShifts: period.period === "AM" ? 1 : 0,
            pmShifts: period.period === "PM" ? 1 : 0,
            weekendShifts: isWeekend ? 1 : 0,
          });
        }
      }
    }
  }

  return [...byKey.values()].sort((a, b) => {
    if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours;
    return a.employee.localeCompare(b.employee, undefined, {
      sensitivity: "base",
    });
  });
}

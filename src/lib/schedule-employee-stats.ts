import type { ScheduleData } from "./types";

export interface EmployeeWeeklyStats {
  employee: string;
  totalHours: number;
  totalShifts: number;
  amShifts: number;
  pmShifts: number;
}

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

function normalizeEmployeeName(name: string): string {
  return name.trim().toLowerCase();
}

export function formatWeeklyHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function computeEmployeeWeeklyStats(
  schedule: ScheduleData,
): EmployeeWeeklyStats[] {
  const byKey = new Map<string, EmployeeWeeklyStats>();

  for (const day of schedule.days) {
    for (const period of day.mealPeriods) {
      for (const roleBlock of period.roles) {
        for (const shift of roleBlock.shifts) {
          const key = normalizeEmployeeName(shift.employee);
          const existing = byKey.get(key);

          if (existing) {
            existing.totalShifts += 1;
            if (period.period === "AM") existing.amShifts += 1;
            else existing.pmShifts += 1;

            const hours = hoursFromTimeRange(shift.timeRange);
            if (hours !== null) existing.totalHours += hours;
            continue;
          }

          const hours = hoursFromTimeRange(shift.timeRange);
          byKey.set(key, {
            employee: shift.employee.trim(),
            totalHours: hours ?? 0,
            totalShifts: 1,
            amShifts: period.period === "AM" ? 1 : 0,
            pmShifts: period.period === "PM" ? 1 : 0,
          });
        }
      }
    }
  }

  return [...byKey.values()].sort((a, b) =>
    a.employee.localeCompare(b.employee, undefined, { sensitivity: "base" }),
  );
}

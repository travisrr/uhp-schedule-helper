import { hoursFromTimeRange } from "./schedule-employee-stats";
import type { ScheduleData } from "./types";

export interface ScheduleRibbonMetrics {
  totalShiftSlots: number;
  assignedShifts: number;
  totalHours: number | null;
}

export function computeScheduleRibbonMetrics(
  schedule: ScheduleData,
): ScheduleRibbonMetrics {
  let totalShiftSlots = 0;
  let assignedShifts = 0;
  let computedHours = 0;
  let hasComputedHours = false;

  for (const day of schedule.days) {
    for (const period of day.mealPeriods) {
      for (const roleBlock of period.roles) {
        for (const shift of roleBlock.shifts) {
          totalShiftSlots += 1;

          const employee = shift.employee.trim();
          if (!employee) continue;

          assignedShifts += 1;
          const hours = hoursFromTimeRange(shift.timeRange);
          if (hours !== null) {
            computedHours += hours;
            hasComputedHours = true;
          }
        }
      }
    }
  }

  return {
    totalShiftSlots,
    assignedShifts,
    totalHours: hasComputedHours
      ? computedHours
      : schedule.metrics.totalHours,
  };
}

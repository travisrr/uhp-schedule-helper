import type { DayKey } from "./utils";

export type AvailabilityStatus =
  | "OPEN"
  | "Only AM"
  | "Only PM"
  | "OFF"
  | string;

export interface EmployeeAvailability {
  employee: string;
  role: string;
  days: Record<DayKey, AvailabilityStatus>;
  totalShifts: number | null;
}

export interface AvailabilityData {
  employees: EmployeeAvailability[];
}

export interface ShiftAssignment {
  employee: string;
  timeRange: string;
}

export interface RoleBlock {
  role: string;
  shifts: ShiftAssignment[];
}

export interface MealPeriodBlock {
  period: "AM" | "PM";
  roles: RoleBlock[];
}

export interface ScheduleDay {
  day: DayKey;
  dateLabel?: string | null;
  mealPeriods: MealPeriodBlock[];
}

export interface ScheduleMetrics {
  totalHours: number | null;
  totalPay: number | null;
  forecastedSales: number | null;
  actualLaborCostPercent: number | null;
}

export interface ScheduleData {
  metrics: ScheduleMetrics;
  generatedAt?: string | null;
  /** ISO date (YYYY-MM-DD) for the Wednesday starting this Wed–Tue week. */
  weekStartDate?: string | null;
  days: ScheduleDay[];
}

export interface PriorSchedule {
  schedule: ScheduleData;
  fileName: string;
  importedAt: string;
}

export interface AppDataState {
  availability: AvailabilityData | null;
  schedule: ScheduleData | null;
  /** Imported prior-week schedule used as a template when generating new schedules. */
  priorSchedule: PriorSchedule | null;
  /** ISO date (YYYY-MM-DD) for the selected Wed–Tue scheduling week. */
  selectedWeekStart: string | null;
}

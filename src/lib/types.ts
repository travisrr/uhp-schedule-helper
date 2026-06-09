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
  days: ScheduleDay[];
}

export interface AppDataState {
  availability: AvailabilityData | null;
  schedule: ScheduleData | null;
}

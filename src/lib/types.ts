import type { DayKey } from "./utils";
import type { ShiftHoursSettings } from "./shift-hours";

export type AvailabilityStatus =
  | "OPEN"
  | "AM ONLY"
  | "PM ONLY"
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
  /** When true, global "Apply shift hours" skips this shift. */
  timeOverride?: boolean;
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
  /** Default start/end times applied to AM and PM shifts. */
  shiftHours: ShiftHoursSettings;
}

export interface StoredManifest {
  availabilityFile: string | null;
  scheduleFile: string | null;
  priorScheduleFile: string | null;
  updatedAt: string | null;
}

export interface PersistedAppState extends AppDataState {
  manifest: StoredManifest;
}

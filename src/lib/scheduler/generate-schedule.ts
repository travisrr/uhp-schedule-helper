import type {
  AvailabilityData,
  AvailabilityStatus,
  MealPeriodBlock,
  RoleBlock,
  ScheduleData,
  ScheduleDay,
  ShiftAssignment,
} from "../types";
import { DAYS, type DayKey } from "../utils";
import {
  buildDayDateLabels,
  formatGeneratedTimestamp,
  toISODateString,
} from "../week-utils";

const DEFAULT_AM_TIME = "10:30 AM - 4:00 PM";
const DEFAULT_PM_TIME = "4:00 PM - 10:00 PM";

function canWorkAM(status: AvailabilityStatus): boolean {
  const trimmed = status.trim();
  if (!trimmed || trimmed.toUpperCase() === "OFF") return false;
  if (trimmed.toUpperCase() === "OPEN") return true;
  return /only\s*am/i.test(trimmed);
}

function canWorkPM(status: AvailabilityStatus): boolean {
  const trimmed = status.trim();
  if (!trimmed || trimmed.toUpperCase() === "OFF") return false;
  if (trimmed.toUpperCase() === "OPEN") return true;
  return /only\s*pm/i.test(trimmed);
}

function getRoleName(role: string): string {
  const trimmed = role.trim();
  return trimmed || "Staff";
}

function sortShifts(shifts: ShiftAssignment[]): ShiftAssignment[] {
  return [...shifts].sort((a, b) =>
    a.employee.localeCompare(b.employee, undefined, { sensitivity: "base" }),
  );
}

function buildRoleBlocks(
  assignments: Map<string, ShiftAssignment[]>,
): RoleBlock[] {
  return [...assignments.entries()]
    .sort(([roleA], [roleB]) =>
      roleA.localeCompare(roleB, undefined, { sensitivity: "base" }),
    )
    .map(([role, shifts]) => ({
      role,
      shifts: sortShifts(shifts),
    }));
}

function createEmptyDay(day: DayKey, dateLabel: string): ScheduleDay {
  return {
    day,
    dateLabel,
    mealPeriods: [
      { period: "AM", roles: [] },
      { period: "PM", roles: [] },
    ],
  };
}

function getMealBlock(day: ScheduleDay, period: "AM" | "PM"): MealPeriodBlock {
  return (
    day.mealPeriods.find((block) => block.period === period) ?? {
      period,
      roles: [],
    }
  );
}

interface PriorShiftTemplate {
  role: string;
  timeRange: string;
}

type PriorDayLookup = Map<"AM" | "PM", PriorShiftTemplate>;
type PriorEmployeeLookup = Map<string, Map<DayKey, PriorDayLookup>>;

function normalizeEmployeeName(name: string): string {
  return name.trim().toLowerCase();
}

function buildPriorScheduleLookup(schedule: ScheduleData): PriorEmployeeLookup {
  const lookup: PriorEmployeeLookup = new Map();

  for (const day of schedule.days) {
    for (const mealPeriod of day.mealPeriods) {
      for (const roleBlock of mealPeriod.roles) {
        for (const shift of roleBlock.shifts) {
          const employeeKey = normalizeEmployeeName(shift.employee);
          if (!employeeKey) continue;

          let dayLookup = lookup.get(employeeKey);
          if (!dayLookup) {
            dayLookup = new Map();
            lookup.set(employeeKey, dayLookup);
          }

          let periodLookup = dayLookup.get(day.day);
          if (!periodLookup) {
            periodLookup = new Map();
            dayLookup.set(day.day, periodLookup);
          }

          periodLookup.set(mealPeriod.period, {
            role: getRoleName(roleBlock.role),
            timeRange: shift.timeRange.trim() || (
              mealPeriod.period === "AM" ? DEFAULT_AM_TIME : DEFAULT_PM_TIME
            ),
          });
        }
      }
    }
  }

  return lookup;
}

function addShiftToRoleMap(
  roleMap: Map<string, ShiftAssignment[]>,
  role: string,
  shift: ShiftAssignment,
): void {
  const shifts = roleMap.get(role) ?? [];
  shifts.push(shift);
  roleMap.set(role, shifts);
}

export function generateScheduleFromAvailability(
  availability: AvailabilityData,
  weekStartWednesday: Date,
  priorSchedule?: ScheduleData | null,
): ScheduleData {
  const dateLabels = buildDayDateLabels(weekStartWednesday);
  const priorLookup = priorSchedule
    ? buildPriorScheduleLookup(priorSchedule)
    : null;

  const days = DAYS.map((dayKey) => {
    const day = createEmptyDay(dayKey, dateLabels[dayKey]);
    const amByRole = new Map<string, ShiftAssignment[]>();
    const pmByRole = new Map<string, ShiftAssignment[]>();

    for (const employee of availability.employees) {
      const status = employee.days[dayKey];
      const employeeKey = normalizeEmployeeName(employee.employee);
      const priorDay = priorLookup?.get(employeeKey)?.get(dayKey);

      if (canWorkAM(status)) {
        const priorAM = priorDay?.get("AM");
        const role = priorAM?.role ?? getRoleName(employee.role);
        const timeRange = priorAM?.timeRange ?? DEFAULT_AM_TIME;
        addShiftToRoleMap(amByRole, role, {
          employee: employee.employee,
          timeRange,
        });
      }

      if (canWorkPM(status)) {
        const priorPM = priorDay?.get("PM");
        const role = priorPM?.role ?? getRoleName(employee.role);
        const timeRange = priorPM?.timeRange ?? DEFAULT_PM_TIME;
        addShiftToRoleMap(pmByRole, role, {
          employee: employee.employee,
          timeRange,
        });
      }
    }

    const amBlock = getMealBlock(day, "AM");
    const pmBlock = getMealBlock(day, "PM");
    amBlock.roles = buildRoleBlocks(amByRole);
    pmBlock.roles = buildRoleBlocks(pmByRole);

    return day;
  });

  return {
    metrics: {
      totalHours: null,
      totalPay: null,
      forecastedSales: null,
      actualLaborCostPercent: null,
    },
    generatedAt: formatGeneratedTimestamp(new Date()),
    weekStartDate: toISODateString(weekStartWednesday),
    days,
  };
}

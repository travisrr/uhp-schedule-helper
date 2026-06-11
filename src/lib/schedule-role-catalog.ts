import type { AvailabilityData, ScheduleData } from "@/lib/types";
import type { DayKey } from "@/lib/utils";
import {
  DEFAULT_AM_MANAGEMENT_ROLE,
  DEFAULT_PM_MANAGEMENT_ROLE,
} from "@/lib/schedule-management-roles";

export interface MealPeriodRef {
  day: DayKey;
  period: "AM" | "PM";
}

function rolesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/** Map availability roster labels to schedule role headers. */
export function availabilityRoleToScheduleRole(role: string): string {
  const trimmed = role.trim();
  if (!trimmed) return trimmed;
  if (/\(from schedule\)/i.test(trimmed)) return trimmed;

  const withoutSuffix = trimmed
    .replace(/\s*-\s*(FOH|BOH|Management)\s*$/i, "")
    .trim();

  return `${withoutSuffix} (from Schedule)`;
}

function collectRoleNamesFromSchedule(
  schedule: ScheduleData | null | undefined,
): string[] {
  if (!schedule) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const day of schedule.days) {
    for (const periodBlock of day.mealPeriods) {
      for (const roleBlock of periodBlock.roles) {
        const role = roleBlock.role.trim();
        if (!role) continue;

        const key = role.toLowerCase();
        if (seen.has(key)) continue;

        seen.add(key);
        names.push(role);
      }
    }
  }

  return names;
}

function collectRoleNamesFromAvailability(
  availability: AvailabilityData | null | undefined,
): string[] {
  if (!availability) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const employee of availability.employees) {
    const role = availabilityRoleToScheduleRole(employee.role);
    if (!role) continue;

    const key = role.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    names.push(role);
  }

  return names;
}

export function listRolesInPeriod(
  schedule: ScheduleData,
  day: DayKey,
  period: "AM" | "PM",
): string[] {
  const dayBlock = schedule.days.find((entry) => entry.day === day);
  const periodBlock = dayBlock?.mealPeriods.find((block) => block.period === period);
  return periodBlock?.roles.map((roleBlock) => roleBlock.role) ?? [];
}

export function listAddableRoles(
  schedule: ScheduleData,
  availability: AvailabilityData | null,
  priorSchedule: ScheduleData | null | undefined,
  target: MealPeriodRef,
): string[] {
  const existing = new Set(
    listRolesInPeriod(schedule, target.day, target.period).map((role) =>
      role.toLowerCase(),
    ),
  );

  const catalog = new Set<string>();

  for (const role of [
    ...collectRoleNamesFromSchedule(schedule),
    ...collectRoleNamesFromSchedule(priorSchedule),
    ...collectRoleNamesFromAvailability(availability),
    DEFAULT_AM_MANAGEMENT_ROLE,
    DEFAULT_PM_MANAGEMENT_ROLE,
  ]) {
    const trimmed = role.trim();
    if (!trimmed) continue;
    if (existing.has(trimmed.toLowerCase())) continue;
    catalog.add(trimmed);
  }

  return [...catalog].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" }),
  );
}

export function isRoleInPeriod(
  schedule: ScheduleData,
  target: MealPeriodRef,
  roleName: string,
): boolean {
  return listRolesInPeriod(schedule, target.day, target.period).some((role) =>
    rolesMatch(role, roleName),
  );
}

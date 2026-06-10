import type {
  MealPeriodBlock,
  RoleBlock,
  ScheduleData,
  ScheduleDay,
  ShiftAssignment,
} from "./types";

export const DEFAULT_AM_MANAGEMENT_ROLE = "FOH Manager (from Schedule)";
export const DEFAULT_PM_MANAGEMENT_ROLE =
  "Shift Supervisor (Hourly) (from Schedule)";

const DEFAULT_AM_TIME = "10:30 AM - 4:00 PM";
const DEFAULT_PM_TIME = "4:00 PM - 10:00 PM";

export function isFohManagementRole(role: string): boolean {
  const lower = role.trim().toLowerCase();
  if (lower.includes("boh")) return false;
  return (
    lower.includes("shift supervisor") || lower.includes("foh manager")
  );
}

export function defaultManagementRoleForPeriod(period: "AM" | "PM"): string {
  return period === "AM" ? DEFAULT_AM_MANAGEMENT_ROLE : DEFAULT_PM_MANAGEMENT_ROLE;
}

export function defaultTimeForPeriod(period: "AM" | "PM"): string {
  return period === "AM" ? DEFAULT_AM_TIME : DEFAULT_PM_TIME;
}

function createEmptyManagementShift(): ShiftAssignment {
  return {
    employee: "",
    timeRange: "",
  };
}

export function ensureManagementSlot(
  roles: RoleBlock[],
  period: "AM" | "PM",
): RoleBlock[] {
  const next = roles.map((role) => ({
    ...role,
    shifts: [...role.shifts],
  }));

  const managementIndex = next.findIndex((role) =>
    isFohManagementRole(role.role),
  );

  if (managementIndex >= 0) {
    const managementRole = next[managementIndex];
    if (managementRole.shifts.length === 0) {
      managementRole.shifts.push(createEmptyManagementShift());
    }
    return next;
  }

  return [
    ...next,
    {
      role: defaultManagementRoleForPeriod(period),
      shifts: [createEmptyManagementShift()],
    },
  ];
}

export function ensureMealPeriodManagementSlot(
  block: MealPeriodBlock,
): MealPeriodBlock {
  return {
    ...block,
    roles: ensureManagementSlot(block.roles, block.period),
  };
}

export function ensureDayManagementSlots(day: ScheduleDay): ScheduleDay {
  const mealPeriods = [...day.mealPeriods];

  for (const period of ["AM", "PM"] as const) {
    let block = mealPeriods.find((entry) => entry.period === period);
    if (!block) {
      block = { period, roles: [] };
      mealPeriods.push(block);
    }

    const index = mealPeriods.findIndex((entry) => entry.period === period);
    mealPeriods[index] = ensureMealPeriodManagementSlot(block);
  }

  return { ...day, mealPeriods };
}

export function normalizeScheduleManagementSlots(
  schedule: ScheduleData,
): ScheduleData {
  return {
    ...schedule,
    days: schedule.days.map(ensureDayManagementSlots),
  };
}

function isAssignedShift(shift: ShiftAssignment): boolean {
  return shift.employee.trim().length > 0;
}

export function normalizeScheduleAssignments(
  schedule: ScheduleData,
): ScheduleData {
  const withoutGhostShifts: ScheduleData = {
    ...schedule,
    days: schedule.days.map((day) => ({
      ...day,
      mealPeriods: day.mealPeriods.map((periodBlock) => ({
        ...periodBlock,
        roles: periodBlock.roles.map((roleBlock) => ({
          ...roleBlock,
          shifts: roleBlock.shifts
            .filter((shift) => {
              if (isAssignedShift(shift)) return true;
              return isFohManagementRole(roleBlock.role);
            })
            .map((shift) =>
              isAssignedShift(shift)
                ? shift
                : { ...shift, timeRange: "" },
            ),
        })),
      })),
    })),
  };

  return normalizeScheduleManagementSlots(withoutGhostShifts);
}

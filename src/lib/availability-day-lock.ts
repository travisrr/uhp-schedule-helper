import { availabilityEmployeeKey } from "@/lib/availability-keys";
import { normalizeAvailabilityStatus } from "@/lib/availability-utils";
import type { AvailabilityData, EmployeeAvailability } from "@/lib/types";
import { DAYS, type DayKey } from "@/lib/utils";
import type { DayLockToggleState } from "@/lib/day-lock-toggle-state";

export function isAvailabilityDayLocked(
  availability: AvailabilityData,
  day: DayKey,
): boolean {
  return availability.lockedDays?.[day] === true;
}

export function isAvailabilityDayUploadProtected(
  availability: AvailabilityData,
  day: DayKey,
): boolean {
  return availability.uploadProtectedDays?.[day] === true;
}

export function getAvailabilityDayLockToggleState(
  availability: AvailabilityData,
  day: DayKey,
): DayLockToggleState {
  if (!isAvailabilityDayLocked(availability, day)) return "unlocked";
  if (isAvailabilityDayUploadProtected(availability, day)) {
    return "upload-protected";
  }
  return "locked";
}

export function setAvailabilityDayLocked(
  availability: AvailabilityData,
  day: DayKey,
  locked: boolean,
): AvailabilityData {
  const lockedDays = { ...availability.lockedDays };
  const uploadProtectedDays = { ...availability.uploadProtectedDays };

  if (locked) {
    lockedDays[day] = true;
  } else {
    delete lockedDays[day];
    delete uploadProtectedDays[day];
  }

  return {
    ...availability,
    lockedDays,
    uploadProtectedDays,
  };
}

function indexEmployees(
  employees: EmployeeAvailability[],
): Map<string, EmployeeAvailability> {
  const map = new Map<string, EmployeeAvailability>();
  for (const employee of employees) {
    map.set(availabilityEmployeeKey(employee), employee);
  }
  return map;
}

/** Keep locked day columns from the existing roster when applying a new upload. */
export function mergeAvailabilityPreservingLockedDays(
  existing: AvailabilityData | null | undefined,
  incoming: AvailabilityData,
): AvailabilityData {
  const lockedDays = { ...(existing?.lockedDays ?? {}) };
  const hasLockedDays = DAYS.some((day) => lockedDays[day] === true);

  if (!existing || !hasLockedDays) {
    return {
      ...incoming,
      lockedDays,
      uploadProtectedDays: {},
    };
  }

  const existingByKey = indexEmployees(existing.employees);
  const uploadProtectedDays: Partial<Record<DayKey, boolean>> = {};

  const employees = incoming.employees.map((incomingEmployee) => {
    const existingEmployee = existingByKey.get(
      availabilityEmployeeKey(incomingEmployee),
    );
    if (!existingEmployee) return incomingEmployee;

    const days = { ...incomingEmployee.days };

    for (const day of DAYS) {
      if (!lockedDays[day]) continue;

      const existingStatus = normalizeAvailabilityStatus(
        existingEmployee.days[day],
      );
      const incomingStatus = normalizeAvailabilityStatus(
        incomingEmployee.days[day],
      );

      if (existingStatus !== incomingStatus) {
        uploadProtectedDays[day] = true;
      }

      days[day] = existingEmployee.days[day];
    }

    return { ...incomingEmployee, days };
  });

  return {
    ...incoming,
    employees,
    lockedDays,
    uploadProtectedDays,
  };
}

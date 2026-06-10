import {
  availabilityEmployeeKey,
  normalizeAvailabilityRole,
} from "@/lib/availability-keys";
import type { AvailabilityData, EmployeeAvailability } from "@/lib/types";

export interface AvailabilityRoleChange {
  employee: string;
  previousRole: string;
  incomingRole: string;
  incoming: EmployeeAvailability;
}

export interface AvailabilityDiff {
  added: EmployeeAvailability[];
  roleChanges: AvailabilityRoleChange[];
  needsReview: boolean;
}

export type AvailabilityChangeKey = `add:${string}` | `role:${string}`;

function displayRole(role: string): string {
  const trimmed = role.trim();
  return trimmed || "—";
}

function indexByEmployeeRole(
  employees: EmployeeAvailability[],
): Map<string, EmployeeAvailability> {
  const map = new Map<string, EmployeeAvailability>();
  for (const employee of employees) {
    map.set(availabilityEmployeeKey(employee), employee);
  }
  return map;
}

export function computeAvailabilityDiff(
  current: AvailabilityData | null,
  incoming: AvailabilityData,
): AvailabilityDiff {
  if (!current || current.employees.length === 0) {
    return { added: [], roleChanges: [], needsReview: false };
  }

  const currentByKey = indexByEmployeeRole(current.employees);
  const added: EmployeeAvailability[] = [];
  const roleChanges: AvailabilityRoleChange[] = [];

  for (const employee of incoming.employees) {
    const key = availabilityEmployeeKey(employee);
    const existing = currentByKey.get(key);

    if (!existing) {
      added.push(employee);
      continue;
    }

    if (
      normalizeAvailabilityRole(existing.role) !==
      normalizeAvailabilityRole(employee.role)
    ) {
      roleChanges.push({
        employee: employee.employee,
        previousRole: displayRole(existing.role),
        incomingRole: displayRole(employee.role),
        incoming: employee,
      });
    }
  }

  return {
    added,
    roleChanges,
    needsReview: added.length > 0 || roleChanges.length > 0,
  };
}

export function changeKeyForAdded(employee: EmployeeAvailability): AvailabilityChangeKey {
  return `add:${availabilityEmployeeKey(employee)}`;
}

export function changeKeyForRoleChange(
  change: AvailabilityRoleChange,
): AvailabilityChangeKey {
  return `role:${availabilityEmployeeKey(change.incoming)}`;
}

export function getAllChangeKeys(diff: AvailabilityDiff): AvailabilityChangeKey[] {
  return [
    ...diff.added.map(changeKeyForAdded),
    ...diff.roleChanges.map(changeKeyForRoleChange),
  ];
}

export function applySelectiveAvailabilityUpload(
  current: AvailabilityData | null,
  incoming: AvailabilityData,
  acceptedKeys: ReadonlySet<AvailabilityChangeKey>,
): AvailabilityData {
  const diff = computeAvailabilityDiff(current, incoming);
  const currentByKey = indexByEmployeeRole(current?.employees ?? []);
  const deniedAdds = new Set(
    diff.added
      .filter((employee) => !acceptedKeys.has(changeKeyForAdded(employee)))
      .map((employee) => availabilityEmployeeKey(employee)),
  );
  const deniedRoleChanges = new Set(
    diff.roleChanges
      .filter((change) => !acceptedKeys.has(changeKeyForRoleChange(change)))
      .map((change) => availabilityEmployeeKey(change.incoming)),
  );

  const employees: EmployeeAvailability[] = [];

  for (const employee of incoming.employees) {
    const key = availabilityEmployeeKey(employee);

    if (deniedAdds.has(key)) {
      continue;
    }

    if (deniedRoleChanges.has(key)) {
      const existing = currentByKey.get(key);
      if (existing) {
        employees.push(existing);
      }
      continue;
    }

    employees.push(employee);
  }

  return { employees };
}

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

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

function displayRole(role: string): string {
  const trimmed = role.trim();
  return trimmed || "—";
}

function indexByEmployee(
  employees: EmployeeAvailability[],
): Map<string, EmployeeAvailability> {
  const map = new Map<string, EmployeeAvailability>();
  for (const employee of employees) {
    map.set(normalizeName(employee.employee), employee);
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

  const currentByName = indexByEmployee(current.employees);
  const added: EmployeeAvailability[] = [];
  const roleChanges: AvailabilityRoleChange[] = [];

  for (const employee of incoming.employees) {
    const key = normalizeName(employee.employee);
    const existing = currentByName.get(key);

    if (!existing) {
      added.push(employee);
      continue;
    }

    if (
      normalizeRole(existing.role) !== normalizeRole(employee.role)
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

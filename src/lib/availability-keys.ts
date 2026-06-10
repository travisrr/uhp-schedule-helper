import type { EmployeeAvailability } from "@/lib/types";

export function normalizeAvailabilityName(name: string): string {
  return name.trim().toLowerCase();
}

export function normalizeAvailabilityRole(role: string): string {
  return role.trim().toLowerCase();
}

export function availabilityEmployeeKey(employee: EmployeeAvailability): string {
  return `${normalizeAvailabilityName(employee.employee)}::${normalizeAvailabilityRole(employee.role)}`;
}

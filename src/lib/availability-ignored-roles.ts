import type { AvailabilityData, EmployeeAvailability } from "@/lib/types";

/**
 * Role labels from availability exports that should be excluded from ingestion
 * and the availability roster. Matching is flexible on dashes, spacing, and
 * optional FOH/BOH/Management suffixes.
 */
export const IGNORED_AVAILABILITY_ROLE_PATTERNS = [
  "Admin Management",
  "BOH Manager Management",
  "Company Training",
  "Dishwashers BOH",
  "Event Coordinator",
  "Expeditor BOH",
  "Expo FOH",
  "Lead Cook",
  "Line Cook",
  "MIT Management",
  "Owner Management",
  "Prep Cook",
  "Training",
] as const;

export function normalizeRoleForMatch(role: string): string {
  return role
    .toLowerCase()
    .replace(/\(hourly\)/gi, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesIgnoredPattern(normalizedRole: string, pattern: string): boolean {
  const normalizedPattern = normalizeRoleForMatch(pattern);

  if (normalizedPattern === "training") {
    return normalizedRole === "training" || normalizedRole === "training foh";
  }

  if (normalizedRole === normalizedPattern) return true;
  if (normalizedRole.startsWith(`${normalizedPattern} `)) return true;

  return false;
}

export function isIgnoredAvailabilityRole(role: string): boolean {
  const normalizedRole = normalizeRoleForMatch(role);

  return IGNORED_AVAILABILITY_ROLE_PATTERNS.some((pattern) =>
    matchesIgnoredPattern(normalizedRole, pattern),
  );
}

export function filterIgnoredAvailabilityEmployees(
  employees: EmployeeAvailability[],
): EmployeeAvailability[] {
  return employees.filter((employee) => !isIgnoredAvailabilityRole(employee.role));
}

export function filterIgnoredAvailabilityData(
  data: AvailabilityData,
): AvailabilityData {
  return {
    employees: filterIgnoredAvailabilityEmployees(data.employees),
  };
}

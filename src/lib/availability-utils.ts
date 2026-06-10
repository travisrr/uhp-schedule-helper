import type {
  AvailabilityData,
  AvailabilityStatus,
  EmployeeAvailability,
} from "@/lib/types";
import type { DayKey } from "@/lib/utils";

export function canWorkAM(status: AvailabilityStatus): boolean {
  const trimmed = status.trim();
  if (!trimmed || trimmed.toUpperCase() === "OFF") return false;
  if (trimmed.toUpperCase() === "OPEN") return true;
  return /only\s*am/i.test(trimmed);
}

export function canWorkPM(status: AvailabilityStatus): boolean {
  const trimmed = status.trim();
  if (!trimmed || trimmed.toUpperCase() === "OFF") return false;
  if (trimmed.toUpperCase() === "OPEN") return true;
  return /only\s*pm/i.test(trimmed);
}

export function canWorkPeriod(
  status: AvailabilityStatus,
  period: "AM" | "PM",
): boolean {
  return period === "AM" ? canWorkAM(status) : canWorkPM(status);
}

export function normalizeEmployeeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ");
}

function nameParts(name: string): string[] {
  return normalizeEmployeeName(name)
    .split(/[\s,]+/)
    .filter(Boolean)
    .sort();
}

function namesMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeEmployeeName(left);
  const normalizedRight = normalizeEmployeeName(right);
  if (normalizedLeft === normalizedRight) return true;

  const leftParts = nameParts(left);
  const rightParts = nameParts(right);
  return (
    leftParts.length >= 2 &&
    rightParts.length >= 2 &&
    leftParts.join(" ") === rightParts.join(" ")
  );
}

export function findEmployeeInAvailability(
  employeeName: string,
  availability: AvailabilityData,
): EmployeeAvailability | null {
  const direct = availability.employees.find(
    (entry) => normalizeEmployeeName(entry.employee) === normalizeEmployeeName(employeeName),
  );
  if (direct) return direct;

  for (const employee of availability.employees) {
    if (namesMatch(employeeName, employee.employee)) {
      return employee;
    }
  }

  return null;
}

export function isEmployeeAvailableForPeriod(
  availability: AvailabilityData,
  employeeName: string,
  day: DayKey,
  period: "AM" | "PM",
): boolean {
  const employee = findEmployeeInAvailability(employeeName, availability);
  if (!employee) return false;

  return canWorkPeriod(employee.days[day], period);
}

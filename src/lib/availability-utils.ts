import type {
  AvailabilityData,
  AvailabilityStatus,
  EmployeeAvailability,
} from "@/lib/types";
import type { DayKey } from "@/lib/utils";

const AM_ONLY_RE = /only\s*am|am\s*only/i;
const PM_ONLY_RE = /only\s*pm|pm\s*only/i;

export const AVAILABILITY_STATUS_OPTIONS = [
  "OPEN",
  "OFF",
  "AM ONLY",
  "PM ONLY",
] as const satisfies readonly AvailabilityStatus[];

export type AvailabilityStatusOption =
  (typeof AVAILABILITY_STATUS_OPTIONS)[number];

export function isAmOnlyStatus(status: AvailabilityStatus): boolean {
  return AM_ONLY_RE.test(status.trim());
}

export function isPmOnlyStatus(status: AvailabilityStatus): boolean {
  return PM_ONLY_RE.test(status.trim());
}

export function isAmOrPmOnlyStatus(status: AvailabilityStatus): boolean {
  const trimmed = status.trim();
  return isAmOnlyStatus(trimmed) || isPmOnlyStatus(trimmed);
}

export function normalizeAvailabilityStatus(value: string): AvailabilityStatus {
  const trimmed = value.trim();
  if (!trimmed) return "OFF";
  const upper = trimmed.toUpperCase();
  if (upper === "OPEN") return "OPEN";
  if (upper === "OFF") return "OFF";
  if (isAmOnlyStatus(trimmed)) return "AM ONLY";
  if (isPmOnlyStatus(trimmed)) return "PM ONLY";
  return trimmed;
}

export function formatAvailabilityLabel(status: AvailabilityStatus): string {
  return normalizeAvailabilityStatus(status);
}

export function canWorkAM(status: AvailabilityStatus): boolean {
  const trimmed = status.trim();
  if (!trimmed || trimmed.toUpperCase() === "OFF") return false;
  if (trimmed.toUpperCase() === "OPEN") return true;
  return isAmOnlyStatus(trimmed);
}

export function canWorkPM(status: AvailabilityStatus): boolean {
  const trimmed = status.trim();
  if (!trimmed || trimmed.toUpperCase() === "OFF") return false;
  if (trimmed.toUpperCase() === "OPEN") return true;
  return isPmOnlyStatus(trimmed);
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

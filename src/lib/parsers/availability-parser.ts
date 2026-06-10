import { availabilityEmployeeKey } from "../availability-keys";
import type { AvailabilityData, EmployeeAvailability } from "../types";
import { DAYS, type DayKey } from "../utils";
import {
  findRowIndex,
  normalizeAvailabilityStatus,
  normalizeDayHeader,
  parseNumber,
  rowIncludes,
  type RawSheet,
} from "../file-ingest";

function findHeaderRow(rows: RawSheet): number {
  const index = findRowIndex(rows, (row) =>
    rowIncludes(row, "employee") &&
    row.some((cell) => normalizeDayHeader(cell) !== null),
  );
  return index >= 0 ? index : 0;
}

function mapDayColumns(headerRow: string[]): Partial<Record<DayKey, number>> {
  const mapping: Partial<Record<DayKey, number>> = {};
  headerRow.forEach((cell, index) => {
    const day = normalizeDayHeader(cell);
    if (day) mapping[day] = index;
  });
  return mapping;
}

function findColumnIndex(headerRow: string[], ...labels: string[]): number {
  const lowerLabels = labels.map((l) => l.toLowerCase());
  return headerRow.findIndex((cell) => {
    const lower = cell.toLowerCase();
    return lowerLabels.some((label) => lower.includes(label));
  });
}

function isDayColumn(headerRow: string[], index: number): boolean {
  return normalizeDayHeader(headerRow[index] ?? "") !== null;
}

function isNonRoleColumn(header: string): boolean {
  const lower = header.toLowerCase();
  return (
    lower.includes("shift") ||
    lower.includes("total") ||
    lower.includes("hours") ||
    lower.includes("employee") ||
    /^#+$/.test(lower) ||
    /^\d+$/.test(lower)
  );
}

function isNumericRoleCode(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^-?\d+(\.\d+)?$/.test(trimmed);
}

function normalizeRoleText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || isNumericRoleCode(trimmed)) return "";
  return trimmed;
}

function findRoleColumnCandidates(
  headerRow: string[],
  employeeIndex: number,
): number[] {
  const candidates: number[] = [];
  const add = (index: number) => {
    if (index >= 0 && !candidates.includes(index)) candidates.push(index);
  };

  const priorityGroups = [
    ["ratings"],
    ["rating"],
    ["role description", "job description"],
    ["position"],
    ["job title", "job class", "primary job"],
    ["classification"],
    ["description"],
    ["role"],
    ["job code"],
    ["job"],
  ];

  for (const labels of priorityGroups) {
    add(findColumnIndex(headerRow, ...labels));
  }

  if (employeeIndex >= 0) {
    for (let index = employeeIndex + 1; index < headerRow.length; index++) {
      if (isDayColumn(headerRow, index)) break;
      const header = headerRow[index]?.trim() ?? "";
      if (header && isNonRoleColumn(header)) continue;
      add(index);
    }
  }

  return candidates;
}

function readRoleFromRow(
  row: string[],
  roleColumns: number[],
): string {
  for (const column of roleColumns) {
    const role = normalizeRoleText(row[column] ?? "");
    if (role) return role;
  }
  return "";
}

function isStaffingGuideBoundary(row: string[]): boolean {
  if (rowIncludes(row, "staffing guide")) return true;
  if (rowIncludes(row, "meal period")) return true;
  return row.some((cell) => {
    const normalized = cell.toLowerCase().replace(/\s+/g, " ").trim();
    return normalized.includes("staffing guide");
  });
}

function parseEmployeeRow(
  row: string[],
  dayColumns: Partial<Record<DayKey, number>>,
  employeeIndex: number,
  roleColumns: number[],
  shiftsIndex: number,
): EmployeeAvailability | null {
  const employee = row[employeeIndex]?.trim();
  const employeeLower = employee.toLowerCase();
  if (
    !employee ||
    employeeLower.includes("staffing guide") ||
    employeeLower === "only am" ||
    employeeLower === "only pm" ||
    employeeLower === "meal period"
  ) {
    return null;
  }

  const days = DAYS.reduce(
    (acc, day) => {
      const col = dayColumns[day];
      const raw = col !== undefined ? row[col] ?? "" : "";
      acc[day] = normalizeAvailabilityStatus(raw);
      return acc;
    },
    {} as Record<DayKey, string>,
  );

  const totalRaw =
    shiftsIndex >= 0 ? row[shiftsIndex] ?? "" : row[row.length - 1] ?? "";

  return {
    employee,
    role: readRoleFromRow(row, roleColumns),
    days,
    totalShifts: parseNumber(totalRaw),
  };
}

function normalizeSheetRole(sheetName: string): string {
  const cleaned = sheetName
    .replace(/availability|staffing|sheet|roster|schedule/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || sheetName.trim();
}

export function parseAvailabilitySheet(
  rows: RawSheet,
  sheetName?: string,
): AvailabilityData {
  const headerIndex = findHeaderRow(rows);
  const headerRow = rows[headerIndex] ?? [];
  const dayColumns = mapDayColumns(headerRow);

  const employeeIndex = findColumnIndex(headerRow, "employee");
  const roleColumns = findRoleColumnCandidates(
    headerRow,
    employeeIndex >= 0 ? employeeIndex : 0,
  );
  const shiftsIndex = findColumnIndex(
    headerRow,
    "number of shifts",
    "total shifts",
    "shifts",
  );

  const employees: EmployeeAvailability[] = [];
  let lastRole = sheetName ? normalizeSheetRole(sheetName) : "";

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    if (isStaffingGuideBoundary(row)) break;

    const parsed = parseEmployeeRow(
      row,
      dayColumns,
      employeeIndex >= 0 ? employeeIndex : 0,
      roleColumns,
      shiftsIndex,
    );
    if (!parsed) continue;

    const roleFromCell = parsed.role.trim();
    if (roleFromCell) {
      lastRole = roleFromCell;
    }

    const role =
      roleFromCell ||
      lastRole ||
      (sheetName ? normalizeSheetRole(sheetName) : "");

    employees.push({ ...parsed, role });
  }

  return { employees };
}

function availabilityStatusRank(status: string): number {
  const trimmed = status.trim();
  if (!trimmed || trimmed.toUpperCase() === "OFF") return 0;
  if (/only\s*(am|pm)/i.test(trimmed)) return 1;
  if (trimmed.toUpperCase() === "OPEN") return 2;
  return 1;
}

function mergeAvailabilityStatus(
  left: string,
  right: string,
): EmployeeAvailability["days"][DayKey] {
  return availabilityStatusRank(left) >= availabilityStatusRank(right)
    ? left
    : right;
}

function mergeAvailabilityEmployees(
  employees: EmployeeAvailability[],
): EmployeeAvailability[] {
  const byEmployeeRole = new Map<string, EmployeeAvailability>();

  for (const employee of employees) {
    const key = availabilityEmployeeKey(employee);
    const existing = byEmployeeRole.get(key);

    if (!existing) {
      byEmployeeRole.set(key, {
        ...employee,
        days: { ...employee.days },
      });
      continue;
    }

    const mergedDays = { ...existing.days };
    for (const day of DAYS) {
      mergedDays[day] = mergeAvailabilityStatus(
        existing.days[day],
        employee.days[day],
      );
    }

    byEmployeeRole.set(key, {
      ...existing,
      days: mergedDays,
    });
  }

  return [...byEmployeeRole.values()];
}

export function parseAvailabilityWorkbook(
  sheets: Array<RawSheet | { name: string; rows: RawSheet }>,
): AvailabilityData {
  const employees: EmployeeAvailability[] = [];

  for (const sheet of sheets) {
    if (Array.isArray(sheet)) {
      const parsed = parseAvailabilitySheet(sheet);
      employees.push(...parsed.employees);
      continue;
    }

    const parsed = parseAvailabilitySheet(sheet.rows, sheet.name);
    employees.push(...parsed.employees);
  }

  return { employees: mergeAvailabilityEmployees(employees) };
}

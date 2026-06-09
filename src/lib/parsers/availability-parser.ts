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
    lower.includes("employee")
  );
}

function findRoleColumnIndex(
  headerRow: string[],
  employeeIndex: number,
): number {
  const explicit = findColumnIndex(
    headerRow,
    "role",
    "position",
    "job code",
    "job title",
    "job class",
    "primary job",
    "job",
    "title",
    "ratings",
    "classification",
  );
  if (explicit >= 0) return explicit;

  if (employeeIndex < 0) return -1;

  for (let index = employeeIndex + 1; index < headerRow.length; index++) {
    if (isDayColumn(headerRow, index)) break;
    const header = headerRow[index]?.trim() ?? "";
    if (header && isNonRoleColumn(header)) continue;
    return index;
  }

  return -1;
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
  roleIndex: number,
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
    role: roleIndex >= 0 ? row[roleIndex] ?? "" : "",
    days,
    totalShifts: parseNumber(totalRaw),
  };
}

export function parseAvailabilitySheet(rows: RawSheet): AvailabilityData {
  const headerIndex = findHeaderRow(rows);
  const headerRow = rows[headerIndex] ?? [];
  const dayColumns = mapDayColumns(headerRow);

  const employeeIndex = findColumnIndex(headerRow, "employee");
  const roleIndex = findRoleColumnIndex(
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

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    if (isStaffingGuideBoundary(row)) break;

    const parsed = parseEmployeeRow(
      row,
      dayColumns,
      employeeIndex >= 0 ? employeeIndex : 0,
      roleIndex,
      shiftsIndex,
    );
    if (parsed) employees.push(parsed);
  }

  return { employees };
}

export function parseAvailabilityWorkbook(sheets: RawSheet[]): AvailabilityData {
  const employees: EmployeeAvailability[] = [];

  for (const sheet of sheets) {
    const parsed = parseAvailabilitySheet(sheet);
    employees.push(...parsed.employees);
  }

  return { employees };
}

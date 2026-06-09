import type {
  AvailabilityData,
  EmployeeAvailability,
  StaffingGuideRow,
} from "../types";
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

function parseEmployeeRow(
  row: string[],
  dayColumns: Partial<Record<DayKey, number>>,
  employeeIndex: number,
  ratingsIndex: number,
  shiftsIndex: number,
): EmployeeAvailability | null {
  const employee = row[employeeIndex]?.trim();
  if (!employee || employee.toLowerCase().includes("staffing guide")) {
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
    ratings: ratingsIndex >= 0 ? row[ratingsIndex] ?? "" : "",
    days,
    totalShifts: parseNumber(totalRaw),
  };
}

function parseStaffingGuide(
  rows: RawSheet,
  startIndex: number,
  dayColumns: Partial<Record<DayKey, number>>,
): StaffingGuideRow[] {
  const guideRows: StaffingGuideRow[] = [];
  const mealPeriodIndex = findRowIndex(rows.slice(startIndex), (row) =>
    rowIncludes(row, "meal period"),
  );

  const headerOffset =
    mealPeriodIndex >= 0 ? startIndex + mealPeriodIndex : startIndex;
  const headerRow = rows[headerOffset] ?? [];

  const resolvedDayColumns =
    Object.keys(dayColumns).length > 0
      ? dayColumns
      : mapDayColumns(headerRow);

  const periodCol =
    findColumnIndex(headerRow, "meal period", "meal") >= 0
      ? findColumnIndex(headerRow, "meal period", "meal")
      : 0;

  for (let i = headerOffset + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => !cell.trim())) continue;

    const mealPeriod = row[periodCol]?.trim();
    if (!mealPeriod) continue;
    if (/employee|rating|total/i.test(mealPeriod)) break;

    const days = DAYS.reduce(
      (acc, day) => {
        const col = resolvedDayColumns[day];
        acc[day] = col !== undefined ? parseNumber(row[col] ?? "") : null;
        return acc;
      },
      {} as Record<DayKey, number | null>,
    );

    guideRows.push({ mealPeriod, days });
  }

  return guideRows;
}

export function parseAvailabilitySheet(rows: RawSheet): AvailabilityData {
  const headerIndex = findHeaderRow(rows);
  const headerRow = rows[headerIndex] ?? [];
  const dayColumns = mapDayColumns(headerRow);

  const employeeIndex = findColumnIndex(headerRow, "employee");
  const ratingsIndex = findColumnIndex(headerRow, "rating");
  const shiftsIndex = findColumnIndex(
    headerRow,
    "number of shifts",
    "total shifts",
    "shifts",
  );

  const employees: EmployeeAvailability[] = [];
  let staffingStart = rows.length;

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    if (rowIncludes(row, "staffing guide")) {
      staffingStart = i;
      break;
    }

    const parsed = parseEmployeeRow(
      row,
      dayColumns,
      employeeIndex >= 0 ? employeeIndex : 0,
      ratingsIndex,
      shiftsIndex,
    );
    if (parsed) employees.push(parsed);
  }

  const staffingGuide = parseStaffingGuide(rows, staffingStart, dayColumns);

  return { employees, staffingGuide };
}

import {
  findRowIndex,
  parseNumber,
  rowIncludes,
  type RawSheet,
} from "@/lib/file-ingest";
import type { ServerMetricRow, ServerMetricsData } from "@/lib/types";

const REQUIRED_HEADERS = [
  "employee",
  "net sales",
  "gross sales",
  "total guests",
] as const;

function findColumnIndex(headerRow: string[], ...labels: string[]): number {
  const lowerLabels = labels.map((label) => label.toLowerCase());
  return headerRow.findIndex((cell) => {
    const lower = cell.toLowerCase();
    return lowerLabels.some((label) => lower.includes(label));
  });
}

function parseMetricValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return null;
  return parseNumber(trimmed);
}

function findHeaderRow(rows: RawSheet): number {
  const index = findRowIndex(rows, (row) =>
    rowIncludes(row, "employee", "net sales"),
  );
  if (index < 0) {
    throw new Error(
      "Could not find a header row. Expected columns like Employee Name and Net Sales.",
    );
  }
  return index;
}

function validateHeaders(headerRow: string[]): void {
  const joined = headerRow.join(" ").toLowerCase();
  for (const term of REQUIRED_HEADERS) {
    if (!joined.includes(term)) {
      throw new Error(`Missing required column containing "${term}".`);
    }
  }
}

function parseRow(headerRow: string[], row: string[]): ServerMetricRow | null {
  const employeeIndex = findColumnIndex(headerRow, "employee name", "employee");
  const employeeName = row[employeeIndex]?.trim() ?? "";
  if (!employeeName) return null;

  const getValue = (...labels: string[]) => {
    const index = findColumnIndex(headerRow, ...labels);
    return index >= 0 ? (row[index] ?? "") : "";
  };

  return {
    employeeName,
    netSales: parseMetricValue(getValue("net sales")),
    grossSales: parseMetricValue(getValue("gross sales")),
    totalGuests: parseMetricValue(getValue("total guests")),
    netSalesPerGuest: parseMetricValue(getValue("net sales per guest")),
    avgCheckSize: parseMetricValue(getValue("avg check size")),
    avgTurnTimeMin: parseMetricValue(getValue("avg turn time")),
    totalLaborHours: parseMetricValue(getValue("total labor hours")),
    netSalesPerLaborHour: parseMetricValue(getValue("net sales per labor hour")),
    voidsAndDiscounts: parseMetricValue(getValue("voids", "discounts")),
  };
}

export function parseServerMetricsSheet(rows: RawSheet): ServerMetricsData {
  if (rows.length === 0) {
    throw new Error("The uploaded file is empty.");
  }

  const headerIndex = findHeaderRow(rows);
  const headerRow = rows[headerIndex] ?? [];
  validateHeaders(headerRow);

  const parsedRows = rows
    .slice(headerIndex + 1)
    .map((row) => parseRow(headerRow, row))
    .filter((row): row is ServerMetricRow => row !== null);

  if (parsedRows.length === 0) {
    throw new Error("No server rows were found in the uploaded file.");
  }

  return {
    rows: parsedRows,
    importedAt: new Date().toISOString(),
    fileName: "",
  };
}

export function isSystemServerEntry(name: string): boolean {
  return /^(ghost|default)\b/i.test(name.trim());
}

export type ServerMetricSortKey = keyof Pick<
  ServerMetricRow,
  | "employeeName"
  | "netSales"
  | "grossSales"
  | "totalGuests"
  | "netSalesPerGuest"
  | "avgCheckSize"
  | "avgTurnTimeMin"
  | "totalLaborHours"
  | "netSalesPerLaborHour"
  | "voidsAndDiscounts"
>;

export function compareServerMetrics(
  a: ServerMetricRow,
  b: ServerMetricRow,
  key: ServerMetricSortKey,
  direction: "asc" | "desc",
): number {
  const multiplier = direction === "asc" ? 1 : -1;

  if (key === "employeeName") {
    return (
      multiplier *
      a.employeeName.localeCompare(b.employeeName, undefined, {
        sensitivity: "base",
      })
    );
  }

  const aValue = a[key] ?? Number.NEGATIVE_INFINITY;
  const bValue = b[key] ?? Number.NEGATIVE_INFINITY;
  if (aValue === bValue) {
    return a.employeeName.localeCompare(b.employeeName, undefined, {
      sensitivity: "base",
    });
  }
  return multiplier * (aValue - bValue);
}

export function sortServerMetricsRows(
  rows: ServerMetricRow[],
  key: ServerMetricSortKey,
  direction: "asc" | "desc",
): ServerMetricRow[] {
  return [...rows].sort((a, b) => compareServerMetrics(a, b, key, direction));
}

import Papa from "papaparse";
import * as XLSX from "xlsx";

export type RawSheet = string[][];

export interface NamedSheet {
  name: string;
  rows: RawSheet;
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function sheetToRawRows(sheet: XLSX.WorkSheet): RawSheet {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  return rows.map((row) =>
    Array.isArray(row) ? row.map(normalizeCell) : [normalizeCell(row)],
  );
}

async function readCsvAsRawRows(file: File): Promise<RawSheet> {
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: false,
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "Failed to parse CSV file.");
  }

  return parsed.data.map((row) => row.map(normalizeCell));
}

async function readExcelAsNamedSheets(file: File): Promise<NamedSheet[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((name) => ({
    name,
    rows: sheetToRawRows(workbook.Sheets[name]),
  }));
}

async function readExcelAsRawSheets(file: File): Promise<RawSheet[]> {
  const sheets = await readExcelAsNamedSheets(file);
  return sheets.map((sheet) => sheet.rows);
}

export async function readFileAsRawRows(file: File): Promise<RawSheet> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    const sheets = await readExcelAsRawSheets(file);
    return sheets[0] ?? [];
  }

  return readCsvAsRawRows(file);
}

export async function readFileAsRawSheets(file: File): Promise<RawSheet[]> {
  const sheets = await readFileAsNamedSheets(file);
  return sheets.map((sheet) => sheet.rows);
}

export async function readFileAsNamedSheets(file: File): Promise<NamedSheet[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    return readExcelAsNamedSheets(file);
  }

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return [{ name: baseName, rows: await readCsvAsRawRows(file) }];
}

export function findRowIndex(
  rows: RawSheet,
  matcher: (row: string[]) => boolean,
): number {
  return rows.findIndex(matcher);
}

export function rowIncludes(row: string[], ...terms: string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return terms.every((term) => joined.includes(term.toLowerCase()));
}

export function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[$,%\s]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

import type { DayKey } from "./utils";

export function normalizeDayHeader(value: string): DayKey | null {
  const normalized = value.toLowerCase().replace(/\./g, "").trim();
  const map: Record<string, DayKey> = {
    wed: "Wed",
    wednesday: "Wed",
    thu: "Thu",
    thur: "Thu",
    thurs: "Thu",
    thursday: "Thu",
    fri: "Fri",
    friday: "Fri",
    sat: "Sat",
    saturday: "Sat",
    sun: "Sun",
    sunday: "Sun",
    mon: "Mon",
    monday: "Mon",
    tue: "Tue",
    tues: "Tue",
    tuesday: "Tue",
  };
  return map[normalized] ?? null;
}

export function parseDayHeader(
  value: string,
): { day: DayKey; dateLabel: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const weekdayMatch = trimmed.match(/^([A-Za-z]+day)\b/i);
  if (weekdayMatch) {
    const day = normalizeDayHeader(weekdayMatch[1]);
    if (day) return { day, dateLabel: trimmed };
  }

  const day = normalizeDayHeader(trimmed);
  if (day) return { day, dateLabel: trimmed };

  return null;
}

export function normalizeAvailabilityStatus(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "OFF";
  const upper = trimmed.toUpperCase();
  if (upper === "OPEN") return "OPEN";
  if (upper === "OFF") return "OFF";
  if (/only\s*am/i.test(trimmed)) return "Only AM";
  if (/only\s*pm/i.test(trimmed)) return "Only PM";
  return trimmed;
}

export function extractTimeRange(text: string): string | null {
  const match = text.match(
    /\d{1,2}:\d{2}\s*(?:AM|PM)\s*[-–—]\s*\d{1,2}:\d{2}\s*(?:AM|PM)/i,
  );
  return match ? match[0].replace(/\s+/g, " ").trim() : null;
}

export function extractEmployeeName(text: string, timeRange: string | null): string {
  if (!timeRange) return text.trim();
  return text.replace(timeRange, "").replace(/[-–—|:]/g, " ").trim();
}

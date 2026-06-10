import * as XLSX from "xlsx";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const sourceFile =
  process.argv[2] ??
  "C:/Users/tcrxx/Downloads/EmployeeAvailabilityExport.xlsx";
const uploadsDir = path.join(projectRoot, "data", "uploads");
const dataDir = path.join(projectRoot, "data");
const targetFileName = "EmployeeAvailabilityExport.xlsx";

mkdirSync(uploadsDir, { recursive: true });
copyFileSync(sourceFile, path.join(uploadsDir, targetFileName));

const buffer = readFileSync(sourceFile);
const workbook = XLSX.read(buffer, { type: "buffer" });

function sheetToRawRows(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  return rows.map((row) =>
    Array.isArray(row) ? row.map((c) => String(c ?? "").trim()) : [String(row ?? "").trim()],
  );
}

const IGNORED_AVAILABILITY_ROLE_PATTERNS = [
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
];

function normalizeRoleForMatch(role) {
  return role
    .toLowerCase()
    .replace(/\(hourly\)/gi, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isIgnoredAvailabilityRole(role) {
  const normalizedRole = normalizeRoleForMatch(role);

  return IGNORED_AVAILABILITY_ROLE_PATTERNS.some((pattern) => {
    const normalizedPattern = normalizeRoleForMatch(pattern);

    if (normalizedPattern === "training") {
      return normalizedRole === "training" || normalizedRole === "training foh";
    }

    if (normalizedRole === normalizedPattern) return true;
    if (normalizedRole.startsWith(`${normalizedPattern} `)) return true;
    return false;
  });
}

const DAYS = ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];
const dayMap = {
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

function normalizeDayHeader(value) {
  const normalized = value.toLowerCase().replace(/\./g, "").trim();
  return dayMap[normalized] ?? null;
}

function normalizeAvailabilityStatus(value) {
  const trimmed = value.trim();
  if (!trimmed) return "OFF";
  const upper = trimmed.toUpperCase();
  if (upper === "OPEN") return "OPEN";
  if (upper === "OFF") return "OFF";
  if (/only\s*am|am\s*only/i.test(trimmed)) return "AM ONLY";
  if (/only\s*pm|pm\s*only/i.test(trimmed)) return "PM ONLY";
  return trimmed;
}

function parseNumber(value) {
  const cleaned = value.replace(/[$,%\s]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function normalizeSheetRole(sheetName) {
  const cleaned = sheetName
    .replace(/availability|staffing|sheet|roster|schedule/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || sheetName.trim();
}

function availabilityEmployeeKey(employee) {
  return `${employee.employee.trim().toLowerCase()}::${employee.role.trim().toLowerCase()}`;
}

function parseSheet(rows, sheetName) {
  if (isIgnoredAvailabilityRole(normalizeSheetRole(sheetName))) {
    return [];
  }

  const headerIndex = rows.findIndex(
    (row) =>
      row.join(" ").toLowerCase().includes("employee") &&
      row.some((cell) => normalizeDayHeader(cell) !== null),
  );
  const headerRow = rows[headerIndex >= 0 ? headerIndex : 0] ?? [];
  const dayColumns = {};
  headerRow.forEach((cell, index) => {
    const day = normalizeDayHeader(cell);
    if (day) dayColumns[day] = index;
  });

  const employeeIndex = headerRow.findIndex((cell) =>
    cell.toLowerCase().includes("employee"),
  );
  const shiftsIndex = headerRow.findIndex((cell) => {
    const lower = cell.toLowerCase();
    return (
      lower.includes("number of shifts") ||
      lower.includes("total shifts") ||
      lower.includes("shifts")
    );
  });

  const employees = [];
  let lastRole = normalizeSheetRole(sheetName);

  for (let i = (headerIndex >= 0 ? headerIndex : 0) + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const joined = row.join(" ").toLowerCase();
    if (joined.includes("staffing guide") || joined.includes("meal period")) break;

    const employee = row[employeeIndex >= 0 ? employeeIndex : 0]?.trim() ?? "";
    const employeeLower = employee.toLowerCase();
    if (
      !employee ||
      employeeLower.includes("staffing guide") ||
      employeeLower === "only am" ||
      employeeLower === "only pm" ||
      employeeLower === "meal period"
    ) {
      continue;
    }

    const days = Object.fromEntries(
      DAYS.map((day) => {
        const col = dayColumns[day];
        const raw = col !== undefined ? row[col] ?? "" : "";
        return [day, normalizeAvailabilityStatus(raw)];
      }),
    );

    const totalRaw =
      shiftsIndex >= 0 ? row[shiftsIndex] ?? "" : row[row.length - 1] ?? "";

    const role = lastRole;
    if (isIgnoredAvailabilityRole(role)) continue;

    employees.push({
      employee,
      role,
      days,
      totalShifts: parseNumber(totalRaw),
    });
  }

  return employees;
}

const allEmployees = [];
for (const sheetName of workbook.SheetNames) {
  const rows = sheetToRawRows(workbook.Sheets[sheetName]);
  allEmployees.push(...parseSheet(rows, sheetName));
}

const merged = new Map();
for (const employee of allEmployees) {
  const key = availabilityEmployeeKey(employee);
  merged.set(key, employee);
}

const availability = {
  employees: [...merged.values()].filter(
    (employee) => !isIgnoredAvailabilityRole(employee.role),
  ),
};
const now = new Date().toISOString();

const appState = {
  availability,
  schedule: null,
  priorSchedule: null,
  selectedWeekStart: null,
  shiftHours: null,
  manifest: {
    availabilityFile: targetFileName,
    scheduleFile: null,
    priorScheduleFile: null,
    updatedAt: now,
  },
};

writeFileSync(path.join(dataDir, "app-state.json"), JSON.stringify(appState, null, 2));
writeFileSync(path.join(dataDir, "manifest.json"), JSON.stringify(appState.manifest, null, 2));

console.log(`Seeded ${availability.employees.length} roster rows into data/app-state.json`);

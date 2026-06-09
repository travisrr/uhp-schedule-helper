import type {
  MealPeriodBlock,
  RoleBlock,
  ScheduleData,
  ScheduleDay,
  ScheduleMetrics,
  ShiftAssignment,
} from "../types";
import { DAYS, type DayKey } from "../utils";
import {
  extractEmployeeName,
  extractTimeRange,
  normalizeDayHeader,
  parseNumber,
  rowIncludes,
  type RawSheet,
} from "../file-ingest";

const ROLE_PATTERNS = [
  "line cook",
  "bartender",
  "wait staff",
  "server",
  "host",
  "expo",
  "busser",
  "manager",
  "prep cook",
  "sous chef",
  "dishwasher",
];

function detectMealPeriod(text: string): "AM" | "PM" | null {
  const upper = text.toUpperCase();
  if (/\bAM\b/.test(upper) && !/\bPM\b/.test(upper)) return "AM";
  if (/\bPM\b/.test(upper)) return "PM";
  return null;
}

function isRoleHeader(text: string): string | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;
  const match = ROLE_PATTERNS.find((role) => lower.includes(role));
  if (match) {
    return text
      .split(/[:\-]/)[0]
      ?.trim()
      .replace(/\bAM\b|\bPM\b/gi, "")
      .trim();
  }
  return null;
}

function parseShiftCell(text: string): ShiftAssignment | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const timeRange = extractTimeRange(trimmed);
  const employee = extractEmployeeName(trimmed, timeRange);

  if (!employee && !timeRange) return null;

  return {
    employee: employee || trimmed,
    timeRange: timeRange ?? "—",
  };
}

function parseMetrics(rows: RawSheet): ScheduleMetrics {
  const metrics: ScheduleMetrics = {
    totalHours: null,
    totalPay: null,
    forecastedSales: null,
    actualLaborCostPercent: null,
  };

  for (const row of rows.slice(0, 12)) {
    const joined = row.join(" ").toLowerCase();
    if (joined.includes("total hrs") || joined.includes("total hours")) {
      metrics.totalHours =
        parseNumber(row.find((cell) => parseNumber(cell) !== null) ?? "") ??
        parseNumber(row[row.length - 1] ?? "");
    }
    if (joined.includes("total pay")) {
      metrics.totalPay =
        parseNumber(row.find((cell) => /[$]/.test(cell)) ?? "") ??
        parseNumber(row[row.length - 1] ?? "");
    }
    if (joined.includes("forecasted sales")) {
      metrics.forecastedSales = parseNumber(row[row.length - 1] ?? "");
    }
    if (joined.includes("labor cost") || joined.includes("labor %")) {
      metrics.actualLaborCostPercent = parseNumber(row[row.length - 1] ?? "");
    }
  }

  return metrics;
}

function createEmptyDay(day: DayKey): ScheduleDay {
  return {
    day,
    mealPeriods: [
      { period: "AM", roles: [] },
      { period: "PM", roles: [] },
    ],
  };
}

function getMealBlock(day: ScheduleDay, period: "AM" | "PM"): MealPeriodBlock {
  let block = day.mealPeriods.find((item) => item.period === period);
  if (!block) {
    block = { period, roles: [] };
    day.mealPeriods.push(block);
  }
  return block;
}

function getRoleBlock(
  mealBlock: MealPeriodBlock,
  role: string,
): RoleBlock {
  let block = mealBlock.roles.find(
    (item) => item.role.toLowerCase() === role.toLowerCase(),
  );
  if (!block) {
    block = { role, shifts: [] };
    mealBlock.roles.push(block);
  }
  return block;
}

export function parseScheduleSheet(rows: RawSheet): ScheduleData {
  const metrics = parseMetrics(rows);
  const days: ScheduleDay[] = DAYS.map(createEmptyDay);

  let currentDay: ScheduleDay | null = null;
  let currentPeriod: "AM" | "PM" = "AM";
  let currentRole: string | null = null;

  for (const row of rows) {
    if (!row || row.every((cell) => !cell.trim())) continue;

    const joined = row.join(" ").trim();
    const dayKey = normalizeDayHeader(row[0] ?? joined);
    if (dayKey) {
      currentDay = days.find((day) => day.day === dayKey) ?? null;
      currentRole = null;
      const period = detectMealPeriod(joined);
      if (period) currentPeriod = period;
      continue;
    }

    const periodFromRow = detectMealPeriod(joined);
    if (periodFromRow && rowIncludes(row, "am", "pm")) {
      currentPeriod = periodFromRow;
      currentRole = null;
      continue;
    }

    const roleHeader = row.find((cell) => isRoleHeader(cell));
    if (roleHeader) {
      currentRole = isRoleHeader(roleHeader);
      continue;
    }

    if (!currentDay) continue;

    const mealBlock = getMealBlock(currentDay, currentPeriod);
    const roleName = currentRole ?? "Staff";
    const roleBlock = getRoleBlock(mealBlock, roleName);

    for (const cell of row) {
      const shift = parseShiftCell(cell);
      if (shift) roleBlock.shifts.push(shift);
    }
  }

  return {
    metrics,
    days: days.filter(
      (day) =>
        day.mealPeriods.some((period) =>
          period.roles.some((role) => role.shifts.length > 0),
        ),
    ).length > 0
      ? days
      : buildFallbackSchedule(rows),
  };
}

function buildFallbackSchedule(rows: RawSheet): ScheduleDay[] {
  const days = DAYS.map(createEmptyDay);
  let dayIndex = 0;
  let period: "AM" | "PM" = "AM";
  let role = "Staff";

  for (const row of rows) {
    const firstCell = row[0]?.trim() ?? "";
    const dayKey = normalizeDayHeader(firstCell);
    if (dayKey) {
      const idx = DAYS.indexOf(dayKey);
      if (idx >= 0) dayIndex = idx;
      period = detectMealPeriod(row.join(" ")) ?? period;
      continue;
    }

    if (/role|position/i.test(firstCell)) {
      role = row[1]?.trim() || row[0]?.replace(/role|position/i, "").trim() || role;
      continue;
    }

    const shiftTexts = row.filter((cell) => extractTimeRange(cell));
    if (shiftTexts.length === 0) continue;

    const day = days[dayIndex];
    if (!day) continue;
    const mealBlock = getMealBlock(day, period);
    const roleBlock = getRoleBlock(mealBlock, role);

    shiftTexts.forEach((text) => {
      const shift = parseShiftCell(text);
      if (shift) roleBlock.shifts.push(shift);
    });
  }

  return days;
}

import type {
  MealPeriodBlock,
  RoleBlock,
  ScheduleData,
  ScheduleDay,
  ScheduleMetrics,
  ShiftAssignment,
} from "../types";
import { ensureDayManagementSlots } from "../schedule-management-roles";
import { DAYS, type DayKey } from "../utils";
import {
  extractEmployeeName,
  extractTimeRange,
  parseDayHeader,
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
  "supervisor",
];

const AM_NAME_COL = 0;
const AM_TIME_COL = 3;
const PM_NAME_COL = 5;
const PM_TIME_COL = 8;

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

function parseRoleLabel(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const roleHeader = isRoleHeader(trimmed);
  if (roleHeader) return roleHeader;
  if (/\(from schedule\)/i.test(trimmed)) return trimmed;

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

function parseNameAndTime(
  name: string,
  time: string,
): ShiftAssignment | null {
  const trimmedName = name.trim();
  const timeRange = extractTimeRange(time.trim());
  if (!trimmedName || !timeRange) return null;

  return {
    employee: trimmedName,
    timeRange,
  };
}

function parseGeneratedAt(rows: RawSheet): string | null {
  for (const row of rows) {
    for (const cell of row) {
      const match = cell.trim().match(/^generated on:\s*(.+)$/i);
      if (match) return match[1].trim();
    }
    const joined = row.join(" ").trim();
    const joinedMatch = joined.match(/generated on:\s*(.+)$/i);
    if (joinedMatch) return joinedMatch[1].trim();
  }
  return null;
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

function addShiftToDay(
  day: ScheduleDay,
  period: "AM" | "PM",
  role: string | null,
  shift: ShiftAssignment,
): void {
  const mealBlock = getMealBlock(day, period);
  const roleBlock = getRoleBlock(mealBlock, role ?? "Staff");
  roleBlock.shifts.push(shift);
}

function isShiftReportColumnLayout(rows: RawSheet): boolean {
  return rows.some(
    (row) =>
      /^shift report$/i.test(row[AM_NAME_COL]?.trim() ?? "") ||
      (row[AM_NAME_COL]?.trim().toUpperCase() === "AM" &&
        row[PM_NAME_COL]?.trim().toUpperCase() === "PM"),
  );
}

function parseShiftReportColumnLayout(rows: RawSheet): ScheduleDay[] {
  const days = DAYS.map(createEmptyDay);
  let currentDay: ScheduleDay | null = null;
  let amRole: string | null = null;
  let pmRole: string | null = null;

  const startIndex = rows.findIndex((row) =>
    /^shift report$/i.test(row[AM_NAME_COL]?.trim() ?? ""),
  );
  const scanRows = startIndex >= 0 ? rows.slice(startIndex) : rows;

  for (const row of scanRows) {
    if (!row || row.every((cell) => !cell.trim())) continue;

    const colA = row[AM_NAME_COL]?.trim() ?? "";
    const colD = row[AM_TIME_COL]?.trim() ?? "";
    const colF = row[PM_NAME_COL]?.trim() ?? "";
    const colI = row[PM_TIME_COL]?.trim() ?? "";

    if (/^shift report$/i.test(colA)) continue;
    if (/^generated on:/i.test(colA)) continue;

    const dayHeader = parseDayHeader(colA);
    if (dayHeader) {
      currentDay = days.find((day) => day.day === dayHeader.day) ?? null;
      if (currentDay && dayHeader.dateLabel) {
        currentDay.dateLabel = dayHeader.dateLabel;
      }
      amRole = null;
      pmRole = null;
      continue;
    }

    if (colA.toUpperCase() === "AM" && colF.toUpperCase() === "PM") {
      amRole = null;
      pmRole = null;
      continue;
    }

    if (!currentDay) continue;

    if (colA) {
      const amRoleLabel = parseRoleLabel(colA);
      const amShift = parseNameAndTime(colA, colD);

      if (amShift) {
        addShiftToDay(currentDay, "AM", amRole, amShift);
      } else if (amRoleLabel) {
        amRole = amRoleLabel;
      }
    }

    if (colF) {
      const pmRoleLabel = parseRoleLabel(colF);
      const pmShift = parseNameAndTime(colF, colI);

      if (pmShift) {
        addShiftToDay(currentDay, "PM", pmRole, pmShift);
      } else if (pmRoleLabel) {
        pmRole = pmRoleLabel;
      }
    }
  }

  return days;
}

function parseLegacyScheduleLayout(rows: RawSheet): ScheduleDay[] {
  const days = DAYS.map(createEmptyDay);

  let currentDay: ScheduleDay | null = null;
  let currentPeriod: "AM" | "PM" = "AM";
  let currentRole: string | null = null;

  for (const row of rows) {
    if (!row || row.every((cell) => !cell.trim())) continue;

    const joined = row.join(" ").trim();
    const firstCell = row[AM_NAME_COL]?.trim() ?? "";

    const dayHeader = parseDayHeader(firstCell || joined);
    if (dayHeader) {
      currentDay = days.find((day) => day.day === dayHeader.day) ?? null;
      if (currentDay && dayHeader.dateLabel) {
        currentDay.dateLabel = dayHeader.dateLabel;
      }
      currentRole = null;
      continue;
    }

    if (
      firstCell.toUpperCase() === "AM" &&
      row[PM_NAME_COL]?.trim().toUpperCase() === "PM"
    ) {
      currentRole = null;
      continue;
    }

    const periodFromRow = detectMealPeriod(joined);
    if (
      periodFromRow &&
      rowIncludes(row, "am", "pm") &&
      !extractTimeRange(colOrEmpty(row, AM_TIME_COL)) &&
      !extractTimeRange(colOrEmpty(row, PM_TIME_COL))
    ) {
      currentPeriod = periodFromRow;
      currentRole = null;
      continue;
    }

    const roleHeader = row.find((cell) => parseRoleLabel(cell));
    if (roleHeader) {
      currentRole = parseRoleLabel(roleHeader);
      continue;
    }

    if (!currentDay) continue;

    const amShift = parseNameAndTime(
      colOrEmpty(row, AM_NAME_COL),
      colOrEmpty(row, AM_TIME_COL),
    );
    const pmShift = parseNameAndTime(
      colOrEmpty(row, PM_NAME_COL),
      colOrEmpty(row, PM_TIME_COL),
    );

    if (amShift) {
      addShiftToDay(currentDay, "AM", currentRole, amShift);
    }
    if (pmShift) {
      addShiftToDay(currentDay, "PM", currentRole, pmShift);
    }

    if (!amShift && !pmShift) {
      const mealBlock = getMealBlock(currentDay, currentPeriod);
      const roleBlock = getRoleBlock(mealBlock, currentRole ?? "Staff");

      for (const cell of row) {
        const shift = parseShiftCell(cell);
        if (shift) roleBlock.shifts.push(shift);
      }
    }
  }

  return days;
}

function colOrEmpty(row: string[], index: number): string {
  return row[index]?.trim() ?? "";
}

function hasScheduledShifts(days: ScheduleDay[]): boolean {
  return days.some((day) =>
    day.mealPeriods.some((period) =>
      period.roles.some((role) => role.shifts.length > 0),
    ),
  );
}

export function parseScheduleSheet(rows: RawSheet): ScheduleData {
  const metrics = parseMetrics(rows);
  const generatedAt = parseGeneratedAt(rows);

  let days = isShiftReportColumnLayout(rows)
    ? parseShiftReportColumnLayout(rows)
    : parseLegacyScheduleLayout(rows);

  if (!hasScheduledShifts(days)) {
    days = buildFallbackSchedule(rows);
  }

  return {
    metrics,
    generatedAt,
    days: days.map(ensureDayManagementSlots),
  };
}

function buildFallbackSchedule(rows: RawSheet): ScheduleDay[] {
  const days = DAYS.map(createEmptyDay);
  let dayIndex = 0;
  let period: "AM" | "PM" = "AM";
  let role = "Staff";

  for (const row of rows) {
    const firstCell = row[0]?.trim() ?? "";
    const dayHeader = parseDayHeader(firstCell);
    if (dayHeader) {
      const idx = DAYS.indexOf(dayHeader.day);
      if (idx >= 0) dayIndex = idx;
      const day = days[dayIndex];
      if (day && dayHeader.dateLabel) {
        day.dateLabel = dayHeader.dateLabel;
      }
      period = detectMealPeriod(row.join(" ")) ?? period;
      continue;
    }

    if (/role|position/i.test(firstCell)) {
      role = row[1]?.trim() || row[0]?.replace(/role|position/i, "").trim() || role;
      continue;
    }

    const amShift = parseNameAndTime(
      colOrEmpty(row, AM_NAME_COL),
      colOrEmpty(row, AM_TIME_COL),
    );
    const pmShift = parseNameAndTime(
      colOrEmpty(row, PM_NAME_COL),
      colOrEmpty(row, PM_TIME_COL),
    );

    const day = days[dayIndex];
    if (!day) continue;

    if (amShift) addShiftToDay(day, "AM", role, amShift);
    if (pmShift) addShiftToDay(day, "PM", role, pmShift);

    if (!amShift && !pmShift) {
      const shiftTexts = row.filter((cell) => extractTimeRange(cell));
      if (shiftTexts.length === 0) continue;

      const mealBlock = getMealBlock(day, period);
      const roleBlock = getRoleBlock(mealBlock, role);

      shiftTexts.forEach((text) => {
        const shift = parseShiftCell(text);
        if (shift) roleBlock.shifts.push(shift);
      });
    }
  }

  return days;
}

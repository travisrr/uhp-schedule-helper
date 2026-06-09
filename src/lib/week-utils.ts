import { DAYS, DAY_LABELS, type DayKey } from "./utils";

const DAY_OFFSET: Record<DayKey, number> = {
  Wed: 0,
  Thu: 1,
  Fri: 2,
  Sat: 3,
  Sun: 4,
  Mon: 5,
  Tue: 6,
};

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODateString(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return startOfDay(new Date(year, month - 1, day));
}

/** Wednesday that starts the Wed–Tue business week containing `date`. */
export function getWeekStartWednesday(date: Date): Date {
  const normalized = startOfDay(date);
  const daysSinceWednesday = (normalized.getDay() - 3 + 7) % 7;
  normalized.setDate(normalized.getDate() - daysSinceWednesday);
  return normalized;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return startOfDay(copy);
}

export function getDateForDay(weekStartWednesday: Date, day: DayKey): Date {
  return addDays(weekStartWednesday, DAY_OFFSET[day]);
}

const shortMonth = new Intl.DateTimeFormat("en-US", { month: "short" });
const longWeekday = new Intl.DateTimeFormat("en-US", { weekday: "long" });

export function formatDayDateLabel(date: Date): string {
  const weekday = longWeekday.format(date);
  const month = shortMonth.format(date);
  const day = date.getDate();
  const year = date.getFullYear();
  return `${weekday}, ${month} ${day}, ${year}`;
}

export function formatWeekRange(weekStartWednesday: Date): string {
  const weekEndTuesday = addDays(weekStartWednesday, 6);
  const startMonth = shortMonth.format(weekStartWednesday);
  const endMonth = shortMonth.format(weekEndTuesday);
  const startDay = weekStartWednesday.getDate();
  const endDay = weekEndTuesday.getDate();
  const year = weekEndTuesday.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

export function formatGeneratedTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function buildDayDateLabels(weekStartWednesday: Date): Record<DayKey, string> {
  return DAYS.reduce(
    (labels, day) => {
      labels[day] = formatDayDateLabel(getDateForDay(weekStartWednesday, day));
      return labels;
    },
    {} as Record<DayKey, string>,
  );
}

export function getDefaultWeekStart(): Date {
  return getWeekStartWednesday(new Date());
}

export { DAY_LABELS, DAY_OFFSET };

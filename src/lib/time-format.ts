const TIME_TOKEN =
  /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–—]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i;
const SINGLE_TIME = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

export function parseShiftTimeRange(
  timeRange: string,
): { start: string; end: string } | null {
  const match = timeRange.match(TIME_TOKEN);
  if (!match) return null;
  return {
    start: normalizeTimeToken(match[1]),
    end: normalizeTimeToken(match[2]),
  };
}

export function formatShiftTimeRange(start: string, end: string): string {
  return `${normalizeTimeToken(start)} - ${normalizeTimeToken(end)}`;
}

export function isValidTimeToken(value: string): boolean {
  return SINGLE_TIME.test(value.trim());
}

function normalizeTimeToken(value: string): string {
  const match = value.trim().match(SINGLE_TIME);
  if (!match) return value.trim();
  const hour = Number.parseInt(match[1], 10);
  return `${hour}:${match[2]} ${match[3].toUpperCase()}`;
}

import { format, parseISO, startOfWeek, addDays, addWeeks } from "date-fns";

/** Local calendar date string "YYYY-MM-DD" for a Date (no UTC conversion). */
export function localDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Parse "YYYY-MM-DD" as a local date at midnight (never UTC-shifted). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date string: ${s}`);
  return new Date(y, m - 1, d);
}

export function addDaysStr(dateStr: string, days: number): string {
  return localDateStr(addDays(parseLocalDate(dateStr), days));
}

export function todayStr(): string {
  return localDateStr(new Date());
}

/** Macromint weeks run Monday → Sunday. */
export function weekStartFor(dateStr: string): string {
  return localDateStr(startOfWeek(parseLocalDate(dateStr), { weekStartsOn: 1 }));
}

/**
 * The 7 local dates of the week containing `dateStr`, shifted by `weekOffset`
 * (0 = current week, -1 = previous week, +1 = next week).
 */
export function weekDates(dateStr: string, weekOffset = 0): string[] {
  const start = addWeeks(parseLocalDate(weekStartFor(dateStr)), weekOffset);
  return Array.from({ length: 7 }, (_, i) => localDateStr(addDays(start, i)));
}

/** Human week label, e.g. "Oct 19 – Oct 25" (en dash when the span fits). */
export function weekLabel(dates: string[]): string {
  if (dates.length !== 7) throw new Error("weekLabel expects exactly 7 dates");
  const a = parseLocalDate(dates[0]);
  const b = parseLocalDate(dates[6]);
  const sameMonth = a.getMonth() === b.getMonth();
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = format(a, sameYear ? "MMM d" : "MMM d, yyyy");
  const right = format(b, sameMonth ? "d" : sameYear ? "MMM d" : "MMM d, yyyy");
  return `${left} – ${right}`;
}

/** The date ranges of the last `n` weeks ending with the current week. */
export function lastNWeeks(dateStr: string, n: number): string[][] {
  return Array.from({ length: n }, (_, i) => weekDates(dateStr, -(n - 1 - i)));
}

export function formatDateLong(dateStr: string): string {
  return format(parseLocalDate(dateStr), "EEEE, MMM d, yyyy");
}

export function formatDateShort(dateStr: string): string {
  return format(parseLocalDate(dateStr), "MMM d");
}

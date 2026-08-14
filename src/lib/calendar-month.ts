import { addDaysStr, weekdayOf } from "@/lib/recurrence/occurrences";

const pad = (n: number) => String(n).padStart(2, "0");

export type MonthRef = { year: number; month: number }; // month is 1-12

/** Parse a `YYYY-MM` param, falling back to the month containing `today`. */
export function parseMonthParam(
  param: string | undefined,
  today: string,
): MonthRef {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const [y, m] = today.split("-").map(Number);
  return { year: y, month: m };
}

export function monthParam(ref: MonthRef): string {
  return `${ref.year}-${pad(ref.month)}`;
}

export function addMonths(ref: MonthRef, delta: number): MonthRef {
  const idx = ref.year * 12 + (ref.month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function monthLabel(ref: MonthRef): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(ref.year, ref.month - 1, 1)));
}

function firstOfMonth(ref: MonthRef): string {
  return `${ref.year}-${pad(ref.month)}-01`;
}

/** The 6×7 grid of date strings covering the month (Sunday-first weeks). */
export function buildWeeks(ref: MonthRef): string[][] {
  const first = firstOfMonth(ref);
  const gridStart = addDaysStr(first, -weekdayOf(first)); // back to Sunday
  const weeks: string[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDaysStr(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Load range for a month view: the visible grid plus a small buffer. */
export function monthLoadRange(ref: MonthRef): { start: string; end: string } {
  const weeks = buildWeeks(ref);
  return {
    start: addDaysStr(weeks[0][0], -1),
    end: addDaysStr(weeks[5][6], 1),
  };
}

export function isInMonth(dateStr: string, ref: MonthRef): boolean {
  const [y, m] = dateStr.split("-").map(Number);
  return y === ref.year && m === ref.month;
}

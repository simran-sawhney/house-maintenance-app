import type { RecurrenceRule } from "@/types/db";

/**
 * Recurring-task occurrence maths. Operates entirely on YYYY-MM-DD **date
 * strings** using UTC arithmetic, so it is timezone-drift free and matches the
 * "date-only semantics for all-day household tasks" requirement (spec §30).
 *
 * We never pre-generate rows — occurrences are computed on demand for a bounded
 * window; completion state lives in the `task_occurrences` table.
 */

const DAY = 86_400_000;

type YMD = { y: number; m: number; d: number };

function parse(s: string): YMD {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}
/** Days since epoch for a date string (UTC). */
function dayIndex(s: string): number {
  const { y, m, d } = parse(s);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY);
}
function fromIndex(i: number): string {
  const dt = new Date(i * DAY);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
export function weekdayOf(s: string): number {
  const { y, m, d } = parse(s);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
}
export function addDaysStr(s: string, n: number): string {
  return fromIndex(dayIndex(s) + n);
}
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
/** Signed whole-day difference a - b. */
export function diffDays(a: string, b: string): number {
  return dayIndex(a) - dayIndex(b);
}
export function compareDateStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function normalizeInterval(rule: RecurrenceRule): number {
  return Math.max(1, Math.floor(rule.interval || 1));
}

/** Is `date` a valid occurrence of `rule` anchored at `anchor`? */
export function isOccurrence(
  rule: RecurrenceRule,
  anchor: string,
  date: string,
): boolean {
  if (date < anchor) return false;
  const interval = normalizeInterval(rule);

  if (rule.frequency === "daily") {
    return (dayIndex(date) - dayIndex(anchor)) % interval === 0;
  }

  if (rule.frequency === "weekly") {
    const days =
      rule.days_of_week && rule.days_of_week.length > 0
        ? rule.days_of_week
        : [weekdayOf(anchor)];
    if (!days.includes(weekdayOf(date))) return false;
    // Sunday-based week number, aligned to the anchor's week.
    const weekOf = (s: string) =>
      Math.floor((dayIndex(s) - weekdayOf(s)) / 7);
    const aw = weekOf(date) - weekOf(anchor);
    return aw >= 0 && aw % interval === 0;
  }

  // monthly
  const a = parse(anchor);
  const d = parse(date);
  const dim = daysInMonth(d.y, d.m);
  if (d.d !== Math.min(a.d, dim)) return false;
  const md = (d.y - a.y) * 12 + (d.m - a.m);
  return md >= 0 && md % interval === 0;
}

/**
 * All occurrence dates within [rangeStart, rangeEnd] (inclusive), respecting
 * the recurrence end date. Range is expected to be bounded (a month + buffer,
 * or a few weeks for the agenda).
 */
export function generateOccurrences(
  rule: RecurrenceRule,
  anchor: string,
  rangeStart: string,
  rangeEnd: string,
  endDate?: string | null,
): string[] {
  const start = rangeStart > anchor ? rangeStart : anchor;
  const end = endDate && endDate < rangeEnd ? endDate : rangeEnd;
  if (start > end) return [];

  const out: string[] = [];
  let i = dayIndex(start);
  const last = dayIndex(end);
  // Safety cap: never scan more than ~2 years of days in one call.
  const cap = Math.min(last, i + 800);
  for (; i <= cap; i++) {
    const s = fromIndex(i);
    if (isOccurrence(rule, anchor, s)) out.push(s);
  }
  return out;
}

/** First occurrence on or after `from` (bounded search). */
export function nextOccurrenceOnOrAfter(
  rule: RecurrenceRule,
  anchor: string,
  from: string,
  endDate?: string | null,
): string | null {
  const start = from > anchor ? from : anchor;
  if (endDate && start > endDate) return null;
  const window = normalizeInterval(rule) * 40 + 40;
  const list = generateOccurrences(
    rule,
    anchor,
    start,
    addDaysStr(start, window),
    endDate,
  );
  return list[0] ?? null;
}

/** Latest occurrence on or before `to` (bounded search, not before anchor). */
export function prevOccurrenceOnOrBefore(
  rule: RecurrenceRule,
  anchor: string,
  to: string,
): string | null {
  if (to < anchor) return null;
  const window = normalizeInterval(rule) * 40 + 40;
  const from = addDaysStr(to, -window);
  const list = generateOccurrences(
    rule,
    anchor,
    from > anchor ? from : anchor,
    to,
  );
  return list.length > 0 ? list[list.length - 1] : null;
}

export type CurrentOccurrence = {
  date: string;
  overdue: boolean; // strictly before today and not yet completed
};

/**
 * The single occurrence a recurring task should surface in list views, given
 * which dates are already completed:
 *   - the most recent scheduled occurrence <= today, if it's not completed
 *     (this is "due today" or "overdue"),
 *   - otherwise the next upcoming occurrence.
 * Avoids accumulating an infinite backlog of missed periods.
 */
export function currentOccurrence(
  rule: RecurrenceRule,
  anchor: string,
  today: string,
  isCompleted: (date: string) => boolean,
  endDate?: string | null,
): CurrentOccurrence | null {
  const prev = prevOccurrenceOnOrBefore(rule, anchor, today);
  if (prev && !isCompleted(prev)) {
    return { date: prev, overdue: prev < today };
  }
  const next = nextOccurrenceOnOrAfter(
    rule,
    anchor,
    addDaysStr(today, 1),
    endDate,
  );
  if (next) return { date: next, overdue: false };
  return null;
}

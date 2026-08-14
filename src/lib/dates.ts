/**
 * Human-friendly date helpers (build spec §75). Timestamps are stored in UTC;
 * we display them in the household timezone (default Australia/Melbourne).
 */

export const DEFAULT_TIMEZONE = "Australia/Melbourne";

function parts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const p = fmt.formatToParts(date);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Whole-day difference between two dates within a timezone. */
function dayDiff(a: Date, b: Date, timeZone: string): number {
  const pa = parts(a, timeZone);
  const pb = parts(b, timeZone);
  const ua = Date.UTC(pa.y, pa.m - 1, pa.d);
  const ub = Date.UTC(pb.y, pb.m - 1, pb.d);
  return Math.round((ua - ub) / 86_400_000);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Calendar date (YYYY-MM-DD) of an instant, in the household timezone. */
export function toDateStr(
  input: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const p = parts(date, timeZone);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Today's calendar date (YYYY-MM-DD) in the household timezone. */
export function todayStr(timeZone: string = DEFAULT_TIMEZONE): string {
  return toDateStr(new Date(), timeZone);
}

/**
 * Store an all-day date as noon UTC so the calendar day is stable across
 * timezones (avoids a task jumping to the previous/next day). (spec §30)
 */
export function dateStrToDueISO(dateStr: string): string {
  return `${dateStr}T12:00:00.000Z`;
}

/** Friendly label for a YYYY-MM-DD date string relative to today. */
export function formatDateStrFriendly(
  dateStr: string,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const today = todayStr(timeZone);
  const [ty, tm, td] = today.split("-").map(Number);
  const [y, m, d] = dateStr.split("-").map(Number);
  const diff = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000,
  );
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const sameYear = y === ty;
  // Within the coming week, show the weekday name.
  if (diff > 1 && diff < 7) {
    return new Intl.DateTimeFormat("en-AU", {
      timeZone: "UTC",
      weekday: "long",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

/** "Today", "Yesterday", "12 Aug", "12 Aug 2026". */
export function formatFriendlyDate(
  input: string | Date | null | undefined,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diff = dayDiff(date, now, timeZone);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff === 1) return "Tomorrow";

  const sameYear = parts(date, timeZone).y === parts(now, timeZone).y;
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

/** Relative phrase like "3 days ago", "just now". */
export function formatRelative(
  input: string | Date | null | undefined,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const ms = now.getTime() - date.getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24 && dayDiff(date, now, timeZone) === 0)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = -dayDiff(date, now, timeZone);
  if (days <= 0) return formatFriendlyDate(date, timeZone);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatFriendlyDate(date, timeZone);
}

/** Whole days since a timestamp, in the household timezone. */
export function daysSince(
  input: string | Date,
  timeZone: string = DEFAULT_TIMEZONE,
): number {
  const date = typeof input === "string" ? new Date(input) : input;
  return -dayDiff(date, new Date(), timeZone);
}

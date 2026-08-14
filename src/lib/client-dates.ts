import { addDaysStr, weekdayOf } from "@/lib/recurrence/occurrences";

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date (YYYY-MM-DD) in the device's local timezone. */
export function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function tomorrowLocalStr(): string {
  return addDaysStr(todayLocalStr(), 1);
}

/** Upcoming Saturday (or today if it's already Saturday). */
export function upcomingWeekendStr(): string {
  const today = todayLocalStr();
  const delta = (6 - weekdayOf(today) + 7) % 7;
  return addDaysStr(today, delta);
}

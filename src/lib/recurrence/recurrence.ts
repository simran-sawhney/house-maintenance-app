import type { RecurrenceRule } from "@/types/db";

/**
 * Compute the next occurrence after `from` for a recurrence rule (build spec
 * §31). Pure and timezone-agnostic — it shifts the calendar date and preserves
 * the time-of-day of `from`. No raw RRULE is exposed to users.
 */
export function nextOccurrence(rule: RecurrenceRule, from: Date): Date {
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  const d = new Date(from.getTime());

  switch (rule.freq) {
    case "daily": {
      d.setDate(d.getDate() + interval);
      return d;
    }
    case "weekly": {
      if (rule.weekday != null) {
        // Next matching weekday strictly after `from`, then add extra weeks.
        const target = ((rule.weekday % 7) + 7) % 7;
        do {
          d.setDate(d.getDate() + 1);
        } while (d.getDay() !== target);
        if (interval > 1) d.setDate(d.getDate() + (interval - 1) * 7);
        return d;
      }
      d.setDate(d.getDate() + interval * 7);
      return d;
    }
    case "monthly": {
      const day = d.getDate();
      d.setDate(1); // avoid overflow (e.g. 31 Jan -> Mar)
      d.setMonth(d.getMonth() + interval);
      const daysInMonth = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
      ).getDate();
      d.setDate(Math.min(day, daysInMonth));
      return d;
    }
    default:
      return d;
  }
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Human-friendly label, e.g. "Every 2 weeks", "Every Saturday". */
export function recurrenceLabel(rule: RecurrenceRule | null): string {
  if (!rule) return "";
  const n = Math.max(1, Math.floor(rule.interval || 1));
  if (rule.freq === "weekly" && rule.weekday != null) {
    const day = WEEKDAYS[((rule.weekday % 7) + 7) % 7];
    return n === 1 ? `Every ${day}` : `Every ${n} weeks on ${day}`;
  }
  const unit = { daily: "day", weekly: "week", monthly: "month" }[rule.freq];
  return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
}

/** Preset options offered in Quick Add (build spec §32). */
export const RECURRENCE_PRESETS: {
  key: string;
  label: string;
  rule: RecurrenceRule | null;
}[] = [
  { key: "none", label: "One-off", rule: null },
  { key: "daily", label: "Daily", rule: { freq: "daily", interval: 1 } },
  { key: "weekly", label: "Weekly", rule: { freq: "weekly", interval: 1 } },
  {
    key: "fortnightly",
    label: "Every 2 weeks",
    rule: { freq: "weekly", interval: 2 },
  },
  { key: "monthly", label: "Monthly", rule: { freq: "monthly", interval: 1 } },
];

/** Match a stored rule back to a preset key for UI selection. */
export function presetKeyForRule(rule: RecurrenceRule | null): string {
  if (!rule) return "none";
  const found = RECURRENCE_PRESETS.find(
    (p) =>
      p.rule &&
      p.rule.freq === rule.freq &&
      p.rule.interval === rule.interval &&
      (p.rule.weekday ?? null) === (rule.weekday ?? null),
  );
  return found?.key ?? "none";
}

import type { RecurrenceRule } from "@/types/db";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Tolerantly parse a stored recurrence rule, accepting both the current shape
 * ({frequency, interval, days_of_week}) and the legacy one ({freq, interval,
 * weekday}). Returns null for no recurrence.
 */
export function normalizeRule(raw: unknown): RecurrenceRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const frequency = (r.frequency ?? r.freq) as
    | "daily"
    | "weekly"
    | "monthly"
    | undefined;
  if (frequency !== "daily" && frequency !== "weekly" && frequency !== "monthly")
    return null;
  const interval = Math.max(1, Math.floor(Number(r.interval) || 1));
  let days: number[] | undefined;
  if (Array.isArray(r.days_of_week)) {
    days = (r.days_of_week as unknown[])
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  } else if (r.weekday != null) {
    days = [Number(r.weekday)];
  }
  return {
    frequency,
    interval,
    ...(frequency === "weekly" && days && days.length > 0
      ? { days_of_week: days }
      : {}),
  };
}

/** Human-friendly label, e.g. "Every Saturday", "Every 2 weeks", "Every 3 months". */
export function recurrenceLabel(rule: RecurrenceRule | null): string {
  const r = normalizeRule(rule);
  if (!r) return "";
  const n = r.interval;

  if (r.frequency === "weekly") {
    const days = r.days_of_week ?? [];
    if (days.length > 0) {
      const names = [...days]
        .sort((a, b) => a - b)
        .map((d) => (days.length === 1 ? WEEKDAYS[d] : WEEKDAYS_SHORT[d]));
      const list = names.join(", ");
      if (n === 1) return `Every ${list}`;
      return `Every ${n} weeks on ${list}`;
    }
    return n === 1 ? "Every week" : `Every ${n} weeks`;
  }
  if (r.frequency === "daily") {
    return n === 1 ? "Every day" : `Every ${n} days`;
  }
  return n === 1 ? "Every month" : `Every ${n} months`;
}

/** Short chip-friendly summary, e.g. "Weekly", "Every 2 wks". */
export function recurrenceShort(rule: RecurrenceRule | null): string {
  const r = normalizeRule(rule);
  if (!r) return "";
  const n = r.interval;
  if (r.frequency === "daily") return n === 1 ? "Daily" : `Every ${n} days`;
  if (r.frequency === "monthly")
    return n === 1 ? "Monthly" : `Every ${n} mo`;
  const days = r.days_of_week ?? [];
  if (days.length > 0 && n === 1) {
    if (days.length === 1) return WEEKDAYS_SHORT[days[0]];
    return days
      .slice()
      .sort((a, b) => a - b)
      .map((d) => WEEKDAYS_SHORT[d][0])
      .join("");
  }
  return n === 1 ? "Weekly" : `Every ${n} wks`;
}

export type PresetKey =
  | "none"
  | "daily"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "custom";

/** Quick Add recurrence presets. `custom` is handled with extra controls. */
export const RECURRENCE_PRESETS: { key: PresetKey; label: string }[] = [
  { key: "none", label: "One-off" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "fortnightly", label: "Every 2 weeks" },
  { key: "monthly", label: "Monthly" },
  { key: "custom", label: "Custom" },
];

/** Build a rule for a preset (weekly presets take optional weekday set). */
export function ruleForPreset(
  key: PresetKey,
  daysOfWeek?: number[],
): RecurrenceRule | null {
  const weekly = (interval: number): RecurrenceRule => ({
    frequency: "weekly",
    interval,
    ...(daysOfWeek && daysOfWeek.length > 0 ? { days_of_week: daysOfWeek } : {}),
  });
  switch (key) {
    case "daily":
      return { frequency: "daily", interval: 1 };
    case "weekly":
      return weekly(1);
    case "fortnightly":
      return weekly(2);
    case "monthly":
      return { frequency: "monthly", interval: 1 };
    case "none":
    case "custom":
    default:
      return null;
  }
}

/** Match a stored rule back to a preset key for UI selection. */
export function presetKeyForRule(rule: RecurrenceRule | null): PresetKey {
  const r = normalizeRule(rule);
  if (!r) return "none";
  if (r.frequency === "daily") return r.interval === 1 ? "daily" : "custom";
  if (r.frequency === "monthly") return r.interval === 1 ? "monthly" : "custom";
  // weekly
  if (r.interval === 1) return "weekly";
  if (r.interval === 2) return "fortnightly";
  return "custom";
}

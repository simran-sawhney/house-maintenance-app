import { describe, it, expect } from "vitest";
import {
  generateOccurrences,
  isOccurrence,
  nextOccurrenceOnOrAfter,
  currentOccurrence,
} from "@/lib/recurrence/occurrences";
import type { RecurrenceRule } from "@/types/db";

const weeklySat: RecurrenceRule = {
  frequency: "weekly",
  interval: 1,
  days_of_week: [6],
};
const fortnightlySat: RecurrenceRule = {
  frequency: "weekly",
  interval: 2,
  days_of_week: [6],
};
const every3Months: RecurrenceRule = { frequency: "monthly", interval: 3 };
const every7Days: RecurrenceRule = { frequency: "daily", interval: 7 };

// 2026-08-15 is a Saturday.
const ANCHOR_SAT = "2026-08-15";

describe("generateOccurrences — weekly", () => {
  it("lists every Saturday in range", () => {
    const dates = generateOccurrences(
      weeklySat,
      ANCHOR_SAT,
      "2026-08-01",
      "2026-09-15",
    );
    expect(dates).toEqual([
      "2026-08-15",
      "2026-08-22",
      "2026-08-29",
      "2026-09-05",
      "2026-09-12",
    ]);
  });

  it("does not produce dates before the anchor", () => {
    const dates = generateOccurrences(
      weeklySat,
      ANCHOR_SAT,
      "2026-07-01",
      "2026-08-20",
    );
    expect(dates[0]).toBe("2026-08-15");
  });
});

describe("generateOccurrences — every 2 weeks", () => {
  it("skips the off weeks", () => {
    const dates = generateOccurrences(
      fortnightlySat,
      ANCHOR_SAT,
      "2026-08-15",
      "2026-10-01",
    );
    expect(dates).toEqual(["2026-08-15", "2026-08-29", "2026-09-12", "2026-09-26"]);
  });
});

describe("generateOccurrences — monthly every 3 months", () => {
  it("advances by the interval and clamps day", () => {
    const dates = generateOccurrences(
      every3Months,
      "2026-01-31",
      "2026-01-01",
      "2026-12-31",
    );
    // Jan 31 -> Apr (30) -> Jul 31 -> Oct 31
    expect(dates).toEqual(["2026-01-31", "2026-04-30", "2026-07-31", "2026-10-31"]);
  });
});

describe("isOccurrence — every 7 days", () => {
  it("matches multiples of the interval from the anchor", () => {
    expect(isOccurrence(every7Days, "2026-08-01", "2026-08-08")).toBe(true);
    expect(isOccurrence(every7Days, "2026-08-01", "2026-08-09")).toBe(false);
    expect(isOccurrence(every7Days, "2026-08-01", "2026-08-15")).toBe(true);
  });
});

describe("nextOccurrenceOnOrAfter", () => {
  it("finds the next Saturday", () => {
    expect(nextOccurrenceOnOrAfter(weeklySat, ANCHOR_SAT, "2026-08-16")).toBe(
      "2026-08-22",
    );
  });
  it("respects an end date", () => {
    expect(
      nextOccurrenceOnOrAfter(weeklySat, ANCHOR_SAT, "2026-09-01", "2026-08-31"),
    ).toBeNull();
  });
});

describe("currentOccurrence — completion & overdue behaviour", () => {
  it("completing one occurrence advances to the next (future stays open)", () => {
    const completed = new Set(["2026-08-15"]);
    const cur = currentOccurrence(
      weeklySat,
      ANCHOR_SAT,
      "2026-08-15", // today == the completed one
      (d) => completed.has(d),
    );
    expect(cur).toEqual({ date: "2026-08-22", overdue: false });
  });

  it("an uncompleted past occurrence shows as overdue", () => {
    const cur = currentOccurrence(
      weeklySat,
      ANCHOR_SAT,
      "2026-08-18", // Tuesday after the 15th, not completed
      () => false,
    );
    expect(cur).toEqual({ date: "2026-08-15", overdue: true });
  });

  it("does not accumulate a backlog once caught up", () => {
    // Everything up to today completed -> next upcoming, not overdue.
    const completed = new Set(["2026-08-15", "2026-08-22"]);
    const cur = currentOccurrence(
      weeklySat,
      ANCHOR_SAT,
      "2026-08-22",
      (d) => completed.has(d),
    );
    expect(cur).toEqual({ date: "2026-08-29", overdue: false });
  });
});

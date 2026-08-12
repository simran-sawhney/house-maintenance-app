import { describe, it, expect } from "vitest";
import { median, computeSuggestion } from "@/lib/suggestions/interval";

const DAY = 86_400_000;
const days = (n: number) => n * DAY;

describe("median", () => {
  it("odd length", () => expect(median([3, 1, 2])).toBe(2));
  it("even length averages the middle", () =>
    expect(median([1, 2, 3, 4])).toBe(2.5));
  it("empty is 0", () => expect(median([])).toBe(0));
});

describe("computeSuggestion", () => {
  it("returns null with fewer than 3 purchases", () => {
    const now = days(100);
    expect(computeSuggestion([days(0), days(4)], now)).toBeNull();
  });

  it("computes a ~4 day interval and eligibility at 80%", () => {
    // Purchases every 4 days: day 0,4,8,12. Now day 15 -> 3 days since last.
    const dates = [days(0), days(4), days(8), days(12)];
    const now = days(15);
    const s = computeSuggestion(dates, now)!;
    expect(s.typicalIntervalDays).toBe(4);
    expect(s.daysSinceLast).toBe(3);
    // 3 >= 4*0.8 (3.2)? no -> not eligible yet
    expect(s.eligible).toBe(false);
  });

  it("becomes eligible once ~80% of the interval has elapsed", () => {
    const dates = [days(0), days(4), days(8), days(12)];
    const now = days(16); // 4 days since last == the interval
    const s = computeSuggestion(dates, now)!;
    expect(s.eligible).toBe(true);
    expect(s.score).toBeGreaterThan(0);
  });

  it("uses median so a single outlier interval doesn't dominate", () => {
    // intervals: 4,4,40,4 -> median 4 (mean would be 13)
    const dates = [days(0), days(4), days(8), days(48), days(52)];
    const now = days(56);
    const s = computeSuggestion(dates, now)!;
    expect(s.typicalIntervalDays).toBe(4);
  });

  it("scores a very overdue regular item higher than a barely-due one", () => {
    const regular = [days(0), days(7), days(14), days(21)];
    const overdue = computeSuggestion(regular, days(42))!; // 21 days late
    const barely = computeSuggestion(regular, days(28))!; // just due
    expect(overdue.score).toBeGreaterThan(barely.score);
  });
});

import { describe, it, expect } from "vitest";
import {
  normalizeRule,
  recurrenceLabel,
  presetKeyForRule,
  ruleForPreset,
} from "@/lib/recurrence/recurrence";

describe("normalizeRule", () => {
  it("accepts the current shape", () => {
    expect(
      normalizeRule({ frequency: "weekly", interval: 1, days_of_week: [6] }),
    ).toEqual({ frequency: "weekly", interval: 1, days_of_week: [6] });
  });

  it("migrates the legacy {freq, weekday} shape", () => {
    expect(normalizeRule({ freq: "weekly", interval: 2, weekday: 2 })).toEqual({
      frequency: "weekly",
      interval: 2,
      days_of_week: [2],
    });
  });

  it("returns null for junk", () => {
    expect(normalizeRule(null)).toBeNull();
    expect(normalizeRule({ frequency: "yearly" })).toBeNull();
  });

  it("drops days_of_week for non-weekly", () => {
    expect(normalizeRule({ frequency: "daily", interval: 7 })).toEqual({
      frequency: "daily",
      interval: 7,
    });
  });
});

describe("recurrenceLabel", () => {
  it("labels weekly with a weekday", () => {
    expect(
      recurrenceLabel({ frequency: "weekly", interval: 1, days_of_week: [6] }),
    ).toBe("Every Saturday");
  });
  it("labels every-N", () => {
    expect(recurrenceLabel({ frequency: "weekly", interval: 2 })).toBe(
      "Every 2 weeks",
    );
    expect(recurrenceLabel({ frequency: "daily", interval: 7 })).toBe(
      "Every 7 days",
    );
    expect(recurrenceLabel({ frequency: "monthly", interval: 3 })).toBe(
      "Every 3 months",
    );
  });
});

describe("presets", () => {
  it("round-trips preset keys", () => {
    expect(presetKeyForRule(ruleForPreset("weekly"))).toBe("weekly");
    expect(presetKeyForRule(ruleForPreset("fortnightly"))).toBe("fortnightly");
    expect(presetKeyForRule(ruleForPreset("monthly"))).toBe("monthly");
    expect(presetKeyForRule(null)).toBe("none");
    expect(presetKeyForRule({ frequency: "monthly", interval: 3 })).toBe(
      "custom",
    );
  });
});

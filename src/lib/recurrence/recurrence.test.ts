import { describe, it, expect } from "vitest";
import {
  nextOccurrence,
  recurrenceLabel,
  presetKeyForRule,
} from "@/lib/recurrence/recurrence";

describe("nextOccurrence", () => {
  it("daily adds interval days", () => {
    const from = new Date("2026-08-12T09:00:00Z");
    const next = nextOccurrence({ freq: "daily", interval: 3 }, from);
    expect(next.toISOString().slice(0, 10)).toBe("2026-08-15");
  });

  it("weekly adds interval weeks", () => {
    const from = new Date("2026-08-12T09:00:00Z");
    const next = nextOccurrence({ freq: "weekly", interval: 2 }, from);
    expect(next.toISOString().slice(0, 10)).toBe("2026-08-26");
  });

  it("monthly clamps to end of shorter months", () => {
    const from = new Date("2026-01-31T09:00:00Z");
    const next = nextOccurrence({ freq: "monthly", interval: 1 }, from);
    // February has 28 days in 2026
    expect(next.getMonth()).toBe(1); // February
    expect(next.getDate()).toBeLessThanOrEqual(28);
  });

  it("weekly with weekday lands on the next matching weekday", () => {
    // 2026-08-12 is a Wednesday; next Saturday (6) is 2026-08-15
    const from = new Date("2026-08-12T09:00:00");
    const next = nextOccurrence(
      { freq: "weekly", interval: 1, weekday: 6 },
      from,
    );
    expect(next.getDay()).toBe(6);
  });

  it("never returns a date before `from`", () => {
    const from = new Date("2026-08-12T09:00:00Z");
    for (const rule of [
      { freq: "daily" as const, interval: 1 },
      { freq: "weekly" as const, interval: 1 },
      { freq: "monthly" as const, interval: 1 },
    ]) {
      expect(nextOccurrence(rule, from).getTime()).toBeGreaterThan(
        from.getTime(),
      );
    }
  });
});

describe("recurrenceLabel / presetKeyForRule", () => {
  it("labels common rules", () => {
    expect(recurrenceLabel({ freq: "weekly", interval: 1 })).toBe("Every week");
    expect(recurrenceLabel({ freq: "weekly", interval: 2 })).toBe(
      "Every 2 weeks",
    );
    expect(recurrenceLabel(null)).toBe("");
  });

  it("round-trips preset keys", () => {
    expect(presetKeyForRule({ freq: "monthly", interval: 1 })).toBe("monthly");
    expect(presetKeyForRule({ freq: "weekly", interval: 2 })).toBe(
      "fortnightly",
    );
    expect(presetKeyForRule(null)).toBe("none");
  });
});

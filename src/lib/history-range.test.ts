import { describe, it, expect } from "vitest";
import { resolveDateRange, cleanSearchTerm } from "@/lib/history-range";

const TZ = "Australia/Melbourne";

describe("resolveDateRange", () => {
  it("this_month -> first of the month", () => {
    expect(resolveDateRange("this_month", TZ, null, null, "2026-08-14")).toEqual({
      from: "2026-08-01",
    });
  });

  it("last_3_months / last_6_months step back by calendar months", () => {
    expect(
      resolveDateRange("last_3_months", TZ, null, null, "2026-08-14").from,
    ).toBe("2026-05-01");
    expect(
      resolveDateRange("last_6_months", TZ, null, null, "2026-08-14").from,
    ).toBe("2026-02-01");
  });

  it("handles year boundaries", () => {
    expect(
      resolveDateRange("last_3_months", TZ, null, null, "2026-01-15").from,
    ).toBe("2025-10-01");
  });

  it("this_year and all", () => {
    expect(resolveDateRange("this_year", TZ, null, null, "2026-08-14")).toEqual({
      from: "2026-01-01",
    });
    expect(resolveDateRange("all", TZ, null, null, "2026-08-14")).toEqual({});
  });

  it("custom passes through provided bounds", () => {
    expect(
      resolveDateRange("custom", TZ, "2026-03-01", "2026-03-31", "2026-08-14"),
    ).toEqual({ from: "2026-03-01", to: "2026-03-31" });
  });
});

describe("cleanSearchTerm", () => {
  it("strips PostgREST-breaking characters and collapses spaces", () => {
    expect(cleanSearchTerm("  atta, 10kg (%) ")).toBe("atta 10kg");
    expect(cleanSearchTerm("milk*")).toBe("milk");
  });
});

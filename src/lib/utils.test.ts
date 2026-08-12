import { describe, it, expect } from "vitest";
import { normalizeItemName, parseOptionalNumber } from "@/lib/utils";

describe("normalizeItemName", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeItemName("  Milk   3L ")).toBe("milk 3l");
    expect(normalizeItemName("MILK")).toBe("milk");
  });

  it("treats punctuation as a separator", () => {
    expect(normalizeItemName("Toor-Dal!!")).toBe("toor dal");
    expect(normalizeItemName("Atta, 10kg")).toBe("atta 10kg");
  });

  it("detects duplicates via equal normalized names", () => {
    expect(normalizeItemName("Milk")).toBe(normalizeItemName("  milk  "));
    expect(normalizeItemName("Green Chilli")).toBe(
      normalizeItemName("green   chilli"),
    );
  });

  it("does not over-merge distinct products", () => {
    expect(normalizeItemName("Milk")).not.toBe(normalizeItemName("Milk Powder"));
  });

  it("handles empty and symbol-only input", () => {
    expect(normalizeItemName("   ")).toBe("");
    expect(normalizeItemName("!!!")).toBe("");
  });
});

describe("parseOptionalNumber", () => {
  it("returns null for empty", () => {
    expect(parseOptionalNumber("")).toBeNull();
    expect(parseOptionalNumber(null)).toBeNull();
  });
  it("parses valid numbers", () => {
    expect(parseOptionalNumber("4.80")).toBe(4.8);
  });
  it("returns null for junk", () => {
    expect(parseOptionalNumber("abc")).toBeNull();
  });
});

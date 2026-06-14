import { describe, it, expect } from "vitest";
import { isSafeEnumValue, classifyEnumValues, isEnumColumn } from "./enum-safety";

describe("isSafeEnumValue", () => {
  it("classifies common safe enum values as safe", () => {
    expect(isSafeEnumValue("Active")).toBe(true);
    expect(isSafeEnumValue("Full-time")).toBe(true);
    expect(isSafeEnumValue("Male")).toBe(true);
    expect(isSafeEnumValue("Single")).toBe(true);
    expect(isSafeEnumValue("Pending")).toBe(true);
    expect(isSafeEnumValue("High")).toBe(true);
    expect(isSafeEnumValue("Internal")).toBe(true);
    expect(isSafeEnumValue("Enabled")).toBe(true);
    expect(isSafeEnumValue("Yes")).toBe(true);
    expect(isSafeEnumValue("Permanent")).toBe(true);
  });

  it("classifies unsafe enum values as unsafe", () => {
    expect(isSafeEnumValue("Salary Grade 3")).toBe(false);
    expect(isSafeEnumValue("Terminated")).toBe(false);
    expect(isSafeEnumValue("Medical Leave")).toBe(false);
    expect(isSafeEnumValue("Bank Account")).toBe(false);
    expect(isSafeEnumValue("Disciplinary Warning")).toBe(false);
  });

  it("treats short single words as safe by default", () => {
    expect(isSafeEnumValue("Engineer")).toBe(true);
    expect(isSafeEnumValue("Manager")).toBe(true);
    expect(isSafeEnumValue("Consultant")).toBe(true);
  });

  it("treats long values as unsafe", () => {
    expect(isSafeEnumValue("A".repeat(61))).toBe(false);
  });
});

describe("classifyEnumValues", () => {
  it("returns safe with original values for safe enums", () => {
    const result = classifyEnumValues(["Active", "Inactive", "Active"]);
    expect(result.safe).toBe(true);
    expect(result.maskedSamples).toContain("Active");
    expect(result.maskedSamples).toContain("Inactive");
  });

  it("returns unsafe with generic token for unsafe enums", () => {
    const result = classifyEnumValues(["Medical Leave", "Sick", "Annual"]);
    expect(result.safe).toBe(false);
    expect(result.maskedSamples).toEqual(["<SENSITIVE_ENUM>"]);
  });

  it("handles empty input", () => {
    const result = classifyEnumValues(["", "  ", null as unknown as string]);
    expect(result.safe).toBe(true);
  });

  it("caps safe enum samples to 3", () => {
    const values = ["A", "B", "C", "D", "E"];
    const result = classifyEnumValues(values);
    expect(result.safe).toBe(true);
    expect(result.maskedSamples.length).toBeLessThanOrEqual(3);
  });
});

describe("isEnumColumn", () => {
  it("detects enum columns by unique ratio", () => {
    expect(isEnumColumn(["A", "B", "A", "B", "A", "B", "A", "B"], 2, 8)).toBe(true);
  });

  it("rejects columns with too many unique values", () => {
    expect(isEnumColumn(["A", "B", "C", "D"], 4, 4)).toBe(false);
  });

  it("rejects columns with too few rows", () => {
    expect(isEnumColumn(["A", "B"], 2, 2)).toBe(false);
  });
});

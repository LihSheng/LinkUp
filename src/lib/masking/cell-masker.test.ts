import { describe, it, expect } from "vitest";
import { classifyCellValue, maskCellValue } from "./cell-masker";

describe("classifyCellValue", () => {
  it("masks email addresses", () => {
    expect(classifyCellValue("john.doe@example.com")).toEqual({
      category: "email",
      masked: "<EMAIL>",
    });
    expect(classifyCellValue("user@company.co.uk")).toEqual({
      category: "email",
      masked: "<EMAIL>",
    });
  });

  it("masks phone numbers", () => {
    expect(classifyCellValue("+65 9123 4567")).toEqual({
      category: "phone",
      masked: "<PHONE>",
    });
    expect(classifyCellValue("012-345 6789")).toEqual({
      category: "phone",
      masked: "<PHONE>",
    });
    expect(classifyCellValue("+1 (555) 123-4567")).toEqual({
      category: "phone",
      masked: "<PHONE>",
    });
  });

  it("masks Singapore NRIC and FIN", () => {
    expect(classifyCellValue("S1234567A")).toEqual({
      category: "government_id",
      masked: "<GOVERNMENT_ID>",
    });
    expect(classifyCellValue("T1234567Z")).toEqual({
      category: "government_id",
      masked: "<GOVERNMENT_ID>",
    });
    expect(classifyCellValue("G1234567X")).toEqual({
      category: "government_id",
      masked: "<GOVERNMENT_ID>",
    });
    expect(classifyCellValue("F1234567B")).toEqual({
      category: "government_id",
      masked: "<GOVERNMENT_ID>",
    });
  });

  it("masks Malaysia IC numbers", () => {
    expect(classifyCellValue("880101-01-1234")).toEqual({
      category: "government_id",
      masked: "<GOVERNMENT_ID>",
    });
    expect(classifyCellValue("920305-10-5678")).toEqual({
      category: "government_id",
      masked: "<GOVERNMENT_ID>",
    });
  });

  it("masks passport-like IDs", () => {
    expect(classifyCellValue("E1234567")).toEqual({
      category: "government_id",
      masked: "<GOVERNMENT_ID>",
    });
    expect(classifyCellValue("AB1234567")).toEqual({
      category: "government_id",
      masked: "<GOVERNMENT_ID>",
    });
  });

  it("masks currency amounts", () => {
    expect(classifyCellValue("$4,500")).toEqual({
      category: "currency",
      masked: "<CURRENCY_AMOUNT>",
    });
    expect(classifyCellValue("RM 3,200")).toEqual({
      category: "currency",
      masked: "<CURRENCY_AMOUNT>",
    });
    expect(classifyCellValue("€1,200.50")).toEqual({
      category: "currency",
      masked: "<CURRENCY_AMOUNT>",
    });
    expect(classifyCellValue("5,000 USD")).toEqual({
      category: "currency",
      masked: "<CURRENCY_AMOUNT>",
    });
  });

  it("masks dates", () => {
    expect(classifyCellValue("2024-01-15")).toEqual({
      category: "date",
      masked: "<DATE>",
    });
    expect(classifyCellValue("15/01/2024")).toEqual({
      category: "date",
      masked: "<DATE>",
    });
    expect(classifyCellValue("Jan 15, 2024")).toEqual({
      category: "date",
      masked: "<DATE>",
    });
  });

  it("masks numbers", () => {
    expect(classifyCellValue("4500")).toEqual({
      category: "number",
      masked: "<NUMBER>",
    });
    expect(classifyCellValue("3.14")).toEqual({
      category: "number",
      masked: "<NUMBER>",
    });
    expect(classifyCellValue("1,234")).toEqual({
      category: "number",
      masked: "<NUMBER>",
    });
  });

  it("masks employee-code-like patterns", () => {
    expect(classifyCellValue("EMP001")).toEqual({
      category: "code",
      masked: "<CODE>",
    });
    expect(classifyCellValue("SKU-12345")).toEqual({
      category: "code",
      masked: "<CODE>",
    });
    expect(classifyCellValue("PRJ001")).toEqual({
      category: "code",
      masked: "<CODE>",
    });
  });

  it("handles empty values", () => {
    expect(classifyCellValue(null)).toEqual({
      category: "empty",
      masked: "<EMPTY>",
    });
    expect(classifyCellValue(undefined)).toEqual({
      category: "empty",
      masked: "<EMPTY>",
    });
    expect(classifyCellValue("")).toEqual({
      category: "empty",
      masked: "<EMPTY>",
    });
    expect(classifyCellValue("   ")).toEqual({
      category: "empty",
      masked: "<EMPTY>",
    });
  });

  it("masks long free text", () => {
    const longText = "A".repeat(81);
    expect(classifyCellValue(longText)).toEqual({
      category: "free_text",
      masked: "<FREE_TEXT>",
    });
  });

  it("masks person names", () => {
    expect(classifyCellValue("John Doe")).toEqual({
      category: "person_name",
      masked: "<PERSON_NAME>",
    });
    expect(classifyCellValue("Alice Tan")).toEqual({
      category: "person_name",
      masked: "<PERSON_NAME>",
    });
  });

  it("handles booleans", () => {
    expect(classifyCellValue("true")).toEqual({
      category: "boolean",
      masked: "true",
    });
    expect(classifyCellValue("false")).toEqual({
      category: "boolean",
      masked: "false",
    });
  });

  it("does not leak raw values", () => {
    const tests = [
      "john.doe@gmail.com",
      "+65 9123 4567",
      "S1234567A",
      "880101-01-1234",
      "$4,500",
      "2024-01-15",
      "EMP001",
    ];
    for (const value of tests) {
      const { masked } = classifyCellValue(value);
      expect(masked).not.toContain(value);
    }
  });
});

describe("maskCellValue", () => {
  it("returns masked string for any input", () => {
    expect(maskCellValue("test@test.com")).toBe("<EMAIL>");
    expect(maskCellValue("")).toBe("<EMPTY>");
    expect(maskCellValue(null)).toBe("<EMPTY>");
  });
});

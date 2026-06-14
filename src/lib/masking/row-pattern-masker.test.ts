import { describe, it, expect } from "vitest";
import { buildMaskedRowPatterns } from "./row-pattern-masker";

describe("buildMaskedRowPatterns", () => {
  it("masks row values", () => {
    const rows = [
      { Name: "John Doe", Email: "john@test.com", Phone: "+65 9123 4567" },
    ];
    const result = buildMaskedRowPatterns(rows, ["Name", "Email", "Phone"]);
    expect(result).toHaveLength(1);
    expect(result[0].values["Name"]).toBe("<PERSON_NAME>");
    expect(result[0].values["Email"]).toBe("<EMAIL>");
    expect(result[0].values["Phone"]).toBe("<PHONE>");
  });

  it("caps at max rows", () => {
    const rows = [
      { Name: "A" }, { Name: "B" }, { Name: "C" },
      { Name: "D" }, { Name: "E" },
    ];
    const result = buildMaskedRowPatterns(rows, ["Name"], 3);
    expect(result).toHaveLength(3);
  });

  it("omits free-text values", () => {
    const rows = [
      { Name: "John", Comment: "A".repeat(81) },
    ];
    const result = buildMaskedRowPatterns(rows, ["Name", "Comment"]);
    expect(result[0].values["Comment"]).toBeUndefined();
    expect(result[0].values["Name"]).toBeDefined();
  });

  it("omits empty values", () => {
    const rows = [
      { Name: "John", Empty: "" },
    ];
    const result = buildMaskedRowPatterns(rows, ["Name", "Empty"]);
    expect(result[0].values["Empty"]).toBeUndefined();
  });

  it("does not leak raw values", () => {
    const rows = [
      { Email: "secret@test.com", Phone: "+65 9123 4567", ID: "S1234567A" },
    ];
    const result = buildMaskedRowPatterns(rows, ["Email", "Phone", "ID"]);
    const values = Object.values(result[0].values);
    for (const v of values) {
      expect(v).not.toContain("secret@test.com");
      expect(v).not.toContain("9123");
      expect(v).not.toContain("S1234567A");
    }
  });

  it("assigns sequential row numbers", () => {
    const rows = [
      { Name: "A" }, { Name: "B" }, { Name: "C" },
    ];
    const result = buildMaskedRowPatterns(rows, ["Name"]);
    expect(result[0].rowNumber).toBe(1);
    expect(result[1].rowNumber).toBe(2);
    expect(result[2].rowNumber).toBe(3);
  });
});

import { describe, it, expect } from "vitest";
import { buildHeaderlessPreviewData, buildFirstRowPreviewData } from "./excel.service";

describe("buildHeaderlessPreviewData", () => {
  it("returns synthetic column names for raw rows without header detection", () => {
    const result = buildHeaderlessPreviewData({
      rows: [
        ["John", "john@test.com"],
        ["Jane", "jane@test.com"],
      ],
      sheetName: "Sheet1",
      sheetNames: ["Sheet1"],
      sampleLimit: 25,
    });

    expect(result.headers).toEqual(["Column A", "Column B"]);
    expect(result.sampleRows).toHaveLength(2);
    expect(result.columnProfiles).toHaveLength(2);
    expect(result.columnProfiles[0].name).toBe("Column A");
    expect(result.columnProfiles[1].name).toBe("Column B");
    expect(result.columnProfiles[0].index).toBe(0);
    expect(result.columnProfiles[1].index).toBe(1);
  });

  it("does not throw for empty rows", () => {
    const result = buildHeaderlessPreviewData({
      rows: [],
      sheetName: "Sheet1",
      sheetNames: ["Sheet1"],
      sampleLimit: 25,
    });

    expect(result.headers).toEqual([]);
    expect(result.sampleRows).toEqual([]);
    expect(result.columnProfiles).toEqual([]);
  });

  it("treats every row as data, not header", () => {
    const result = buildHeaderlessPreviewData({
      rows: [
        [1, "A"],
        [2, "B"],
        [3, "C"],
      ],
      sheetName: "Sheet1",
      sheetNames: ["Sheet1"],
      sampleLimit: 25,
    });

    expect(result.sampleRows).toHaveLength(3);
    expect(result.sampleRows[0]["Column A"]).toBe(1);
    expect(result.sampleRows[2]["Column B"]).toBe("C");
  });

  it("respects sample limit", () => {
    const rows = Array.from({ length: 100 }, (_, i) => [`Row${i}`, `${i}@test.com`]);
    const result = buildHeaderlessPreviewData({
      rows,
      sheetName: "Sheet1",
      sheetNames: ["Sheet1"],
      sampleLimit: 10,
    });

    expect(result.sampleRows).toHaveLength(10);
    expect(result.headers).toEqual(["Column A", "Column B"]);
  });
});

describe("buildFirstRowPreviewData", () => {
  it("uses the first row as headers and keeps the remaining rows as samples", () => {
    const result = buildFirstRowPreviewData({
      rows: [
        ["Name", "Email"],
        ["John", "john@test.com"],
        ["Jane", "jane@test.com"],
      ],
      sheetName: "Sheet1",
      sheetNames: ["Sheet1"],
      sampleLimit: 25,
    });

    expect(result.headerRowIndex).toBe(0);
    expect(result.headers).toEqual(["Name", "Email"]);
    expect(result.sampleRows).toHaveLength(2);
    expect(result.sampleRows[0].Name).toBe("John");
    expect(result.sampleRows[1].Email).toBe("jane@test.com");
    expect(result.columnProfiles).toHaveLength(2);
    expect(result.columnProfiles[0].name).toBe("Name");
  });

  it("falls back to generated names for blank header cells", () => {
    const result = buildFirstRowPreviewData({
      rows: [
        ["", "Email"],
        ["John", "john@test.com"],
      ],
      sheetName: "Sheet1",
      sheetNames: ["Sheet1"],
      sampleLimit: 25,
    });

    expect(result.headers).toEqual(["column_1", "Email"]);
    expect(result.sampleRows[0].column_1).toBe("John");
  });
});

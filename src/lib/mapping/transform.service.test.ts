import { describe, expect, it } from "vitest";

import { applyMappingToRows, transformers } from "@/lib/mapping/transform.service";

describe("transformers", () => {
  it("normalizes numbers", () => {
    expect(transformers.to_number("4,500")).toBe(4500);
    expect(transformers.to_number("abc")).toBeNull();
  });

  it("normalizes dates", () => {
    expect(transformers.parse_date("2026-06-10")).toBe("2026-06-10");
  });
});

describe("applyMappingToRows", () => {
  it("creates nested JSON objects from dot-path mappings", () => {
    const [result] = applyMappingToRows(
      [{ "Emp ID": "E001", "Monthly Pay": "4,500" }],
      [
        {
          targetPath: "employee_no",
          sourceColumn: "Emp ID",
          confidence: 1,
          transform: "trim",
        },
        {
          targetPath: "salary.basic",
          sourceColumn: "Monthly Pay",
          confidence: 1,
          transform: "to_number",
        },
      ],
    );

    expect(result).toEqual({
      employee_no: "E001",
      salary: {
        basic: 4500,
      },
    });
  });
});

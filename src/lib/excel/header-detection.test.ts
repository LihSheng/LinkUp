import { describe, expect, it } from "vitest";

import {
  normalizeHeader,
  scoreRowAgainstTemplate,
  detectHeaderRowByTemplate,
  type CanonicalField,
} from "@/lib/excel/header-detection";

const employeeFields: CanonicalField[] = [
  { path: "employee_no", type: "string", required: true, description: "" },
  { path: "full_name", type: "string", required: true, description: "" },
  { path: "email", type: "string", required: true, description: "" },
  { path: "department", type: "string", required: false, description: "" },
  { path: "salary", type: "number", required: false, description: "" },
];

describe("normalizeHeader", () => {
  it("trims whitespace", () => {
    expect(normalizeHeader("  Hello  ")).toBe("hello");
  });

  it("lowercases", () => {
    expect(normalizeHeader("Full Name")).toBe("full name");
  });

  it("replaces underscores and hyphens with spaces", () => {
    expect(normalizeHeader("employee_no")).toBe("employee no");
    expect(normalizeHeader("EMPLOYEE-NO")).toBe("employee no");
  });

  it("strips punctuation", () => {
    expect(normalizeHeader("Employee #:")).toBe("employee");
  });

  it("handles empty or non-string values", () => {
    expect(normalizeHeader("")).toBe("");
    expect(normalizeHeader("   ")).toBe("");
  });
});

describe("scoreRowAgainstTemplate", () => {
  it("returns perfect score when all fields match", () => {
    const row = [
      "employee_no",
      "full_name",
      "email",
      "department",
      "salary",
    ];

    const result = scoreRowAgainstTemplate(row, employeeFields);

    expect(result.score).toBe(1);
    expect(result.matchedFields).toHaveLength(5);
  });

  it("returns partial score when some fields match", () => {
    const row = ["employee_no", "full_name", "email"];

    const result = scoreRowAgainstTemplate(row, employeeFields);

    expect(result.score).toBe(3 / 5);
    expect(result.matchedFields).toHaveLength(3);
  });

  it("matches regardless of column order", () => {
    const row = [
      "salary",
      "email",
      "full_name",
      "employee_no",
      "department",
    ];

    const result = scoreRowAgainstTemplate(row, employeeFields);

    expect(result.score).toBe(1);
    expect(result.matchedFields).toHaveLength(5);
  });

  it("matches despite different formatting", () => {
    const row = [
      "Employee_No",
      "Full-Name",
      " Email ",
      "DEPARTMENT",
      "salary",
    ];

    const result = scoreRowAgainstTemplate(row, employeeFields);

    expect(result.matchedFields).toHaveLength(5);
  });

  it("returns zero score for empty row", () => {
    const result = scoreRowAgainstTemplate([], employeeFields);

    expect(result.score).toBe(0);
    expect(result.matchedFields).toHaveLength(0);
  });

  it("returns zero score when no fields match", () => {
    const row = ["Date", "Notes", "Status", "Approved By"];

    const result = scoreRowAgainstTemplate(row, employeeFields);

    expect(result.score).toBe(0);
    expect(result.matchedFields).toHaveLength(0);
  });
});

describe("detectHeaderRowByTemplate", () => {
  it("picks the correct header row when it is the first row", () => {
    const rows: unknown[][] = [
      ["employee_no", "full_name", "email", "department", "salary"],
      ["E001", "Alice", "alice@co.com", "Eng", 80000],
      ["E002", "Bob", "bob@co.com", "Eng", 75000],
    ];

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.headerRowIndex).toBe(0);
    expect(result.confidence).toBe(1);
    expect(result.ambiguous).toBe(false);
    expect(result.unmatchedRequiredFields).toHaveLength(0);
  });

  it("skips remarks rows and finds the real header row", () => {
    const rows: unknown[][] = [
      ["Employee Data Export - Q1 2025"],
      ["Generated on 2025-01-15"],
      [],
      ["employee_no", "full_name", "email", "department", "salary"],
      ["E001", "Alice", "alice@co.com", "Eng", 80000],
    ];

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.headerRowIndex).toBe(3);
    expect(result.confidence).toBe(1);
    expect(result.unmatchedRequiredFields).toHaveLength(0);
  });

  it("skips instruction rows above the header", () => {
    const rows: unknown[][] = [
      ["Instructions: Fill in the fields below."],
      ["Do not modify the header row."],
      ["employee_no", "full_name", "email", "department", "salary"],
      ["E001", "Alice", "alice@co.com", "Eng", 80000],
    ];

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.headerRowIndex).toBe(2);
    expect(result.confidence).toBe(1);
  });

  it("handles reordered columns and still detects correctly", () => {
    const rows: unknown[][] = [
      ["salary", "email", "employee_no", "full_name", "department"],
      [80000, "alice@co.com", "E001", "Alice", "Eng"],
    ];

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.headerRowIndex).toBe(0);
    expect(result.confidence).toBe(1);
    expect(result.matchedFields).toHaveLength(5);
  });

  it("reports unmatched required fields when a required field is missing", () => {
    const rows: unknown[][] = [
      ["employee_no", "full_name", "department"],
      ["E001", "Alice", "Eng"],
    ];

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.headerRowIndex).toBe(0);
    expect(result.unmatchedRequiredFields.map((f) => f.path)).toContain(
      "email",
    );
  });

  it("reports multiple unmatched required fields", () => {
    const rows: unknown[][] = [
      ["employee_no", "department"],
      ["E001", "Eng"],
    ];

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.unmatchedRequiredFields.map((f) => f.path)).toEqual(
      expect.arrayContaining(["full_name", "email"]),
    );
  });

  it("returns headerRowIndex -1 when no row matches any field", () => {
    const rows: unknown[][] = [
      ["Notes", "Comments", "Reviewed"],
      ["Some note", "Some comment", "Yes"],
    ];

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.headerRowIndex).toBe(-1);
    expect(result.confidence).toBe(0);
  });

  it("flags ambiguity when two rows score similarly", () => {
    const rows: unknown[][] = [
      ["employee_no", "full_name", "email"],
      ["email", "department", "salary"],
      ["E001", "Alice", "alice@co.com", "Eng", 80000],
    ];

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.ambiguous).toBe(true);
  });

  it("is not ambiguous when the best match is clearly better", () => {
    const rows: unknown[][] = [
      ["Info", "Date", "Version"],
      ["employee_no", "full_name", "email", "department", "salary"],
      ["E001", "Alice", "alice@co.com", "Eng", 80000],
    ];

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.headerRowIndex).toBe(1);
    expect(result.ambiguous).toBe(false);
  });

  it("throws when template fields array is empty", () => {
    const rows: unknown[][] = [
      ["employee_no", "full_name"],
    ];

    expect(() =>
      detectHeaderRowByTemplate(rows, []),
    ).toThrow("Template has no fields");
  });

  it("matches fields with normalized names against formatted headers", () => {
    const fields: CanonicalField[] = [
      { path: "employee_no", type: "string", required: true, description: "" },
    ];

    const rows: unknown[][] = [
      ["Employee-No"],
      ["E001"],
    ];

    const result = detectHeaderRowByTemplate(rows, fields);

    expect(result.headerRowIndex).toBe(0);
    expect(result.matchedFields).toHaveLength(1);
  });

  it("only scans the first 30 rows", () => {
    const rows: unknown[][] = Array.from({ length: 40 }, (_, i) =>
      i === 35
        ? ["employee_no", "full_name", "email", "department", "salary"]
        : [`row_${i}`],
    );

    const result = detectHeaderRowByTemplate(rows, employeeFields);

    expect(result.headerRowIndex).toBe(-1);
    expect(result.confidence).toBe(0);
  });
});

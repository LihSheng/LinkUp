import { describe, expect, it } from "vitest";

import { flattenJsonSchema, validateJsonAgainstSchema } from "@/lib/schema/json-schema";

describe("flattenJsonSchema", () => {
  it("extracts nested target fields", () => {
    const fields = flattenJsonSchema({
      type: "object",
      required: ["employee_no"],
      properties: {
        employee_no: { type: "string" },
        salary: {
          type: "object",
          properties: {
            basic: { type: "number" },
          },
        },
      },
    });

    expect(fields).toEqual([
      {
        path: "employee_no",
        type: "string",
        required: true,
        description: undefined,
      },
      {
        path: "salary.basic",
        type: "number",
        required: false,
        description: undefined,
      },
    ]);
  });
});

describe("validateJsonAgainstSchema", () => {
  it("validates payloads with ajv", () => {
    const result = validateJsonAgainstSchema(
      {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
        },
      },
      { name: "Alicia" },
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

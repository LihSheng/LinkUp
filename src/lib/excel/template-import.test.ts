import { describe, expect, it } from "vitest";

import {
  buildTemplateFieldsFromRows,
  detectTemplateHeaderRow,
} from "@/lib/excel/template-import";

describe("detectTemplateHeaderRow", () => {
  it("skips remark rows and picks the actual header row", () => {
    const rows: unknown[][] = [
      [
        "Remarks:\n(M) = Mandatory Fields\n(O) = Optional\n(C) = Conditional",
      ],
      [
        "(M)\nEmployee IC",
        "(C)\nMandatory if ic is no filled\nEmployee Code",
        "(O)\nFor reference only\nName",
      ],
      ["ic", "employee_code", "name"],
    ];

    expect(detectTemplateHeaderRow(rows)).toBe(2);
  });
});

describe("buildTemplateFieldsFromRows", () => {
  it("builds fields from the detected header row", () => {
    const rows: unknown[][] = [
      [
        "Remarks:\n(M) = Mandatory Fields\n(O) = Optional\n(C) = Conditional",
      ],
      [
        "(M)\nEmployee IC",
        "(C)\nMandatory if ic is no filled\nEmployee Code",
        "(O)\nFor reference only\nName",
      ],
      ["ic", "employee_code", "name"],
    ];

    const fields = buildTemplateFieldsFromRows(rows);

    expect(fields).toEqual([
      {
        id: "field-1",
        sourceHeader: "ic",
        fieldName: "ic",
        dataType: "String",
        required: false,
      },
      {
        id: "field-2",
        sourceHeader: "employee_code",
        fieldName: "employee_code",
        dataType: "String",
        required: false,
      },
      {
        id: "field-3",
        sourceHeader: "name",
        fieldName: "name",
        dataType: "String",
        required: false,
      },
    ]);
  });
});

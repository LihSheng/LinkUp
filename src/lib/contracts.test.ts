import { describe, expect, it } from "vitest";

import {
  createRunSchema,
  updateRunSchema,
  updateMappingTemplateSchema,
  confirmMappingSchema,
} from "@/lib/contracts";

describe("createRunSchema", () => {
  it("accepts a draft creation payload without uploadedFileId", () => {
    const result = createRunSchema.safeParse({
      schemaTemplateId: "tmpl_1",
      displayName: "Monthly payroll Q2 2026",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaTemplateId).toBe("tmpl_1");
      expect(result.data.displayName).toBe("Monthly payroll Q2 2026");
      expect(result.data.uploadedFileId).toBeUndefined();
    }
  });

  it("accepts a full mapping run payload with uploadedFileId", () => {
    const result = createRunSchema.safeParse({
      uploadedFileId: "file_1",
      schemaTemplateId: "tmpl_1",
      sourceSheetName: "Sheet1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.uploadedFileId).toBe("file_1");
    }
  });

  it("accepts both uploadedFileId and displayName", () => {
    const result = createRunSchema.safeParse({
      uploadedFileId: "file_1",
      schemaTemplateId: "tmpl_1",
      displayName: "Import Q2",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Import Q2");
    }
  });

  it("rejects empty schemaTemplateId", () => {
    const result = createRunSchema.safeParse({
      schemaTemplateId: "",
      displayName: "Test",
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty displayName when provided", () => {
    const result = createRunSchema.safeParse({
      schemaTemplateId: "tmpl_1",
      displayName: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts optional mappingTemplateId", () => {
    const result = createRunSchema.safeParse({
      schemaTemplateId: "tmpl_1",
      displayName: "Test",
      mappingTemplateId: "mt_1",
    });

    expect(result.success).toBe(true);
  });
});

describe("updateRunSchema", () => {
  it("accepts an uploadedFileId update", () => {
    const result = updateRunSchema.safeParse({
      uploadedFileId: "file_2",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a displayName update", () => {
    const result = updateRunSchema.safeParse({
      displayName: "Renamed process",
    });

    expect(result.success).toBe(true);
  });

  it("accepts an empty payload", () => {
    const result = updateRunSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("rejects empty displayName", () => {
    const result = updateRunSchema.safeParse({
      displayName: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateMappingTemplateSchema", () => {
  it("accepts isFavorite toggle", () => {
    const result = updateMappingTemplateSchema.safeParse({
      isFavorite: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFavorite).toBe(true);
    }
  });

  it("accepts name update", () => {
    const result = updateMappingTemplateSchema.safeParse({
      name: "Updated template name",
    });

    expect(result.success).toBe(true);
  });

  it("accepts both isFavorite and name", () => {
    const result = updateMappingTemplateSchema.safeParse({
      isFavorite: true,
      name: "Favored template",
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateMappingTemplateSchema.safeParse({
      name: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("confirmMappingSchema", () => {
  it("accepts a valid mapping payload", () => {
    const result = confirmMappingSchema.safeParse({
      mappings: [
        {
          targetPath: "employee_no",
          sourceColumn: "Emp ID",
          confidence: 0.95,
          transform: "trim",
        },
        {
          targetPath: "salary.basic",
          sourceColumn: "Monthly Pay",
          confidence: 0.8,
          transform: "to_number",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts mappings with constant values", () => {
    const result = confirmMappingSchema.safeParse({
      mappings: [
        {
          targetPath: "source",
          sourceColumn: null,
          confidence: 1,
          constantValue: "payroll_2026",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects negative confidence", () => {
    const result = confirmMappingSchema.safeParse({
      mappings: [
        {
          targetPath: "field",
          sourceColumn: "col",
          confidence: -0.1,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects confidence above 1", () => {
    const result = confirmMappingSchema.safeParse({
      mappings: [
        {
          targetPath: "field",
          sourceColumn: "col",
          confidence: 1.5,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

import { z } from "zod";

export const jsonSchemaInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  jsonSchema: z.unknown(),
});

export const createRunSchema = z.object({
  uploadedFileId: z.string().min(1),
  schemaTemplateId: z.string().min(1),
  sourceSheetName: z.string().optional().nullable(),
});

export const confirmMappingSchema = z.object({
  mappings: z.array(
    z.object({
      targetPath: z.string().min(1),
      sourceColumn: z.string().nullable(),
      confidence: z.number().min(0).max(1),
      transform: z
        .enum(["none", "trim", "to_number", "parse_date", "uppercase", "lowercase"])
        .optional(),
      reason: z.string().optional(),
      constantValue: z.string().nullable().optional(),
    }),
  ),
});

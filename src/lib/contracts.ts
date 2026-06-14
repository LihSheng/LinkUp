import { z } from "zod";

export const jsonSchemaInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  jsonSchema: z.unknown(),
});

export const createRunSchema = z.object({
  uploadedFileId: z.string().min(1).optional(),
  schemaTemplateId: z.string().min(1),
  sourceSheetName: z.string().optional().nullable(),
  displayName: z.string().min(1).optional(),
  mappingTemplateId: z.string().min(1).optional(),
  sourceMode: z.enum(["headered", "headerless"]).optional(),
  headerResolution: z.object({
    action: z.enum(["use_first_row", "headerless", "choose_template"]),
    userSelected: z.boolean().optional(),
  }).optional(),
});

export const updateRunSchema = z.object({
  uploadedFileId: z.string().min(1).optional(),
  sourceSheetName: z.string().optional().nullable(),
  displayName: z.string().min(1).optional(),
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

export const updateMappingTemplateSchema = z.object({
  isFavorite: z.boolean().optional(),
  name: z.string().min(1).optional(),
});

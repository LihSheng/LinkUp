import { z } from "zod";

import type {
  FieldMapping,
  SchemaMatchInput,
  SchemaMatchResult,
  TransformRule,
} from "@/lib/mapping/mapping.types";

const transformRuleSchema = z
  .enum(["none", "trim", "to_number", "parse_date", "uppercase", "lowercase"])
  .catch("none");

const fieldMappingSchema = z.object({
  targetPath: z.string().min(1),
  sourceColumn: z.string().nullable().catch(null),
  confidence: z.coerce.number().min(0).max(1).catch(0),
  transform: transformRuleSchema.optional(),
  reason: z.string().optional().catch(""),
  constantValue: z.string().nullable().optional().catch(null),
});

const schemaMatchResultSchema = z.object({
  mappings: z.array(fieldMappingSchema).catch([]),
  warnings: z.array(z.string()).catch([]),
});

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

export function buildCompactSchemaMatchInput(input: SchemaMatchInput): SchemaMatchInput {
  return {
    targetJsonSchema: input.targetJsonSchema,
    sourceSheetName: input.sourceSheetName,
    sourceColumns: input.sourceColumns.map((column) => ({
      ...column,
      samples: column.samples.slice(0, 3),
    })),
    sampleRows: [],
    maskedRowPatterns: input.maskedRowPatterns?.slice(0, 3),
    sourceMode: input.sourceMode ?? "headered",
  };
}

export function normalizeSchemaMatchResult(params: {
  parsed: unknown;
  input: SchemaMatchInput;
}) {
  const base = schemaMatchResultSchema.parse(params.parsed);
  const allowedColumns = new Set(params.input.sourceColumns.map((column) => column.name));

  const normalizedMappings = new Map<string, FieldMapping>();

  for (const mapping of base.mappings) {
    const normalizedSource =
      mapping.sourceColumn && allowedColumns.has(mapping.sourceColumn)
        ? mapping.sourceColumn
        : null;

    normalizedMappings.set(mapping.targetPath, {
      targetPath: mapping.targetPath,
      sourceColumn: normalizedSource,
      confidence: clampConfidence(mapping.confidence),
      transform: (mapping.transform ?? "none") as TransformRule,
      reason: mapping.reason ?? "",
      constantValue: mapping.constantValue ?? null,
    });
  }

  return {
    result: {
      mappings: Array.from(normalizedMappings.values()),
      warnings: base.warnings,
    } satisfies SchemaMatchResult,
    normalizedWarningCount: base.warnings.length,
  };
}

export function ensureAllTargetPaths(params: {
  result: SchemaMatchResult;
  requiredPaths: string[];
}) {
  const mappingByPath = new Map(
    params.result.mappings.map((mapping) => [mapping.targetPath, mapping]),
  );

  const completedMappings = params.requiredPaths.map((targetPath) => {
    return (
      mappingByPath.get(targetPath) ?? {
        targetPath,
        sourceColumn: null,
        confidence: 0,
        transform: "none" as TransformRule,
        reason: "",
        constantValue: null,
      }
    );
  });

  return {
    mappings: completedMappings,
    warnings: params.result.warnings,
  } satisfies SchemaMatchResult;
}

import type {
  ColumnProfile,
  FieldMapping,
  SchemaMatchInput,
  SchemaMatchResult,
  TargetField,
  TransformRule,
} from "@/lib/mapping/mapping.types";
import { flattenJsonSchema } from "@/lib/schema/json-schema";

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function scoreMatch(field: TargetField, column: ColumnProfile) {
  const fieldTokens = new Set(tokenize(field.path));
  const columnTokens = tokenize(column.name);

  let score = 0;
  for (const token of columnTokens) {
    if (fieldTokens.has(token)) {
      score += 0.45;
    }
  }

  if (field.type.includes("number") && column.detectedType === "number") {
    score += 0.2;
  }

  if (field.type.includes("date") && column.detectedType === "date") {
    score += 0.2;
  }

  return Math.min(score, 0.98);
}

function inferTransform(field: TargetField, column: ColumnProfile): TransformRule {
  if (field.type.includes("number") && column.detectedType !== "number") {
    return "to_number";
  }

  if (field.type.includes("date")) {
    return "parse_date";
  }

  return "trim";
}

export function buildHeuristicMapping(input: SchemaMatchInput): SchemaMatchResult {
  const targetFields = flattenJsonSchema(input.targetJsonSchema);

  const mappings: FieldMapping[] = targetFields.map((field) => {
    const scored = input.sourceColumns
      .map((column) => ({ column, score: scoreMatch(field, column) }))
      .sort((left, right) => right.score - left.score);

    const best = scored[0];

    if (!best || best.score < 0.3) {
      return {
        targetPath: field.path,
        sourceColumn: null,
        confidence: 0,
        transform: "none",
        reason: "No strong lexical or type match was found.",
      };
    }

    return {
      targetPath: field.path,
      sourceColumn: best.column.name,
      confidence: Number(best.score.toFixed(2)),
      transform: inferTransform(field, best.column),
      reason: `Matched ${best.column.name} using header similarity and detected type.`,
    };
  });

  return {
    mappings,
    warnings: mappings.some((mapping) => mapping.sourceColumn === null)
      ? ["Some required fields may still need manual confirmation."]
      : [],
  };
}

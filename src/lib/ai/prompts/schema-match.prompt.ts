import type { SchemaMatchInput } from "@/lib/mapping/mapping.types";

export function buildSchemaMatchSystemPrompt() {
  return [
    "You are a schema matching engine.",
    "Map source Excel columns to target JSON fields.",
    "Return only valid JSON.",
    'Return exactly one JSON object with keys "mappings" and "warnings".',
    'Always include "warnings" as an array, even when empty.',
    "Do not invent source columns.",
    "Use null when no source column is suitable.",
    "Prefer deterministic transforms such as trim, to_number, parse_date, uppercase, lowercase, or none.",
    "Include confidence from 0 to 1 and a short reason.",
    "Every target field must appear once in mappings.",
    "Do not include markdown fences or explanatory text.",
  ].join(" ");
}

export function buildSchemaMatchUserPrompt(input: SchemaMatchInput) {
  return JSON.stringify(input, null, 2);
}

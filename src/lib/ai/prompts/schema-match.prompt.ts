import type { FieldMapping, SchemaMatchInput } from "@/lib/mapping/mapping.types";

export function buildSchemaMatchSystemPrompt() {
  return [
    "You are a schema matching engine.",
    "Map source Excel columns to target JSON fields.",
    "Return only valid JSON — no markdown fences, no explanatory text outside the JSON object.",
    'Return exactly one JSON object with keys "mappings" (array of FieldMapping) and "warnings" (array of strings, may be empty).',
    "Each target field must appear exactly once in the mappings array.",
    "Do not invent source columns that are not present in the input.",
    "Use null for sourceColumn when no source column is suitable for a target field.",
    "Prefer deterministic transforms: trim, to_number, parse_date, uppercase, lowercase, or none.",
    "Each mapping must include confidence (0 to 1) and a short reason string.",
    "",
    "When matching, consider these rules in order of importance:",
    "1. Exact or partial name overlap between column headers and target field paths (normalize case, underscores, spaces).",
    "2. Common abbreviations and synonyms (e.g., 'DOB' = 'date_of_birth', 'emp' = 'employee', 'tel' = 'telephone', 'fname' = 'first_name', 'amt' = 'amount').",
    "3. Sample data values — check if the actual cell data looks like the expected type (e.g., numeric-looking strings for number fields, date strings for date fields, emails for email fields).",
    "4. Each source column should map to at most ONE target field. If two targets both match the same column best, prefer the target with the stronger semantic match.",
    "",
    "IMPORTANT: The targetPath in each mapping must be an EXACT path from the target JSON schema provided in the user prompt. Do not add or remove any prefix — copy the path verbatim from the schema's flattened field list.",
    "",
    "The user prompt may include pre-computed suggestions from header-name matching. Use these as starting points — confirm them if the sample data supports the match, or override if the data contradicts (e.g., a column named 'balance' that contains dates should NOT be matched to a number field). Empty columns with exact name matches should still be mapped.",
    "",
    "Example format (paths are illustrative — use actual paths from the input):",
    JSON.stringify({
      mappings: [
        {
          targetPath: "full_name",
          sourceColumn: "Employee Name",
          confidence: 0.92,
          transform: "trim",
          reason: "Column header directly matches target field",
        },
        {
          targetPath: "monthly_salary",
          sourceColumn: "Monthly Pay",
          confidence: 0.78,
          transform: "to_number",
          reason: "Sample values like '4,500' suggest numeric salary; moderate name match",
        },
        {
          targetPath: "start_date",
          sourceColumn: null,
          confidence: 0,
          transform: "none",
          reason: "No source column resembles a start date field",
        },
      ],
      warnings: [
        "Could not find a matching column for start_date",
      ],
    }),
  ].join("\n");
}

export function buildSchemaMatchUserPrompt(
  input: SchemaMatchInput,
  heuristicHints?: FieldMapping[],
) {
  if (heuristicHints && heuristicHints.length > 0) {
    const hints = heuristicHints.map((m) => ({
      targetPath: m.targetPath,
      sourceColumn: m.sourceColumn,
      confidence: m.confidence,
      transform: m.transform,
      reason: m.reason,
    }));
    return [
      "Pre-computed suggestions from header-name matching (use as starting points, override if sample data contradicts):",
      JSON.stringify(hints, null, 2),
      "",
      "Schema and column data:",
      JSON.stringify(input, null, 2),
    ].join("\n");
  }

  return JSON.stringify(input, null, 2);
}

import type { FieldMapping } from "@/lib/mapping/mapping.types";

export const transformers = {
  none: (value: unknown) => value,
  trim: (value: unknown) => String(value ?? "").trim(),
  to_number: (value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const normalized = String(value).replace(/,/g, "").trim();
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  },
  parse_date: (value: unknown) => {
    if (!value) {
      return null;
    }

    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  },
  uppercase: (value: unknown) => String(value ?? "").trim().toUpperCase(),
  lowercase: (value: unknown) => String(value ?? "").trim().toLowerCase(),
} as const;

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let cursor: Record<string, unknown> = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const existing = cursor[key];

    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      cursor[key] = {};
    }

    cursor = cursor[key] as Record<string, unknown>;
  }

  cursor[parts.at(-1) as string] = value;
}

export function applyMappingToRows(
  rows: Record<string, unknown>[],
  mappings: FieldMapping[],
) {
  return rows.map((row) => {
    const output: Record<string, unknown> = {};

    for (const mapping of mappings) {
      const transform = mapping.transform ?? "none";
      const inputValue =
        mapping.constantValue !== undefined &&
        mapping.constantValue !== null &&
        mapping.constantValue !== ""
          ? mapping.constantValue
          : mapping.sourceColumn
            ? row[mapping.sourceColumn]
            : null;

      setNestedValue(output, mapping.targetPath, transformers[transform](inputValue));
    }

    return output;
  });
}

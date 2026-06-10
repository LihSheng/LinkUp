import type { ColumnProfile, DetectedType } from "@/lib/mapping/mapping.types";

function detectValueType(value: unknown): DetectedType {
  if (value === null || value === undefined || value === "") {
    return "empty";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (value instanceof Date) {
    return "date";
  }

  const normalized = String(value).trim();

  if (!normalized) {
    return "empty";
  }

  if (!Number.isNaN(Number(normalized.replace(/,/g, "")))) {
    return "number";
  }

  if (!Number.isNaN(Date.parse(normalized))) {
    return "date";
  }

  if (/^(true|false)$/i.test(normalized)) {
    return "boolean";
  }

  return "string";
}

export function buildColumnProfiles(
  headers: string[],
  sampleRows: Record<string, unknown>[],
): ColumnProfile[] {
  return headers.map((header, index) => {
    const samples = sampleRows
      .map((row) => row[header])
      .filter((value) => value !== undefined)
      .slice(0, 5);

    const valueTypes = sampleRows
      .map((row) => detectValueType(row[header]))
      .filter((value) => value !== "empty");

    const detectedType =
      valueTypes.length === 0
        ? "empty"
        : new Set(valueTypes).size === 1
          ? valueTypes[0]
          : "mixed";

    const nullCount = sampleRows.filter((row) => {
      const value = row[header];
      return value === null || value === undefined || value === "";
    }).length;

    return {
      name: header,
      index,
      detectedType,
      samples,
      nullRate: sampleRows.length ? nullCount / sampleRows.length : 0,
      uniqueCount: new Set(sampleRows.map((row) => row[header])).size,
    };
  });
}

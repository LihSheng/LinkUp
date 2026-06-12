import type { ColumnProfile, DetectedType } from "@/lib/mapping/mapping.types";

const PROFILE_SAMPLE_COUNT = 20;

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

function majorityType(types: DetectedType[]): DetectedType {
  if (types.length === 0) return "empty";

  const counts = new Map<DetectedType, number>();
  for (const t of types) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  let bestType: DetectedType = "empty";
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestType = type;
    }
  }

  if (bestCount / types.length >= 0.7) return bestType;
  return "mixed";
}

export function buildColumnProfiles(
  headers: string[],
  sampleRows: Record<string, unknown>[],
): ColumnProfile[] {
  return headers.map((header, index) => {
    const samples = sampleRows
      .map((row) => row[header])
      .filter((value) => value !== undefined)
      .slice(0, PROFILE_SAMPLE_COUNT);

    const valueTypes = sampleRows
      .flatMap((row) => {
        const type = detectValueType(row[header]);
        return type !== "empty" ? [type] : [];
      });

    const detectedType = majorityType(valueTypes);

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

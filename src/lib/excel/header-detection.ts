import type { TargetField } from "@/lib/mapping/mapping.types";

export type CanonicalField = TargetField;

export type MatchedField = {
  headerIndex: number;
  headerName: string;
  templatePath: string;
};

export type HeaderDetectionResult = {
  headerRowIndex: number;
  matchedFields: MatchedField[];
  unmatchedRequiredFields: TargetField[];
  confidence: number;
  ambiguous: boolean;
};

const SCAN_ROW_LIMIT = 30;
const AMBIGUITY_THRESHOLD = 0.15;

export function normalizeHeader(text: string): string {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-\s]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreRowAgainstTemplate(
  row: unknown[],
  templateFields: CanonicalField[],
): { score: number; matchedFields: MatchedField[] } {
  const templateHeaders = templateFields.map((f) => normalizeHeader(f.path));
  const matchedFields: MatchedField[] = [];
  const matchedIndices = new Set<number>();

  for (let fi = 0; fi < templateHeaders.length; fi++) {
    const normalized = templateHeaders[fi];
    const colIndex = row.findIndex(
      (cell, ci) =>
        !matchedIndices.has(ci) &&
        normalizeHeader(String(cell ?? "")) === normalized,
    );

    if (colIndex >= 0) {
      matchedIndices.add(colIndex);
      matchedFields.push({
        headerIndex: colIndex,
        headerName: String(row[colIndex] ?? "").trim(),
        templatePath: templateFields[fi].path,
      });
    }
  }

  return {
    score: matchedFields.length / templateFields.length,
    matchedFields,
  };
}

export function detectHeaderRowByTemplate(
  rows: unknown[][],
  templateFields: CanonicalField[],
): HeaderDetectionResult {
  if (templateFields.length === 0) {
    throw new Error("Template has no fields; cannot detect header row.");
  }

  const scanLimit = Math.min(rows.length, SCAN_ROW_LIMIT);
  const candidates: {
    rowIndex: number;
    score: number;
    matchedFields: MatchedField[];
  }[] = [];

  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i] ?? [];
    const result = scoreRowAgainstTemplate(row, templateFields);

    if (result.score > 0) {
      candidates.push({ rowIndex: i, ...result });
    }
  }

  if (candidates.length === 0) {
    const unmatched = templateFields
      .filter((f) => f.required)
      .map((f) => ({ ...f }));

    return {
      headerRowIndex: -1,
      matchedFields: [],
      unmatchedRequiredFields: unmatched,
      confidence: 0,
      ambiguous: false,
    };
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const runnerUp = candidates[1];

  const ambiguous =
    runnerUp !== undefined &&
    best.score - runnerUp.score < AMBIGUITY_THRESHOLD;

  const matchedPaths = new Set(
    best.matchedFields.map((f) => f.templatePath),
  );

  const unmatchedRequiredFields = templateFields
    .filter((f) => f.required && !matchedPaths.has(f.path))
    .map((f) => ({ ...f }));

  return {
    headerRowIndex: best.rowIndex,
    matchedFields: best.matchedFields,
    unmatchedRequiredFields,
    confidence: best.score,
    ambiguous,
  };
}

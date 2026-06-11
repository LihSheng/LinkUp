import { buildColumnProfiles } from "@/lib/excel/column-profile";

export type TemplateImportField = {
  id: string;
  sourceHeader: string;
  fieldName: string;
  dataType: "String" | "Number" | "Boolean" | "Date" | "Object";
  required: boolean;
};

const HEADER_SCAN_LIMIT = 30;
const SAMPLE_ROW_LIMIT = 5;

function normalizeCellText(value: unknown) {
  return String(value ?? "").trim();
}

function isLikelyHeaderCell(text: string) {
  if (!text) {
    return false;
  }

  if (text.length > 80) {
    return false;
  }

  if (text.includes("\n") || text.includes("\r")) {
    return false;
  }

  if (/^\(.*\)/.test(text)) {
    return false;
  }

  if (/^(remarks?|instructions?|notes?|generated on)/i.test(text)) {
    return false;
  }

  return /[a-zA-Z]/.test(text);
}

function scoreHeaderRow(row: unknown[]) {
  const cells = row.map(normalizeCellText).filter(Boolean);

  if (cells.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;

  for (const cell of cells) {
    score += 1;

    if (cell.length <= 40) {
      score += 1;
    }

    if (!cell.includes("\n") && !cell.includes("\r")) {
      score += 1;
    }

    if (/^[a-z0-9_]+$/i.test(cell)) {
      score += 3;
    } else if (/^[a-zA-Z][a-zA-Z0-9_ ]*$/.test(cell)) {
      score += 2;
    }

    if (!isLikelyHeaderCell(cell)) {
      score -= 2;
    }

    if (/[().:]/.test(cell)) {
      score -= 1;
    }

    if (cell.length > 60) {
      score -= 2;
    }
  }

  return score;
}

export function detectTemplateHeaderRow(rows: unknown[][]) {
  let bestRowIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, HEADER_SCAN_LIMIT); rowIndex += 1) {
    const score = scoreHeaderRow(rows[rowIndex] ?? []);

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = rowIndex;
    }
  }

  return bestRowIndex;
}

function fallbackFieldName(header: string, index: number) {
  const normalized = header
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return normalized || `column_${index + 1}`;
}

export function buildTemplateFieldsFromRows(rows: unknown[][]): TemplateImportField[] {
  const headerRowIndex = detectTemplateHeaderRow(rows);

  if (headerRowIndex < 0) {
    return [];
  }

  const rawHeaders = rows[headerRowIndex] ?? [];
  const headers = rawHeaders.map((header, index) => {
    const normalized = normalizeCellText(header);
    return normalized || `column_${index + 1}`;
  });

  const dataRows = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((value) => normalizeCellText(value) !== ""));

  const sampleRows = dataRows.slice(0, SAMPLE_ROW_LIMIT).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])),
  );

  const profiles = buildColumnProfiles(headers, sampleRows);

  return headers.map((header, index) => {
    const detectedType = profiles[index]?.detectedType ?? "empty";

    return {
      id: `field-${index + 1}`,
      sourceHeader: header,
      fieldName: fallbackFieldName(header, index),
      dataType:
        detectedType === "number"
          ? "Number"
          : detectedType === "boolean"
            ? "Boolean"
            : detectedType === "date"
              ? "Date"
              : "String",
      required: false,
    };
  });
}

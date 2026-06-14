import { maskCellValue } from "@/lib/masking/cell-masker";
import type { MaskedRowPattern } from "@/lib/mapping/mapping.types";

const MAX_MASKED_ROW_PATTERNS = 3;

export function buildMaskedRowPatterns(
  sampleRows: Record<string, unknown>[],
  columnNames: string[],
  maxRows: number = MAX_MASKED_ROW_PATTERNS,
): MaskedRowPattern[] {
  const rowsToProcess = sampleRows.slice(0, maxRows);

  return rowsToProcess.map((row, index) => {
    const values: Record<string, string> = {};

    for (const col of columnNames) {
      const rawValue = row[col];
      const masked = maskCellValue(rawValue);
      if (masked !== "<FREE_TEXT>" && masked !== "<EMPTY>") {
        values[col] = masked;
      }
    }

    return {
      rowNumber: index + 1,
      values,
    };
  }).filter((row) => Object.keys(row.values).length > 0);
}

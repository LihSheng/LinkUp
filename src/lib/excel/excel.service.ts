import { readFile } from "node:fs/promises";

import * as XLSX from "xlsx";

import { buildColumnProfiles } from "@/lib/excel/column-profile";
import { detectHeaderRow } from "@/lib/excel/header-detection";

async function readWorkbook(filePath: string) {
  const buffer = await readFile(filePath);
  return XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    raw: false,
  });
}

function toRows(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as unknown[][];
}

function scoreSheet(rows: unknown[][]) {
  const headerRowIndex = detectHeaderRow(rows);

  if (headerRowIndex < 0) {
    return -1;
  }

  const headerWidth = (rows[headerRowIndex] ?? []).filter(
    (cell) => String(cell ?? "").trim() !== "",
  ).length;
  const dataRows = rows.slice(headerRowIndex + 1).filter((row) =>
    row.some((value) => String(value ?? "").trim() !== ""),
  ).length;

  return dataRows * 10 + headerWidth;
}

function pickBestSheetName(
  workbook: XLSX.WorkBook,
  preferredSheetName?: string | null,
) {
  if (preferredSheetName && workbook.SheetNames.includes(preferredSheetName)) {
    return preferredSheetName;
  }

  return workbook.SheetNames.map((sheetName) => ({
    sheetName,
    score: scoreSheet(toRows(workbook, sheetName)),
  })).sort((left, right) => right.score - left.score)[0]?.sheetName;
}

export async function readWorkbookMeta(filePath: string) {
  const workbook = await readWorkbook(filePath);

  return {
    sheetNames: workbook.SheetNames,
  };
}

export async function previewWorkbook(params: {
  filePath: string;
  preferredSheetName?: string | null;
  sampleLimit?: number;
}) {
  const workbook = await readWorkbook(params.filePath);
  const sheetName = pickBestSheetName(workbook, params.preferredSheetName);

  if (!sheetName) {
    throw new Error("Workbook does not contain any sheets.");
  }

  const rows = toRows(workbook, sheetName);
  const headerRowIndex = detectHeaderRow(rows);

  if (headerRowIndex < 0) {
    throw new Error("Could not detect a header row in the selected sheet.");
  }

  const rawHeaders = rows[headerRowIndex] ?? [];
  const headers = rawHeaders.map((header, index) => {
    const normalized = String(header ?? "").trim();
    return normalized || `column_${index + 1}`;
  });

  const sampleLimit = params.sampleLimit ?? 25;
  const dataRows = rows.slice(headerRowIndex + 1).filter((row) =>
    row.some((value) => String(value ?? "").trim() !== ""),
  );

  const sampleRows = dataRows.slice(0, sampleLimit).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])),
  );

  return {
    sourceSheetName: sheetName,
    sheetNames: workbook.SheetNames,
    headerRowIndex,
    headers,
    sampleRows,
    columnProfiles: buildColumnProfiles(headers, sampleRows),
  };
}

export async function readAllRows(params: {
  filePath: string;
  preferredSheetName?: string | null;
}) {
  const preview = await previewWorkbook({
    filePath: params.filePath,
    preferredSheetName: params.preferredSheetName,
    sampleLimit: Number.MAX_SAFE_INTEGER,
  });

  return {
    sourceSheetName: preview.sourceSheetName,
    headers: preview.headers,
    rows: preview.sampleRows,
  };
}

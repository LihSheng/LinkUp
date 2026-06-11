import { readFile } from "node:fs/promises";

import * as XLSX from "xlsx";

import { buildColumnProfiles } from "@/lib/excel/column-profile";
import {
  detectHeaderRowByTemplate,
  type CanonicalField,
} from "@/lib/excel/header-detection";

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

function pickBestSheetName(
  workbook: XLSX.WorkBook,
  sheetNames: string[],
  preferredSheetName?: string | null,
) {
  if (preferredSheetName && workbook.SheetNames.includes(preferredSheetName)) {
    return preferredSheetName;
  }

  return sheetNames.find((name) => workbook.SheetNames.includes(name)) ?? null;
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
  templateFields?: CanonicalField[];
}) {
  const workbook = await readWorkbook(params.filePath);

  const sheetName = pickBestSheetName(
    workbook,
    workbook.SheetNames,
    params.preferredSheetName,
  );

  if (!sheetName) {
    throw new Error("Workbook does not contain any sheets.");
  }

  const rows = toRows(workbook, sheetName);

  if (params.templateFields && params.templateFields.length > 0) {
    return previewWithTemplate({
      sheetName,
      sheetNames: workbook.SheetNames,
      rows,
      templateFields: params.templateFields,
      sampleLimit: params.sampleLimit ?? 25,
    });
  }

  return previewFallback({
    sheetName,
    sheetNames: workbook.SheetNames,
    rows,
    sampleLimit: params.sampleLimit ?? 25,
  });
}

function previewWithTemplate(params: {
  sheetName: string;
  sheetNames: string[];
  rows: unknown[][];
  templateFields: CanonicalField[];
  sampleLimit: number;
}) {
  const detection = detectHeaderRowByTemplate(
    params.rows,
    params.templateFields,
  );

  if (detection.headerRowIndex < 0) {
    return {
      sourceSheetName: params.sheetName,
      sheetNames: params.sheetNames,
      headerRowIndex: -1,
      headers: [] as string[],
      sampleRows: [] as Record<string, unknown>[],
      columnProfiles: [],
      detection,
    };
  }

  const rawHeaders = params.rows[detection.headerRowIndex] ?? [];
  const headers = rawHeaders.map((header, index) => {
    const normalized = String(header ?? "").trim();
    return normalized || `column_${index + 1}`;
  });

  const dataRows = params.rows.slice(detection.headerRowIndex + 1).filter(
    (row) => row.some((value) => String(value ?? "").trim() !== ""),
  );

  const sampleRows = dataRows.slice(0, params.sampleLimit).map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index] ?? null]),
    ),
  );

  return {
    sourceSheetName: params.sheetName,
    sheetNames: params.sheetNames,
    headerRowIndex: detection.headerRowIndex,
    headers,
    sampleRows,
    columnProfiles: buildColumnProfiles(headers, sampleRows),
    detection,
  };
}

function previewFallback(params: {
  sheetName: string;
  sheetNames: string[];
  rows: unknown[][];
  sampleLimit: number;
}) {
  const headerRowIndex = params.rows.findIndex((row) =>
    row.some((cell) => String(cell ?? "").trim().length > 0),
  );

  if (headerRowIndex < 0) {
    throw new Error("Could not detect a header row in the selected sheet.");
  }

  const rawHeaders = params.rows[headerRowIndex] ?? [];
  const headers = rawHeaders.map((header, index) => {
    const normalized = String(header ?? "").trim();
    return normalized || `column_${index + 1}`;
  });

  const dataRows = params.rows.slice(headerRowIndex + 1).filter((row) =>
    row.some((value) => String(value ?? "").trim() !== ""),
  );

  const sampleRows = dataRows.slice(0, params.sampleLimit).map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [header, row[index] ?? null]),
    ),
  );

  return {
    sourceSheetName: params.sheetName,
    sheetNames: params.sheetNames,
    headerRowIndex,
    headers,
    sampleRows,
    columnProfiles: buildColumnProfiles(headers, sampleRows),
  };
}

export async function readAllRows(params: {
  filePath: string;
  preferredSheetName?: string | null;
  templateFields?: CanonicalField[];
}) {
  const preview = await previewWorkbook({
    filePath: params.filePath,
    preferredSheetName: params.preferredSheetName,
    sampleLimit: Number.MAX_SAFE_INTEGER,
    templateFields: params.templateFields,
  });

  return {
    sourceSheetName: preview.sourceSheetName,
    headers: preview.headers,
    rows: preview.sampleRows,
  };
}

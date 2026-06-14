import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import {
  previewWorkbook,
  readWorkbookRows,
  buildHeaderlessPreviewData,
  buildFirstRowPreviewData,
} from "@/lib/excel/excel.service";
import { getRunWithRelations } from "@/lib/mapping/mapping.service";
import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import type { CanonicalField } from "@/lib/excel/header-detection";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";
import { serverT } from "@/i18n/server";
import { maskWorkbookProfiles } from "@/lib/masking/masking.service";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const { POST } = defineApiRouteHandlers({
  POST: async (_: Request, context: RouteContext) => {
    const { id } = await Promise.resolve(context.params);
    const run = await getRunWithRelations(id);

    if (!run) {
      return NextResponse.json({ error: serverT("api.runNotFound") }, { status: 404 });
    }

    if (!run.uploadedFileId || !run.uploadedFile) {
      return NextResponse.json(
        { error: serverT("api.noUploadedFileAttached") },
        { status: 400 },
      );
    }

    if (run.columnProfiles && Array.isArray(run.columnProfiles) && (run.columnProfiles as unknown[]).length > 0) {
      return NextResponse.json({
        run: {
          ...run,
          targetFields: flattenJsonSchema(run.schemaTemplate.jsonSchema),
          workbookMeta: run.uploadedFile.workbookMeta,
        },
      });
    }

    const targetFields = flattenJsonSchema(run.schemaTemplate.jsonSchema);
    const sourceMode = (run.sourceMode as "headered" | "headerless") ?? "headered";
    const headerResolution = run.headerResolution as
      | { action?: "use_first_row" | "headerless" | "choose_template" }
      | null;

    let sourceSheetName: string;
    let columnProfiles: import("@/lib/mapping/mapping.types").ColumnProfile[];
    let sampleRows: Record<string, unknown>[];

    if (sourceMode === "headerless") {
      const { sheetName, rows } = await readWorkbookRows({
        filePath: run.uploadedFile.storagePath,
        preferredSheetName: run.sourceSheetName,
      });
      sourceSheetName = sheetName;

      const preview = buildHeaderlessPreviewData({
        rows,
        sheetName,
        sheetNames: [sheetName],
        sampleLimit: 25,
      });
      columnProfiles = preview.columnProfiles;
      sampleRows = preview.sampleRows;
    } else if (headerResolution?.action === "use_first_row") {
      const preview = await readWorkbookRows({
        filePath: run.uploadedFile.storagePath,
        preferredSheetName: run.sourceSheetName,
      });

      const firstRowPreview = buildFirstRowPreviewData({
        rows: preview.rows,
        sheetName: preview.sheetName,
        sheetNames: preview.sheetNames,
        sampleLimit: 25,
      });

      sourceSheetName = firstRowPreview.sourceSheetName;
      columnProfiles = firstRowPreview.columnProfiles;
      sampleRows = firstRowPreview.sampleRows;
    } else {
      let canonicalFields: CanonicalField[] | undefined;
      if (run.schemaTemplate.canonicalFields) {
        canonicalFields = run.schemaTemplate.canonicalFields as CanonicalField[];
      } else {
        canonicalFields = targetFields.map((f) => ({
          path: f.path,
          type: f.type,
          required: f.required,
          description: f.description,
        }));
      }

      const preview = await previewWorkbook({
        filePath: run.uploadedFile.storagePath,
        preferredSheetName: run.sourceSheetName,
        templateFields: canonicalFields,
      });
      sourceSheetName = preview.sourceSheetName;
      columnProfiles = preview.columnProfiles;
      sampleRows = preview.sampleRows;
    }

    const masked = maskWorkbookProfiles({
      profiles: columnProfiles,
      sampleRows,
      sourceMode,
      includeRowPatterns: sourceMode === "headerless",
    });

    const updated = await prisma.mappingRun.update({
      where: { id },
      data: {
        columnProfiles: masked.maskedProfiles as Prisma.InputJsonValue,
        sourceSheetName,
        maskingAudit: masked.auditSummary as Prisma.InputJsonValue,
        maskedRowPatterns: masked.maskedRowPatterns.length > 0
          ? (masked.maskedRowPatterns as Prisma.InputJsonValue)
          : undefined,
        status: "profiled",
      },
    });

    return NextResponse.json({
      run: {
        ...updated,
        uploadedFile: run.uploadedFile,
        schemaTemplate: run.schemaTemplate,
        targetFields,
        workbookMeta: run.uploadedFile.workbookMeta,
        maskingAudit: masked.auditSummary,
      },
    });
  },
});

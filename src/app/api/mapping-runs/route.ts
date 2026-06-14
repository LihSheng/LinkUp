import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { createRunSchema } from "@/lib/contracts";
import {
  previewWorkbook,
  buildHeaderlessPreviewData,
  buildFirstRowPreviewData,
  readWorkbookRows,
} from "@/lib/excel/excel.service";
import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import type { CanonicalField } from "@/lib/excel/header-detection";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";
import { serverT } from "@/i18n/server";
import { maskWorkbookProfiles } from "@/lib/masking/masking.service";

async function previewWithMasking(params: {
  filePath: string;
  preferredSheetName?: string | null;
  sourceMode: "headered" | "headerless";
  headerMode?: "detect" | "use_first_row";
  canonicalFields?: CanonicalField[];
}) {
  if (params.sourceMode === "headerless") {
    const { sheetName, sheetNames, rows } = await readWorkbookRows({
      filePath: params.filePath,
      preferredSheetName: params.preferredSheetName,
    });

    const rawPreview = buildHeaderlessPreviewData({
      rows,
      sheetName,
      sheetNames,
      sampleLimit: 25,
    });

    const masked = maskWorkbookProfiles({
      profiles: rawPreview.columnProfiles,
      sampleRows: rawPreview.sampleRows,
      sourceMode: "headerless",
      includeRowPatterns: true,
    });

    return { rawPreview, masked, sourceMode: "headerless" as const };
  }

  if (params.headerMode === "use_first_row") {
    const { sheetName, sheetNames, rows } = await readWorkbookRows({
      filePath: params.filePath,
      preferredSheetName: params.preferredSheetName,
    });

    const rawPreview = buildFirstRowPreviewData({
      rows,
      sheetName,
      sheetNames,
      sampleLimit: 25,
    });

    const masked = maskWorkbookProfiles({
      profiles: rawPreview.columnProfiles,
      sampleRows: rawPreview.sampleRows,
      sourceMode: "headered",
      includeRowPatterns: false,
    });

    return { rawPreview, masked, sourceMode: "headered" as const };
  }

  const rawPreview = await previewWorkbook({
    filePath: params.filePath,
    preferredSheetName: params.preferredSheetName,
    templateFields: params.canonicalFields,
  });

  const masked = maskWorkbookProfiles({
    profiles: rawPreview.columnProfiles,
    sampleRows: rawPreview.sampleRows,
    sourceMode: "headered",
    includeRowPatterns: false,
  });

  return { rawPreview, masked, sourceMode: "headered" as const };
}

export const { POST } = defineApiRouteHandlers({
  POST: async (request: Request) => {
    const payload = createRunSchema.parse(await request.json());

    const schemaTemplate = await prisma.schemaTemplate.findUnique({
      where: { id: payload.schemaTemplateId },
    });

    if (!schemaTemplate) {
      return NextResponse.json(
        { error: serverT("api.schemaTemplateNotFound") },
        { status: 404 },
      );
    }

    if (!payload.uploadedFileId) {
      const draftToken = randomUUID();
      const run = await prisma.mappingRun.create({
        data: {
          schemaTemplateId: schemaTemplate.id,
          displayName: payload.displayName ?? null,
          draftToken,
          status: "draft",
        },
      });

      return NextResponse.json({
        run: {
          ...run,
          targetFields: flattenJsonSchema(schemaTemplate.jsonSchema),
          schemaTemplate,
        },
      }, { status: 201 });
    }

    const uploadedFile = await prisma.uploadedFile.findUnique({
      where: { id: payload.uploadedFileId },
    });

    if (!uploadedFile) {
      return NextResponse.json(
        { error: serverT("api.uploadedFileNotFound") },
        { status: 404 },
      );
    }

    const targetFields = flattenJsonSchema(schemaTemplate.jsonSchema);

    let canonicalFields: CanonicalField[] | undefined;

    if (schemaTemplate.canonicalFields) {
      canonicalFields = schemaTemplate.canonicalFields as CanonicalField[];
    } else {
      canonicalFields = targetFields.map((f) => ({
        path: f.path,
        type: f.type,
        required: f.required,
        description: f.description,
      }));
    }

    if (payload.sourceMode === "headerless" || payload.headerResolution?.action === "headerless") {
      const { rawPreview, masked } = await previewWithMasking({
        filePath: uploadedFile.storagePath,
        preferredSheetName: payload.sourceSheetName,
        sourceMode: "headerless",
      });

      const run = await prisma.mappingRun.create({
        data: {
          uploadedFileId: uploadedFile.id,
          schemaTemplateId: schemaTemplate.id,
          sourceSheetName: rawPreview.sourceSheetName,
          sourceMode: "headerless",
          columnProfiles: masked.maskedProfiles as Prisma.InputJsonValue,
          maskedRowPatterns: masked.maskedRowPatterns as Prisma.InputJsonValue,
          maskingAudit: masked.auditSummary as Prisma.InputJsonValue,
          headerResolution: { action: "headerless", userSelected: true } as Prisma.InputJsonValue,
          status: "profiled",
        },
      });

      return NextResponse.json({
        run: {
          ...run,
          targetFields,
          schemaTemplate,
          workbookMeta: uploadedFile.workbookMeta,
          maskingAudit: masked.auditSummary,
          sourceMode: "headerless",
          headerless: true,
        },
      });
    }

    if (payload.headerResolution?.action === "use_first_row") {
      const { rawPreview, masked } = await previewWithMasking({
        filePath: uploadedFile.storagePath,
        preferredSheetName: payload.sourceSheetName,
        sourceMode: "headered",
        headerMode: "use_first_row",
      });

      const run = await prisma.mappingRun.create({
        data: {
          uploadedFileId: uploadedFile.id,
          schemaTemplateId: schemaTemplate.id,
          sourceSheetName: rawPreview.sourceSheetName,
          sourceMode: "headered",
          columnProfiles: masked.maskedProfiles as Prisma.InputJsonValue,
          maskingAudit: masked.auditSummary as Prisma.InputJsonValue,
          headerResolution: { action: "use_first_row", userSelected: true } as Prisma.InputJsonValue,
          status: "profiled",
        },
      });

      return NextResponse.json({
        run: {
          ...run,
          targetFields,
          schemaTemplate,
          workbookMeta: uploadedFile.workbookMeta,
          maskingAudit: masked.auditSummary,
        },
      });
    }

    const templatePreview = await previewWorkbook({
      filePath: uploadedFile.storagePath,
      preferredSheetName: payload.sourceSheetName,
      templateFields: canonicalFields,
    });

    const hasDetection = "detection" in templatePreview;
    const detection = hasDetection ? (templatePreview as { detection: { headerRowIndex: number; matchedFields: unknown[]; confidence: number; ambiguous: boolean; unmatchedRequiredFields: { path: string }[] } }).detection : null;

    const needsHeaderResolution = hasDetection && detection!.headerRowIndex < 0;
    if (needsHeaderResolution && !payload.sourceMode && !payload.headerResolution) {
      return NextResponse.json({
        headerResolutionRequired: true,
        sourceSheetName: templatePreview.sourceSheetName,
        sheetNames: templatePreview.sheetNames ?? [],
        detection: {
          headerRowIndex: -1,
          matchedFields: [],
          confidence: 0,
          ambiguous: false,
        },
      });
    }

    if (detection && detection.unmatchedRequiredFields.length > 0 && detection.headerRowIndex >= 0 && !detection.ambiguous) {
      const missing = detection.unmatchedRequiredFields.map((f: { path: string }) => f.path);
      return NextResponse.json(
        {
          error: serverT("api.requiredFieldsMissing"),
          missingRequiredFields: missing,
          detection: {
            headerRowIndex: detection.headerRowIndex,
            matchedFields: detection.matchedFields,
            confidence: detection.confidence,
            ambiguous: detection.ambiguous,
          },
        },
        { status: 422 },
      );
    }

    const includeRowPatterns = detection
      ? (detection.ambiguous || detection.unmatchedRequiredFields.length > 0)
      : false;

    const masked = maskWorkbookProfiles({
      profiles: templatePreview.columnProfiles,
      sampleRows: templatePreview.sampleRows,
      sourceMode: "headered",
      includeRowPatterns,
    });

    const run = await prisma.mappingRun.create({
      data: {
        uploadedFileId: uploadedFile.id,
        schemaTemplateId: schemaTemplate.id,
        sourceSheetName: templatePreview.sourceSheetName,
        sourceMode: "headered",
        columnProfiles: masked.maskedProfiles as Prisma.InputJsonValue,
        maskingAudit: masked.auditSummary as Prisma.InputJsonValue,
        maskedRowPatterns: masked.maskedRowPatterns.length > 0
          ? (masked.maskedRowPatterns as Prisma.InputJsonValue)
          : undefined,
        status: "profiled",
      },
    });

    const response: Record<string, unknown> = {
      run: {
        ...run,
        targetFields,
        schemaTemplate,
        workbookMeta: uploadedFile.workbookMeta,
        maskingAudit: masked.auditSummary,
      },
    };

    if (detection) {
      response.detection = {
        headerRowIndex: detection.headerRowIndex,
        matchedFields: detection.matchedFields,
        confidence: detection.confidence,
        ambiguous: detection.ambiguous,
      } as Record<string, unknown>;
      if (includeRowPatterns) {
        response.warning = detection.ambiguous
          ? serverT("api.headerDetectionLowConfidence")
          : serverT("api.someRequiredFieldsNotFound");
      }
    }

    return NextResponse.json(response);
  },
});

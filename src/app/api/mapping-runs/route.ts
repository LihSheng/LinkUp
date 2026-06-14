import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { createRunSchema } from "@/lib/contracts";
import { previewWorkbook } from "@/lib/excel/excel.service";
import { prisma } from "@/lib/prisma";
import { flattenJsonSchema } from "@/lib/schema/json-schema";
import type { CanonicalField } from "@/lib/excel/header-detection";
import { defineApiRouteHandlers } from "@/lib/api-error-handler";
import { serverT } from "@/i18n/server";

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

    const preview = await previewWorkbook({
      filePath: uploadedFile.storagePath,
      preferredSheetName: payload.sourceSheetName,
      templateFields: canonicalFields,
    });

    const hasDetection =
      "detection" in preview && preview.detection !== undefined;

    if (hasDetection) {
      const detection = preview.detection!;

      if (detection.unmatchedRequiredFields.length > 0 && detection.headerRowIndex >= 0 && !detection.ambiguous) {
        const missing = detection.unmatchedRequiredFields.map((f) => f.path);

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

      if (detection.ambiguous || detection.unmatchedRequiredFields.length > 0 || detection.headerRowIndex < 0) {
        const run = await prisma.mappingRun.create({
          data: {
            uploadedFileId: uploadedFile.id,
            schemaTemplateId: schemaTemplate.id,
            sourceSheetName: preview.sourceSheetName,
            columnProfiles: preview.columnProfiles as Prisma.InputJsonValue,
            sampleRows: preview.sampleRows as Prisma.InputJsonValue,
            status: "profiled",
          },
        });

        return NextResponse.json({
          run: {
            ...run,
            targetFields,
            schemaTemplate,
            workbookMeta: uploadedFile.workbookMeta,
          },
          warning:
            detection.headerRowIndex < 0
              ? serverT("api.noHeaderRowDetected")
              : detection.ambiguous
                ? serverT("api.headerDetectionLowConfidence")
                : serverT("api.someRequiredFieldsNotFound"),
          detection: {
            headerRowIndex: detection.headerRowIndex,
            matchedFields: detection.matchedFields,
            confidence: detection.confidence,
            ambiguous: detection.ambiguous,
          },
        });
      }
    }

    const run = await prisma.mappingRun.create({
      data: {
        uploadedFileId: uploadedFile.id,
        schemaTemplateId: schemaTemplate.id,
        sourceSheetName: preview.sourceSheetName,
        columnProfiles: preview.columnProfiles as Prisma.InputJsonValue,
        sampleRows: preview.sampleRows as Prisma.InputJsonValue,
        status: "profiled",
      },
    });

    const response: Record<string, unknown> = {
      run: {
        ...run,
        targetFields,
        schemaTemplate,
        workbookMeta: uploadedFile.workbookMeta,
      },
    };

    if (hasDetection) {
      response.detection = {
        headerRowIndex: preview.detection!.headerRowIndex,
        matchedFields: preview.detection!.matchedFields,
        confidence: preview.detection!.confidence,
        ambiguous: preview.detection!.ambiguous,
      };
    }

    return NextResponse.json(response);
  },
});
